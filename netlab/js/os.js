/*
  NetLab OS — менеджер вікон

  Кожен інструмент — окрема сторінка, яка відкривається в iframe усередині
  вікна. Так інструмент лишається самостійною сторінкою (її можна відкрити
  напряму й дати посилання студентам), а стіл отримує справжню багатовіконну
  роботу без переписування кожного інструмента під спільний рушій.

  Позиції та розміри вікон запам'ятовуються: закрив калькулятор — наступного
  разу він відкриється там само, а не посеред екрана.
*/
(function (global) {
  "use strict";

  const POS_KEY = "netlab.os.windows.v1";
  const wins = new Map();          // id → { el, app, minimized, maximized, prev }
  let zTop = 100;
  let cascade = 0;

  /* ── Реєстр застосунків ─────────────────────────────────────────────────── */
  const APPS = {
    subnet:    { title: "Підмережі IPv4", sub: "калькулятор, VLSM, порозрядна розкладка", url: "subnet.html",   w: 980, h: 660, icon: "grid",    lime: false },
    trainer:   { title: "Тренажер",       sub: "задачі з адресації",                      url: "trainer.html",  w: 820, h: 600, icon: "target",  lime: false },
    ipv6:      { title: "IPv6 і числа",   sub: "стиснення адреси, системи числення",      url: "ipv6.html",     w: 860, h: 640, icon: "globe",   lime: false },
    topology:  { title: "Схема мережі",   sub: "конструктор топології",                   url: "topology.html", w: 1120, h: 720, icon: "nodes",  lime: true  },
    osi:       { title: "Модель OSI",     sub: "гра",                                     url: "games/osi.html",    w: 760, h: 560, icon: "layers", lime: true },
    ports:     { title: "Порти",          sub: "гра",                                     url: "games/ports.html",  w: 760, h: 560, icon: "plug",   lime: true },
    cables:    { title: "Кабелі",         sub: "гра",                                     url: "games/cables.html", w: 760, h: 560, icon: "cable",  lime: true },
    handouts:  { title: "Друковані завдання", sub: "варіант і ключ",                      url: "handouts.html", w: 900, h: 700, icon: "sheet",   lime: false },
    cheatsheet:{ title: "Шпаргалки",      sub: "маски, порти, рівні, команди",            url: "cheatsheet.html", w: 1080, h: 700, icon: "book",  lime: false },
    account:   { title: "Кабінет викладача", sub: "групи, завдання, журнал",              url: "account.html",  w: 1080, h: 700, icon: "journal", lime: false },
    join:      { title: "Вхід за кодом",  sub: "для студента",                            url: "join.html",     w: 640, h: 620, icon: "enter",   lime: false },
  };

  const ICONS = {
    grid:   '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    globe:  '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c2.2 2.3 3.3 5 3.3 8s-1.1 5.7-3.3 8c-2.2-2.3-3.3-5-3.3-8S9.8 6.3 12 4z"/>',
    nodes:  '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5 6.5 15.8M12 7.5l5.5 8.3M7.5 18h9"/>',
    layers: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plug:   '<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><path d="M7 10.5h3M7 14h6M15 10.5h2"/>',
    cable:  '<path d="M7 3.5v6H5v5a4 4 0 0 0 4 4h1v2"/><path d="M17 20.5v-6h2v-5a4 4 0 0 0-4-4h-1v-2"/>',
    sheet:  '<path d="M6.5 3.5h11v17h-11z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    book:   '<path d="M4.5 5.5h6a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2h-6z"/><path d="M19.5 5.5h-6a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2h6z"/>',
    journal:'<path d="M6.5 4.5h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-11a1.5 1.5 0 0 1 0-3h11"/><path d="M6.5 4.5v13M10 8.5h5"/>',
    enter:  '<path d="M15 3.5h3.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H15"/><path d="M10 8l4 4-4 4M14 12H4.5"/>',
  };

  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.grid}</svg>`;

  /* ── Збережені позиції ──────────────────────────────────────────────────── */
  function savedPos() {
    try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch { return {}; }
  }
  function rememberPos(id, rect) {
    const all = savedPos();
    all[id] = rect;
    try { localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch { /* приватний режим */ }
  }

  /* ── Відкриття ──────────────────────────────────────────────────────────── */
  function open(id) {
    const app = APPS[id];
    if (!app) return;

    const existing = wins.get(id);
    if (existing) {
      existing.el.classList.remove("minimized");
      existing.minimized = false;
      focus(id);
      markDock();
      return;
    }

    const saved = savedPos()[id];
    const maxW = Math.min(app.w, window.innerWidth - 40);
    const maxH = Math.min(app.h, window.innerHeight - 44 - 96);
    const w = saved ? saved.w : maxW;
    const h = saved ? saved.h : maxH;
    // Кожне наступне вікно зі зсувом, щоб не лягало точно на попереднє.
    const left = saved ? saved.x : Math.max(16, Math.round((window.innerWidth - w) / 2) + cascade * 26 - 60);
    const top = saved ? saved.y : Math.max(56, Math.round((window.innerHeight - h) / 2) - 20 + cascade * 22);
    cascade = (cascade + 1) % 6;

    const el = document.createElement("div");
    el.className = "win";
    el.style.cssText = `left:${left}px;top:${top}px;width:${w}px;height:${h}px;z-index:${++zTop}`;
    el.dataset.win = id;
    el.innerHTML = `
      <div class="win-bar">
        <div class="win-lights">
          <button class="c" title="Закрити" data-act="close"><span>×</span></button>
          <button class="m" title="Згорнути" data-act="min"><span>−</span></button>
          <button class="z" title="На весь екран" data-act="max"><span>+</span></button>
        </div>
        <span class="win-title">${app.title}</span>
        <span class="win-sub">${app.sub}</span>
        <span class="spacer"></span>
        <a class="pop" href="${app.url}" target="_blank" rel="noreferrer" title="Відкрити окремою сторінкою">↗</a>
      </div>
      <div class="win-body"><iframe src="${app.url}?win=1" title="${app.title}" loading="lazy"></iframe></div>
      <div class="win-resize" data-act="resize"></div>`;
    document.body.append(el);
    wins.set(id, { el, app, minimized: false, maximized: false, prev: null });
    wire(id, el);
    focus(id);
    markDock();
  }

  function close(id) {
    const w = wins.get(id);
    if (!w) return;
    const r = w.el.getBoundingClientRect();
    if (!w.maximized) rememberPos(id, { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    w.el.remove();
    wins.delete(id);
    markDock();
  }

  function focus(id) {
    const w = wins.get(id);
    if (!w) return;
    wins.forEach(x => x.el.classList.remove("focused"));
    w.el.classList.add("focused");
    w.el.style.zIndex = ++zTop;
  }

  function minimize(id) {
    const w = wins.get(id);
    if (!w) return;
    w.minimized = true;
    w.el.classList.add("minimized");
    markDock();
  }

  function maximize(id) {
    const w = wins.get(id);
    if (!w) return;
    const el = w.el;
    if (w.maximized) {
      Object.assign(el.style, w.prev);
      w.maximized = false;
    } else {
      w.prev = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      Object.assign(el.style, { left: "8px", top: "50px", width: (window.innerWidth - 16) + "px", height: (window.innerHeight - 50 - 92) + "px" });
      w.maximized = true;
    }
  }

  /* ── Перетягування та розмір ────────────────────────────────────────────── */
  function wire(id, el) {
    const bar = el.querySelector(".win-bar");
    const handle = el.querySelector(".win-resize");

    el.addEventListener("pointerdown", () => focus(id), true);

    el.querySelector(".win-lights").addEventListener("click", e => {
      const act = e.target.closest("[data-act]");
      if (!act) return;
      const kind = act.getAttribute("data-act");
      if (kind === "close") close(id);
      if (kind === "min") minimize(id);
      if (kind === "max") maximize(id);
    });

    bar.addEventListener("dblclick", e => {
      if (!e.target.closest(".win-lights, a")) maximize(id);
    });

    let mode = null, start = null;

    function down(e, kind) {
      if (e.target.closest(".win-lights, a")) return;
      mode = kind;
      const r = el.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, w: r.width, h: r.height };
      el.classList.add(kind === "move" ? "dragging" : "resizing");
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    }

    function move(e) {
      if (!mode || !start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (mode === "move") {
        // Шапку не даємо затягнути під смугу меню або за край екрана —
        // інакше вікно стає недосяжним, і врятує лише перезавантаження.
        el.style.left = Math.min(Math.max(dx + start.left, -start.w + 120), window.innerWidth - 120) + "px";
        el.style.top = Math.min(Math.max(dy + start.top, 46), window.innerHeight - 60) + "px";
      } else {
        el.style.width = Math.max(340, start.w + dx) + "px";
        el.style.height = Math.max(220, start.h + dy) + "px";
      }
    }

    function up(e) {
      if (!mode) return;
      el.classList.remove("dragging", "resizing");
      try { el.releasePointerCapture(e.pointerId); } catch { /* вказівник уже відпущено */ }
      const r = el.getBoundingClientRect();
      rememberPos(id, { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
      mode = null; start = null;
    }

    bar.addEventListener("pointerdown", e => down(e, "move"));
    handle.addEventListener("pointerdown", e => down(e, "resize"));
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  /* ── Стіл і док ─────────────────────────────────────────────────────────── */
  const DESKTOP = ["subnet", "trainer", "ipv6", "topology", "osi", "ports", "cables", "handouts", "cheatsheet", "account", "join"];
  const DOCK = ["subnet", "trainer", "topology", "osi", "ports", "cables", "|", "handouts", "cheatsheet", "|", "account", "join"];

  function renderDesktop() {
    const d = document.getElementById("desktop");
    d.innerHTML = DESKTOP.map(id => {
      const a = APPS[id];
      return `<button class="dicon ${a.lime ? "lime" : ""}" data-open="${id}" title="${a.title}">
        <span class="tile">${svg(a.icon)}</span>
        <span class="cap">${a.title}</span>
      </button>`;
    }).join("");
  }

  function renderDock() {
    const d = document.getElementById("dock");
    d.innerHTML = DOCK.map(id => {
      if (id === "|") return `<span class="dock-sep"></span>`;
      const a = APPS[id];
      return `<button class="di ${a.lime ? "lime" : ""}" data-open="${id}" data-di="${id}">
        ${svg(a.icon)}<span class="dot"></span><span class="tip">${a.title}</span>
      </button>`;
    }).join("");
  }

  function markDock() {
    document.querySelectorAll("[data-di]").forEach(b => {
      const id = b.getAttribute("data-di");
      b.classList.toggle("running", wins.has(id));
    });
  }

  function clock() {
    const el = document.getElementById("mb-clock");
    if (!el) return;
    const now = new Date();
    const time = now.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
    el.textContent = window.innerWidth < 760
      ? time
      : now.toLocaleDateString("uk-UA", { weekday: "short", day: "numeric", month: "short" }) + "  " + time;
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function boot() {
    renderDesktop();
    renderDock();
    clock();
    setInterval(clock, 20000);

    document.addEventListener("click", e => {
      const open_ = e.target.closest("[data-open]");
      if (open_) { open(open_.getAttribute("data-open")); closeMenus(); return; }
      const menu = e.target.closest("[data-menu]");
      if (menu) {
        const target = document.getElementById(menu.getAttribute("data-menu"));
        const wasOpen = target.classList.contains("open");
        closeMenus();
        if (!wasOpen) {
          target.classList.add("open");
          target.style.left = Math.min(menu.getBoundingClientRect().left, window.innerWidth - 270) + "px";
        }
        return;
      }
      if (!e.target.closest(".mb-menu")) closeMenus();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeMenus();
    });

    // Посилання виду /netlab/#subnet відкриває потрібний інструмент одразу:
    // так на пару можна дати адресу конкретного вікна.
    const wanted = (location.hash || "").replace("#", "");
    if (APPS[wanted]) open(wanted);
    else open("subnet");
  }

  function closeMenus() {
    document.querySelectorAll(".mb-menu.open").forEach(m => m.classList.remove("open"));
  }

  global.OS = { APPS, open, close, focus, minimize, maximize, toast, svg, boot };
})(window);
