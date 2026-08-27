/*
  NetLab — связь с сервером

  Аккаунты и журнал живут на app.munister.com.ua/netlab-api (отдельный
  сервис на VPS). Сам сайт при этом остаётся статикой на Pages: без входа
  все инструменты работают как раньше, просто результаты никуда не уходят.

  Токен хранится в localStorage. Преподаватель и студент — разные роли и
  разные токены, но одновременно в одном браузере они не нужны: ключ один.
*/
(function (global) {
  "use strict";

  const BASE = "https://app.munister.com.ua/netlab-api";
  const TOKEN_KEY = "netlab.token";
  const WHO_KEY = "netlab.who";

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }
  function setSession(tok, who) {
    try {
      if (tok) { localStorage.setItem(TOKEN_KEY, tok); localStorage.setItem(WHO_KEY, JSON.stringify(who || {})); }
      else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(WHO_KEY); }
    } catch { /* приватный режим */ }
  }
  function who() {
    try { return JSON.parse(localStorage.getItem(WHO_KEY) || "null"); } catch { return null; }
  }

  async function call(path, options = {}) {
    const res = await fetch(BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: "Bearer " + token() } : {}),
        ...(options.headers || {}),
      },
    });
    let data = null;
    try { data = await res.json(); } catch { /* пустое тело */ }
    if (!res.ok || (data && data.ok === false)) {
      // 401 означает, что токен протух — держать его дальше нет смысла.
      if (res.status === 401) setSession(null, null);
      throw new Error((data && data.error) || ("Сервер ответил " + res.status));
    }
    return data;
  }

  const get = path => call(path);
  const post = (path, body) => call(path, { method: "POST", body: JSON.stringify(body || {}) });

  // Результат отправляется молча и не мешает игре: не вошёл — просто некуда
  // отправлять, а упавшая сеть не должна ронять тренажёр.
  function sendResult(kind, ok, total, detail) {
    const w = who();
    if (!token() || !w || w.kind !== "student") return Promise.resolve(null);
    return post("/result", { kind, ok, total, detail: detail || "" }).catch(() => null);
  }

  global.API = { BASE, get, post, token, who, setSession, sendResult };
})(window);
