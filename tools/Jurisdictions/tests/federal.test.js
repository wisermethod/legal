'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');

const TOOL = realpathSync(join(__dirname, '..'));
const CLI = join(TOOL, 'scripts', 'jurisdictions.js');
const PACK = join(TOOL, 'packs', 'federal');
const FORUM = 'forum/district-court.json';
const { statements } = JSON.parse(readFileSync(join(PACK, FORUM), 'utf8'));

const COLORADO_FEDERAL = 'United States District Court for the District of Colorado';
const NEW_YORK_FEDERAL = 'United States District Court for the Southern District of New York';
const COLORADO_STATE = 'District Court, Denver County, Colorado';

function command(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  assert.equal(result.status, expectedStatus, result.stderr);
  const [output, empty] = expectedStatus === 0 ? [result.stdout, result.stderr] : [result.stderr, result.stdout];
  assert.equal(empty, '');
  return JSON.parse(output);
}

function temporary(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'jurisdictions-federal-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('federal validation covers exactly the saved source units', () => {
  assert.deepEqual(command(['validate', '--pack', 'federal']), {
    ok: true, packs: ['federal'], failures: [], gaps: [],
  });
  const rules = '1 2 3 4 5 5-2 6 7 7-1 8 9 10 11 12 13 15 16 26 33 34 36 38 54 55 56 58 59 60 65 77 81 83'.split(' ');
  const sections = [85, 1331, 1332, 1367, 1391, 1404, 1406, 1441, 1446, 1447];
  const excerpts = [
    ...rules.map(rule => 'frcp-' + rule + '.txt'),
    ...sections.map(section => 'usc-28-' + section + '.txt'),
    'caterpillar-complete-diversity.txt',
  ].sort();
  assert.deepEqual(readdirSync(join(PACK, 'excerpts')).sort(), excerpts);
  assert.deepEqual(statements.map(({ excerpt }) => excerpt).sort(), excerpts.map(file => 'excerpts/' + file));
  for (const { excerpt } of statements) {
    const [, , ...body] = readFileSync(join(PACK, excerpt), 'utf8').split('\n');
    assert.ok(body.join('\n').trim(), 'missing source text in ' + excerpt);
  }
});

test('full and abbreviated district names return one national forum without law or a filing profile', () => {
  for (const name of [
    COLORADO_FEDERAL,
    NEW_YORK_FEDERAL + ', Civil Action No. 1:26-cv-00123',
    'U.S. District Court, D. Colorado',
    'U.S. District Court for the Western District of Washington',
    'United States District Court, District of Columbia',
    'U.S. District Court, D.C.',
    'US District Court, District of Puerto Rico',
    'United States District Court for the Middle District of Florida',
    'D. Colo., Case No. 1:26-cv-00456',
    'S.D.N.Y. 26-cv-00987',
    'U.S.D.C., N.D. Cal.',
    'W.D. Wash.',
    'D.D.C.',
    'E.D. Pa.',
    'M.D. Fla.',
    'S.D. W. Va.',
  ]) {
    const result = command(['lookup', '--court', name]);
    const { forum } = result;
    assert.equal(forum.pack, 'federal', name);
    assert.equal(forum.id, 'district-court', name);
    assert.equal(forum.file, join(PACK, FORUM), name);
    assert.equal(forum.filing_profile, null, name);
    assert.equal(forum.own_pack, false, name);
    assert.equal(Object.hasOwn(result, 'governing_law'), false, name);
    assert.deepEqual(result.invalid_packs, [], name);
  }
});

test('district matching rejects other court systems, ambiguous labels and unknown districts', () => {
  for (const [name, pack] of [
    [COLORADO_STATE, 'colorado'],
    ['JAMS Employment Arbitration', 'jams'],
    ['Supreme Court of the State of New York, County of New York', 'new-york'],
    ['Superior Court of the District of Columbia', undefined],
    ['United States Court of Appeals for the District of Columbia Circuit', undefined],
    ['U.S. Court of Appeals, 10th Cir.', undefined],
    ['United States Bankruptcy Court for the Southern District of New York', undefined],
    ['U.S. Bankruptcy Court, D. Colorado', undefined],
    ['United States District Court for the District of Atlantis', undefined],
    ['U.S. District Court, D. Atlantis', undefined],
    ['United States District Court for the Western District of Colorado', undefined],
    ['Colorado', undefined],
    ['D.C.', undefined],
    ['D. Colorado No. 2', undefined],
    ['U.S. District Court', undefined],
  ]) {
    const { forum } = command(['lookup', '--court', name]);
    assert.equal(forum.pack, pack, name);
    if (pack === undefined) assert.equal(forum.status, 'none', name);
  }
});

test('a federal forum does not become a governing-law match', () => {
  for (const law of ['Federal', 'Federal law', 'United States', 'United States law']) {
    const result = command(['lookup', '--law', law]);
    const [row] = result.governing_law;
    assert.equal(row.law_named, law);
    assert.equal(row.status, 'none');
    assert.equal(Object.hasOwn(result, 'forum'), false);
  }
});

