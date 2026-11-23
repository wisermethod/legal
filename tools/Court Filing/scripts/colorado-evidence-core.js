import { normalize } from './body-text-core.js';
import { captionParties, captionTitle, formatPartyName } from './colorado-compose-core.js';
import { counselLabel } from './colorado-schema-core.js';
import { near, parseRaster, PIXELS_PER_POINT, POINTS_PER_INCH } from './pdf-evidence-core.js';
import { documentType } from './schema-fields-core.js';
import { blank, calendarDate, centeredLines, compact, isSignatureLine, matchLines, monthIndex, validFilerDate } from './text-evidence-core.js';

const certificateHeading = 'CERTIFICATE OF SERVICE';
const submitted = 'Respectfully submitted,';

export function coloradoCaptionText({ first, caption, profile, check: add, positioned }) {
  const isMarker = line => /^[▲\s]*COURT USE ONLY[▲\s]*$/u.test(line);
  const markerAt = first.findIndex(isMarker);
  const boxed = positioned && positionedCaption(positioned, profile, 'Division: ' + caption.division);
  const left = boxed?.left ?? [];
  const courtEnd = matchLines(left, 0, caption.court.toUpperCase());
  add('Court name in caption', courtEnd > 0, caption.court);
  const addressEnd = caption.court_address ? matchLines(left, courtEnd, caption.court_address) : courtEnd;
  if (caption.court_address) add('Court address in caption', addressEnd > 0, caption.court_address);
  let partyStart = addressEnd;
  const { ordered, separator } = captionParties(caption.parties);
  ordered.forEach(({ role, name }, index) => {
    if (index === separator) partyStart = matchLines(left, partyStart, 'v.');
    const printed = role + ': ' + formatPartyName(name, role);
    partyStart = matchLines(left, partyStart, printed);
    add('Party in caption: ' + role + ' ' + name, partyStart > 0, printed);
  });

  const label = caption.signer && caption.caption_counsel !== false ? counselLabel(caption) : null;
  if (label) {
    const counselEnd = matchLines(left, partyStart, label);
    let end = matchLines(left, counselEnd, caption.signer.name);
    for (const line of caption.signer.lines ?? []) end = matchLines(left, end, line);
    add('Counsel block in caption', end === left.length, label + ' ' + caption.signer.name);
  } else {
    add('Caption contains the specified party blocks', partyStart === left.length, 'No counsel block requested.');
  }

  const caseAt = markerAt + 1;
  const divisionAt = first.findIndex((line, index) => markerAt >= 0 && index > caseAt && /^Division:/u.test(line));
  const caseText = divisionAt > caseAt && /^Case No:/u.test(first[caseAt]) ?
    normalize(first.slice(caseAt, divisionAt).join(' ').slice('Case No:'.length)) : null;
  const isNew = documentType(profile, caption).blank_case_number;
  add(isNew ? 'Case number blank for new-case packet' : 'Case number in caption',
    caseText === caption.case_number && boxed?.caseNumber === caption.case_number, isNew ? caption.filing_packet + ': Case No. is left blank for the court.' : caption.case_number);

  // Locate the title directly after the Division field, then check the whole
  // centered title block, including any additional line that wraps in print.
  const division = 'Division: ' + caption.division;
  const divisionEnd = divisionAt < 0 ? -1 : matchLines(first, divisionAt, division);
  add('Division in caption', divisionEnd > 0 && Boolean(boxed), caption.division);
  add('COURT USE ONLY caption marker', markerAt >= 0 && Boolean(boxed?.marker), 'Caption marker before Case No. and Division.');
  const title = captionTitle(caption.title).printed;
  const titleEnd = matchLines(first, divisionEnd, title, true);
  add('Document title in caption', titleEnd > 0 && boxed?.title === normalize(title), caption.title);
  return titleEnd;
}

