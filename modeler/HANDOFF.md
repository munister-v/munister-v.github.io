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

## Недавно сделано (2026-09-18)
- **Баг:** таблицы, созданные через шаблон (`templateModel`) или добавленные через «Імпорт DDL» / «Додати до моделі», не попадали в `diagram.tableIds` → пустое полотно при 7 таблицах в модели (ловило и первый визит на сайт, и уже сохранённые проекты). Правил в `storage.migrateModel` — теперь любая таблица/view, которой нет ни в одной диаграме, доезжает до активной; плюс `importDDL` в `app.js` дергает `migrateModel` сразу после мержа, без перезагрузки страницы.
- **Баг:** меню вкладки диаграми (Перейменувати / Дублювати / Додати всі таблиці / Видалити) не работало вообще — пункты меню задавались как `{action: fn}`, а `openMenu`/`renderMenu` в `app.js` читают `{run: fn}`. Поправлено в `diagrams-ui.js`.
- **Баг (адаптив):** на ширине ≤1560px `.cmdk{width:260px}` (style.css) не был ограничен снизу и перебивал более узкие правила (`.cmdk{width:36px}` при ≤1080px) — на телефоне шапка уезжала за экран на 135px, а `.lang`/DDL-кнопка становились недостижимы. Добавлен `min-width:1081px` к тому правилу.
- **Мобильная адаптация:** на ≤760px все `.btn-group` (кроме «Готові схеми» + «Перевірка моделі», класс `btn-group-primary`) прячутся за новую кнопку `[data-action="more"]` → `actions.more` в `app.js` открывает тот же `openMenu`, что и остальные контекстные меню (Проєкти / Історія / Зберегти / Імпорт / Міграція / Експорт-подменю).
- **Перевірка моделі (checks.js):** добавлены циклічні залежності FK (DFS, самопосилання типа MANAGER_ID не считаются), колонки-«групи, що повторюються» (PHONE1/PHONE2 → натяк на 1NF), неузгодженість іменування первинного ключа (ID проти `<TABLE>_ID`) з one-click автофіксом. Футер діалогу `#chk-fixes` тепер рендерить кнопку під кожен `issue.fix`, що зустрічається (було: одна кнопка, показ через regex по тексту).

## Что дальше (план)
1. **Большие схемы:** несколько диаграмм (предметные области), цветные зоны, выделение рамкой — уже сделано (`diagrams-ui.js`, `resolveOverlaps` в `diagram.js`). Осталось: производительность на 300+ таблиц (не профилировали).
2. **Качество:** готово на практическом уровне (именование PK с автофиксом, циклы FK, повторяющиеся группы). Полная проверка 2NF/3NF не сделана — модель не хранит функциональные зависимости, это отдельная (большая) задача.
3. **Логическая модель:** сущности, домены, подтипы, преобразование в физическую, нотации Barker и IE.
4. **Open source:** отдельный репозиторий, тесты парсера и diff, GitHub Actions, README со скриншотами.
5. **С бэкендом на VPS:** Git/YAML-модели, Liquibase/Flyway, подключение к живой Oracle, совместная работа.
