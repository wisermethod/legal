import { canonicalBody } from './body-text-core.js';
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
  return { count, pages, title: /^Title:[ \t]+([^\r\n]+)$/m.exec(text)?.[1], active: /^JavaScript:\s+yes$|^Form:\s+(?!none$)\S+/im.test(text) };
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

export function readTextLines(bytes, count) {
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

export function footerCandidates(pages, count, layout) {
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

export function imagesAbsent(bytes) {
  if (!bytes) return null;
  const [header, divider, ...rows] = DECODER.decode(bytes).trim().split(/\r?\n/);
  if (!/^page\s+num\s+type\s+width\s+height\s+color\b/u.test(header) || !/^-+$/u.test(divider ?? '')) return null;
  return rows.length === 0;
}

export function readTypography(bytes, count, layout) {
  if (!bytes) return null;
  const xml = DECODER.decode(bytes);
  if (!/<\/pdf2xml>\s*$/u.test(xml)) return null;
  const pages = [...xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/gu)];
  if (pages.length !== count) return null;
  const fonts = new Map();
  for (const [, content] of pages) {
    for (const [, id, size, family, color] of content.matchAll(/<fontspec id="(\d+)" size="(\d+)" family="([^"]+)" color="(#[0-9a-f]+)"\s*\/>/gu)) {
      fonts.set(id, { size: Number(size) / 3, family: family.replace(/^[A-Z]{6}\+/, ''), color });
    }
    const runs = [...content.matchAll(/<text top="([\d.]+)"[^>]* font="(\d+)"[^>]*>(.*?)<\/text>/gu)];
    if (!runs.length || runs.length !== (content.match(/<text\b/gu)?.length ?? 0)) return null;
    const footerStart = PAGE_SIZES[layout.page_size][1] - layout.margins_inches.bottom * POINTS_PER_INCH;
    for (const [, top, id] of runs) {
      const font = fonts.get(id);
      if (!font) return null;
      const isFooter = Number(top) / 3 >= footerStart;
      if (!near(font.size, isFooter ? layout.footer.size_pt : layout.body_font_size_pt, 0.35) ||
          !layout.pdf_font_names.includes(font.family) || !['#000000', '#0000ed', '#0000ee'].includes(font.color)) return false;
    }
  }
  return true;
}

export function paragraphSpacing(positioned, pages, paragraphs, layout) {
  if (!positioned || !pages.length) return null;
  let offset = 0;
  let paragraphIndex = 0;
  for (const [index, lines] of pages.entries()) {
    const positions = positioned[index].lines;
    let previous = null;
    let nextPosition = 0;
    for (const line of lines) {
      const text = canonicalBody(line);
      const start = offset;
      offset += text.length;
      while (paragraphIndex < paragraphs.length && paragraphs[paragraphIndex].offset + paragraphs[paragraphIndex].length <= start) {
        paragraphIndex++;
      }
      const paragraph = paragraphs[paragraphIndex];
      if (!paragraph || start < paragraph.offset || offset > paragraph.offset + paragraph.length) {
        previous = null;
        continue;
      }
      const positionIndex = positions.findIndex((item, i) => i >= nextPosition &&
        canonicalBody(item.words.map(word => word.text).join(' ')) === text);
      if (positionIndex < 0) {
        if (previous?.paragraph === paragraphIndex || offset < paragraph.offset + paragraph.length) return null;
        previous = null;
        continue;
      }
      nextPosition = positionIndex + 1;
      const baseline = positions[positionIndex].bounds.y;
      if (previous?.paragraph === paragraphIndex &&
          !near(baseline - previous.baseline, layout.body_font_size_pt * layout.body_line_height, 0.8)) return false;
      previous = { paragraph: paragraphIndex, baseline };
    }
  }
  return true;
}

export function captionRuling(bytes, layout, page) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return null;
  const { width, height, pixels } = raster;
  const ratio = POINTS_PER_INCH * PIXELS_PER_POINT;
  const { left, right, top } = layout.margins_inches;
  const from = Math.round(left * ratio);
  const to = width - Math.round(right * ratio);
  const expectedTop = Math.round(top * ratio);
  const dark = (x, y) => pixels[y * width + x] < 100;
  const horizontal = (y, x0, x1) => {
    let count = 0;
    for (let x = x0; x < x1; x++) if (dark(x, y)) count++;
    return count >= (x1 - x0) * 0.985;
  };
  const rules = [];
  for (let y = Math.max(0, expectedTop - 3); y < height; y++) {
    if (horizontal(y, from, to) && (rules.length === 0 || y - rules.at(-1).last > 1)) {
      rules.push({ first: y, last: y });
      if (rules.length === 4) break;
    } else if (rules.length && horizontal(y, from, to)) {
      rules.at(-1).last = y;
    }
  }
  if (rules.length < 3 || !near(rules[0].first, expectedTop, 3)) return false;
  const [upper, divider, lower] = rules;
  const provesVertical = (target, tolerance, end) => {
    for (let x = target - tolerance; x <= target + tolerance; x++) {
      let count = 0;
      for (let y = upper.first; y <= end; y++) if (dark(x, y)) count++;
      if (count >= (end - upper.first) * 0.985) return true;
    }
    return false;
  };
  const boxed = provesVertical(from, 4, lower.first) && provesVertical(to, 4, lower.first) &&
    provesVertical(Math.round(from + (to - from) * 0.62), 16, divider.first);
  return boxed ? { bottom: lower.last / PIXELS_PER_POINT } : false;
}


