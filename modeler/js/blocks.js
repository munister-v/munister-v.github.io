// Constructor library: ready-made building blocks that are dragged (or clicked) onto the model.
//   entities   — whole tables with their usual fields; `links` are the parents they attach to
//                when those tables are already in the model ("order!" = mandatory FK)
//   attributes — sets of fields dropped onto a table; types/constraints come from autodef rules
//   relations  — dropped onto the child table, then the parent is clicked
// Column spec: NAME, NAME! (NOT NULL), NAME:TYPE. Physical names are English (Oracle
// convention); the labels become table comments in the interface language.
import { newTable, newColumn, uid, uniqueName } from './model.js?v=202609241405';
import { applyInference, singular, plural } from './autodef.js?v=202609241405';

const E = (id, icon, name, uk, en, cols, links = []) => ({ id, icon, name, label: { uk, en }, cols, links });
export const ENTITY_GROUPS = [
  { id: 'people', label: { uk: 'Люди', en: 'People' }, items: [
    E('customer', '👤', 'CUSTOMERS', 'Клієнт', 'Customer', ['FIRST_NAME!', 'LAST_NAME!', 'EMAIL', 'PHONE', 'BIRTH_DATE', 'CREATED_AT']),
    E('employee', '🧑‍💼', 'EMPLOYEES', 'Співробітник', 'Employee', ['FIRST_NAME!', 'LAST_NAME!', 'EMAIL', 'PHONE', 'HIRE_DATE!', 'SALARY'], ['department', 'position', 'employee']),
    E('user', '🔐', 'USERS', 'Користувач', 'User', ['LOGIN', 'EMAIL', 'PASSWORD_HASH', 'IS_ACTIVE', 'LAST_LOGIN_AT', 'CREATED_AT']),
    E('student', '🎓', 'STUDENTS', 'Студент', 'Student', ['FIRST_NAME!', 'LAST_NAME!', 'EMAIL', 'BIRTH_DATE', 'ENROLLMENT_YEAR'], ['student_group']),
    E('teacher', '👩‍🏫', 'TEACHERS', 'Викладач', 'Teacher', ['FIRST_NAME!', 'LAST_NAME!', 'EMAIL', 'PHONE', 'ACADEMIC_TITLE'], ['department']),
    E('patient', '🧑‍🦽', 'PATIENTS', 'Пацієнт', 'Patient', ['FIRST_NAME!', 'LAST_NAME!', 'BIRTH_DATE!', 'GENDER', 'PHONE', 'INSURANCE_NO']),
    E('doctor', '🩺', 'DOCTORS', 'Лікар', 'Doctor', ['FIRST_NAME!', 'LAST_NAME!', 'SPECIALTY', 'PHONE', 'LICENSE_NO'], ['department']),
    E('supplier', '🚚', 'SUPPLIERS', 'Постачальник', 'Supplier', ['NAME!', 'EDRPOU', 'EMAIL', 'PHONE', 'CONTACT_NAME']),
    E('author', '✍️', 'AUTHORS', 'Автор', 'Author', ['FULL_NAME!', 'EMAIL', 'BIO:VARCHAR2(4000 CHAR)']),
  ] },
  { id: 'shop', label: { uk: 'Торгівля', en: 'Commerce' }, items: [
    E('category', '🗂️', 'CATEGORIES', 'Категорія', 'Category', ['NAME!', 'DESCRIPTION', 'SORT_ORDER'], ['category']),
    E('product', '📦', 'PRODUCTS', 'Товар', 'Product', ['NAME!', 'SKU', 'PRICE!', 'STOCK_QTY', 'DESCRIPTION', 'IS_ACTIVE'], ['category', 'supplier']),
    E('order', '🧾', 'ORDERS', 'Замовлення', 'Order', ['ORDER_NO', 'ORDER_DATE!', 'STATUS', 'TOTAL', 'CURRENCY'], ['customer!']),
    E('order_item', '📋', 'ORDER_ITEMS', 'Позиція замовлення', 'Order item', ['QUANTITY!', 'UNIT_PRICE!', 'DISCOUNT_PCT'], ['order!', 'product!']),
    E('cart', '🛒', 'CARTS', 'Кошик', 'Cart', ['CREATED_AT', 'UPDATED_AT'], ['customer']),
    E('review', '⭐', 'REVIEWS', 'Відгук', 'Review', ['RATING!', 'BODY', 'CREATED_AT'], ['product!', 'customer!']),
    E('coupon', '🏷️', 'COUPONS', 'Купон', 'Coupon', ['CODE', 'DISCOUNT_PCT!', 'VALID_FROM', 'VALID_TO', 'IS_ACTIVE']),
    E('shipment', '🚛', 'SHIPMENTS', 'Доставка', 'Shipment', ['CARRIER', 'TRACKING_NO', 'STATUS', 'SHIPPED_AT', 'DELIVERED_AT'], ['order!', 'address']),
    E('address', '📍', 'ADDRESSES', 'Адреса', 'Address', ['COUNTRY_CODE', 'CITY!', 'STREET!', 'POSTAL_CODE', 'IS_DEFAULT'], ['customer']),
  ] },
  { id: 'finance', label: { uk: 'Фінанси', en: 'Finance' }, items: [
    E('account', '🏦', 'ACCOUNTS', 'Рахунок', 'Account', ['IBAN', 'BALANCE', 'CURRENCY', 'OPENED_ON!', 'STATUS'], ['customer!']),
    E('transaction', '💸', 'TRANSACTIONS', 'Транзакція', 'Transaction', ['AMOUNT!', 'CURRENCY', 'TXN_TYPE', 'CREATED_AT', 'DESCRIPTION'], ['account!']),
    E('payment', '💳', 'PAYMENTS', 'Оплата', 'Payment', ['AMOUNT!', 'CURRENCY', 'METHOD', 'STATUS', 'PAID_AT'], ['order', 'invoice']),
    E('invoice', '📄', 'INVOICES', 'Рахунок-фактура', 'Invoice', ['INVOICE_NO', 'ISSUE_DATE!', 'DUE_DATE', 'TOTAL!', 'VAT', 'STATUS'], ['customer!', 'order']),
    E('card', '💳', 'CARDS', 'Картка', 'Card', ['MASKED_NUMBER!', 'EXPIRES_ON!', 'CARD_TYPE', 'IS_ACTIVE'], ['account!']),
    E('loan', '📈', 'LOANS', 'Кредит', 'Loan', ['AMOUNT!', 'RATE!', 'START_DATE!', 'END_DATE', 'STATUS'], ['customer!']),
  ] },
  { id: 'org', label: { uk: 'Організація', en: 'Organisation' }, items: [
    E('company', '🏢', 'COMPANIES', 'Компанія', 'Company', ['NAME!', 'EDRPOU', 'WEBSITE', 'PHONE']),
    E('department', '🏬', 'DEPARTMENTS', 'Відділ', 'Department', ['CODE', 'NAME!', 'BUDGET'], ['company', 'location']),
    E('position', '🪪', 'POSITIONS', 'Посада', 'Position', ['TITLE!', 'MIN_SALARY', 'MAX_SALARY']),
    E('location', '🗺️', 'LOCATIONS', 'Локація', 'Location', ['COUNTRY_CODE', 'CITY!', 'STREET', 'POSTAL_CODE', 'LATITUDE', 'LONGITUDE']),
    E('project', '🚀', 'PROJECTS', 'Проєкт', 'Project', ['CODE', 'NAME!', 'START_DATE!', 'END_DATE', 'BUDGET', 'STATUS'], ['department']),
    E('task', '✅', 'TASKS', 'Завдання', 'Task', ['TITLE!', 'DESCRIPTION', 'PRIORITY', 'STATUS', 'DUE_DATE'], ['project!', 'employee']),
  ] },
  { id: 'edu', label: { uk: 'Освіта', en: 'Education' }, items: [
    E('faculty', '🏛️', 'FACULTIES', 'Факультет', 'Faculty', ['CODE', 'NAME!']),
    E('student_group', '👥', 'STUDENT_GROUPS', 'Група', 'Group', ['CODE', 'START_YEAR'], ['faculty']),
    E('course', '📚', 'COURSES', 'Дисципліна', 'Course', ['CODE', 'TITLE!', 'CREDITS', 'DESCRIPTION'], ['teacher', 'department']),
    E('enrollment', '📝', 'ENROLLMENTS', 'Запис на курс', 'Enrollment', ['ENROLLED_ON', 'STATUS'], ['student!', 'course!']),
    E('grade', '💯', 'GRADES', 'Оцінка', 'Grade', ['SCORE!', 'GRADED_ON'], ['student!', 'course!']),
    E('lesson', '🕘', 'LESSONS', 'Заняття', 'Lesson', ['STARTS_AT!', 'ENDS_AT', 'ROOM', 'TOPIC'], ['course!', 'student_group']),
  ] },
  { id: 'med', label: { uk: 'Медицина', en: 'Healthcare' }, items: [
    E('appointment', '📅', 'APPOINTMENTS', 'Прийом', 'Appointment', ['STARTS_AT!', 'ENDS_AT', 'STATUS', 'NOTES'], ['patient!', 'doctor!']),
    E('diagnosis', '🩻', 'DIAGNOSES', 'Діагноз', 'Diagnosis', ['ICD_CODE!', 'DESCRIPTION', 'DIAGNOSED_ON'], ['appointment!']),
    E('medicine', '💊', 'MEDICINES', 'Препарат', 'Medicine', ['NAME!', 'DOSAGE_FORM', 'PRICE']),
    E('prescription', '🧪', 'PRESCRIPTIONS', 'Рецепт', 'Prescription', ['DOSAGE!', 'DURATION_DAYS', 'ISSUED_ON'], ['appointment!', 'medicine!']),
  ] },
  { id: 'stock', label: { uk: 'Склад', en: 'Warehouse' }, items: [
    E('warehouse', '🏭', 'WAREHOUSES', 'Склад', 'Warehouse', ['CODE', 'NAME!', 'CAPACITY'], ['location']),
    E('stock', '📊', 'STOCK', 'Залишок', 'Stock', ['QUANTITY!', 'UPDATED_AT'], ['warehouse!', 'product!']),
    E('purchase', '📥', 'PURCHASE_ORDERS', 'Закупівля', 'Purchase order', ['ORDER_NO', 'ORDER_DATE!', 'STATUS', 'TOTAL'], ['supplier!', 'warehouse']),
    E('movement', '🔁', 'STOCK_MOVEMENTS', 'Рух товару', 'Stock movement', ['QUANTITY!', 'MOVEMENT_TYPE!', 'MOVED_AT'], ['product!', 'warehouse!']),
  ] },
  { id: 'content', label: { uk: 'Контент', en: 'Content' }, items: [
    E('post', '📰', 'POSTS', 'Публікація', 'Post', ['TITLE!', 'SLUG', 'BODY', 'STATUS', 'PUBLISHED_AT'], ['author', 'category']),
    E('comment', '💬', 'COMMENTS', 'Коментар', 'Comment', ['BODY!', 'CREATED_AT', 'IS_APPROVED'], ['post!', 'user']),
    E('tag', '#️⃣', 'TAGS', 'Тег', 'Tag', ['NAME!', 'SLUG']),
    E('media', '🖼️', 'MEDIA', 'Медіафайл', 'Media', ['FILE_NAME!', 'MIME_TYPE', 'SIZE_BYTES:NUMBER(12)', 'URL', 'UPLOADED_AT'], ['post']),
    E('book', '📖', 'BOOKS', 'Книга', 'Book', ['ISBN', 'TITLE!', 'PUBLISHED_YEAR', 'PAGES:NUMBER(5)', 'PRICE'], ['author', 'category']),
  ] },
  { id: 'system', label: { uk: 'Система', en: 'System' }, items: [
    E('role', '🛡️', 'ROLES', 'Роль', 'Role', ['CODE', 'NAME!', 'DESCRIPTION']),
    E('permission', '🔑', 'PERMISSIONS', 'Дозвіл', 'Permission', ['CODE', 'DESCRIPTION']),
    E('audit_log', '🕵️', 'AUDIT_LOG', 'Журнал аудиту', 'Audit log', ['ENTITY_NAME!', 'ENTITY_ID', 'ACTION!', 'CHANGED_AT', 'CHANGED_BY', 'PAYLOAD']),
    E('setting', '⚙️', 'SETTINGS', 'Налаштування', 'Setting', ['SETTING_KEY!:VARCHAR2(100 CHAR)', 'SETTING_VALUE:VARCHAR2(4000 CHAR)', 'UPDATED_AT']),
    E('notification', '🔔', 'NOTIFICATIONS', 'Сповіщення', 'Notification', ['TITLE!', 'BODY', 'IS_READ', 'CREATED_AT'], ['user!']),
  ] },
];

