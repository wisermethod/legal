import { canonicalBody, judicialClosing, normalize } from './body-text-core.js';
import { captionParties, formatPartyName } from './compose-core.js';
import { counselLabel, documentType } from './schema-core.js';

const certificateHeading = 'CERTIFICATE OF SERVICE';
const submitted = 'Respectfully submitted,';
const compact = text => normalize(text).replace(/\s/gu, '');

function matchLines(lines, offset, expected, squash = false) {
  if (offset < 0) return -1;
  const prepare = squash ? compact : normalize;
  const target = prepare(expected);
  let text = '';
  for (let index = offset; index < lines.length; index++) {
    text = prepare(text + ' ' + lines[index]);
    if (text === target) return index + 1;
    if (!target.startsWith(text)) break;
  }
  return -1;
}

function captionText(first, caption, profile, add, positioned) {
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
  const title = caption.title.toUpperCase();
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
  const title = [afterDivision[start]];
  for (const line of afterDivision.slice(start + 1)) {
    const previous = title.at(-1);
    if (!centered(line) || line.bounds.y - previous.bounds.y > profile.layout.body_font_size_pt * 1.5) break;
    title.push(line);
  }
  const titleTop = title[0].bounds.y;
  const left = page.lines.filter(({ bounds }) => bounds.y < titleTop && bounds.right <= split)
    .sort((a, b) => a.bounds.y - b.bounds.y).map(lineText);
  return {
    left, caseNumber, title: normalize(title.map(lineText).join(' ')),
    marker: caseAt > 0 && /^(?:▲ )?COURT USE ONLY(?: ▲)?$/u.test(rightText[caseAt - 1]),
  };
}

function stripFooters(extracted, format, pages) {
  return extracted.split('\f').slice(0, pages).map((page, index) => {
    const expected = normalize(format.replace('{page}', String(index + 1)).replace('{pages}', String(pages)));
    const lines = page.split(/\r?\n/).map(normalize).filter(Boolean);
    // Keep matching text used in the actual body. The renderer writes its
    // footer after the page content; a date overlay may follow that footer.
    const footerAt = lines.lastIndexOf(expected);
    if (footerAt >= 0) lines.splice(footerAt, 1);
    return lines;
  });
}

const blank = /^_{3,}$/u;
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

function calendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day;
}

function monthIndex(name) {
  const normalized = name.toLowerCase().replace(/\.$/u, '');
  return months.findIndex(month => month.toLowerCase() === normalized || month.slice(0, 3).toLowerCase() === normalized);
}

