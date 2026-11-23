'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { before, test } = require('node:test');

const TOOL = realpathSync(join(__dirname, '..'));
const PACK_ID = 'new-york';
const READ_DATE = '2026-11-23';
const KINGS = 'Supreme Court of the State of New York, County of Kings';
const FEDERAL = 'United States District Court for the Southern District of New York';
const COUNTIES = [
  'Albany', 'Allegany', 'Bronx', 'Broome', 'Cattaraugus', 'Cayuga', 'Chautauqua', 'Chemung',
  'Chenango', 'Clinton', 'Columbia', 'Cortland', 'Delaware', 'Dutchess', 'Erie', 'Essex',
  'Franklin', 'Fulton', 'Genesee', 'Greene', 'Hamilton', 'Herkimer', 'Jefferson', 'Kings',
  'Lewis', 'Livingston', 'Madison', 'Monroe', 'Montgomery', 'Nassau', 'New York', 'Niagara',
  'Oneida', 'Onondaga', 'Ontario', 'Orange', 'Orleans', 'Oswego', 'Otsego', 'Putnam',
  'Queens', 'Rensselaer', 'Richmond', 'Rockland', 'Saratoga', 'Schenectady', 'Schoharie',
  'Schuyler', 'Seneca', 'St[.]? Lawrence', 'Steuben', 'Suffolk', 'Sullivan', 'Tioga',
  'Tompkins', 'Ulster', 'Warren', 'Washington', 'Wayne', 'Westchester', 'Wyoming', 'Yates',
];
const COUNTY = '(?:' + COUNTIES.join('|') + ')';
const DESIGNATION = '(?:County of ' + COUNTY + '|' + COUNTY + ' County)';
const COMMA = '[ \\t]*,[ \\t]*';
const FORUM = {
  id: 'supreme-court',
  name: 'Supreme Court of the State of New York',
  tier: 'New York state civil general-jurisdiction trial court',
  court_match: [
    'Supreme Court of the State of New York' + COMMA + DESIGNATION,
    'Supreme Court' + COMMA + DESIGNATION + COMMA + '(?:State of )?New York',
    'New York State Supreme Court' + COMMA + DESIGNATION,
  ],
  file: 'forum/supreme-court.json',
};

function temporary(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'jurisdictions-new-york-forum-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function jsonFile(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function fixture(t) {
  const tool = join(temporary(t), 'Jurisdictions');
  for (const name of ['scripts', 'packs', 'schema', 'TOOL.md']) {
    cpSync(join(TOOL, name), join(tool, name), { recursive: true });
  }
  const pack = join(tool, 'packs', PACK_ID);
  const manifestFile = join(pack, 'pack.json');
  const manifest = jsonFile(manifestFile);
  // While the two halves are being assembled, exercise the proposed list in this copy.
  // Once registered, the shipped list must be exactly the one used for the proof.
  if (manifest.forums.length !== 0) assert.deepEqual(manifest.forums, [FORUM]);
  manifest.forums = [FORUM];
  writeFileSync(manifestFile, JSON.stringify(manifest) + '\n');
  return { tool, pack };
}

function run(tool, ...args) {
  const cli = join(tool, 'scripts', 'jurisdictions.js');
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  return result;
}

function command(tool, ...args) {
  const { status, stderr, stdout } = run(tool, ...args);
  assert.equal(status, 0, stderr);
  assert.equal(stderr, '');
  return JSON.parse(stdout);
}

let catalog;
before(t => {
  catalog = fixture(t);
});

test('the New York forum validates against the closed schema and has a dated official excerpt per statement', () => {
  const { tool, pack } = catalog;
  const validation = command(tool, 'validate', '--pack', PACK_ID);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.packs, [PACK_ID]);
  assert.deepEqual(validation.failures, []);
  assert.deepEqual(validation.gaps.filter(({ file }) => file === FORUM.file), []);

  const half = jsonFile(join(pack, FORUM.file));
  assert.equal(half.filing_profile, null);
  assert.ok(half.obtain.some(item => item.includes('Rules home')));
  assert.ok(half.obtain.some(item => item.includes('Commercial Division')));
  const names = readdirSync(join(pack, 'excerpts')).filter(name => name.startsWith('forum-')).sort();
  assert.ok(names.length > 0);
  assert.deepEqual(half.statements.map(({ excerpt }) => excerpt).sort(), names.map(name => 'excerpts/' + name));
  for (const { excerpt, source, state, last_read } of half.statements) {
    assert.equal(state, 'Verified', excerpt);
    assert.equal(last_read, READ_DATE, excerpt);
    const [url, date, ...rest] = readFileSync(join(pack, excerpt), 'utf8').split('\n');
    assert.equal(url, source.url, excerpt);
    assert.equal(date, last_read, excerpt);
    const body = rest.join('\n').trim();
    if (url.startsWith('https://www.nysenate.gov/')) {
      assert.match(url, /^https:\/\/www\.nysenate\.gov\/legislation\/laws\/(?:CVP|GCN)\/[\dA-Z-]+$/);
      assert.match(body, /^Viewing most recent revision \(from \d{4}-\d{2}-\d{2}\)\n\n(?:§|Rule) \d/m, excerpt);
    } else {
      assert.equal(url, 'https://www.nycourts.gov/rules/part-202-uniform-civil-rules-supreme-court-and-county-court');
      assert.match(body, /^## Section 202\.[\w.-]+ .+\n[\s\S]*\S/, excerpt);
    }
  }
});

