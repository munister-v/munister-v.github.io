"use strict";

const header = document.getElementById("header");
const mobileMenu = document.querySelector(".mem-mobile-menu");
const journeyLinks = [...document.querySelectorAll("[data-journey-link]")];
const carePlanner = document.querySelector("[data-care-planner]");
const yearPlan = document.querySelector("[data-year-plan]");

if (header) {
  const updateHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    header.style.setProperty("--page-progress", `${progress * 100}%`);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

if (mobileMenu) {
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mobileMenu.removeAttribute("open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      mobileMenu.removeAttribute("open");
      mobileMenu.querySelector("summary")?.focus();
    }
  });
}

if (journeyLinks.length) {
  const journeySections = journeyLinks
    .map((link) => document.getElementById(link.dataset.journeyLink))
    .filter(Boolean);

  const journeyObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    journeyLinks.forEach((link) => {
      const active = link.dataset.journeyLink === visible.target.id;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }, {
    rootMargin: "-22% 0px -58% 0px",
    threshold: [0, 0.15, 0.4]
  });

  journeySections.forEach((section) => journeyObserver.observe(section));
}

const plannerScenarios = {
  "known-basic-flexible": {
    code: "CARE / 01",
    title: "Разовий базовий догляд",
    description: "Виконавець знаходить відоме місце, фіксує стан, прибирає доступні поверхні й надсилає 6–10 фото результату.",
    price: "від 700 ₴",
    time: "погоджується у справі",
    input: "місто, кладовище, орієнтир",
    note: "Остаточна сума залежить від стану місця, відстані та погоджених матеріалів."
  },
  "known-basic-date": {
    code: "CARE / 02",
    title: "Догляд до важливої дати",
    description: "Базове прибирання планується із запасом часу до визначеної дати. У справі фіксуються дедлайн і вимоги до звіту.",
    price: "від 800 ₴",
    time: "до вказаної дати",
    input: "дату, місто, точний орієнтир",
    note: "Термінові замовлення залежать від наявності перевіреного виконавця у вашому місті."
  },
  "known-flowers-flexible": {
    code: "FLOWERS / 01",
    title: "Квіти та догляд без дедлайну",
    description: "Виконавець погоджує композицію, купує її в межах ліміту, прибирає місце та додає чек і фото.",
    price: "робота від 500 ₴",
    time: "за погодженим вікном",
    input: "бюджет квітів, місто, орієнтир",
    note: "Квіти й лампадки оплачуються окремо від винагороди за роботу."
  },
  "known-flowers-date": {
    code: "FLOWERS / 02",
    title: "Квіти до пам'ятної дати",
    description: "Доставка квітів, легке прибирання й фото-підтвердження виконуються до зафіксованого дедлайну.",
    price: "робота від 600 ₴",
    time: "до вказаної дати",
    input: "дату, бюджет, побажання до квітів",
    note: "Рекомендуємо створювати справу завчасно, особливо перед великими пам'ятними днями."
  },
  "known-regular-flexible": {
    code: "PLAN / 04",
    title: "Сезонна турбота протягом року",
    description: "Після першого візиту ви погоджуєте з виконавцем весняний, літній, пам'ятний та осінній догляд.",
    price: "за кожен візит",
    time: "персональний графік",
    input: "бажану кількість візитів",
    note: "Кожен візит має окремий звіт, прийняття та оплату."
  },
  "known-regular-date": {
    code: "PLAN / DATE",
    title: "Регулярний догляд навколо важливих дат",
    description: "Графік формується навколо пам'ятних дат із додатковими сезонними візитами за потреби.",
    price: "за індивідуальним планом",
    time: "дати фіксуються наперед",
    input: "перелік дат і бажаний формат",
    note: "Координатор допоможе розподілити візити так, щоб не оплачувати зайвий обсяг."
  },
  "search-basic-flexible": {
    code: "SEARCH / 01",
    title: "Пошук поховання та первинний огляд",
    description: "Спочатку виконавець перевіряє надані дані, намагається знайти місце й надсилає фото стану для наступного рішення.",
    price: "за оцінкою пошуку",
    time: "після перевірки даних",
    input: "ПІБ, роки життя, можливе кладовище",
    note: "Оплата догляду узгоджується окремо після успішного пошуку й фото стану."
  },
  "search-basic-date": {
    code: "SEARCH / 02",
    title: "Пошук і догляд до визначеної дати",
    description: "Пошук має окремий етап. Після знаходження місця координатор підтвердить, чи реально завершити догляд до дедлайну.",
    price: "пошук + догляд",
    time: "залежить від складності пошуку",
    input: "дату та максимум відомих даних",
    note: "Ми не обіцяємо строк догляду, доки місце не знайдено й не зафіксовано його стан."
  },
  "search-flowers-flexible": {
    code: "SEARCH / FLOWERS",
    title: "Знайти місце й доставити квіти",
    description: "Після успішного пошуку ви погоджуєте фото місця, бюджет композиції та окрему винагороду за доставку.",
    price: "за окремим кошторисом",
    time: "після знаходження місця",
    input: "дані людини й побажання до квітів",
    note: "Покупки не здійснюються, поки замовник не підтвердив знайдене місце."
  },
  "search-flowers-date": {
    code: "SEARCH / DATE",
    title: "Пошук і квіти до важливої дати",
    description: "Координатор спершу оцінює реалістичність пошуку в доступний строк, а потім запускає доставку.",
    price: "за окремим кошторисом",
    time: "потребує запасу часу",
    input: "дату, ПІБ, роки життя, фото",
    note: "Чим більше вихідних даних і часу, тим вища ймовірність виконати запит до потрібної дати."
  },
  "search-regular-flexible": {
    code: "SEARCH / PLAN",
    title: "Знайти місце й організувати постійний догляд",
    description: "Після пошуку створюється перший звіт, а далі — персональний графік повторних візитів.",
    price: "пошук + кожен візит",
    time: "графік після першого огляду",
    input: "дані для пошуку та частоту догляду",
    note: "Регулярний план починається лише після підтвердження точного місця замовником."
  },
  "search-regular-date": {
    code: "SEARCH / PLAN+",
    title: "Пошук і календар пам'ятних дат",
    description: "Після знаходження поховання координатор допомагає сформувати календар догляду навколо важливих дат.",
    price: "за індивідуальним планом",
    time: "після завершення пошуку",
    input: "дані для пошуку та календар дат",
    note: "Перша дата може бути перенесена, якщо пошук потребуватиме більше часу, ніж очікувалося."
  }
};

