import { canonicalBody, normalize, printedBodyText } from './body-text-core.js';
import {
  against, certificateHeading, certificateLines, columnGap, indexLabel, judgeLabel, noticeIntro, noticeOptions,
  oralArgument, partyName, partyRole, partyWidth, recipientLines, roleInset, signerLines, validNoticeBody,
} from './new-york-compose-core.js';
import { courtLines, noticeType } from './new-york-schema-core.js';
import { footerCandidates, near, parseRaster, PIXELS_PER_POINT } from './pdf-evidence-core.js';
import { matchLines } from './text-evidence-core.js';

const lineText = line => line.words.map(word => word.text).join(' ');
const leftEdge = layout => layout.margins_inches.left * 72;
const midpoint = ({ x, right }) => (x + right) / 2;
const isNotice = caption => caption.document_type === noticeType;
const blockEnd = (lines, from, contents, squash = true) =>
  contents.reduce((at, line) => matchLines(lines, at, line, squash), from);

function captionPositions(page, layout) {
  const left = leftEdge(layout);
  const split = left + partyWidth;
  const rightStart = split + columnGap;
  const lines = page?.lines.filter(line => line.words.length).sort((a, b) => a.bounds.y - b.bounds.y) ?? [];
  const court = lines.slice(0, 2);
  const marks = lines.flatMap(line => line.words).filter(({ text, bounds }) => text === 'x' &&
    near(bounds.right, split, 2) && bounds.y < page.bounds.bottom - 99);
  const [top, bottom] = marks;
  const ruled = marks.length === 2 && near(top.bounds.y - (court[1]?.bounds.y ?? 0), 24, 2) &&
    bottom.bounds.y > top.bounds.y + 48;
  const between = ruled ? lines.filter(({ bounds }) => bounds.y > top.bounds.y + 1 && bounds.y < bottom.bounds.y - 1) : [];
  const column = (from, to) => between.flatMap(line => {
    const words = line.words.filter(({ bounds }) => bounds.x >= from - 1 && bounds.right <= to + 1);
    return words.length ? [{ words, bounds: { x: words[0].bounds.x, right: words.at(-1).bounds.right } }] : [];
  });
  const parties = column(left, split);
  const docket = column(rightStart, page?.bounds.right ?? 0);
  const wordTotal = rows => rows.reduce((count, line) => count + line.words.length, 0);
  return {
    court, top, bottom, ruled, left, split, rightStart, parties, docket,
    completeColumns: ruled && wordTotal(parties) + wordTotal(docket) === wordTotal(between),
  };
}

export function newYorkCaptionText({ first, caption, profile, check, positioned }) {
  const { layout } = profile;
  const { court, ruled, left, split, rightStart, parties, docket, completeColumns } = captionPositions(positioned, layout);
  const expectedCourt = courtLines(caption);
  const heading = court.map(lineText);
  const courtAligned = court.length === 2 && court.every(({ bounds }, i) =>
    near(bounds.x, left, 2) && near(bounds.y, 77 + 24 * i, 2));
  check('Court name in caption', courtAligned && heading[0] === expectedCourt[0], expectedCourt[0]);
  check('County in caption', courtAligned && heading[1] === expectedCourt[1], expectedCourt[1]);

  const expectedParties = caption.parties.flatMap((party, i) =>
    [...(party.role === 'Defendant' && caption.parties[i - 1]?.role === 'Plaintiff' ? [against] : []),
      partyName(party), partyRole(party)]);
  const partyText = parties.map(lineText);
  let at = 0;
  for (const expected of expectedParties) {
    const start = at;
    at = matchLines(partyText, at, expected);
    const role = /^(?:Plaintiff,|Defendant\.)$/u.test(expected);
    if (at > 0 && !parties.slice(start, at).every(({ bounds }) =>
      role ? near(bounds.right, split - roleInset, 2) : near(bounds.x, left, 2))) at = -1;
  }
  check('Parties in caption order', completeColumns && at === parties.length,
    'Exact party names at left and aligned roles, with -against- between the sides.');

  const docketText = docket.map(lineText);
  const indexAt = docketText.indexOf(indexLabel);
  const indexEnd = blockEnd(docketText, indexAt, [indexLabel, caption.index_number], false);
  const judgeAt = docketText.indexOf(judgeLabel);
  const judgeEnd = blockEnd(docketText, judgeAt, [judgeLabel, caption.assigned_judge], false);
  const aligned = docket.every(({ bounds }) => near(bounds.x, rightStart, 2));
  check('Document title in caption', aligned && indexAt > 0 && matchLines(docketText, 0, caption.title) === indexAt, caption.title);
  check('Index number in caption', aligned && indexEnd > 0 && indexEnd === judgeAt, indexLabel + ' ' + caption.index_number);
  check('Assigned judge in caption', aligned && judgeEnd > judgeAt, judgeLabel + ' ' + caption.assigned_judge);
  if (isNotice(caption)) {
    check('Oral argument box in caption', aligned && judgeEnd > 0 &&
      matchLines(docketText, judgeEnd, oralArgument(caption)) === docket.length, 'Expected request box and wording at right.');
  } else {
    check('Caption docket block ends at judge', aligned && judgeEnd > 0 && judgeEnd === docket.length,
      'Only the document title, index number and assigned judge at right.');
  }
  const afterCourt = blockEnd(first, 0, expectedCourt);
  const bottomAt = afterCourt >= 0 && first[afterCourt] === 'x' ? first.indexOf('x', afterCourt + 1) : -1;
  const afterCaption = ruled && bottomAt > afterCourt ? bottomAt + 1 : -1;
  const pdfText = canonicalBody(first.slice(0, afterCaption).join(' ')).toLowerCase();
  check('Other court caption strings absent', ![
    'courtuseonly', 'division:', 'caseno:', 'unitedstatesdistrictcourt', 'southerndistrictofnewyork', 'civilactionno.',
  ].some(label => pdfText.includes(label)), 'No Colorado or federal labels in the extracted caption.');

  if (!isNotice(caption)) return afterCaption;
  const afterIntro = matchLines(first, afterCaption, noticeIntro(caption), true);
  check('Notice supporting papers and return fields', afterIntro > 0,
    'Expected supporting papers, moving party and blank notice event fields.');
  return afterIntro;
}