function positionedCaption(page, profile, division) {
  const contentCenter = (page.bounds.right + (profile.layout.margins_inches.left - profile.layout.margins_inches.right) * 72) / 2;
  const split = profile.layout.margins_inches.left * 72 + (page.bounds.right -
    (profile.layout.margins_inches.left + profile.layout.margins_inches.right) * 72) * 0.62;
  const lineText = line => normalize(line.words.map(word => word.text).join(' '));
  const right = page.lines.filter(({ bounds }) => bounds.x >= split).sort((a, b) => a.bounds.y - b.bounds.y);
  const rightText = right.map(lineText);
  const divisionAt = rightText.findIndex(line => /^Division:/u.test(line));
  const divisionEnd = matchLines(rightText, divisionAt, division);
  const caseAt = rightText.findIndex(line => /^Case No:/u.test(line));
  const caseNumber = caseAt >= 0 && divisionAt > caseAt ?
    normalize(rightText.slice(caseAt, divisionAt).join(' ').slice('Case No:'.length)) : null;
  if (divisionEnd < 0) return null;
  const divisionBottom = right[divisionEnd - 1].bounds.bottom;
  const afterDivision = page.lines.filter(({ bounds }) => bounds.y >= divisionBottom)
    .sort((a, b) => a.bounds.y - b.bounds.y);
  const centered = ({ bounds }) => Math.abs((bounds.x + bounds.right) / 2 - contentCenter) <= 2;
  const start = afterDivision.findIndex(centered);
  if (start < 0) return null;
  const title = centeredLines(afterDivision.slice(start), centered, profile.layout.body_font_size_pt * 1.5);
  const titleTop = title[0].bounds.y;
  const left = page.lines.filter(({ bounds }) => bounds.y < titleTop && bounds.right <= split)
    .sort((a, b) => a.bounds.y - b.bounds.y).map(lineText);
  return {
    left, caseNumber, title: normalize(title.map(lineText).join(' ')),
    marker: caseAt > 0 && /^(?:▲ )?COURT USE ONLY(?: ▲)?$/u.test(rightText[caseAt - 1]),
  };
}

const hasCertificateHeading = lines => /(?:^|\n)CERTIFICATE\s*OF\s*SERVICE(?:\n|$)/iu.test(lines.join('\n'));
const mentionsCertificate = text => /\bCERTIFICATE\s*OF\s*SERVICE\b/iu.test(text);

function certificateDateMatches(date, expectedYear) {
  if (!date) return false;
  const [, day, month, printedYear] = date;
  const year = Number(printedYear);
  if (!Number.isInteger(year) || Math.abs(year - expectedYear) > 1) return false;
  return blank.test(day) && blank.test(month) || calendarDate(year, monthIndex(month), Number.parseInt(day, 10));
}

function certificateChecks(caption, expectedYear, lines, check) {
  const service = caption.service;
  const statementEnd = lines.findIndex((line, index) => index > 0 && /(?:^| )to:$/u.test(line));
  const statement = lines.slice(1, statementEnd + 1).join(' ');
  const statementTail = 'a true and correct copy of the foregoing ' + caption.title +
    ' was served by ' + (service.method ?? 'email') + ' to:';
  const dateMatch = /^I certify that on this (_{3,}|\d{1,2}(?:st|nd|rd|th)?) day of (_{3,}|[A-Za-z]+\.?), (\d{4}|_{3,}), (.*)$/u.exec(statement);
  const hasCertificate = lines[0] === certificateHeading && Boolean(dateMatch) &&
    compact(dateMatch[4]) === compact(statementTail);
  check('Certificate of service present', hasCertificate, 'Own heading and exact service statement after the signature block.');
  check('Certificate date fields', certificateDateMatches(dateMatch, expectedYear),
    'Untouched preprint or complete calendar date within one year of ' + expectedYear + '.');
  let cursor = hasCertificate ? statementEnd + 1 : -1;
  for (const recipient of service.recipients) {
    const printed = recipient.name + ' (' + recipient.emails.join('; ') + ')';
    cursor = matchLines(lines, cursor, printed, true);
    check('Service recipient in certificate: ' + recipient.name, cursor > 0, printed);
    for (const email of recipient.emails) {
      check('Service email present: ' + email, cursor > 0, 'Listed under ' + recipient.name + ' in the certificate.');
    }
  }
  const firm = [service.firm, ...(service.firm_lines ?? []), service.firm_note].filter(Boolean);
  for (const line of firm) cursor = matchLines(lines, cursor, line, true);
  check('Certificate firm details', cursor > 0, 'All supplied firm lines in order.');
  const server = service.served_by ?? caption.signer.name;
  const hasLine = cursor > 0 && isSignatureLine(lines[cursor] ?? '', blank, '/s/ ' + server);
  const signerEnd = hasLine ? matchLines(lines, cursor + 1, server) : -1;
  check('Certificate signer and end of filing', signerEnd === lines.length, 'Expected service signer and signature line, with no trailing text.');
}

