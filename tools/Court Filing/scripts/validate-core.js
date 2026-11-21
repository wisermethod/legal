import { filingTextChecks } from './filing-text-core.js';
import { validateCaption, validateProfile } from './schema-core.js';
import { footerCandidates, isExpectedPage, measureInk, readFonts, readPageInfo, readTextLines } from './pdf-evidence-core.js';

export const PASS = 'ALL CHECKS PASSED';
export const FAIL = 'VALIDATION FAILED';
export const MAX_PDF_PAGES = 200;

const decoder = new TextDecoder();
const resultOf = yes => yes ? 'pass' : 'fail';

function pdfLayoutChecks(add, profile, info, pdf, inspect, positioned) {
  const { layout } = profile;
  const unchecked = why => {
    add('Page size', 'not_checked', why);
    add('Embedded profile fonts', 'not_checked', why);
    add('Page-number footer', 'not_checked', why);
    add('Visible margin geometry', 'not_checked', why);
  };
  if (!info || info.count > MAX_PDF_PAGES) {
    unchecked(info ? 'Page inspection is limited to ' + MAX_PDF_PAGES + ' pages.' : 'PDF page metadata is unavailable.');
    return;
  }
  const wrongPages = info.pages.flatMap((page, i) => isExpectedPage(page, layout.page_size) ? [] : [i + 1]);
  const missingPageGeometry = info.pages.some(page => !page.rot || !page.MediaBox || !page.CropBox);
  add('Page size', missingPageGeometry ? 'not_checked' : resultOf(wrongPages.length === 0),
    missingPageGeometry ? 'MediaBox, CropBox or rotation data is unavailable.' :
      wrongPages.length ? 'Expected unrotated ' + layout.page_size + ' MediaBox and CropBox on page(s) ' + wrongPages.join(', ') + '.' :
        layout.page_size + ' MediaBox and CropBox on all pages.');

  const fontBytes = inspect('fonts', pdf);
  const fonts = fontBytes && readFonts(fontBytes);
  const rejected = fonts?.filter(font => !font.embedded || !layout.pdf_font_names.includes(font.name)) ?? [];
  add('Embedded profile fonts', fonts ? resultOf(fonts.length > 0 && rejected.length === 0) : 'not_checked',
    !fonts ? 'The PDF font inventory is unavailable.' : fonts.length === 0 ? 'The PDF has no listed fonts.' :
      rejected.length ? [...new Set(rejected.map(font => font.name + (font.embedded ? ' (outside profile)' : ' (not embedded)')))].join(', ') :
        [...new Set(fonts.map(font => font.name))].join(', '));

  const footers = footerCandidates(positioned, info.count, layout);
  const noGeometry = info.active || wrongPages.length > 0 || !footers;
  if (noGeometry) {
    const reason = info.active ? 'Interactive PDF fields or JavaScript make the printed appearance uncertain.' :
      wrongPages.length ? 'Expected page geometry is unavailable or does not match.' : 'Positioned PDF text is unavailable.';
    add('Page-number footer', 'not_checked', reason);
    add('Visible margin geometry', 'not_checked', reason);
    return;
  }

  const unreadable = [];
  const badFooters = [];
  const badMargins = [];
  for (let index = 0; index < info.count; index++) {
    const page = index + 1;
    const bytes = inspect('raster', pdf, page);
    const ink = bytes && measureInk(bytes, layout, footers[index]);
    if (!ink) unreadable.push(page);
    else if (ink.outside) badMargins.push(page);
    if (!footers[index] || ink?.footerVisible === false) badFooters.push(page);
  }
  const status = bad => bad.length ? 'fail' : unreadable.length ? 'not_checked' : 'pass';
  const detail = (bad, failure, success) => [
    bad.length ? failure + bad.join(', ') + '.' : null,
    unreadable.length ? 'Raster evidence unavailable for page(s) ' + unreadable.join(', ') + '.' : null,
  ].filter(Boolean).join(' ') || success;
  add('Page-number footer', status(badFooters), detail(badFooters, 'Expected visible footer missing or misplaced on page(s) ',
    'Each page has one visible ' + layout.footer.position + ' footer with its page number and total.'));
  add('Visible margin geometry', status(badMargins), detail(badMargins, 'Ink outside profile margins on page(s) ',
    'Visible ink is within the profile margins, allowing 1.5 pt for print rounding and excluding the matched footer words.'));
}

export function validate({ pdf, caption, profile, limits, bodySha256, digest, parseUnavailable = false }, inspect) {
  validateProfile(profile);
  validateCaption(caption, profile);
  const checks = [];
  const add = (label, status, detail) => checks.push({ label, status, detail });
  const pdfInfo = inspect('page-info', pdf);
  const info = pdfInfo && readPageInfo(pdfInfo);
  const textBytes = info && info.count <= MAX_PDF_PAGES ? inspect('text', pdf) : null;
  const extracted = textBytes ? decoder.decode(textBytes) : '';
  const text = extracted.trim() || null;
  const positionedBytes = info && info.count <= MAX_PDF_PAGES ? inspect('positioned-text', pdf) : null;
  const positioned = positionedBytes && readTextLines(positionedBytes, info.count);
  add('PDF parses', parseUnavailable ? 'not_checked' : resultOf(Boolean(info && text)),
    parseUnavailable ? 'A required Poppler program is unavailable. See unavailable.' :
      info && text ? info.count + ' page(s) with extractable text.' :
        info?.count > MAX_PDF_PAGES ? 'PDF exceeds the ' + MAX_PDF_PAGES + '-page inspection ceiling.' : 'No readable PDF text or page count.');
  if (limits.pages !== null) {
    add('Within page limit (' + limits.pages + ')', info ? resultOf(info.count <= limits.pages) : 'not_checked',
      info ? info.count + ' total PDF page(s), including any parts the rule exempts.' : 'PDF page count is unavailable.');
  }
  if (limits.choice === 'no-length-limit') {
    add('No length limit declared', 'pass', limits.reason);
  } else if (!['profile-preset', 'explicit-maxima'].includes(limits.choice) ||
             (limits.pages === null && limits.words === null)) {
    add('Length limit choice', 'fail', 'Select a profile preset or explicit maxima, or declare why no length limit applies.');
  }
  const { bodyWords, pdfBodyWords } = filingTextChecks({ caption, profile, extracted, info, bodySha256, digest, add, positioned });
  if (limits.words !== null) {
    add('Within word limit (' + limits.words + ')', pdfBodyWords === null || bodyWords === null ? 'not_checked' : resultOf(Math.max(pdfBodyWords, bodyWords) <= limits.words),
      pdfBodyWords === null || bodyWords === null ? 'The PDF body or composition word count is unavailable.' :
        pdfBodyWords + ' words in the rendered PDF body and ' + bodyWords + ' in the composed Markdown.');
  }
  pdfLayoutChecks(add, profile, info, pdf, inspect, positioned);
  const ok = checks.every(check => check.status === 'pass' || check.status === 'not_applicable');
  return { ok, result: ok ? PASS : FAIL, pages: info?.count ?? null, bodyWords, pdfBodyWords, bodySha256, limits, checks };
}