const A = (id, icon, uk, en, cols) => ({ id, icon, label: { uk, en }, cols });
export const ATTRIBUTE_GROUPS = [
  { id: 'keys', label: { uk: 'Ключі', en: 'Keys' }, items: [
    A('id', '🔑', 'ID (IDENTITY)', 'ID (IDENTITY)', ['#ID']),
    A('uuid', '🧬', 'UUID', 'UUID', ['UUID']),
    A('code', '🏷️', 'Код (унікальний)', 'Code (unique)', ['CODE']),
  ] },
  { id: 'basic', label: { uk: 'Основні', en: 'Basics' }, items: [
    A('name', '🔤', 'Назва + опис', 'Name + description', ['NAME!', 'DESCRIPTION']),
    A('title', '📰', 'Заголовок', 'Title', ['TITLE!']),
    A('status', '🚦', 'Статус', 'Status', ['STATUS']),
    A('type', '🧩', 'Тип', 'Type', ['KIND']),
    A('active', '✅', 'Активний (Y/N)', 'Active (Y/N)', ['IS_ACTIVE']),
    A('sort', '↕️', 'Порядок сортування', 'Sort order', ['SORT_ORDER']),
    A('notes', '🗒️', 'Примітки', 'Notes', ['NOTES']),
  ] },
  { id: 'person', label: { uk: 'Людина', en: 'Person' }, items: [
    A('fio', '🪪', 'ПІБ', 'Full name', ['LAST_NAME!', 'FIRST_NAME!', 'MIDDLE_NAME']),
    A('contacts', '📇', 'Email + телефон', 'Email + phone', ['EMAIL', 'PHONE']),
    A('birth', '🎂', 'Дата народження + стать', 'Birth date + gender', ['BIRTH_DATE', 'GENDER']),
    A('login', '🔐', 'Логін + пароль', 'Login + password', ['LOGIN', 'PASSWORD_HASH']),
    A('ids', '🆔', 'ІПН', 'Tax number', ['IPN']),
  ] },
  { id: 'place', label: { uk: 'Місце', en: 'Place' }, items: [
    A('address', '📍', 'Адреса', 'Address', ['COUNTRY_CODE', 'CITY', 'STREET', 'POSTAL_CODE']),
    A('geo', '🌐', 'Координати', 'Coordinates', ['LATITUDE', 'LONGITUDE']),
    A('web', '🔗', 'Сайт', 'Website', ['WEBSITE']),
  ] },
  { id: 'money', label: { uk: 'Гроші', en: 'Money' }, items: [
    A('price', '💰', 'Ціна', 'Price', ['PRICE!']),
    A('amount', '💵', 'Сума + валюта', 'Amount + currency', ['AMOUNT!', 'CURRENCY']),
    A('discount', '🏷️', 'Знижка %', 'Discount %', ['DISCOUNT_PCT']),
    A('vat', '🧾', 'ПДВ', 'VAT', ['VAT']),
    A('balance', '🏦', 'Баланс', 'Balance', ['BALANCE']),
    A('iban', '💳', 'IBAN', 'IBAN', ['IBAN']),
  ] },
  { id: 'measure', label: { uk: 'Кількість і міри', en: 'Quantities' }, items: [
    A('qty', '🔢', 'Кількість', 'Quantity', ['QUANTITY']),
    A('dims', '📐', 'Вага + розміри', 'Weight + size', ['WEIGHT', 'WIDTH', 'HEIGHT', 'LENGTH']),
    A('rating', '⭐', 'Рейтинг 1–5', 'Rating 1–5', ['RATING']),
    A('duration', '⏱️', 'Тривалість, хв', 'Duration, min', ['DURATION_MINUTES']),
    A('year', '📆', 'Рік', 'Year', ['YEAR']),
  ] },
  { id: 'time', label: { uk: 'Дати', en: 'Dates' }, items: [
    A('period', '🗓️', 'Період (з — по)', 'Period (from — to)', ['START_DATE!', 'END_DATE']),
    A('validity', '📜', 'Діє з — по', 'Valid from — to', ['VALID_FROM', 'VALID_TO']),
    A('due', '⏰', 'Термін', 'Due date', ['DUE_DATE']),
    A('event', '🕘', 'Початок — кінець (час)', 'Starts — ends (time)', ['STARTS_AT!', 'ENDS_AT']),
  ] },
  { id: 'service', label: { uk: 'Службові', en: 'Service' }, items: [
    A('audit', '🕵️', 'Аудит', 'Audit', ['CREATED_AT', 'CREATED_BY', 'UPDATED_AT', 'UPDATED_BY']),
    A('soft', '🗑️', 'Мʼяке видалення', 'Soft delete', ['DELETED_AT']),
    A('version', '🔢', 'Версія рядка', 'Row version', ['ROW_VERSION']),
    A('json', '🧾', 'JSON-атрибути', 'JSON attributes', ['ATTRIBUTES']),
    A('file', '📎', 'Файл', 'File', ['FILE_NAME', 'MIME_TYPE', 'FILE']),
  ] },
];

