'use strict';

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = ['state', 'federal', 'arbitration-forum'];
const AREAS = ['contract', 'employment', 'consumer', 'personal-injury'];
const FIELDS = ['Court or forum', 'Forum type', 'Governing law', 'Rules home', 'Filing profile'];
const CLAIM_HEADERS = ['Claim or agreement', 'Law named', 'Clause and document', 'Source and date'];
const DEFAULT_DAYS = 180;
const DAY = 86_400_000;
const CASE_REFERENCE = /(?:\s*,\s*|\s+)(?:(?:case|docket|civil\s+action|index|reference)\b(?:\s+no\.)?\s*:?\s*#?(?=[\w:/.-]*\d)[a-z0-9][\w:/.-]*|no\.\s*:?\s*#?(?=[\w:/.-]*\d)[a-z0-9][\w.]*[-:/][\w:/.-]+|\d+(?::\d+)?(?:-[a-z0-9]+)*-\d+[a-z0-9]*)$/i;

function nonblank(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isId(value) {
  return typeof value === 'string' && ID.test(value);
}

function dayNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const milliseconds = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== value) return null;
  return milliseconds / DAY;
}

function ageOptions(today, days = String(DEFAULT_DAYS)) {
  const day = dayNumber(today);
  if (day === null) throw new Error('--today must be a calendar date in YYYY-MM-DD form.');
  const limit = Number(days);
  if (!/^\d+$/.test(days) || !Number.isSafeInteger(limit)) {
    throw new Error('--days must be a nonnegative safe integer.');
  }
  return { day, limit };
}

function lines(text) {
  return text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
}

function json(text) {
  const input = text.replace(/^\uFEFF/, '');
  let value;
  try {
    value = JSON.parse(input);
  } catch {
    throw new Error('contains invalid JSON.');
  }
  const stack = [];
  for (const [token, quoted] of input.matchAll(/("(?:[^"\\]|\\.)*")\s*:?|[{}\[\]]/gu)) {
    if (token === '{') stack.push(new Set());
    else if (token === '[') stack.push(null);
    else if (token === '}' || token === ']') stack.pop();
    else if (token.endsWith(':')) {
      const key = JSON.parse(quoted);
      const keys = stack.at(-1);
      if (keys.has(key)) throw new Error('repeats a JSON key.');
      keys.add(key);
    }
  }
  return value;
}

function object(value, keys, label, issue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issue(label + ' must be an object.');
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) issue(label + ' has an unexpected key ' + JSON.stringify(key) + '.');
  }
  return true;
}

function array(value, label, issue, minimum = 0) {
  if (Array.isArray(value) && value.length >= minimum) return value;
  issue(label + (minimum ? ' must be a nonempty array.' : ' must be an array.'));
  return [];
}

function unsafeRepetition(source) {
  // The native compiler checks syntax first. Ignore escapes, character classes and group prefixes here.
  const tokens = /\\[\s\S]|\[(?:\\[\s\S]|[^\]\\])*\]|\(\?(?:[:=!]|<[=!]|<[^>]+>|[ims-]+:)|[()|]|(?:[?*+]|\{\d+(?:,\d*)?\})\??/g;
  const groups = [{ unbounded: false, alternation: false }];
  let closed;
  for (const match of source.matchAll(tokens)) {
    const [token] = match;
    const group = groups.at(-1);
    if (token.startsWith('(')) {
      groups.push({ unbounded: false, alternation: false });
    } else if (token === ')') {
      const inner = groups.pop();
      const parent = groups.at(-1);
      parent.unbounded ||= inner.unbounded;
      parent.alternation ||= inner.alternation;
      closed = { ...inner, end: match.index + 1 };
      continue;
    } else if (token === '|') {
      group.alternation = true;
    } else if (/^(?:[*+]|\{\d+,\})/.test(token)) {
      if (closed?.end === match.index) {
        if (closed.unbounded) return 'nested quantifiers';
        if (closed.alternation) return 'repeated alternation';
      }
      group.unbounded = true;
    }
    closed = undefined;
  }
  return null;
}

function patternSource(pattern) {
  try {
    return new RegExp(pattern, 'i').source;
  } catch {
    // Keep native JavaScript patterns intact. Accept a literal first ] in a class
    // when escaping it produces a well-formed pattern.
    const classes = /\\[\s\S]|\[(\^?)\]((?:\\[\s\S]|[^\]\\[])*)\]|\[(?:\\[\s\S]|[^\]\\])*\]/g;
    const escaped = pattern.replace(classes, (token, prefix, rest) =>
      prefix === undefined ? token : '[' + prefix + '\\]' + rest + ']');
    return new RegExp(escaped, 'i').source;
  }
}

