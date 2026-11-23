export const PAGE_SIZES = Object.freeze({
  Letter: [612, 792],
  Legal: [612, 1008],
  A4: [595.28, 841.89],
});

export const SIDES = Object.freeze(['top', 'right', 'bottom', 'left']);

export function required(value, at, predicate, expectation) {
  if (!predicate(value)) throw new Error(at + ' must be ' + expectation + '.');
}

export const isText = value => typeof value === 'string' && value.trim() !== '' && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value);
export const text = (value, at) => required(value, at, isText, 'non-blank single-line text');
export const bool = (value, at) => required(value, at, x => typeof x === 'boolean', 'a boolean');
export const positive = (value, at) => required(value, at, x => Number.isSafeInteger(x) && x > 0, 'a positive integer');
export const id = (value, at) => required(value, at, x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x), 'a lowercase hyphenated identifier');
export const citation = (value, at) => {
  if (value !== null) text(value, at);
};

export function choice(...choices) {
  return (value, at) => required(value, at, x => choices.includes(x), 'one of ' + choices.join(', '));
}

export function number(min, max) {
  return (value, at) => required(value, at, x => Number.isFinite(x) && x >= min && x <= max, 'a number from ' + min + ' through ' + max);
}

export function object(value, at) {
  required(value, at, x => x !== null && typeof x === 'object' && !Array.isArray(x), 'an object');
}

export function shape(fields, optional = {}) {
  return (value, at) => {
    object(value, at);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(fields, key) && !Object.hasOwn(optional, key)) {
        throw new Error(at + '.' + key + ' is not a recognized field.');
      }
    }
    for (const [key, validate] of Object.entries(fields)) {
      const field = at + '.' + key;
      if (!Object.hasOwn(value, key)) throw new Error(field + ' is required.');
      validate(value[key], field);
    }
    for (const [key, validate] of Object.entries(optional)) {
      if (Object.hasOwn(value, key)) validate(value[key], at + '.' + key);
    }
  };
}

export function list(item, minimum = 0) {
  return (value, at) => {
    required(value, at, x => Array.isArray(x) && x.length >= minimum,
      minimum ? 'a non-empty array' : 'an array');
    value.forEach((entry, index) => item(entry, at + '[' + index + ']'));
  };
}

export const email = (value, at) => required(value, at, x => typeof x === 'string' && /^[^\s@;()<>,]+@[^\s@;()<>,]+$/u.test(x), 'an email address');
export const party = shape({ role: text, name: text });
const alignment = choice('left', 'center', 'right');
const padding = (value, at) => {
  if (!Array.isArray(value)) return number(0, 12)(value, at);
  required(value, at, x => x.length === 4, 'four numbers for top, right, bottom and left');
  list(number(0, 12))(value, at);
};
const nullable = check => (value, at) => { if (value !== null) check(value, at); };
const tableStyle = shape({}, {
  column_widths_percent: list(nullable(number(1, 100)), 1),
  column_alignment: list(nullable(alignment), 1),
  header_alignment: (value, at) => Array.isArray(value) ? list(nullable(alignment), 1)(value, at) : alignment(value, at),
  nowrap_columns: list(positive),
  cell_padding_pt: padding,
  body_cell_padding_pt: padding,
  font_size_pt: number(8, 16),
  vertical_alignment: choice('top', 'middle', 'bottom', 'baseline'),
});
export const tablePresentation = shape({}, {
  default: tableStyle,
  smaller_font_authority: shape({ source: text, minimum_font_size_pt: number(8, 16) }),
  tables: (value, at) => {
    object(value, at);
    for (const [key, style] of Object.entries(value)) {
      required(key, at + ' index', x => /^[1-9]\d*$/.test(x) && Number.isSafeInteger(Number(x)), 'a one-based table number');
      tableStyle(style, at + '.' + key);
    }
  },
});
export const confirmation = shape({ title: text, document_type: id });

const fontName = (value, at) =>
  required(value, at, x => isText(x) && /^[a-z0-9][a-z0-9 ._-]*$/i.test(x), 'a plain font family or PostScript name');
function footer(tokens) {
  return shape({
    format: (value, at) => required(value, at, x => isText(x) && x.length <= 160 &&
      tokens.every(token => x.split(token).length === 2) &&
      !/[{}<>]/u.test(tokens.reduce((text, token) => text.replace(token, ''), x)),
    'plain text of at most 160 characters containing ' + tokens.join(' and ') + ' exactly once'),
    font: choice('Times New Roman'),
    size_pt: number(1, 72),
    position: choice('left', 'center', 'right'),
  });
}

export function layoutShape(footerTokens, fields = {}, optional = {}) {
  return shape({
    page_size: choice(...Object.keys(PAGE_SIZES)),
    margins_inches: shape(Object.fromEntries(SIDES.map(side => [side, number(0.1, 10)]))),
    body_font: fontName,
    body_font_size_pt: number(1, 72),
    body_line_height: number(1, 5),
    footer: footer(footerTokens),
    caption_style: text,
    pdf_font_names: list(fontName, 1),
    ...fields,
  }, optional);
}

export function documentType(profile, caption) {
  return Object.hasOwn(profile.document_types, caption.document_type) ? profile.document_types[caption.document_type] : null;
}
