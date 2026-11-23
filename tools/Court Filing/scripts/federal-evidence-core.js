import { normalize, wordCount } from './body-text-core.js';
import {
  actionLabel, against, colonWidth, complianceHeading, complianceStatement, contacts, partyName, partyRole,
  partyWidth, serviceHeading, serviceStatement, signerName, submitted,
} from './federal-compose-core.js';
import { federalCourtLines, federalPartySplit } from './federal-schema-core.js';
import { near, parseRaster, PIXELS_PER_POINT } from './pdf-evidence-core.js';
import { centeredLines, isSignatureLine, matchLines, validFilerDate } from './text-evidence-core.js';

const midpoint = (start, end) => (start + end) / 2;
const lineText = line => line.words.map(word => word.text).join(' ');
const ruledLabel = 'Dashed caption rules';
const boxLabel = 'Colorado caption box absent';
export const federalRulingChecks = [
  [ruledLabel, 'Two visible dashed horizontal rules ending in x on the first page.'],
  [boxLabel, 'No solid rectangular caption box on the first page.'],
];

function positionedCaption(page, layout) {
  if (!page) return {};
  const left = layout.margins_inches.left * 72;
  const right = page.bounds.right - layout.margins_inches.right * 72;
  const split = left + (right - left) * partyWidth;
  const numberStart = split + (right - left) * colonWidth;
  const lines = page.lines.filter(line => line.words.length).sort((a, b) => a.bounds.y - b.bounds.y);
  const court = lines.slice(0, 2);
  const courtBottom = court[1]?.bounds.bottom;
  const marks = lines.flatMap(line => line.words).filter(({ text, bounds }) => text === 'x' &&
    near(midpoint(bounds.x, bounds.right), split, 4) && bounds.y < page.bounds.bottom - 72)
    .sort((a, b) => a.bounds.y - b.bounds.y);
  const topGap = marks[0]?.bounds.y - courtBottom;
  const [top, bottom] = marks.length >= 2 && topGap >= -2 && topGap <= 12 + layout.body_font_size_pt ? marks : [];
  const between = top && lines.filter(({ bounds }) => bounds.y >= top.bounds.y - 1 && bounds.y <= bottom.bounds.bottom);
  const parties = between?.map(line => line.words.filter(({ bounds }) => bounds.right <= split - 2)
    .map(({ text }) => text).join(' ')).filter(Boolean) ?? [];
  const colons = between?.flatMap(line => line.words).filter(({ bounds, text }) =>
    text === ':' && near(midpoint(bounds.x, bounds.right), split, 4)) ?? [];
  const number = between?.map(line => line.words.filter(({ bounds }) => bounds.x >= numberStart - 1.5)
    .map(({ text }) => text).join(' ')).filter(Boolean).join(' ');
  const centered = ({ bounds }) => near(midpoint(bounds.x, bounds.right), midpoint(left, right), 2);
  const title = bottom ? centeredLines(lines.filter(({ bounds }) => bounds.y > bottom.bounds.y + layout.body_font_size_pt),
    centered, layout.body_font_size_pt * 1.5) : [];
  return { left, right, split, top, bottom, parties, colons, number, court,
    courtCentered: court.length === 2 && court.every(centered) &&
      near(court[0].bounds.y, layout.margins_inches.top * 72, 3) &&
      near(court[1].bounds.y - court[0].bounds.y, layout.body_font_size_pt * 1.2, 1),
    title, titleText: title.map(lineText).join(' ') };
}

export function federalCaptionText({ first, caption, profile, check, positioned, extracted }) {
  const { court, courtCentered, parties, colons, number, titleText } = positionedCaption(positioned, profile.layout);
  const courtLines = federalCourtLines(caption.court);
  check('Court name in caption', courtCentered && court.every((line, index) => lineText(line) === normalize(courtLines[index])),
    courtLines.join(' / '));
  const split = federalPartySplit(caption.parties);
  let cursor = 0;
  for (const [index, party] of caption.parties.entries()) {
    if (index === split) cursor = matchLines(parties ?? [], cursor, against);
    cursor = matchLines(parties ?? [], cursor, partyName(party));
    cursor = matchLines(parties ?? [], cursor, partyRole(party, index >= split));
  }
  check('Parties in caption order', cursor > 0 && cursor === parties.length, 'Party names and roles in the supplied order with -against-.');
  check('Caption colon column', colons?.length === caption.parties.length * 3 + 1, 'Aligned colons between the parties and the docket number.');
  check('Case number in caption', number === normalize(actionLabel + ' ' + caption.case_number), actionLabel + ' ' + caption.case_number);
  const title = normalize(caption.title.toUpperCase());
  const titleAt = titleText ? first.findIndex((_, index) => matchLines(first, index, titleText, true) > 0) : -1;
  const titleEnd = matchLines(first, titleAt, titleText, true);
  check('Document title in caption', titleText === title && titleEnd > 0, caption.title);
  const pdf = extracted.replace(/\s/gu, '').toLowerCase();
  const forbidden = ['courtuseonly', 'division:', 'caseno:', 'atrueandcorrectcopyoftheforegoing'];
  check('Colorado caption strings absent', !forbidden.some(text => pdf.includes(text)),
    'No Colorado form labels or certificate wording in the extracted PDF.');
  return titleEnd;
}

