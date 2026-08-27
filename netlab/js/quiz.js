/*
  NetLab — движок игр

  Три гри (рівні OSI, порти, кабелі) відрізняються лише матеріалом, тому
  логіка одна: банк питань, режим «на час» або «без таймера», миттєва
  перевірка й розбір.

  Вердикт показується одразу, у мить вибору — як у TeachEd: відкладена кнопка
  «перевірити» перетворює тренування на іспит і вбиває сенс повторення.
*/
(function (global) {
  "use strict";

  function run(config) {
    const root = document.getElementById(config.mount || "game");
    const bank = config.questions;
    let queue = [], current = null, answered = false;
    let stats = { ok: 0, total: 0, streak: 0, best: 0 };
    let sent = { ok: 0, total: 0 };
    let timer = null, left = 0;
    const TIMED_SECONDS = 90;
    let timed = false;

    function head() {
      return `<div class="row no-print" style="margin-bottom:12px">
        <button class="btn ${timed ? "" : "lime"}" data-mode="free">Без таймера</button>
        <button class="btn ${timed ? "lime" : ""}" data-mode="timed">На час · 90 с</button>
        <span style="flex:1"></span>
        <span class="score">правильно <b>${stats.ok}</b> з <b>${stats.total}</b>
          · серія <b>${stats.streak}</b>${timed ? ` · осталось <b>${left}</b> сек` : ""}</span>
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
      why.innerHTML = (right ? "<b>Правильно.</b> " : `<b>Правильно — ${NL.esc(current.a)}.</b> `) + (current.why || "");
      root.querySelector(".score").innerHTML =
        `правильно <b>${stats.ok}</b> з <b>${stats.total}</b> · серія <b>${stats.streak}</b>${timed ? ` · осталось <b>${left}</b> сек` : ""}`;
      // Викладачу йде не кожна відповідь, а зріз кожні десять: журнал читають
      // очима, і сотня рядків на одного студента там зайва.
      if (window.API && stats.total % 10 === 0) {
        API.sendResult(config.kind || "quiz", stats.ok - sent.ok, stats.total - sent.total, config.title || "");
        sent = { ok: stats.ok, total: stats.total };
      }
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
          if (window.API && stats.total > sent.total) {
            API.sendResult(config.kind || "quiz", stats.ok - sent.ok, stats.total - sent.total, config.title || "");
            sent = { ok: stats.ok, total: stats.total };
          }
          root.innerHTML = `<div class="q" style="text-align:center">
            <div class="task">Час вийшов</div>
            <div class="given">${stats.ok} з ${stats.total}</div>
            <p class="lede">Найкраща серія поспіль — ${stats.best}.</p>
            <button class="btn primary" data-mode="timed">Ще раз</button>
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
