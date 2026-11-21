import { validateCaption, validateProfile } from './schema-core.js';
import { footerCandidates, isExpectedPage, measureInk, readFonts, readPageInfo } from './pdf-evidence-core.js';

export const PASS = 'ALL CHECKS PASSED';
export const FAIL = 'VALIDATION FAILED';
export const MAX_PDF_PAGES = 200;

const normalize = text => text.replace(/\s+/gu, ' ').trim();
const decoder = new TextDecoder();
const resultOf = yes => yes ? 'pass' : 'fail';

function literal(text, expected, edge = '\\p{L}\\p{N}_') {
  const escaped = expected.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?:^|[^' + edge + '])' + escaped + '(?![' + edge + '])', 'u').test(text);
}

export function countWords(bodyHtml) {
  // Separate blocks while preserving inline text split by emphasis and links.
  const text = bodyHtml
    .replace(/<\/?(?:p|li|[ou]l|blockquote|h[1-6]|pre|br|hr|table|thead|tbody|tr|td|th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&Tab;|&NewLine;|&#(?:0*(?:9|10|11|12|13|32|133|160|5760|819[2-9]|820[01]|823[239]|8287|12288)|x0*(?:0?[9a-d]|20|85|a0|1680|200[0-9a]|202[89f]|205f|3000));?/gi, ' ');
  return normalize(text).match(/\S+/gu)?.length ?? 0;
}

function textChecks(add, caption, profile, text, firstPage) {
  const status = predicate => text === null ? 'not_checked' : resultOf(predicate());
  const evidence = value => text === null ? 'Extractable PDF text is unavailable.' : value;
  add('Case number present', status(() => literal(text, normalize(caption.case_number), '\\p{L}\\p{N}_-')), evidence(caption.case_number));
  add('Document title present', status(() => literal(firstPage.toUpperCase(), normalize(caption.title).toUpperCase())), evidence(caption.title));
  add('COURT USE ONLY caption marker', status(() => literal(firstPage.toUpperCase(), 'COURT USE ONLY')), evidence('First-page text'));
  if (caption.service) {
    add('Certificate of service present', status(() => literal(text.toUpperCase(), 'CERTIFICATE OF SERVICE')), evidence('PDF text'));
  } else {
    const reason = caption.no_service_certificate;
    add('Certificate of service present', 'not_applicable',
      'Not applicable by declaration (' + reason + '): ' + profile.no_service_certificate_reasons[reason]);
  }
  add('Signer name present', status(() => literal(text, normalize(caption.signer.name))), evidence(caption.signer.name));
  for (const recipient of caption.service?.recipients ?? []) {
    for (const email of recipient.emails) {
      add('Service email present: ' + email,
        status(() => literal(text, email, "\\p{L}\\p{N}@._%+!#&'=/^~-")), evidence(email));
    }
  }
}

function pdfLayoutChecks(add, profile, info, pdf, inspect) {
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

  const tsv = inspect('positioned-text', pdf);
  const footers = tsv && footerCandidates(tsv, info.count, layout);
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

export function validate({ pdf, caption, profile, limits, bodyHtml, parseUnavailable = false }, inspect) {
  validateProfile(profile);
  validateCaption(caption, profile);
  const checks = [];
  const add = (label, status, detail) => checks.push({ label, status, detail });
  const pdfInfo = inspect('page-info', pdf);
  const info = pdfInfo && readPageInfo(pdfInfo);
  const textBytes = info && info.count <= MAX_PDF_PAGES ? inspect('text', pdf) : null;
  const extracted = textBytes ? decoder.decode(textBytes) : '';
  const text = normalize(extracted) || null;
  const firstPage = normalize(extracted.split('\f', 1)[0]);
  add('PDF parses', parseUnavailable ? 'not_checked' : resultOf(Boolean(info && text)),
    parseUnavailable ? 'A required Poppler program is unavailable. See unavailable.' :
      info && text ? info.count + ' page(s) with extractable text.' :
        info?.count > MAX_PDF_PAGES ? 'PDF exceeds the ' + MAX_PDF_PAGES + '-page inspection ceiling.' : 'No readable PDF text or page count.');
  if (limits.pages !== null) {
    add('Within page limit (' + limits.pages + ')', info ? resultOf(info.count <= limits.pages) : 'not_checked',
      info ? info.count + ' total PDF page(s), including any parts the rule exempts.' : 'PDF page count is unavailable.');
  }
  const words = bodyHtml === undefined ? null : countWords(bodyHtml);
  if (limits.words !== null) {
    add('Within word limit (' + limits.words + ')', words === null ? 'not_checked' : resultOf(words <= limits.words),
      words === null ? 'Pass --body with the Markdown used to compose this filing.' : words + ' words in the supplied Markdown body.');
  }
  textChecks(add, caption, profile, text, firstPage);
  pdfLayoutChecks(add, profile, info, pdf, inspect);
  const ok = checks.every(check => check.status === 'pass' || check.status === 'not_applicable');
  return { ok, result: ok ? PASS : FAIL, pages: info?.count ?? null, bodyWords: words, limits, checks };
}
