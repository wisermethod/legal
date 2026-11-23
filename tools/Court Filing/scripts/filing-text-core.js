import { canonicalBody, normalize } from './body-text-core.js';
import { compositionTitle, REPLAY_TITLE_SUFFIX } from './composition-core.js';
import { getLayout } from './layout-index-core.js';
import { documentType } from './schema-fields-core.js';

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

export function removeRepeatedHeaders(pages, headers) {
  let prior = '';
  let aligned = true;
  const repeated = [];
  const cleaned = pages.map((lines, index) => {
    if (index > 0) {
      const pageText = canonicalBody(lines.join(' '));
      const header = headers.find(({ offset, end, text }) => text && offset + text.length <= prior.length && prior.length < end &&
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

export function bodyEvidence(pages, expected, positioned) {
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
    pdfBodyWords: wordsMatch ? sourceTokens.length : rawBreaks.size || null,
  };
}

export function filingTextChecks({ caption, profile, extracted, info, prepared, add, positioned, validationDate, replay }) {
  const check = (label, passes, detail) => add(label, extracted ? (passes ? 'pass' : 'fail') : 'not_checked',
    extracted ? detail : 'Extractable PDF text is unavailable.');
  const pages = stripFooters(extracted, profile.layout.footer.format, info?.count ?? 1);
  const first = pages[0] ?? [];
  const renderer = getLayout(profile.renderer_profile);
  const titleEnd = renderer.captionText({ first, caption, profile, check, positioned: positioned?.[0], extracted });
  const bodyPages = [first.slice(Math.max(0, titleEnd)), ...pages.slice(1)];
  const remainder = bodyPages.flat();
  const treatment = documentType(profile, caption);
  const digestTitle = compositionTitle(prepared.bodySha256);
  const printedTitle = info?.title ?? '';
  const markedReplay = printedTitle.endsWith(REPLAY_TITLE_SUFFIX);
  const title = markedReplay ? printedTitle.slice(0, -REPLAY_TITLE_SUFFIX.length) : printedTitle;
  if (replay || markedReplay) {
    check('PDF replay metadata', markedReplay === replay, replay ?
      'Replay PDF title must include Not for filing.' : 'Not for filing PDFs require --replay and cannot pass production validation.');
  }
  const metadataSuffix = title.slice(digestTitle.length);
  const digestTitleMatches = markedReplay === replay && title.startsWith(digestTitle) &&
    (metadataSuffix === '' || renderer.matchesMetadataSuffix?.(metadataSuffix, treatment));
  let remaining = renderer.closing({ caption, prepared, treatment, remainder, bodyPages, extracted, check, add, validationDate });
  const bodyLines = titleEnd > 0 ? bodyPages.map(lines => {
    const part = lines.slice(0, Math.max(0, remaining));
    remaining -= part.length;
    return part;
  }) : [];
  const exactCharacters = canonicalBody(bodyLines.flat().join(' ')) === canonicalBody(prepared.bodyText);
  const continued = exactCharacters ? { pages: bodyLines, aligned: true, repeated: [] } : removeRepeatedHeaders(bodyLines, prepared.headers);
  check('Continued table header alignment', continued.aligned, 'A repeated header must occupy complete lines at the top of its continuation page.');
  const evidence = bodyEvidence(continued.pages, prepared.bodyText, positioned);
  check('Composed body SHA-256', digestTitleMatches, 'The PDF title carries the supplied Markdown SHA-256.');
  check('Printed PDF body matches composition', evidence.wordsMatch,
    'Compare independently parsed Markdown with the PDF body after removing expected running headers.');
  return {
    pdfBodyWords: evidence.pdfBodyWords, bodyLines: continued.pages, repeated: continued.repeated,
    spacingBound: continued.aligned && evidence.wordsMatch,
  };
}
