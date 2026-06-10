import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000
});

const PORT = Number(process.env.PORT || 3000);
const APP_ORIGIN = process.env.APP_ORIGIN || `http://localhost:${PORT}`;
const COOKIE_NAME = process.env.COOKIE_NAME || "poruch_session";
const SESSION_DAYS = 30;
const COMMISSION_RATE = 0.25;
const uploadDir = path.join(__dirname, "uploads");

await fs.mkdir(uploadDir, { recursive: true });
await pool.query(await fs.readFile(path.join(__dirname, "schema.sql"), "utf8"));
await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "style-src": ["'self'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:"],
      "form-action": ["'self'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: "same-origin" }
}));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use("/assets", express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : 0
}));

const attempts = new Map();
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase().slice(0, 8);
      callback(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  }
});

const statusLabels = {
  new: "Нове",
  assigned: "Виконавця призначено",
  in_progress: "У роботі",
  awaiting_review: "Очікує перевірки",
  completed: "Завершено",
  changes_requested: "Потрібне уточнення",
  cancelled: "Скасовано",
  disputed: "Спір"
};

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `${new Intl.NumberFormat("uk-UA").format(Number(value || 0))} ₴`;
}

function date(value, includeTime = false) {
  if (!value) return "Не вказано";
  return new Intl.DateTimeFormat("uk-UA", includeTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Kyiv" }
    : { dateStyle: "medium", timeZone: "Europe/Kyiv" }
  ).format(new Date(value));
}

function payout(value) {
  return Math.round(Number(value || 0) * (1 - COMMISSION_RATE));
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(part => {
    const index = part.indexOf("=");
    if (index === -1) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 }, (error, derived) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt.toString("hex")}$${derived.toString("hex")}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [algorithm, saltHex, hashHex] = String(stored).split("$");
    if (algorithm !== "scrypt" || !saltHex || !hashHex) return resolve(false);
    const expected = Buffer.from(hashHex, "hex");
    crypto.scrypt(password, Buffer.from(saltHex, "hex"), expected.length, { N: 16_384, r: 8, p: 1 }, (error, derived) => {
      if (error) return reject(error);
      resolve(crypto.timingSafeEqual(expected, derived));
    });
  });
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());
}

function limitAuth(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const current = attempts.get(key) || { count: 0, reset: now + 15 * 60_000 };
  if (current.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
    return next();
  }
  current.count += 1;
  attempts.set(key, current);
  if (current.count > 30) return res.status(429).send("Забагато спроб. Спробуйте через 15 хвилин.");
  next();
}

