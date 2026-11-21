import { filingTextChecks } from './filing-text-core.js';
import { documentType, resolveLimits, validateCaption, validateProfile } from './schema-core.js';
import { footerCandidates, isExpectedPage, measureInk, readFonts, readPageInfo, readTextLines, readTypography, imagesAbsent, paragraphSpacing, captionRuling, judicialRuling, filingInk, markPositions } from './pdf-evidence-core.js';

export const PASS = 'ALL CHECKS PASSED';
export const FAIL = 'VALIDATION FAILED';
export const MAX_PDF_PAGES = 200;

const decoder = new TextDecoder();
const resultOf = yes => yes ? 'pass' : 'fail';

function pdfLayoutChecks(add, profile, info, pdf, inspect, positioned, bodyLines, prepared) {
  const { layout } = profile;
  const unchecked = why => {
    add('Profile type size', 'not_checked', why);
    add('Body paragraph spacing', 'not_checked', why);
    add('No embedded page images', 'not_checked', why);
    add('Boxed caption ruling', 'not_checked', why);
    if (prepared.ruledClosing) add('Visible judicial signature ruling', 'not_checked', why);
    add('Page size', 'not_checked', why);
    add('Embedded profile fonts', 'not_checked', why);
    add('Page-number footer', 'not_checked', why);
    add('Visible margin geometry', 'not_checked', why);
    add('Visible filing ink', 'not_checked', why);
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

  const typography = readTypography(inspect('typography', pdf), info.count, layout);
  const spacing = paragraphSpacing(positioned, bodyLines, prepared.paragraphs, layout);
  const noImages = imagesAbsent(inspect('images', pdf));
  const measured = (name, evidence, detail) => add(name, evidence === null ? 'not_checked' : resultOf(evidence), detail);
  measured('Profile type size', typography, 'Measured body, caption and footer type sizes must match the profile.');
  measured('Body paragraph spacing', spacing, 'Measured successive lines within composed prose paragraphs must use the profile spacing.');
  measured('No embedded page images', noImages, 'The composed filing body and blocks use text and ruling. File exhibits separately.');

  const footers = footerCandidates(positioned, info.count, layout);
  const noGeometry = info.active || wrongPages.length > 0 || !footers;
  if (noGeometry) {
    const reason = info.active ? 'Interactive PDF fields or JavaScript make the printed appearance uncertain.' :
      wrongPages.length ? 'Expected page geometry is unavailable or does not match.' : 'Positioned PDF text is unavailable.';
    add('Boxed caption ruling', 'not_checked', reason);
    if (prepared.ruledClosing) add('Visible judicial signature ruling', 'not_checked', reason);
    add('Page-number footer', 'not_checked', reason);
    add('Visible margin geometry', 'not_checked', reason);
    add('Visible filing ink', 'not_checked', reason);
    return;
  }

  const unreadable = [];
  const badFooters = [];
  const badMargins = [];
  const badInk = [];
  const marks = markPositions(positioned, bodyLines, prepared.marks);
  for (let index = 0; index < info.count; index++) {
    const page = index + 1;
    const bytes = inspect('raster', pdf, page);
    const ink = bytes && measureInk(bytes, layout, footers[index]);
    if (!ink) unreadable.push(page);
    else if (ink.outside) badMargins.push(page);
    const box = index === 0 ? captionRuling(bytes, layout, positioned[0]) : null;
    if (index === 0) measured('Boxed caption ruling', box === null ? null : Boolean(box),
      'Visible outer box, column divider and title separator on the first page.');
    const ruled = prepared.ruledClosing && index === info.count - 1;
    const judicialRule = ruled ? judicialRuling(bytes, layout, positioned[index]) : null;
    if (ruled) measured('Visible judicial signature ruling', judicialRule === null ? null : Boolean(judicialRule),
      'Visible blank rule between the court heading and judge designation.');
    if (marks && filingInk(bytes, layout, positioned[index], box, judicialRule, marks[index]) === false) badInk.push(page);
    if (!footers[index] || ink?.footerVisible === false) badFooters.push(page);
  }
  const status = bad => bad.length ? 'fail' : unreadable.length ? 'not_checked' : 'pass';
  const detail = (bad, failure, success) => [
    bad.length ? failure + bad.join(', ') + '.' : null,
    unreadable.length ? 'Raster evidence unavailable for page(s) ' + unreadable.join(', ') + '.' : null,
  ].filter(Boolean).join(' ') || success;
  add('Page-number footer', status(badFooters), detail(badFooters, 'Expected visible footer missing or misplaced on page(s) ',
    'Each page has one visible ' + layout.footer.position + ' footer with its page number and total.'));
  add('Visible filing ink', marks ? status(badInk) : 'not_checked', marks ?
    detail(badInk, 'Invisible text, missing marks or unexpected visible ink on page(s) ',
      'Positioned words have ink, and ink is confined to the expected text, marks, caption ruling and signature areas.') :
    'Could not locate a composed list marker or rule against the positioned PDF text.');
  add('Visible margin geometry', status(badMargins), detail(badMargins, 'Ink outside profile margins on page(s) ',
    'Visible ink is within the profile margins, allowing 1.5 pt for print rounding and excluding the matched footer words.'));
}

export function validate({ pdf, caption, profile, limits, prepared, parseUnavailable = false }, inspect) {
  validateProfile(profile);
  validateCaption(caption, profile);
  const verifiedLimits = resolveLimits(profile, caption, {
    preset: limits.preset ?? undefined,
    pages: limits.choice === 'explicit-maxima' ? limits.pages ?? undefined : undefined,
    words: limits.choice === 'explicit-maxima' ? limits.words ?? undefined : undefined,
    noLimit: limits.choice === 'no-length-limit',
  });
  limits = verifiedLimits;
  const { bodySha256, bodyWords } = prepared;
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
    add('No length limit for profile document type', resultOf(documentType(profile, caption).length_presets === null),
      caption.document_type);
  }
  const { pdfBodyWords, bodyLines } = filingTextChecks({ caption, profile, extracted, info, prepared, add, positioned });
  if (limits.words !== null) {
    add('Within word limit (' + limits.words + ')', pdfBodyWords === null || bodyWords === null ? 'not_checked' : resultOf(Math.max(pdfBodyWords, bodyWords) <= limits.words),
      pdfBodyWords === null || bodyWords === null ? 'The PDF body or composition word count is unavailable.' :
        pdfBodyWords + ' words in the rendered PDF body and ' + bodyWords + ' in the composed Markdown.');
  }
  pdfLayoutChecks(add, profile, info, pdf, inspect, positioned, bodyLines, prepared);
  const ok = checks.every(check => check.status === 'pass' || check.status === 'not_applicable');
  return { ok, result: ok ? PASS : FAIL, pages: info?.count ?? null, bodyWords, pdfBodyWords, bodySha256, documentType: caption.document_type, limits, checks };
}