export function newYorkClosing({ caption, prepared, treatment, remainder, bodyPages, extracted, check, add }) {
  const notice = isNotice(caption);
  const signerAt = remainder.findLastIndex((line, index) => line.startsWith('Dated:') &&
    (!treatment.word_count_certificate || !remainder.slice(0, index).includes(certificateHeading)));
  const signerEnd = blockEnd(remainder, signerAt, signerLines(caption));
  check('Signer in signature block', signerEnd > 0,
    'Blank date and signature, printed filing counsel, represented party and supplied contact details.');

  if (treatment.word_count_certificate) {
    const finalPage = bodyPages.at(-1);
    const expected = certificateLines(caption, prepared);
    const certificateAt = remainder.findLastIndex(line => line === certificateHeading);
    check('Word-count certificate present', certificateAt === signerEnd && certificateAt >= 0 &&
      blockEnd(remainder, certificateAt, expected) === remainder.length, 'Exact printed body count, counsel compliance wording and counsel block.');
    check('Word-count certificate on separate final page', bodyPages.length >= 2 &&
      certificateAt === remainder.length - finalPage.length && finalPage[0] === certificateHeading &&
      blockEnd(finalPage, 0, expected) === finalPage.length, 'The matching certificate occupies the final PDF page by itself.');
  } else {
    const options = noticeOptions(caption);
    const optionsAt = remainder.findLastIndex(line => line.startsWith('The above-entitled action is for '));
    check('Notice relief, grounds and conditional fields', validNoticeBody(prepared) && optionsAt >= 0 &&
      blockEnd(remainder, optionsAt, options) === signerAt,
    'Relief and grounds in the bound body, followed by the action description and applicable notice fields.');
    const recipients = caption.service.recipients.flatMap(entry => recipientLines(caption, entry));
    check('Notice recipients', signerEnd > 0 && blockEnd(remainder, signerEnd, recipients) === remainder.length,
      'Exact notice recipient names, roles and contact details following the filer.');
    check('Word-count certificate absent', !remainder.includes(certificateHeading), 'The notice has no word-count certificate.');
    if (extracted) add('Notice event fields', 'advisory',
      'Complete and check the actual return place, time and dates, supporting papers and any 2214(b) demand before release.');
    return optionsAt;
  }
  return signerAt;
}

const rulingLabel = 'Dashed caption rules';
export const rulingChecks = [[rulingLabel, 'Both dashed rules run from the left margin to the caption’s x marks.']];
const pixel = pt => Math.round(pt * PIXELS_PER_POINT);

function dashRow(raster, x, end, target) {
  const from = pixel(x);
  const to = pixel(end);
  for (let row = pixel(target) - 6; row <= pixel(target) + 6; row++) {
    if (row < 0 || row >= raster.height) continue;
    const samples = raster.pixels.subarray(row * raster.width + from, row * raster.width + to);
    let runs = 0;
    let painted = 0;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] >= 150) continue;
      painted++;
      if (i === 0 || samples[i - 1] >= 150) runs++;
    }
    if (runs >= 40 && painted >= samples.length * 0.4 && painted <= samples.length * 0.8 &&
        samples.slice(0, 8).some(value => value < 150) && samples.slice(-8).some(value => value < 150)) return row;
  }
  return -1;
}

