const form = document.querySelector("#executor-form");
const categoryError = document.querySelector("#category-error");
const formStatus = document.querySelector("#form-status");
const incomeCalculator = document.querySelector("[data-income-calculator]");

const currencyFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 0
});

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} грн`;
}

function updateIncomeCalculator() {
  if (!incomeCalculator) {
    return;
  }

  const reward = Number(incomeCalculator.querySelector("[data-reward-input]").value);
  const tasks = Number(incomeCalculator.querySelector("[data-tasks-input]").value);
  const gross = reward * tasks;
  const fee = gross * 0.25;
  const net = gross - fee;

  incomeCalculator.querySelector("[data-reward-output]").textContent = formatCurrency(reward);
  incomeCalculator.querySelector("[data-tasks-output]").textContent = String(tasks);
  incomeCalculator.querySelector("[data-income-gross]").textContent = formatCurrency(gross);
  incomeCalculator.querySelector("[data-income-fee]").textContent = `− ${formatCurrency(fee)}`;
  incomeCalculator.querySelector("[data-income-one]").textContent = formatCurrency(reward * 0.75);
  incomeCalculator.querySelector("[data-income-total]").textContent = formatCurrency(net);
}

if (incomeCalculator) {
  incomeCalculator.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("input", updateIncomeCalculator);
  });
  updateIncomeCalculator();
}

function selectedCategories(formElement) {
  return [...formElement.querySelectorAll('input[name="categories[]"]:checked')]
    .map((input) => input.value);
}

function buildApplicationEmail(formElement) {
  const data = new FormData(formElement);
  const categories = selectedCategories(formElement);
  const subject = `Заявка виконавця Poruch — ${data.get("fullName")} / ${data.get("city")}`;
  const body = [
    "Нова заявка виконавця Poruch",
    "",
    `Ім'я: ${data.get("fullName")}`,
    `Місто: ${data.get("city")}`,
    `Телефон: ${data.get("phone")}`,
    `Email: ${data.get("email")}`,
    `Статус роботи: ${data.get("workStatus")}`,
    `Транспорт: ${data.get("transport")}`,
    `Категорії: ${categories.join(", ")}`,
    "",
    "Досвід і доступність:",
    data.get("experience"),
    "",
    "Підтверджено: 18+, умови співпраці та згода на обробку даних."
  ].join("\n");

  return `mailto:munister@outlook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    categoryError.textContent = "";
    formStatus.textContent = "";

    const categories = selectedCategories(form);
    if (!form.checkValidity() || categories.length === 0) {
      if (categories.length === 0) {
        categoryError.textContent = "Оберіть хоча б одну категорію завдань.";
      }
      form.reportValidity();
      formStatus.textContent = "Перевірте обов'язкові поля форми.";
      return;
    }

    formStatus.textContent = "Відкриваємо поштовий застосунок із підготовленою заявкою…";
    window.location.href = buildApplicationEmail(form);
  });

  form.querySelectorAll('input[name="categories[]"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (selectedCategories(form).length > 0) {
        categoryError.textContent = "";
      }
    });
  });
}