async function createSession(res, userId) {
  const token = randomToken();
  const csrf = randomToken(24);
  await pool.query(
    "INSERT INTO sessions(token_hash, user_id, csrf_token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')",
    [tokenHash(token), userId, csrf]
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

app.use(async (req, _res, next) => {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    req.user = null;
    req.session = null;
    if (token) {
      const { rows } = await pool.query(
        `SELECT s.token_hash, s.csrf_token, s.expires_at,
                u.id, u.name, u.email, u.role, u.phone, u.city
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [tokenHash(token)]
      );
      if (rows[0]) {
        req.session = {
          tokenHash: rows[0].token_hash,
          csrf: rows[0].csrf_token
        };
        req.user = rows[0];
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  if (req.method !== "POST") return next();
  const origin = req.get("origin");
  const expected = `${req.protocol}://${req.get("host")}`;
  if (origin && origin !== expected) return res.status(403).send("Запит із цього джерела заборонено.");
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.redirect("/login");
    if (req.user.role !== role) return res.status(403).send("Ця дія недоступна для вашої ролі.");
    next();
  };
}

function verifyCsrf(req, res, next) {
  const supplied = String(req.body?._csrf || "");
  if (!req.session?.csrf || supplied.length < 20) return res.status(403).send("Сесію форми завершено. Оновіть сторінку.");
  const expected = Buffer.from(req.session.csrf);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return res.status(403).send("Невірний захисний токен.");
  }
  next();
}

function csrfField(req) {
  return `<input type="hidden" name="_csrf" value="${esc(req.session?.csrf || "")}">`;
}

function roleName(role) {
  return role === "customer" ? "Замовник" : "Виконавець";
}

function layout({ title, user, body, description = "" }) {
  const navigation = user ? `
    <nav class="nav" aria-label="Основна навігація">
      <a href="/dashboard">Кабінет</a>
      ${user.role === "customer" ? `<a href="/orders/new">Нове замовлення</a>` : `<a href="/orders/available">Доступні замовлення</a>`}
      <a href="https://munister.com.ua/poruch/">Про сервіс</a>
    </nav>
    <div class="user-menu">
      <div><strong>${esc(user.name)}</strong><span>${roleName(user.role)}</span></div>
      <form method="post" action="/logout">${csrfField({ session: user._session })}<button class="link-button" type="submit">Вийти</button></form>
    </div>` : "";
  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description || title)}">
  <meta name="theme-color" content="#f5f2eb">
  <title>${esc(title)} — Поруч</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;family=JetBrains+Mono:wght@400;500&amp;family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/app.css?v=20260610-1">
</head>
<body>
  <div class="shell">
    ${user ? `<header class="topbar">
      <a class="brand" href="/dashboard"><span class="brand-mark">P</span><span class="brand-copy"><small>MUNISTER / SERVICE 01</small><strong>Поруч</strong></span></a>
      ${navigation}
    </header>` : ""}
    ${body}
  </div>
</body>
</html>`;
}

function withSessionUser(req) {
  return req.user ? { ...req.user, _session: req.session } : null;
}

function authView(req, mode, error = "", values = {}) {
  const register = mode === "register";
  return layout({
    title: register ? "Створити кабінет" : "Увійти",
    body: `<main class="auth-page">
      <section class="auth-story">
        <a class="brand" href="https://munister.com.ua/poruch/"><span class="brand-mark">P</span><span class="brand-copy"><small>MUNISTER / SERVICE 01</small><strong>Поруч</strong></span></a>
        <div>
          <p class="eyebrow">CARE / UKRAINE / CABINET</p>
          <h1>${register ? "Один сервіс. Дві сторони турботи." : "Поверніться до справ, які вже поруч."}</h1>
          <p>${register ? "Замовники створюють і контролюють доручення. Виконавці отримують підготовлені замовлення, фіксують результат і бачать свою виплату." : "У кабінеті зберігаються домовленості, повідомлення, фотографії, витрати та повна історія кожного замовлення."}</p>
        </div>
        <p>Безпека: захищена сесія, фіксація змін і доступ до матеріалів лише для сторін замовлення.</p>
      </section>
      <section class="auth-panel">
        <form class="auth-form" method="post" action="/${mode}">
          <p class="eyebrow">${register ? "Реєстрація" : "Авторизація"}</p>
          <h2>${register ? "Створити кабінет" : "З поверненням"}</h2>
          <p>${register ? "Оберіть роль. Її не можна змінити самостійно після реєстрації." : "Введіть email і пароль, використані під час реєстрації."}</p>
          ${error ? `<div class="error">${esc(error)}</div>` : ""}
          ${register ? `
            <div class="role-picker" role="radiogroup" aria-label="Роль у сервісі">
              <label><input type="radio" name="role" value="customer" ${values.role !== "executor" ? "checked" : ""}><span>Я замовник</span></label>
              <label><input type="radio" name="role" value="executor" ${values.role === "executor" ? "checked" : ""}><span>Я виконавець</span></label>
            </div>
            <label>Ім'я та прізвище<input name="name" autocomplete="name" required minlength="2" maxlength="100" value="${esc(values.name)}"></label>
            <div class="field-grid">
              <label>Місто<input name="city" autocomplete="address-level2" required maxlength="100" value="${esc(values.city)}"></label>
              <label>Телефон<input name="phone" type="tel" autocomplete="tel" required maxlength="30" placeholder="+380" value="${esc(values.phone)}"></label>
            </div>` : ""}
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="200" value="${esc(values.email)}"></label>
          <label>Пароль<input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" required minlength="10" maxlength="200"></label>
          ${register ? `<p class="helper">Щонайменше 10 символів. Не використовуйте пароль від пошти чи банку.</p>` : ""}
          ${register ? `<label class="consent-line"><input type="checkbox" name="consent" required><span>Погоджуюся з <a href="https://munister.com.ua/poruch/executor-terms.html" target="_blank" rel="noopener">умовами сервісу</a> та <a href="https://munister.com.ua/poruch/privacy.html" target="_blank" rel="noopener">обробкою персональних даних</a>.</span></label>` : ""}
          <button class="button button-wine" type="submit">${register ? "Створити кабінет" : "Увійти"}</button>
          <p class="auth-switch">${register ? `Вже маєте кабінет? <a href="/login">Увійти</a>` : `Ще не зареєстровані? <a href="/register">Створити кабінет</a>`}</p>
        </form>
      </section>
    </main>`
  });
}

function statusTag(status) {
  return `<span class="status status-${esc(status)}">${esc(statusLabels[status] || status)}</span>`;
}

function orderRows(orders, userRole) {
  if (!orders.length) return `<div class="empty">Тут поки немає замовлень.</div>`;
  return `<div class="order-list">${orders.map(order => `
    <a class="order-row" href="/orders/${order.id}">
      <span class="order-id">№ ${String(order.id).padStart(4, "0")}</span>
      <div><h3>${esc(order.title)}</h3><p>${esc(order.city)} · ${esc(order.care_type)}</p></div>
      <div class="order-meta">${statusTag(order.status)}<span>${order.deadline ? `до ${date(order.deadline)}` : "без жорсткої дати"}</span></div>
      <div class="order-money"><span>${userRole === "executor" ? "Ваша виплата" : "Бюджет роботи"}</span><strong>${money(userRole === "executor" ? payout(order.work_budget) : order.work_budget)}</strong></div>
      <span class="chevron">→</span>
    </a>`).join("")}</div>`;
}

async function getOrderForUser(id, user) {
  const { rows } = await pool.query(
    `SELECT o.*, c.name customer_name, c.email customer_email,
            e.name executor_name, e.email executor_email
     FROM orders o
     JOIN users c ON c.id = o.customer_id
     LEFT JOIN users e ON e.id = o.executor_id
     WHERE o.id = $1`,
    [id]
  );
  const order = rows[0];
  if (!order) return null;
  if (user.role === "customer" && order.customer_id !== user.id) return null;
  if (user.role === "executor" && order.executor_id !== user.id && order.status !== "new") {
    const proposal = await pool.query("SELECT 1 FROM proposals WHERE order_id = $1 AND executor_id = $2", [id, user.id]);
    if (!proposal.rowCount) return null;
  }
  return order;
}

async function event(orderId, actorId, type, details = "") {
  await pool.query(
    "INSERT INTO order_events(order_id, actor_id, event_type, details) VALUES ($1, $2, $3, $4)",
    [orderId, actorId, type, details]
  );
}

app.get("/", (req, res) => res.redirect(req.user ? "/dashboard" : "/login"));

app.get("/healthz", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, service: "poruch-app" });
});

app.get("/register", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(authView(req, "register"));
});

app.post("/register", limitAuth, async (req, res, next) => {
  try {
    const values = {
      role: req.body.role,
      name: String(req.body.name || "").trim(),
      city: String(req.body.city || "").trim(),
      phone: String(req.body.phone || "").trim(),
      email: String(req.body.email || "").trim().toLowerCase()
    };
    const password = String(req.body.password || "");
    const consent = req.body.consent === "on";
    if (!["customer", "executor"].includes(values.role)) return res.status(400).send(authView(req, "register", "Оберіть роль.", values));
    if (values.name.length < 2 || values.city.length < 2 || values.phone.length < 7) return res.status(400).send(authView(req, "register", "Перевірте ім'я, місто й телефон.", values));
    if (!validateEmail(values.email)) return res.status(400).send(authView(req, "register", "Вкажіть коректний email.", values));
    if (password.length < 10) return res.status(400).send(authView(req, "register", "Пароль має містити щонайменше 10 символів.", values));
    if (!consent) return res.status(400).send(authView(req, "register", "Потрібно прийняти умови сервісу та повідомлення про приватність.", values));
    const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [values.email]);
    if (exists.rowCount) return res.status(409).send(authView(req, "register", "Кабінет із таким email вже існує.", values));
    const result = await pool.query(
      "INSERT INTO users(name, email, password_hash, role, phone, city) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [values.name, values.email, await hashPassword(password), values.role, values.phone, values.city]
    );
    await createSession(res, result.rows[0].id);
    res.redirect("/dashboard?welcome=1");
  } catch (error) {
    next(error);
  }
});

app.get("/login", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(authView(req, "login"));
});

app.post("/login", limitAuth, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [email]);
    if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
      return res.status(401).send(authView(req, "login", "Email або пароль не збігаються.", { email }));
    }
    await createSession(res, rows[0].id);
    res.redirect("/dashboard");
  } catch (error) {
    next(error);
  }
});

app.post("/logout", requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [req.session.tokenHash]);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.redirect("/login");
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const user = withSessionUser(req);
    if (req.user.role === "customer") {
      const orders = (await pool.query("SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC", [req.user.id])).rows;
      const counts = {
        new: orders.filter(order => order.status === "new").length,
        in_progress: orders.filter(order => ["assigned", "in_progress", "changes_requested"].includes(order.status)).length,
        awaiting_review: orders.filter(order => order.status === "awaiting_review").length,
        completed: orders.filter(order => order.status === "completed").length
      };
      return res.send(layout({
        title: "Кабінет замовника",
        user,
        body: `<main class="page">
          <header class="page-head">
            <div><p class="eyebrow">Кабінет замовника</p><h1>Ваші справи під контролем.</h1><p>Створюйте замовлення, обирайте виконавця, погоджуйте зміни й приймайте фото-звіт в одному місці.</p></div>
            <a class="button button-wine" href="/orders/new">Створити замовлення</a>
          </header>
          ${req.query.welcome ? `<div class="notice">Кабінет створено. Тепер можна оформити перше замовлення.</div>` : ""}
          <section class="stats">
            <div class="stat"><span>Нові</span><strong>${counts.new}</strong></div>
            <div class="stat"><span>У роботі</span><strong>${counts.in_progress}</strong></div>
            <div class="stat"><span>На перевірці</span><strong>${counts.awaiting_review}</strong></div>
            <div class="stat"><span>Завершено</span><strong>${counts.completed}</strong></div>
          </section>
          <section class="section-block">
            <div class="section-title"><h2>Усі замовлення</h2><p>У картці зберігаються пропозиції, переписка, звіти й історія рішень.</p></div>
            ${orderRows(orders, "customer")}
          </section>
        </main>`
      }));
    }

    const active = (await pool.query(
      "SELECT * FROM orders WHERE executor_id = $1 AND status NOT IN ('completed','cancelled') ORDER BY updated_at DESC",
      [req.user.id]
    )).rows;
    const available = (await pool.query(
      `SELECT o.* FROM orders o
       WHERE o.status = 'new' AND NOT EXISTS (
         SELECT 1 FROM proposals p WHERE p.order_id = o.id AND p.executor_id = $1
       ) ORDER BY o.created_at DESC LIMIT 8`,
      [req.user.id]
    )).rows;
    const completed = (await pool.query("SELECT * FROM orders WHERE executor_id = $1 AND status = 'completed'", [req.user.id])).rows;
    const pendingPayout = active.reduce((sum, order) => sum + payout(order.work_budget), 0);
    const earned = completed.reduce((sum, order) => sum + payout(order.work_budget), 0);
    res.send(layout({
      title: "Кабінет виконавця",
      user,
      body: `<main class="page">
        <header class="page-head">
          <div><p class="eyebrow">Кабінет виконавця</p><h1>Робота без холодного пошуку клієнтів.</h1><p>Переглядайте підготовлені замовлення, надсилайте пропозицію, фіксуйте зміни й здавайте результат за стандартом Poruch.</p></div>
          <a class="button" href="/orders/available">Усі доступні</a>
        </header>
        ${req.query.welcome ? `<div class="notice">Кабінет створено. Перегляньте доступні замовлення у вашому місті.</div>` : ""}
        <section class="stats">
          <div class="stat"><span>Активні</span><strong>${active.length}</strong></div>
          <div class="stat"><span>Нові поруч</span><strong>${available.length}</strong></div>
          <div class="stat"><span>Очікувана виплата</span><strong>${money(pendingPayout)}</strong></div>
          <div class="stat"><span>Вже зароблено</span><strong>${money(earned)}</strong></div>
        </section>
        <section class="section-block">
          <div class="section-title"><h2>Активна робота</h2><p>Тут замовлення, у яких вас уже обрано виконавцем.</p></div>
          ${orderRows(active, "executor")}
        </section>
        <section class="section-block">
          <div class="section-title"><h2>Нові замовлення</h2><p>До прийняття видно обсяг, строк, бюджет і вашу виплату після комісії 25%.</p></div>
          ${orderRows(available, "executor")}
        </section>
      </main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.get("/orders/available", requireRole("executor"), async (req, res, next) => {
  try {
    const orders = (await pool.query(
      `SELECT o.*,
              EXISTS(SELECT 1 FROM proposals p WHERE p.order_id = o.id AND p.executor_id = $1) proposed
       FROM orders o WHERE o.status = 'new' ORDER BY o.created_at DESC`,
      [req.user.id]
    )).rows;
    res.send(layout({
      title: "Доступні замовлення",
      user: withSessionUser(req),
      body: `<main class="page">
        <header class="page-head"><div><p class="eyebrow">Біржа замовлень</p><h1>Оберіть справу, яка вам підходить.</h1><p>Надсилання пропозиції не зобов'язує замовника обрати вас. Не починайте роботу до офіційного призначення в кабінеті.</p></div></header>
        ${orderRows(orders, "executor")}
      </main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.get("/orders/new", requireRole("customer"), (req, res) => {
  res.send(layout({
    title: "Нове замовлення",
    user: withSessionUser(req),
    body: `<main class="page">
      <header class="page-head"><div><p class="eyebrow">Нове замовлення</p><h1>Опишіть результат, який потрібно отримати.</h1><p>Точну адресу й чутливі дані можна уточнити після вибору виконавця. На першому кроці достатньо міста, кладовища та орієнтирів.</p></div></header>
      <form class="form-card" method="post" action="/orders">
        ${csrfField(req)}
        <label>Коротка назва<input name="title" required maxlength="140" placeholder="Наприклад: сезонний догляд і живі квіти"></label>
        <div class="field-grid">
          <label>Тип догляду<select name="careType" required>
            <option value="">Оберіть</option>
            <option>Базовий догляд</option><option>Квіти та лампадка</option>
            <option>Регулярна турбота</option><option>Пошук поховання</option>
            <option>Ремонт або реставрація</option><option>Інше доручення</option>
          </select></label>
          <label>Місто<input name="city" required maxlength="100" value="${esc(req.user.city)}"></label>
        </div>
        <label>Кладовище або орієнтир<input name="locationHint" required maxlength="240" placeholder="Без точної адреси, якщо не хочете відкривати її всім виконавцям"></label>
        <label>Що потрібно зробити<textarea name="description" rows="7" required maxlength="3000" placeholder="Стан місця, перелік робіт, побажання до квітів, важлива дата"></textarea></label>
        <div class="field-grid">
          <label>Бюджет роботи, ₴<input name="workBudget" type="number" min="100" max="1000000" required></label>
          <label>Ліміт матеріалів, ₴<input name="materialsBudget" type="number" min="0" max="1000000" value="0" required></label>
        </div>
        <label>Бажана дата завершення<input name="deadline" type="date"></label>
        <p class="helper">Комісія Poruch утримується з винагороди виконавця. Матеріали рахуються окремо й оплачуються лише після погодження.</p>
        <div class="form-actions"><button class="button button-wine" type="submit">Опублікувати замовлення</button><a class="button button-secondary" href="/dashboard">Скасувати</a></div>
      </form>
    </main>`
  }));
});

app.post("/orders", requireRole("customer"), verifyCsrf, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const careType = String(req.body.careType || "").trim();
    const city = String(req.body.city || "").trim();
    const locationHint = String(req.body.locationHint || "").trim();
    const description = String(req.body.description || "").trim();
    const workBudget = Number(req.body.workBudget);
    const materialsBudget = Number(req.body.materialsBudget || 0);
    const deadline = req.body.deadline || null;
    if (!title || !careType || !city || !locationHint || description.length < 20 || workBudget < 100 || materialsBudget < 0) {
      return res.status(400).send("Перевірте обов'язкові поля та бюджет.");
    }
    const { rows } = await pool.query(
      `INSERT INTO orders(customer_id, title, care_type, city, location_hint, description, deadline, work_budget, materials_budget)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.user.id, title, careType, city, locationHint, description, deadline, Math.round(workBudget), Math.round(materialsBudget)]
    );
    await event(rows[0].id, req.user.id, "created", "Замовлення опубліковано");
    res.redirect(`/orders/${rows[0].id}?created=1`);
  } catch (error) {
    next(error);
  }
});

app.get("/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    if (!order) return res.status(404).send("Замовлення не знайдено або доступ закритий.");
    const proposals = (await pool.query(
      `SELECT p.*, u.name executor_name, u.city executor_city
       FROM proposals p JOIN users u ON u.id = p.executor_id
       WHERE p.order_id = $1 ORDER BY p.created_at`,
      [order.id]
    )).rows;
    const messages = order.executor_id ? (await pool.query(
      `SELECT m.*, u.name sender_name FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.order_id = $1 ORDER BY m.created_at`,
      [order.id]
    )).rows : [];
    const reports = (await pool.query(
      `SELECT r.*, u.name executor_name,
              COALESCE(json_agg(json_build_object('id', f.id, 'name', f.original_name))
              FILTER (WHERE f.id IS NOT NULL), '[]') files
       FROM reports r JOIN users u ON u.id = r.executor_id
       LEFT JOIN report_files f ON f.report_id = r.id
       WHERE r.order_id = $1 GROUP BY r.id, u.name ORDER BY r.created_at DESC`,
      [order.id]
    )).rows;
    const myProposal = proposals.find(proposal => proposal.executor_id === req.user.id);
    const participant = order.customer_id === req.user.id || order.executor_id === req.user.id;
    const actionCard = req.user.role === "executor"
      ? executorActions(req, order, myProposal)
      : customerActions(req, order, proposals);

    res.send(layout({
      title: order.title,
      user: withSessionUser(req),
      body: `<main class="page">
        ${req.query.created ? `<div class="notice">Замовлення опубліковано. Тепер виконавці можуть надіслати пропозиції.</div>` : ""}
        ${req.query.updated ? `<div class="notice">Статус замовлення оновлено.</div>` : ""}
        <header class="page-head">
          <div><p class="eyebrow">Замовлення № ${String(order.id).padStart(4, "0")}</p><h1>${esc(order.title)}</h1><p>${esc(order.city)} · створено ${date(order.created_at)}</p></div>
          ${statusTag(order.status)}
        </header>
        <div class="detail-grid">
          <div>
            <section class="detail-card">
              <p class="eyebrow">Зафіксований бриф</p>
              <h2>${esc(order.care_type)}</h2>
              <div class="detail-facts">
                <div><span>Місто / орієнтир</span><strong>${esc(order.city)} · ${esc(order.location_hint)}</strong></div>
                <div><span>Строк</span><strong>${date(order.deadline)}</strong></div>
                <div><span>Бюджет роботи</span><strong>${money(order.work_budget)}</strong></div>
                <div><span>Матеріали</span><strong>до ${money(order.materials_budget)}</strong></div>
                <div><span>Замовник</span><strong>${esc(order.customer_name)}</strong></div>
                <div><span>Виконавець</span><strong>${esc(order.executor_name || "Ще не обрано")}</strong></div>
              </div>
              <p class="description">${esc(order.description)}</p>
            </section>

            ${reports.length ? `<section class="section-block">
              <div class="section-title"><h2>Звіти виконавця</h2></div>
              ${reports.map(report => `<article class="report">
                <p class="eyebrow">${esc(report.executor_name)} · ${date(report.created_at, true)}</p>
                <p class="description">${esc(report.notes)}</p>
                ${report.files.length ? `<div class="report-files">${report.files.map(file => `<a href="/files/${file.id}" target="_blank"><img src="/files/${file.id}" alt="${esc(file.name)}" loading="lazy"></a>`).join("")}</div>` : ""}
              </article>`).join("")}
            </section>` : ""}

            ${participant ? `<section class="section-block">
              <div class="section-title"><h2>Переписка сторін</h2><p>Повідомлення зберігаються разом із замовленням і можуть використовуватися під час розгляду спору.</p></div>
              <div class="messages">
                ${messages.length ? messages.map(message => `<article class="message ${message.sender_id === req.user.id ? "message-own" : ""}"><small>${esc(message.sender_name)} · ${date(message.created_at, true)}</small><p>${esc(message.body)}</p></article>`).join("") : `<div class="empty">Повідомлень ще немає.</div>`}
              </div>
              <form class="message-form" method="post" action="/orders/${order.id}/messages">
                ${csrfField(req)}
                <textarea name="body" required maxlength="2000" placeholder="Напишіть повідомлення"></textarea>
                <button class="button" type="submit">Надіслати</button>
              </form>
            </section>` : ""}
          </div>
          <aside>
            <div class="side-card payout"><span>Виплата виконавцю після комісії 25%</span><strong>${money(payout(order.work_budget))}</strong><span>Матеріали компенсуються окремо.</span></div>
            ${actionCard}
          </aside>
        </div>
      </main>`
    }));
  } catch (error) {
    next(error);
  }
});

function executorActions(req, order, proposal) {
  if (order.status === "new" && !proposal) return `<section class="side-card">
    <p class="eyebrow">Ваша пропозиція</p><h3>Готові виконати?</h3>
    <form method="post" action="/orders/${order.id}/proposals">
      ${csrfField(req)}
      <label>Вартість роботи, ₴<input name="price" type="number" min="100" max="1000000" value="${order.work_budget}" required></label>
      <label>Повідомлення замовнику<textarea name="message" rows="5" maxlength="1200" required placeholder="Коротко про досвід, доступність і строки"></textarea></label>
      <button class="button button-wine" type="submit">Надіслати пропозицію</button>
    </form>
  </section>`;
  if (order.status === "new" && proposal) return `<section class="side-card"><p class="eyebrow">Пропозицію надіслано</p><h3>${money(proposal.proposed_price)}</h3><p>${esc(proposal.message)}</p><p class="helper">Не починайте роботу, доки замовник не призначить вас у кабінеті.</p></section>`;
  if (order.executor_id !== req.user.id) return `<section class="side-card"><p>Замовник обрав іншого виконавця або замовлення більше недоступне.</p></section>`;
  if (order.status === "assigned") return `<section class="side-card"><p class="eyebrow">Наступний крок</p><h3>Підтвердьте початок</h3><p>Перед виїздом уточніть деталі в переписці. Після натискання статус зміниться на «У роботі».</p><form method="post" action="/orders/${order.id}/actions">${csrfField(req)}<input type="hidden" name="action" value="start"><button class="button" type="submit">Почати роботу</button></form></section>`;
  if (["in_progress", "changes_requested"].includes(order.status)) return `<section class="side-card"><p class="eyebrow">Здати результат</p><h3>Фото і коментар</h3><form method="post" enctype="multipart/form-data" action="/orders/${order.id}/report">${csrfField(req)}<label>Що виконано<textarea name="notes" rows="6" required maxlength="3000"></textarea></label><label>Фото, до 8 файлів<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label><p class="helper">JPEG, PNG або WebP, до 8 МБ кожен.</p><button class="button button-wine" type="submit">Надіслати звіт</button></form></section>`;
  if (order.status === "awaiting_review") return `<section class="side-card"><p class="eyebrow">Звіт на перевірці</p><h3>Очікуємо замовника</h3><p>Замовник може прийняти результат або попросити конкретне виправлення.</p></section>`;
  if (order.status === "completed") return `<section class="side-card"><p class="eyebrow">Роботу прийнято</p><h3>${money(payout(order.work_budget))}</h3><p>Сума до виплати виконавцю. Строк і спосіб розрахунку визначаються умовами пілоту.</p></section>`;
  return `<section class="side-card"><p>Поточний статус: ${esc(statusLabels[order.status])}.</p></section>`;
}

function customerActions(req, order, proposals) {
  if (order.status === "new") return `<section class="side-card">
    <p class="eyebrow">Пропозиції виконавців</p><h3>${proposals.length || "Поки немає"}</h3>
    ${proposals.length ? proposals.map(proposal => `<article class="proposal"><div class="proposal-head"><strong>${esc(proposal.executor_name)}</strong><strong>${money(proposal.proposed_price)}</strong></div><p>${esc(proposal.executor_city)} · ${esc(proposal.message)}</p><form method="post" action="/orders/${order.id}/assign">${csrfField(req)}<input type="hidden" name="proposalId" value="${proposal.id}"><button class="button button-wine" type="submit">Обрати виконавця</button></form></article>`).join("") : `<p>Ми покажемо тут кандидатів, їхню ціну й повідомлення.</p>`}
    <form method="post" action="/orders/${order.id}/actions">${csrfField(req)}<input type="hidden" name="action" value="cancel"><button class="link-button" type="submit">Скасувати замовлення</button></form>
  </section>`;
  if (order.status === "awaiting_review") return `<section class="side-card"><p class="eyebrow">Перевірка результату</p><h3>Прийняти чи уточнити?</h3><p>Звірте фото з брифом і погодженими змінами.</p><form class="form-actions" method="post" action="/orders/${order.id}/actions">${csrfField(req)}<button class="button" name="action" value="accept" type="submit">Прийняти роботу</button><button class="button button-secondary" name="action" value="changes" type="submit">Потрібні зміни</button></form></section>`;
  if (order.status === "completed") return `<section class="side-card"><p class="eyebrow">Замовлення завершено</p><h3>Результат прийнято</h3><p>Звіт і переписка залишаються доступними в кабінеті.</p></section>`;
  return `<section class="side-card"><p class="eyebrow">Виконавець</p><h3>${esc(order.executor_name || "Не призначено")}</h3><p>Статус: ${esc(statusLabels[order.status])}.</p></section>`;
}

app.post("/orders/:id/proposals", requireRole("executor"), verifyCsrf, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    if (!order || order.status !== "new") return res.status(409).send("Замовлення вже недоступне.");
    const message = String(req.body.message || "").trim();
    const price = Math.round(Number(req.body.price));
    if (message.length < 10 || price < 100) return res.status(400).send("Додайте змістовне повідомлення і коректну ціну.");
    await pool.query(
      `INSERT INTO proposals(order_id, executor_id, message, proposed_price)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT(order_id, executor_id) DO UPDATE SET message = EXCLUDED.message, proposed_price = EXCLUDED.proposed_price`,
      [order.id, req.user.id, message, price]
    );
    await event(order.id, req.user.id, "proposal", `Пропозиція: ${price} грн`);
    res.redirect(`/orders/${order.id}`);
  } catch (error) {
    next(error);
  }
});

