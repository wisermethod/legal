'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');

const TOOL = realpathSync(join(__dirname, '..'));
const CLI = join(TOOL, 'scripts', 'jurisdictions.js');
const PACK = join(TOOL, 'packs', 'new-york');
const AREAS = ['contract', 'employment', 'consumer'];
const LAW_FILES = AREAS.map(area => join(PACK, 'law', area + '.json'));
const READ_DATE = '2026-11-23';
const FEDERAL_COURT = 'United States District Court for the Southern District of New York';

function command(...args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('New York law validates with a nonempty dated excerpt for each statement', () => {
  const validation = command('validate', '--pack', 'new-york');
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.failures, []);
  assert.deepEqual(validation.gaps.filter(({ file }) => file.startsWith('law/')), []);

  const statements = LAW_FILES.flatMap(file => {
    const half = JSON.parse(readFileSync(file, 'utf8'));
    assert.ok(half.statements.length > 0, file);
    return half.statements;
  });
  const excerpts = readdirSync(join(PACK, 'excerpts')).filter(name => name.startsWith('law-')).sort();
  assert.deepEqual(statements.map(({ excerpt }) => excerpt).sort(), excerpts.map(name => 'excerpts/' + name));
  for (const { excerpt, source, state, last_read } of statements) {
    assert.match(source.url, /^https:\/\/www\.(?:nysenate\.gov\/legislation\/laws|nycourts\.gov\/reporter\/3dseries)\//);
    assert.equal(state, 'Verified', excerpt);
    assert.equal(last_read, READ_DATE, excerpt);
    const [url, date, ...body] = readFileSync(join(PACK, excerpt), 'utf8').split('\n');
    assert.equal(url, source.url, excerpt);
    assert.equal(date, READ_DATE, excerpt);
    assert.ok(body.join('\n').trim(), 'missing source text in ' + excerpt);
  }
});

test('New York law sources are current on the explicit read date', () => {
  const current = command('stale', '--pack', 'new-york', '--today', READ_DATE);
  assert.deepEqual(current.prompts.filter(({ file }) => LAW_FILES.includes(file)), []);
  const later = command('stale', '--pack', 'new-york', '--today', '2027-05-23');
  const filesWithStaleLaw = new Set(later.prompts.map(({ file }) => file).filter(file => LAW_FILES.includes(file)));
  assert.deepEqual(filesWithStaleLaw, new Set(LAW_FILES));
});

test('lookup accepts explicit New York state law names', () => {
  for (const law of ['New York', 'new york law', 'New York State law', 'State of New York',
    'the law of New York', 'the laws of the State of New York', 'the laws of New York State',
    'State of New York law']) {
    const result = command('lookup', '--law', law);
    assert.deepEqual(result.governing_law, [{
      claim: null, law_named: law, clause_and_document: null, source_and_date: null,
      pack: 'new-york', files: LAW_FILES, own_pack: false,
    }], law);
    assert.equal(Object.hasOwn(result, 'forum'), false, law);
    assert.deepEqual(result.invalid_packs, [], law);
  }
});

test('lookup leaves other laws and local New York names uncovered', () => {
  for (const law of ['NY', 'New York City', 'New York City law', 'laws of the City of New York',
    'New York County', 'New York County law', 'the laws of New York State and New York City',
    'State of New York local law', 'State of New York law enforcement', 'United States law in New York',
    FEDERAL_COURT, 'Example State except where New York applies']) {
    const { governing_law: [match] } = command('lookup', '--law', law);
    assert.equal(match.status, 'none', law);
    assert.equal(match.reason, 'no pack covers this law', law);
    assert.equal(Object.hasOwn(match, 'files'), false, law);
  }
});

test('a leading New York law match with an exception stays held', () => {
  for (const name of ['New York', 'the laws of New York State', 'State of New York law']) {
    const law = name + ' except where Colorado applies';
    const { governing_law: [match] } = command('lookup', '--law', law);
    assert.equal(match.pack, 'new-york', law);
    assert.equal(match.held, true, law);
    assert.equal(match.matched_law, name, law);
    assert.equal(match.law_named, law);
    assert.equal(match.exception, law);
  }
});

test('resolve pairs a federal forum with New York and Colorado law claim by claim', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'jurisdictions-new-york-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const matter = join(directory, 'AGENTS.md');
  const source = 'Fictional agreement, 2026-11-23';
  writeFileSync(matter, `# Fictional matter

## Forum and posture

| Field | Value | Source and date |
| --- | --- | --- |
| Court or forum | ${FEDERAL_COURT} | Fictional complaint, 2026-11-23 |
| Forum type | court | Fictional complaint, 2026-11-23 |
| Governing law | See Governing law by claim | ${source} |
| Rules home | not yet obtained | pending |
| Filing profile | pending | pending |

### Governing law by claim

| Claim or agreement | Law named | Clause and document | Source and date |
| --- | --- | --- | --- |
| Subscription agreement | the laws of the State of New York | Subscription section 7 | ${source} |
| Installation agreement | Colorado | Installation section 9 | ${source} |
| Repair claim | not stated | No declaration | ${source} |
`);
  const result = command('resolve', '--matter', matter);
  assert.equal(result.forum.pack, 'federal');
  assert.equal(result.forum.id, 'district-court');
  assert.equal(result.forum.filing_profile, null);
  assert.deepEqual(result.governing_law.map(row => [row.claim, row.pack ?? row.status]), [
    ['Subscription agreement', 'new-york'], ['Installation agreement', 'colorado'], ['Repair claim', 'none'],
  ]);
  const [subscription, installation, repair] = result.governing_law;
  assert.deepEqual(subscription.files, LAW_FILES);
  assert.equal(subscription.clause_and_document, 'Subscription section 7');
  assert.equal(subscription.source_and_date, source);
  assert.deepEqual(installation.files, [...AREAS, 'personal-injury']
    .map(area => join(TOOL, 'packs', 'colorado', 'law', area + '.json')));
  assert.equal(repair.reason, 'not stated');
  assert.equal(result.invalid_packs, undefined);
});

test('the catalog and lookup expose only supported New York areas', () => {
  const { packs } = command('list');
  const ny = packs.find(({ id }) => id === 'new-york');
  assert.equal(ny.kind, 'state');
  assert.deepEqual(ny.law, AREAS);
  assert.equal(ny.law.includes('personal-injury'), false);
  const { governing_law: [match] } = command('lookup', '--law', 'New York');
  assert.deepEqual(match.files, LAW_FILES);
  assert.equal(match.files.some(file => file.endsWith('/personal-injury.json')), false);
  const courtOnly = command('lookup', '--court', FEDERAL_COURT);
  assert.equal(courtOnly.forum.pack, 'federal');
  assert.equal(Object.hasOwn(courtOnly.forum, 'files'), false);
  assert.equal(Object.hasOwn(courtOnly, 'governing_law'), false);
});