test('changing a fictional forum preserves each claim law and the declared Rules home and filing profile', t => {
  const directory = temporary(t);
  const matter = join(directory, 'AGENTS.md');
  const rules = join(directory, 'case-rules.md');
  const order = 'Fictional docket order 12. The court sets a different answer date for this case.\n';
  const declaration = [
    '## Forum and posture',
    '',
    '| Field | Value | Source and date |',
    '|---|---|---|',
    '| Court or forum | ' + NEW_YORK_FEDERAL + ' | Fictional docket, 2026-11-23 |',
    '| Forum type | court | Fictional docket, 2026-11-23 |',
    '| Governing law | see Governing law by claim | Fictional agreement, 2026-11-23 |',
    '| Rules home | case-rules.md | Fictional docket order 12, 2026-11-23 |',
    '| Filing profile | pending | Fictional docket, 2026-11-23 |',
    '',
    '### Governing law by claim',
    '',
    '| Claim or agreement | Law named | Clause and document | Source and date |',
    '|---|---|---|---|',
    '| Pay | Colorado | Section 4, agreement | Fictional agreement, 2026-11-23 |',
    '| Separation | Colorado, except as to wages | Section 7, agreement | Fictional agreement, 2026-11-23 |',
    '| Expense | pending | Agreement under review | Fictional note, 2026-11-23 |',
    '| Other | Federal law | Section 3, agreement | Fictional agreement, 2026-11-23 |',
    '',
  ].join('\n');
  writeFileSync(matter, declaration);
  writeFileSync(rules, order);

  const result = command(['resolve', '--matter', matter]);
  assert.equal(result.forum.pack, 'federal');
  assert.equal(result.forum.filing_profile, null);
  assert.equal(result.declaration['Filing profile'].value, 'pending');
  assert.deepEqual(result.matter_records, [{ path: rules, exists: true }]);
  assert.equal(readFileSync(result.matter_records[0].path, 'utf8'), order);
  const [pay, separation, expense, other] = result.governing_law;
  assert.equal(pay.pack, 'colorado');
  assert.equal(separation.pack, 'colorado');
  assert.equal(separation.held, true);
  assert.equal(separation.exception, 'Colorado, except as to wages');
  assert.equal(expense.reason, 'pending');
  assert.equal(other.status, 'none');

  writeFileSync(matter, declaration.replace(NEW_YORK_FEDERAL, COLORADO_STATE));
  const stateResult = command(['resolve', '--matter', matter]);
  assert.equal(stateResult.forum.pack, 'colorado');
  assert.deepEqual(stateResult.governing_law, result.governing_law);

  const ownPack = join(directory, 'jurisdictions', 'example-state');
  mkdirSync(ownPack, { recursive: true });
  cpSync(join(__dirname, 'fixtures', 'packs', 'example-state'), ownPack, { recursive: true });
  const manifestPath = join(ownPack, 'pack.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.forums[0].court_match = [NEW_YORK_FEDERAL];
  writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
  writeFileSync(matter, declaration);

  const ownResult = command(['resolve', '--matter', matter]);
  assert.equal(ownResult.forum.pack, 'example-state');
  assert.equal(ownResult.forum.own_pack, true);
  assert.deepEqual(ownResult.forum.set_aside, ['federal']);
  assert.deepEqual(ownResult.matter_records, result.matter_records);
  assert.deepEqual(ownResult.governing_law, result.governing_law);
  const { forum } = command(['lookup', '--court', NEW_YORK_FEDERAL, '--matter', matter]);
  assert.deepEqual(forum, ownResult.forum);
});

test('stale starts prompting only after the federal excerpts pass the 180-day cutoff', () => {
  const [, date] = readFileSync(join(PACK, 'excerpts', 'frcp-1.txt'), 'utf8').split('\n');
  const readTime = Date.parse(date + 'T00:00:00Z');
  const later = days => new Date(readTime + days * 86_400_000).toISOString().slice(0, 10);
  const stale = today => command(['stale', '--pack', 'federal', '--today', today, '--days', '180']);
  assert.deepEqual(stale(date), { prompts: [] });
  assert.deepEqual(stale(later(180)), { prompts: [] });
  assert.deepEqual(stale(later(181)).prompts, statements.map(({ id }) => ({
    pack: 'federal', file: join(PACK, FORUM), id, message: 'confirm: last read ' + date,
  })));
});

test('validation fails on missing source metadata, incorrect excerpt headers and a missing excerpt', t => {
  const pack = join(temporary(t), 'federal');
  cpSync(PACK, pack, { recursive: true });
  const forumFile = join(pack, FORUM);
  const originalForum = readFileSync(forumFile, 'utf8');
  const forum = JSON.parse(originalForum);
  const statement = forum.statements[0];
  const excerpt = join(pack, statement.excerpt);
  const originalExcerpt = readFileSync(excerpt, 'utf8');

  function reasons() {
    const result = command(['validate', '--pack', pack], 1);
    assert.equal(result.ok, false);
    return result.failures
      .filter(finding => finding.pack === 'federal' && finding.file === FORUM && finding.id === statement.id)
      .map(finding => finding.reason);
  }

  const originalSource = statement.source;
  delete statement.source;
  writeFileSync(forumFile, JSON.stringify(forum) + '\n');
  assert.ok(reasons().includes('source must be an object.'));

  statement.source = { ...originalSource, url: 'not-a-url' };
  statement.last_read = '2026-02-30';
  writeFileSync(forumFile, JSON.stringify(forum) + '\n');
  const metadataReasons = reasons();
  assert.ok(metadataReasons.some(reason => reason.startsWith('source.url')));
  assert.ok(metadataReasons.some(reason => reason.startsWith('last_read')));
  writeFileSync(forumFile, originalForum);

  const [, , ...body] = originalExcerpt.split('\n');
  writeFileSync(excerpt, ['https://example.invalid/fictional-source', '2026-01-01', ...body].join('\n'));
  const headerReasons = reasons();
  assert.ok(headerReasons.some(reason => reason.includes('first line')));
  assert.ok(headerReasons.some(reason => reason.includes('second line')));

  rmSync(excerpt);
  assert.ok(reasons().includes('Verified excerpt file must exist and be non-empty.'));
});
