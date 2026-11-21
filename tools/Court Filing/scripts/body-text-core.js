const entities = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', Tab: ' ', NewLine: ' ',
  ndash: '\u2013', mdash: '\u2014', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  sect: '§', para: '¶', hellip: '…', copy: '©', reg: '®', trade: '™',
  cent: '¢', pound: '£', euro: '€', deg: '°', bull: '•', middot: '·',
};

function decodeEntities(text) {
  const decoded = text.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][a-z\d]*);/gi, (entity, key) => {
    if (key[0] === '#') {
      const point = /^#x/i.test(key) ? Number.parseInt(key.slice(2), 16) : Number(key.slice(1));
      if (point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)) {
        return String.fromCodePoint(point);
      }
    } else if (Object.hasOwn(entities, key)) {
      return entities[key];
    }
    throw new Error('Use the literal Unicode character instead of unsupported HTML entity ' + entity + ' in the body.');
  });
  if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(decoded.replace(/[\t\r\n]/g, ''))) {
    throw new Error('Markdown entities must produce visible filing text.');
  }
  return decoded;
}

export const normalize = text => text.replace(/\s+/gu, ' ').trim();
// Poppler expands these font ligatures. Keep every other printed character,
// including superscripts and literal bullets, distinct.
const ligatures = { ﬀ: 'ff', ﬁ: 'fi', ﬂ: 'fl', ﬃ: 'ffi', ﬄ: 'ffl' };
export const canonicalBody = text => text.normalize('NFC').replace(/[ﬀﬁﬂﬃﬄ]/gu, glyph => ligatures[glyph]).replace(/\s/gu, '');

export function judicialClosing(printed, ruled = false) {
  const ending = /(?:^|\s)BY *THE *COURT *:\s*(_{3,})? *([\p{L} .,'’-]{0,100}JUDGE\.?)$/iu.exec(normalize(printed));
  return Boolean(ending && (ruled ? ending[1] === undefined : ending[1]));
}

export function blockBindings(html, tag) {
  const pattern = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'g');
  return Array.from(html.matchAll(pattern), match => ({
    offset: canonicalBody(printedBodyText(html.slice(0, match.index))).length,
    length: canonicalBody(printedBodyText(match[1])).length,
  }));
}

export function tableHeaderBindings(html) {
  return Array.from(html.matchAll(/<table>\s*<thead>([\s\S]*?)<\/thead>[\s\S]*?<\/table>/g), match => ({
    offset: canonicalBody(printedBodyText(html.slice(0, match.index))).length,
    end: canonicalBody(printedBodyText(html.slice(0, match.index + match[0].length))).length,
    text: canonicalBody(printedBodyText(match[1])),
  })).filter(header => header.text);
}

export function printedBodyText(html, includeListNumbers = true) {
  const lists = [];
  const parts = [];
  for (const token of html.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (!token.startsWith('<')) {
      parts.push(decodeEntities(token));
    } else if (/^<ol\b/.test(token)) {
      lists.push(Number(/\bstart="(\d+)"/.exec(token)?.[1] ?? 1));
    } else if (/^<ul\b/.test(token)) {
      lists.push(null);
    } else if (/^<\/(?:ol|ul)>/.test(token)) {
      lists.pop();
      parts.push(' ');
    } else if (token === '<li>' && includeListNumbers && lists.at(-1) != null) {
      parts.push(' ' + lists[lists.length - 1]++ + '. ');
    } else if (/^<\/?(?:p|li|blockquote|h[1-6]|pre|br|hr|table|thead|tbody|tr|td|th)\b/i.test(token)) {
      parts.push(' ');
    }
  }
  return parts.join('');
}

export function wordCount(text) {
  return normalize(text).match(/\S+/gu)?.length ?? 0;
}


export function bodyMarks(html, ruledClosing) {
  const marks = [];
  const lists = [];
  for (const match of html.matchAll(/<(\/?)(ul|ol|li|hr)\b[^>]*>/gu)) {
    const [, closing, tag] = match;
    if (tag === 'ul' || tag === 'ol') {
      if (closing) lists.pop();
      else lists.push(tag);
    } else if (!closing && (tag === 'hr' || lists.at(-1) === 'ul')) {
      marks.push({ kind: tag === 'hr' ? 'rule' : 'bullet',
        offset: canonicalBody(printedBodyText(html.slice(0, match.index))).length });
    }
  }
  if (ruledClosing) marks.splice(marks.findLastIndex(mark => mark.kind === 'rule'), 1);
  return marks;
}