export const RELATION_BLOCKS = [
  { id: '1n', icon: '⟜', label: { uk: 'Один-до-багатьох', en: 'One-to-many' }, hint: { uk: 'Необовʼязковий FK', en: 'Optional FK' } },
  { id: '1nm', icon: '⊸', label: { uk: 'Обовʼязковий звʼязок', en: 'Mandatory' }, hint: { uk: 'FK NOT NULL', en: 'FK NOT NULL' } },
  { id: '11', icon: '─', label: { uk: 'Один-до-одного', en: 'One-to-one' }, hint: { uk: 'FK + UNIQUE', en: 'FK + UNIQUE' } },
  { id: 'ident', icon: '⊷', label: { uk: 'Ідентифікуючий', en: 'Identifying' }, hint: { uk: 'FK входить у PK', en: 'FK is part of the PK' } },
  { id: 'mn', icon: '⋈', label: { uk: 'Багато-до-багатьох', en: 'Many-to-many' }, hint: { uk: 'Таблиця звʼязку', en: 'Junction table' } },
  { id: 'self', icon: '↺', label: { uk: 'Ієрархія', en: 'Hierarchy' }, hint: { uk: 'Посилання на себе (PARENT_ID)', en: 'Self-reference (PARENT_ID)' } },
];

export const ALL_ENTITIES = ENTITY_GROUPS.flatMap(g => g.items);
export const findEntity = id => ALL_ENTITIES.find(x => x.id === id);
export const findAttrSet = id => ATTRIBUTE_GROUPS.flatMap(g => g.items).find(x => x.id === id);

