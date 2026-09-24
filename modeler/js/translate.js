// Ukrainian → English identifiers for data models, fully offline.
//   "Клієнт" → CUSTOMER, "Дата народження" → BIRTH_DATE, "Кількість на складі" → STOCK_QUANTITY,
//   "Загальна сума замовлення" → ORDER_TOTAL_AMOUNT, "Чи активний" → IS_ACTIVE.
// A domain dictionary of lemmas (with Ukrainian case endings stripped on lookup), fixed phrases,
// and one word-order rule: genitive/prepositional modifiers go in front in English
// ("дата народження" = date of birth → BIRTH_DATE). Unknown words fall back to transliteration
// and are reported, so the UI can ask the user to check them.

// "uk EN" per entry; "~" marks an adjective (stays in front of its noun), "!" a flag verb/particle
const WORDS = `
клієнт CUSTOMER|замовник CUSTOMER|покупець BUYER|користувач USER|юзер USER|учасник MEMBER|член MEMBER|абонент SUBSCRIBER|підписник SUBSCRIBER
співробітник EMPLOYEE|працівник EMPLOYEE|робітник WORKER|персонал STAFF|менеджер MANAGER|керівник MANAGER|директор DIRECTOR|бухгалтер ACCOUNTANT|оператор OPERATOR|адміністратор ADMIN|модератор MODERATOR|власник OWNER|автор AUTHOR|редактор EDITOR|виконавець ASSIGNEE|відповідальний ~RESPONSIBLE
студент STUDENT|учень PUPIL|викладач TEACHER|вчитель TEACHER|професор PROFESSOR|куратор CURATOR|абітурієнт APPLICANT|випускник GRADUATE|аспірант POSTGRADUATE
пацієнт PATIENT|лікар DOCTOR|медсестра NURSE|водій DRIVER|пасажир PASSENGER|гість GUEST|відвідувач VISITOR|читач READER|кандидат CANDIDATE|контакт CONTACT|партнер PARTNER|агент AGENT|продавець SELLER|постачальник SUPPLIER|виробник MANUFACTURER|перевізник CARRIER|кур'єр COURIER|орендар TENANT|орендодавець LANDLORD|позичальник BORROWER|кредитор LENDER|спонсор SPONSOR|волонтер VOLUNTEER|тренер COACH|спортсмен ATHLETE|гравець PLAYER|команда TEAM|людина PERSON|особа PERSON|фізособа PERSON|юрособа COMPANY
компанія COMPANY|підприємство COMPANY|організація ORGANIZATION|фірма COMPANY|установа INSTITUTION|філія BRANCH|відділ DEPARTMENT|відділення BRANCH|підрозділ UNIT|департамент DEPARTMENT|кафедра DEPARTMENT|факультет FACULTY|університет UNIVERSITY|школа SCHOOL|клас CLASS|група GROUP|посада POSITION|роль ROLE|дозвіл PERMISSION|право PERMISSION|проєкт PROJECT|проект PROJECT|завдання TASK|задача TASK|етап STAGE|спринт SPRINT|звіт REPORT|документ DOCUMENT|договір CONTRACT|контракт CONTRACT|угода AGREEMENT|додаток ATTACHMENT|вкладення ATTACHMENT|файл FILE|фото PHOTO|фотографія PHOTO|зображення IMAGE|картинка IMAGE|аватар AVATAR|відео VIDEO|медіа MEDIA|посилання LINK|сайт WEBSITE|сторінка PAGE
товар PRODUCT|продукт PRODUCT|виріб PRODUCT|послуга SERVICE|сервіс SERVICE|категорія CATEGORY|підкатегорія SUBCATEGORY|бренд BRAND|марка BRAND|модель MODEL|артикул SKU|штрихкод BARCODE|каталог CATALOG|асортимент ASSORTMENT|склад WAREHOUSE|залишок STOCK|запас STOCK|партія BATCH|поставка DELIVERY|постачання SUPPLY|закупівля PURCHASE|продаж SALE|знижка DISCOUNT|акція PROMOTION|купон COUPON|промокод PROMO_CODE|кошик CART|позиція ITEM|рядок LINE|пункт ITEM|замовлення ORDER|заявка REQUEST|запит REQUEST|бронювання BOOKING|бронь BOOKING|резервування RESERVATION|доставка DELIVERY|відправлення SHIPMENT|посилка PARCEL|вантаж CARGO|маршрут ROUTE|рейс TRIP|поїздка TRIP|квиток TICKET|місце SEAT|транспорт VEHICLE|автомобіль CAR|машина CAR
оплата PAYMENT|платіж PAYMENT|рахунок ACCOUNT|рахунок-фактура INVOICE|фактура INVOICE|чек RECEIPT|квитанція RECEIPT|транзакція TRANSACTION|операція OPERATION|переказ TRANSFER|кредит LOAN|позика LOAN|депозит DEPOSIT|вклад DEPOSIT|картка CARD|карта CARD|гаманець WALLET|банк BANK|валюта CURRENCY|податок TAX|пдв VAT|комісія FEE|штраф FINE|бонус BONUS|баланс BALANCE|борг DEBT|бюджет BUDGET|витрата EXPENSE|витрати EXPENSES|дохід INCOME|прибуток PROFIT|зарплата SALARY|заробітна SALARY|оклад SALARY|премія BONUS|пенсія PENSION|страховка INSURANCE|страхування INSURANCE|поліс POLICY|тариф TARIFF|підписка SUBSCRIPTION|абонемент SUBSCRIPTION
курс COURSE|дисципліна COURSE|занять LESSONS|завдань TASKS|замовлень ORDERS|повідомлень MESSAGES|хвилинах MINUTES|предмет SUBJECT|урок LESSON|заняття LESSON|лекція LECTURE|семінар SEMINAR|іспит EXAM|екзамен EXAM|залік TEST|тест TEST|оцінка GRADE|бал SCORE|бали SCORE|рейтинг RATING|кредити CREDITS|семестр SEMESTER|навчання STUDY|розклад SCHEDULE|аудиторія ROOM|кабінет ROOM|кімната ROOM|приміщення ROOM|поверх FLOOR|будинок BUILDING|корпус BUILDING|запис ENROLLMENT|відвідування ATTENDANCE|присутність ATTENDANCE|диплом DIPLOMA|сертифікат CERTIFICATE|спеціальність SPECIALTY|кваліфікація QUALIFICATION
прийом APPOINTMENT|візит VISIT|діагноз DIAGNOSIS|рецепт PRESCRIPTION|препарат MEDICINE|ліки MEDICINE|медикамент MEDICINE|аналіз TEST|процедура PROCEDURE|лікування TREATMENT|хвороба DISEASE|симптом SYMPTOM|палата WARD|лікарня HOSPITAL|клініка CLINIC|аптека PHARMACY|дозування DOSAGE|доза DOSE|історія HISTORY|картка CARD
публікація POST|пост POST|стаття ARTICLE|новина NEWS|коментар COMMENT|відгук REVIEW|оцінювання RATING|тег TAG|мітка TAG|повідомлення MESSAGE|лист LETTER|сповіщення NOTIFICATION|чат CHAT|розмова CONVERSATION|книга BOOK|примірник COPY|екземпляр COPY|том VOLUME|сторінок PAGES|сторінки PAGES|бібліотека LIBRARY|абонент SUBSCRIBER|полиця SHELF|стелаж RACK|розділ SECTION|глава CHAPTER|журнал JOURNAL|видання EDITION|видавництво PUBLISHER|жанр GENRE|фільм MOVIE|музика MUSIC|пісня SONG|альбом ALBUM|подія EVENT|захід EVENT|зустріч MEETING|конференція CONFERENCE|календар CALENDAR
адреса ADDRESS|країна COUNTRY|область REGION|регіон REGION|район DISTRICT|місто CITY|село VILLAGE|вулиця STREET|будинок HOUSE|квартира APARTMENT|індекс INDEX|локація LOCATION|розташування LOCATION|координати COORDINATES|широта LATITUDE|довгота LONGITUDE|точка POINT|зона ZONE|територія TERRITORY
журнал LOG|лог LOG|аудит AUDIT|налаштування SETTING|параметр PARAMETER|конфігурація CONFIG|сесія SESSION|токен TOKEN|пароль PASSWORD|логін LOGIN|хеш HASH|ключ KEY|версія VERSION|мова LANGUAGE|переклад TRANSLATION|шаблон TEMPLATE|статус STATUS|стан STATE|тип TYPE|вид KIND|різновид KIND|клас CLASS|рівень LEVEL|пріоритет PRIORITY|порядок SORT_ORDER|позиція POSITION|колір COLOR|розмір SIZE|вага WEIGHT|висота HEIGHT|ширина WIDTH|довжина LENGTH|глибина DEPTH|об'єм VOLUME|площа AREA|відстань DISTANCE|швидкість SPEED|температура TEMPERATURE|тривалість DURATION|період PERIOD|термін TERM|строк TERM|дедлайн DEADLINE
ім'я FIRST_NAME|нікнейм NICKNAME|псевдонім ALIAS|підпис SIGNATURE|паспорт PASSPORT|серія SERIES|громадянство CITIZENSHIP|національність NATIONALITY|освіта EDUCATION|досвід EXPERIENCE|навичка SKILL|хобі HOBBY|імені FIRST_NAME|прізвище LAST_NAME|піб FULL_NAME|назва NAME|найменування NAME|заголовок TITLE|тема SUBJECT|опис DESCRIPTION|примітка NOTE|примітки NOTES|коментар COMMENT|текст TEXT|зміст CONTENT|вміст CONTENT|тіло BODY|код CODE|номер NUMBER|ідентифікатор ID|ід ID|телефон PHONE|мобільний ~MOBILE|пошта MAIL|email EMAIL|емейл EMAIL|факс FAX|стать GENDER|вік AGE|рік YEAR|року YEAR|роки YEARS|місяць MONTH|тиждень WEEK|день DAY|дні DAYS|днів DAYS|година HOUR|години HOURS|хвилина MINUTE|хвилини MINUTES|секунда SECOND|дата DATE|час TIME|момент MOMENT|початок START|кінець END|закінчення END|завершення COMPLETION|народження BIRTH|створення CREATION|оновлення UPDATE|зміна CHANGE|видалення DELETION|реєстрація REGISTRATION|прийому HIRE|найму HIRE|звільнення DISMISSAL|видачі ISSUE|видача ISSUE|повернення RETURN|отримання RECEIPT|відправки DISPATCH|оплати PAYMENT|дія ACTION|подія EVENT
ціна PRICE|собівартість COST_PRICE|націнка MARKUP|аванс ADVANCE|передоплата PREPAYMENT|решта CHANGE|вартість COST|сума AMOUNT|сумма AMOUNT|кількість QUANTITY|к-сть QUANTITY|число NUMBER|відсоток PERCENT|ставка RATE|знижки DISCOUNT|рейтинг RATING|кредит CREDIT|дебет DEBIT|ліміт LIMIT|мінімум MIN|максимум MAX|середнє AVERAGE|всього TOTAL|разом TOTAL|підсумок TOTAL|результат RESULT|показник METRIC|значення VALUE|одиниця UNIT|одиниць UNITS|розрахунок CALCULATION
загальний ~TOTAL|повний ~FULL|короткий ~SHORT|основний ~MAIN|головний ~MAIN|додатковий ~ADDITIONAL|інший ~OTHER|новий ~NEW|старий ~OLD|поточний ~CURRENT|попередній ~PREVIOUS|наступний ~NEXT|останній ~LAST|перший ~FIRST|другий ~SECOND|кінцевий ~FINAL|остаточний ~FINAL|фактичний ~ACTUAL|плановий ~PLANNED|очікуваний ~EXPECTED|мінімальний ~MIN|максимальний ~MAX|середній ~AVERAGE|базовий ~BASE|зовнішній ~EXTERNAL|внутрішній ~INTERNAL|публічний ~PUBLIC|приватний ~PRIVATE|особистий ~PERSONAL|робочий ~WORK|домашній ~HOME|юридичний ~LEGAL|фізичний ~PHYSICAL|поштовий ~POSTAL|електронний ~ELECTRONIC|банківський ~BANK|кредитний ~CREDIT|податковий ~TAX|медичний ~MEDICAL|навчальний ~ACADEMIC|науковий ~ACADEMIC|вчений ~ACADEMIC|денний ~DAILY|місячний ~MONTHLY|річний ~ANNUAL|одиничний ~UNIT|оптовий ~WHOLESALE|роздрібний ~RETAIL|вхідний ~INCOMING|вихідний ~OUTGOING|батьківський ~PARENT|дочірній ~CHILD|головна ~MAIN
активний ~ACTIVE|активна ~ACTIVE|активне ~ACTIVE|видалений ~DELETED|заблокований ~BLOCKED|підтверджений ~CONFIRMED|перевірений ~VERIFIED|оплачений ~PAID|оплачено ~PAID|опублікований ~PUBLISHED|опубліковано ~PUBLISHED|доступний ~AVAILABLE|обов'язковий ~REQUIRED|дозволений ~ALLOWED|архівний ~ARCHIVED|завершений ~COMPLETED|виконаний ~DONE|прочитаний ~READ|прочитано ~READ|схвалений ~APPROVED|відхилений ~REJECTED|скасований ~CANCELLED|відкритий ~OPEN|закритий ~CLOSED|видимий ~VISIBLE|прихований ~HIDDEN
створено CREATED|оновлено UPDATED|змінено MODIFIED|видалено DELETED|надіслано SENT|отримано RECEIVED|доставлено DELIVERED|відправлено SHIPPED|повернуто RETURNED|видано ISSUED|почато STARTED|завершено COMPLETED|створив CREATED_BY|змінив MODIFIED_BY
`;
// fixed expressions, written as lemmas; matched before single words
const PHRASES = `
дата народження=BIRTH_DATE|день народження=BIRTHDAY|місце народження=BIRTH_PLACE
електронна пошта=EMAIL|ел пошта=EMAIL|е-мейл=EMAIL|номер телефону=PHONE|мобільний телефон=MOBILE_PHONE|контактний телефон=CONTACT_PHONE
поштовий індекс=POSTAL_CODE|по батькові=MIDDLE_NAME|повне ім'я=FULL_NAME|прізвище ім'я по батькові=FULL_NAME|ім'я користувача=USERNAME
дата створення=CREATED_AT|час створення=CREATED_AT|дата оновлення=UPDATED_AT|час оновлення=UPDATED_AT|дата зміни=UPDATED_AT|дата видалення=DELETED_AT|ким створено=CREATED_BY|ким змінено=UPDATED_BY
дата початку=START_DATE|дата кінця=END_DATE|дата закінчення=END_DATE|дата завершення=END_DATE|час початку=START_TIME|час кінця=END_TIME|час закінчення=END_TIME
дійсний з=VALID_FROM|дійсний до=VALID_TO|діє з=VALID_FROM|діє до=VALID_TO|дата з=DATE_FROM|дата по=DATE_TO
позиція замовлення=ORDER_ITEM|рядок замовлення=ORDER_ITEM|рахунок фактура=INVOICE|рахунок-фактура=INVOICE|кількість на складі=STOCK_QUANTITY|залишок на складі=STOCK_QUANTITY
одиниця виміру=UNIT_OF_MEASURE|ціна за одиницю=UNIT_PRICE|ціна одиниці=UNIT_PRICE|сума до сплати=AMOUNT_DUE|номер рахунку=ACCOUNT_NO|номер замовлення=ORDER_NO|номер документа=DOCUMENT_NO|номер договору=CONTRACT_NO|номер паспорта=PASSPORT_NO|номер картки=CARD_NO|серія паспорта=PASSPORT_SERIES
податковий номер=TAX_ID|ідентифікаційний код=TAX_ID|код єдрпоу=EDRPOU|єдрпоу=EDRPOU|іпн=TAX_ID|рнокпп=TAX_ID
пароль хеш=PASSWORD_HASH|хеш пароля=PASSWORD_HASH|останній вхід=LAST_LOGIN_AT|дата останнього входу=LAST_LOGIN_AT
рік видання=PUBLISHED_YEAR|дата видання=PUBLISHED_ON|кількість сторінок=PAGE_COUNT|кількість примірників=COPIES_COUNT|навчальна група=STUDENT_GROUP|академічна група=STUDENT_GROUP|запис на курс=ENROLLMENT|рік вступу=ENROLLMENT_YEAR|рік навчання=STUDY_YEAR|вчене звання=ACADEMIC_TITLE|науковий ступінь=ACADEMIC_DEGREE
кредитна картка=CREDIT_CARD|банківський рахунок=BANK_ACCOUNT|курс валют=EXCHANGE_RATE|сума кредиту=LOAN_AMOUNT|відсоткова ставка=INTEREST_RATE|термін дії=EXPIRES_ON|дійсна до=EXPIRES_ON
журнал аудиту=AUDIT_LOG|історія змін=CHANGE_HISTORY|порядок сортування=SORT_ORDER|порядковий номер=SEQ_NO|за замовчуванням=DEFAULT
`;
const PREP = new Set('на в у з із зі для до від по за про при між без через під над біля серед щодо о об'.split(' '));
const FLAG = { 'чи': 'IS', 'є': 'IS', 'має': 'HAS', 'може': 'CAN' };
// case endings, longest first; a word minus one of these must equal a lemma minus one of these
const ENDINGS = ['ами', 'ями', 'ові', 'еві', 'єві', 'ого', 'ому', 'ими', 'іми', 'ьою', 'ові', 'ій', 'ої', 'ах', 'ях', 'ів', 'їв', 'ам', 'ям', 'ом', 'ем', 'єм', 'ою', 'ею', 'єю', 'ий', 'им', 'их', 'ім', 'іх', 'ей', 'ня', 'ню', 'ні', 'у', 'ю', 'а', 'я', 'і', 'ї', 'и', 'о', 'е', 'є', 'ь', 'й', ''];
const norm = w => w.toLowerCase().replace(/[’ʼ`]/g, "'");

const DICT = new Map(), STEMS = new Map();
for (const e of WORDS.split(/[|\n]/).map(x => x.trim()).filter(Boolean)) {
  const [uk, en] = e.split(' ');
  const entry = { lemma: uk, en: en.replace(/^[~!]/, ''), adj: en.startsWith('~') };
  if (!DICT.has(uk)) DICT.set(uk, entry);
  for (const end of ENDINGS) if (end && uk.endsWith(end) && uk.length - end.length >= 3) { const st = uk.slice(0, -end.length); if (!STEMS.has(st)) STEMS.set(st, entry); }
  if (!STEMS.has(uk)) STEMS.set(uk, entry);
  // fleeting vowel: рахунок → рахунку/рахунки, залишок → залишку, продавець → продавця, день → дня
  const fl = uk.match(/^(.+[^аеєиіїоуюя'])[оеє]([^аеєиіїоуюя'ь])ь?$/);
  if (fl && fl[1].length >= 2) { const st = fl[1] + fl[2]; if (!STEMS.has(st)) STEMS.set(st, entry); }
}
function lookup(word) {
  const w = norm(word);
  if (DICT.has(w)) return DICT.get(w);
  for (const end of ENDINGS) {
    if (!w.endsWith(end) || w.length - end.length < 3) continue;
    const st = end ? w.slice(0, -end.length) : w;
    if (STEMS.has(st)) return STEMS.get(st);
  }
  // і/о alternation in closed syllables: "рік/року", "вік/віку", "стіл/стола"
  const alt = w.replace(/о([^аеєиіїоуюя']+[аеєиіїоуюя]?)$/, 'і$1');
  return alt !== w ? lookup(alt) : null;
}
const PHRASE_LIST = PHRASES.split(/[|\n]/).map(x => x.trim()).filter(Boolean).map(x => {
  const [uk, en] = x.split('=');
  const words = norm(uk).split(/[\s-]+/);
  return { words, en, keys: words.map(w => lookup(w)?.lemma || w) };
}).sort((a, b) => b.words.length - a.words.length);

// same lemma (or same word) — used to match phrase words tolerant to case endings
const sameWord = (w, key) => { const n = norm(w); return n === key || lookup(n)?.lemma === key; };

// translit is passed in to avoid a circular import with autodef.js
export function translateName(raw, translit) {
  const words = norm(raw).replace(/[^a-zа-яіїєґ0-9'\s-]+/gi, ' ').split(/[\s]+/).map(x => x.replace(/^-+|-+$/g, '')).filter(Boolean);
  const toks = [], unknown = [];
  let flag = '';
  for (let i = 0; i < words.length;) {
    const ph = PHRASE_LIST.find(p => p.words.length > 0 && i + p.words.length <= words.length && p.keys.every((k, j) => sameWord(words[i + j], k) || norm(words[i + j]) === p.words[j]));
    if (ph) { toks.push({ en: ph.en, noun: true }); i += ph.words.length; continue; }
    const w = words[i++];
    if (i === 1 && FLAG[w]) { flag = FLAG[w]; continue; }
    if (PREP.has(w)) { toks.push({ prep: true }); continue; }
    if (/^[a-z0-9_]+$/i.test(w)) { toks.push({ en: w.toUpperCase(), noun: true }); continue; }
    // hyphenated words: try whole, then each part
    const hit = lookup(w);
    if (hit) { toks.push({ en: hit.en, noun: !hit.adj, adj: hit.adj }); continue; }
    if (w.includes('-')) {
      const parts = w.split('-'), ph2 = PHRASE_LIST.find(p => p.words.length === parts.length && p.keys.every((k, j) => sameWord(parts[j], k)));
      if (ph2) { toks.push({ en: ph2.en, noun: true }); continue; }
    }
    if (w.includes('-')) { w.split('-').forEach(p => { const h = lookup(p); if (h) toks.push({ en: h.en, noun: !h.adj, adj: h.adj }); else { unknown.push(p); toks.push({ en: translit(p).toUpperCase(), noun: true, unknown: true }); } }); continue; }
    unknown.push(w);
    toks.push({ en: translit(w).toUpperCase().replace(/'/g, ''), noun: true, unknown: true });
  }
  // head = leading adjectives + first noun; every later noun (with its adjectives) modifies it and goes in front
  const groups = [];
  let cur = [];
  for (const t of toks) {
    if (t.prep) { if (cur.length) { groups.push(cur); cur = []; } continue; }
    cur.push(t);
    if (t.noun) { groups.push(cur); cur = []; }
  }
  if (cur.length) groups.push(cur);
  const [head, ...mods] = groups;
  const parts = [...mods.reverse().flat(), ...(head || [])].map(t => t.en);
  let name = parts.join('_').replace(/_+/g, '_');
  if (flag) name = `${flag}_${name}`;
  return { name, unknown };
}
