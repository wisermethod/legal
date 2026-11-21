export const PAGE_SIZES = Object.freeze({
  Letter: [612, 792],
  Legal: [612, 1008],
  A4: [595.28, 841.89],
});

export const SIDES = Object.freeze(['top', 'right', 'bottom', 'left']);

function required(value, at, predicate, expectation) {
  if (!predicate(value)) throw new Error(at + ' must be ' + expectation + '.');
}

const isText = value => typeof value === 'string' && value.trim() !== '' && !/[\u0000-\u001f\u007f]/u.test(value);
const text = (value, at) => required(value, at, isText, 'non-blank single-line text');
const bool = (value, at) => required(value, at, x => typeof x === 'boolean', 'a boolean');
const positive = (value, at) => required(value, at, x => Number.isSafeInteger(x) && x > 0, 'a positive integer');
const id = (value, at) => required(value, at, x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x), 'a lowercase hyphenated identifier');
const citation = (value, at) => {
  if (value !== null) text(value, at);
};

function choice(...choices) {
  return (value, at) => required(value, at, x => choices.includes(x), 'one of ' + choices.join(', '));
}

function number(min, max) {
  return (value, at) => required(value, at, x => Number.isFinite(x) && x >= min && x <= max, 'a number from ' + min + ' through ' + max);
}

function object(value, at) {
  required(value, at, x => x !== null && typeof x === 'object' && !Array.isArray(x), 'an object');
}

