import {
  bool, confirmation, email, id, layoutShape, list, party, required, shape, tablePresentation, text,
} from './schema-fields-core.js';

const isYear = value => Number.isInteger(value) && value >= 1000 && value <= 9999;
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
  type_confirmed: (value, at) => {
    if (typeof value === 'boolean') {
      throw new Error(at + ' no longer accepts a boolean. Remove it and obtain fresh confirmation, then set { "title": "<exact title>", "document_type": "<exact type>" }.');
    }
    confirmation(value, at);
  },
  table_presentation: tablePresentation,
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

function validateCaptionTreatment(value, treatment, at) {
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

function validateFallback(fallback, limits) {
  if (!fallback?.certificate || fallback.filing_packet || !limits.some(limit => limit.unit === 'pages') ||
      limits.length > 2 || new Set(limits.map(limit => limit.unit)).size !== limits.length ||
      limits.some(limit => limit.verification === 'verify')) {
    throw new Error('profile.fallback_document_type must name a paper type with filer signature, certificate, an applicable page preset and at most one applicable word preset.');
  }
}

export const coloradoSchema = {
  caption: captionShape,
  layout: layoutShape(['{page}', '{pages}'], {}, {
    certificate_year: (value, at) => required(value, at,
      x => x === null || isYear(x), 'a four-digit year or null'),
  }),
  validateCaptionTreatment,
  validateFallback,
};
