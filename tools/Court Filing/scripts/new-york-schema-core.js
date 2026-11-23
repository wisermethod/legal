import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { titleScope } from './title-core.js';
import { bool, choice, confirmation, email, id, layoutShape, list, required, shape, text } from './schema-fields-core.js';

const approved = JSON.parse(readFileSync(new URL('../profiles/new-york-supreme-court.json', import.meta.url), 'utf8'));
const counties = new Set(('Albany Allegany Bronx Broome Cattaraugus Cayuga Chautauqua Chemung Chenango Clinton Columbia ' +
  'Cortland Delaware Dutchess Erie Essex Franklin Fulton Genesee Greene Hamilton Herkimer Jefferson Kings Lewis Livingston ' +
  'Madison Monroe Montgomery Nassau Niagara Oneida Onondaga Ontario Orange Orleans Oswego Otsego Putnam Queens Rensselaer ' +
  'Richmond Rockland Saratoga Schenectady Schoharie Schuyler Seneca Steuben Suffolk Sullivan Tioga Tompkins Ulster Warren ' +
  'Washington Wayne Westchester Wyoming Yates').toLowerCase().split(' ').concat('new york', 'st. lawrence'));

const courtName = 'Supreme Court of the State of New York';
const courtPattern = /^(?:Supreme Court of the State of New York|New York State Supreme Court|Supreme Court, State of New York)(?:, *(?:County of ([A-Za-z .]+)|([A-Za-z .]+) County))?$/iu;
export function newYorkCourt(name) {
  const match = courtPattern.exec(name.trim());
  if (!match) return null;
  const county = (match[1] ?? match[2])?.trim().toLowerCase();
  return county && !counties.has(county) ? null : { county };
}

const countyName = (value, at) => required(value, at, name => typeof name === 'string' &&
  counties.has(name.trim().toLowerCase()), 'a New York county name without the word County');
const telephone = (value, at) => required(value, at, number => typeof number === 'string' &&
  /^[+0-9(). /-]+(?: *(?:x|ext\.?) *\d+)?$/iu.test(number) && number.replace(/\D/gu, '').length >= 7, 'a telephone number');
const contactFields = { name: text, address: list(text, 1), telephone };
const counsel = shape({ ...contactFields, represents: text }, { email });
const recipient = shape({ ...contactFields, party: text, appearance: choice('counsel', 'self-represented') }, { email });
const notice = shape({
  supporting_papers: list(text, 1),
  action_nature: text,
  oral_argument_requested: bool,
  seven_day_demand: bool,
}, { supporting_affiant: text });

const captionShape = shape({
  court: text, county: countyName, index_number: text, assigned_judge: text,
  title: text, document_type: id,
  parties: list(shape({ name: text, role: choice('Plaintiff', 'Defendant') }), 2),
  signer: counsel,
  motion: shape({
    posture: choice('principal-motion', 'opposition-with-cross-motion', 'principal-reply-on-cross-motion'),
    procedure: choice('ordinary', 'disclosure-or-bill-of-particulars'),
    source: text,
  }),
  service: shape({ method: choice('nyscef', 'separate-proof-required'), source: text, recipients: list(recipient, 1) }),
}, { notice, type_confirmed: confirmation });

export const noticeType = 'notice-of-motion';
export const replyType = 'reply-memorandum';
export const partyFor = (caption, name) => caption.parties.find(party => party.name === name);
export const courtLines = caption => [courtName.toUpperCase(), 'COUNTY OF ' + caption.county.trim().toUpperCase()];

