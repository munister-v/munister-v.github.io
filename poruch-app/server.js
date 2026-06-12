import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import nodemailer from "nodemailer";
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
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "munister@outlook.com";
const SESSION_DAYS = 30;
const COMMISSION_RATE = 0.25;
const uploadDir = path.join(__dirname, "uploads");
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  } : undefined
}) : null;

await fs.mkdir(uploadDir, { recursive: true });
await pool.query(await fs.readFile(path.join(__dirname, "schema.sql"), "utf8"));
await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");

app.set("trust proxy", 1);
app.disable("x-powered-by");
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
app.use((req, res, next) => {
  req.requestId = req.get("x-request-id") || crypto.randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  res.setHeader("Cache-Control", req.path.startsWith("/assets/") ? "public, max-age=604800" : "no-store");
  next();
});
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use("/assets", express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : 0
}));

const attempts = new Map();
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, _file, callback) => callback(null, crypto.randomUUID())
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  }
});

async function detectImageMime(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(16);
    await handle.read(buffer, 0, buffer.length, 0);
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
    return null;
  } finally {
    await handle.close();
  }
}

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

function validatePassword(value) {
  const password = String(value);
  return password.length >= 12 && /[a-zA-Zа-яА-ЯіІїЇєЄ]/u.test(password) && /\d/.test(password);
}

function limitAuth(req, res, next) {
  const key = `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`;
  const now = Date.now();
  if (attempts.size > 5_000) {
    for (const [attemptKey, value] of attempts) {
      if (value.reset < now) attempts.delete(attemptKey);
    }
  }
  const current = attempts.get(key) || { count: 0, reset: now + 15 * 60_000 };
  if (current.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
    return next();
  }
  current.count += 1;
  attempts.set(key, current);
  if (current.count > 12) return res.status(429).send("Забагато спроб. Спробуйте через 15 хвилин.");
  next();
}

async function createSession(req, res, userId) {
  const token = randomToken();
  const csrf = randomToken(24);
  await pool.query(
    `INSERT INTO sessions(token_hash, user_id, csrf_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', $4, $5)`,
    [tokenHash(token), userId, csrf, req.ip || "", String(req.get("user-agent") || "").slice(0, 500)]
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

function isAdmin(user) {
  return user?.is_admin === true;
}

async function sendMail({ to, subject, text }) {
  if (!mailer || !to) return false;
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `Poruch <${SUPPORT_EMAIL}>`,
      to,
      subject,
      text
    });
    return true;
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "mail_failed", message: error.message }));
    return false;
  }
}

async function notify(userId, orderId, type, title, body, emailSubject = "") {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO notifications(user_id, order_id, type, title, body)
       VALUES ($1,$2,$3,$4,$5) RETURNING user_id
     )
     SELECT u.email, u.notification_email FROM users u JOIN inserted i ON i.user_id = u.id`,
    [userId, orderId || null, type, title, body]
  );
  if (rows[0]?.notification_email) {
    await sendMail({
      to: rows[0].email,
      subject: emailSubject || `${title} — Poruch`,
      text: `${body}\n\nВідкрити кабінет: ${APP_ORIGIN}${orderId ? `/orders/${orderId}` : "/dashboard"}`
    });
  }
}

app.use(async (req, _res, next) => {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    req.user = null;
    req.session = null;
    if (token) {
      const { rows } = await pool.query(
        `SELECT s.token_hash, s.csrf_token, s.expires_at,
                u.id, u.name, u.email, u.role, u.phone, u.city, u.account_type,
                u.organization_name, u.bio, u.service_radius, u.notification_email,
                u.verified_at, u.status, u.is_admin
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.status = 'active'`,
        [tokenHash(token)]
      );
      if (rows[0]) {
        req.session = {
          tokenHash: rows[0].token_hash,
          csrf: rows[0].csrf_token
        };
        req.user = rows[0];
        pool.query("UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1", [rows[0].token_hash]).catch(() => {});
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
  const canonical = new URL(APP_ORIGIN).origin;
  // Some desktop browsers send the literal "null" origin after a meta refresh.
  // Authenticated mutations still require the per-session CSRF token below.
  if (origin && origin !== "null" && origin !== expected && origin !== canonical) {
    console.warn(JSON.stringify({ level: "warn", event: "origin_rejected", origin, expected, canonical, requestId: req.requestId }));
    return res.status(403).send("Запит із цього джерела заборонено.");
  }
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

function requireAdmin(req, res, next) {
  if (!req.user) return res.redirect("/login?next=/admin");
  if (!isAdmin(req.user)) return res.status(403).send("Адміністративний доступ заборонено.");
  next();
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

function firstName(name = "") {
  return String(name).trim().split(/\s+/)[0] || "Вітаємо";
}

function icon(name) {
  const paths = {
    home: `<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    orders: `<path d="M7 4h10l2 3v13H5V7l2-3Z"/><path d="M5 8h14M9 12h6M9 16h4"/>`,
    bell: `<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>`,
    user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6"/>`,
    arrow: `<path d="M5 12h14M14 7l5 5-5 5"/>`,
    shield: `<path d="M12 3 5 6v5c0 4.6 2.6 8 7 10 4.4-2 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/>`,
    camera: `<path d="M4 8h4l1.5-2h5L16 8h4v11H4V8Z"/><circle cx="12" cy="13" r="3"/>`,
    message: `<path d="M4 5h16v12H8l-4 4V5Z"/><path d="M8 9h8M8 13h5"/>`,
    check: `<path d="m5 12 4 4L19 6"/>`,
    search: `<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>`,
    wallet: `<path d="M4 6h15v13H4V6Z"/><path d="M4 9h16M15 13h5v3h-5z"/>`
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.arrow}</svg>`;
}

function navLink(href, label, iconName, active = false) {
  return `<a href="${href}" ${active ? `aria-current="page"` : ""}>${icon(iconName)}<span>${label}</span></a>`;
}

function layout({ title, user, body, description = "", current = "" }) {
  const navigation = user ? `
    <nav class="nav" aria-label="Основна навігація">
      <a href="/dashboard" ${current === "dashboard" ? `aria-current="page"` : ""}>Кабінет</a>
      ${user.role === "customer" ? `<a href="/orders/new" ${current === "orders" ? `aria-current="page"` : ""}>Нове замовлення</a>` : `<a href="/orders/available" ${current === "orders" ? `aria-current="page"` : ""}>Доступні замовлення</a>`}
      <a href="/notifications" ${current === "notifications" ? `aria-current="page"` : ""}>Сповіщення</a>
      <a href="/profile" ${current === "profile" ? `aria-current="page"` : ""}>Профіль</a>
      ${isAdmin(user) ? `<a href="/admin">Операції</a>` : ""}
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
  <link rel="stylesheet" href="/assets/app.css?v=20260612-4">