function shape(fields, optional = {}) {
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

function list(item, minimum = 0) {
  return (value, at) => {
    required(value, at, x => Array.isArray(x) && x.length >= minimum,
      minimum ? 'a non-empty array' : 'an array');
    value.forEach((entry, index) => item(entry, at + '[' + index + ']'));
  };
}

const email = (value, at) => required(value, at, x => typeof x === 'string' && /^[^\s@;()<>,]+@[^\s@;()<>,]+$/u.test(x), 'an email address');
const party = shape({ role: text, name: text });
const signer = shape({ name: text }, { role: text, lines: list(text) });
const recipient = shape({ name: text, emails: list(email) });
const service = shape({ recipients: list(recipient, 1) }, {
  method: text, served_by: text, firm: text, firm_lines: list(text), firm_note: text,
});
const captionShape = shape({
  court: text,
  parties: list(party, 1),
  case_number: (value, at) => { if (value !== '') text(value, at); },
  division: text,
  title: text,
  signer,
}, { court_address: text, caption_counsel: bool, counsel_label: text, service, no_service_certificate: id, filing_packet: text });

export function counselLabel(caption) {
  const role = caption.signer.role?.trim() ?? '';
  const side = /^(?:(pro se) )?(plaintiff|defendant|petitioner|respondent)$/i.exec(role);
  let inferred;
  if (side) {
    const party = side[2][0].toUpperCase() + side[2].slice(1).toLowerCase();
    inferred = (side[1] ? 'Pro Se ' : '') + party + ':';
  } else {
    const counsel = /^(?:attorney|counsel) for (.+)$/i.exec(role);
    if (counsel && caption.parties.some(party => party.name.toLowerCase() === counsel[1].toLowerCase())) {
      inferred = 'Counsel for ' + counsel[1] + ':';
    }
  }
  if (inferred) {
    if (caption.counsel_label && caption.counsel_label.trim() !== inferred) {
      throw new Error('caption.counsel_label conflicts with the signer role. Use ' + inferred + ' or omit counsel_label.');
    }
    return inferred;
  }
  if (caption.counsel_label) return caption.counsel_label;
  throw new Error('caption.counsel_label is required when the signer role does not identify one side or a named party.');
}

export function validateCaption(value, profile, at = 'caption') {
  captionShape(value, at);
  if (value.filing_packet !== undefined && !Object.hasOwn(profile?.filing_packets ?? {}, value.filing_packet)) {
    throw new Error(at + '.filing_packet is not listed for this profile. Run profiles.');
  }
  const newCase = value.filing_packet !== undefined && value.filing_packet === profile?.new_case_packet;
  if (newCase && !/\bcomplaint\b/i.test(value.title)) {
    throw new Error(at + '.title must identify the complaint for the new-case packet.');
  }
  if ((value.case_number === '') !== newCase) {
    throw new Error(at + '.case_number must be blank for the new-case packet and populated for every other filing.');
  }
  if (at === 'caption') counselLabel(value);
  if (Object.hasOwn(value, 'service') === Object.hasOwn(value, 'no_service_certificate')) {
    throw new Error(at + ' must supply exactly one of service and no_service_certificate.');
  }
  if (Object.hasOwn(value, 'no_service_certificate')) {
    if (!Object.hasOwn(profile?.no_service_certificate_reasons ?? {}, value.no_service_certificate)) {
      throw new Error(at + '.no_service_certificate is not listed for this profile. Run profiles.');
    }
    const allowed = profile.no_service_certificate_reasons[value.no_service_certificate];
    if (value.title !== allowed.title) throw new Error(at + '.no_service_certificate is not allowed for this title.');
    return value;
  }
  if (value.service.method === undefined || value.service.method.toLowerCase().trim() === 'email') {
    value.service.recipients.forEach((entry, index) =>
      list(email, 1)(entry.emails, at + '.service.recipients[' + index + '].emails'));
  }
  return value;
}

const fontName = (value, at) =>
  required(value, at, x => isText(x) && /^[a-z0-9][a-z0-9 ._-]*$/i.test(x), 'a plain font family or PostScript name');
const footer = shape({
  format: (value, at) => required(value, at, x => isText(x) && x.length <= 160 &&
    (x.match(/\{page\}/g) || []).length === 1 && (x.match(/\{pages\}/g) || []).length === 1 &&
    !/[{}<>]/u.test(x.replace('{page}', '').replace('{pages}', '')),
  'plain text of at most 160 characters containing {page} and {pages} exactly once'),
  font: choice('Times New Roman'),
  size_pt: number(1, 72),
  position: choice('left', 'center', 'right'),
});

const layout = shape({
  page_size: choice(...Object.keys(PAGE_SIZES)),
  margins_inches: shape(Object.fromEntries(SIDES.map(side => [side, number(0.1, 10)]))),
  body_font: fontName,
  body_font_size_pt: number(1, 72),
  body_line_height: number(1, 5),
  footer,
  caption_style: text,
  certificate_year: (value, at) => required(value, at,
    x => x === null || (Number.isInteger(x) && x >= 1000 && x <= 9999), 'a four-digit year or null'),
  pdf_font_names: list(fontName, 1),
});

const evidence = choice('recorded-in-source', 'verify');
const limit = shape({ unit: choice('pages', 'words'), maximum: positive, citation, verification: evidence });
const validation = shape({
  limits: (value, at) => {
    object(value, at);
    for (const [key, entry] of Object.entries(value)) {
      id(key, at + ' limit identifier');
      limit(entry, at + '.' + key);
    }
  },
  exclusions: list(text),
  notes: list(text),
});

const packets = (value, at) => {
  object(value, at);
  const item = shape({ item: text, method: text, notes: text, citation, verification: evidence });
  const step = shape({ step: text, citation, notes: text, verification: evidence });
  const packet = shape({
    description: text,
    required_at_filing: list(item, 1),
    post_filing_steps: list(step),
    notes: list(text),
  });
  for (const [key, entry] of Object.entries(value)) {
    required(key, at + ' packet identifier', x => /^[a-z][a-z0-9_]*$/.test(x), 'a lowercase underscored identifier');
    packet(entry, at + '.' + key);
  }
};

function noServiceCertificateReasons(value, at) {
  object(value, at);
  for (const [key, reason] of Object.entries(value)) {
    id(key, at + ' reason identifier');
    shape({ description: text, title: text })(reason, at + '.' + key);
  }
}

const profileShape = shape({
  jurisdiction_id: id,
  display_name: text,
  renderer_profile: choice('colorado-two-column-boxed'),
  layout,
  caption_defaults: object,
  validation,
  rules: list(shape({ citation, verification: evidence, notes: text })),
  filing_packets: packets,
}, { no_service_certificate_reasons: noServiceCertificateReasons, new_case_packet: text });

export function validateProfile(value) {
  profileShape(value, 'profile');
  if (value.new_case_packet !== undefined && !Object.hasOwn(value.filing_packets, value.new_case_packet)) {
    throw new Error('profile.new_case_packet must name a listed filing packet.');
  }
  validateCaption(value.caption_defaults, value, 'profile.caption_defaults');
  const { page_size, margins_inches: margins, footer } = value.layout;
  const [width, height] = PAGE_SIZES[page_size];
  if ((margins.left + margins.right) * 72 >= width || (margins.top + margins.bottom) * 72 >= height) {
    throw new Error('profile.layout.margins_inches must leave a printable page area.');
  }
  if (margins.bottom * 72 < footer.size_pt * 1.2 + 18) {
    throw new Error('profile.layout.margins_inches.bottom must leave room for the page-number footer.');
  }
  return value;
}

export function resolveLimits(profile, preset, pages, words, noLimit) {
  if (noLimit !== undefined) {
    if ([preset, pages, words].some(value => value !== undefined)) {
      throw new Error('--no-length-limit cannot be combined with a preset or explicit maxima.');
    }
    text(noLimit, '--no-length-limit reason');
    return { choice: 'no-length-limit', pages: null, words: null, preset: null, reason: noLimit };
  }
  if (preset !== undefined) {
    if (pages !== undefined || words !== undefined) {
      throw new Error('--limit cannot be combined with --max-pages or --max-words.');
    }
    const selected = Object.hasOwn(profile.validation.limits, preset) && profile.validation.limits[preset];
    if (!selected) throw new Error('--limit ' + preset + ' is not listed for this profile. Run profiles.');
    if (selected.verification === 'verify') {
      throw new Error('--limit ' + preset + ' requires verification. Use an explicit maximum after checking the applicable rule or order.');
    }
    return {
      choice: 'profile-preset',
      pages: selected.unit === 'pages' ? selected.maximum : null,
      words: selected.unit === 'words' ? selected.maximum : null,
      preset,
    };
  }
  if (pages !== undefined) positive(pages, '--max-pages');
  if (words !== undefined) positive(words, '--max-words');
  if (pages === undefined && words === undefined) {
    throw new Error('Choose --limit, --max-pages and/or --max-words, or --no-length-limit with the reason.');
  }
  return { choice: 'explicit-maxima', pages: pages ?? null, words: words ?? null, preset: null };
}
