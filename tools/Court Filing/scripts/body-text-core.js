const entities = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', Tab: ' ', NewLine: ' ',
  ndash: '\u2013', mdash: '\u2014', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  sect: '§', para: '¶', hellip: '…', copy: '©', reg: '®', trade: '™',
  cent: '¢', pound: '£', euro: '€', deg: '°', bull: '•', middot: '·',
};

function decodeEntities(text) {
  return text.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][a-z\d]*);/gi, (entity, key) => {
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
}

export const normalize = text => text.replace(/\s+/gu, ' ').trim();
export const canonicalBody = text => text.normalize('NFKC').replace(/[\s\u00ad\u200b\ufeff\u2022\u25e6\u25aa]+/gu, '');

export function judicialClosing(printed) {
  return /BYTHECOURT:[^:]{0,100}JUDGE[.]?$/iu.test(canonicalBody(printed));
}

export function tableHeaderBindings(html, digest) {
  return Array.from(html.matchAll(/<thead>([\s\S]*?)<\/thead>/g), match => {
    const header = canonicalBody(printedBodyText(match[1]));
    if (!header) return null;
    const offset = canonicalBody(printedBodyText(html.slice(0, match.index))).length;
    return [offset, header.length, digest(header)].join(':');
  }).filter(Boolean);
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