export function newYorkRuling(bytes, layout, page) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return { results: [null] };
  const { ruled, top, bottom, left, split } = captionPositions(page, layout);
  if (!ruled) return { results: [false] };
  const rules = [top, bottom].map(({ bounds }) =>
    dashRow(raster, left, bounds.x - 7.2, midpoint({ x: bounds.y, right: bounds.bottom })));
  const pass = rules.every(row => row >= 0);
  return { results: [pass], rules: pass ? rules.map(row =>
    ({ x: left, right: split, y: row / PIXELS_PER_POINT, bottom: (row + 1) / PIXELS_PER_POINT })) : [] };
}

function bookmarkTargets(prepared, bodyLines) {
  // The body binding has already removed the caption, closing and running table headings.
  const html = prepared.bodyHtml;
  const headings = [...html.matchAll(/<h([1-6])>([\s\S]*?)<\/h\1>/gu)];
  let pageStart = 0;
  const ends = bodyLines.map(lines => pageStart += canonicalBody(lines.join(' ')).length);
  return headings.map(match => {
    const title = normalize(printedBodyText(match[2]));
    const start = canonicalBody(printedBodyText(html.slice(0, match.index))).length;
    return { title, page: ends.findIndex(end => end > start) + 1 };
  });
}

function checkBookmarks({ prepared, caption, info, typography, spacingBound, bodyLines, add }) {
  const label = 'Electronic navigational bookmarks';
  if (isNotice(caption) || prepared.bodyWords <= 4500 && !spacingBound) {
    add(label, isNotice(caption) ? 'not_applicable' : 'not_checked', isNotice(caption) ?
      'Section 202.5(a)(2) does not list a notice of motion.' : 'The printed body must match before applying the 4,500-word threshold.');
    return;
  }
  if (prepared.bodyWords <= 4500) {
    add(label, 'not_applicable', 'The bound electronic memorandum has no more than 4,500 words in the supplied body.');
    return;
  }
  const xml = typography && new TextDecoder().decode(typography);
  if (!spacingBound || !info || info.active || !/<\/pdf2xml>\s*$/u.test(xml ?? '')) {
    add(label, 'not_checked', 'A bound electronic memorandum over 4,500 words needs usable outline evidence from the submitted PDF.');
    return;
  }
  const outline = /<outline>([\s\S]*)<\/outline>/u.exec(xml)?.[1];
  if (!outline?.includes('<item')) {
    add(label, 'fail', 'No navigational outline items in the submitted electronic memorandum over 4,500 words.');
    return;
  }
  const targets = bookmarkTargets(prepared, bodyLines);
  const items = [...outline.matchAll(/<item(?: page="(\d+)")?>([^<]*)<\/item>/gu)];
  if (items.length !== (outline.match(/<item\b/gu)?.length ?? 0) ||
      targets.some(({ title, page }) => !items.some(([, destination, item]) =>
        Number(destination) === page && normalize(printedBodyText(item)) === title)) ||
      items.some(([, destination]) => !destination || Number(destination) < 1 || Number(destination) > info.count)) {
    add(label, 'fail', 'The PDF outline must resolve to the pages containing the memorandum section titles.');
    return;
  }
  add(label, 'not_checked', 'Poppler reports outline titles and page numbers only. It cannot prove the submitted PDF’s internal action and destination geometry. Use the sourced unprofiled route with independently verified bookmarks.');
}

export function newYorkPdfEvidence(context) {
  const { caption, profile, info, positioned, typography, add } = context;
  const known = positioned && info && !info.active;
  const footers = known && footerCandidates(positioned, info.count, profile.layout);
  const withinBoundary = footers && footers.every((words, index) => words?.every(({ bounds }) =>
    near(bounds.y, positioned[index].bounds.bottom - 88, 3) && bounds.bottom <= positioned[index].bounds.bottom - 72));
  add('Footer inside one-inch page boundary', !known ? 'not_checked' : withinBoundary ? 'pass' : 'fail',
    'The positioned footer is at the top of the bottom margin box and inside the one-inch page boundary.');
  const colors = typography && [...new TextDecoder().decode(typography).matchAll(/<fontspec\b[^>]* color="(#[0-9a-f]+)"/gu)];
  add('Black filing type', !colors?.length ? 'not_checked' : colors.every(([, color]) => color === '#000000') ? 'pass' : 'fail',
    'The measured PDF type is black under CPLR 2101(a).');
  add('Service proof treatment', caption.service.method === 'nyscef' ? 'advisory' : 'not_checked',
    caption.service.method === 'nyscef' ?
      'Verify NYSCEF participation for each recipient and retain effective notification and proof from NYSCEF. This draft records no service event.' :
      'Separate service proof is required. This profile cannot inspect or annex it. Use the sourced unprofiled route.');
  if (caption.motion.procedure !== 'ordinary') {
    add('Good-faith affirmation', 'not_checked',
      'Section 202.7 requires an applicable good-faith affirmation. This profile cannot inspect or annex it.');
  }
  add('Counsel completion', 'advisory', 'The composed signature and date lines are blank for filing counsel. Confirm the actual signing, dates and any count certification before release.');
  checkBookmarks(context);
}