function filerAndCertificate(caption, certificateYear, remainder, check, add, treatment, extracted) {
  const signer = caption.signer.name + ',' + (caption.signer.role ? ' ' + caption.signer.role : '');
  const closing = remainder.findLastIndex(line => line === submitted);
  const dateLine = remainder[closing + 1] ?? '';
  const line = remainder[closing + 2] ?? '';
  const hasLine = isSignatureLine(line, blank, '/s/ ' + caption.signer.name);
  let cursor = closing >= 0 && dateLine.startsWith('Date:') && validFilerDate(dateLine.slice(5).trim()) && hasLine ?
    matchLines(remainder, closing + 3, signer, true) : -1;
  for (const contact of caption.signer.lines ?? []) cursor = matchLines(remainder, cursor, contact);
  check('Signer in signature block', cursor > 0, 'Date, signature line, signer and supplied contact lines.');
  if (treatment.certificate) {
    certificateChecks(caption, certificateYear, cursor > 0 ? remainder.slice(cursor) : [], check);
  } else {
    check('Certificate of service absent', !mentionsCertificate(extracted),
      'The approved document type has no separate certificate anywhere in the extract.');
    check('Filer closing ends the filing', cursor === remainder.length, 'No content follows the required filer closing.');
    add('Certificate of service present', 'not_applicable', treatment.filing_packet ?
      'The enclosing packet supplies the certificate.' : 'The profile omits the certificate for this exact title.');
  }
  return closing;
}

