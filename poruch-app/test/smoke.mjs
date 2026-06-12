const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const testOrigin = process.env.TEST_ORIGIN ?? new URL(base).origin;
const stamp = Date.now();
const password = "Poruch-Test-2026!";

function csrf(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  if (!match) throw new Error("CSRF token missing");
  return match[1];
}

async function request(path, { method = "GET", cookie, body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(method === "POST" ? { origin: testOrigin } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body,
    redirect: "manual"
  });
  const text = await response.text();
  if (response.status >= 400) {
    throw new Error(`${method} ${path}: ${response.status} ${text.slice(0, 240)}`);
  }
  return {
    response,
    text,
    cookie: (response.headers.get("set-cookie") || "").split(";")[0],
    location: response.headers.get("location")
  };
}

async function postForm(path, cookie, values) {
  return request(path, {
    method: "POST",
    cookie,
    body: new URLSearchParams(values),
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });
}

async function register(role, name, email) {
  const output = await postForm("/register", "", {
    role,
    accountType: "person",
    organizationName: "",
    name,
    city: "Вінниця",
    phone: "+380991112233",
    email,
    password,
    consent: "on"
  });
  if (!output.cookie) throw new Error("Session cookie missing");
  return output.cookie;
}

await request("/readyz");

const customerEmail = `customer-${stamp}@example.test`;
const executorEmail = `executor-${stamp}@example.test`;
const customer = await register("customer", "Тестовий Замовник", customerEmail);
const executor = await register("executor", "Тестовий Виконавець", executorEmail);

let output = await request("/profile", { cookie: executor });
await postForm("/profile", executor, {
  _csrf: csrf(output.text),
  name: "Тестовий Виконавець",
  phone: "+380991112233",
  city: "Вінниця",
  accountType: "person",
  organizationName: "",
  bio: "Досвід догляду за похованнями та формування детальних фото-звітів.",
  serviceRadius: "40",
  notificationEmail: "on"
});

output = await request("/orders/new", { cookie: customer });
output = await postForm("/orders", customer, {
  _csrf: csrf(output.text),
  title: "Тестовий догляд",
  careType: "Базовий догляд",
  city: "Вінниця",
  locationHint: "Центральне кладовище",
  description: "Прибрати ділянку, встановити квіти та надіслати повний звіт.",
  workBudget: "1000",
  materialsBudget: "500",
  deadline: "2026-06-30"
});
const orderId = output.location.match(/\/orders\/(\d+)/)[1];

output = await request(`/orders/${orderId}`, { cookie: executor });
await postForm(`/orders/${orderId}/proposals`, executor, {
  _csrf: csrf(output.text),
  price: "1000",
  message: "Можу виконати завтра, маю досвід догляду та власний інвентар."
});

output = await request(`/orders/${orderId}`, { cookie: customer });
const proposalId = output.text.match(/name="proposalId" value="(\d+)"/)[1];
await postForm(`/orders/${orderId}/assign`, customer, {
  _csrf: csrf(output.text),
  proposalId
});

output = await request(`/orders/${orderId}`, { cookie: executor });
await postForm(`/orders/${orderId}/actions`, executor, {
  _csrf: csrf(output.text),
  action: "start"
});

output = await request(`/orders/${orderId}`, { cookie: executor });
const report = new FormData();
report.set("_csrf", csrf(output.text));
report.set("notes", "Ділянку очищено, поверхню вимито, квіти встановлено. Додаю фото результату.");
const png = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z0WQAAAAASUVORK5CYII=",
  "base64"
));
report.append("photos", new Blob([png], { type: "image/png" }), "result.png");
await request(`/orders/${orderId}/report`, { method: "POST", cookie: executor, body: report });

output = await request(`/orders/${orderId}`, { cookie: customer });
await postForm(`/orders/${orderId}/actions`, customer, {
  _csrf: csrf(output.text),
  action: "accept"
});

output = await request(`/orders/${orderId}`, { cookie: customer });
await postForm(`/orders/${orderId}/review`, customer, {
  _csrf: csrf(output.text),
  rating: "5",
  comment: "Роботу виконано акуратно, звіт повний."
});

output = await request(`/orders/${orderId}`, { cookie: customer });
if (!output.text.includes("Завершено") || !output.text.includes("750 ₴") || !output.text.includes("result.png") || !output.text.includes("★★★★★")) {
  throw new Error("Final order state mismatch");
}

output = await request("/notifications", { cookie: executor });
if (!output.text.includes("Вас обрано виконавцем") || !output.text.includes("Новий відгук")) {
  throw new Error("Executor notifications missing");
}

console.log(JSON.stringify({ ok: true, orderId, customerEmail, executorEmail }));
