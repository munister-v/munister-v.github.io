# Контекст проєкту для Codex / агентів

Скопіюй цей файл у чат Codex або додай репозиторій як контекст. Містить **живі URL**, **структуру**, **правила деплою** та **зв’язки між частинами**.

---

## 1. Що це за репозиторій

| Параметр | Значення |
|----------|----------|
| **GitHub** | `https://github.com/munister-v/munister-v.github.io` |
| **Хостинг** | GitHub Pages (гілка `main`, корінь репо) |
| **Кастомний домен** | `munister.com.ua` (файл `CNAME` у корені) |
| **Акаунт власника** | `munister-v` |

Це **статичний сайт** (HTML/CSS/JS без білду на CI). Зміни публікуються після `git push` у `main` (затримка GitHub Pages ~1–2 хв).

---

## 2. Публічні URL (канонічні)

| Призначення | URL |
|-------------|-----|
| Головна (портфоліо, EN) | `https://munister.com.ua/` |
| CV | `https://munister.com.ua/cv.html` |
| **Army Bank — маркетинговий лендінг (UK)** | `https://munister.com.ua/army-bank/` |
| Якір «Можливості» / продукт | `https://munister.com.ua/army-bank/#products` |
| **Army Bank — PWA / застосунок (Render)** | `https://army-bank.onrender.com/dashboard` |
| API (базовий шлях) | `https://army-bank.onrender.com/api` |
| Army Admin (статичний SPA у цьому ж репо) | `https://munister.com.ua/army-admin/` |
| Редірект `/bank/` → застосунок | `https://munister.com.ua/bank/` → має вести на live app (див. `bank/index.html`) |

**Важливо:** лендінг на GitHub Pages і бойовий застосунок на Render — **різні хости**. Лендінг лише посилається на Render; бекенд не в цьому репозиторії.

---

## 3. Структура репозиторію (ключові шляхи)

```
/
├── CNAME                 # munister.com.ua
├── index.html            # головна сторінка портфоліо + блок Army Bank MVP
├── cv.html, letter.html, …
├── army-bank/
│   ├── index.html        # лендінг Army Bank (UK), секція #products
│   ├── styles.css
│   └── app.js            # smooth scroll, навбар; на onrender переписує CTA → /dashboard
├── army-admin/
│   ├── index.html
│   ├── css/styles.css
│   └── js/api.js, app.js
├── bank/
│   └── index.html        # meta refresh / redirect на live app
├── assets/, images/
└── docs/
    └── CODEX-PROJECT-CONTEXT.md   # цей файл
```

---

## 4. Правила для Army Bank (лендінг)

- Кнопки типу **«Відкрити додаток»**, **live demo**, **«Відкрити платформу»** у HTML мають `href="https://army-bank.onrender.com/dashboard"`.
- У `army-bank/app.js`: на хості `*.onrender.com` (і localhost) ці посилання переписуються на **відносний** `/dashboard` (без `target="_blank"`).
- Секція «Можливості» має **`id="products"`** (не `features`) — для посилань виду `/army-bank/#products`.
- Версіонування кешу: у `army-bank/index.html` параметри `?v=…` для `styles.css` та `app.js` — при змінах бажано інкрементувати.

---

## 5. DNS (коротко, для домену)

Щоб `munister.com.ua` працював з GitHub Pages:

- **A** для `@` → чотири IP GitHub Pages: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- **CNAME** для `www` → `munister-v.github.io`

Деталі: документація GitHub Pages «Configuring a custom domain».

---

## 6. Як вносити зміни та публікувати

```bash
cd /path/to/munister-v.github.io
git checkout main
git pull
# редагування файлів
git add -A
git commit -m "опис змін"
git push origin main
```

Після пушу перевіряти сайт з **жорстким оновленням** (Ctrl+Shift+R), бо CDN/браузер кешує статику.

---

## 7. Що Codex **не** знайде в цьому репо

- Вихідний код Flask-бекенду, PostgreSQL-схеми в проді, `render.yaml` тощо — якщо вони в **іншому** репозиторії, його треба додати окремо в контекст.
- Секрети (токени, `.env`) — не комітити; для Codex описувати лише **назви змінних** і призначення.

---

## 8. Швидкий чеклист для нового сеансу Codex

1. Репо: `munister-v/munister-v.github.io`, гілка `main`.
2. Лендінг Army Bank: `army-bank/index.html`, якір `#products`.
3. Live app: `https://army-bank.onrender.com/dashboard`, API: `…/api`.
4. Після змін — `git push`; чекати GitHub Pages; при потребі підняти `?v=` у лендінгу.

---

*Оновлено для імпорту в Codex / інші агенти. Дублікат короткого резюме: `CODEX.md` у корені репозиторію.*