const parseSpec = s => {
  const [, pk, name, nn, type] = s.match(/^(#)?([A-Z0-9_]+)(!)?(?::(.+))?$/);
  return { pk: !!pk, name, nn: !!nn, type: type || '' };
};

// the model table a block stands for: by physical name, singular/plural or comment
export const tableForBlock = (model, b) => !b?.name ? null : model.tables.find(x =>
  x.name === b.name || singular(x.name) === singular(b.name) || plural(x.name) === b.name ||
  [b.label.uk, b.label.en].some(l => x.comment?.toLowerCase() === l.toLowerCase()));

// columns of a set onto a table (inside store.update); returns the names actually added
export function addColumns(model, tb, specs) {
  const added = [];
  for (const spec of specs) {
    const s = parseSpec(spec);
    if (tb.columns.some(c => c.name === s.name)) continue;
    if (s.pk && tb.columns.some(c => c.pk)) continue;
    const col = newColumn(s.name, s.type || undefined);
    if (s.pk) { Object.assign(col, { type: 'NUMBER', pk: true, identity: true, nullable: false }); tb.columns.unshift(col); added.push(s.name); continue; }
    tb.columns.push(col);
    applyInference(model, tb, col, { keepType: !!s.type });
    if (s.nn) col.nullable = false;
    added.push(s.name);
  }
  return added;
}

// FK child → parent the same way relations are drawn by hand: parent key carried into the child
export function linkTables(model, child, parent, { mandatory = false, identifying = false, one = false } = {}) {
  const pk = parent.columns.filter(c => c.pk);
  if (!pk.length) return null;
  const pairs = pk.map((pc, i) => {
    const sg = singular(parent.name);
    let base = pc.name === 'ID' ? `${sg}_ID` : pc.name.startsWith(sg) ? pc.name : `${sg}_${pc.name}`;
    if (child === parent) base = `PARENT_${base}`;
    const taken = model.fks.filter(f => f.fromTable === child.id).flatMap(f => f.columns.map(p => p.from));
    let col = child.columns.find(c => c.name === base && !taken.includes(c.id));
    if (!col) {
      let name = base, n = 2;
      while (child.columns.some(c => c.name === name)) name = `${base}_${n++}`;
      col = newColumn(name, pc.type);
      child.columns.splice(child.columns.filter(c => c.pk).length + i, 0, col);
    } else col.type = pc.type;
    if (identifying) { col.pk = true; col.nullable = false; } else if (mandatory) col.nullable = false;
    return { from: col.id, to: pc.id };
  });
  if (one && !identifying) child.uniques.push({ id: uid('u'), name: uniqueName(model, `${child.name}_${parent.name}_UN`), columns: pairs.map(p => p.from) });
  const f = { id: uid('f'), name: uniqueName(model, `${child.name}_${parent.name}_FK`), fromTable: child.id, toTable: parent.id, columns: pairs, onDelete: identifying ? 'CASCADE' : '' };
  model.fks.push(f);
  return f;
}

// a whole entity block → table, wired to whatever related blocks are already in the model.
// Returns { table, linked: [names] }; must run inside store.update.
export function placeEntity(model, block, lang, x, y) {
  let name = block.name, n = 2;
  while (model.tables.some(t => t.name === name)) name = `${block.name}_${n++}`;
  const tb = newTable(name, x, y);
  tb.comment = block.label[lang] || block.label.en;
  tb.columns.push(Object.assign(newColumn('ID', 'NUMBER'), { pk: true, identity: true, nullable: false }));
  addColumns(model, tb, block.cols);
  model.tables.push(tb);
  const linked = [];
  // parents this block expects ("order!" — mandatory); "employee" in EMPLOYEES = manager hierarchy
  for (const l of block.links) {
    const [id, must] = [l.replace('!', ''), l.endsWith('!')];
    const target = id === block.id ? tb : tableForBlock(model, findEntity(id) || {});
    if (!target || (target === tb && id !== block.id)) continue;
    if (linkTables(model, tb, target, { mandatory: must })) linked.push(target === tb ? `${tb.name} ↺` : target.name);
  }
  // children already in the model that expect this block as their parent
  for (const other of ALL_ENTITIES) {
    if (other.id === block.id || !other.links.some(l => l.replace('!', '') === block.id)) continue;
    const child = tableForBlock(model, other);
    if (!child || child === tb || model.fks.some(f => f.fromTable === child.id && f.toTable === tb.id)) continue;
    const must = other.links.includes(`${block.id}!`);
    if (linkTables(model, child, tb, { mandatory: must })) linked.push(child.name);
  }
  return { table: tb, linked };
}