export function federalClosing({ caption, prepared, treatment, remainder, extracted, check }) {
  const skip = (at, text) => matchLines(remainder, at, text, true);
  const signed = (at, name) =>
    at >= 0 && isSignatureLine(remainder[at] ?? '', /^_{3,}$/u, '/s/ ' + name) ? at + 1 : -1;
  const dateAt = remainder.findLastIndex(line => /^Dated:/u.test(line));
  const date = remainder[dateAt]?.slice('Dated:'.length).trim();
  let cursor = date && validFilerDate(date) ? dateAt + 1 : -1;
  if (caption.dated_at) cursor = skip(cursor, caption.dated_at);
  cursor = skip(cursor, submitted);
  cursor = skip(signed(cursor, caption.signer.name), signerName(caption.signer));
  for (const contact of contacts(caption.signer)) {
    cursor = matchLines(remainder, cursor, contact, contact !== caption.signer.email);
  }
  check('Signer in signature block', cursor > 0, 'Dated line, submission, signature, signer, address, email and telephone.');

  const certificateSigner = (at, name) => {
    const line = remainder[at] ?? '';
    if (/^_{3,} /u.test(line)) return skip(at, line.split(' ')[0] + ' ' + name);
    return skip(signed(at, name), name);
  };
  if (treatment.word_count_certificate) {
    const statement = complianceStatement(wordCount(prepared.bodyText));
    const end = certificateSigner(skip(skip(cursor, complianceHeading), statement), caption.signer.name);
    check('Word-count certificate present', end > 0, 'Compliance heading, exact body word count and statement, signature line and signer.');
    if (end > 0) cursor = end;
  }
  if (caption.service.method === 'electronic-filing') {
    check('Certificate of service absent', !/^[ \t]*CERTIFICATE\s+OF\s+SERVICE[ \t]*(?:[.:](?=[ \t]|$)|$)/imu.test(extracted),
      'The profile omits a service certificate for service through the court’s electronic-filing system.');
  } else {
    let at = skip(cursor, serviceHeading);
    for (const recipient of caption.service.recipients) {
      const date = /^I certify that on (.+?) I served\b/u.exec(remainder.slice(Math.max(at, 0), Math.max(at, 0) + 3).join(' '))?.[1];
      at = at >= 0 && date && validFilerDate(date) ? skip(at, serviceStatement(caption, recipient, date)) : -1;
    }
    const end = certificateSigner(at, caption.service.served_by ?? caption.signer.name);
    check('Certificate of service present', end > 0, 'Service heading, date, exact statement for each recipient, signature line and signer.');
    if (end > 0) cursor = end;
  }
  check('Federal closing ends the filing', cursor === remainder.length, 'Expected signature and certificates in order, with no trailing text.');
  return dateAt;
}

function dashedRule(raster, from, to, target) {
  const { pixels, width, height } = raster;
  for (let y = Math.max(0, target - 7); y < Math.min(height, target + 8); y++) {
    let painted = 0;
    let dashes = 0;
    let previous = false;
    let lastPainted = from;
    let gap = 0;
    for (let x = from; x < to; x++) {
      const dark = pixels[y * width + x] < 150;
      if (dark) {
        painted++;
        gap = Math.max(gap, x - lastPainted);
        lastPainted = x;
        if (!previous) dashes++;
      }
      previous = dark;
    }
    const share = painted / (to - from);
    if (share >= 0.3 && share <= 0.85 && dashes >= (to - from) / 16 &&
        Math.max(gap, to - lastPainted) <= 12) return y;
  }
  return -1;
}

function solidCaptionBox({ pixels, width, height }, from, to, start, end) {
  const horizontal = [];
  for (let row = Math.max(0, start); row < Math.min(end, height); row++) {
    let dark = 0;
    for (let x = from; x < to; x++) if (pixels[row * width + x] < 120) dark++;
    if (dark >= (to - from) * 0.98) horizontal.push(row);
  }
  if (horizontal.length < 2 || horizontal.at(-1) - horizontal[0] < 24) return false;
  const [top, bottom] = [horizontal[0], horizontal.at(-1)];
  const vertical = target => {
    for (let x = Math.max(0, target - 4); x < Math.min(width, target + 5); x++) {
      let dark = 0;
      for (let y = top; y <= bottom; y++) if (pixels[y * width + x] < 120) dark++;
      if (dark >= (bottom - top) * 0.98) return true;
    }
    return false;
  };
  return vertical(from) && vertical(to);
}

export function federalRuling(bytes, layout, page) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return { results: [null, null] };
  const p = points => Math.round(points * PIXELS_PER_POINT);
  const caption = positionedCaption(page, layout);
  const { top, bottom, left, right, split, title } = caption;
  const from = p(left);
  const to = p(split);
  const rows = [top, bottom].map(mark => mark ?
    dashedRule(raster, from, to, p(midpoint(mark.bounds.y, mark.bounds.bottom))) : -1);
  const ruled = rows[0] >= 0 && rows[1] > rows[0];
  const rules = ruled ? rows.map(row => ({ x: left, right: split, y: row / PIXELS_PER_POINT, bottom: (row + 1) / PIXELS_PER_POINT })) : [];
  const start = p(layout.margins_inches.top * 72);
  const end = title[0] ? p(title[0].bounds.bottom) : Math.min(raster.height, start + p(400));
  const boxed = solidCaptionBox(raster, from, p(right), start - 3, end);
  return { results: [ruled, !boxed], rules };
}
