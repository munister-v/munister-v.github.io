/*
  NetLab — связь с сервером

  Акаунти і журнал живуть на app.munister.com.ua/netlab-api (окремий сервіс
  на VPS). Сам сайт лишається статикою на Pages: без входу всі інструменти
  працюють як раніше, просто результати нікуди не йдуть.

  Токен зберігається в localStorage. Викладач і студент — різні ролі й різні
  токени, але одночасно в одному браузері вони не потрібні: ключ один.
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
    } catch { /* приватний режим */ }
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
    try { data = await res.json(); } catch { /* порожнє тіло */ }
    if (!res.ok || (data && data.ok === false)) {
      // 401 означає, що токен протух — тримати його далі немає сенсу.
      if (res.status === 401) setSession(null, null);
      throw new Error((data && data.error) || ("Сервер ответил " + res.status));
    }
    return data;
  }

  const get = path => call(path);
  const post = (path, body) => call(path, { method: "POST", body: JSON.stringify(body || {}) });

  // Результат надсилається мовчки й не заважає грі: не увійшов — просто нікуди
  // надсилати, а мережа, що впала, не має ронити тренажер.
  function sendResult(kind, ok, total, detail) {
    const w = who();
    if (!token() || !w || w.kind !== "student") return Promise.resolve(null);
    return post("/result", { kind, ok, total, detail: detail || "" }).catch(() => null);
  }

  global.API = { BASE, get, post, token, who, setSession, sendResult };
})(window);
