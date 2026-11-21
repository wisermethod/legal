import { canonicalBody, judicialClosing, normalize, wordCount } from './body-text-core.js';
import { captionParties, formatPartyName } from './compose-core.js';
import { counselLabel } from './schema-core.js';

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
  const isNew = caption.filing_packet !== undefined && caption.filing_packet === profile.new_case_packet;
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
  add('Document title in caption', titleEnd > 0 && boxed?.title === title, caption.title);
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

function filerAndCertificate(caption, profile, remainder, check, add) {
  const signer = caption.signer.name + ',' + (caption.signer.role ? ' ' + caption.signer.role : '');
  let signedAt = -1;
  const closing = remainder.findLastIndex((line, index) => {
    if (line !== submitted || !/^Date:/u.test(remainder[index + 1] ?? '')) return false;
    // A PDF editor may replace the underline with a signature or add a line.
    for (const offset of [3, 2, 4]) {
      signedAt = matchLines(remainder, index + offset, signer, true);
      if (signedAt > 0) return true;
    }
    return false;
  });
  check('Signer in signature block', closing >= 0, caption.signer.name);
  let certAt = signedAt;
  for (const line of caption.signer.lines ?? []) certAt = matchLines(remainder, certAt, line, true);
  const afterSigner = certAt < 0 ? [] : remainder.slice(certAt);
  const service = caption.service;
  if (service) {
    const statementEnds = afterSigner.findIndex((line, index) => index > 0 && /(?:^| )to:$/u.test(line));
    const certStatement = statementEnds < 0 ? '' : afterSigner.slice(1, statementEnds + 1).join(' ');
    const expectedEnd = 'a true and correct copy of the foregoing ' + caption.title +
      ' was served by ' + (service.method ?? 'email') + ' to:';
    const hasCertificate = afterSigner[0] === certificateHeading && /^I certify that on this /u.test(certStatement) &&
      compact(certStatement).endsWith(compact(expectedEnd));
    check('Certificate of service present', hasCertificate, 'Own heading and service statement after the signature block.');
    let recipientAt = statementEnds + 1;
    for (const recipient of service.recipients) {
      const printed = recipient.name + ' (' + recipient.emails.join('; ') + ')';
      const recipientEnd = hasCertificate ? matchLines(afterSigner, recipientAt, printed, true) : -1;
      check('Service recipient in certificate: ' + recipient.name, recipientEnd > 0, printed);
      for (const email of recipient.emails) {
        check('Service email present: ' + email, recipientEnd > 0, 'Listed under ' + recipient.name + ' in the certificate.');
      }
      recipientAt = recipientEnd;
    }
  } else {
    const reason = caption.no_service_certificate;
    check('Certificate of service absent', certAt >= 0 && !afterSigner.some(line => line.toUpperCase() === certificateHeading),
      'This document has no separate certificate block.');
    const detail = reason ? 'Not applicable by declaration (' + reason + '): ' +
      profile.no_service_certificate_reasons[reason].description : 'The enclosing packet supplies the certificate.';
    add('Certificate of service present', 'not_applicable', detail);
  }
  return closing;
}

function removeRepeatedHeaders(pages, metadata, digest) {
  const headers = metadata.trim().split(' ').filter(Boolean).map(entry => {
    const [offset, length, hash] = entry.split(':');
    return { offset: Number(offset), length: Number(length), hash };
  });
  let prior = '';
  return pages.map((lines, index) => {
    let skip = 0;
    const text = canonicalBody(lines.join(' '));
    if (index > 0) {
      for (const { offset, length, hash } of headers) {
        const prefix = text.slice(0, length);
        const isNewHeader = headers.some(header => header.hash === hash && header.offset === prior.length);
        if (isNewHeader || offset + length > prior.length || prior.slice(offset, offset + length) !== prefix ||
            digest(prefix) !== hash) continue;
        let consumed = 0;
        const end = lines.findIndex(line => (consumed += canonicalBody(line).length) >= length);
        if (consumed === length) {
          skip = end + 1;
          break;
        }
      }
    }
    prior += text.slice(canonicalBody(lines.slice(0, skip).join(' ')).length);
    return lines.slice(skip).join(' ');
  }).join(' ');
}

export function filingTextChecks({ caption, profile, extracted, info, bodySha256, digest, add, positioned }) {
  const check = (label, passes, detail) => add(label, extracted ? (passes ? 'pass' : 'fail') : 'not_checked',
    extracted ? detail : 'Extractable PDF text is unavailable.');
  const pages = stripFooters(extracted, profile.layout.footer.format, info?.count ?? 1);
  const first = pages[0] ?? [];
  const titleEnd = captionText(first, caption, profile, check, positioned?.[0]);
  const bodyPages = [first.slice(Math.max(0, titleEnd)), ...pages.slice(1)];
  const remainder = bodyPages.flat();
  let remaining = remainder.length;
  if (caption.document_type === 'proposed-order') {
    check('Judicial signature block in proposed order', judicialClosing(remainder.join(' ')),
      'The composed body ends with a court signature block.');
    check('Filer signature and certificate of service absent',
      !remainder.some(line => line === submitted || line.toUpperCase() === certificateHeading),
      'The proposed order carries only the court signature block.');
    add('Certificate of service present', 'not_applicable', 'A proposed order carries no separate certificate.');
  } else {
    remaining = filerAndCertificate(caption, profile, remainder, check, add);
  }

  const bodyLines = bodyPages.map(lines => {
    const part = lines.slice(0, Math.max(0, remaining));
    remaining -= part.length;
    return part;
  });
  const binding = /^Court Filing ([a-f0-9]{64}) ([a-f0-9]{64}) ([1-9]\d*)((?: \d+:[1-9]\d*:[a-f0-9]{64})*)$/u.exec(info?.title ?? '');
  let pdfBody = titleEnd > 0 ? bodyLines.flat().join(' ') : '';
  if (binding?.[4] && pdfBody && digest(canonicalBody(pdfBody)) !== binding[2]) {
    pdfBody = removeRepeatedHeaders(bodyLines, binding[4], digest);
  }
  check('Composed body SHA-256', Boolean(binding && binding[1] === bodySha256),
    'PDF metadata must carry the exact body SHA-256 from compose.');
  check('Printed PDF body matches composition', Boolean(pdfBody && binding && digest(canonicalBody(pdfBody)) === binding[2]),
    'Extracted body text must match compose, excluding running table headers already present in the body.');
  return { pdfBodyWords: pdfBody ? wordCount(pdfBody) : null, bodyWords: binding ? Number(binding[3]) : null };
}
