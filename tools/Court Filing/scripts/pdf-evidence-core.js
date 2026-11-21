import { PAGE_SIZES } from './schema-core.js';

const DECODER = new TextDecoder();
export const RASTER_DPI = 144;
const POINTS_PER_INCH = 72;
const PIXELS_PER_POINT = RASTER_DPI / POINTS_PER_INCH;
const MARGIN_TOLERANCE_PT = 1.5;
const PAGE_TOLERANCE_PT = 1;

export function readPageInfo(bytes) {
  const text = DECODER.decode(bytes);
  const count = Number(/^Pages:\s+(\d+)$/m.exec(text)?.[1]);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  const pages = Array.from({ length: Math.min(count, 200) }, () => ({}));
  for (const match of text.matchAll(/^Page\s+(\d+)\s+(size|rot|MediaBox|CropBox):\s+([-\d. ]+).*$/gm)) {
    const [, page, field, values] = match;
    if (pages[Number(page) - 1]) pages[Number(page) - 1][field] = values.trim().split(/\s+/).map(Number);
  }
  return { count, pages, active: /^JavaScript:\s+yes$|^Form:\s+(?!none$)\S+/im.test(text) };
}

const near = (actual, expected, tolerance) => Math.abs(actual - expected) <= tolerance;

export function isExpectedPage(page, size) {
  const [width, height] = PAGE_SIZES[size];
  const boxMatches = box => box?.length === 4 && box.every((value, index) =>
    near(value, [0, 0, width, height][index], PAGE_TOLERANCE_PT));
  return page.rot?.[0] === 0 && boxMatches(page.MediaBox) && boxMatches(page.CropBox);
}

export function readFonts(bytes) {
  const [header, divider, ...entries] = DECODER.decode(bytes).trimEnd().split(/\r?\n/);
  if (!/^name\s+type\s+encoding\s+emb\s+sub\s+uni\s+object ID$/.test(header) ||
      !/^[- ]+$/.test(divider ?? '')) return null;
  const fonts = [];
  for (const entry of entries) {
    const match = /^(\S+).*?\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/.exec(entry);
    if (!match) return null;
    fonts.push({ name: match[1].replace(/^[A-Z]{6}\+/, ''), embedded: match[2] === 'yes' });
  }
  return fonts;
}

function readTextLines(bytes, count) {
  const [header, ...rows] = DECODER.decode(bytes).trimEnd().split(/\r?\n/);
  if (header !== 'level\tpage_num\tpar_num\tblock_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext') return null;
  const pages = Array.from({ length: count }, () => ({ bounds: null, lines: [] }));
  let line;
  for (const row of rows) {
    const fields = row.split('\t');
    const level = Number(fields[0]);
    const page = pages[Number(fields[1]) - 1];
    const [x, y, width, height] = fields.slice(6, 10).map(Number);
    if (!page || fields.length !== 12 || ![x, y, width, height].every(Number.isFinite)) return null;
    const bounds = { x, y, right: x + width, bottom: y + height };
    if (level === 1) page.bounds = bounds;
    if (level === 4) {
      line = { bounds, words: [] };
      page.lines.push(line);
    }
    if (level === 5 && line) line.words.push({ bounds, text: fields[11] });
  }
  return pages.every(page => page.bounds) ? pages : null;
}

const normalized = text => text.replace(/\s+/gu, ' ').trim();

export function footerCandidates(bytes, count, layout) {
  const pages = readTextLines(bytes, count);
  if (!pages) return null;
  return pages.map(({ bounds, lines }, index) => {
    const expected = normalized(layout.footer.format.replace('{page}', String(index + 1)).replace('{pages}', String(count)));
    const footerStart = bounds.bottom - layout.margins_inches.bottom * POINTS_PER_INCH;
    const candidates = lines.filter(line => {
      const { x, y, right, bottom } = line.bounds;
      if (x < 0 || right > bounds.right || y < footerStart || bottom > bounds.bottom) return false;
      const position = layout.footer.position;
      const aligned = position === 'center' ? near(x + right, bounds.right, 6) :
        position === 'left' ? near(x, 16, 3) : near(right, bounds.right - 16, 3);
      return aligned && normalized(line.words.map(word => word.text).join(' ')) === expected;
    });
    return candidates.length === 1 ? candidates[0].words : null;
  });
}

function parseRaster(bytes, pageSize) {
  // Poppler writes a binary PGM with one byte per gray pixel.
  const header = /^P5\s+(\d+)\s+(\d+)\s+255\n/.exec(DECODER.decode(bytes.subarray(0, 64)));
  if (!header) return null;
  const [, widthText, heightText] = header;
  const [width, height] = [Number(widthText), Number(heightText)];
  const [pointsWide, pointsHigh] = PAGE_SIZES[pageSize];
  if (!near(width, pointsWide * PIXELS_PER_POINT, 2) || !near(height, pointsHigh * PIXELS_PER_POINT, 2)) return null;
  const pixels = bytes.subarray(header[0].length);
  if (pixels.length !== width * height) return null;
  return { width, height, pixels };
}

function footerRectangle(bounds, tolerance) {
  return {
    x: Math.floor((bounds.x - tolerance) * PIXELS_PER_POINT),
    right: Math.ceil((bounds.right + tolerance) * PIXELS_PER_POINT),
    y: Math.floor((bounds.y - tolerance) * PIXELS_PER_POINT),
    bottom: Math.ceil((bounds.bottom + tolerance) * PIXELS_PER_POINT),
  };
}

export function measureInk(bytes, layout, footerWords) {
  const raster = parseRaster(bytes, layout.page_size);
  if (!raster) return null;
  const { width, height, pixels } = raster;
  const { top, right, bottom, left } = layout.margins_inches;
  const leftEdge = Math.floor((left * POINTS_PER_INCH - MARGIN_TOLERANCE_PT) * PIXELS_PER_POINT);
  const rightEdge = width - Math.floor((right * POINTS_PER_INCH - MARGIN_TOLERANCE_PT) * PIXELS_PER_POINT);
  const topEdge = Math.floor((top * POINTS_PER_INCH - MARGIN_TOLERANCE_PT) * PIXELS_PER_POINT);
  const bottomEdge = height - Math.floor((bottom * POINTS_PER_INCH - MARGIN_TOLERANCE_PT) * PIXELS_PER_POINT);
  const protectedInk = new Set();
  const wordBoxes = (footerWords ?? []).map(word => footerRectangle(word.bounds, 1));
  let outside = false;
  for (let y = 0; y < height; y++) {
    const onlyOutsideColumns = y >= topEdge && y < bottomEdge;
    const activeWordBoxes = wordBoxes.map((box, index) => ({ box, index }))
      .filter(({ box }) => y >= box.y && y < box.bottom);
    for (let x = 0; x < width; x++) {
      if (onlyOutsideColumns && x === leftEdge) x = rightEdge;
      if (x >= width || pixels[y * width + x] === 255) continue;
      const footerWord = activeWordBoxes.find(({ box }) => x >= box.x && x < box.right);
      if (footerWord) protectedInk.add(footerWord.index);
      else outside = true;
    }
  }
  return { outside, footerVisible: wordBoxes.length > 0 && protectedInk.size === wordBoxes.length };
}
