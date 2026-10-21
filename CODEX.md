# Codex — швидкий контекст

**Репо:** `munister-v/munister-v.github.io` → GitHub Pages → **https://munister.com.ua**

| Що | Де |
|----|-----|
| Портфоліо | `/index.html` (+ `uk/`, `it/`, `fr/`, `de/`; it/fr/de збирає `scripts/build-i18n.py`) |
| CV | `/cv.html` + `Viacheslav-Munister-CV.pdf` (ATS-friendly, один стовпчик; `cv-ats.css`) |
| Застосунки | `/irpin/`, `/vidmar/`, `/architectura/`, `ampublishing.html` |
| Домен | `CNAME` → `munister.com.ua` |

**PDF CV:** є 5 файлів: `Viacheslav-Munister-CV.pdf` (EN) і `-uk/-it/-fr/-de.pdf`; кнопка на кожній мовній версії веде на свій. Після змін у CV перегенерувати (для кожної мови з `/<lang>/cv.html`): `python3 -m http.server 8123` і `Chrome --headless=new --no-pdf-header-footer --print-to-pdf=Viacheslav-Munister-CV.pdf http://localhost:8123/cv.html`.

**Деплой:** `git push origin main` (статика, без білду).
