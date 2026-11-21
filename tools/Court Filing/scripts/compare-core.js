import { normalize } from './body-text-core.js';
import { RASTER_DPI, readPageInfo } from './pdf-evidence-core.js';
import { MAX_PDF_PAGES } from './validate-core.js';

const decoder = new TextDecoder();
const MAX_DIFF_CELLS = 2_000_000;

function tokenDiff(reference, rebuilt) {
  let start = 0;
  while (start < reference.length && reference[start] === rebuilt[start]) start++;
  let leftEnd = reference.length;
  let rightEnd = rebuilt.length;
  while (leftEnd > start && rightEnd > start && reference[leftEnd - 1] === rebuilt[rightEnd - 1]) {
    leftEnd--;
    rightEnd--;
  }
  const left = reference.slice(start, leftEnd);
  const right = rebuilt.slice(start, rightEnd);
  if (!left.length && !right.length) return { granularity: 'tokens', changes: [] };
  const change = (i, j, removed, inserted) => ({ referenceStart: start + i, rebuiltStart: start + j,
    referenceTokens: removed, rebuiltTokens: inserted });
  const columns = right.length + 1;
  const cells = (left.length + 1) * columns;
  if (!left.length || !right.length || cells > MAX_DIFF_CELLS) {
    return { granularity: cells > MAX_DIFF_CELLS && left.length && right.length ? 'changed-span' : 'tokens',
      changes: [change(0, 0, left, right)] };
  }

  // Find common tokens inside the changed span so insertions do not shift the entire diff.
  const lengths = new Uint32Array(cells);
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      const at = i * columns + j;
      lengths[at] = left[i] === right[j] ? lengths[at + columns + 1] + 1 :
        Math.max(lengths[at + columns], lengths[at + 1]);
    }
  }
  const changes = [];
  let pending;
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      pending = undefined;
      i++;
      j++;
      continue;
    }
    if (!pending) {
      pending = change(i, j, [], []);
      changes.push(pending);
    }
    if (j === right.length || i < left.length && lengths[(i + 1) * columns + j] >= lengths[i * columns + j + 1]) {
      pending.referenceTokens.push(left[i++]);
    } else {
      pending.rebuiltTokens.push(right[j++]);
    }
  }
  return { granularity: 'tokens', changes };
}

function tokenInventory(reference, rebuilt) {
  const counts = new Map();
  for (const token of reference) counts.set(token, (counts.get(token) ?? 0) + 1);
  for (const token of rebuilt) counts.set(token, (counts.get(token) ?? 0) - 1);
  return Array.from(counts, ([token, delta]) => ({ token, delta })).filter(({ delta }) => delta !== 0);
}

function raster(bytes) {
  const header = bytes && /^P6\s+(\d+)\s+(\d+)\s+255\n/u.exec(decoder.decode(bytes.subarray(0, 64)));
  if (!header) return null;
  const width = Number(header[1]);
  const height = Number(header[2]);
  const pixels = bytes.subarray(header[0].length);
  if (!width || !height || pixels.length !== width * height * 3) return null;
  return { width, height, pixels };
}

function compareRaster(reference, rebuilt) {
  const overlapWidth = reference && rebuilt ? Math.min(reference.width, rebuilt.width) : 0;
  const overlapHeight = reference && rebuilt ? Math.min(reference.height, rebuilt.height) : 0;
  const overlap = overlapWidth * overlapHeight;
  const area = page => page ? page.width * page.height : 0;
  const totalPixels = area(reference) + area(rebuilt) - overlap;
  let differingPixels = totalPixels - overlap;
  for (let y = 0; y < overlapHeight; y++) {
    for (let x = 0; x < overlapWidth; x++) {
      const a = 3 * (y * reference.width + x);
      const b = 3 * (y * rebuilt.width + x);
      if (reference.pixels[a] !== rebuilt.pixels[b] ||
          reference.pixels[a + 1] !== rebuilt.pixels[b + 1] ||
          reference.pixels[a + 2] !== rebuilt.pixels[b + 2]) differingPixels++;
    }
  }
  const pixelsWideHigh = page => page ? [page.width, page.height] : null;
  return {
    referencePixels: pixelsWideHigh(reference), rebuiltPixels: pixelsWideHigh(rebuilt),
    totalPixels, differingPixels, differencePercent: 100 * differingPixels / totalPixels,
  };
}

function inspectDocument(pdf, inspect, label) {
  const infoBytes = inspect('page-info', pdf);
  const info = infoBytes && readPageInfo(infoBytes);
  if (!info || info.count > MAX_PDF_PAGES || info.pages.some(page =>
    page.size?.length !== 2 || page.size.some(point => !Number.isFinite(point) || point <= 0))) {
    throw new Error(label + ' has unreadable page geometry or exceeds ' + MAX_PDF_PAGES + ' pages. Supply a readable PDF within that limit.');
  }
  const textBytes = inspect('comparison-text', pdf);
  if (!textBytes) throw new Error(label + ' could not be read by pdftotext. Supply a readable PDF.');
  const text = normalize(decoder.decode(textBytes).normalize('NFC'));
  return { text, tokens: text ? text.split(' ') : [], pages: info.count,
    pageSizesPt: info.pages.map(page => page.size) };
}

export function comparePdfs(reference, rebuilt, inspect) {
  const a = inspectDocument(reference, inspect, 'Reference PDF');
  const b = inspectDocument(rebuilt, inspect, 'Rebuilt PDF');
  const perPage = Array.from({ length: Math.max(a.pages, b.pages) }, (_, index) => {
    const page = index + 1;
    const left = page <= a.pages ? raster(inspect('color-raster', reference, page)) : null;
    const right = page <= b.pages ? raster(inspect('color-raster', rebuilt, page)) : null;
    if (page <= a.pages && !left || page <= b.pages && !right) {
      throw new Error('Could not rasterize page ' + page + ' of both available PDFs. Check that Poppler can render the page.');
    }
    return { page, ...compareRaster(left, right) };
  });
  return {
    label: 'Not for filing',
    note: 'A signature or filled date on the reference is expected to differ.',
    reference: { pages: a.pages, pageSizesPt: a.pageSizesPt, textTokens: a.tokens.length },
    rebuilt: { pages: b.pages, pageSizesPt: b.pageSizesPt, textTokens: b.tokens.length },
    samePageCount: a.pages === b.pages,
    samePageSizes: a.pages === b.pages && a.pageSizesPt.every((size, i) => size.every((point, j) => point === b.pageSizesPt[i][j])),
    text: { equal: a.text === b.text, normalization: 'NFC and collapsed whitespace',
      ...tokenDiff(a.tokens, b.tokens), inventoryDelta: tokenInventory(a.tokens, b.tokens) },
    raster: { dpi: RASTER_DPI, perPage },
  };
}