app.post("/orders/:id/assign", requireRole("customer"), verifyCsrf, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const orderResult = await client.query("SELECT * FROM orders WHERE id = $1 AND customer_id = $2 FOR UPDATE", [req.params.id, req.user.id]);
    const order = orderResult.rows[0];
    if (!order || order.status !== "new") throw new Error("ORDER_UNAVAILABLE");
    const proposalResult = await client.query("SELECT * FROM proposals WHERE id = $1 AND order_id = $2", [req.body.proposalId, order.id]);
    const proposal = proposalResult.rows[0];
    if (!proposal) throw new Error("PROPOSAL_NOT_FOUND");
    await client.query(
      "UPDATE orders SET executor_id = $1, work_budget = $2, status = 'assigned', updated_at = NOW() WHERE id = $3",
      [proposal.executor_id, proposal.proposed_price, order.id]
    );
    await client.query(
      "INSERT INTO order_events(order_id, actor_id, event_type, details) VALUES ($1,$2,'assigned',$3)",
      [order.id, req.user.id, `Виконавця призначено, бюджет ${proposal.proposed_price} грн`]
    );
    await client.query("COMMIT");
    res.redirect(`/orders/${order.id}?updated=1`);
  } catch (error) {
    await client.query("ROLLBACK");
    if (["ORDER_UNAVAILABLE", "PROPOSAL_NOT_FOUND"].includes(error.message)) return res.status(409).send("Не вдалося призначити виконавця. Оновіть сторінку.");
    next(error);
  } finally {
    client.release();
  }
});

