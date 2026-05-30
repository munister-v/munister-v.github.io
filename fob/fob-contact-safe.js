(function () {
  var PHONE_DISPLAY = "+7 (949) 000-00-00";
  var PHONE_COMPACT = "+79490000000";
  var TELEGRAM_USER = "vyanetto1";
  var TELEGRAM_HANDLE = "@" + TELEGRAM_USER;
  var TELEGRAM_URL = "https://t.me/" + TELEGRAM_USER;

  function text(el) {
    return (el && el.textContent || "").trim();
  }

  function field(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : "";
  }

  function setMode(form, mode) {
    form.querySelectorAll(".fob-contact-mode").forEach(function (button) {
      var active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function selectedMode(form) {
    var active = form.querySelector(".fob-contact-mode.is-active");
    return active ? active.dataset.mode : "telegram";
  }

  function quoteLines() {
    var lines = Array.from(document.querySelectorAll(".summary__lines > *"));
    var clean = lines.map(function (line) {
      return text(line).replace(/\s+/g, " ");
    }).filter(Boolean);
    return clean.length ? clean : ["Позиции выбраны в конструкторе"];
  }

  function clientType(form) {
    var active = form.querySelector(".type--on");
    return active ? text(active).replace(/\s+/g, " ") : "Не указан";
  }

  function buildMessage(form) {
    return [
      "Заявка Ф.О.Б",
      "Имя: " + (field(form, "name") || "-"),
      "Телефон: " + (field(form, "phone") || "-"),
      "Город / район: " + (field(form, "city") || "-"),
      "Тип клиента: " + clientType(form),
      "",
      "Позиции:",
      quoteLines().map(function (line, index) {
        return (index + 1) + ". " + line;
      }).join("\n"),
      "",
      "Комментарий: " + (field(form, "comment") || "-")
    ].join("\n");
  }

  function addContactModes() {
    document.querySelectorAll("form.cform").forEach(function (form) {
      if (form.dataset.fobContactReady === "1") return;
      var submit = form.querySelector('button[type="submit"]');
      if (!submit) return;

      form.dataset.fobContactReady = "1";

      var phone = form.querySelector('[name="phone"]');
      if (phone && (!phone.value || phone.value.indexOf("+380") === 0)) {
        phone.value = "+7 949 ";
      }

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

  function openByMode(form) {
    var mode = selectedMode(form);
    var message = buildMessage(form);

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

  function bindSubmit() {
    if (document.documentElement.dataset.fobSubmitBound === "1") return;
    document.documentElement.dataset.fobSubmitBound = "1";

    document.addEventListener("submit", function (event) {
      var form = event.target.closest && event.target.closest("form.cform");
      if (!form || !form.checkValidity()) return;
      event.preventDefault();
      openByMode(form);
    }, true);
  }

  function patchStaticLinks() {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      link.href = "tel:" + PHONE_COMPACT;
    });

    Array.from(document.querySelectorAll("span, a, div")).forEach(function (el) {
      var value = text(el);
      if (value === TELEGRAM_HANDLE || value === "Telegram: " + TELEGRAM_HANDLE) {
        el.classList.add("fob-telegram-link");
        if (el.tagName === "A") {
          el.href = TELEGRAM_URL;
          el.target = "_blank";
          el.rel = "noopener";
        } else if (el.dataset.fobTelegramBound !== "1") {
          el.dataset.fobTelegramBound = "1";
          el.setAttribute("role", "link");
          el.setAttribute("tabindex", "0");
          el.addEventListener("click", function () {
            window.open(TELEGRAM_URL, "_blank", "noopener");
          });
        }
      }
    });
  }

  function boot() {
    bindSubmit();
    patchStaticLinks();
    addContactModes();
  }

  window.addEventListener("load", function () {
    [0, 400, 1200, 2500].forEach(function (delay) {
      window.setTimeout(boot, delay);
    });
  });
})();
