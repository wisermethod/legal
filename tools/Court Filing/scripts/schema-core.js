import { titleScope } from './title-core.js';

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
const tablePresentation = shape({}, {
  default: tableStyle,
  tables: (value, at) => {
    object(value, at);
    for (const [key, style] of Object.entries(value)) {
      required(key, at + ' index', x => /^[1-9]\d*$/.test(x) && Number.isSafeInteger(Number(x)), 'a one-based table number');
      tableStyle(style, at + '.' + key);
    }
  },
});
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
  type_confirmed: bool, table_presentation: tablePresentation,
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

function matchesTitle(treatment, title) {
  if (treatment.exact_title !== undefined) return title === treatment.exact_title;
  return Boolean(treatment.title_pattern && new RegExp('^(?:' + treatment.title_pattern + ')$', 'iu').test(title.trim()));
}

export function suggestTypes(profile, title) {
  text(title, 'title');
  const matches = Object.entries(profile.document_types).filter(([, treatment]) => matchesTitle(treatment, title));
  matches.sort(([, a], [, b]) => Number(Boolean(b.exact_title)) - Number(Boolean(a.exact_title)));
  const suggestions = matches.map(([key]) => key);
  if (profile.fallback_document_type) suggestions.push(profile.fallback_document_type);
  return suggestions;
}

function morePermissive(profile, treatment) {
  if (!treatment.filer_signature || !treatment.certificate || !treatment.length_presets?.length) return true;
  const general = profile.document_types[profile.fallback_document_type];
  return treatment.length_presets.some(id => {
    const { unit, maximum } = profile.validation.limits[id];
    const baseline = general?.length_presets?.map(id => profile.validation.limits[id]).find(limit => limit.unit === unit);
    return baseline && maximum > baseline.maximum;
  });
}

export function titleChecks(profile, caption) {
  const { title, document_type: type } = caption;
  const treatment = documentType(profile, caption);
  const checks = [];
  const advisory = (label, detail) => checks.push({ label, status: 'advisory', detail });
  const scope = titleScope(title);
  if (scope !== 'single') {
    advisory('Possible second paper in title', scope === 'combined' ?
      'A joined phrase reads like a second paper. Check the intended paper or papers at preview.' :
      'A joined phrase starts with a paper name whose role is unclear. Check the intended paper or papers at preview.');
  }
  if (type === profile.fallback_document_type) {
    const specific = suggestTypes(profile, title).filter(id => id !== type);
    if (specific.length) advisory('General document type declared', 'The declared general type applies. The title also matches ' + specific.join(', ') + '.');
  } else if (!matchesTitle(treatment, title)) {
    const guarded = morePermissive(profile, treatment);
    if (guarded && !caption.type_confirmed) {
      checks.push({
        label: 'Document type confirmation', status: 'fail',
        detail: 'caption.title does not match the usual wording for ' + type +
          '. Choose the type the paper is, or set caption.type_confirmed: true after the person confirms this type for this exact title.',
      });
    } else {
      advisory('Declared type and title', caption.type_confirmed ?
        "type confirmed by the person; title does not match the type's usual wording" :
        'The title does not match the usual wording for the declared type ' + type + '.');
    }
  }
  return checks;
}

export function validateCaption(value, profile, at = 'caption') {
  captionShape(value, at);
  const treatment = documentType(profile, value);
  if (!treatment) throw new Error(at + '.document_type is not listed for this profile. Run profiles.');
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
  pdf_font_names: list(fontName, 1),
}, {
  certificate_year: (value, at) => required(value, at,
    x => x === null || isYear(x), 'a four-digit year or null'),
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
  }, { exact_title: text, title_pattern: text, double_spacing: list(choice(...spacingKinds), 1),
    length_mode: choice('alternatives', 'all') });
  for (const [key, treatment] of Object.entries(value)) {
    id(key, at + ' document type identifier');
    const path = at + '.' + key;
    entry(treatment, path);
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
}, {
  fallback_document_type: id,
});