</head>
<body>
  <a class="skip-link" href="#main-content">До основного вмісту</a>
  <div class="shell">
    ${user ? `<header class="topbar">
      <a class="brand" href="/dashboard"><span class="brand-mark">P</span><span class="brand-copy"><small>MUNISTER / SERVICE 01</small><strong>Поруч</strong></span></a>
      ${navigation}
    </header>` : ""}
    <div id="main-content">${body}</div>
    ${user ? `<nav class="mobile-nav" aria-label="Мобільна навігація">
      ${navLink("/dashboard", "Головна", "home", current === "dashboard")}
      ${navLink(user.role === "customer" ? "/orders/new" : "/orders/available", user.role === "customer" ? "Створити" : "Знайти", user.role === "customer" ? "plus" : "search", current === "orders")}
      ${navLink("/notifications", "Події", "bell", current === "notifications")}
      ${navLink("/profile", "Профіль", "user", current === "profile")}
    </nav>` : ""}
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
          ${req.query.reset ? `<div class="notice">Пароль оновлено. Увійдіть із новими даними.</div>` : ""}
          ${error ? `<div class="error">${esc(error)}</div>` : ""}
          ${register ? `
            <div class="role-picker" role="radiogroup" aria-label="Роль у сервісі">
              <label><input type="radio" name="role" value="customer" ${values.role !== "executor" ? "checked" : ""}><span>Я замовник</span></label>
              <label><input type="radio" name="role" value="executor" ${values.role === "executor" ? "checked" : ""}><span>Я виконавець</span></label>
            </div>
            <div class="field-grid">
              <label>Тип кабінету<select name="accountType">
                <option value="person" ${values.accountType !== "organization" ? "selected" : ""}>Приватна особа</option>
                <option value="organization" ${values.accountType === "organization" ? "selected" : ""}>Організація / агентство</option>
              </select></label>
              <label>Назва організації<input name="organizationName" maxlength="160" value="${esc(values.organizationName)}" placeholder="Якщо застосовно"></label>
            </div>
            <label>Ім'я та прізвище<input name="name" autocomplete="name" required minlength="2" maxlength="100" value="${esc(values.name)}"></label>
            <div class="field-grid">
              <label>Місто<input name="city" autocomplete="address-level2" required maxlength="100" value="${esc(values.city)}"></label>
              <label>Телефон<input name="phone" type="tel" autocomplete="tel" required maxlength="30" placeholder="+380" value="${esc(values.phone)}"></label>
            </div>` : ""}
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="200" value="${esc(values.email)}"></label>
          <label>Пароль<input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" required minlength="12" maxlength="200"></label>
          ${register ? `<p class="helper">Щонайменше 12 символів, літера і цифра. Не використовуйте пароль від пошти чи банку.</p>` : ""}
          ${register ? `<label class="consent-line"><input type="checkbox" name="consent" required><span>Погоджуюся з <a href="https://munister.com.ua/poruch/executor-terms.html" target="_blank" rel="noopener">умовами сервісу</a> та <a href="https://munister.com.ua/poruch/privacy.html" target="_blank" rel="noopener">обробкою персональних даних</a>.</span></label>` : ""}
          <button class="button button-wine" type="submit">${register ? "Створити кабінет" : "Увійти"}</button>
          ${register ? "" : `<p class="auth-switch"><a href="/forgot-password">Не пам'ятаю пароль</a></p>`}
          <p class="auth-switch">${register ? `Вже маєте кабінет? <a href="/login">Увійти</a>` : `Ще не зареєстровані? <a href="/register">Створити кабінет</a>`}</p>
        </form>
      </section>
    </main>`
  });
}

function statusTag(status) {
  return `<span class="status status-${esc(status)}">${esc(statusLabels[status] || status)}</span>`;
}

function emptyState({ iconName = "orders", title, text, href = "", label = "" }) {
  return `<div class="empty-state">
    <span class="empty-icon">${icon(iconName)}</span>
    <div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>
    ${href ? `<a class="button button-secondary" href="${href}">${esc(label)}</a>` : ""}
  </div>`;
}

function orderRows(orders, userRole, emptyOptions) {
  if (!orders.length) return emptyState(emptyOptions || {
    title: "Замовлень поки немає",
    text: "Коли з'явиться перша справа, її статус і наступний крок будуть тут."
  });
  return `<div class="order-list">${orders.map(order => `
    <a class="order-row" href="/orders/${order.id}">
      <span class="order-id">№ ${String(order.id).padStart(4, "0")}</span>
      <div><h3>${esc(order.title)}</h3><p>${esc(order.city)} · ${esc(order.care_type)}${userRole === "customer" && Number(order.proposal_count || 0) ? ` · ${Number(order.proposal_count)} пропоз.` : ""}</p></div>
      <div class="order-meta">${statusTag(order.status)}<span>${order.deadline ? `до ${date(order.deadline)}` : "без жорсткої дати"}</span></div>
      <div class="order-money"><span>${userRole === "executor" ? "Ваша виплата" : "Бюджет роботи"}</span><strong>${money(userRole === "executor" ? payout(order.work_budget) : order.work_budget)}</strong></div>
      <span class="chevron">${icon("arrow")}</span>
    </a>`).join("")}</div>`;
}

function processSteps(role) {
  const steps = role === "customer"
    ? [
        ["01", "Створіть бриф", "Опишіть місце, потрібний догляд, строк і бюджет."],
        ["02", "Оберіть людину", "Порівняйте пропозиції, профіль, рейтинг і повідомлення."],
        ["03", "Слідкуйте за роботою", "Домовленості й уточнення залишаються в картці замовлення."],
        ["04", "Прийміть звіт", "Перевірте фотографії, результат і лише тоді завершіть справу."]
      ]
    : [
        ["01", "Оберіть справу", "Перевірте місто, обсяг, строк і суму виплати."],
        ["02", "Надішліть пропозицію", "Коротко опишіть підхід, доступну дату й свою ціну."],
        ["03", "Зафіксуйте роботу", "Усі зміни погоджуйте в чаті до додаткових витрат."],
        ["04", "Здайте результат", "Додайте змістовний коментар і фотографії до та після."]
      ];
  return `<div class="process-steps">${steps.map(([number, title, text]) => `<article><span>${number}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join("")}</div>`;
}

function dashboardUpdates(items) {
  if (!items.length) return `<p class="quiet-copy">Нових подій немає. Важливі зміни замовлень з'являться тут і в центрі сповіщень.</p>`;
  return `<div class="dashboard-updates">${items.map(item => `<a href="${item.order_id ? `/orders/${item.order_id}` : "/profile"}"><span class="${item.read_at ? "" : "update-dot"}"></span><div><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></div><time>${date(item.created_at, true)}</time></a>`).join("")}</div>`;
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
  if (isAdmin(user)) return order;
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

app.get("/livez", (_req, res) => res.json({ ok: true, service: "poruch-app" }));

app.get(["/healthz", "/readyz"], async (_req, res) => {
  const started = Date.now();
  await pool.query("SELECT 1");
  res.json({
    ok: true,
    service: "poruch-app",
    database: "ready",
    latencyMs: Date.now() - started,
    version: process.env.APP_VERSION || "development"
  });
});

app.get("/register", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(authView(req, "register", "", {
    role: req.query.role === "executor" ? "executor" : "customer"
  }));
});

app.post("/register", limitAuth, async (req, res, next) => {
  try {
    const values = {
      role: req.body.role,
      accountType: req.body.accountType === "organization" ? "organization" : "person",
      organizationName: String(req.body.organizationName || "").trim(),
      name: String(req.body.name || "").trim(),
      city: String(req.body.city || "").trim(),
      phone: String(req.body.phone || "").trim(),
      email: String(req.body.email || "").trim().toLowerCase()
    };
    const password = String(req.body.password || "");
    const consent = req.body.consent === "on";
    if (!["customer", "executor"].includes(values.role)) return res.status(400).send(authView(req, "register", "Оберіть роль.", values));
    if (values.accountType === "organization" && values.organizationName.length < 2) return res.status(400).send(authView(req, "register", "Вкажіть назву організації.", values));
    if (values.name.length < 2 || values.city.length < 2 || values.phone.length < 7) return res.status(400).send(authView(req, "register", "Перевірте ім'я, місто й телефон.", values));
    if (!validateEmail(values.email)) return res.status(400).send(authView(req, "register", "Вкажіть коректний email.", values));
    if (!validatePassword(password)) return res.status(400).send(authView(req, "register", "Пароль має містити щонайменше 12 символів, літеру й цифру.", values));
    if (!consent) return res.status(400).send(authView(req, "register", "Потрібно прийняти умови сервісу та повідомлення про приватність.", values));
    const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [values.email]);
    if (exists.rowCount) return res.status(409).send(authView(req, "register", "Кабінет із таким email вже існує.", values));
    const result = await pool.query(
      `INSERT INTO users(name, email, password_hash, role, phone, city, account_type, organization_name, terms_accepted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING id`,
      [values.name, values.email, await hashPassword(password), values.role, values.phone, values.city, values.accountType, values.organizationName]
    );
    await createSession(req, res, result.rows[0].id);
    await notify(result.rows[0].id, null, "welcome", "Кабінет створено", "Ласкаво просимо до Poruch. Заповніть профіль і почніть роботу.");
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
    const { rows } = await pool.query("SELECT id, password_hash, failed_login_count, locked_until, status FROM users WHERE email = $1", [email]);
    if (rows[0]?.status !== "active") {
      return res.status(403).send(authView(req, "login", "Доступ до кабінету призупинено. Зверніться до підтримки.", { email }));
    }
    if (rows[0]?.locked_until && new Date(rows[0].locked_until) > new Date()) {
      return res.status(429).send(authView(req, "login", "Кабінет тимчасово заблоковано після невдалих спроб. Спробуйте пізніше.", { email }));
    }
    if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
      if (rows[0]) {
        await pool.query(
          `UPDATE users SET failed_login_count = failed_login_count + 1,
           locked_until = CASE WHEN failed_login_count + 1 >= 8 THEN NOW() + INTERVAL '30 minutes' ELSE locked_until END
           WHERE id = $1`,
          [rows[0].id]
        );
      }
      return res.status(401).send(authView(req, "login", "Email або пароль не збігаються.", { email }));
    }
    await pool.query("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1", [rows[0].id]);
    await createSession(req, res, rows[0].id);
    const requested = String(req.query.next || "");
    res.redirect(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard");
  } catch (error) {
    next(error);
  }
});