function patterns(value, label, issue) {
  return array(value, label, issue, 1).flatMap((pattern, index) => {
    if (!nonblank(pattern)) {
      issue(label + '[' + index + '] must be a nonblank regular expression string.');
      return [];
    }
    let compiled;
    try {
      const source = patternSource(pattern);
      compiled = new RegExp('^(?:' + source + ')$', 'i');
    } catch {
      issue(label + '[' + index + '] must compile as a JavaScript regular expression.');
      return [];
    }
    const problem = unsafeRepetition(compiled.source);
    if (problem) {
      issue(label + '[' + index + '] must not contain ' + problem + '.');
      return [];
    }
    return [compiled];
  });
}

function report(findings, pack, file, id = null) {
  return reason => findings.push({ pack, file, id, reason });
}

function input(read, directory, file, issue) {
  try {
    return read(directory, file);
  } catch (error) {
    issue(error.message);
    return undefined;
  }
}

function jsonFile(read, directory, file, issue) {
  const entry = input(read, directory, file, issue);
  if (entry === null) issue('Referenced file does not exist.');
  if (!entry) return null;
  try {
    return { path: entry.path, data: json(entry.text) };
  } catch (error) {
    issue('File ' + error.message);
    return null;
  }
}

function unique(seen, value, label, issue) {
  if (seen.has(value)) issue('Duplicate ' + label + ' ' + JSON.stringify(value) + '.');
  seen.add(value);
}

function manifest(directory, read, failures) {
  const file = 'pack.json';
  const issue = report(failures, directory.id, file);
  if (directory.failure) {
    issue(directory.failure);
    return null;
  }
  const record = jsonFile(read, directory, file, issue);
  if (!record || !object(record.data, ['id', 'name', 'kind', 'law_match', 'law', 'forums'], 'Manifest', issue)) return null;
  const data = record.data;
  if (!isId(data.id) || data.id !== directory.id) issue('id must be a lowercase hyphenated identifier matching the directory name.');
  if (!nonblank(data.name)) issue('name is required and must be nonblank.');
  if (!KINDS.includes(data.kind)) issue('kind must be one of ' + KINDS.join(', ') + '.');

  const areas = new Set();
  const law = array(data.law, 'law', issue).flatMap((entry, index) => {
    const label = 'law[' + index + ']';
    if (!object(entry, ['area', 'file'], label, issue)) return [];
    const { area, file } = entry;
    if (!AREAS.includes(area)) {
      issue(label + '.area must be one of ' + AREAS.join(', ') + '.');
      return [];
    }
    unique(areas, area, 'law area', issue);
    if (file !== 'law/' + area + '.json') {
      issue(label + '.file must be law/' + area + '.json.');
      return [];
    }
    return [{ area, file, directory }];
  });
  let lawMatch = [];
  if (Array.isArray(data.law) && data.law.length > 0) {
    lawMatch = patterns(data.law_match, 'law_match', issue);
  } else if (Object.hasOwn(data, 'law_match')) {
    issue('law_match must be omitted when the pack has no law half.');
  }

  const forumIds = new Set();
  const forums = array(data.forums, 'forums', issue).flatMap((entry, index) => {
    const label = 'forums[' + index + ']';
    if (!object(entry, ['id', 'name', 'tier', 'court_match', 'file'], label, issue)) return [];
    const { id, name, tier, file } = entry;
    if (!nonblank(name)) issue(label + '.name is required and must be nonblank.');
    if (!nonblank(tier)) issue(label + '.tier is required and must be nonblank.');
    const courtMatch = patterns(entry.court_match, label + '.court_match', issue);
    if (!isId(id)) {
      issue(label + '.id must be a lowercase hyphenated identifier.');
      return [];
    }
    unique(forumIds, id, 'forum id', issue);
    if (file !== 'forum/' + id + '.json') {
      issue(label + '.file must be forum/' + id + '.json.');
      return [];
    }
    return [{ id, name, tier, courtMatch, file, directory }];
  });
  return { id: directory.id, directory, name: data.name, kind: data.kind, lawMatch, law, forums };
}

