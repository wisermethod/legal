export const PAGE_SIZES = Object.freeze({
  Letter: [612, 792],
  Legal: [612, 1008],
  A4: [595.28, 841.89],
});

export const SIDES = Object.freeze(['top', 'right', 'bottom', 'left']);

function required(value, at, predicate, expectation) {
  if (!predicate(value)) throw new Error(at + ' must be ' + expectation + '.');
}

const isText = value => typeof value === 'string' && value.trim() !== '' && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value);
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
const isYear = value => Number.isInteger(value) && value >= 1000 && value <= 9999;
const party = shape({ role: text, name: text });
const signer = shape({ name: text }, { role: text, lines: list(text) });
const recipient = shape({ name: text, emails: list(email) });
const service = shape({ recipients: list(recipient, 1) }, {
  method: text, served_by: text, firm: text, firm_lines: list(text), firm_note: text,
});
const blankable = (value, at) => { if (value !== '') text(value, at); };
const captionShape = shape({
  court: text,
  parties: list(party, 1),
  case_number: blankable,
  division: blankable,
  title: text,
  document_type: id,
  court_address: text,
}, {
  signer, caption_counsel: bool, counsel_label: text, service, filing_packet: text,
  certificate_year: (value, at) => required(value, at, isYear, 'a four-digit year'),
});

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

export function documentType(profile, caption) {
  return Object.hasOwn(profile.document_types, caption.document_type) ? profile.document_types[caption.document_type] : null;
}

export function validateCaption(value, profile, at = 'caption') {
  captionShape(value, at);
  const treatment = documentType(profile, value);
  if (!treatment) throw new Error(at + '.document_type is not listed for this profile. Run profiles.');
  const titleMatches = treatment.exact_title !== undefined ? value.title === treatment.exact_title :
    new RegExp('^(?:' + treatment.title_pattern + ')$', 'iu').test(value.title);
  if (!titleMatches) throw new Error(at + '.title does not match the pattern for ' + value.document_type + '.');
  if ((value.filing_packet ?? null) !== treatment.filing_packet) {
    throw new Error(at + '.filing_packet must match the profile document type: ' + (treatment.filing_packet ?? 'omit it') + '.');
  }
  if ((value.case_number === '') !== treatment.blank_case_number) {
    throw new Error(at + '.case_number must be ' + (treatment.blank_case_number ? 'blank' : 'populated') + ' for this document type.');
  }
  if (value.division === '' && !treatment.allow_blank_division) throw new Error(at + '.division must be populated for this document type.');
  if (treatment.filer_signature) {
    if (!value.signer) throw new Error(at + '.signer is required.');
    if (value.caption_counsel !== false) counselLabel(value);
  } else if (value.signer || value.caption_counsel === true || value.counsel_label) {
    throw new Error(at + ' must omit filer and counsel blocks for this document type.');
  }
  if (Boolean(value.service) !== treatment.certificate) {
    throw new Error(at + '.service must be ' + (treatment.certificate ? 'supplied' : 'omitted') + ' for this document type.');
  }
  if (!treatment.certificate) return value;
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
    x => x === null || isYear(x), 'a four-digit year or null'),
  pdf_font_names: list(fontName, 1),
});

const evidence = choice('working-default', 'recorded-in-source', 'verify');
const spacingKinds = ['table', 'list', 'heading'];
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
}, { double_spacing: shape({ citation: text, verification: evidence }) });

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

const documentTypes = (value, at) => {
  object(value, at);
  const entry = shape({
    filer_signature: bool, certificate: bool, judicial_closing: bool, blank_case_number: bool,
    allow_blank_division: bool, filing_packet: (packet, field) => { if (packet !== null) text(packet, field); },
    length_presets: (value, at) => { if (value !== null) list(id)(value, at); },
  }, { exact_title: text, title_pattern: text, double_spacing: list(choice(...spacingKinds), 1) });
  for (const [key, treatment] of Object.entries(value)) {
    id(key, at + ' document type identifier');
    const path = at + '.' + key;
    entry(treatment, path);
    if (Boolean(treatment.exact_title) === Boolean(treatment.title_pattern)) {
      throw new Error(path + ' requires one of exact_title and title_pattern.');
    }
    if (treatment.title_pattern) new RegExp('^(?:' + treatment.title_pattern + ')$', 'iu');
    if (treatment.judicial_closing && (treatment.filer_signature || treatment.certificate) ||
        !treatment.judicial_closing && !treatment.filer_signature ||
        !treatment.certificate && !treatment.judicial_closing && !treatment.filing_packet && !treatment.exact_title) {
      throw new Error(path + ' has inconsistent filing blocks. An omission needs a judicial closing, listed packet or exact title.');
    }
    if (treatment.blank_case_number && !treatment.filing_packet) {
      throw new Error(path + ' needs a filing packet to leave the case number blank.');
    }
  }
};

const profileShape = shape({
  jurisdiction_id: id,
  display_name: text,
  renderer_profile: choice('colorado-two-column-boxed'),
  layout,
  caption_defaults: object,
  validation,
  rules: list(shape({ citation, verification: evidence, notes: text })),
  filing_packets: packets,
  document_types: documentTypes,
});

export function validateProfile(value) {
  profileShape(value, 'profile');
  for (const [key, treatment] of Object.entries(value.document_types)) {
    if (treatment.double_spacing && (!value.validation.double_spacing ||
        new Set(treatment.double_spacing).size !== treatment.double_spacing.length)) {
      throw new Error('profile.document_types.' + key + '.double_spacing needs a sourced validation.double_spacing rule and distinct categories.');
    }
    if (treatment.filing_packet !== null && !Object.hasOwn(value.filing_packets, treatment.filing_packet)) {
      throw new Error('profile.document_types.' + key + '.filing_packet must name a listed packet.');
    }
    for (const preset of treatment.length_presets ?? []) {
      if (!Object.hasOwn(value.validation.limits, preset)) {
        throw new Error('profile.document_types.' + key + ' refers to an unlisted length preset.');
      }
    }
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

export function resolveLimits(profile, caption, { preset, pages, words, noLimit = false } = {}) {
  const allowed = documentType(profile, caption).length_presets;
  if (noLimit) {
    if ([preset, pages, words].some(value => value !== undefined)) {
      throw new Error('--no-length-limit cannot be combined with a preset or explicit maxima.');
    }
    if (allowed !== null) throw new Error('--no-length-limit is not allowed for this profile document type.');
    return { choice: 'no-length-limit', pages: null, words: null, preset: null };
  }
  if (allowed === null) throw new Error('This profile document type requires --no-length-limit.');
  if (preset !== undefined) {
    if (pages !== undefined || words !== undefined) {
      throw new Error('--limit cannot be combined with --max-pages or --max-words.');
    }
    if (!allowed.includes(preset)) throw new Error('--limit is not listed for this profile document type. Run profiles.');
    const selected = profile.validation.limits[preset];
    if (selected.verification === 'verify') {
      throw new Error('This --limit requires verification. Use an explicit maximum after checking the applicable rule or order.');
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
    throw new Error('Choose --limit or supply --max-pages and/or --max-words.');
  }
  return { choice: 'explicit-maxima', pages: pages ?? null, words: words ?? null, preset: null };
}
