import { titleScope } from './title-core.js';
import { getLayout } from './layout-index-core.js';
import { bool, choice, citation, documentType, id, list, object, PAGE_SIZES, positive, required, shape, text } from './schema-fields-core.js';

export { documentType, PAGE_SIZES, SIDES } from './schema-fields-core.js';

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

function ceilings(entries) {
  const caps = {};
  for (const { unit, maximum } of entries) caps[unit] = Math.min(caps[unit] ?? Infinity, maximum);
  return caps;
}

function lengthEntries(profile, treatment) {
  return (treatment.length_presets ?? []).map(id => ({ id, ...profile.validation.limits[id] }));
}

function morePermissive(profile, schema, declared, matching) {
  if (schema.requiredTreatmentFlags?.some(flag => matching[flag] && !declared[flag])) return true;
  if (matching.judicial_closing || matching.filer_signature && !declared.filer_signature ||
      matching.certificate && !declared.certificate) return true;
  const caps = ceilings(lengthEntries(profile, declared));
  const matchingEntries = lengthEntries(profile, matching);
  return Object.entries(ceilings(matchingEntries)).some(([unit, maximum]) => (caps[unit] ?? Infinity) > maximum) ||
    declared.length_mode === 'alternatives' && (matching.length_mode === 'all' || matchingEntries.length === 1);
}

export function titleChecks(profile, caption) {
  const { schema } = getLayout(profile.renderer_profile);
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
  const general = profile.fallback_document_type;
  const matching = Object.entries(profile.document_types).filter(([id, entry]) => id !== type && matchesTitle(entry, title));
  const looser = matching.filter(([, entry]) => morePermissive(profile, schema, treatment, entry)).map(([id]) => id);
  const offPattern = type !== general && !matchesTitle(treatment, title);
  const baseline = general && profile.document_types[general];
  const looserOffPattern = offPattern && (baseline ? morePermissive(profile, schema, treatment, baseline) :
    !treatment.filer_signature || !treatment.certificate || !treatment.length_presets?.length);
  if (looser.length || looserOffPattern) {
    const reason = looser.length ?
      'The declared type ' + type + ' has different or looser treatment than matching type(s) ' + looser.join(', ') + '.' :
      'The title is outside the usual wording for ' + type + ', which has looser filing treatment.';
    const stricterTypeMessage = looser.length && schema.stricterTypeMessage;
    const confirmed = !stricterTypeMessage && caption.type_confirmed?.title === title && caption.type_confirmed?.document_type === type;
    checks.push({
      label: 'Document type confirmation', status: confirmed ? 'advisory' : 'fail',
      detail: reason + (confirmed ? ' The person confirmed this exact title and type.' :
        stricterTypeMessage || ' Correct the declared type or obtain the person’s fresh confirmation and set caption.type_confirmed to the exact title and document_type.'),
    });
  } else if (type === general && matching.length) {
    advisory('General document type declared', 'The title also matches ' + matching.map(([id]) => id).join(', ') + '.');
  } else if (offPattern) {
    advisory('Declared type and title', 'The title does not match the usual wording for the declared type ' + type + '.');
  }
  return checks;
}

export function validateCaption(value, profile, at = 'caption', replay = false) {
  const { schema } = getLayout(profile.renderer_profile);
  schema.caption(value, at);
  const confirmed = value.type_confirmed;
  if (confirmed && (confirmed.title !== value.title || confirmed.document_type !== value.document_type)) {
    throw new Error(at + '.type_confirmed must match the exact title and document_type. Remove it and obtain fresh confirmation if needed.');
  }
  if (replay && confirmed) throw new Error('Replay requires a caption without type_confirmed. Remove it from the temporary copy.');
  const presentation = value.table_presentation;
  const minimum = profile.layout.body_font_size_pt;
  const authority = presentation?.smaller_font_authority;
  for (const style of [presentation?.default, ...Object.values(presentation?.tables ?? {})]) {
    const size = style?.font_size_pt;
    if (size < minimum && !(authority && size >= authority.minimum_font_size_pt)) {
      throw new Error(at + '.table_presentation.font_size_pt below the profile body size requires smaller_font_authority with the recorded rule or order and permitted minimum.');
    }
  }
  const treatment = documentType(profile, value);
  if (!treatment) throw new Error(at + '.document_type is not listed for this profile. Run profiles.');
  schema.validateCaptionTreatment(value, treatment, at);
  return value;
}

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

