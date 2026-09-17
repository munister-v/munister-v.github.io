# Schemata — шпаргалка

## Где что
- Рабочая копия: `/Users/vyacheslawmunister/blueferret/datamodeler/`
- Репозиторий сайта: `~/dev/munister-site/` → папка `modeler/` (GitHub `munister-v/munister-v.github.io`)
- Прод: https://munister.com.ua/modeler/ (GitHub Pages + Cloudflare, без сборки)
- VPS: `173.242.49.73`, ключ `~/.ssh/teached_vps`, пользователь root. **Модельер там не живёт.** На VPS только поддомены (radio., poruch., bank. …), nginx `/etc/nginx/conf.d/`
- Данные пользователей только в localStorage браузера (`schemata:*`)

## Код (чистый HTML5 + ES-модули)
`index.html`, `style.css`, `sw.js` (офлайн), `bump-version.sh`
`js/`: `app.js` (связка, меню, редактор полей) · `model.js` (Store, undo) · `diagram.js` (SVG) · `panel.js` · `sidebar.js` · `palette.js` (⌘K) · `ddl-parse.js` / `ddl-gen.js` · `diff.js` (миграции) · `checks.js` · `docs.js` · `storage.js` / `workspace.js` (проекты, версии) · `templates.js` · `i18n.js` (uk/en)

## Запуск локально
```bash
python3 -m http.server 8765 -d /Users/vyacheslawmunister/blueferret/datamodeler
```

## Деплой
```bash
cd /Users/vyacheslawmunister/blueferret/datamodeler && ./bump-version.sh
rsync -a --delete --exclude .DS_Store ./ ~/dev/munister-site/modeler/
cd ~/dev/munister-site && git add -A modeler && git commit -m "modeler: …"
gh auth switch -u munister-v && git pull --rebase && git push && gh auth switch -u eprisj
```
Важно:
- `bump-version.sh` обязателен: он ставит `?v=` на все импорты и в `sw.js` и проверяет синтаксис. Без него браузеры смешивают старые модули и видят пустой экран.
- Пушить только от `munister-v`.

## Правила
- Любой новый текст интерфейса добавлять в `i18n.js` в обе секции, uk и en.
- Изменения модели делать только через `store.update()`, иначе не будет undo и автосохранения.
- Новое поле модели провести через всю цепочку: `storage.migrateModel` → парсер → генератор → `diff.js` → `checks.js` → `docs.js`.

## Что дальше (план)
1. **Большие схемы:** несколько диаграмм (предметные области), цветные зоны, выделение рамкой, раскладка без пересечений, производительность на 300+ таблиц.
2. **Качество:** правила именования с автоисправлением, проверка нормальных форм и циклов FK.
3. **Логическая модель:** сущности, домены, подтипы, преобразование в физическую, нотации Barker и IE.
4. **Open source:** отдельный репозиторий, тесты парсера и diff, GitHub Actions, README со скриншотами.
5. **С бэкендом на VPS:** Git/YAML-модели, Liquibase/Flyway, подключение к живой Oracle, совместная работа.