app.post("/orders/:id/messages", requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    if (!order || !order.executor_id || ![order.customer_id, order.executor_id].includes(req.user.id)) return res.status(403).send("Переписка недоступна.");
    const body = String(req.body.body || "").trim();
    if (!body || body.length > 2000) return res.status(400).send("Перевірте текст повідомлення.");
    await pool.query("INSERT INTO messages(order_id, sender_id, body) VALUES ($1,$2,$3)", [order.id, req.user.id, body]);
    res.redirect(`/orders/${order.id}#messages`);
  } catch (error) {
    next(error);
  }
});

app.post("/orders/:id/actions", requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    if (!order) return res.status(404).send("Замовлення не знайдено.");
    const action = req.body.action;
    let nextStatus;
    if (req.user.role === "executor" && order.executor_id === req.user.id && action === "start" && order.status === "assigned") nextStatus = "in_progress";
    if (req.user.role === "customer" && order.customer_id === req.user.id && action === "accept" && order.status === "awaiting_review") nextStatus = "completed";
    if (req.user.role === "customer" && order.customer_id === req.user.id && action === "changes" && order.status === "awaiting_review") nextStatus = "changes_requested";
    if (req.user.role === "customer" && order.customer_id === req.user.id && action === "cancel" && order.status === "new") nextStatus = "cancelled";
    if (!nextStatus) return res.status(409).send("Цей перехід статусу зараз недоступний.");
    await pool.query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [nextStatus, order.id]);
    await event(order.id, req.user.id, nextStatus, `Статус: ${statusLabels[nextStatus]}`);
    res.redirect(`/orders/${order.id}?updated=1`);
  } catch (error) {
    next(error);
  }
});