function judicialClosing(printed, ruled = false) {
  const ending = /(?:^|\s)BY *THE *COURT *:\s*(_{3,})? *([\p{L} .,'’-]{0,100}JUDGE\.?)$/iu.exec(normalize(printed));
  return Boolean(ending && (ruled ? ending[1] === undefined : ending[1]));
}

export function prepareJudicialClosing(body, bodyHtml, bodyText) {
  const ruledClosing =
    /<p>BY THE COURT *:<\/p>\s*<hr>\s*(?:<p>[\p{L} .,'’-]{1,70}<\/p>\s*)?<p>[\p{L} .,'’-]{0,30}JUDGE\.?<\/p>\s*$/iu.test(bodyHtml) &&
    /BY THE COURT *:\s*\n\s*_{3,} *\r?\n/iu.test(body);
  if (!judicialClosing(bodyText, ruledClosing)) {
    throw new Error('Proposed-order Markdown must end with BY THE COURT, a blank signature line and a judge designation.');
  }
  return ruledClosing;
}

export function coloradoClosing({ caption, remainder, check, add, treatment, extracted, prepared, validationDate }) {
  if (treatment.judicial_closing) {
    check('Judicial signature block in proposed order', judicialClosing(remainder.join(' '), prepared.ruledClosing),
      'The composed body ends with the unsigned court signature block.');
    check('Filer signature and certificate of service absent',
      !remainder.some(line => line === submitted) && !mentionsCertificate(extracted),
      'The proposed order carries only the court signature block.');
    add('Certificate of service present', 'not_applicable', 'The profile omits a separate certificate for this judicial order.');
    return remainder.length;
  }
  const certificateYear = caption.certificate_year ?? validationDate.getFullYear();
  const closing = filerAndCertificate(caption, certificateYear, remainder, check, add, treatment, extracted);
  if (treatment.certificate) {
    check('Only one certificate block', !hasCertificateHeading(remainder.slice(0, Math.max(0, closing))),
      'The legal body has no additional certificate heading.');
  }
  return closing;
}

export const matchesMetadataSuffix = (suffix, treatment) =>
  treatment.certificate && /^ \| Certificate year [1-9]\d{3}$/u.test(suffix);

function captionRuling(bytes, layout, page) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return null;
  const { width, height, pixels } = raster;
  const ratio = POINTS_PER_INCH * PIXELS_PER_POINT;
  const { left, right, top } = layout.margins_inches;
  const from = Math.round(left * ratio);
  const to = width - Math.round(right * ratio);
  const expectedTop = Math.round(top * ratio);
  const dark = (x, y) => pixels[y * width + x] < 100;
  const horizontal = (y, x0, x1) => {
    let count = 0;
    for (let x = x0; x < x1; x++) if (dark(x, y)) count++;
    return count >= (x1 - x0) * 0.985;
  };
  const rules = [];
  for (let y = Math.max(0, expectedTop - 3); y < height; y++) {
    if (horizontal(y, from, to) && (rules.length === 0 || y - rules.at(-1).last > 1)) {
      rules.push({ first: y, last: y });
      if (rules.length === 4) break;
    } else if (rules.length && horizontal(y, from, to)) {
      rules.at(-1).last = y;
    }
  }
  if (rules.length < 3 || !near(rules[0].first, expectedTop, 3)) return false;
  const [upper, divider, lower] = rules;
  const provesVertical = (target, tolerance, end) => {
    for (let x = target - tolerance; x <= target + tolerance; x++) {
      let count = 0;
      for (let y = upper.first; y <= end; y++) if (dark(x, y)) count++;
      if (count >= (end - upper.first) * 0.985) return true;
    }
    return false;
  };
  const boxed = provesVertical(from, 4, lower.first) && provesVertical(to, 4, lower.first) &&
    provesVertical(Math.round(from + (to - from) * 0.62), 16, divider.first);
  return boxed ? {
    x: left * POINTS_PER_INCH, right: width / PIXELS_PER_POINT - right * POINTS_PER_INCH,
    y: top * POINTS_PER_INCH, bottom: lower.last / PIXELS_PER_POINT,
  } : false;
}


function judicialRuling(bytes, layout, page) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return null;
  const text = line => line.words.map(word => word.text).join(' ');
  const marker = page.lines.findLast(line => /^BY\s*THE\s*COURT:\s*$/iu.test(text(line)));
  const judge = page.lines.findLast(line => /\bJUDGE\.?$/iu.test(text(line)));
  if (!marker || !judge || judge.bounds.y <= marker.bounds.bottom) return false;
  const { width, pixels } = raster;
  const from = Math.ceil(layout.margins_inches.left * POINTS_PER_INCH * PIXELS_PER_POINT);
  const to = width - Math.ceil(layout.margins_inches.right * POINTS_PER_INCH * PIXELS_PER_POINT);
  const start = Math.floor(marker.bounds.bottom * PIXELS_PER_POINT);
  const end = Math.ceil(judge.bounds.y * PIXELS_PER_POINT);
  for (let y = start; y < end; y++) {
    let dark = 0;
    for (let x = from; x < to; x++) if (pixels[y * width + x] < 190) dark++;
    if (dark >= (to - from) * 0.95) return {
      x: layout.margins_inches.left * POINTS_PER_INCH,
      right: width / PIXELS_PER_POINT - layout.margins_inches.right * POINTS_PER_INCH,
      y: y / PIXELS_PER_POINT, bottom: y / PIXELS_PER_POINT + 1,
    };
  }
  return false;
}


export const coloradoCaptionEvidence = {
  checks: [['Boxed caption ruling', 'Visible outer box, column divider and title separator on the first page.']],
  inspect(bytes, layout, page) {
    const box = captionRuling(bytes, layout, page);
    return { results: [box === null ? null : Boolean(box)], rules: box ? [box] : [] };
  },
};

export const judicialEvidence = {
  label: 'Visible judicial signature ruling',
  detail: 'Visible blank rule between the court heading and judge designation.',
  inspect: judicialRuling,
};