if (carePlanner) {
  const controls = carePlanner.querySelector(".mem-planner-controls");
  const output = {
    code: carePlanner.querySelector("[data-planner-code]"),
    title: carePlanner.querySelector("[data-planner-title]"),
    description: carePlanner.querySelector("[data-planner-description]"),
    price: carePlanner.querySelector("[data-planner-price]"),
    time: carePlanner.querySelector("[data-planner-time]"),
    input: carePlanner.querySelector("[data-planner-input]"),
    note: carePlanner.querySelector("[data-planner-note]")
  };

  const updatePlanner = () => {
    const place = controls.querySelector('input[name="place"]:checked')?.value || "known";
    const care = controls.querySelector('input[name="care"]:checked')?.value || "basic";
    const timing = controls.querySelector('input[name="timing"]:checked')?.value || "flexible";
    const key = `${place}-${care}-${timing}`;
    const scenario = plannerScenarios[key] || plannerScenarios["known-basic-flexible"];

    Object.entries(output).forEach(([name, element]) => {
      element.textContent = scenario[name];
    });

    carePlanner.querySelector(".mem-planner-result")?.animate(
      [
        { opacity: 0.72, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 220, easing: "ease-out" }
    );
  };

  controls.addEventListener("change", updatePlanner);
  updatePlanner();
}

const yearPlanModes = {
  2: {
    months: [4, 10],
    count: "2 візити / рік",
    description: "Мінімальний сезонний ритм: весняне відновлення після зими та осіннє прибирання перед холодами.",
    visits: [
      ["КВІТЕНЬ", "Після зими", "листя · очищення · первинний огляд"],
      ["ЖОВТЕНЬ", "Перед холодами", "опале листя · порядок · фінальний звіт"]
    ]
  },
  4: {
    months: [3, 5, 8, 10],
    count: "4 візити / рік",
    description: "Збалансований сезонний план: після зими, до важливої дати, влітку та восени.",
    visits: [
      ["БЕРЕЗЕНЬ", "Після зими", "огляд · листя · очищення"],
      ["ТРАВЕНЬ", "Пам'ятна дата", "квіти · лампадка · фото"],
      ["СЕРПЕНЬ", "Літній догляд", "бур'яни · порядок · огляд"],
      ["ЖОВТЕНЬ", "Осінній візит", "листя · підготовка до холодів"]
    ]
  },
  6: {
    months: [3, 5, 7, 8, 10, 12],
    count: "6 візитів / рік",
    description: "Частіший контроль для місць, які потребують сезонного догляду або кількох важливих дат.",
    visits: [
      ["БЕРЕЗЕНЬ", "Весняний огляд", "стан після зими · фото"],
      ["ТРАВЕНЬ", "Пам'ятний візит", "квіти · прибирання"],
      ["ЛИПЕНЬ", "Літній контроль", "бур'яни · сухе листя"],
      ["СЕРПЕНЬ", "Другий літній візит", "порядок · оновлення квітів"],
      ["ЖОВТЕНЬ", "Осіннє прибирання", "листя · підготовка"],
      ["ГРУДЕНЬ", "Зимове підтвердження", "огляд · фото стану"]
    ]
  }
};

if (yearPlan) {
  const buttons = [...yearPlan.querySelectorAll("[data-year-mode]")];
  const monthLabels = [...yearPlan.querySelectorAll("[data-month]")];
  const markers = [...yearPlan.querySelectorAll("[data-month-marker]")];
  const visits = yearPlan.querySelector("[data-year-visits]");
  const count = yearPlan.querySelector("[data-year-count]");
  const description = yearPlan.querySelector("[data-year-description]");

  const updateYearPlan = (mode) => {
    const plan = yearPlanModes[mode] || yearPlanModes[4];
    const activeMonths = new Set(plan.months);

    buttons.forEach((button) => {
      const active = Number(button.dataset.yearMode) === Number(mode);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    monthLabels.forEach((label) => {
      label.classList.toggle("is-active", activeMonths.has(Number(label.dataset.month)));
    });

    markers.forEach((marker) => {
      marker.classList.toggle("is-active", activeMonths.has(Number(marker.dataset.monthMarker)));
    });

    visits.style.setProperty("--visit-count", String(plan.visits.length));
    count.textContent = plan.count;
    description.textContent = plan.description;
    visits.replaceChildren(...plan.visits.map(([month, title, details], index) => {
      const article = document.createElement("article");
      const number = String(index + 1).padStart(2, "0");
      article.innerHTML = `<span>${number} / ${month}</span><h3>${title}</h3><p>${details}</p>`;
      return article;
    }));
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => updateYearPlan(Number(button.dataset.yearMode)));
  });

  updateYearPlan(4);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealTargets = document.querySelectorAll(
    ".mem-section-head, .mem-cases-head, .mem-protection-head, .mem-interaction-head, .mem-report-grid, .mem-boundaries-grid, .mem-agency-head, .mem-faq-grid"
  );

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealTargets.forEach((target) => {
    target.classList.add("mem-reveal");
    revealObserver.observe(target);
  });
}

document.querySelectorAll("[data-compare]").forEach((compare) => {
  const range = compare.querySelector('input[type="range"]');

  if (!range) return;

  const updateCompare = () => {
    compare.style.setProperty("--compare-position", `${range.value}%`);
  };

  updateCompare();
  range.addEventListener("input", updateCompare);
});
