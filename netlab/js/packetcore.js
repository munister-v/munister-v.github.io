/*
  NetLab — рушій «Шлях пакета»

  Тут навмисно немає жодної анімації й жодного DOM: симуляція повертає список
  кроків, а сторінка їх малює. Так той самий рушій перевіряється в консолі, і
  його можна буде повторно взяти для задач «чому не працює» та для тренажера.

  Що моделюється: рішення відправника (своя мережа чи чужа), ARP у межах
  сегмента, вибір маршруту за найдовшим префіксом, TTL. Комутатор — прозорий
  L2-сегмент: він не приймає рішень щодо IP, і саме тому в схемі він не додає
  кроку, а лише розширює сегмент.

  Що НЕ моделюється навмисно: MAC-таблиця комутатора, VLAN, NAT, фрагментація.
  Кожне з них — окрема тема; змішати їх тут означало б зробити журнал кроків
  нечитабельним саме там, де студент уперше бачить механізм.
*/
(function (global) {
  "use strict";

  const NC = global.NetCore;
  const MAX_HOPS = 16;
  const START_TTL = 64;

  const ip2i = (s) => NC.ipToInt(s);
  const i2ip = (n) => NC.intToIp(n);

  function netOf(ip, prefix) {
    return (ip2i(ip) & NC.maskFromPrefix(prefix)) >>> 0;
  }

  /** Чи належить адреса мережі інтерфейса. */
  function sameNet(ip, ifaceIp, prefix) {
    if (!ip || !ifaceIp || prefix == null) return false;
    try { return netOf(ip, prefix) === netOf(ifaceIp, prefix); } catch { return false; }
  }

  /* ── Сегмент: усе, до чого кадр долітає без маршрутизатора ─────────────── */

  /**
   * Інтерфейси в одному широкомовному домені з даним.
   *
   * Комутатор пропускає кадр далі, маршрутизатор — ні: саме ця межа й робить
   * «мережу» мережею. Обхід у ширину, бо схема може мати кілька комутаторів
   * поспіль.
   */
  function segment(model, devId, ifName) {
    const seen = new Set();
    const out = [];
    const queue = [`${devId}:${ifName}`];

    while (queue.length) {
      const key = queue.shift();
      if (seen.has(key)) continue;
      seen.add(key);
      const [dId, iName] = key.split(":");
      out.push({ dev: dId, iface: iName });

      for (const l of model.links) {
        for (const [near, far] of [[l.a, l.b], [l.b, l.a]]) {
          if (near.dev !== dId || near.iface !== iName) continue;
          const farKey = `${far.dev}:${far.iface}`;
          if (seen.has(farKey)) continue;
          out.push({ dev: far.dev, iface: far.iface });
          seen.add(farKey);
          const farDev = model.devices.find((d) => d.id === far.dev);
          // Комутатор прозорий: кадр іде далі всіма іншими його портами.
          if (farDev && farDev.kind === "switch") {
            for (const p of farDev.ifaces) {
              if (p.name !== far.iface) queue.push(`${far.dev}:${p.name}`);
            }
          }
        }
      }
    }
    return out;
  }

  /** Хто в цьому сегменті відповість на ARP за адресу. */
  function arpResolve(model, devId, ifName, targetIp) {
    for (const point of segment(model, devId, ifName)) {
      if (point.dev === devId && point.iface === ifName) continue;
      const d = model.devices.find((x) => x.id === point.dev);
      if (!d || d.kind === "switch") continue;
      const i = d.ifaces.find((x) => x.name === point.iface);
      if (i && i.ip && i.ip === targetIp) return { dev: d, iface: i };
    }
    return null;
  }

  /* ── Таблиця маршрутів ─────────────────────────────────────────────────── */

  /**
   * Під'єднані маршрути плюс статичні.
   *
   * Під'єднані не вводяться руками саме тому, що в житті вони не вводяться:
   * мережа з'являється в таблиці від того, що на інтерфейсі стоїть адреса.
   * Студент, який цього не бачив, шукає «чому пінг іде без жодного маршруту».
   */
  function routingTable(dev) {
    const rows = [];
    for (const i of dev.ifaces) {
      if (!i.ip || i.prefix == null) continue;
      rows.push({
        net: i2ip(netOf(i.ip, i.prefix)),
        prefix: i.prefix,
        via: "",
        iface: i.name,
        kind: "connected",
      });
    }
    for (const r of dev.routes || []) {
      rows.push({ ...r, kind: r.prefix === 0 ? "default" : "static" });
    }
    return rows;
  }

  /** Найдовший префікс. Повертає і всі відповідні рядки — для показу вибору. */
  function pickRoute(dev, dstIp) {
    const rows = routingTable(dev);
    const dst = ip2i(dstIp);
    const matched = rows.filter((r) => {
      const m = NC.maskFromPrefix(r.prefix);
      return ((dst & m) >>> 0) === (ip2i(r.net) & m) >>> 0;
    });
    if (matched.length === 0) return { rows, matched, chosen: null };
    // Довший префікс виграє. За однакової довжини перемагає під'єднана
    // мережа — так і в живому маршрутизаторі (адміністративна відстань 0
    // проти 1 у статичного). Тут це записано явно, бо покладатися на порядок
    // рядків у масиві означало б, що правило зникне від невинного sort().
    const chosen = matched.reduce((best, r) => {
      if (r.prefix !== best.prefix) return r.prefix > best.prefix ? r : best;
      if (r.kind === "connected" && best.kind !== "connected") return r;
      return best;
    }, matched[0]);
    return { rows, matched, chosen };
  }

  /* ── Симуляція ─────────────────────────────────────────────────────────── */

  /**
   * Крок за кроком від відправника до отримувача.
   *
   * Кожен крок несе не тільки «куди», а й «чому»: порівняння з маскою, рядок
   * таблиці, що виграв, TTL. Помилка — теж крок, з причиною: «немає маршруту»
   * і «ARP без відповіді» виглядають для студента однаково («не пінгується»),
   * а це різні несправності.
   */
  function trace(model, srcId, dstIp) {
    const steps = [];
    const src = model.devices.find((d) => d.id === srcId);
    if (!src) return { ok: false, steps, error: "Немає такого пристрою" };

    const srcIf = src.ifaces.find((i) => i.ip);
    if (!srcIf) return { ok: false, steps, error: `У «${src.name}» не налаштована адреса` };
    if (!dstIp || !/^\d+\.\d+\.\d+\.\d+$/.test(dstIp)) {
      return { ok: false, steps, error: "Адреса призначення виглядає неправильно" };
    }

    // Сам собі
    if (src.ifaces.some((i) => i.ip === dstIp)) {
      steps.push({ dev: src.id, kind: "ok", title: "Це власна адреса", detail: "Пакет нікуди не йде — призначення на цьому ж пристрої." });
      return { ok: true, steps };
    }

    const local = sameNet(dstIp, srcIf.ip, srcIf.prefix);
    const netText = `${i2ip(netOf(srcIf.ip, srcIf.prefix))}/${srcIf.prefix}`;
    steps.push({
      dev: src.id,
      kind: "decide",
      title: local ? "Призначення у своїй мережі" : "Призначення в чужій мережі",
      detail: local
        ? `${dstIp} після накладання маски /${srcIf.prefix} дає ${netText} — ту саму мережу, що й у ${srcIf.ip}. Кадр піде прямо адресату.`
        : `${dstIp} після накладання маски /${srcIf.prefix} не дає ${netText}. Отже, пакет треба віддати шлюзу.`,
    });

    let hopTargetIp;
    if (local) {
      hopTargetIp = dstIp;
    } else {
      if (!src.gw) {
        return { ok: false, steps, error: `У «${src.name}» не вказано шлюз за замовчуванням, а призначення в чужій мережі` };
      }
      if (!sameNet(src.gw, srcIf.ip, srcIf.prefix)) {
        return {
          ok: false, steps,
          error: `Шлюз ${src.gw} не належить власній мережі ${netText}. Пристрій не має як до нього звернутися — це і є типова помилка в масці або в адресі шлюзу`,
        };
      }
      steps.push({
        dev: src.id, kind: "gw", title: "Беремо шлюз за замовчуванням",
        detail: `Шлюз ${src.gw} лежить у ${netText}, тобто досяжний напряму.`,
      });
      hopTargetIp = src.gw;
    }

    let curDev = src;
    let curIf = srcIf;
    let ttl = START_TTL;

    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const arp = arpResolve(model, curDev.id, curIf.name, hopTargetIp);
      if (!arp) {
        // Найчастіша причина саме тут — надто широка маска. Відправник вирішив,
        // що призначення «своє», тому й не пішов до шлюзу, і кричить про ARP,
        // хоча зламана не мережа, а маска. Сказати це прямо: інакше студент
        // шукає кабель там, де треба дивитися на /nn.
        const maskHint = hop === 0 && local && src.gw
          ? ` Зверніть увагу на маску /${srcIf.prefix}: з нею ${dstIp} вважається «своїм», тому пакет навіть не пішов до шлюзу ${src.gw}.`
          : "";
        return {
          ok: false, steps,
          error: `ARP без відповіді: у сегменті за інтерфейсом ${curIf.name} немає пристрою з адресою ${hopTargetIp}.${maskHint || " Або адреса не та, або кабель не туди"}`,
        };
      }
      steps.push({
        dev: curDev.id, to: arp.dev.id, kind: "arp",
        title: `ARP: хто такий ${hopTargetIp}`,
        detail: `Відповів «${arp.dev.name}» (${arp.iface.name}). Кадр іде до нього.`,
      });

      const next = arp.dev;

      if (next.ifaces.some((i) => i.ip === dstIp)) {
        steps.push({
          dev: next.id, kind: "ok", title: "Дійшло",
          detail: `«${next.name}» — і є ${dstIp}. TTL на фініші: ${ttl}.`,
        });
        return { ok: true, steps };
      }

      if (next.kind !== "router") {
        return {
          ok: false, steps,
          error: `Кадр дійшов до «${next.name}», але це не маршрутизатор і не отримувач — далі пакет не піде`,
        };
      }

      ttl -= 1;
      if (ttl <= 0) {
        return { ok: false, steps, error: "TTL вичерпано — пакет ходить по колу" };
      }

      const { matched, chosen } = pickRoute(next, dstIp);
      if (!chosen) {
        return {
          ok: false, steps,
          error: `На «${next.name}» немає маршруту до ${dstIp} — жоден рядок таблиці не підходить`,
        };
      }
      steps.push({
        dev: next.id, kind: "route",
        title: `«${next.name}»: маршрут до ${dstIp}`,
        detail: chosen.kind === "connected"
          ? `Мережа ${chosen.net}/${chosen.prefix} під'єднана до ${chosen.iface} — віддаємо туди напряму. TTL ${ttl}.`
          : `Обрано ${chosen.net}/${chosen.prefix} через ${chosen.via} (${chosen.iface}). ${
              matched.length > 1 ? `Підходили ще ${matched.length - 1}, але цей префікс довший.` : "Інших відповідних рядків немає."
            } TTL ${ttl}.`,
        route: chosen,
        matched,
      });

      const outIf = next.ifaces.find((i) => i.name === chosen.iface);
      if (!outIf) {
        return { ok: false, steps, error: `Маршрут вказує на інтерфейс ${chosen.iface}, якого немає на «${next.name}»` };
      }
      curDev = next;
      curIf = outIf;
      hopTargetIp = chosen.via || dstIp;
    }

    return { ok: false, steps, error: `Більше ${MAX_HOPS} переходів — схоже на петлю` };
  }

  global.PacketCore = { trace, segment, arpResolve, routingTable, pickRoute, sameNet };
})(window);