export function validateProfile(value) {
  profileShape(value, 'profile');
  for (const [key, treatment] of Object.entries(value.document_types)) {
    if (key === value.fallback_document_type) {
      if (treatment.exact_title || treatment.title_pattern) {
        throw new Error('profile.fallback_document_type must have no title matcher.');
      }
    } else if (Boolean(treatment.exact_title) === Boolean(treatment.title_pattern)) {
      throw new Error('profile.document_types.' + key + ' requires one of exact_title and title_pattern.');
    }
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
    if (treatment.length_mode && (treatment.length_presets?.length !== 2 ||
        new Set(treatment.length_presets.map(id => value.validation.limits[id].unit)).size !== 2)) {
      throw new Error('profile.document_types.' + key + '.length_mode requires one page and one word preset.');
    }
  }
  if (value.fallback_document_type) {
    const fallback = documentType(value, { document_type: value.fallback_document_type });
    const ceilings = fallback?.length_presets?.map(preset => value.validation.limits[preset]);
    if (!fallback?.certificate || fallback.filing_packet || ceilings?.length !== 2 ||
        new Set(ceilings.map(limit => limit.unit)).size !== 2 || ceilings.some(limit => limit.verification === 'verify')) {
      throw new Error('profile.fallback_document_type must name a paper type with filer signature, certificate, and applicable page and word presets.');
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
  const treatment = documentType(profile, caption);
  const allowed = treatment.length_presets;
  const general = caption.document_type === profile.fallback_document_type;
  const alternatives = treatment.length_mode === 'alternatives';
  const all = treatment.length_mode === 'all' || general && !alternatives;
  const explicit = pages !== undefined || words !== undefined;
  if (noLimit) {
    if (preset !== undefined || explicit) {
      throw new Error('--no-length-limit cannot be combined with a preset or explicit maxima.');
    }
    if (allowed !== null) throw new Error('--no-length-limit is not allowed for this profile document type.');
  }
  if (allowed === null && !explicit && preset === undefined) {
    return { choice: 'no-length-limit', pages: null, words: null, preset: null };
  }
  if (preset !== undefined) {
    if (explicit) throw new Error('--limit cannot be combined with --max-pages or --max-words.');
    if (!allowed?.includes(preset)) throw new Error('--limit is not listed for this profile document type. Run profiles.');
    const selected = profile.validation.limits[preset];
    if (selected.verification === 'verify') {
      throw new Error('This --limit requires verification. Use an explicit maximum after checking the applicable rule or order.');
    }
    if (!all) {
      return {
        choice: 'profile-preset',
        pages: selected.unit === 'pages' ? selected.maximum : null,
        words: selected.unit === 'words' ? selected.maximum : null,
        preset,
      };
    }
  }
  if (pages !== undefined) positive(pages, '--max-pages');
  if (words !== undefined) positive(words, '--max-words');
  const entries = (allowed ?? []).map(id => ({ id, ...profile.validation.limits[id] }));
  const caps = Object.fromEntries(entries.filter(limit => limit.verification !== 'verify').map(limit => [limit.unit, limit.maximum]));
  if (general && (pages > caps.pages || words > caps.words)) {
    throw new Error('A general paper cannot exceed its profile page or word ceiling.');
  }
  if (all) {
    if (!(pages ?? caps.pages) || !(words ?? caps.words)) {
      throw new Error('This profile requires both ceilings. Supply explicit maxima for any unverified ceiling.');
    }
    return { choice: explicit ? 'explicit-maxima' : preset ? 'profile-preset' : 'profile-all',
      pages: pages ?? caps.pages, words: words ?? caps.words, preset: preset ?? null };
  }
  if (explicit) return { choice: 'explicit-maxima', pages: pages ?? null, words: words ?? null, preset: null };
  if (alternatives && caps.pages && caps.words) {
    return { choice: 'profile-alternatives', pages: caps.pages, words: caps.words, preset: null };
  }
  const usable = entries.filter(limit => limit.verification !== 'verify');
  if (usable.length === 1 && (alternatives || entries.length === 1)) {
    return resolveLimits(profile, caption, { preset: usable[0].id });
  }
  throw new Error('Choose --limit or supply --max-pages and/or --max-words.');
}
