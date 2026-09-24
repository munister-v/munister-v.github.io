// Auto-definitions: what a field is from its name (type, NOT NULL, DEFAULT, CHECK,
// UNIQUE) and the logical → physical transformation built on top of it.
// Names can be written the logical way — "Дата народження", "unitPrice",
// "first name" — and become Oracle identifiers (DATA_NARODZHENNIA, UNIT_PRICE…);
// the original wording is kept as the column/table comment.
import { newColumn, uid, uniqueName } from './model.js?v=202609241331';
import { fixFkIndexes } from './checks.js?v=202609241331';

// Ukrainian → Latin, official KMU 2010 scheme (є/ї/й/ю/я differ at word start)
const UK = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ъ: '', ы: 'y', э: 'e', ё: 'io' };
const UK_START = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };
const CYR = /[а-яёєіїґ]/i;

export function translit(s) {
  let out = '';
  const chars = [...s];
  chars.forEach((ch, i) => {
    const lo = ch.toLowerCase();
    if (!(lo in UK)) { out += ch; return; }
    const start = i === 0 || !/[а-яёєіїґ'’ʼ]/i.test(chars[i - 1]);
    let r = start && UK_START[lo] ? UK_START[lo] : UK[lo];
    if (lo === 'г' && chars[i - 1]?.toLowerCase() === 'з') r = 'gh';
    out += ch !== lo ? r.toUpperCase() : r;
  });
  return out;
}

// Any logical name → Oracle identifier. "unitPrice" / "Unit price" / "Ціна за од." → UNIT_PRICE / TSINA_ZA_OD
export function physName(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  s = translit(s).replace(/['’ʼ`]/g, '');
  s = s.replace(/[^A-Za-z0-9_$#]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toUpperCase();
  if (/^[0-9$#]/.test(s)) s = `C_${s}`;
  return s.slice(0, 128);
}
// true when the name was written the logical way (so the wording is worth keeping as a comment)
export const isLogical = raw => CYR.test(raw) || /\s/.test(raw.trim());
const niceComment = raw => { const s = raw.trim().replace(/\s+/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };

// ---------- singular / plural (English table names) ----------
const IRREGULAR = { PERSON: 'PEOPLE', CHILD: 'CHILDREN', MAN: 'MEN', WOMAN: 'WOMEN', MOUSE: 'MICE', DATUM: 'DATA', CRITERION: 'CRITERIA', ANALYSIS: 'ANALYSES' };
const IRREG_BACK = Object.fromEntries(Object.entries(IRREGULAR).map(([a, b]) => [b, a]));
const lastWord = (n, fn) => { const i = n.lastIndexOf('_'); return n.slice(0, i + 1) + fn(n.slice(i + 1)); };
export const plural = name => lastWord(name, w => {
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (IRREG_BACK[w] || /(SS|US|IS)$/.test(w) === false && /S$/.test(w)) return w;
  if (/[^AEIOU]Y$/.test(w)) return `${w.slice(0, -1)}IES`;
  if (/(S|X|Z|CH|SH)$/.test(w)) return `${w}ES`;
  return `${w}S`;
});
export const singular = name => lastWord(name, w => {
  if (IRREG_BACK[w]) return IRREG_BACK[w];
  if (/IES$/.test(w)) return `${w.slice(0, -3)}Y`;
  if (/(SSES|XES|ZES|CHES|SHES)$/.test(w)) return w.slice(0, -2);
  if (/[^SU]S$/.test(w)) return w.slice(0, -1);
  return w;
});
// names a table could have for a FK column called <base>_ID
export const parentCandidates = base => [...new Set([base, plural(base), `${base}S`, `${base}ES`, base.replace(/Y$/, 'IES')])];

// ---------- column rules ----------
// Tested against the physical name wrapped in underscores, so "_PRICE_" matches
// PRICE, UNIT_PRICE, PRICE_EUR. Ukrainian words are listed in transliteration.
// First matching rule wins, so specific ones go first.
const W = (...words) => n => words.some(w => `_${n}_`.includes(`_${w}_`));
const R = re => n => re.test(n);
const either = (...fs) => n => fs.some(f => f(n));
const YN = c => `${c} IN ('Y', 'N')`;
const RULES = [
  { id: 'uuid', test: W('UUID', 'GUID'), type: 'RAW(16)', def: 'SYS_GUID()', nn: true, unique: true },
  { id: 'fk', test: R(/(^|_)ID$/), type: 'NUMBER' },
  { id: 'created', test: R(/^(CREATED|INSERTED|ADDED|STVORENO)(_(AT|ON|DATE|TIME))?$/), type: 'TIMESTAMP', def: 'SYSTIMESTAMP', nn: true },
  { id: 'createdBy', test: R(/^(CREATED|INSERTED|ADDED)_BY$/), type: 'VARCHAR2(100 CHAR)', def: 'USER', nn: true },
  { id: 'changedBy', test: R(/^(UPDATED|MODIFIED|CHANGED|DELETED)_BY$/), type: 'VARCHAR2(100 CHAR)' },
  { id: 'ts', test: either(R(/_AT$|TIMESTAMP|(^|_)TIME$/), W('CHAS')), type: 'TIMESTAMP' },
  { id: 'flagOn', test: either(R(/^(IS|CHY)_(ACTIVE|ENABLED|VISIBLE|AKTYVNYI|AKTYVNA|AKTYVNE)$/), W('ACTIVE', 'ENABLED', 'AKTYVNYI')), type: 'CHAR(1)', def: "'Y'", nn: true, check: YN },
  { id: 'flag', test: either(R(/^(IS|HAS|CAN|SHOULD|CHY|YE|MAIE)_/), W('FLAG', 'BLOCKED', 'VERIFIED', 'CONFIRMED', 'PAID', 'PUBLISHED', 'ARCHIVED', 'DELETED_FLAG')), type: 'CHAR(1)', def: "'N'", nn: true, check: YN },
  { id: 'date', test: either(W('DATE', 'DATA', 'BIRTHDAY', 'DOB', 'DEADLINE', 'DUE', 'VALID_FROM', 'VALID_TO', 'NARODZHENNIA'), R(/_ON$|^(BIRTH|HIRE|START|END)_/)), type: 'DATE' },
  { id: 'email', test: W('EMAIL', 'E_MAIL', 'MAIL', 'POSHTA', 'ELEKTRONNA_POSHTA'), type: 'VARCHAR2(255 CHAR)', unique: n => /^(E_?MAIL|POSHTA|ELEKTRONNA_POSHTA)$/.test(n), check: c => `${c} LIKE '%_@_%._%'` },
  { id: 'phone', test: W('PHONE', 'TEL', 'TELEFON', 'MOBILE', 'MOBILNYI', 'FAX'), type: 'VARCHAR2(20 CHAR)', check: c => `REGEXP_LIKE(${c}, '^\\+?[0-9 ()-]{7,20}$')` },
  { id: 'url', test: either(W('URL', 'LINK', 'WEBSITE', 'SITE', 'POSYLANNIA', 'SAIT'), R(/_PATH$/)), type: 'VARCHAR2(2000 CHAR)' },
  { id: 'fileName', test: R(/^FILE_?NAME$|_FILE_NAME$/), type: 'VARCHAR2(255 CHAR)' },
  { id: 'mime', test: W('MIME', 'MIME_TYPE', 'CONTENT_TYPE'), type: 'VARCHAR2(100 CHAR)' },
  { id: 'blob', test: W('PHOTO', 'IMAGE', 'AVATAR', 'PICTURE', 'FOTO', 'ZOBRAZHENNIA', 'FILE', 'ATTACHMENT', 'SCAN', 'FAIL'), type: 'BLOB' },
  { id: 'json', test: W('JSON', 'PAYLOAD', 'ATTRIBUTES', 'SETTINGS', 'METADATA', 'META', 'PARAMS', 'CONFIG', 'OPTIONS'), type: 'JSON' },
  { id: 'currency', test: W('CURRENCY', 'CURRENCY_CODE', 'VALIUTA'), type: 'CHAR(3)', def: "'UAH'", nn: true, check: c => `REGEXP_LIKE(${c}, '^[A-Z]{3}$')` },
  { id: 'country', test: R(/^(COUNTRY|ISO)_CODE$|^COUNTRY_ISO$/), type: 'CHAR(2)', check: c => `REGEXP_LIKE(${c}, '^[A-Z]{2}$')` },
  { id: 'postal', test: W('ZIP', 'POSTCODE', 'POSTAL_CODE', 'ZIP_CODE', 'INDEKS', 'POSHTOVYI_INDEKS'), type: 'VARCHAR2(10 CHAR)' },
  { id: 'iban', test: W('IBAN'), type: 'VARCHAR2(34 CHAR)', unique: true, check: c => `REGEXP_LIKE(${c}, '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$')` },
  { id: 'edrpou', test: W('EDRPOU', 'YEDRPOU'), type: 'CHAR(8)', unique: true, check: c => `REGEXP_LIKE(${c}, '^[0-9]{8}$')` },
  { id: 'ipn', test: W('IPN', 'RNOKPP', 'INN'), type: 'CHAR(10)', unique: true, check: c => `REGEXP_LIKE(${c}, '^[0-9]{10}$')` },
  { id: 'isbn', test: W('ISBN'), type: 'VARCHAR2(17 CHAR)', unique: true },
  { id: 'code', test: W('CODE', 'KOD', 'SKU', 'BARCODE', 'SHTRYKHKOD', 'ARTICLE', 'ARTYKUL'), type: 'VARCHAR2(30 CHAR)', nn: n => /^(CODE|KOD|SKU|BARCODE|ARTYKUL)$/.test(n), unique: n => /^(CODE|KOD|SKU|BARCODE|SHTRYKHKOD|ARTYKUL)$/.test(n) },
  { id: 'login', test: W('LOGIN', 'USERNAME', 'USER_NAME', 'NICKNAME'), type: 'VARCHAR2(50 CHAR)', nn: true, unique: true },
  { id: 'secret', test: either(W('PASSWORD', 'PAROL', 'PASSWORD_HASH', 'SALT'), R(/_HASH$/)), type: 'VARCHAR2(255 CHAR)', nn: true },
  { id: 'token', test: W('TOKEN', 'SECRET', 'API_KEY'), type: 'VARCHAR2(255 CHAR)' },
  { id: 'ip', test: W('IP', 'IP_ADDRESS', 'IP_ADRESA'), type: 'VARCHAR2(45 CHAR)' },
  { id: 'percent', test: W('PERCENT', 'PCT', 'RATE', 'DISCOUNT', 'VAT', 'PDV', 'ZNYZHKA', 'VIDSOTOK', 'STAVKA'), type: 'NUMBER(5,2)', check: c => `${c} BETWEEN 0 AND 100` },
  { id: 'balance', test: W('BALANCE', 'BALANS', 'ZALYSHOK_KOSHTIV'), type: 'NUMBER(14,2)', def: '0', nn: true },
  { id: 'money', test: W('PRICE', 'COST', 'AMOUNT', 'TOTAL', 'SUM', 'SUMA', 'FEE', 'SALARY', 'WAGE', 'BUDGET', 'DEBIT', 'CREDIT', 'TSINA', 'VARTIST', 'ZARPLATA', 'OPLATA', 'OKLAD', 'VYTRATY'), type: 'NUMBER(12,2)', check: c => `${c} >= 0` },
  { id: 'qty', test: W('QTY', 'QUANTITY', 'KILKIST', 'STOCK', 'UNITS', 'ZALYSHOK', 'COUNT', 'MISTSIA', 'SEATS', 'CAPACITY', 'CREDITS', 'KREDYTY', 'HOURS_TOTAL'), type: 'NUMBER(10)', def: n => /^(QTY|QUANTITY|KILKIST)$/.test(n) ? '1' : '', check: c => `${c} >= 0` },
  { id: 'year', test: W('YEAR', 'RIK'), type: 'NUMBER(4)', check: c => `${c} BETWEEN 1900 AND 2100` },
  { id: 'age', test: W('AGE', 'VIK'), type: 'NUMBER(3)', check: c => `${c} BETWEEN 0 AND 150` },
  { id: 'rating', test: W('RATING', 'STARS', 'REITYNH'), type: 'NUMBER(2,1)', check: c => `${c} BETWEEN 1 AND 5` },
  { id: 'score', test: W('SCORE', 'GRADE', 'MARK', 'OTSINKA', 'BAL', 'BALY'), type: 'NUMBER(5,2)', check: c => `${c} >= 0` },
  { id: 'lat', test: W('LAT', 'LATITUDE', 'SHYROTA'), type: 'NUMBER(9,6)', check: c => `${c} BETWEEN -90 AND 90` },
  { id: 'lon', test: W('LON', 'LNG', 'LONGITUDE', 'DOVHOTA'), type: 'NUMBER(9,6)', check: c => `${c} BETWEEN -180 AND 180` },
  { id: 'measure', test: W('WEIGHT', 'HEIGHT', 'WIDTH', 'LENGTH', 'DEPTH', 'VOLUME', 'AREA', 'DISTANCE', 'VAHA', 'VYSOTA', 'SHYRYNA', 'DOVZHYNA', 'PLOSHCHA', 'OBSIAH', 'VIDSTAN'), type: 'NUMBER(10,3)', check: c => `${c} >= 0` },
  { id: 'duration', test: W('DURATION', 'MINUTES', 'SECONDS', 'HOURS', 'DAYS', 'TRYVALIST', 'KHVYLYN', 'DNIV'), type: 'NUMBER(10)', check: c => `${c} >= 0` },
  { id: 'order', test: W('SORT_ORDER', 'POSITION', 'PRIORITY', 'SORT', 'ORDINAL', 'PORIADOK', 'PRIORYTET'), type: 'NUMBER(5)', def: '0', nn: true },
  { id: 'version', test: W('VERSION', 'VERSIIA', 'ROW_VERSION'), type: 'NUMBER(10)', def: '1', nn: true },
  { id: 'number', test: R(/_(NO|NUM|NUMBER|NOMER)$|^(NO|NUM|NOMER)$/), type: 'VARCHAR2(30 CHAR)' },
  { id: 'status', test: W('STATUS', 'STATE', 'STAN'), type: 'VARCHAR2(30 CHAR)', def: "'NEW'", nn: true },
  { id: 'kind', test: W('TYPE', 'KIND', 'CATEGORY', 'TYP', 'VYD', 'KATEHORIIA'), type: 'VARCHAR2(30 CHAR)' },
  { id: 'gender', test: W('GENDER', 'SEX', 'STAT'), type: 'CHAR(1)', check: c => `${c} IN ('M', 'F')` },
  { id: 'fullName', test: W('FULL_NAME', 'FULLNAME', 'PIB'), type: 'VARCHAR2(300 CHAR)', nn: true },
  { id: 'person', test: W('FIRST_NAME', 'LAST_NAME', 'SURNAME', 'IMIA', 'PRIZVYSHCHE'), type: 'VARCHAR2(100 CHAR)', nn: true },
  { id: 'middle', test: W('MIDDLE_NAME', 'PATRONYMIC', 'PO_BATKOVI'), type: 'VARCHAR2(100 CHAR)' },
  { id: 'name', test: W('NAME', 'TITLE', 'NAZVA', 'NAIMENUVANNIA', 'SUBJECT', 'TEMA', 'LABEL'), type: 'VARCHAR2(200 CHAR)', nn: n => /^(NAME|TITLE|NAZVA|NAIMENUVANNIA)$/.test(n) },
  { id: 'clob', test: W('BODY', 'CONTENT', 'TEXT', 'TEKST', 'ZMIST', 'HTML', 'MARKDOWN'), type: 'CLOB' },
  { id: 'longText', test: W('DESCRIPTION', 'DESCR', 'NOTE', 'NOTES', 'COMMENT', 'COMMENTS', 'REMARK', 'SUMMARY', 'REASON', 'OPYS', 'PRYMITKA', 'KOMENTAR', 'PRYCHYNA'), type: 'VARCHAR2(4000 CHAR)' },
  { id: 'address', test: W('ADDRESS', 'ADRESA', 'STREET', 'VULYTSIA', 'ADDRESS_LINE'), type: 'VARCHAR2(400 CHAR)' },
  { id: 'place', test: W('CITY', 'TOWN', 'COUNTRY', 'REGION', 'STATE_NAME', 'DISTRICT', 'MISTO', 'KRAINA', 'OBLAST', 'RAION', 'NASELENYI_PUNKT'), type: 'VARCHAR2(100 CHAR)' },
  { id: 'lang', test: W('LANG', 'LANGUAGE', 'LOCALE', 'MOVA'), type: 'VARCHAR2(10 CHAR)' },
  { id: 'tz', test: W('TIMEZONE', 'TIME_ZONE', 'TZ'), type: 'VARCHAR2(64 CHAR)' },
  { id: 'color', test: W('COLOR', 'COLOUR', 'KOLIR'), type: 'VARCHAR2(30 CHAR)' },
];
export const DEFAULT_TYPE = 'VARCHAR2(100 CHAR)';
const val = (v, n) => typeof v === 'function' ? v(n) : v;

// Everything a column name implies. Only non-empty facts are returned.
export function inferColumn(name) {
  const n = physName(name);
  const r = RULES.find(x => x.test(n));
  if (!r) return { rule: null, type: DEFAULT_TYPE, nn: false, def: '', check: '', unique: false };
  return { rule: r.id, type: r.type, nn: !!val(r.nn, n), def: val(r.def, n) || '', check: r.check ? r.check(n) : '', unique: !!val(r.unique, n) };
}
export const guessType = name => inferColumn(name || 'X').type;

// Short "→ NUMBER(12,2) · NOT NULL · CHECK ≥ 0" summary for the inline editor
export function describe(inf) {
  const parts = [inf.type];
  if (inf.nn) parts.push('NOT NULL');
  if (inf.def) parts.push(`DEFAULT ${inf.def}`);
  if (inf.unique) parts.push('UNIQUE');
  if (inf.check) parts.push('CHECK');
  return parts.join(' · ');
}

// Apply what the name implies to a fresh column and its table (constraints live on the table).
// keep: facts the user already chose explicitly and that must not be overwritten.
export function applyInference(model, tb, col, { keepType = false, keepNn = false } = {}) {
  const inf = inferColumn(col.name);
  if (!keepType) col.type = inf.type;
  if (col.pk || col.identity || col.virtual) return inf;
  if (!keepNn && inf.nn) col.nullable = false;
  if (inf.def && !col.default) col.default = inf.def;
  if (inf.check) addCheck(model, tb, col, inf.check);
  if (inf.unique) addUnique(model, tb, col);
  return inf;
}
function addCheck(model, tb, col, expr) {
  tb.checks ||= [];
  if (tb.checks.some(k => norm(k.expr) === norm(expr))) return false;
  tb.checks.push({ id: uid('k'), name: uniqueName(model, `${tb.name}_${col.name}_CK`.slice(0, 128)), expr });
  return true;
}
function addUnique(model, tb, col) {
  const pk = tb.columns.filter(c => c.pk);
  if ((pk.length === 1 && pk[0].id === col.id) || tb.uniques.some(u => u.columns.length === 1 && u.columns[0] === col.id)) return false;
  tb.uniques.push({ id: uid('u'), name: uniqueName(model, `${tb.name}_${col.name}_UN`.slice(0, 128)), columns: [col.id] });
  return true;
}
const norm = s => String(s || '').replace(/\s+/g, '').toUpperCase();

// FK column <X>_ID → the table it points to (a single-column PK is required)
export function findParent(model, tableId, name) {
  const m = physName(name).match(/^(?:PARENT_)?(.+)_ID$/);
  if (!m) return null;
  const cands = parentCandidates(m[1]);
  return model.tables.find(x => x.id !== tableId && cands.includes(x.name.toUpperCase()) && x.columns.filter(c => c.pk).length === 1) || null;
}

// ---------- logical → physical ----------
export const L2P_STEPS = [
  { id: 'names', on: true }, { id: 'plural', on: true }, { id: 'pk', on: true }, { id: 'fks', on: true },
  { id: 'types', on: true }, { id: 'rules', on: true }, { id: 'ranges', on: true }, { id: 'fkIdx', on: true },
  { id: 'audit', on: false },
];
const AUDIT = [
  { name: 'CREATED_AT', type: 'TIMESTAMP', default: 'SYSTIMESTAMP', nullable: false },
  { name: 'CREATED_BY', type: 'VARCHAR2(100 CHAR)', default: 'USER', nullable: false },
  { name: 'UPDATED_AT', type: 'TIMESTAMP' },
  { name: 'UPDATED_BY', type: 'VARCHAR2(100 CHAR)' },
];
const RANGE_PAIRS = [[/^START_(.+)$/, 'END_$1'], [/^(.+)_FROM$/, '$1_TO'], [/^VALID_FROM$/, 'VALID_TO'], [/^STARTS_AT$/, 'ENDS_AT'], [/^MIN_(.+)$/, 'MAX_$1'], [/^(.+)_START$/, '$1_END'], [/^DATA_POCHATKU$/, 'DATA_ZAKINCHENNIA']];
const escRe = s => s.replace(/[$#]/g, '\\$&');
const renameIn = (text, from, to) => text ? String(text).replace(new RegExp(`(^|[^A-Za-z0-9_$#"])${escRe(from)}(?![A-Za-z0-9_$#])`, 'gi'), `$1${to}`) : text;

// Mutates model; returns the change log [{step, text, target}]. Run it on a copy for the preview.
// scope: optional Set of table ids to limit the work to (the assistant runs it per selected table)
export function toPhysical(model, steps, t, scope = null) {
  const on = id => steps[id] !== false;
  const log = [];
  const inScope = id => !scope || scope.has(id);
  const all = model.tables, real = model;
  model = new Proxy(model, { get: (m, k) => k === 'tables' && scope ? all.filter(x => scope.has(x.id)) : m[k] });
  const add = (step, key, p, target) => log.push({ step, text: t(`l2p.c.${key}`, p), target });
  const fkCols = tb => new Set(model.fks.filter(f => f.fromTable === tb.id).flatMap(f => f.columns.map(p => p.from)));

  if (on('names') || on('plural')) {
    for (const tb of model.tables) {
      const oldT = tb.name;
      let name = on('names') ? physName(oldT) || oldT : oldT;
      // only English-looking names are pluralised; transliterated Ukrainian stays as written
      if (on('plural') && !CYR.test(oldT) && !CYR.test(tb.comment || '') && /^[A-Z0-9_]+$/.test(name) && !/^TABLE_\d+$/.test(name) && !isJunction(model, tb)) name = plural(name);
      if (name !== oldT && !all.some(x => x !== tb && x.name === name)) {
        tb.name = name;
        add(CYR.test(oldT) || physName(oldT) !== oldT ? 'names' : 'plural', 'renameT', { a: oldT, b: name }, tb.id);
        const re = new RegExp(`^${escRe(oldT)}_`, 'i');
        [...tb.uniques, ...tb.indexes, ...(tb.checks || [])].forEach(x => { x.name = x.name.replace(re, `${name}_`); });
        if (tb.pkName) tb.pkName = tb.pkName.replace(re, `${name}_`);
        model.fks.filter(f => f.fromTable === tb.id).forEach(f => { f.name = f.name.replace(re, `${name}_`); });
        (model.views || []).forEach(v => { v.sql = renameIn(v.sql, oldT, name); });
      }
      if (on('names') && isLogical(oldT) && !tb.comment) { tb.comment = niceComment(oldT); add('names', 'comment', { t: tb.name, v: tb.comment }, tb.id); }
      if (!on('names')) continue;
      for (const c of tb.columns) {
        const oldC = c.name, cn = physName(oldC) || oldC;
        if (isLogical(oldC) && !c.comment) c.comment = niceComment(oldC);
        if (cn === oldC || tb.columns.some(x => x !== c && x.name === cn)) continue;
        c.name = cn;
        add('names', 'renameC', { t: tb.name, a: oldC, b: cn }, tb.id);
        (tb.checks || []).forEach(k => { k.expr = renameIn(k.expr, oldC, cn); });
        tb.columns.forEach(x => { if (x.virtual) x.virtual = renameIn(x.virtual, oldC, cn); });
        if (tb.partition?.columns) tb.partition.columns = renameIn(tb.partition.columns, oldC, cn);
      }
    }
  }

  if (on('pk')) {
    for (const tb of model.tables) {
      if (tb.columns.some(c => c.pk)) continue;
      const fks = model.fks.filter(f => f.fromTable === tb.id);
      if (isJunction(model, tb) && fks.length >= 2) {
        const ids = fks.flatMap(f => f.columns.map(p => p.from));
        tb.columns.forEach(c => { if (ids.includes(c.id)) { c.pk = true; c.nullable = false; } });
        add('pk', 'pkComposite', { t: tb.name, c: tb.columns.filter(c => c.pk).map(c => c.name).join(', ') }, tb.id);
        continue;
      }
      const carried = fkCols(tb);
      const existing = tb.columns.find(c => !carried.has(c.id) && (c.name === 'ID' || c.name === `${singular(tb.name)}_ID`));
      if (existing) { Object.assign(existing, { pk: true, nullable: false }); add('pk', 'pkExisting', { t: tb.name, c: existing.name }, tb.id); continue; }
      const id = Object.assign(newColumn('ID', 'NUMBER'), { pk: true, identity: true, nullable: false });
      tb.columns.unshift(id);
      add('pk', 'pkAdded', { t: tb.name }, tb.id);
    }
  }

  if (on('fks')) {
    for (const tb of model.tables) {
      for (const c of tb.columns) {
        if (fkCols(tb).has(c.id)) continue;
        const parent = findParent({ tables: all }, tb.id, c.name);
        if (!parent || (c.pk && tb.columns.filter(x => x.pk).length === 1 && !isJunction(model, tb))) continue;
        const pk = parent.columns.find(x => x.pk);
        c.type = pk.type;
        model.fks.push({ id: uid('f'), name: uniqueName(real, `${tb.name}_${parent.name}_FK`), fromTable: tb.id, toTable: parent.id, columns: [{ from: c.id, to: pk.id }], onDelete: '' });
        add('fks', 'fk', { t: tb.name, c: c.name, p: parent.name }, tb.id);
      }
    }
  }

  if (on('types')) {
    for (const tb of model.tables) {
      const carried = fkCols(tb);
      for (const c of tb.columns) {
        if (c.pk || c.virtual || carried.has(c.id) || (c.type && c.type.toUpperCase() !== DEFAULT_TYPE)) continue;
        const ty = inferColumn(c.name).type;
        // only a real type change: a VARCHAR2 length may well have been chosen on purpose
        if (ty === (c.type || '').toUpperCase() || (c.type && /^VARCHAR2/.test(ty))) continue;
        c.type = ty;
        add('types', 'type', { t: tb.name, c: c.name, v: ty }, tb.id);
      }
    }
  }

  if (on('rules')) {
    for (const tb of model.tables) {
      const carried = fkCols(tb);
      for (const c of tb.columns) {
        if (c.pk || c.virtual || c.identity || carried.has(c.id)) continue;
        const inf = inferColumn(c.name);
        if (!inf.rule) continue;
        // a rule only fits a column whose type is the one the rule expects (don't CHECK a VARCHAR2 "YEAR" as a number)
        if (inf.type.replace(/\(.*$/, '') !== (c.type || '').replace(/\s*\(.*$/, '').toUpperCase()) continue;
        if (inf.nn && c.nullable) { c.nullable = false; add('rules', 'nn', { t: tb.name, c: c.name }, tb.id); }
        if (inf.def && !c.default) { c.default = inf.def; add('rules', 'def', { t: tb.name, c: c.name, v: inf.def }, tb.id); }
        if (inf.check && addCheck(real, tb, c, inf.check)) add('rules', 'check', { t: tb.name, v: inf.check }, tb.id);
        if (inf.unique && addUnique(real, tb, c)) add('rules', 'unique', { t: tb.name, c: c.name }, tb.id);
      }
    }
  }

  if (on('ranges')) {
    for (const tb of model.tables) {
      for (const a of tb.columns) {
        for (const [re, to] of RANGE_PAIRS) {
          if (!re.test(a.name)) continue;
          const b = tb.columns.find(x => x.name === a.name.replace(re, to));
          if (!b) continue;
          const expr = `${b.name} >= ${a.name}`;
          if (addCheck(real, tb, b, expr)) add('ranges', 'check', { t: tb.name, v: expr }, tb.id);
        }
      }
    }
  }

  if (on('audit')) {
    for (const tb of model.tables) {
      if (isJunction(model, tb)) continue;
      const missing = AUDIT.filter(a => !tb.columns.some(c => c.name === a.name));
      if (!missing.length) continue;
      missing.forEach(a => tb.columns.push({ ...newColumn(a.name, a.type), nullable: a.nullable ?? true, default: a.default || '' }));
      add('audit', 'audit', { t: tb.name, c: missing.map(a => a.name).join(', ') }, tb.id);
    }
  }

  if (on('fkIdx')) {
    const before = new Map(model.tables.map(tb => [tb.id, tb.indexes.length]));
    fixFkIndexes({ tables: all, fks: model.fks.filter(f => inScope(f.fromTable)) }, uid, uniqueName);
    for (const tb of model.tables) for (const ix of tb.indexes.slice(before.get(tb.id))) add('fkIdx', 'idx', { t: tb.name, v: ix.name }, tb.id);
  }
  return log;
}

// junction (M:N) table: at least two outgoing FKs and nothing but key/FK columns
function isJunction(model, tb) {
  const fks = model.fks.filter(f => f.fromTable === tb.id && f.toTable !== tb.id);
  if (fks.length < 2) return false;
  const carried = new Set(fks.flatMap(f => f.columns.map(p => p.from)));
  return tb.columns.every(c => carried.has(c.id) || /^(ID|CREATED_AT|CREATED_BY|UPDATED_AT|UPDATED_BY)$/.test(c.name));
}

// ---------- field name suggestions for the inline editor ----------
const BY_TABLE = [
  [/CUSTOMER|CLIENT|USER|EMPLOYEE|PERSON|PEOPLE|STUDENT|TEACHER|PATIENT|DOCTOR|MEMBER|KLIIENT|KORYSTUVACH|PRATSIVNYK|STUDENT/, ['FIRST_NAME', 'LAST_NAME', 'MIDDLE_NAME', 'EMAIL', 'PHONE', 'BIRTH_DATE', 'GENDER', 'IS_ACTIVE']],
  [/PRODUCT|ITEM|GOOD|TOVAR|BOOK|SERVICE/, ['NAME', 'SKU', 'DESCRIPTION', 'PRICE', 'QUANTITY', 'WEIGHT', 'IS_ACTIVE']],
  [/ORDER|ZAMOVLENN|INVOICE|SALE|BOOKING|RESERVATION/, ['ORDER_NO', 'ORDER_DATE', 'STATUS', 'TOTAL', 'CURRENCY', 'NOTES']],
  [/PAYMENT|TRANSACTION|PLATIZH|OPLAT/, ['AMOUNT', 'CURRENCY', 'STATUS', 'PAID_AT', 'METHOD']],
  [/ADDRESS|ADRES|LOCATION/, ['COUNTRY_CODE', 'CITY', 'STREET', 'POSTAL_CODE', 'LATITUDE', 'LONGITUDE']],
  [/CATEGOR|TYPE|KIND|STATUS|KATEHOR/, ['CODE', 'NAME', 'DESCRIPTION', 'SORT_ORDER']],
  [/POST|ARTICLE|NEWS|COMMENT|REVIEW|VIDHUK|MESSAGE/, ['TITLE', 'BODY', 'RATING', 'PUBLISHED_AT', 'IS_PUBLISHED']],
  [/COURSE|SUBJECT|LESSON|EXAM|GRADE/, ['CODE', 'TITLE', 'CREDITS', 'START_DATE', 'END_DATE', 'SCORE']],
  [/ACCOUNT|RAKHUN|CARD|WALLET/, ['IBAN', 'BALANCE', 'CURRENCY', 'OPENED_ON', 'IS_ACTIVE']],
  [/CONTRACT|DOGOVIR|SUBSCRIPTION|POLICY|LEASE/, ['CONTRACT_NO', 'START_DATE', 'END_DATE', 'AMOUNT', 'STATUS']],
];
const COMMON = ['NAME', 'TITLE', 'DESCRIPTION', 'CODE', 'STATUS', 'EMAIL', 'PHONE', 'PRICE', 'AMOUNT', 'QUANTITY', 'CURRENCY', 'IS_ACTIVE', 'START_DATE', 'END_DATE', 'SORT_ORDER', 'NOTES', 'CREATED_AT', 'CREATED_BY', 'UPDATED_AT', 'UPDATED_BY'];

// FK columns to the other tables first, then what this kind of table usually has, then common names
export function suggestFieldNames(model, tb) {
  const taken = new Set(tb.columns.map(c => c.name));
  const fk = model.tables.filter(x => x.id !== tb.id && x.columns.filter(c => c.pk).length === 1).map(x => {
    const pk = x.columns.find(c => c.pk);
    return pk.name === 'ID' ? `${singular(x.name)}_ID` : pk.name;
  });
  const own = BY_TABLE.filter(([re]) => re.test(tb.name)).flatMap(([, names]) => names);
  return [...new Set([...own, ...fk, ...COMMON])].filter(n => !taken.has(n));
}

// A table was renamed: FK columns that were named after it (<OLD>_ID) and constraint names that
// embed the old name follow along. Only derived names are touched; a hand-picked FK column name stays.
export function cascadeTableRename(model, tb, oldName) {
  if (!oldName || oldName === tb.name) return;
  const oldCol = `${singular(oldName)}_ID`, newCol = `${singular(tb.name)}_ID`;
  for (const f of model.fks) {
    if (f.toTable === tb.id) {
      const child = model.tables.find(x => x.id === f.fromTable);
      for (const p of f.columns) {
        const c = child?.columns.find(x => x.id === p.from);
        if (c && c.name === oldCol && !child.columns.some(x => x.name === newCol)) c.name = newCol;
        if (c && c.name === `PARENT_${oldCol}` && !child.columns.some(x => x.name === `PARENT_${newCol}`)) c.name = `PARENT_${newCol}`;
      }
    }
    if (f.toTable === tb.id || f.fromTable === tb.id) f.name = renameToken(f.name, oldName, tb.name);
  }
  for (const x of [...tb.uniques, ...tb.indexes, ...(tb.checks || [])]) x.name = renameToken(x.name, oldName, tb.name);
}
const renameToken = (name, from, to) => name.split(new RegExp(`(?<=^|_)${from.replace(/[$#]/g, '\\$&')}(?=_|$)`)).join(to);
