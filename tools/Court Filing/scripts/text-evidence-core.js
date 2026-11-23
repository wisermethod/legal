import { normalize } from './body-text-core.js';

export const compact = text => normalize(text).replace(/\s/gu, '');

export function matchLines(lines, offset, expected, squash = false) {
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

export const blank = /^_{3,}$/u;
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export function calendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day;
}

export function monthIndex(name) {
  const normalized = name.toLowerCase().replace(/\.$/u, '');
  if (normalized === 'sept') return 8;
  return months.findIndex(month => month.toLowerCase() === normalized || month.slice(0, 3).toLowerCase() === normalized);
}

export function validFilerDate(date) {
  if (blank.test(date)) return true;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(date);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(date);
  if (slash) return calendarDate(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  const named = /^([A-Za-z]+\.?) (\d{1,2}),? (\d{4})$/u.exec(date);
  return Boolean(named && calendarDate(Number(named[3]), monthIndex(named[1]), Number(named[2])));
}

export function isSignatureLine(line, blankPattern, signedText) {
  return blankPattern.test(line) || line === signedText;
}

export function centeredLines(lines, centered, maxGap) {
  const result = [];
  for (const line of lines) {
    const previous = result.at(-1);
    if (!centered(line) || previous && line.bounds.y - previous.bounds.y > maxGap) break;
    result.push(line);
  }
  return result;
}
