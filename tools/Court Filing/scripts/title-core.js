const party = String.raw`(?:pro se +)?(?:plaintiff|defendant|petitioner|respondent|claimant|counterclaimant|appellant|appellee|intervenor|movant)(?:['’]s|s['’]) +`;
const modifier = String.raw`(?:emergency|unopposed|opposed|joint|amended|supplemental|verified|renewed|stipulated|expedited|separate|alternative|conditional|corrected|first|second|third) +`;
const prefix = '(?:' + modifier + ')*(?:' + party + ')?(?:' + modifier + ')*';
const paper = String.raw`(?:cross[- ]motion|motion|responses?|opposition|reply|brief|memorandum|notice|answers?|counterclaims?|(?:proposed +)?order|complaint|disclosures?)`;
const paperStart = new RegExp('^' + prefix + '(' + paper + ')\\b(.*)$', 'iu');
const discoveryObjections = new RegExp('^' + prefix + 'objections$', 'iu');
const namedParty = /^(?:\p{Lu}[\p{L}\d._'’\x2D]* +){0,4}\p{Lu}[\p{L}\d._'’\x2D]*?(?:['’]s|s['’]) +/u;
const titleContinuation = /^(?:$|[:;,(\[]|(?:to|for|in|of|on|under|pursuant|regarding|re|against|with|seeking|requesting|opposing)\b)/iu;
const paperAtStart = phrase => paperStart.exec(phrase) ?? paperStart.exec(phrase.replace(namedParty, ''));
const answerOrResponse = /^(?:answers?|responses?)$/iu;
const discoveryDevice = /\b(?:interrogatories|requests? +for +(?:production|admissions?))\b/iu;

function topLevelTitle(title) {
  // Hide delimiters inside citations, parentheticals and quoted titles.
  const mask = match => ' '.repeat(match.length);
  let text = title.trim().replace(/\s+/gu, ' ').replace(/"[^"]*"|“[^”]*”/gu, mask);
  const parenthetical = /\([^()[\]]*\)|\[[^()[\]]*\]/gu;
  while (parenthetical.test(text)) text = text.replace(parenthetical, mask);
  return text;
}

export function titleScope(title) {
  const topLevel = topLevelTitle(title);
  let ambiguous = false;
  for (const separator of topLevel.matchAll(/ *; *(?:and\b *)?| *, *and\b *| *& *|\band\b */giu)) {
    const left = topLevel.slice(0, separator.index).trim();
    const right = topLevel.slice(separator.index + separator[0].length).trim().replace(/^the +/iu, '');
    const second = paperAtStart(right);
    if (!left || !second) continue;
    const primary = paperAtStart(left);
    const primaryHead = primary?.[1] ?? '';
    const primaryTail = primary?.[2].trim() ?? '';
    const head = second[1].toLowerCase();
    const tail = second[2].trim();
    const conjunction = !separator[0].includes(';');
    if (conjunction && /\bamended$/iu.test(left) && /^(?:supplemental|restated) +complaint\b/iu.test(right)) continue;
    if (conjunction && /^answer$/iu.test(primaryHead) && /^counterclaims?$/u.test(head)) continue;
    if (conjunction && /motion$/iu.test(primaryHead) &&
        (head === 'notice' && /^of hearing\b/iu.test(tail) ||
          /^(?:brief|memorandum)$/u.test(head) && /^in support\b/iu.test(tail))) continue;
    if (conjunction && answerOrResponse.test(head) && /^to\b/iu.test(tail) &&
        (discoveryObjections.test(left) || answerOrResponse.test(primaryHead) &&
          (!primaryTail || discoveryDevice.test(primaryTail) && discoveryDevice.test(tail)))) continue;

    // A paper word can modify another noun, as in "notice requirements".
    if (!titleContinuation.test(tail)) {
      ambiguous = true;
      continue;
    }
    return 'combined';
  }
  return ambiguous ? 'ambiguous' : 'single';
}
