import {
  bool, choice, confirmation, email, id, isText, layoutShape, list, party, required, shape, SIDES, tablePresentation, text,
} from './schema-fields-core.js';

export function federalCourtLines(name) {
  const match = /^(United States District Court)(?: for the |, +)((?:(?:Northern|Southern|Eastern|Western|Central|Middle) )?District of [\p{L}]+(?:[ -][\p{L}]+)*)$/iu.exec(name.trim());
  return match?.slice(1).map(line => line.toUpperCase());
}

const federalSigner = shape({
  name: text, address: list(text, 1), email,
  telephone: (value, at) => required(value, at, x => isText(x) && /^[+0-9(). /-]+(?: *(?:x|ext\.?) *\d+)?$/iu.test(x) &&
    x.replace(/\D/gu, '').length >= 7, 'a telephone number'),
}, { role: text });

const federalRecipient = shape({ name: text }, { counsel_for: text, emails: list(email, 1), address: list(text, 1) });
const otherService = shape({ method: text, recipients: list(federalRecipient, 1) }, { served_by: text });
const federalService = (value, at) => {
  if (value?.method === 'electronic-filing') {
    shape({ method: choice('electronic-filing') })(value, at);
    return;
  }
  otherService(value, at);
  value.recipients.forEach((recipient, i) => {
    const field = value.method.trim().toLowerCase() === 'email' ? 'emails' : 'address';
    required(recipient[field], at + '.recipients[' + i + '].' + field, Array.isArray, 'supplied for this method');
  });
};

const isDefense = role => /^(?:defendants?|respondents?)\b/iu.test(role.trim());
export const federalPartySplit = parties => parties.findIndex(party => isDefense(party.role));
const federalCaptionShape = shape({
  court: text, parties: list(party, 2), case_number: text, title: text, document_type: id,
  signer: federalSigner, service: federalService,
}, {
  dated_at: text, table_presentation: tablePresentation, type_confirmed: confirmation,
});

function validateCaptionTreatment(value, treatment, at) {
  const split = federalPartySplit(value.parties);
  if (split <= 0 || value.parties.slice(split).some(party => !isDefense(party.role))) {
    throw new Error(at + '.parties must give the plaintiff or petitioner side before the defendant or respondent side.');
  }
}

function validateProfileTreatment(profile, lengthEntries) {
  const { layout, validation, document_types: types } = profile;
  required(profile.court_match, 'profile.court_match', Boolean, 'supplied for the district');
  required(layout.body_font_size_pt, 'profile.layout.body_font_size_pt', size => size >= 12, 'at least 12 points');
  required(layout.body_line_height, 'profile.layout.body_line_height', height => height === 2, 'double spacing');
  for (const side of SIDES) {
    required(layout.margins_inches[side], 'profile.layout.margins_inches.' + side, margin => margin >= 1, 'at least one inch');
  }
  for (const [key, treatment] of Object.entries(types)) {
    const path = 'profile.document_types.' + key;
    required(treatment, path, entry => entry.filer_signature && entry.certificate && !entry.judicial_closing &&
      !entry.blank_case_number && entry.allow_blank_division && entry.filing_packet === null, 'a signed federal paper with service treatment and a case number');
    required(treatment.double_spacing, path + '.double_spacing', scope => scope?.length === 2 &&
      scope.includes('table') && scope.includes('list'), 'table and list spacing');
    const limits = lengthEntries(profile, treatment);
    required(treatment, path + '.length_presets', entry => !entry.length_mode && (entry.word_count_certificate ?
      limits.length === 1 && limits[0].unit === 'words' && limits[0].verification !== 'verify' :
      entry.length_presets === null), 'one applicable word preset for a word-count certificate, or null for an uncapped paper');
  }
  required(validation.double_spacing?.verification, 'profile.validation.double_spacing.verification',
    verification => verification === 'recorded-in-source', 'recorded-in-source');
}

export const federalSchema = {
  caption: federalCaptionShape,
  layout: layoutShape(['{page}'], {
    page_size_verification: choice('working-default'),
    caption_style_verification: choice('working-default'),
    heading_line_height: choice(1),
    table_line_height: choice(2),
  }),
  requiredTreatmentFlags: ['word_count_certificate'],
  documentTypeFields: { word_count_certificate: bool },
  validateCaptionTreatment,
  validateProfileTreatment,
  validateFallback(fallback) {
    if (!fallback) throw new Error('profile.fallback_document_type must name a listed federal paper type.');
  },
  stricterTypeMessage: ' Use the matching federal type with the required filing treatment.',
};