function catalog(directories, read, failures) {
  return directories.map(directory => manifest(directory, read, failures)).filter(Boolean);
}

function excerptPath(value) {
  return typeof value === 'string' && /^excerpts\/[^/\\:\x00-\x1f\x7f]+\.txt$/.test(value);
}

function sourceUrl(value) {
  if (!nonblank(value) || !/^https?:\/\/[^\s]+$/i.test(value)) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password;
  } catch {
    return false;
  }
}

function checkExcerpt(statement, directory, read, issue) {
  const entry = input(read, directory, statement.excerpt, issue);
  if (statement.state !== 'Verified' || entry === undefined) return;
  if (entry === null || !entry.text.trim()) {
    issue('Verified excerpt file must exist and be non-empty.');
    return;
  }
  const [first, date] = lines(entry.text);
  const header = statement.source?.url ?? statement.source?.citation;
  if (first !== header) issue('Verified excerpt first line must equal source.url, or source.citation where the source has no url.');
  if (date !== statement.last_read) issue('Verified excerpt second line must equal last_read.');
}

function halves(entries, read, failures, gaps) {
  const idsByPack = new Map();
  const excerptsByPack = new Map();
  const loaded = new Map();
  for (const entry of entries) {
    const { directory, file } = entry;
    const issue = report(failures, directory.id, file);
    const record = jsonFile(read, directory, file, issue);
    const forum = Object.hasOwn(entry, 'courtMatch');
    const keys = forum ? ['statements', 'filing_profile', 'obtain'] : ['statements'];
    if (!record || !object(record.data, keys, 'Half', issue)) continue;

    const { data } = record;
    if (forum) {
      if (data.filing_profile !== null && !isId(data.filing_profile)) issue('filing_profile must be a profile id or null.');
      array(data.obtain, 'obtain', issue).forEach((source, index) => {
        if (!nonblank(source)) issue('obtain[' + index + '] must be a nonblank source name.');
      });
    }
    if (!idsByPack.has(directory.id)) idsByPack.set(directory.id, new Set());
    if (!excerptsByPack.has(directory.id)) excerptsByPack.set(directory.id, new Set());
    const seen = idsByPack.get(directory.id);
    const excerpts = excerptsByPack.get(directory.id);
    const statements = array(data.statements, 'statements', issue);
    statements.forEach((statement, index) => {
      const label = 'statements[' + index + ']';
      const id = nonblank(statement?.id) ? statement.id : null;
      const problem = report(failures, directory.id, file, id);
      if (!object(statement, ['id', 'text', 'source', 'state', 'last_read', 'excerpt'], label, problem)) return;
      if (id === null) problem(label + '.id is required and must be nonblank.');
      else unique(seen, id, 'statement id', problem);
      if (!nonblank(statement.text)) problem('text is required and must be nonblank.');
      const sourceValid = object(statement.source, ['citation', 'url'], 'source', problem);
      if (sourceValid && !nonblank(statement.source.citation)) problem('source.citation is required and must be nonblank.');
      if (sourceValid && statement.source.url !== undefined && !sourceUrl(statement.source.url)) problem('source.url, when given, must be an absolute HTTP(S) URL without credentials.');
      if (!['Verified', '[verify]'].includes(statement.state)) problem('state must be Verified or [verify].');
      if (dayNumber(statement.last_read) === null) problem('last_read is required and must be a calendar date in YYYY-MM-DD form.');
      const hasExcerptPath = excerptPath(statement.excerpt);
      if (!hasExcerptPath) problem('excerpt is required and must be a relative excerpts/<name>.txt path.');
      else {
        unique(excerpts, statement.excerpt, 'excerpt path', problem);
        checkExcerpt(statement, directory, read, problem);
      }
      if (statement.state === '[verify]') {
        report(gaps, directory.id, file, id)('Statement is marked [verify].');
      }
    });
    loaded.set(entry, { path: record.path, data });
  }
  return loaded;
}

function requireValid(failures) {
  if (failures.length) {
    throw Object.assign(new Error('Correct the pack failures and rerun.'), { failures });
  }
}

function packEntries(packs) {
  return packs.flatMap(pack => [...pack.law, ...pack.forums]);
}

function listPacks(directories, read) {
  const failures = [];
  const packs = catalog(directories, read, failures);
  requireValid(failures);
  return { packs: packs.map(({ id, name, kind, law, forums }) => ({
    id, name, kind, law: law.map(entry => entry.area),
    forums: forums.map(({ id, name, tier }) => ({ id, name, tier })),
  })) };
}

