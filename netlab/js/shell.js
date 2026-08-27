/*
  NetLab — общая оболочка страниц

  Смуга меню, тости і сховище робіт. Кожен інструмент підключає цей файл
  і викликає NL.mount("Назва") — далі сторінка займається лише своєю справою.

  Роботи поки лежать у localStorage. Шар навмисне вузький (list/save/remove):
  коли з'явиться вхід і серверна база, змінюється тільки він, а інструменти
  лишаються як є.
*/
(function (global) {
  "use strict";

  const STORE = "netlab.works.v1";

  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    for (const k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function mount(title) {
    // Усередині вікна робочого столу сторінка не малює власну смугу меню й
    // шапку: рамка вже є в самого вікна, друга виглядала б як вкладений сайт.
    const inWindow = window.self !== window.top || /[?&]win=1\b/.test(location.search);
    if (inWindow) {
      document.body.classList.add("in-window");
      document.body.append(el("div", { id: "toast" }));
      return;
    }
    const base = location.pathname.includes("/games/") ? "../" : "./";
    const bar = el("div", { id: "menubar" });
    bar.innerHTML = `
      <a class="home" href="${base}index.html">
        <span class="wordmark">Net<span>Lab</span></span>
      </a>
      <span class="crumb">${title ? title.replace(/[<>]/g, "") : ""}</span>
      <span class="spacer"></span>
      <a class="bar-btn" href="${base}index.html">Усі інструменти</a>
      <button class="bar-btn" id="nl-print">Друк</button>`;
    document.body.prepend(bar);
    document.body.append(el("div", { id: "toast" }));
    document.getElementById("nl-print").addEventListener("click", () => window.print());
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  const works = {
    list(kind) {
      let all = [];
      try { all = JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { all = []; }
      return kind ? all.filter(w => w.kind === kind) : all;
    },
    save(kind, name, data) {
      const all = works.list();
      const now = new Date().toISOString();
      const at = all.findIndex(w => w.kind === kind && w.name === name);
      const item = { id: at >= 0 ? all[at].id : "w-" + Date.now().toString(36),
                     kind, name, data, updatedAt: now };
      if (at >= 0) all[at] = item; else all.unshift(item);
      try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { return null; }
      return item;
    },
    remove(id) {
      const all = works.list().filter(w => w.id !== id);
      try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* приватний режим */ }
    },
  };

  // Завдання і ключі до них передаються посиланням: стан пакується в hash,
  // щоб нічого не тримати на сервері й не заводити акаунт заради аркуша.
  const link = {
    write(obj) {
      try { return "#" + btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
      catch { return ""; }
    },
    read() {
      if (!location.hash || location.hash.length < 2) return null;
      try { return JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1))))); }
      catch { return null; }
    },
  };

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  global.NL = { mount, toast, works, link, rnd, pick, shuffle, esc, el };
})(window);