app.get("/forgot-password", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(layout({
    title: "Відновлення доступу",
    body: `<main class="simple-page"><section class="form-card"><p class="eyebrow">Безпека</p><h1>Відновити доступ.</h1>
      <p>Вкажіть email кабінету. Якщо він зареєстрований, ми надішлемо одноразове посилання на 30 хвилин.</p>
      <form method="post" action="/forgot-password"><label>Email<input type="email" name="email" required autocomplete="email"></label>
      <button class="button button-wine" type="submit">Надіслати посилання</button></form>
      <p class="auth-switch"><a href="/login">Повернутися до входу</a></p></section></main>`
  }));
});

app.post("/forgot-password", limitAuth, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { rows } = await pool.query("SELECT id, email FROM users WHERE email = $1 AND status = 'active'", [email]);
    if (rows[0]) {
      await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()", [rows[0].id]);
      const token = randomToken();
      await pool.query(
        "INSERT INTO password_reset_tokens(token_hash, user_id, expires_at) VALUES ($1,$2,NOW() + INTERVAL '30 minutes')",
        [tokenHash(token), rows[0].id]
      );
      await sendMail({
        to: rows[0].email,
        subject: "Відновлення доступу до Poruch",
        text: `Відкрийте одноразове посилання протягом 30 хвилин:\n${APP_ORIGIN}/reset-password?token=${token}\n\nЯкщо ви не надсилали запит, нічого не робіть.`
      });
    }
    res.send(layout({
      title: "Перевірте пошту",
      body: `<main class="simple-page"><section class="form-card"><p class="eyebrow">Запит прийнято</p><h1>Перевірте пошту.</h1>
        <p>Якщо кабінет із таким email існує і поштовий шлюз налаштований, посилання вже надіслано. Інакше напишіть на <a class="text-link" href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.</p>
        <a class="button" href="/login">До входу</a></section></main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.get("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.query.token || "");
    const valid = token && (await pool.query(
      "SELECT 1 FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()",
      [tokenHash(token)]
    )).rowCount;
    if (!valid) return res.status(400).send(layout({
      title: "Посилання недійсне",
      body: `<main class="simple-page"><section class="form-card"><h1>Посилання завершилося.</h1><a class="button" href="/forgot-password">Створити нове</a></section></main>`
    }));
    res.send(layout({
      title: "Новий пароль",
      body: `<main class="simple-page"><section class="form-card"><p class="eyebrow">Безпека</p><h1>Новий пароль.</h1>
        <form method="post" action="/reset-password"><input type="hidden" name="token" value="${esc(token)}">
        <label>Новий пароль<input type="password" name="password" minlength="12" maxlength="200" required autocomplete="new-password"></label>
        <p class="helper">Щонайменше 12 символів, літера і цифра.</p>
        <button class="button button-wine" type="submit">Зберегти пароль</button></form></section></main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/reset-password", limitAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (!validatePassword(password)) return res.status(400).send("Пароль має містити щонайменше 12 символів, літеру й цифру.");
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE",
      [tokenHash(token)]
    );
    if (!rows[0]) throw new Error("RESET_INVALID");
    await client.query("UPDATE users SET password_hash = $1, password_changed_at = NOW(), failed_login_count = 0, locked_until = NULL WHERE id = $2", [await hashPassword(password), rows[0].user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1", [tokenHash(token)]);
    await client.query("DELETE FROM sessions WHERE user_id = $1", [rows[0].user_id]);
    await client.query("COMMIT");
    res.redirect("/login?reset=1");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.message === "RESET_INVALID") return res.status(400).send("Посилання недійсне або завершилося.");
    next(error);
  } finally {
    client.release();
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

app.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const sessions = (await pool.query(
      "SELECT token_hash, ip_address, user_agent, last_seen_at, created_at FROM sessions WHERE user_id = $1 ORDER BY last_seen_at DESC",
      [req.user.id]
    )).rows;
    const verification = req.user.role === "executor" ? (await pool.query(
      "SELECT * FROM verification_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    )).rows[0] : null;
    const rating = req.user.role === "executor" ? (await pool.query(
      "SELECT ROUND(AVG(rating)::numeric, 1) average, COUNT(*) count FROM reviews WHERE executor_id = $1",
      [req.user.id]
    )).rows[0] : null;
    const user = withSessionUser(req);
    res.send(layout({
      title: "Профіль і безпека",
      user,
      current: "profile",
      body: `<main class="page">
        <header class="page-head"><div><p class="eyebrow">Профіль / безпека</p><h1>Дані, довіра і доступ.</h1><p>Підтримуйте контакти актуальними, керуйте активними входами та налаштовуйте робочий профіль.</p></div></header>
        ${req.query.saved ? `<div class="notice">Зміни збережено.</div>` : ""}
        <div class="settings-grid">
          <form class="form-card" method="post" action="/profile">${csrfField(req)}
            <h2>Основні дані</h2>
            <div class="field-grid"><label>Ім'я та прізвище<input name="name" required minlength="2" maxlength="100" value="${esc(req.user.name)}"></label>
            <label>Телефон<input name="phone" type="tel" required maxlength="30" value="${esc(req.user.phone)}"></label></div>
            <div class="field-grid"><label>Місто<input name="city" required maxlength="100" value="${esc(req.user.city)}"></label>
            <label>Тип кабінету<select name="accountType"><option value="person" ${req.user.account_type !== "organization" ? "selected" : ""}>Приватна особа</option><option value="organization" ${req.user.account_type === "organization" ? "selected" : ""}>Організація / агентство</option></select></label></div>
            <label>Назва організації<input name="organizationName" maxlength="160" value="${esc(req.user.organization_name)}"></label>
            ${req.user.role === "executor" ? `<label>Про досвід і підхід<textarea name="bio" rows="6" maxlength="2000">${esc(req.user.bio)}</textarea></label>
            <label>Робочий радіус, км<input name="serviceRadius" type="number" min="1" max="500" value="${Number(req.user.service_radius || 30)}"></label>` : ""}
            <label class="consent-line"><input type="checkbox" name="notificationEmail" ${req.user.notification_email ? "checked" : ""}><span>Надсилати важливі зміни замовлень на email.</span></label>
            <button class="button button-wine" type="submit">Зберегти профіль</button>
          </form>
          <div>
            ${req.user.role === "executor" ? `<section class="side-card trust-card"><p class="eyebrow">Довіра виконавця</p><h3>${req.user.verified_at ? "Профіль перевірено" : verification?.status === "pending" ? "Заявка на перевірці" : "Потрібна перевірка"}</h3>
              <p>${req.user.verified_at ? `Рейтинг: ${esc(rating?.average || "ще немає")} · відгуків: ${Number(rating?.count || 0)}.` : "Перевірений профіль допомагає замовнику прийняти рішення і знижує ризик спорів."}</p>
              ${!req.user.verified_at && verification?.status !== "pending" ? `<a class="button" href="/verification">Подати заявку</a>` : ""}</section>` : ""}
            <section class="side-card"><p class="eyebrow">Змінити пароль</p><form method="post" action="/profile/password">${csrfField(req)}
              <label>Поточний пароль<input type="password" name="currentPassword" required autocomplete="current-password"></label>
              <label>Новий пароль<input type="password" name="newPassword" minlength="12" maxlength="200" required autocomplete="new-password"></label>
              <button class="button" type="submit">Оновити пароль</button></form></section>
            <section class="side-card"><p class="eyebrow">Активні входи</p><h3>${sessions.length}</h3>
              <div class="session-list">${sessions.map(session => `<div><strong>${session.token_hash === req.session.tokenHash ? "Цей пристрій" : esc(session.user_agent || "Невідомий пристрій")}</strong><span>${esc(session.ip_address || "IP не збережено")} · ${date(session.last_seen_at, true)}</span></div>`).join("")}</div>
              ${sessions.length > 1 ? `<form method="post" action="/sessions/revoke-others">${csrfField(req)}<button class="link-button" type="submit">Завершити інші сеанси</button></form>` : ""}</section>
          </div>
        </div>
      </main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/profile", requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const city = String(req.body.city || "").trim();
    const accountType = req.body.accountType === "organization" ? "organization" : "person";
    const organizationName = String(req.body.organizationName || "").trim();
    const bio = req.user.role === "executor" ? String(req.body.bio || "").trim() : "";
    const serviceRadius = req.user.role === "executor" ? Math.round(Number(req.body.serviceRadius || 30)) : 30;
    if (name.length < 2 || phone.length < 7 || city.length < 2 || bio.length > 2000 || serviceRadius < 1 || serviceRadius > 500) {
      return res.status(400).send("Перевірте дані профілю.");
    }
    if (accountType === "organization" && organizationName.length < 2) return res.status(400).send("Вкажіть назву організації.");
    await pool.query(
      `UPDATE users SET name=$1, phone=$2, city=$3, account_type=$4, organization_name=$5,
       bio=$6, service_radius=$7, notification_email=$8 WHERE id=$9`,
      [name, phone, city, accountType, organizationName, bio, serviceRadius, req.body.notificationEmail === "on", req.user.id]
    );
    res.redirect("/profile?saved=1");
  } catch (error) {
    next(error);
  }
});

app.post("/profile/password", requireAuth, verifyCsrf, limitAuth, async (req, res, next) => {
  try {
    const current = String(req.body.currentPassword || "");
    const nextPassword = String(req.body.newPassword || "");
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!(await verifyPassword(current, rows[0].password_hash))) return res.status(401).send("Поточний пароль невірний.");
    if (!validatePassword(nextPassword)) return res.status(400).send("Новий пароль має містити щонайменше 12 символів, літеру й цифру.");
    await pool.query("UPDATE users SET password_hash=$1, password_changed_at=NOW() WHERE id=$2", [await hashPassword(nextPassword), req.user.id]);
    await pool.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [req.user.id, req.session.tokenHash]);
    await notify(req.user.id, null, "security", "Пароль змінено", "Пароль кабінету оновлено, інші активні сеанси завершено.");
    res.redirect("/profile?saved=1");
  } catch (error) {
    next(error);
  }
});

app.post("/sessions/revoke-others", requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [req.user.id, req.session.tokenHash]);
    res.redirect("/profile?saved=1");
  } catch (error) {
    next(error);
  }
});

app.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const notifications = (await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
      [req.user.id]
    )).rows;
    res.send(layout({
      title: "Сповіщення",
      user: withSessionUser(req),
      current: "notifications",
      body: `<main class="page"><header class="page-head"><div><p class="eyebrow">Центр подій</p><h1>Нічого важливого не загубиться.</h1><p>Пропозиції, призначення, звіти, рішення і безпекові події зібрані в одному журналі.</p></div>
        ${notifications.some(item => !item.read_at) ? `<form method="post" action="/notifications/read-all">${csrfField(req)}<button class="button button-secondary" type="submit">Позначити прочитаними</button></form>` : ""}</header>
        <div class="notification-list">${notifications.length ? notifications.map(item => `<a class="notification ${item.read_at ? "" : "notification-unread"}" href="${item.order_id ? `/orders/${item.order_id}` : "/profile"}"><span>${esc(item.type)}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></div><time>${date(item.created_at, true)}</time></a>`).join("") : `<div class="empty">Сповіщень поки немає.</div>`}</div>
      </main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/notifications/read-all", requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL", [req.user.id]);
    res.redirect("/notifications");
  } catch (error) {
    next(error);
  }
});

app.get("/verification", requireRole("executor"), async (req, res, next) => {
  try {
    const current = (await pool.query("SELECT * FROM verification_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1", [req.user.id])).rows[0];
    res.send(layout({
      title: "Перевірка виконавця",
      user: withSessionUser(req),
      current: "profile",
      body: `<main class="page"><header class="page-head"><div><p class="eyebrow">Стандарт довіри</p><h1>Підтвердьте готовність працювати.</h1><p>Команда Poruch перевіряє досвід, зону виїзду та здатність формувати доказовий фото-звіт.</p></div></header>
        ${current?.status === "pending" ? `<div class="notice">Заявку вже отримано ${date(current.created_at)}. Рішення з'явиться в кабінеті.</div>` : ""}
        <form class="form-card" method="post" action="/verification">${csrfField(req)}
          <label>Досвід догляду за похованнями<textarea name="experience" rows="7" required minlength="50" maxlength="3000" placeholder="Скільки років, які типи робіт, приклади складних випадків"></textarea></label>
          <label>Зона роботи<textarea name="serviceArea" rows="4" required minlength="20" maxlength="1500" placeholder="Міста, райони, кладовища, максимальна відстань виїзду"></textarea></label>
          <label>Інструменти і транспорт<textarea name="equipment" rows="4" maxlength="1500"></textarea></label>
          <label class="consent-line"><input type="checkbox" name="accuracy" required><span>Підтверджую достовірність інформації та готовність пройти додаткову перевірку.</span></label>
          <button class="button button-wine" type="submit">Надіслати на перевірку</button>
        </form></main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/verification", requireRole("executor"), verifyCsrf, async (req, res, next) => {
  try {
    const experience = String(req.body.experience || "").trim();
    const serviceArea = String(req.body.serviceArea || "").trim();
    const equipment = String(req.body.equipment || "").trim();
    if (experience.length < 50 || serviceArea.length < 20 || req.body.accuracy !== "on") return res.status(400).send("Заповніть заявку детальніше і підтвердьте достовірність.");
    const pending = await pool.query("SELECT 1 FROM verification_requests WHERE user_id=$1 AND status='pending'", [req.user.id]);
    if (pending.rowCount) return res.status(409).send("Заявка вже перебуває на перевірці.");
    await pool.query(
      "INSERT INTO verification_requests(user_id, experience, service_area, equipment) VALUES ($1,$2,$3,$4)",
      [req.user.id, experience, serviceArea, equipment]
    );
    await sendMail({ to: SUPPORT_EMAIL, subject: "Нова заявка виконавця Poruch", text: `${req.user.name} (${req.user.email}) подав заявку на перевірку.\n${APP_ORIGIN}/admin` });
    res.redirect("/profile?saved=1");
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const user = withSessionUser(req);
    if (req.user.role === "customer") {
      const [ordersResult, notificationsResult] = await Promise.all([
        pool.query(
          `SELECT o.*, (SELECT COUNT(*)::int FROM proposals p WHERE p.order_id = o.id) proposal_count
           FROM orders o WHERE o.customer_id = $1 ORDER BY o.updated_at DESC`,
          [req.user.id]
        ),
        pool.query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 4", [req.user.id])
      ]);
      const orders = ordersResult.rows;
      const counts = {
        new: orders.filter(order => order.status === "new").length,
        in_progress: orders.filter(order => ["assigned", "in_progress", "changes_requested"].includes(order.status)).length,
        awaiting_review: orders.filter(order => order.status === "awaiting_review").length,
        completed: orders.filter(order => order.status === "completed").length
      };
      const priority = orders.find(order => order.status === "awaiting_review")
        || orders.find(order => order.status === "changes_requested")
        || orders.find(order => order.status === "new" && Number(order.proposal_count) > 0)
        || orders.find(order => ["assigned", "in_progress"].includes(order.status));
      const priorityCopy = !priority
        ? {
            eyebrow: "Перший крок",
            title: "Створіть перше доручення",
            text: "Опишіть потрібний догляд за похованням. Точні персональні дані можна передати вже обраному виконавцю.",
            href: "/orders/new",
            label: "Створити замовлення",
            iconName: "plus"
          }
        : priority.status === "awaiting_review"
          ? {
              eyebrow: "Потрібне ваше рішення",
              title: "Перевірте фото-звіт",
              text: `Виконавець завершив «${priority.title}». Перегляньте матеріали, прийміть роботу або опишіть потрібні зміни.`,
              href: `/orders/${priority.id}`,
              label: "Перевірити результат",
              iconName: "camera"
            }
          : priority.status === "changes_requested"
            ? {
                eyebrow: "Уточнення в роботі",
                title: "Слідкуйте за виправленнями",
                text: `За замовленням «${priority.title}» зафіксовано уточнення. Вся домовленість зберігається в картці.`,
                href: `/orders/${priority.id}`,
                label: "Відкрити замовлення",
                iconName: "message"
              }
            : priority.status === "new"
              ? {
                  eyebrow: "Є нові кандидати",
                  title: `Отримано пропозицій: ${Number(priority.proposal_count)}`,
                  text: `Порівняйте виконавців для «${priority.title}» і зафіксуйте вибір у кабінеті до початку робіт.`,
                  href: `/orders/${priority.id}`,
                  label: "Обрати виконавця",
                  iconName: "user"
                }
              : {
                  eyebrow: "Зараз у роботі",
                  title: priority.title,
                  text: "Перевіряйте повідомлення, погоджуйте зміни та витрати лише в картці замовлення.",
                  href: `/orders/${priority.id}`,
                  label: "Перейти до справи",
                  iconName: "orders"
                };
      return res.send(layout({
        title: "Кабінет замовника",
        user,
        current: "dashboard",
        body: `<main class="page dashboard-page">
          <header class="dashboard-hero">
            <div class="dashboard-intro">
              <p class="eyebrow">Кабінет замовника / ${esc(req.user.city)}</p>
              <h1>Добрий день, ${esc(firstName(req.user.name))}.</h1>
              <p>Тут видно стан кожної справи, наступне рішення і повну історію догляду за похованням.</p>
              <div class="hero-actions"><a class="button button-wine" href="/orders/new">${icon("plus")}Створити замовлення</a><a class="text-action" href="mailto:${esc(SUPPORT_EMAIL)}">Поставити питання команді ${icon("arrow")}</a></div>
            </div>
            <aside class="priority-card">
              <span class="priority-icon">${icon(priorityCopy.iconName)}</span>
              <p class="eyebrow">${priorityCopy.eyebrow}</p>
              <h2>${esc(priorityCopy.title)}</h2>
              <p>${esc(priorityCopy.text)}</p>
              <a href="${priorityCopy.href}">${esc(priorityCopy.label)} ${icon("arrow")}</a>
            </aside>
          </header>
          ${req.query.welcome ? `<div class="notice" role="status">Кабінет створено. Почніть із першого замовлення або перегляньте, як працює захищений процес.</div>` : ""}
          <section class="dashboard-stats" aria-label="Стан замовлень">
            <div><span>Відкриті</span><strong>${counts.new}</strong><small>очікують вибору</small></div>
            <div><span>У роботі</span><strong>${counts.in_progress}</strong><small>виконуються зараз</small></div>
            <div><span>На прийманні</span><strong>${counts.awaiting_review}</strong><small>потрібна перевірка</small></div>
            <div><span>Завершені</span><strong>${counts.completed}</strong><small>зі звітом в архіві</small></div>
          </section>
          <div class="dashboard-grid">
            <section class="dashboard-main">
              <div class="section-title"><div><p class="eyebrow">Ваші справи</p><h2>Останні замовлення</h2></div><a class="text-action" href="/orders/new">Нове замовлення ${icon("arrow")}</a></div>
              ${orderRows(orders.slice(0, 6), "customer", {
                iconName: "plus",
                title: "Почніть із короткого брифу",
                text: "Вкажіть місто, кладовище, бажаний результат і бюджет. Публікація займає кілька хвилин.",
                href: "/orders/new",
                label: "Створити замовлення"
              })}
            </section>
            <aside class="dashboard-side">
              <section class="side-panel">
                <div class="panel-heading"><div><p class="eyebrow">Останні події</p><h2>Не пропустіть важливе</h2></div><a href="/notifications" aria-label="Усі сповіщення">${icon("arrow")}</a></div>
                ${dashboardUpdates(notificationsResult.rows)}
              </section>
              <section class="protection-panel">
                ${icon("shield")}
                <div><p class="eyebrow">Захищений процес</p><h2>Домовленості залишаються з вами</h2><p>Бриф, повідомлення, зміни, фото й рішення зберігаються в одному замовленні. У спірній ситуації команда бачить повну хронологію.</p></div>
              </section>
            </aside>
          </div>
          <section class="process-section">
            <div class="section-title"><div><p class="eyebrow">Як це працює</p><h2>Від потреби до підтвердженого результату</h2></div><p>Чотири зрозумілі етапи без домовленостей, що губляться в різних месенджерах.</p></div>
            ${processSteps("customer")}
          </section>
        </main>`
      }));
    }

    const [activeResult, availableResult, completedResult, proposalsResult, notificationsResult, verificationResult] = await Promise.all([
      pool.query(
        "SELECT * FROM orders WHERE executor_id = $1 AND status NOT IN ('completed','cancelled') ORDER BY updated_at DESC",
        [req.user.id]
      ),
      pool.query(
        `SELECT o.* FROM orders o
         WHERE o.status = 'new' AND NOT EXISTS (
           SELECT 1 FROM proposals p WHERE p.order_id = o.id AND p.executor_id = $1
         ) ORDER BY o.created_at DESC LIMIT 8`,
        [req.user.id]
      ),
      pool.query("SELECT * FROM orders WHERE executor_id = $1 AND status = 'completed'", [req.user.id]),
      pool.query(
        `SELECT COUNT(*)::int count FROM proposals p JOIN orders o ON o.id=p.order_id
         WHERE p.executor_id=$1 AND o.status='new'`,
        [req.user.id]
      ),
      pool.query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 4", [req.user.id]),
      pool.query("SELECT * FROM verification_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1", [req.user.id])
    ]);
    const active = activeResult.rows;
    const available = availableResult.rows;
    const completed = completedResult.rows;
    const pendingPayout = active.reduce((sum, order) => sum + payout(order.work_budget), 0);
    const earned = completed.reduce((sum, order) => sum + payout(order.work_budget), 0);
    const pendingProposals = Number(proposalsResult.rows[0]?.count || 0);
    const verification = verificationResult.rows[0];
    const profileChecks = [req.user.name, req.user.phone, req.user.city, req.user.bio, Number(req.user.service_radius) > 0];
    const profileComplete = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
    const priority = active.find(order => ["changes_requested", "awaiting_review"].includes(order.status)) || active[0];
    const priorityCopy = priority
      ? priority.status === "changes_requested"
        ? {
            eyebrow: "Потрібне уточнення",
            title: priority.title,
            text: "Замовник залишив коментар до результату. Перегляньте його до повторного виїзду або нових витрат.",
            href: `/orders/${priority.id}`,
            label: "Переглянути зміни",
            iconName: "message"
          }
        : priority.status === "awaiting_review"
          ? {
              eyebrow: "Результат передано",
              title: priority.title,
              text: "Фото-звіт очікує рішення замовника. Слідкуйте за повідомленнями в картці справи.",
              href: `/orders/${priority.id}`,
              label: "Відкрити замовлення",
              iconName: "camera"
            }
          : {
              eyebrow: "Активна робота",
              title: priority.title,
              text: "Усі уточнення, погодження матеріалів і докази виконання фіксуйте в картці замовлення.",
              href: `/orders/${priority.id}`,
              label: "Продовжити роботу",
              iconName: "orders"
            }
      : {
          eyebrow: "Наступний крок",
          title: available.length ? "Оберіть відповідне замовлення" : "Підготуйте профіль до нових справ",
          text: available.length
            ? `Зараз доступно ${available.length} нових замовлень. Відгукуйтеся лише на ті, де впевнені у строках і результаті.`
            : "Заповнений і перевірений профіль підвищує довіру замовника та шанс отримати роботу.",
          href: available.length ? "/orders/available" : "/profile",
          label: available.length ? "Переглянути замовлення" : "Доповнити профіль",
          iconName: available.length ? "search" : "user"
        };
    res.send(layout({
      title: "Кабінет виконавця",
      user,
      current: "dashboard",
      body: `<main class="page dashboard-page">
        <header class="dashboard-hero executor-hero">
          <div class="dashboard-intro">
            <div class="executor-labels"><p class="eyebrow">Кабінет виконавця / ${esc(req.user.city)}</p>${req.user.verified_at ? `<span class="verified">${icon("check")} Перевірено</span>` : ""}</div>
            <h1>Добрий день, ${esc(firstName(req.user.name))}.</h1>
            <p>Плануйте роботу, відповідайте клієнтам і здавайте доказовий результат без холодного пошуку замовлень.</p>
            <div class="hero-actions"><a class="button" href="/orders/available">${icon("search")}Знайти замовлення</a><a class="text-action" href="/profile">Профіль виконавця ${icon("arrow")}</a></div>
          </div>
          <aside class="priority-card priority-dark">
            <span class="priority-icon">${icon(priorityCopy.iconName)}</span>
            <p class="eyebrow">${priorityCopy.eyebrow}</p>
            <h2>${esc(priorityCopy.title)}</h2>
            <p>${esc(priorityCopy.text)}</p>
            <a href="${priorityCopy.href}">${esc(priorityCopy.label)} ${icon("arrow")}</a>
          </aside>
        </header>
        ${req.query.welcome ? `<div class="notice" role="status">Кабінет створено. Доповніть профіль і подайте заявку на перевірку, щоб замовникам було легше обрати вас.</div>` : ""}
        <section class="dashboard-stats" aria-label="Робочі показники">
          <div><span>Активні</span><strong>${active.length}</strong><small>справ у роботі</small></div>
          <div><span>Пропозиції</span><strong>${pendingProposals}</strong><small>очікують рішення</small></div>
          <div><span>До виплати</span><strong>${money(pendingPayout)}</strong><small>після комісії 25%</small></div>
          <div><span>Зароблено</span><strong>${money(earned)}</strong><small>за завершені справи</small></div>
        </section>
        <div class="dashboard-grid">
          <section class="dashboard-main">
            <div class="section-title"><div><p class="eyebrow">Робочий стіл</p><h2>Активні справи</h2></div><a class="text-action" href="/orders/available">Знайти ще ${icon("arrow")}</a></div>
            ${orderRows(active, "executor", {
              iconName: "search",
              title: "Активних справ поки немає",
              text: "Оберіть замовлення за містом, строком і обсягом. До призначення не починайте роботу й не купуйте матеріали.",
              href: "/orders/available",
              label: "Переглянути доступні"
            })}
          </section>
          <aside class="dashboard-side">
            <section class="profile-health">
              <div class="profile-score"><span>${profileComplete}%</span><small>профіль</small></div>
              <div><p class="eyebrow">Готовність профілю</p><h2>${req.user.verified_at ? "Ви пройшли перевірку" : verification?.status === "pending" ? "Перевірка триває" : "Підсиліть довіру"}</h2><p>${req.user.verified_at ? "Замовники бачать позначку перевіреного виконавця." : verification?.status === "pending" ? "Рішення з'явиться у сповіщеннях і профілі." : "Додайте досвід, зону виїзду та подайте заявку на перевірку."}</p><a href="${!req.user.verified_at && verification?.status !== "pending" ? "/verification" : "/profile"}">${!req.user.verified_at && verification?.status !== "pending" ? "Пройти перевірку" : "Відкрити профіль"} ${icon("arrow")}</a></div>
            </section>
            <section class="side-panel">
              <div class="panel-heading"><div><p class="eyebrow">Останні події</p><h2>Робочий журнал</h2></div><a href="/notifications" aria-label="Усі сповіщення">${icon("arrow")}</a></div>
              ${dashboardUpdates(notificationsResult.rows)}
            </section>
          </aside>
        </div>
        <section class="section-block">
          <div class="section-title"><div><p class="eyebrow">Нові можливості</p><h2>Замовлення, на які можна відгукнутися</h2></div><p>До пропозиції видно обсяг, строк, бюджет і вашу виплату після комісії 25%.</p></div>
          ${orderRows(available.slice(0, 4), "executor", {
            iconName: "bell",
            title: "Нових замовлень зараз немає",
            text: "Ми покажемо їх тут, щойно з'являться справи у вашій зоні роботи."
          })}
        </section>
        <section class="process-section">
          <div class="section-title"><div><p class="eyebrow">Стандарт Poruch</p><h2>Як вести замовлення без ризиків</h2></div><p>Клієнта, правила взаємодії та доказову історію надає сервіс. Ваша зона відповідальності — точний результат.</p></div>
          ${processSteps("executor")}
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
      current: "orders",
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
    current: "orders",
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
    await notify(req.user.id, rows[0].id, "order", "Замовлення опубліковано", "Бриф зафіксовано, виконавці вже можуть надсилати пропозиції.");
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
      `SELECT p.*, u.name executor_name, u.city executor_city, u.verified_at,
              ROUND(AVG(rv.rating)::numeric, 1) rating, COUNT(rv.id) review_count
       FROM proposals p JOIN users u ON u.id = p.executor_id
       LEFT JOIN reviews rv ON rv.executor_id = u.id
       WHERE p.order_id = $1
       GROUP BY p.id, u.name, u.city, u.verified_at ORDER BY p.created_at`,
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
    const events = (await pool.query(
      `SELECT e.*, u.name actor_name FROM order_events e
       LEFT JOIN users u ON u.id=e.actor_id WHERE e.order_id=$1 ORDER BY e.created_at DESC`,
      [order.id]
    )).rows;
    const dispute = (await pool.query(
      "SELECT d.*, u.name opened_by_name FROM disputes d JOIN users u ON u.id=d.opened_by WHERE d.order_id=$1 ORDER BY d.created_at DESC LIMIT 1",
      [order.id]
    )).rows[0];
    const review = (await pool.query("SELECT * FROM reviews WHERE order_id=$1", [order.id])).rows[0];
    const myProposal = proposals.find(proposal => proposal.executor_id === req.user.id);
    const directParticipant = order.customer_id === req.user.id || order.executor_id === req.user.id;
    const participant = directParticipant || isAdmin(req.user);
    if (participant) await pool.query("UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND order_id=$2 AND read_at IS NULL", [req.user.id, order.id]);
    const actionCard = isAdmin(req.user) && !directParticipant
      ? `<section class="side-card"><p class="eyebrow">Режим модератора</p><h3>Матеріали лише для перегляду</h3><p>Рішення щодо спору або перевірки фіксується в операційному центрі.</p><a class="button" href="/admin">До операцій</a></section>`
      : req.user.role === "executor"
        ? executorActions(req, order, myProposal)
        : customerActions(req, order, proposals);

    res.send(layout({
      title: order.title,
      user: withSessionUser(req),
      current: "orders",
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

            ${participant ? `<section class="section-block" id="messages">
              <div class="section-title"><h2>Переписка сторін</h2><p>Повідомлення зберігаються разом із замовленням і можуть використовуватися під час розгляду спору.</p></div>
              <div class="messages">
                ${messages.length ? messages.map(message => `<article class="message ${message.sender_id === req.user.id ? "message-own" : ""}"><small>${esc(message.sender_name)} · ${date(message.created_at, true)}</small><p>${esc(message.body)}</p></article>`).join("") : `<div class="empty">Повідомлень ще немає.</div>`}
              </div>
              ${directParticipant ? `<form class="message-form" method="post" action="/orders/${order.id}/messages">
                ${csrfField(req)}
                <textarea name="body" required maxlength="2000" placeholder="Напишіть повідомлення"></textarea>
                <button class="button" type="submit">Надіслати</button>
              </form>` : ""}
            </section>` : ""}

            <section class="section-block">
              <div class="section-title"><h2>Журнал замовлення</h2><p>Незмінна послідовність ключових рішень і переходів статусу.</p></div>
              <div class="timeline">${events.map(item => `<article><span></span><div><strong>${esc(item.details || item.event_type)}</strong><p>${esc(item.actor_name || "Система")} · ${date(item.created_at, true)}</p></div></article>`).join("")}</div>
            </section>

            ${dispute ? `<section class="section-block"><div class="section-title"><h2>Розгляд спору</h2></div>
              <article class="dispute-card"><div>${statusTag(order.status)}<h3>${esc(dispute.opened_by_name)}</h3><p class="description">${esc(dispute.reason)}</p></div>
              ${dispute.resolution ? `<p><strong>Рішення Poruch:</strong> ${esc(dispute.resolution)}</p>` : `<p>Операційна команда вивчає бриф, переписку та звіти обох сторін.</p>`}</article>
            </section>` : ""}

            ${review ? `<section class="section-block"><div class="section-title"><h2>Відгук замовника</h2></div>
              <article class="review-card"><strong>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</strong><p>${esc(review.comment || "Без текстового коментаря.")}</p></article>
            </section>` : ""}
          </div>
          <aside>
            <div class="side-card payout"><span>Виплата виконавцю після комісії 25%</span><strong>${money(payout(order.work_budget))}</strong><span>Матеріали компенсуються окремо.</span></div>
            ${actionCard}
            ${directParticipant && !["new", "completed", "cancelled", "disputed"].includes(order.status) ? `<section class="side-card"><p class="eyebrow">Захист сторін</p><h3>Виникла проблема?</h3><p>Спочатку опишіть ситуацію в переписці. Якщо домовитися не вдається, відкрийте офіційний розгляд.</p><a class="button button-secondary" href="/orders/${order.id}/dispute">Відкрити спір</a></section>` : ""}
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
    ${proposals.length ? proposals.map(proposal => `<article class="proposal"><div class="proposal-head"><strong>${esc(proposal.executor_name)} ${proposal.verified_at ? `<span class="verified">Перевірено</span>` : ""}</strong><strong>${money(proposal.proposed_price)}</strong></div><p>${esc(proposal.executor_city)} · рейтинг ${esc(proposal.rating || "новий профіль")} (${Number(proposal.review_count || 0)})</p><p>${esc(proposal.message)}</p><form method="post" action="/orders/${order.id}/assign">${csrfField(req)}<input type="hidden" name="proposalId" value="${proposal.id}"><button class="button button-wine" type="submit">Обрати виконавця</button></form></article>`).join("") : `<p>Ми покажемо тут кандидатів, їхню ціну й повідомлення.</p>`}
    <form method="post" action="/orders/${order.id}/actions">${csrfField(req)}<input type="hidden" name="action" value="cancel"><button class="link-button" type="submit">Скасувати замовлення</button></form>
  </section>`;
  if (order.status === "awaiting_review") return `<section class="side-card"><p class="eyebrow">Перевірка результату</p><h3>Прийняти чи уточнити?</h3><p>Звірте фото з брифом і погодженими змінами.</p>
    <form method="post" action="/orders/${order.id}/actions">${csrfField(req)}<button class="button" name="action" value="accept" type="submit">Прийняти роботу</button></form>
    <form method="post" action="/orders/${order.id}/actions">${csrfField(req)}<label>Що потрібно виправити<textarea name="reason" minlength="10" maxlength="1200" rows="4" required></textarea></label><button class="button button-secondary" name="action" value="changes" type="submit">Повернути на доопрацювання</button></form>
  </section>`;
  if (order.status === "completed") return `<section class="side-card"><p class="eyebrow">Замовлення завершено</p><h3>Результат прийнято</h3><p>Звіт і переписка залишаються доступними в кабінеті.</p>
    <form method="post" action="/orders/${order.id}/review">${csrfField(req)}<label>Оцінка<select name="rating" required><option value="">Оберіть</option><option value="5">5 — відмінно</option><option value="4">4 — добре</option><option value="3">3 — задовільно</option><option value="2">2 — є проблеми</option><option value="1">1 — незадовільно</option></select></label><label>Коментар<textarea name="comment" maxlength="1200" rows="4"></textarea></label><button class="button" type="submit">Зберегти відгук</button></form>
  </section>`;
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
    await notify(order.customer_id, order.id, "proposal", "Нова пропозиція", `${req.user.name} запропонував виконати замовлення за ${money(price)}.`);
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
    await notify(proposal.executor_id, order.id, "assigned", "Вас обрано виконавцем", `Замовник призначив вас на «${order.title}». Уточніть деталі перед початком.`);
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
    const recipient = order.customer_id === req.user.id ? order.executor_id : order.customer_id;
    await notify(recipient, order.id, "message", "Нове повідомлення", `${req.user.name}: ${body.slice(0, 180)}`);
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
    const reason = String(req.body.reason || "").trim();
    let nextStatus;
    if (req.user.role === "executor" && order.executor_id === req.user.id && action === "start" && order.status === "assigned") nextStatus = "in_progress";
    if (req.user.role === "customer" && order.customer_id === req.user.id && action === "accept" && order.status === "awaiting_review") nextStatus = "completed";
    if (req.user.role === "customer" && order.customer_id === req.user.id && action === "changes" && order.status === "awaiting_review" && reason.length >= 10) nextStatus = "changes_requested";
    if (req.user.role === "customer" && order.customer_id === req.user.id && action === "cancel" && order.status === "new") nextStatus = "cancelled";
    if (!nextStatus) return res.status(409).send("Цей перехід статусу зараз недоступний.");
    await pool.query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [nextStatus, order.id]);
    await event(order.id, req.user.id, nextStatus, reason || `Статус: ${statusLabels[nextStatus]}`);
    const recipient = order.customer_id === req.user.id ? order.executor_id : order.customer_id;
    if (recipient) await notify(recipient, order.id, "status", `Статус: ${statusLabels[nextStatus]}`, reason || `Замовлення «${order.title}» оновлено.`);
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
    const inspectedFiles = await Promise.all(req.files.map(async file => ({ file, mime: await detectImageMime(file.path) })));
    if (inspectedFiles.some(item => !item.mime)) {
      await Promise.all(req.files.map(file => fs.unlink(file.path).catch(() => {})));
      return res.status(400).send("Один із файлів не є справжнім JPEG, PNG або WebP зображенням.");
    }
    await client.query("BEGIN");
    const reportResult = await client.query(
      "INSERT INTO reports(order_id, executor_id, notes) VALUES ($1,$2,$3) RETURNING id",
      [order.id, req.user.id, notes]
    );
    for (const { file, mime } of inspectedFiles) {
      await client.query(
        "INSERT INTO report_files(report_id, original_name, storage_name, mime_type, file_size) VALUES ($1,$2,$3,$4,$5)",
        [reportResult.rows[0].id, file.originalname.slice(0, 240), file.filename, mime, file.size]
      );
    }
    await client.query("UPDATE orders SET status = 'awaiting_review', updated_at = NOW() WHERE id = $1", [order.id]);
    await client.query(
      "INSERT INTO order_events(order_id, actor_id, event_type, details) VALUES ($1,$2,'report','Звіт надіслано замовнику')",
      [order.id, req.user.id]
    );
    await client.query("COMMIT");
    await notify(order.customer_id, order.id, "report", "Фото-звіт готовий", `Виконавець надіслав звіт за замовленням «${order.title}». Перевірте фото і результат.`);
    res.redirect(`/orders/${order.id}?updated=1`);
  } catch (error) {
    await client.query("ROLLBACK");
    await Promise.all((req.files || []).map(file => fs.unlink(file.path).catch(() => {})));
    next(error);
  } finally {
    client.release();
  }
});

app.get("/orders/:id/dispute", requireAuth, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    if (!order || ![order.customer_id, order.executor_id].includes(req.user.id)) return res.status(403).send("Розгляд недоступний.");
    if (["new", "completed", "cancelled", "disputed"].includes(order.status)) return res.status(409).send("Для цього статусу спір відкрити не можна.");
    res.send(layout({
      title: "Відкрити спір",
      user: withSessionUser(req),
      body: `<main class="page"><header class="page-head"><div><p class="eyebrow">Захист сторін / № ${String(order.id).padStart(4, "0")}</p><h1>Зафіксуйте проблему.</h1><p>Після відкриття спору робочий процес призупиняється. Команда Poruch перевірить бриф, переписку, фото та історію статусів.</p></div></header>
        <form class="form-card" method="post" action="/orders/${order.id}/dispute">${csrfField(req)}
          <label>Що сталося<textarea name="reason" rows="9" required minlength="50" maxlength="4000" placeholder="Опишіть факти, попередні домовленості й бажаний результат"></textarea></label>
          <label class="consent-line"><input type="checkbox" name="confirm" required><span>Підтверджую, що спробував(-ла) вирішити питання в переписці та надав(-ла) достовірну інформацію.</span></label>
          <div class="form-actions"><button class="button button-danger" type="submit">Відкрити офіційний спір</button><a class="button button-secondary" href="/orders/${order.id}">Повернутися</a></div>
        </form></main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/orders/:id/dispute", requireAuth, verifyCsrf, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 50 || req.body.confirm !== "on") return res.status(400).send("Опишіть проблему детальніше і підтвердьте достовірність.");
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [req.params.id]);
    const order = rows[0];
    if (!order || ![order.customer_id, order.executor_id].includes(req.user.id) || ["new", "completed", "cancelled", "disputed"].includes(order.status)) throw new Error("DISPUTE_UNAVAILABLE");
    await client.query("INSERT INTO disputes(order_id, opened_by, reason) VALUES ($1,$2,$3)", [order.id, req.user.id, reason]);
    await client.query("UPDATE orders SET status='disputed', updated_at=NOW() WHERE id=$1", [order.id]);
    await client.query("INSERT INTO order_events(order_id, actor_id, event_type, details) VALUES ($1,$2,'disputed',$3)", [order.id, req.user.id, reason]);
    await client.query("COMMIT");
    const recipient = order.customer_id === req.user.id ? order.executor_id : order.customer_id;
    await notify(recipient, order.id, "dispute", "Відкрито спір", "Виконання призупинено до рішення операційної команди Poruch.");
    await sendMail({ to: SUPPORT_EMAIL, subject: `Спір у замовленні №${order.id}`, text: `${req.user.name} відкрив спір:\n${reason}\n\n${APP_ORIGIN}/admin` });
    res.redirect(`/orders/${order.id}?updated=1`);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.message === "DISPUTE_UNAVAILABLE" || error.code === "23505") return res.status(409).send("Спір уже відкрито або цей статус недоступний.");
    next(error);
  } finally {
    client.release();
  }
});

app.post("/orders/:id/review", requireRole("customer"), verifyCsrf, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!order || order.status !== "completed" || !order.executor_id || rating < 1 || rating > 5 || comment.length > 1200) {
      return res.status(409).send("Відгук зараз зберегти не можна.");
    }
    await pool.query(
      `INSERT INTO reviews(order_id, customer_id, executor_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(order_id) DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment, created_at=NOW()`,
      [order.id, req.user.id, order.executor_id, rating, comment]
    );
    await event(order.id, req.user.id, "review", `Оцінка: ${rating}/5`);
    await notify(order.executor_id, order.id, "review", "Новий відгук", `Замовник оцінив виконання на ${rating} із 5.`);
    res.redirect(`/orders/${order.id}?updated=1`);
  } catch (error) {
    next(error);
  }
});

app.get("/admin", requireAdmin, async (req, res, next) => {
  try {
    const [statsResult, verificationResult, disputesResult, usersResult] = await Promise.all([
      pool.query(`SELECT
        (SELECT COUNT(*) FROM users) users,
        (SELECT COUNT(*) FROM orders) orders,
        (SELECT COUNT(*) FROM orders WHERE status='disputed') disputes,
        (SELECT COUNT(*) FROM orders WHERE status='completed') completed`),
      pool.query(`SELECT v.*, u.name, u.email, u.city FROM verification_requests v
        JOIN users u ON u.id=v.user_id WHERE v.status='pending' ORDER BY v.created_at`),
      pool.query(`SELECT d.*, o.title, o.status order_status, u.name opened_by_name FROM disputes d
        JOIN orders o ON o.id=d.order_id JOIN users u ON u.id=d.opened_by
        WHERE d.status='open' ORDER BY d.created_at`),
      pool.query("SELECT id,name,email,role,status,verified_at,created_at FROM users ORDER BY created_at DESC LIMIT 30")
    ]);
    const stats = statsResult.rows[0];
    res.send(layout({
      title: "Операційний центр",
      user: withSessionUser(req),
      body: `<main class="page"><header class="page-head"><div><p class="eyebrow">Poruch / operations</p><h1>Рішення, довіра, контроль.</h1><p>Черга перевірок виконавців, відкриті спори та стан сервісу.</p></div></header>
        <section class="stats"><div class="stat"><span>Користувачі</span><strong>${stats.users}</strong></div><div class="stat"><span>Замовлення</span><strong>${stats.orders}</strong></div><div class="stat"><span>Завершено</span><strong>${stats.completed}</strong></div><div class="stat"><span>Відкриті спори</span><strong>${stats.disputes}</strong></div></section>
        <section class="section-block"><div class="section-title"><h2>Перевірка виконавців</h2><p>${verificationResult.rowCount} у черзі.</p></div>
          ${verificationResult.rowCount ? verificationResult.rows.map(item => `<article class="ops-card"><div><p class="eyebrow">${esc(item.city)} · ${date(item.created_at)}</p><h3>${esc(item.name)}</h3><p>${esc(item.email)}</p><p class="description"><strong>Досвід:</strong> ${esc(item.experience)}\n<strong>Зона:</strong> ${esc(item.service_area)}\n<strong>Оснащення:</strong> ${esc(item.equipment)}</p></div>
          <form method="post" action="/admin/verifications/${item.id}">${csrfField(req)}<label>Коментар<textarea name="note" maxlength="1000"></textarea></label><div class="form-actions"><button class="button" name="decision" value="approve">Підтвердити</button><button class="button button-danger" name="decision" value="reject">Відхилити</button></div></form></article>`).join("") : `<div class="empty">Черга порожня.</div>`}
        </section>
        <section class="section-block"><div class="section-title"><h2>Відкриті спори</h2><p>${disputesResult.rowCount} потребують рішення.</p></div>
          ${disputesResult.rowCount ? disputesResult.rows.map(item => `<article class="ops-card"><div><p class="eyebrow">Замовлення №${item.order_id}</p><h3>${esc(item.title)}</h3><p>${esc(item.opened_by_name)} · ${date(item.created_at, true)}</p><p class="description">${esc(item.reason)}</p><a class="text-link" href="/orders/${item.order_id}">Відкрити матеріали</a></div>
          <form method="post" action="/admin/disputes/${item.id}">${csrfField(req)}<label>Рішення<textarea name="resolution" required minlength="20" maxlength="3000"></textarea></label><label>Фінальний статус<select name="orderStatus"><option value="in_progress">Повернути в роботу</option><option value="changes_requested">Потрібні зміни</option><option value="completed">Завершити</option><option value="cancelled">Скасувати</option></select></label><button class="button button-wine" type="submit">Зафіксувати рішення</button></form></article>`).join("") : `<div class="empty">Відкритих спорів немає.</div>`}
        </section>
        <section class="section-block"><div class="section-title"><h2>Останні користувачі</h2></div><div class="compact-table">${usersResult.rows.map(item => `<div><strong>${esc(item.name)}</strong><span>${esc(item.email)}</span><span>${roleName(item.role)}</span><span>${item.verified_at ? "Перевірено" : esc(item.status)}</span></div>`).join("")}</div></section>
      </main>`
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/admin/verifications/:id", requireAdmin, verifyCsrf, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const decision = req.body.decision === "approve" ? "approved" : "rejected";
    const note = String(req.body.note || "").trim();
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM verification_requests WHERE id=$1 AND status='pending' FOR UPDATE", [req.params.id]);
    if (!rows[0]) throw new Error("VERIFICATION_UNAVAILABLE");
    await client.query("UPDATE verification_requests SET status=$1, reviewer_note=$2, reviewed_at=NOW() WHERE id=$3", [decision, note, rows[0].id]);
    if (decision === "approved") await client.query("UPDATE users SET verified_at=NOW() WHERE id=$1", [rows[0].user_id]);
    await client.query("COMMIT");
    await notify(rows[0].user_id, null, "verification", decision === "approved" ? "Профіль перевірено" : "Потрібно уточнення", note || (decision === "approved" ? "Тепер замовники бачать позначку перевіреного виконавця." : "Зв'яжіться з підтримкою для повторної перевірки."));
    res.redirect("/admin");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.message === "VERIFICATION_UNAVAILABLE") return res.status(409).send("Заявку вже оброблено.");
    next(error);
  } finally {
    client.release();
  }
});

app.post("/admin/disputes/:id", requireAdmin, verifyCsrf, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const resolution = String(req.body.resolution || "").trim();
    const orderStatus = String(req.body.orderStatus || "");
    if (resolution.length < 20 || !["in_progress", "changes_requested", "completed", "cancelled"].includes(orderStatus)) return res.status(400).send("Заповніть рішення і фінальний статус.");
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT d.*, o.customer_id, o.executor_id FROM disputes d JOIN orders o ON o.id=d.order_id
       WHERE d.id=$1 AND d.status='open' FOR UPDATE`,
      [req.params.id]
    );
    if (!rows[0]) throw new Error("DISPUTE_UNAVAILABLE");
    const dispute = rows[0];
    await client.query("UPDATE disputes SET status='resolved', resolution=$1, resolved_by=$2, resolved_at=NOW() WHERE id=$3", [resolution, req.user.id, dispute.id]);
    await client.query("UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2", [orderStatus, dispute.order_id]);
    await client.query("INSERT INTO order_events(order_id, actor_id, event_type, details) VALUES ($1,$2,'dispute_resolved',$3)", [dispute.order_id, req.user.id, resolution]);
    await client.query("COMMIT");
    await Promise.all([dispute.customer_id, dispute.executor_id].filter(Boolean).map(userId => notify(userId, dispute.order_id, "dispute", "Спір вирішено", resolution)));
    res.redirect("/admin");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.message === "DISPUTE_UNAVAILABLE") return res.status(409).send("Спір уже оброблено.");
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
    if (!file || (!isAdmin(req.user) && ![file.customer_id, file.executor_id].includes(req.user.id))) return res.status(404).send("Файл не знайдено.");
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
  console.error(JSON.stringify({
    level: "error",
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  }));
  res.status(500).send(layout({
    title: "Помилка",
    user: withSessionUser(req),
    body: `<main class="page"><p class="eyebrow">Помилка сервісу</p><h1>Не вдалося виконати дію.</h1><p>Спробуйте ще раз. Якщо проблема повториться, напишіть на munister@outlook.com.</p><a class="button" href="/dashboard">До кабінету</a></main>`
  }));
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Poruch app listening on ${PORT}; origin ${APP_ORIGIN}`);
});

const cleanupTimer = setInterval(() => {
  Promise.all([
    pool.query("DELETE FROM sessions WHERE expires_at < NOW()"),
    pool.query("DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at < NOW() - INTERVAL '1 day'")
  ]).catch(error => console.error(JSON.stringify({ level: "error", event: "cleanup_failed", message: error.message })));
}, 60 * 60_000);
cleanupTimer.unref();

async function shutdown(signal) {
  console.log(JSON.stringify({ level: "info", event: "shutdown", signal }));
  server.close(async () => {
    clearInterval(cleanupTimer);
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
