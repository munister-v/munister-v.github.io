(function () {
  var PHONE_DISPLAY = "+7 (949) 000-00-00";
  var PHONE_COMPACT = "+79490000000";
  var TELEGRAM_USER = "vyanetto1";
  var TELEGRAM_HANDLE = "@" + TELEGRAM_USER;
  var TELEGRAM_URL = "https://t.me/" + TELEGRAM_USER;

  function text(el) {
    return (el && el.textContent || "").trim();
  }

  function replaceTextNodes(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var value = node.nodeValue;
      var next = value
        .replace(/\+380 \(62\) 000-00-00/g, PHONE_DISPLAY)
        .replace(/\+380 \.\.\./g, "+7 949 ...")
        .replace(/@fob_zakaz/g, TELEGRAM_HANDLE)
        .replace(/Telegram: @vyanetto1/g, "Telegram: " + TELEGRAM_HANDLE);
      if (next !== value) node.nodeValue = next;
    });
  }

  function patchLinks() {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.href = "tel:" + PHONE_COMPACT;
      if (text(a).match(/\+380|000-00-00/)) a.textContent = PHONE_DISPLAY;
    });

    document.querySelectorAll('[href*="fob_zakaz"], [href*="t.me"]').forEach(function (a) {
      if (text(a).match(/telegram|@/i)) {
        a.href = TELEGRAM_URL;
        a.target = "_blank";
        a.rel = "noopener";
      }
    });

    Array.from(document.querySelectorAll("span, div, a")).forEach(function (el) {
      var value = text(el);
      if (value === TELEGRAM_HANDLE || value === "Telegram: " + TELEGRAM_HANDLE) {
        if (el.tagName === "A") {
          el.href = TELEGRAM_URL;
          el.target = "_blank";
          el.rel = "noopener";
        } else {
          el.classList.add("fob-telegram-link");
          el.setAttribute("role", "link");
          el.setAttribute("tabindex", "0");
          if (!el.dataset.fobTelegramBound) {
            el.dataset.fobTelegramBound = "1";
            el.addEventListener("click", function () {
              window.open(TELEGRAM_URL, "_blank", "noopener");
            });
            el.addEventListener("keydown", function (event) {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.open(TELEGRAM_URL, "_blank", "noopener");
              }
            });
          }
        }
      }
    });
  }

  function selectedMode(form) {
    var active = form.querySelector(".fob-contact-mode.is-active");
    return active ? active.dataset.mode : "telegram";
  }

  function setMode(form, mode) {
    form.querySelectorAll(".fob-contact-mode").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.mode === mode);
      button.setAttribute("aria-pressed", button.dataset.mode === mode ? "true" : "false");
    });
  }

  function injectContactModes() {
    document.querySelectorAll("form.cform").forEach(function (form) {
      if (form.querySelector(".fob-contact-modes")) return;
      var submit = form.querySelector('button[type="submit"]');
      if (!submit) return;

      var box = document.createElement("div");
      box.className = "fob-contact-modes";
      box.innerHTML = [
        '<div class="fob-contact-modes__label">Канал связи</div>',
        '<div class="fob-contact-modes__row">',
        '<button class="fob-contact-mode is-active" type="button" data-mode="telegram" aria-pressed="true">Telegram</button>',
        '<button class="fob-contact-mode" type="button" data-mode="phone" aria-pressed="false">Звонок</button>',
        '<button class="fob-contact-mode" type="button" data-mode="sms" aria-pressed="false">SMS</button>',
        '</div>'
      ].join("");

      box.addEventListener("click", function (event) {
        var button = event.target.closest(".fob-contact-mode");
        if (button) setMode(form, button.dataset.mode);
      });

      submit.parentNode.insertBefore(box, submit);
    });
  }

  function field(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : "";
  }

  function selectedClientType(form) {
    var active = form.querySelector(".type--on");
    return active ? text(active) : "Не указан";
  }

  function quoteLines() {
    var lines = Array.from(document.querySelectorAll(".summary__lines > *"));
    var clean = lines.map(function (line) {
      return text(line).replace(/\s+/g, " ");
    }).filter(Boolean);
    return clean.length ? clean : ["Позиции выбраны в конструкторе"];
  }

  function buildMessage(form) {
    return [
      "Заявка Ф.О.Б",
      "Имя: " + (field(form, "name") || "-"),
      "Телефон: " + (field(form, "phone") || "-"),
      "Город / район: " + (field(form, "city") || "-"),
      "Тип клиента: " + selectedClientType(form),
      "",
      "Позиции:",
      quoteLines().map(function (line, index) { return (index + 1) + ". " + line; }).join("\n"),
      "",
      "Комментарий: " + (field(form, "comment") || "-")
    ].join("\n");
  }

  function submitViaMode(form) {
    var message = buildMessage(form);
    var mode = selectedMode(form);
    if (mode === "phone") {
      window.location.href = "tel:" + PHONE_COMPACT;
      return;
    }
    if (mode === "sms") {
      window.location.href = "sms:" + PHONE_COMPACT + "?body=" + encodeURIComponent(message);
      return;
    }
    window.open(
      "https://t.me/share/url?url=" + encodeURIComponent(location.href) + "&text=" + encodeURIComponent(message + "\n\nОтправить: " + TELEGRAM_HANDLE),
      "_blank",
      "noopener"
    );
  }

  document.addEventListener("submit", function (event) {
    var form = event.target.closest && event.target.closest("form.cform");
    if (!form || !form.checkValidity()) return;
    submitViaMode(form);
  }, true);

  function patch() {
    replaceTextNodes(document.body);
    patchLinks();
    injectContactModes();
  }

  document.addEventListener("DOMContentLoaded", patch);
  window.addEventListener("load", patch);
  new MutationObserver(patch).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