function checkedPacks(directories, read) {
  const failures = [];
  const gaps = [];
  const packs = catalog(directories, read, failures);
  const loaded = halves(packEntries(packs), read, failures, gaps);
  return { packs, loaded, failures, gaps };
}

function validatePacks(directories, read) {
  const { failures, gaps } = checkedPacks(directories, read);
  return { ok: failures.length === 0, packs: directories.map(directory => directory.id), failures, gaps };
}

function provenance(directory) {
  return directory.ownPack ? { own_pack: true, pack_directory: directory.path } : { own_pack: false };
}

function olderThan(loaded, { day, limit }, { includeProvenance = false } = {}) {
  const result = [];
  for (const [entry, { path, data }] of loaded) {
    for (const statement of data.statements) {
      if (day - dayNumber(statement.last_read) > limit) {
        result.push({
          pack: entry.directory.id, file: path, id: statement.id,
          message: 'confirm: last read ' + statement.last_read,
          ...(includeProvenance ? provenance(entry.directory) : {}),
        });
      }
    }
  }
  return result;
}

function stalePacks(directories, read, age) {
  const { failures, loaded } = checkedPacks(directories, read);
  requireValid(failures);
  return { prompts: olderThan(loaded, age) };
}

function visibleMarkdown(text) {
  let fence = null;
  return lines(text).map(line => {
    const marker = line.match(/^ {0,3}(\x60{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      return '';
    }
    if (!marker) return line;
    fence = marker[1];
    return '';
  });
}

function section(markdown, level, title, offset = 0) {
  const marks = '#'.repeat(level);
  const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
  const headings = markdown.flatMap((line, index) => {
    const match = line.match(heading);
    return match ? [{ marks: match[1], title: match[2], index }] : [];
  });
  const matches = headings.filter(entry => entry.marks === marks && entry.title === title);
  if (matches.length > 1) throw new Error('Use one ' + title + ' heading in the matter declaration.');
  if (!matches.length) return { markdown: [], offset };
  const start = matches[0].index;
  const end = headings.find(entry => entry.index > start && entry.marks.length <= level)?.index;
  return { markdown: markdown.slice(start + 1, end), offset: offset + start + 1 };
}

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'));
}

function table(markdown, headers, claimOffset) {
  const isHeader = values => values.length === headers.length && headers.every((header, index) => header === values[index]);
  const start = markdown.findIndex(line => isHeader(cells(line)));
  if (start < 0) return null;
  const separator = cells(markdown[start + 1] ?? '');
  if (separator.length !== headers.length || !separator.every(cell => /^:?-+:?$/.test(cell))) {
    throw new Error('Use the template table separator below ' + headers[0] + '.');
  }
  const rows = [];
  const claimTable = claimOffset !== undefined;
  const outerPipe = /^\s*\||(?<!\\)\|\s*$/;
  const bareHeader = !outerPipe.test(markdown[start]);
  let ended = false;
  let inProse = false;
  for (let index = start + 2; index < markdown.length; index++) {
    const line = markdown[index];
    const hasPipe = /(?<!\\)\|/.test(line);
    if (!claimTable && !line.includes('|')) break;
    const row = cells(line);
    if (claimTable) {
      // After a blank, a row still in the table uses its header's pipe style.
      const looksLikeRow = outerPipe.test(line) || (bareHeader && row.length === headers.length);
      if (isHeader(row) || (ended && !inProse && looksLikeRow)) {
        throw new Error('Use one continuous Governing law by claim table. Unexpected table row at line ' +
          (claimOffset + index + 1) + '.');
      }
      ended ||= !hasPipe;
      if (ended) {
        inProse ||= Boolean(line.trim());
        continue;
      }
    }
    if (row.length !== headers.length) throw new Error('Correct the number of cells in the ' + headers[0] + ' table.');
    rows.push(row);
  }
  return rows;
}

function parseDeclaration(text) {
  const { markdown: forum, offset } = section(visibleMarkdown(text), 2, 'Forum and posture');
  const subheading = forum.findIndex(line => /^ {0,3}#{3,6}[ \t]+/.test(line));
  const fieldRows = table(subheading === -1 ? forum : forum.slice(0, subheading), ['Field', 'Value', 'Source and date']);
  if (!fieldRows) return { declaration: 'missing', claims: [] };
  const declaration = Object.create(null);
  for (const [field, value, source_and_date] of fieldRows) {
    if (!FIELDS.includes(field)) throw new Error('Use the declaration fields from the matter template.');
    if (Object.hasOwn(declaration, field)) throw new Error('Record ' + field + ' once in the matter declaration.');
    declaration[field] = { value, source_and_date };
  }
  for (const field of FIELDS) {
    if (!declaration[field]?.value) throw new Error('Supply ' + field + ' in the matter declaration.');
  }
  const claimSection = section(forum, 3, 'Governing law by claim', offset);
  const claims = (table(claimSection.markdown, CLAIM_HEADERS, claimSection.offset) ?? [])
    .filter(([claim, law]) => claim !== '[Claim or agreement]' || law !== '[Law named, or not stated]')
    .map(([claim, law_named, clause_and_document, source_and_date]) => ({ claim, law_named, clause_and_document, source_and_date }));
  return { declaration, claims };
}

function plain(value) {
  return value.replace(/^(\x60+)(.+)\1$/, '$2').trim();
}

function none(reason) {
  return { status: 'none', reason };
}

function preferredMatches(matter, shipped, packId) {
  if (!matter.length) return { matches: shipped };
  const set_aside = [...new Set(shipped.map(packId))];
  return { matches: matter, ...(set_aside.length ? { set_aside } : {}) };
}

function courtNames(value) {
  const court = plain(value);
  if (court.toLowerCase() === 'pending') return [];
  const withoutReference = court.replace(CASE_REFERENCE, '');
  return withoutReference === court ? [court] : [withoutReference, court];
}

function matchingForums(names, packs) {
  return packs.flatMap(pack => pack.forums)
    .filter(forum => forum.courtMatch.some(pattern => names.some(name => pattern.test(name))));
}

function findForum(names, { matter, shipped }) {
  if (!names.length) return { result: none('pending') };
  const { matches, ...overrides } = preferredMatches(matchingForums(names, matter), matchingForums(names, shipped),
    forum => forum.directory.id);
  if (matches.length > 1) {
    const candidates = matches.map(forum => forum.directory.id + '/' + forum.id + ' (' + forum.name + ')');
    throw new Error('Multiple forums matched: ' + candidates.join(', ') + '. Correct the overlapping court_match patterns.');
  }
  if (!matches.length) return { result: none('no pack covers this court') };
  return { match: matches[0], ...overrides };
}

function matchingLaws(names, packs) {
  for (const name of names) {
    const matches = packs.filter(pack => pack.lawMatch.some(pattern => pattern.test(name)));
    if (matches.length) return matches.map(pack => ({ name, pack }));
  }
  return [];
}

function lawNames(value) {
  const law = plain(value);
  if (['pending', 'not stated'].includes(law.toLowerCase())) return [];
  if (!law) throw new Error('Supply Law named, pending, or not stated for each claim.');
  const splits = [...law.matchAll(/[,;]|\s+(?=except\b|unless\b|subject to\b)/gi)];
  return [law, ...splits.reverse().map(split => law.slice(0, split.index).trimEnd())];
}

function findLaw(value, names, { matter, shipped }) {
  if (!names.length) return { result: none(plain(value).toLowerCase()) };
  const { matches, ...overrides } = preferredMatches(matchingLaws(names, matter), matchingLaws(names, shipped),
    match => match.pack.id);
  if (matches.length > 1) {
    throw new Error('Multiple governing-law packs matched: ' + matches.map(({ pack }) => pack.id).join(', ') +
      '. Correct the overlapping law_match patterns.');
  }
  if (!matches.length) return { result: none('no pack covers this law') };
  const [{ name, pack }] = matches;
  const hold = name === names[0] ? {} : { exception: value, held: true, matched_law: name };
  return { pack, ...hold, ...overrides };
}

function resolvePacks(directories, read, courts, laws) {
  const { packs, loaded, failures, gaps } = checkedPacks(directories, read);
  const failuresByPack = new Map();
  for (const finding of failures) {
    if (!failuresByPack.has(finding.pack)) failuresByPack.set(finding.pack, []);
    failuresByPack.get(finding.pack).push(finding);
  }
  const usable = new Map(packs.map(pack => [pack.directory, pack]));
  const invalid = directories.filter(directory => failuresByPack.has(directory.id)).map(directory => {
    const pack = usable.get(directory);
    const failures = failuresByPack.get(directory.id);
    const diagnostic = { pack: directory.id, ...provenance(directory), failures };
    const files = new Set(failures.map(failure => failure.file));
    const badManifest = files.has('pack.json');
    const badForums = pack?.forums.filter(entry => badManifest || files.has(entry.file)) ?? [];
    const badLaw = pack?.law.some(entry => badManifest || files.has(entry.file));
    const forums = matchingForums(courts, [{ forums: badForums }]);
    const claims = badLaw ? laws.flatMap((names, index) => matchingLaws(names, [pack]).length ? [index] : []) : [];
    if (forums.length || claims.length) diagnostic.matches = { forum: forums.length > 0, governing_law: claims };
    if (badManifest) usable.delete(directory);
    else if (pack) {
      usable.set(directory, {
        ...pack,
        forums: pack.forums.filter(entry => !files.has(entry.file)),
        law: badLaw ? [] : pack.law,
        lawMatch: badLaw ? [] : pack.lawMatch,
      });
    }
    const matchedFiles = new Set(forums.map(entry => entry.file));
    if (claims.length) for (const entry of pack.law) matchedFiles.add(entry.file);
    const matchingFailures = failures.filter(failure => matchedFiles.has(failure.file));
    return { diagnostic, matchingFailures };
  });
  return { packs: [...usable.values()], loaded, gaps, invalid };
}

function resolveMatter(text, { rulesRecord, matterDirectories, shippedDirectories, read, age }) {
  const { declaration, claims } = parseDeclaration(text);
  const matter_records = [];
  if (declaration !== 'missing') {
    const rules = plain(declaration['Rules home'].value);
    if (!['not yet obtained', 'pending'].includes(rules.toLowerCase())) matter_records.push(rulesRecord(rules));
  }
  const courts = declaration === 'missing' ? [] : courtNames(declaration['Court or forum'].value);
  const laws = claims.map(claim => lawNames(claim.law_named));
  const matter = resolvePacks(matterDirectories(), read, courts, laws);
  const invalid_packs = matter.invalid.map(entry => entry.diagnostic);
  if (declaration === 'missing') {
    return {
      declaration, matter_records,
      forum: none('The forum must come from the parties record.'),
      governing_law: [], stale: [], gaps: [], ...(invalid_packs.length ? { invalid_packs } : {}),
    };
  }

  const shipped = resolvePacks(shippedDirectories(), read, courts, laws);
  invalid_packs.push(...shipped.invalid.map(entry => entry.diagnostic));
  const packs = { matter: matter.packs, shipped: shipped.packs };
  const { match: forumMatch, result, ...forumOverrides } = findForum(courts, packs);
  const lawMatches = claims.map((claim, index) => findLaw(claim.law_named, laws[index], packs));
  const entries = new Set([
    ...(forumMatch ? [forumMatch] : []),
    ...lawMatches.flatMap(selection => selection.pack?.law ?? []),
  ]);
  if (!entries.size) requireValid(shipped.invalid.flatMap(entry => entry.matchingFailures));
  const loaded = new Map([...entries].map(entry => [entry, matter.loaded.get(entry) ?? shipped.loaded.get(entry)]));
  const gaps = [];
  for (const [entry, { path }] of loaded) {
    const { directory, file } = entry;
    const packGaps = directory.ownPack ? matter.gaps : shipped.gaps;
    for (const gap of packGaps) {
      if (gap.pack === directory.id && gap.file === file) {
        gaps.push({ ...gap, file: path, ...provenance(directory) });
      }
    }
  }

  let forum = result;
  if (forumMatch) {
    const { id, name, tier, directory } = forumMatch;
    const { path, data: { filing_profile, obtain } } = loaded.get(forumMatch);
    forum = { pack: directory.id, id, name, file: path, tier, filing_profile, obtain,
      ...provenance(directory), ...forumOverrides };
  }
  const governing_law = lawMatches.map(({ pack, result, ...details }, index) => ({
    ...claims[index],
    ...(result ?? { pack: pack.id, files: pack.law.map(entry => loaded.get(entry).path),
      ...provenance(pack.directory), ...details }),
  }));
  return { declaration, matter_records, forum, governing_law,
    stale: olderThan(loaded, age, { includeProvenance: true }), gaps, ...(invalid_packs.length ? { invalid_packs } : {}) };
}

module.exports = { ageOptions, isId, listPacks, resolveMatter, stalePacks, validatePacks };
