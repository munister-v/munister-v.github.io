// Display-only typography. Never use this for URLs, slugs, code or source data.
export function formatText(value, language = 'en') {
  let text = String(value ?? '')
    .replace(/[ \u00a0]*—[ \u00a0]*/g, '\u00a0– ')
    .replace(/[ \u00a0]+–[ \u00a0]+/g, '\u00a0– ')
    .replace(/(\d) (?=(?:%|₴|€|px|mm|cm|km|км|см|мм|року|р\.)(?![\p{L}\p{N}]))/gu, '$1\u00a0');
  if (/^(uk|ua|ru)(?:-|$)/i.test(language)) {
    // A single pass deliberately avoids binding a whole sentence together.
    text = text.replace(/(^|[\s«“(])([ВвУуІіЙйЗзАаОоКкСс]|[Дд]о|[Нн]а|[Пп]о|[Зз]а|[Нн]е|[Тт]а|[Зз]і|[Вв]ід|[Дд]ля|[Бб]ез) (?=[\p{L}\p{N}«“])/gu, '$1$2\u00a0');
  }
  return text;
}

// Preserve markup byte-for-byte, including scripts, SQL, SVG and attributes.
export function formatHtml(html) {
  const language = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || 'en';
  const tokens = /<!--[\s\S]*?-->|<(script|style|pre|code|kbd|samp|textarea|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:(?:"[^"]*"|'[^']*')|[^'">])*>/gi;
  let result = '', cursor = 0, inBody = false;
  for (const match of html.matchAll(tokens)) {
    const text = html.slice(cursor, match.index);
    result += inBody ? formatText(text, language) : text;
    result += match[0];
    if (/^<body\b/i.test(match[0])) inBody = true;
    if (/^<\/body\b/i.test(match[0])) inBody = false;
    cursor = match.index + match[0].length;
  }
  const tail = html.slice(cursor);
  return result + (inBody ? formatText(tail, language) : tail);
}
