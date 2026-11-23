import { validateCourtMatch } from './compose-core.js';
import { filingTextChecks } from './filing-text-core.js';
import { documentType, resolveLimits, titleChecks, validateCaption, validateProfile } from './schema-core.js';
import { footerCandidates, isExpectedPage, measureInk, readFonts, readPageInfo, readTextLines, readTypography, tableTypography, imagesAbsent, paragraphSpacing, bodySpacing, filingInk, markPositions } from './pdf-evidence-core.js';
import { getLayout } from './layout-index-core.js';

export const PASS = 'ALL CHECKS PASSED';
export const REPLAY_PASS = 'REPLAY CHECKS PASSED - NOT FOR FILING';
export const FAIL = 'VALIDATION FAILED';
export const MAX_PDF_PAGES = 200;

const decoder = new TextDecoder();
const resultOf = yes => yes ? 'pass' : 'fail';
function pdfLayoutChecks(forEvidence, profile, info, pdf, inspect, positioned, bodyLines, prepared, repeated) {
  const { layout } = profile;
  const { captionEvidence: caption, judicialEvidence } = getLayout(profile.renderer_profile);
  const unchecked = why => {
    const add = forEvidence(['page-info']);
    add('Profile type size', 'not_checked', why);
    add('Body paragraph spacing', 'not_checked', why);
    add('No embedded page images', 'not_checked', why);
    for (const [label] of caption.checks) add(label, 'not_checked', why);
    if (prepared.ruledClosing) add(judicialEvidence.label, 'not_checked', why);
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
  const measured = (kinds, name, evidence, detail, page) => forEvidence(kinds, page)(
    name, evidence === null ? 'not_checked' : resultOf(evidence), detail);
  const wrongPages = info.pages.flatMap((page, i) => isExpectedPage(page, layout.page_size) ? [] : [i + 1]);
  const missingPageGeometry = info.pages.some(page => !page.rot || !page.MediaBox || !page.CropBox);
  forEvidence(['page-info'])('Page size', missingPageGeometry ? 'not_checked' : resultOf(wrongPages.length === 0),
    missingPageGeometry ? 'MediaBox, CropBox or rotation data is unavailable.' :
      wrongPages.length ? 'Expected unrotated ' + layout.page_size + ' MediaBox and CropBox on page(s) ' + wrongPages.join(', ') + '.' :
        layout.page_size + ' MediaBox and CropBox on all pages.');

  const fontBytes = inspect('fonts', pdf);
  const fonts = fontBytes && readFonts(fontBytes);
  const rejected = fonts?.filter(font => !font.embedded || !layout.pdf_font_names.includes(font.name)) ?? [];
  forEvidence(['fonts'])('Embedded profile fonts', fonts ? resultOf(fonts.length > 0 && rejected.length === 0) : 'not_checked',
    !fonts ? 'The PDF font inventory is unavailable.' : fonts.length === 0 ? 'The PDF has no listed fonts.' :
      rejected.length ? [...new Set(rejected.map(font => font.name + (font.embedded ? ' (outside profile)' : ' (not embedded)')))].join(', ') :
        [...new Set(fonts.map(font => font.name))].join(', '));

  const tableText = tableTypography(prepared, bodyLines, repeated, layout);
  const typography = readTypography(inspect('typography', pdf), info.count, layout, tableText);
  const spacing = paragraphSpacing(positioned, bodyLines, prepared.paragraphs, layout);
  const noImages = imagesAbsent(inspect('images', pdf));
  measured(['typography', 'text', 'positioned-text'], 'Profile type size', typography,
    'Measured type sizes must match the profile and any declared table font size.');
  measured(['text', 'positioned-text'], 'Body paragraph spacing', spacing,
    'Measured successive lines within composed prose paragraphs must use the profile spacing.');
  measured(['images'], 'No embedded page images', noImages,
    'The composed filing body and blocks use text and ruling. File exhibits separately.');

  const footers = footerCandidates(positioned, info.count, layout);
  const noGeometry = info.active || wrongPages.length > 0 || !footers;
  if (noGeometry) {
    const add = forEvidence(['positioned-text']);
    const reason = info.active ? 'Interactive PDF fields or JavaScript make the printed appearance uncertain.' :
      wrongPages.length ? 'Expected page geometry is unavailable or does not match.' : 'Positioned PDF text is unavailable.';
    for (const [label] of caption.checks) add(label, 'not_checked', reason);
    if (prepared.ruledClosing) add(judicialEvidence.label, 'not_checked', reason);
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
    const ruling = index === 0 ? caption.inspect(bytes, layout, positioned[0]) : {};
    if (index === 0) caption.checks.forEach(([label, detail], i) =>
      measured(['raster'], label, ruling.results[i], detail, page));
    const ruled = prepared.ruledClosing && index === info.count - 1;
    const judicialRule = ruled ? judicialEvidence.inspect(bytes, layout, positioned[index]) : null;
    if (ruled) measured(['raster'], judicialEvidence.label, judicialRule === null ? null : Boolean(judicialRule),
      judicialEvidence.detail, page);
    const rulingRegions = [...(ruling.rules ?? []), ...(judicialRule ? [judicialRule] : [])];
    if (marks && filingInk(bytes, layout, positioned[index], marks[index], rulingRegions) === false) badInk.push(page);
    if (!footers[index] || ink?.footerVisible === false) badFooters.push(page);
  }
  const status = bad => bad.length ? 'fail' : unreadable.length ? 'not_checked' : 'pass';
  const detail = (bad, failure, success) => [
    bad.length ? failure + bad.join(', ') + '.' : null,
    unreadable.length ? 'Raster evidence unavailable for page(s) ' + unreadable.join(', ') + '.' : null,
  ].filter(Boolean).join(' ') || success;
  const add = forEvidence(['raster']);
  add('Page-number footer', status(badFooters), detail(badFooters, 'Expected visible footer missing or misplaced on page(s) ',
    'Each page has one visible ' + layout.footer.position + ' footer with its page number' +
      (layout.footer.format.includes('{pages}') ? ' and total.' : '.')));
  add('Visible filing ink', marks ? status(badInk) : 'not_checked', marks ?
    detail(badInk, 'Invisible text, missing marks or unexpected visible ink on page(s) ',
      'Positioned words have ink, and ink is confined to the expected text, marks, caption ruling and signature areas.') :
    'Could not locate a composed list marker or rule against the positioned PDF text.');
  add('Visible margin geometry', status(badMargins), detail(badMargins, 'Ink outside profile margins on page(s) ',
    'Visible ink is within the profile margins, allowing 1.5 pt for print rounding and excluding the matched footer words.'));
}

export function validate({
  pdf, caption, profile, limitOptions, prepared, replay = false, parseUnavailable = false,
  inspectionDetail = () => '', validationDate = new Date(),
}, inspect) {
  validateProfile(profile);
  validateCaption(caption, profile, 'caption', replay);
  validateCourtMatch(caption.court, profile);
  let limits = resolveLimits(profile, caption, limitOptions);
  const { bodySha256, bodyWords } = prepared;
  const title = titleChecks(profile, caption);
  const checks = [...title];
  const forEvidence = (kinds, page) => (label, status, detail, counts) => {
    const reason = status === 'not_checked' || status === 'fail' ? inspectionDetail(kinds, page) : '';
    const check = { label, status, detail: reason ? detail + ' ' + reason : detail };
    checks.push(counts ? { ...check, counts } : check);
  };
  const add = forEvidence([]);
  const order = limits.order;
  if (order) {
    for (const [unit, ceiling] of Object.entries(order.aboveProfile)) {
      add('Order ceiling above profile (' + unit + ')', 'advisory',
        'The ceiling of ' + order[unit] + ' ' + unit + ' set by order exceeds the profile figure of ' + ceiling +
        '. Confirm its applicability at preview against ' + order.source + '.');
    }
  }
  const pdfInfo = inspect('page-info', pdf);
  const info = pdfInfo && readPageInfo(pdfInfo);
  const textBytes = info && info.count <= MAX_PDF_PAGES ? inspect('text', pdf) : null;
  const extracted = textBytes ? decoder.decode(textBytes) : '';
  const text = extracted.trim() || null;
  const positionedBytes = info && info.count <= MAX_PDF_PAGES ? inspect('positioned-text', pdf) : null;
  const positioned = positionedBytes && readTextLines(positionedBytes, info.count);
  forEvidence(['page-info', 'text'])('PDF parses', parseUnavailable ? 'not_checked' : resultOf(Boolean(info && text)),
    parseUnavailable ? 'A required Poppler program is unavailable. See unavailable.' :
      info && text ? info.count + ' page(s) with extractable text.' :
        info?.count > MAX_PDF_PAGES ? 'PDF exceeds the ' + MAX_PDF_PAGES + '-page inspection ceiling.' : 'No readable PDF text or page count.');
  const alternatives = limits.choice === 'profile-alternatives' ||
    limits.choice === 'explicit-maxima' && documentType(profile, caption).length_mode === 'alternatives' &&
    limits.pages !== null && limits.words !== null;
  if (!alternatives && limits.pages !== null) {
    forEvidence(['page-info'])('Within page limit (' + limits.pages + (order?.pages ? ', set by order)' : ')'),
      info ? resultOf(info.count <= limits.pages) : 'not_checked',
      info ? info.count + ' total PDF page(s), including any parts the rule exempts.' : 'PDF page count is unavailable.');
  }
  if (limits.choice === 'no-length-limit') {
    add('No length preset for profile document type', 'pass', 'This type has no length preset in the profile.');
  }
  const textEvidence = forEvidence(['page-info', 'text', 'positioned-text']);
  const { pdfBodyWords, bodyLines, repeated, spacingBound } = filingTextChecks({
    caption, profile, extracted, info, prepared, add: textEvidence, positioned, validationDate, replay,
  });
  if (alternatives) {
    const pageCount = info?.count ?? null;
    const wordCount = pdfBodyWords === null || bodyWords === null ? null : Math.max(pdfBodyWords, bodyWords);
    const satisfiedBy = [
      ...(pageCount !== null && pageCount <= limits.pages ? ['pages'] : []),
      ...(wordCount !== null && wordCount <= limits.words ? ['words'] : []),
    ];
    limits = { ...limits, satisfiedBy };
    const count = value => value ?? 'unavailable';
    const detail = count(pageCount) + ' PDF pages against ' + limits.pages + '; ' +
      count(bodyWords) + ' composed body words and ' + count(pdfBodyWords) + ' PDF body words against ' + limits.words + '. ' +
      (satisfiedBy.length ? 'Satisfied by: ' + satisfiedBy.join(' and ') + '.' : 'Neither alternative was established.');
    textEvidence('Within a profile length alternative', satisfiedBy.length ? 'pass' :
      pageCount === null || wordCount === null ? 'not_checked' : 'fail', detail,
    { pageCount, bodyWords, pdfBodyWords });
    if (satisfiedBy.length === 1) {
      const [unit, measured, quantity] = satisfiedBy[0] === 'words' ?
        ['pages', pageCount, 'PDF pages'] : ['words', wordCount, 'body words'];
      const target = limitOptions?.[unit];
      if (target !== undefined && measured !== null && measured > target) {
        add('Target exceeded (' + unit + ')', 'advisory',
          'The filing has ' + measured + ' ' + quantity + ' against a target of ' + target + '. ' +
          'Pass a ceiling set by an order or rule with --order-max-' + unit +
          ' and --order-source. For this custom type an order replaces the profile pair and is enforced on its own unit.');
      }
    }
  } else if (limits.words !== null) {
    textEvidence('Within word limit (' + limits.words + (order?.words ? ', set by order)' : ')'),
      pdfBodyWords === null || bodyWords === null ? 'not_checked' : resultOf(Math.max(pdfBodyWords, bodyWords) <= limits.words),
      pdfBodyWords === null || bodyWords === null ? 'The PDF body or composition word count is unavailable.' :
        pdfBodyWords + ' words in the rendered PDF body and ' + bodyWords + ' for the composed body. ' +
        'Both counts include ordered-list markers and exclude caption, filer signature and certificate. ' +
        'Composition uses the higher of the printed-text count and the Markdown token count.');
  }
  const spacingScope = documentType(profile, caption).double_spacing ?? [];
  const spacingLayout = getLayout(profile.renderer_profile).spacing(profile.layout);
  const spacing = spacingBound && positioned && !info.active ?
    bodySpacing(positioned, bodyLines, repeated, prepared.bodyHtml, profile.layout, spacingLayout) : null;
  const failedSpacing = spacingScope.filter(kind => spacing?.[kind] > 0);
  const spacingStatus = !spacing ? (spacingScope.length ? 'not_checked' : 'advisory') :
    failedSpacing.length ? 'fail' : spacing.underDoubleLines ? 'advisory' : 'pass';
  const spacingDetail = spacing ?
    spacing.underDoubleLines + ' of ' + spacing.totalLines + ' printed body lines (' + (100 * spacing.share).toFixed(1) +
      '%) below double spacing in tables, lists or headings (' + spacing.table + ' table, ' + spacing.list + ' list, ' +
      spacing.heading + ' heading). ' + spacing.estimatedLines + ' line(s) use retained layout where the PDF has no matched successive baseline.' :
    'A matching body and positioned PDF text are needed to count spacing.';
  const spacingAction = failedSpacing.length ?
    ' The document type requires double spacing for ' + failedSpacing.join(', ') + ' under ' + profile.validation.double_spacing.citation + '.' :
    spacingStatus === 'advisory' ? ' Inspect these elements in the human preview.' : '';
  textEvidence('Table, list and heading double spacing', spacingStatus, spacingDetail + spacingAction, spacing);
  pdfLayoutChecks(forEvidence, profile, info, pdf, inspect, positioned, bodyLines, prepared, repeated);
  const ok = checks.every(check => ['pass', 'not_applicable', 'advisory'].includes(check.status));
  return { ok, result: ok ? (replay ? REPLAY_PASS : PASS) : FAIL, pages: info?.count ?? null, bodyWords, pdfBodyWords, bodySha256,
    documentType: caption.document_type, limits, checks, advisories: checks.filter(check => check.status === 'advisory') };
}
