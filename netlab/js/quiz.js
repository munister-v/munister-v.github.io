/*
  NetLab — движок игр

  Три игры (уровни OSI, порты, кабели) отличаются только материалом, поэтому
  логика одна: банк вопросов, режим «на скорость» или «на всё», мгновенная
  проверка и разбор.

  Проверка ответа показывается сразу, в момент выбора — как в TeachEd:
  отложенная кнопка «проверить» превращает тренировку в экзамен и убивает
  смысл повторения.
*/
(function (global) {
  "use strict";

  function run(config) {
    const root = document.getElementById(config.mount || "game");
    const bank = config.questions;
    let queue = [], current = null, answered = false;
    let stats = { ok: 0, total: 0, streak: 0, best: 0 };
    let timer = null, left = 0;
    const TIMED_SECONDS = 90;
    let timed = false;

    function head() {
      return `<div class="row no-print" style="margin-bottom:12px">
        <button class="btn ${timed ? "" : "lime"}" data-mode="free">Без таймера</button>
        <button class="btn ${timed ? "lime" : ""}" data-mode="timed">На время · 90 сек</button>
        <span style="flex:1"></span>
        <span class="score">верно <b>${stats.ok}</b> из <b>${stats.total}</b>
          · серия <b>${stats.streak}</b>${timed ? ` · осталось <b>${left}</b> сек` : ""}</span>
      </div>`;
    }

    function refill() {
      queue = NL.shuffle(bank.slice());
    }

    function nextQuestion() {
      if (!queue.length) refill();
      current = queue.pop();
      answered = false;
      const options = NL.shuffle([current.a, ...current.wrong]).slice(0, 4);
      if (!options.includes(current.a)) { options[0] = current.a; }
      root.innerHTML = head() + `
        <div class="q">
          <div class="task">${current.q}</div>
          ${current.given ? `<div class="given">${NL.esc(current.given)}</div>` : ""}
          <div class="opts">${NL.shuffle(options).map(o =>
            `<button class="opt" data-a="${NL.esc(o)}">${NL.esc(o)}</button>`).join("")}</div>
          <div class="why" id="why" style="display:none"></div>
        </div>`;
    }

    function answer(value, btn) {
      if (answered) return;
      answered = true;
      const right = value === current.a;
      stats.total++;
      if (right) { stats.ok++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
      else stats.streak = 0;
      root.querySelectorAll(".opt").forEach(o => {
        const v = o.getAttribute("data-a");
        if (v === current.a) o.classList.add("right");
        else if (o === btn) o.classList.add("wrong");
      });
      const why = document.getElementById("why");
      why.style.display = "";
      why.innerHTML = (right ? "<b>Верно.</b> " : `<b>Правильно — ${NL.esc(current.a)}.</b> `) + (current.why || "");
      root.querySelector(".score").innerHTML =
        `верно <b>${stats.ok}</b> из <b>${stats.total}</b> · серия <b>${stats.streak}</b>${timed ? ` · осталось <b>${left}</b> сек` : ""}`;
      if (!timed) setTimeout(() => { if (answered) nextQuestion(); }, 1400);
      else nextQuestion();
    }

    function startTimer() {
      clearInterval(timer);
      left = TIMED_SECONDS;
      stats = { ok: 0, total: 0, streak: 0, best: 0 };
      nextQuestion();
      timer = setInterval(() => {
        left--;
        const s = root.querySelector(".score b:last-child");
        if (s) s.textContent = left;
        if (left <= 0) {
          clearInterval(timer);
          root.innerHTML = `<div class="q" style="text-align:center">
            <div class="task">Время вышло</div>
            <div class="given">${stats.ok} из ${stats.total}</div>
            <p class="lede">Лучшая серия подряд — ${stats.best}.</p>
            <button class="btn primary" data-mode="timed">Ещё раз</button>
            <button class="btn" data-mode="free">Без таймера</button>
          </div>`;
        }
      }, 1000);
    }

    root.addEventListener("click", e => {
      const opt = e.target.closest(".opt");
      if (opt) { answer(opt.getAttribute("data-a"), opt); return; }
      const mode = e.target.closest("[data-mode]");
      if (mode) {
        timed = mode.getAttribute("data-mode") === "timed";
        clearInterval(timer);
        if (timed) startTimer();
        else { stats = { ok: 0, total: 0, streak: 0, best: 0 }; nextQuestion(); }
      }
    });

    document.addEventListener("keydown", e => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) {
        const opts = root.querySelectorAll(".opt");
        if (opts[n - 1]) opts[n - 1].click();
      }
      if (e.key === "Enter" && answered) nextQuestion();
    });

    refill();
    nextQuestion();
  }

  global.Quiz = { run };
})(window);