test('the CLI rejects a wrongly dated Verified forum excerpt and reports its statement', t => {
  const { tool, pack } = fixture(t);
  const { statements: [statement] } = jsonFile(join(pack, FORUM.file));
  const file = join(pack, statement.excerpt);
  const lines = readFileSync(file, 'utf8').split('\n');
  lines[1] = '2026-11-22';
  writeFileSync(file, lines.join('\n'));

  const { status, stderr, stdout } = run(tool, 'validate', '--pack', PACK_ID);
  assert.equal(status, 1);
  assert.equal(stdout, '');
  const failure = JSON.parse(stderr).failures.find(({ id }) => id === statement.id);
  assert.equal(failure?.file, FORUM.file);
  assert.match(failure.reason, /second line must equal last_read/);
});

test('county trial court names and supported index references select only the civil Supreme Court forum', () => {
  const { tool, pack } = catalog;
  const half = jsonFile(join(pack, FORUM.file));
  for (const court of [
    KINGS,
    'Supreme Court, New York County, New York',
    'Supreme Court, County of St. Lawrence, State of New York',
    'New York State Supreme Court, Yates County',
    'Supreme Court of the State of New York, Suffolk County',
    '  supreme court of the state of new york, county of queens  ',
    KINGS + ', Index No. 123456/2026',
    'Supreme Court, New York County, New York No. 123456/2026',
  ]) {
    const result = command(tool, 'lookup', '--court', court);
    assert.deepEqual(result.forum, {
      pack: PACK_ID, id: FORUM.id, name: FORUM.name, file: join(pack, FORUM.file), tier: FORUM.tier,
      own_pack: false, filing_profile: null, obtain: half.obtain,
    }, court);
    assert.equal(Object.hasOwn(result, 'governing_law'), false, court);
    assert.deepEqual(result.invalid_packs, [], court);
  }
});

test('other court systems and a missing or ambiguous county court declaration never select this forum', () => {
  const { tool } = catalog;
  for (const court of [FEDERAL, 'SDNY']) {
    assert.equal(command(tool, 'lookup', '--court', court).forum.pack, 'federal', court);
  }
  for (const court of [
    'Supreme Court of the United States',
    'Supreme Court of the State of New York, Appellate Division, Second Department',
    KINGS + ', Appellate Division',
    'Supreme Court of the State of California, County of Kings',
    'Supreme Court, Kings County, California',
    'Civil Court of the City of New York, County of Kings',
    'County Court, Erie County, New York',
    'Supreme Court, Imaginary County, New York',
    'Supreme Court, Kings County',
    'Supreme Court of the State of New York',
    KINGS + ' No. 2',
    'pending',
  ]) {
    const { forum } = command(tool, 'lookup', '--court', court);
    assert.equal(forum.status, 'none', court);
    assert.equal(Object.hasOwn(forum, 'filing_profile'), false, court);
  }
});

test('explicit New York governing law resolves independently of New York, federal or unknown forum', () => {
  const { tool, pack } = catalog;
  const law = 'the laws of the State of New York';
  const expectedFiles = ['contract', 'employment', 'consumer'].map(area => join(pack, 'law', area + '.json'));
  for (const [court, forumPack] of [[KINGS, PACK_ID], [FEDERAL, 'federal'], ['pending', undefined]]) {
    const result = command(tool, 'lookup', '--court', court, '--law', law);
    assert.equal(result.forum.pack, forumPack, court);
    assert.equal(result.governing_law[0].pack, PACK_ID, court);
    assert.deepEqual(result.governing_law[0].files, expectedFiles, court);
  }

  const result = command(tool, 'lookup', '--court', KINGS, '--law', 'New York City law');
  assert.equal(result.forum.pack, PACK_ID);
  assert.equal(result.governing_law[0].status, 'none');
});

test('a fictional New York matter retains claim law, its Rules home and an unresolved filing profile', t => {
  const { tool } = catalog;
  const directory = temporary(t);
  const rules = join(directory, 'rules');
  mkdirSync(rules);
  const matter = join(directory, 'AGENTS.md');
  writeFileSync(matter, [
    '# Fictional matter',
    '',
    '## Forum and posture',
    '',
    '| Field | Value | Source and date |',
    '| --- | --- | --- |',
    '| Court or forum | ' + KINGS + ', Index No. 123456/2026 | Sample complaint |',
    '| Forum type | court | Sample complaint |',
    '| Governing law | See Governing law by claim | Sample agreement |',
    '| Rules home | rules/ | Sample rules |',
    '| Filing profile | pending | pending |',
    '',
    '### Governing law by claim',
    '',
    '| Claim or agreement | Law named | Clause and document | Source and date |',
    '| --- | --- | --- | --- |',
    '| First claim | Colorado | Clause 1 | Sample agreement |',
    '| Second claim | pending | pending | pending |',
    '',
  ].join('\n'));
  const result = command(tool, 'resolve', '--matter', matter);
  assert.equal(result.forum.pack, PACK_ID);
  assert.equal(result.forum.filing_profile, null);
  assert.equal(result.declaration['Filing profile'].value, 'pending');
  assert.deepEqual(result.matter_records, [{ path: rules, exists: true }]);
  assert.equal(result.governing_law[0].pack, 'colorado');
  assert.equal(result.governing_law[1].status, 'none');
});

test('the forum excerpts are current at the pinned read date', () => {
  const { tool, pack } = catalog;
  const { prompts } = command(tool, 'stale', '--pack', PACK_ID, '--today', READ_DATE, '--days', '0');
  assert.deepEqual(prompts.filter(({ file }) => file === join(pack, FORUM.file)), []);
});