const documentTypes = extraFields => (value, at) => {
  object(value, at);
  const entry = shape({
    filer_signature: bool, certificate: bool, judicial_closing: bool, blank_case_number: bool,
    allow_blank_division: bool, filing_packet: (packet, field) => { if (packet !== null) text(packet, field); },
    length_presets: (value, at) => { if (value !== null) list(id)(value, at); },
    ...extraFields,
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

export function compileCourtPattern(pattern) {
  const { source } = new RegExp(pattern, 'i');
  return new RegExp('^(?:' + source + ')$', 'i');
}

const courtMatch = list((pattern, at) => {
  required(pattern, at, x => typeof x === 'string' && x.trim() !== '', 'a non-empty regular expression string');
  try {
    compileCourtPattern(pattern);
  } catch {
    throw new Error(at + ' must compile as a JavaScript regular expression.');
  }
}, 1);

const profileShape = schema => shape({
  jurisdiction_id: id,
  display_name: text,
  renderer_profile: getLayout,
  layout: schema.layout,
  caption_defaults: object,
  validation,
  rules: list(shape({ citation, verification: evidence, notes: text })),
  filing_packets: packets,
  document_types: documentTypes(schema.documentTypeFields),
}, {
  availability: choice('explicit-path'),
  court_match: courtMatch,
  fallback_document_type: id,
});

export function validateProfile(value) {
  object(value, 'profile');
  const { schema } = getLayout(value.renderer_profile);
  profileShape(schema)(value, 'profile');
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
  schema.validateProfileTreatment?.(value, lengthEntries);
  if (value.fallback_document_type) {
    const fallback = documentType(value, { document_type: value.fallback_document_type });
    const limits = fallback?.length_presets?.map(preset => value.validation.limits[preset]) ?? [];
    schema.validateFallback(fallback, limits);
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

function resolveOrderLimits(profile, treatment, { orderPages, orderWords, orderSource, all, alternatives }) {
  text(orderSource, '--order-source');
  if (orderPages !== undefined) positive(orderPages, '--order-max-pages');
  if (orderWords !== undefined) positive(orderWords, '--order-max-words');
  const entries = lengthEntries(profile, treatment);
  const profileCaps = ceilings(entries);
  // Under page/word alternatives an order replaces the pair. Otherwise a ceiling in a unit the order
  // does not name still applies, so a word-only order never removes a page-only type's page cap.
  const retained = all || !alternatives ? ceilings(entries.filter(limit => limit.verification !== 'verify')) : {};
  const pages = orderPages ?? retained.pages ?? null;
  const words = orderWords ?? retained.words ?? null;
  // A ceiling the order leaves in force must be a verified one; an unverified ceiling is never dropped silently.
  if (!alternatives && !all && (orderPages === undefined && profileCaps.pages !== undefined && pages === null ||
      orderWords === undefined && profileCaps.words !== undefined && words === null)) {
    throw new Error('The order leaves a profile ceiling in force that still requires verification. Verify that ceiling in the profile or supply it with the applicable order flag.');
  }
  if (all && (pages === null || words === null)) {
    throw new Error('This profile requires both ceilings. Verify any remaining unverified ceiling in the profile or supply it with the applicable order flags.');
  }
  const aboveProfile = {};
  if (orderPages > profileCaps.pages) aboveProfile.pages = profileCaps.pages;
  if (orderWords > profileCaps.words) aboveProfile.words = profileCaps.words;
  return {
    choice: 'order-maxima', pages, words, preset: null,
    order: { source: orderSource, pages: orderPages ?? null, words: orderWords ?? null, aboveProfile },
  };
}

export function resolveLimits(profile, caption, {
  preset, pages, words, noLimit = false, orderPages, orderWords, orderSource,
} = {}) {
  const treatment = documentType(profile, caption);
  const allowed = treatment.length_presets;
  const general = caption.document_type === profile.fallback_document_type;
  const alternatives = treatment.length_mode === 'alternatives';
  const all = treatment.length_mode === 'all' || general && allowed?.length === 2 && !alternatives;
  const explicit = pages !== undefined || words !== undefined;
  if (orderPages !== undefined || orderWords !== undefined) {
    if (preset !== undefined || explicit || noLimit) {
      throw new Error('Order flags cannot be combined with --limit, --max-pages, --max-words or --no-length-limit.');
    }
    return resolveOrderLimits(profile, treatment, { orderPages, orderWords, orderSource, all, alternatives });
  }
  if (orderSource !== undefined) throw new Error('--order-source requires --order-max-pages or --order-max-words.');
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
      throw new Error('This --limit requires verification. Verify the profile ceiling or use order flags for a governing case-specific maximum.');
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
  const entries = lengthEntries(profile, treatment);
  const profileCaps = ceilings(entries);
  if (pages > profileCaps.pages || words > profileCaps.words) {
    throw new Error('An explicit maximum cannot exceed its document type’s profile ceiling.');
  }
  const usable = entries.filter(limit => limit.verification !== 'verify');
  const caps = ceilings(usable);
  if (all) {
    if (!(pages ?? caps.pages) || !(words ?? caps.words)) {
      throw new Error('This profile requires both ceilings. Verify any missing profile ceilings or supply an applicable order ceiling.');
    }
    return { choice: explicit ? 'explicit-maxima' : preset ? 'profile-preset' : 'profile-all',
      pages: pages ?? caps.pages, words: words ?? caps.words, preset: preset ?? null };
  }
  if (explicit) {
    const maxima = { pages: pages ?? caps.pages ?? null, words: words ?? caps.words ?? null };
    if (Object.keys(profileCaps).some(unit => maxima[unit] === null)) {
      throw new Error('Verify each remaining profile ceiling or use order flags for a governing case-specific ceiling.');
    }
    return { choice: 'explicit-maxima', ...maxima, preset: null };
  }
  if (alternatives && caps.pages && caps.words) {
    return { choice: 'profile-alternatives', pages: caps.pages, words: caps.words, preset: null };
  }
  if (usable.length === 1 && (alternatives || entries.length === 1)) {
    return resolveLimits(profile, caption, { preset: usable[0].id });
  }
  throw new Error('Choose --limit, supply --max-pages and/or --max-words for tighter targets, or use the applicable order flags.');
}