export function judicialRuling(bytes, layout, page) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return null;
  const text = line => line.words.map(word => word.text).join(' ');
  const marker = page.lines.findLast(line => /^BY\s*THE\s*COURT:\s*$/iu.test(text(line)));
  const judge = page.lines.findLast(line => /\bJUDGE\.?$/iu.test(text(line)));
  if (!marker || !judge || judge.bounds.y <= marker.bounds.bottom) return false;
  const { width, pixels } = raster;
  const from = Math.ceil(layout.margins_inches.left * POINTS_PER_INCH * PIXELS_PER_POINT);
  const to = width - Math.ceil(layout.margins_inches.right * POINTS_PER_INCH * PIXELS_PER_POINT);
  const start = Math.floor(marker.bounds.bottom * PIXELS_PER_POINT);
  const end = Math.ceil(judge.bounds.y * PIXELS_PER_POINT);
  for (let y = start; y < end; y++) {
    let dark = 0;
    for (let x = from; x < to; x++) if (pixels[y * width + x] < 190) dark++;
    if (dark >= (to - from) * 0.95) return { y: y / PIXELS_PER_POINT };
  }
  return false;
}


export function markPositions(positioned, pages, marks) {
  let offset = 0;
  const located = [];
  const result = Array.from({ length: positioned.length }, () => []);
  for (const [index, lines] of pages.entries()) {
    const available = positioned[index].lines;
    let nextPosition = 0;
    for (const text of lines) {
      const run = canonicalBody(text);
      const found = available.findIndex((line, i) => i >= nextPosition &&
        canonicalBody(line.words.map(word => word.text).join(' ')) === run);
      if (found >= 0) {
        located.push({ page: index, offset, end: offset + run.length, bounds: available[found].bounds });
        nextPosition = found + 1;
      }
      offset += run.length;
    }
  }
  for (const mark of marks) {
    const after = located.find(line => line.offset === mark.offset);
    const before = located.findLast(line => line.end === mark.offset);
    if (mark.kind === 'bullet') {
      if (!after) return null;
      result[after.page].push({ kind: 'bullet', bounds: after.bounds });
    } else {
      if (!before && !after) return null;
      const index = after?.page ?? before.page;
      const from = before?.page === index ? before.bounds.bottom : 0;
      const to = after ? after.bounds.y : before.bounds.bottom + 42;
      result[index].push({ kind: 'rule', from, to });
    }
  }
  return result;
}

export function filingInk(bytes, layout, page, captionBox, judicialRule, marks) {
  const raster = bytes && parseRaster(bytes, layout.page_size);
  if (!raster || !page) return null;
  const { width, height, pixels } = raster;
  const allowed = new Uint8Array(pixels.length);
  const cover = (bounds, padding) => {
    const box = footerRectangle(bounds, padding);
    for (let y = Math.max(0, box.y); y < Math.min(height, box.bottom); y++) {
      allowed.fill(1, y * width + Math.max(0, box.x), y * width + Math.min(width, box.right));
    }
  };
  for (const line of page.lines) {
    for (const word of line.words) {
      const box = footerRectangle(word.bounds, 0.5);
      let visible = false;
      for (let y = Math.max(0, box.y); y < Math.min(height, box.bottom) && !visible; y++) {
        for (let x = Math.max(0, box.x); x < Math.min(width, box.right); x++) {
          if (pixels[y * width + x] < 190) {
            visible = true;
            break;
          }
        }
      }
      if (!visible) return false;
      cover(word.bounds, 1.75);
    }
    // A signer may place ink just above the composed blank signature line.
    if (line.words.length === 1 && /^_{3,}$/u.test(line.words[0].text)) {
      cover({ ...line.bounds, y: line.bounds.y - layout.body_font_size_pt * 0.8 }, 1.75);
    }
  }
  const x = layout.margins_inches.left * POINTS_PER_INCH;
  const right = width / PIXELS_PER_POINT - layout.margins_inches.right * POINTS_PER_INCH;
  for (const mark of marks) {
    if (mark.kind === 'bullet') {
      const { x, y, bottom } = mark.bounds;
      const box = { x: x - 14, right: x - 7, y, bottom };
      const bounds = footerRectangle(box, 0);
      let painted = false;
      for (let row = bounds.y; row < bounds.bottom; row++) {
        for (let column = bounds.x; column < bounds.right; column++) {
          if (pixels[row * width + column] < 190) painted = true;
        }
      }
      if (!painted) return false;
      cover(box, 1);
    } else {
      const leftPixel = Math.ceil(x * PIXELS_PER_POINT);
      const rightPixel = Math.floor(right * PIXELS_PER_POINT);
      let found = false;
      for (let y = Math.max(0, Math.floor(mark.from * PIXELS_PER_POINT));
        y < Math.min(height, Math.ceil(mark.to * PIXELS_PER_POINT)); y++) {
        let dark = 0;
        for (let column = leftPixel; column < rightPixel; column++) {
          if (pixels[y * width + column] < 190) dark++;
        }
        if (dark >= (rightPixel - leftPixel) * 0.95) {
          cover({ x, right, y: y / PIXELS_PER_POINT, bottom: (y + 1) / PIXELS_PER_POINT }, 1.5);
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
  }
  if (captionBox) cover({ x, right, y: layout.margins_inches.top * POINTS_PER_INCH, bottom: captionBox.bottom }, 1.5);
  if (judicialRule) cover({ x, right, y: judicialRule.y, bottom: judicialRule.y + 1 }, 1.5);
  return !pixels.some((gray, index) => gray < 190 && !allowed[index]);
}