app.post("/orders/:id/report", requireRole("executor"), (req, res, next) => {
  upload.array("photos", 8)(req, res, error => {
    if (error) return res.status(400).send("Не вдалося завантажити фото. Перевірте формат і розмір.");
    next();
  });
}, verifyCsrf, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    if (!order || order.executor_id !== req.user.id || !["in_progress", "changes_requested"].includes(order.status)) {
      return res.status(409).send("Звіт зараз не можна надіслати.");
    }
    const notes = String(req.body.notes || "").trim();
    if (notes.length < 20 || !req.files?.length) {
      await Promise.all((req.files || []).map(file => fs.unlink(file.path).catch(() => {})));
      return res.status(400).send("Додайте опис виконаного та щонайменше одне фото.");
    }
    await client.query("BEGIN");
    const reportResult = await client.query(
      "INSERT INTO reports(order_id, executor_id, notes) VALUES ($1,$2,$3) RETURNING id",
      [order.id, req.user.id, notes]
    );
    for (const file of req.files) {
      await client.query(
        "INSERT INTO report_files(report_id, original_name, storage_name, mime_type, file_size) VALUES ($1,$2,$3,$4,$5)",
        [reportResult.rows[0].id, file.originalname, file.filename, file.mimetype, file.size]
      );
    }
    await client.query("UPDATE orders SET status = 'awaiting_review', updated_at = NOW() WHERE id = $1", [order.id]);
    await client.query(
      "INSERT INTO order_events(order_id, actor_id, event_type, details) VALUES ($1,$2,'report','Звіт надіслано замовнику')",
      [order.id, req.user.id]
    );
    await client.query("COMMIT");
    res.redirect(`/orders/${order.id}?updated=1`);
  } catch (error) {
    await client.query("ROLLBACK");
    await Promise.all((req.files || []).map(file => fs.unlink(file.path).catch(() => {})));
    next(error);
  } finally {
    client.release();
  }
});

app.get("/files/:id", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, o.customer_id, o.executor_id
       FROM report_files f
       JOIN reports r ON r.id = f.report_id
       JOIN orders o ON o.id = r.order_id
       WHERE f.id = $1`,
      [req.params.id]
    );
    const file = rows[0];
    if (!file || ![file.customer_id, file.executor_id].includes(req.user.id)) return res.status(404).send("Файл не знайдено.");
    res.type(file.mime_type);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
    res.sendFile(path.join(uploadDir, file.storage_name));
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => res.status(404).send(layout({
  title: "Сторінку не знайдено",
  body: `<main class="page"><p class="eyebrow">404</p><h1>Цієї сторінки немає.</h1><a class="button" href="/">До кабінету</a></main>`
})));

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).send(layout({
    title: "Помилка",
    user: withSessionUser(req),
    body: `<main class="page"><p class="eyebrow">Помилка сервісу</p><h1>Не вдалося виконати дію.</h1><p>Спробуйте ще раз. Якщо проблема повториться, напишіть на munister@outlook.com.</p><a class="button" href="/dashboard">До кабінету</a></main>`
  }));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Poruch app listening on ${PORT}; origin ${APP_ORIGIN}`);
});
