const party = String.raw`(?:pro se +)?(?:plaintiff|defendant|petitioner|respondent|claimant|counterclaimant|appellant|appellee|intervenor|movant)(?:['’]s|s['’]) +`;
const modifier = String.raw`(?:emergency|unopposed|opposed|joint|amended|supplemental|verified|renewed|stipulated|expedited|separate|alternative|conditional|corrected|first|second|third) +`;
const prefix = '(?:' + modifier + ')*(?:' + party + ')?(?:' + modifier + ')*';
const paper = String.raw`(?:cross[- ]motion|motion|responses?|opposition|reply|brief|notice|answers?|counterclaims?)`;
const paperStart = new RegExp('^' + prefix + '(' + paper + ')\\b(.*)$', 'iu');
const discoveryObjections = new RegExp('^' + prefix + 'objections$', 'iu');
const namedParty = /^(?:\p{Lu}[\p{L}\d._'’\x2D]* +){0,4}\p{Lu}[\p{L}\d._'’\x2D]*?(?:['’]s|s['’]) +/u;
const objectPhrase = /\b(in support of|in opposition to|regarding|re:?|to|for) +/iu;
const mentionedPaper = new RegExp('\\b(?:' + paper + '|sur[- ]reply)\\b', 'iu');
const titleContinuation = /^(?:$|[:;,(\[]|(?:to|for|in|of|on|under|pursuant|regarding|re|against|with|seeking|requesting|opposing)\b)/iu;
const paperAtStart = phrase => paperStart.exec(phrase) ?? paperStart.exec(phrase.replace(namedParty, ''));

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
    const right = topLevel.slice(separator.index + separator[0].length).trim();
    const second = paperAtStart(right);
    if (!left || !second) continue;
    const primary = paperAtStart(left);
    const head = second[1].toLowerCase();
    const tail = second[2].trim();
    const conjunction = !separator[0].includes(';');
    if (conjunction && primary?.[1].toLowerCase() === 'answer' && /^counterclaims?$/u.test(head)) continue;
    if (conjunction && discoveryObjections.test(left) && /^(?:answers?|responses?)$/u.test(head) && /^to\b/iu.test(tail)) continue;

    // A paper word can modify another noun, as in "notice requirements".
    // An object can also coordinate references to papers. Use general limits
    // if the title leaves the attachment of the second phrase unclear.
    const object = objectPhrase.exec(primary?.[2] ?? left);
    const objectText = object?.input.slice(object.index + object[0].length);
    const motion = /motion$/iu.test(primary?.[1] ?? '');
    const joinsObjects = conjunction && object &&
      (!/^(?:to|for)$/iu.test(object[1]) || /^to$/iu.test(object[1]) && !motion ||
        mentionedPaper.test(objectText) || /\bto (?:file|submit|serve)\b/iu.test(objectText));
    if (joinsObjects || !titleContinuation.test(tail)) {
      ambiguous = true;
      continue;
    }
    return 'combined';
  }
  return ambiguous ? 'ambiguous' : 'single';
}
