// A small, dependency-free outline icon system for Schemata.
// Domain blocks intentionally reuse a restrained set of metaphors instead of emoji.
const paths = {
  person: '<circle cx="12" cy="7" r="3"/><path d="M5.5 19c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.3-6 5.5-6s5 2 5.5 6M15 5.5a3 3 0 0 1 0 5.5M16 13c2.5.5 3.9 2.5 4.2 5"/>',
  package: '<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
  cart: '<path d="M3 4h2l2 10h10l2-7H6"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>',
  building: '<path d="M4 21V6l8-3 8 3v15M8 8h2M14 8h2M8 12h2M14 12h2M9 21v-5h6v5"/>',
  book: '<path d="M4 4.5A3.5 3.5 0 0 1 7.5 4H12v16H7.5A3.5 3.5 0 0 0 4 20V4.5ZM20 4.5A3.5 3.5 0 0 0 16.5 4H12v16h4.5A3.5 3.5 0 0 1 20 20V4.5Z"/>',
  health: '<path d="M12 21s-7-4.4-7-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 4.5C19 16.6 12 21 12 21Z"/><path d="M9 11h6M12 8v6"/>',
  warehouse: '<path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M7 21v-7h10v7M7 10h2M11 10h2M15 10h2"/>',
  document: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="m11 9 8-6M16 6l2 2M14 8l2 2"/>',
  type: '<path d="M5 5h14M12 5v14M8 19h8"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.8-.8-1.8-1.2-3-1.2-1.7 0-3 1-3 2.4 0 3.7 6 1.4 6 5 0 1.4-1.3 2.4-3 2.4-1.3 0-2.5-.5-3.3-1.4M12 5v14"/>',
  measure: '<path d="M4 17 17 4l3 3L7 20l-3-3Z"/><path d="m12 9 3 3M9 12l2 2M15 6l2 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  relation: '<circle cx="6" cy="17" r="2"/><circle cx="18" cy="7" r="2"/><path d="m8 15 8-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20ZM14.5 6.5l3 3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  code: '<path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 4l-2 16"/>',
  bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
  trash: '<path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrowUp: '<path d="m6 10 6-6 6 6M12 4v16"/>',
  arrowDown: '<path d="m6 14 6 6 6-6M12 20V4"/>',
  view: '<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  file: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5"/>',
  printer: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
};

export const uiIcon = (name, cls = '') => `<svg class="ui-icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.database}</svg>`;

const entityIcons = {
  people: 'person', shop: 'package', finance: 'card', org: 'building', edu: 'book',
  med: 'health', stock: 'warehouse', content: 'document', system: 'shield',
};
const attrIcons = {
  keys: 'key', basic: 'type', person: 'person', place: 'map', money: 'money',
  measure: 'measure', time: 'calendar', service: 'database',
};

export function blockIcon(kind, groupId, itemId) {
  if (kind === 'rel') return uiIcon('relation');
  const name = kind === 'entity' ? entityIcons[groupId] : attrIcons[groupId];
  return uiIcon(name || (itemId?.includes('date') ? 'calendar' : 'database'));
}

export function templateIcon(id) {
  return uiIcon({ shop: 'cart', crm: 'users', university: 'book', clinic: 'health', warehouse: 'warehouse', blog: 'document' }[id] || 'database');
}

export function menuIcon(value) {
  if (!value) return '';
  if (value.startsWith('<')) return value;
  const name = value.includes('🗑') || value === '⌫' ? 'trash'
    : value.includes('⚡') ? 'bolt'
    : value.includes('✎') ? 'edit'
    : value.includes('⧉') || value.includes('⎘') ? 'copy'
    : value.includes('⌨') || value === '{}' ? 'code'
    : value.includes('📄') ? 'file'
    : value.includes('⎙') ? 'printer'
    : value.includes('✓') ? 'check'
    : value.includes('↑') || value.includes('⤒') ? 'arrowUp'
    : value.includes('↓') || value.includes('⤓') ? 'arrowDown'
    : value.includes('⟜') || value.includes('⊸') || value.includes('⊷') || value.includes('⋈') ? 'relation'
    : value === 'V' ? 'view'
    : value === 'S' ? 'database'
    : value.includes('＋') || value === '+' ? 'plus'
    : value.includes('▦') || value.includes('⊞') || value.includes('▣') || value.includes('◇') ? 'grid'
    : 'database';
  return uiIcon(name);
}