const unprofiled = ' Use the sourced unprofiled route in Produce Court Filing or the court’s prescribed form.';
function validateCaptionTreatment(caption, _treatment, at) {
  const county = newYorkCourt(caption.court)?.county;
  if (county && county !== caption.county.trim().toLowerCase()) {
    throw new Error(at + '.county disagrees with the county in the court name.' + unprofiled);
  }
  required(caption.index_number, at + '.index_number', number => /^(?=.{1,36}$)(?=.*\d)[A-Za-z0-9]+(?:[/-][A-Za-z0-9]+)*$/u.test(number),
    'the assigned index number without a court name or label');
  required(caption.assigned_judge, at + '.assigned_judge', name => /\p{L}.* +.*\p{L}/u.test(name.trim()) &&
    !/^(?:not assigned|unassigned|none available|to be assigned|unknown|not applicable|tba)\b/iu.test(name.trim()),
    'the assigned judge’s name from the case record');

  const title = caption.title.trim().replace(/\s+/gu, ' ');
  const matches = Object.entries(approved.document_types).filter(([, entry]) => entry.exact_title === title ||
    entry.title_pattern && new RegExp('^(?:' + entry.title_pattern + ')$', 'iu').test(title));
  const joinedPaper = /(?:;|,? and | & )(?:(?:a|an|the) )?(?:affidavit|affirmation|declaration|notice|proposed order)\b/iu;
  const specialized = /\b(?:sur[- ]reply|order to show cause|ex parte|temporary restraining order|interim maintenance|child support|commercial division)\b/iu;
  if (matches.length !== 1 || matches[0][0] !== caption.document_type || titleScope(title) !== 'single' ||
      joinedPaper.test(title) || specialized.test(title)) {
    throw new Error(at + '.title and document_type must identify one supported New York motion paper.' + unprofiled);
  }
  const isNotice = caption.document_type === noticeType;
  if (isNotice !== Boolean(caption.notice)) {
    throw new Error(at + '.notice is required for a notice of motion and omitted for memoranda.');
  }
  const posture = caption.motion.posture;
  const isReply = caption.document_type === replyType;
  if (isNotice && posture !== 'principal-motion' ||
      isReply && posture === 'opposition-with-cross-motion' ||
      !isReply && posture === 'principal-reply-on-cross-motion' ||
      /\bcross[- ]motion\b/iu.test(title) && posture === 'principal-motion' ||
      isReply && /\b(?:further )?support of (?:the |\w+['’]s )?cross[- ]motion\b/iu.test(title)) {
    throw new Error(at + '.motion.posture must identify a supported CPLR 2214 or 2215 motion paper.' + unprofiled);
  }

  const firstDefendant = caption.parties.findIndex(party => party.role === 'Defendant');
  const names = caption.parties.map(party => party.name);
  if (firstDefendant < 1 || caption.parties.slice(firstDefendant).some(party => party.role !== 'Defendant') ||
      new Set(names.map(name => name.trim().toUpperCase())).size !== names.length ||
      names.some(name => /\bet +al\b/iu.test(name))) {
    throw new Error(at + '.parties must list distinct, full party names with the plaintiff side before the defendant side.');
  }
  const represented = partyFor(caption, caption.signer.represents);
  if (!represented || caption.signer.name === represented.name) {
    throw new Error(at + '.signer must identify filing counsel and the represented caption party.' + unprofiled);
  }
  const servedParties = caption.service.recipients.map(entry => entry.party);
  if (servedParties.length !== names.length - 1 ||
      new Set(servedParties).size !== servedParties.length ||
      !names.filter(name => name !== represented.name).every(name => servedParties.includes(name)) ||
      caption.service.recipients.some(entry => (entry.appearance === 'self-represented') !== (entry.name === entry.party))) {
    throw new Error(at + '.service.recipients must identify the counsel or self-represented recipient for each other caption party.');
  }
}

export const newYorkSchema = {
  caption: captionShape,
  layout: layoutShape(['{page}', '{pages}']),
  requiredTreatmentFlags: ['word_count_certificate'],
  documentTypeFields: { word_count_certificate: bool },
  validateCaptionTreatment,
  validateProfileTreatment(profile) {
    for (const field of ['jurisdiction_id', 'court_match', 'layout', 'document_types', 'validation', 'filing_packets']) {
      required(profile[field], 'profile.' + field, value => isDeepStrictEqual(value, approved[field]), 'the approved New York layout treatment');
    }
    required(profile.fallback_document_type, 'profile.fallback_document_type', value => value === undefined,
      'omitted for this closed set of New York motion papers');
  },
};