function validFilerDate(date) {
  if (blank.test(date)) return true;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(date);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(date);
  if (slash) return calendarDate(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  const named = /^([A-Za-z]+\.?) (\d{1,2}),? (\d{4})$/u.exec(date);
  return Boolean(named && calendarDate(Number(named[3]), monthIndex(named[1]), Number(named[2])));
}
const signatureLine = /^_{3,}$/u;
const hasCertificateHeading = lines => /(?:^|\n)CERTIFICATE\s*OF\s*SERVICE(?:\n|$)/iu.test(lines.join('\n'));
const mentionsCertificate = text => /\bCERTIFICATE\s*OF\s*SERVICE\b/iu.test(text);

function certificateChecks(caption, profile, lines, check) {
  const service = caption.service;
  const statementEnd = lines.findIndex((line, index) => index > 0 && /(?:^| )to:$/u.test(line));
  const statement = lines.slice(1, statementEnd + 1).join(' ');
  const statementTail = 'a true and correct copy of the foregoing ' + caption.title +
    ' was served by ' + (service.method ?? 'email') + ' to:';
  const dateMatch = /^I certify that on this (_{3,}|\d{1,2}(?:st|nd|rd|th)?) day of (_{3,}|[A-Za-z]+), (\d{4}|_{3,}), (.*)$/u.exec(statement);
  const expectedYear = profile.layout.certificate_year;
  const validDate = dateMatch && (expectedYear === null || dateMatch[3] === String(expectedYear)) &&
    (blank.test(dateMatch[1]) && blank.test(dateMatch[2]) ?
      expectedYear !== null || blank.test(dateMatch[3]) :
      calendarDate(Number(dateMatch[3]), monthIndex(dateMatch[2]), Number.parseInt(dateMatch[1], 10)));
  const hasCertificate = lines[0] === certificateHeading && Boolean(dateMatch) &&
    compact(dateMatch[4]) === compact(statementTail);
  check('Certificate of service present', hasCertificate, 'Own heading and exact service statement after the signature block.');
  check('Certificate date fields', Boolean(validDate), 'Required date fields and the profile year when preprinted.');
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
  const hasLine = cursor > 0 && (signatureLine.test(lines[cursor] ?? '') || lines[cursor] === '/s/ ' + server);
  const signerEnd = hasLine ? matchLines(lines, cursor + 1, server) : -1;
  check('Certificate signer and end of filing', signerEnd === lines.length, 'Expected service signer and signature line, with no trailing text.');
}

function filerAndCertificate(caption, profile, remainder, check, add, treatment, extracted) {
  const signer = caption.signer.name + ',' + (caption.signer.role ? ' ' + caption.signer.role : '');
  const closing = remainder.findLastIndex(line => line === submitted);
  const dateLine = remainder[closing + 1] ?? '';
  const line = remainder[closing + 2] ?? '';
  const hasLine = signatureLine.test(line) || line === '/s/ ' + caption.signer.name;
  let cursor = closing >= 0 && dateLine.startsWith('Date:') && validFilerDate(dateLine.slice(5).trim()) && hasLine ?
    matchLines(remainder, closing + 3, signer, true) : -1;
  for (const contact of caption.signer.lines ?? []) cursor = matchLines(remainder, cursor, contact);
  check('Signer in signature block', cursor > 0, 'Date, signature line, signer and supplied contact lines.');
  if (treatment.certificate) {
    certificateChecks(caption, profile, cursor > 0 ? remainder.slice(cursor) : [], check);
  } else {
    check('Certificate of service absent', !mentionsCertificate(extracted),
      'The approved document type has no separate certificate anywhere in the extract.');
    check('Filer closing ends the filing', cursor === remainder.length, 'No content follows the required filer closing.');
    add('Certificate of service present', 'not_applicable', treatment.filing_packet ?
      'The enclosing packet supplies the certificate.' : 'The profile omits the certificate for this exact title.');
  }
  return closing;
}

export function removeRepeatedHeaders(pages, headers) {
  let prior = '';
  let aligned = true;
  const repeated = [];
  const cleaned = pages.map((lines, index) => {
    if (index > 0) {
      const pageText = canonicalBody(lines.join(' '));
      const header = headers.find(({ offset, end, text }) => offset + text.length <= prior.length && prior.length < end &&
        pageText.startsWith(text) && !headers.some(next => next.offset === prior.length && next.text === text));
      if (header) {
        let consumed = 0;
        const end = lines.findIndex(line => (consumed += canonicalBody(line).length) >= header.text.length);
        if (consumed === header.text.length) {
          repeated.push({ page: index, offset: header.offset, lines: lines.slice(0, end + 1) });
          lines = lines.slice(end + 1);
        }
        else aligned = false;
      }
    }
    prior += canonicalBody(lines.join(' '));
    return lines;
  });
  return { pages: cleaned, aligned, repeated };
}

function tokenBoundaries(tokens) {
  let offset = 0;
  return tokens.map(token => offset += token.length);
}

function lineOverlap(text, run) {
  const inside = text.indexOf(run);
  if (inside >= 0 && text.indexOf(run, inside + 1) < 0) return inside;
  const reverse = run.indexOf(text);
  if (reverse >= 0 && run.indexOf(text, reverse + 1) < 0) return -reverse;
  // Poppler's two modes can assign a table cell to different lines. An edge
  // shared by both extracts can still substantiate a boundary in that overlap.
  for (let length = Math.min(text.length, run.length) - 1; length >= 12; length--) {
    if (run.endsWith(text.slice(0, length))) return length - run.length;
    if (text.endsWith(run.slice(0, length))) return text.length - length;
  }
  return null;
}

function positionedBoundaries(text, lines) {
  const boundaries = new Set();
  for (const line of lines ?? []) {
    const tokens = line.words.map(word => canonicalBody(word.text));
    const run = tokens.join('');
    if (!run) continue;
    const start = lineOverlap(text, run);
    if (start === null) continue;
    for (const boundary of tokenBoundaries(tokens)) {
      if (start + boundary > 0 && start + boundary < text.length) boundaries.add(start + boundary);
    }
    if (start > 0 && start < text.length) boundaries.add(start);
  }
  return boundaries;
}

export function bodyEvidence(pages, expected, positioned, wordCountWithoutMarkers) {
  const sourceTokens = normalize(expected).split(' ').map(canonicalBody);
  const expectedRun = sourceTokens.join('');
  const expectedBreaks = new Set(tokenBoundaries(sourceTokens));
  const rawBreaks = new Set();
  const extraBreaks = new Set();
  let offset = 0;
  let previous = '';
  const actual = [];
  for (const [page, lines] of pages.entries()) {
    for (const line of lines) {
      const tokens = line.split(' ').map(canonicalBody);
      const text = tokens.join('');
      if (previous.endsWith('-') && !expectedBreaks.has(offset)) rawBreaks.delete(offset);
      const measured = positionedBoundaries(text, positioned?.[page]?.lines);
      for (const boundary of tokenBoundaries(tokens)) {
        rawBreaks.add(offset + boundary);
        if (measured.has(boundary) && boundary < text.length) extraBreaks.add(offset + boundary);
      }
      for (const boundary of measured) {
        if (expectedBreaks.has(offset + boundary)) rawBreaks.add(offset + boundary);
      }
      offset += text.length;
      actual.push(text);
      previous = text;
    }
  }
  const charactersMatch = Boolean(actual.length) && actual.join('') === expectedRun;
  const addedWordBoundary = [...extraBreaks].some(offset => !expectedBreaks.has(offset) &&
    /[\p{L}\p{N}]{2}/u.test(expectedRun.slice(offset - 1, offset + 1)));
  const wordsMatch = charactersMatch && !addedWordBoundary &&
    [...expectedBreaks].every(boundary => rawBreaks.has(boundary));
  return {
    wordsMatch,
    pdfBodyWords: wordsMatch ? wordCountWithoutMarkers ?? sourceTokens.length : rawBreaks.size || null,
  };
}

export function filingTextChecks({ caption, profile, extracted, info, prepared, add, positioned }) {
  const check = (label, passes, detail) => add(label, extracted ? (passes ? 'pass' : 'fail') : 'not_checked',
    extracted ? detail : 'Extractable PDF text is unavailable.');
  const pages = stripFooters(extracted, profile.layout.footer.format, info?.count ?? 1);
  const first = pages[0] ?? [];
  const titleEnd = captionText(first, caption, profile, check, positioned?.[0]);
  const bodyPages = [first.slice(Math.max(0, titleEnd)), ...pages.slice(1)];
  const remainder = bodyPages.flat();
  let remaining = remainder.length;
  const treatment = documentType(profile, caption);
  if (treatment.judicial_closing) {
    check('Judicial signature block in proposed order', judicialClosing(remainder.join(' '), prepared.ruledClosing),
      'The composed body ends with the unsigned court signature block.');
    check('Filer signature and certificate of service absent',
      !remainder.some(line => line === submitted) && !mentionsCertificate(extracted),
      'The proposed order carries only the court signature block.');
    add('Certificate of service present', 'not_applicable', 'The profile omits a separate certificate for this judicial order.');
  } else {
    remaining = filerAndCertificate(caption, profile, remainder, check, add, treatment, extracted);
    if (treatment.certificate) {
      check('Only one certificate block', !hasCertificateHeading(remainder.slice(0, Math.max(0, remaining))),
        'The legal body has no additional certificate heading.');
    }
  }
  const bodyLines = titleEnd > 0 ? bodyPages.map(lines => {
    const part = lines.slice(0, Math.max(0, remaining));
    remaining -= part.length;
    return part;
  }) : [];
  const exactCharacters = canonicalBody(bodyLines.flat().join(' ')) === canonicalBody(prepared.bodyText);
  const continued = exactCharacters ? { pages: bodyLines, aligned: true, repeated: [] } : removeRepeatedHeaders(bodyLines, prepared.headers);
  check('Continued table header alignment', continued.aligned, 'A repeated header must occupy complete lines at the top of its continuation page.');
  const evidence = bodyEvidence(continued.pages, prepared.bodyText, positioned, prepared.bodyWords);
  check('Composed body SHA-256', info?.title === 'Court Filing ' + prepared.bodySha256,
    'The PDF title independently carries the SHA-256 of the supplied Markdown.');
  check('Printed PDF body matches composition', evidence.wordsMatch,
    'Compare independently parsed Markdown with the PDF body after removing expected running headers.');
  return {
    pdfBodyWords: evidence.pdfBodyWords, bodyLines: continued.pages, repeated: continued.repeated,
    spacingBound: continued.aligned && evidence.wordsMatch,
  };
}
