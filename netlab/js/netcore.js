/*
  NetLab — сетевая арифметика

  Усе, що рахує адреси, живе тут і не знає про DOM: ті самі функції потрібні
  калькулятору, тренажеру, конструктору топологій і генератору друкованих
  аркушів, і розходитися вони не мають права.

  IPv4 тримаємо числом. Обережно: порозрядні операції в JS працюють зі знаковим
  32-бітним цілим, тому будь-який результат женемо через `>>> 0`, інакше
  255.255.255.0 стає від'ємним числом, і все подальше — брехня.
*/
(function (global) {
  "use strict";

  /* ── IPv4 ───────────────────────────────────────────────────────────────── */
  function ipToInt(ip) {
    const parts = String(ip).trim().split(".");
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return null;
      const v = Number(p);
      if (v > 255) return null;
      n = (n << 8) | v;
    }
    return n >>> 0;
  }

  function intToIp(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }

  function maskFromPrefix(bits) {
    return bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  }

  // Маска коректна, лише якщо одиниці йдуть поспіль від початку:
  // 255.255.254.0 — маска, 255.255.253.0 — одрук, який треба зловити.
  function prefixFromMask(mask) {
    const n = typeof mask === "number" ? mask >>> 0 : ipToInt(mask);
    if (n === null) return null;
    const bits = n.toString(2).padStart(32, "0");
    if (!/^1*0*$/.test(bits)) return null;
    return (bits.match(/1/g) || []).length;
  }

  function ipClass(n) {
    const first = (n >>> 24) & 255;
    if (first < 128) return "A";
    if (first < 192) return "B";
    if (first < 224) return "C";
    if (first < 240) return "D (multicast)";
    return "E (експериментальний)";
  }

  function isPrivate(n) {
    return (n >>> 24) === 10
      || (n >>> 20) === 0xAC1                                  // 172.16.0.0/12
      || (n >>> 16) === 0xC0A8                                 // 192.168.0.0/16
      || (n >>> 24) === 127
      || (n >>> 16) === 0xA9FE;                                // 169.254.0.0/16 APIPA
  }

  // Розбір «192.168.1.10/24», «192.168.1.10 255.255.255.0» і просто адреси.
  function parseCidr(text) {
    const raw = String(text).trim().replace(/\s+/g, " ");
    let ipPart = raw, prefix = null;
    if (raw.includes("/")) {
      const [a, b] = raw.split("/");
      ipPart = a.trim();
      prefix = /^\d{1,2}$/.test(b.trim()) ? Number(b.trim()) : prefixFromMask(b.trim());
    } else if (raw.includes(" ")) {
      const [a, b] = raw.split(" ");
      ipPart = a; prefix = prefixFromMask(b);
    }
    const ip = ipToInt(ipPart);
    if (ip === null) return { error: "Адреса не схожа на IPv4: потрібні чотири числа 0–255" };
    if (prefix === null || prefix === undefined) prefix = 24;
    if (!(prefix >= 0 && prefix <= 32)) return { error: "Префікс має бути від /0 до /32" };
    return { ip, prefix };
  }

  function subnet(ipInput, prefixInput) {
    const parsed = typeof ipInput === "number"
      ? { ip: ipInput, prefix: prefixInput }
      : parseCidr(prefixInput == null ? ipInput : ipInput + "/" + prefixInput);
    if (parsed.error) return parsed;

    const { ip, prefix } = parsed;
    const mask = maskFromPrefix(prefix);
    const network = (ip & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const total = Math.pow(2, 32 - prefix);
    // /31 — лінк точка-точка (RFC 3021), /32 — один хост. В обоих случаях
    // «мінус два на мережу і бродкаст» не діє, і підручники про це мовчать.
    const usable = prefix >= 31 ? total : Math.max(total - 2, 0);
    const firstHost = prefix >= 31 ? network : (total > 2 ? network + 1 : null);
    const lastHost = prefix >= 31 ? broadcast : (total > 2 ? broadcast - 1 : null);

    return {
      ip, prefix, mask,
      ipText: intToIp(ip),
      maskText: intToIp(mask),
      wildcardText: intToIp(~mask >>> 0),
      networkText: intToIp(network),
      broadcastText: prefix === 32 ? "—" : intToIp(broadcast),
      firstHostText: firstHost === null ? "—" : intToIp(firstHost),
      lastHostText: lastHost === null ? "—" : intToIp(lastHost),
      total, usable,
      network, broadcast,
      cls: ipClass(ip),
      scope: isPrivate(ip) ? "приватна" : "публічна",
      binary: intToIp(ip).split(".").map(o => Number(o).toString(2).padStart(8, "0")),
      maskBinary: intToIp(mask).split(".").map(o => Number(o).toString(2).padStart(8, "0")),
    };
  }

  // Нарізка мережі на рівні шматки — те, що в задачах звучить як «розбийте
  // 192.168.1.0/24 на підмережі по /27».
  function split(networkText, fromPrefix, toPrefix, limit = 64) {
    const base = subnet(networkText, fromPrefix);
    if (base.error) return base;
    if (toPrefix < fromPrefix) return { error: "Новий префікс має бути більший за початковий" };
    const step = Math.pow(2, 32 - toPrefix);
    const count = Math.pow(2, toPrefix - fromPrefix);
    const out = [];
    for (let i = 0; i < Math.min(count, limit); i++) {
      out.push(subnet((base.network + i * step) >>> 0, toPrefix));
    }
    return { count, shown: out.length, subnets: out };
  }

  // VLSM: роздаємо шматки за спаданням потреби — інакше дірки між блоками
  // з'їдають адресний простір, і задача «не сходиться».
  function vlsm(networkText, prefix, requests) {
    const base = subnet(networkText, prefix);
    if (base.error) return base;
    const wanted = requests
      .map((r, i) => ({ ...r, i, need: Number(r.hosts) || 0 }))
      .filter(r => r.need > 0)
      .sort((a, b) => b.need - a.need);

    let cursor = base.network;
    const end = base.broadcast;
    const out = [];
    for (const r of wanted) {
      // +2 — адреса мережі та бродкаст, які хостам не дістаються.
      let bits = 32;
      while (bits > 0 && Math.pow(2, 32 - bits) - 2 < r.need) bits--;
      const size = Math.pow(2, 32 - bits);
      // Блок мусить починатися на межі свого розміру.
      const aligned = Math.ceil(cursor / size) * size;
      if (aligned + size - 1 > end) {
        out.push({ name: r.name, need: r.need, error: "не вміщується у вихідну мережу" });
        continue;
      }
      const s = subnet(aligned >>> 0, bits);
      out.push({ name: r.name, need: r.need, ...s });
      cursor = aligned + size;
    }
    const usedTo = cursor - 1;
    return {
      blocks: out,
      freeFrom: usedTo < end ? intToIp((usedTo + 1) >>> 0) : null,
      freeCount: Math.max(end - usedTo, 0),
    };
  }

  /* ── IPv6 ───────────────────────────────────────────────────────────────── */
  // Розгортаємо :: і провідні нулі — студенти найчастіше помиляються саме
  // на переході між стислим і повним записом.
  function v6Expand(addr) {
    let a = String(addr).trim().toLowerCase();
    if (!a) return null;
    if ((a.match(/::/g) || []).length > 1) return null;
    let head = a, tail = "";
    if (a.includes("::")) [head, tail] = a.split("::");
    const h = head ? head.split(":") : [];
    const t = tail ? tail.split(":") : [];
    if (h.length + t.length > 8) return null;
    const fill = new Array(8 - h.length - t.length).fill("0");
    const groups = a.includes("::") ? [...h, ...fill, ...t] : h;
    if (groups.length !== 8) return null;
    for (const g of groups) if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    return groups.map(g => g.padStart(4, "0")).join(":");
  }

  function v6Compress(addr) {
    const full = v6Expand(addr);
    if (!full) return null;
    const groups = full.split(":").map(g => g.replace(/^0+(?=.)/, ""));
    let bestStart = -1, bestLen = 0, start = -1, len = 0;
    groups.forEach((g, i) => {
      if (g === "0") {
        if (start < 0) start = i;
        len++;
        if (len > bestLen) { bestLen = len; bestStart = start; }
      } else { start = -1; len = 0; }
    });
    if (bestLen < 2) return groups.join(":");
    const head = groups.slice(0, bestStart).join(":");
    const tail = groups.slice(bestStart + bestLen).join(":");
    return head + "::" + tail;
  }

  function v6Kind(addr) {
    const full = v6Expand(addr);
    if (!full) return "—";
    if (full === "0000:0000:0000:0000:0000:0000:0000:0001") return "loopback (::1)";
    if (/^fe80:/.test(full)) return "link-local (fe80::/10)";
    if (/^f[cd]/.test(full)) return "unique local (fc00::/7)";
    if (/^ff/.test(full)) return "multicast (ff00::/8)";
    if (/^2001:0db8:/.test(full)) return "документаційна (2001:db8::/32)";
    if (/^2/.test(full) || /^3/.test(full)) return "global unicast (2000::/3)";
    return "інша";
  }

  /* ── Системи числення ───────────────────────────────────────────────────── */
  function bases(value, from) {
    const n = parseInt(String(value).trim(), from);
    if (isNaN(n) || n < 0) return null;
    return { dec: n, bin: n.toString(2), hex: n.toString(16).toUpperCase(), oct: n.toString(8) };
  }

  global.NetCore = {
    ipToInt, intToIp, maskFromPrefix, prefixFromMask, parseCidr,
    subnet, split, vlsm, ipClass, isPrivate,
    v6Expand, v6Compress, v6Kind, bases,
  };
})(window);
