# Ferret Data Modeler

Open-source веб-модельер данных для **Oracle Database**. Чистый HTML5 + ES-модули: без сборки, без зависимостей, без бэкенда.

## Возможности (MVP)
- ER-диаграмма: таблицы, колонки, PK / UK / индексы, внешние ключи (нотация «воронья лапка»)
- Создание связи в стиле Oracle Data Modeler: колонки PK родителя добавляются в дочернюю таблицу
- Генерация Oracle DDL: `CREATE TABLE`, IDENTITY, DEFAULT, constraints, `CREATE INDEX`, `COMMENT ON`, `ON DELETE`
- Импорт DDL-скрипта (в т.ч. из SQL Developer / `DBMS_METADATA.GET_DDL`)
- Сохранение модели в JSON (удобно хранить в Git), автосохранение в браузере
- Undo/redo, авто-раскладка, экспорт в SVG, светлая/тёмная тема

## Запуск
ES-модули не работают через `file://`, нужен любой статический сервер:
```bash
python3 -m http.server 8765
```
и откройте http://localhost:8765

## Горячие клавиши
| Клавиша | Действие |
|---|---|
| двойной клик | новая таблица |
| `T` / `R` / `F` | таблица / режим связи / показать всё |
| `Del` | удалить выбранное |
| `⌘Z` / `⌘⇧Z` | отмена / повтор |
| `⌘S` | сохранить JSON |

## Структура
```
js/model.js      модель, undo/redo, автосохранение
js/diagram.js    SVG-диаграмма, pan/zoom, drag
js/panel.js      панель свойств
js/ddl-gen.js    генерация Oracle DDL
js/ddl-parse.js  импорт Oracle DDL
js/app.js        UI, тулбар, диалоги
```

## Лицензия
MIT
