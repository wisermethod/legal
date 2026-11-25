'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, dirname, join } = require('node:path');
const { test } = require('node:test');

const CLI = join(__dirname, '..', 'scripts', 'jurisdictions.js');
const PACKS = realpathSync(join(__dirname, 'fixtures', 'packs'));
const STATE = join(PACKS, 'example-state');
const ARBITRATION = join(PACKS, 'example-arbitration');
const COLORADO = join(realpathSync(join(__dirname, '..')), 'packs', 'colorado');
const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'skills', 'Open a Matter',
  'assets', 'matter-template', 'AGENTS.md'), 'utf8');

const COURT = 'Example Trial Court, Sample County, Example State';
const LAW = 'Example State';
const CONTRACT = 'law/contract.json';
const CONSUMER = 'law/consumer.json';
const FORUM = 'forum/example-trial.json';
const CONTRACT_EXCERPT = 'excerpts/contract.txt';
const SOURCE = 'Fictional agreement, 2025-07-01';
const COLORADO_COURT = 'District Court, Denver County, Colorado';

// Expected stale prompts and [verify] gaps for shipped Colorado files, derived from the files themselves,
// so the suite follows the pack's content and the calendar rather than fixing either.
const dayOf = date => { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
function localDay() { const now = new Date(); return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000; }
function coloradoStatements(file) { return JSON.parse(readFileSync(file, 'utf8')).statements; }
function coloradoDetails(files) {
  const stale = [];
  const gaps = [];
  for (const file of files) {
    for (const statement of coloradoStatements(file)) {
      if (localDay() - dayOf(statement.last_read) > 180) {
        stale.push({ pack: 'colorado', file, id: statement.id, message: 'confirm: last read ' + statement.last_read, own_pack: false });
      }
      if (statement.state === '[verify]') {
        gaps.push({ pack: 'colorado', file, id: statement.id, reason: 'Statement is marked [verify].', own_pack: false });
      }
    }
  }
  return { stale, gaps };
}
const byFileAndId = entries => [...entries].sort((a, b) => (a.file + ' ' + a.id).localeCompare(b.file + ' ' + b.id));
const COLORADO_AREAS = ['contract', 'employment', 'consumer', 'personal-injury'];

function run(args, packsDirectory) {
  const invocation = packsDirectory === undefined ? [CLI, ...args] : [
    '-e', 'const [script, packsDirectory, ...args] = process.argv.slice(1);' +
      'process.exitCode = require(script).main(args, { packsDirectory });',
    '--', CLI, packsDirectory, ...args,
  ];
  const result = spawnSync(process.execPath, invocation, { encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  return result;
}

function success(args, packsDirectory) {
  const result = run(args, packsDirectory);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

function failure(args, packsDirectory) {
  const result = run(args, packsDirectory);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  return result.stderr;
}

function temporary(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jurisdictions-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function copyPack(t, fixture = STATE, root = temporary(t)) {
  const pack = join(root, fixture === STATE ? 'example-state' : 'example-arbitration');
  cpSync(fixture, pack, { recursive: true });
  return pack;
}

function editJson(dir, file, edit) {
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  edit(data);
  writeFileSync(path, JSON.stringify(data) + '\n');
}

function copyMatterPack(matterFile, fixture = STATE, id = basename(fixture)) {
  const root = join(dirname(matterFile), 'jurisdictions');
  mkdirSync(root, { recursive: true });
  const pack = join(root, id);
  cpSync(fixture, pack, { recursive: true });
  if (id !== basename(fixture)) editJson(pack, 'pack.json', data => { data.id = id; });
  return pack;
}

function replaceRequired(text, before, after) {
  assert.ok(text.includes(before), 'Matter declaration template changed: ' + before);
  return text.replace(before, () => after);
}

function matter(t, options = {}) {
  const {
    court = COURT,
    forumType = 'court',
    governingLaw = 'see Governing law by claim',
    rules = 'not yet obtained',
    filingProfile = 'pending',
    laws = [LAW],
    alter = value => value,
  } = options;
  let text = TEMPLATE;
  for (const [field, original, value] of [
    ['Court or forum', 'pending', court],
    ['Forum type', 'pending', forumType],
    ['Governing law', 'pending', governingLaw],
    ['Rules home', 'not yet obtained', rules],
    ['Filing profile', 'pending', filingProfile],
  ]) {
    text = replaceRequired(text, '| ' + field + ' | ' + original + ' | [Source, YYYY-MM-DD] |',
      '| ' + field + ' | ' + value + ' | ' + SOURCE + ' |');
  }
  text = replaceRequired(text, '| [Claim or agreement] | [Law named, or not stated] | [Clause and document] | [Source, YYYY-MM-DD] |',
    laws.map((law, index) => '| Agreement ' + (index + 1) + ' | ' + law + ' | § 1 of the agreement | ' + SOURCE + ' |').join('\n'));
  const path = join(temporary(t), 'AGENTS.md');
  writeFileSync(path, alter(text));
  return path;
}

function resolveMatter(path, packsDirectory = PACKS) {
  return success(['resolve', '--matter', path], packsDirectory);
}

function validationFailure(pack, file, id, reason) {
  const result = JSON.parse(failure(['validate', '--pack', pack]));
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(finding => finding.pack === 'example-state' && finding.file === file &&
    finding.id === id && reason.test(finding.reason)), JSON.stringify(result.failures));
  return result;
}

test('list on the shipped tree describes each shipped pack and forum tier', () => {
  assert.deepEqual(success(['list']), { packs: [
    { id: 'colorado', name: 'Colorado', kind: 'state', law: COLORADO_AREAS, forums: [
      { id: 'district-court', name: 'Colorado district court', tier: 'general-jurisdiction trial court' },
      { id: 'county-court', name: 'Colorado county court', tier: 'limited-jurisdiction trial court' },
      { id: 'small-claims', name: 'Colorado county court, small claims', tier: 'small claims division of the county court' },
    ] },
    { id: 'federal', name: 'Federal', kind: 'federal', law: [],
      forums: [{ id: 'district-court', name: 'United States district court', tier: 'federal district court' }] },
    { id: 'jams', name: 'JAMS', kind: 'arbitration-forum', law: [],
      forums: [{ id: 'employment', name: 'JAMS employment arbitration', tier: 'arbitration forum' }] },
    { id: 'new-york', name: 'New York', kind: 'state', law: ['contract', 'employment', 'consumer'],
      forums: [{ id: 'supreme-court', name: 'Supreme Court of the State of New York', tier: 'New York state civil general-jurisdiction trial court' }] },
  ] });
});

test('list describes each fictional pack and forum tier', () => {
  assert.deepEqual(success(['list'], PACKS), { packs: [
    { id: 'example-arbitration', name: 'Example Arbitration Association', kind: 'arbitration-forum', law: [],
      forums: [{ id: 'example-panel', name: 'Example Arbitration Association Panel', tier: 'arbitration forum' }] },
    { id: 'example-state', name: 'Example State', kind: 'state', law: ['contract', 'consumer'],
      forums: [{ id: 'example-trial', name: 'Example Trial Court', tier: 'general-jurisdiction trial court' }] },
  ] });
});

test('validate accepts a good pack by absolute directory', () => {
  assert.deepEqual(success(['validate', '--pack', STATE]), {
    ok: true, packs: ['example-state'], failures: [], gaps: [],
  });
  assert.equal(success(['validate', '--pack', ARBITRATION]).ok, true);
});

test('validate selects all shipped packs by default or one by id', () => {
  assert.deepEqual(success(['validate']).packs, ['colorado', 'federal', 'jams', 'new-york']);
  assert.deepEqual(success(['validate'], PACKS).packs, ['example-arbitration', 'example-state']);
  assert.deepEqual(success(['validate', '--pack', 'example-arbitration'], PACKS).packs, ['example-arbitration']);
});

test('the shipped Colorado pack validates, its gaps are its [verify] statements, and none is stale on its read date', () => {
  const manifest = JSON.parse(readFileSync(join(COLORADO, 'pack.json'), 'utf8'));
  const files = [...manifest.law.map(entry => entry.file), ...manifest.forums.map(forum => forum.file)];
  const statements = files.flatMap(file => coloradoStatements(join(COLORADO, file)).map(statement => ({ file, statement })));
  const { gaps, ...rest } = success(['validate', '--pack', 'colorado']);
  assert.deepEqual(rest, { ok: true, packs: ['colorado'], failures: [] });
  assert.deepEqual(byFileAndId(gaps), byFileAndId(statements.filter(({ statement }) => statement.state === '[verify]')
    .map(({ file, statement }) => ({ pack: 'colorado', file, id: statement.id, reason: 'Statement is marked [verify].' }))));
  const newest = statements.map(({ statement }) => statement.last_read).sort().at(-1);
  assert.deepEqual(success(['stale', '--pack', 'colorado', '--today', newest]), { prompts: [] });
  assert.deepEqual(success(['stale', '--today', newest]), {
    prompts: success(['list']).packs.flatMap(({ id }) => success(['stale', '--pack', id, '--today', newest]).prompts),
  });
});

test('the Colorado district court filing profile still matches caption forms only', () => {
  const profile = JSON.parse(readFileSync(join(__dirname, '..', '..', 'Court Filing', 'profiles', 'colorado-district.json'), 'utf8'));
  const patterns = profile.court_match.map(pattern => new RegExp('^(?:' + pattern + ')$', 'i'));
  assert.ok(patterns.some(pattern => pattern.test('District Court, Larimer County, Colorado')));
  assert.ok(patterns.some(pattern => pattern.test('District Court, City and County of Denver, Colorado')));
  assert.ok(patterns.every(pattern => !pattern.test('Larimer County District Court, Colorado')));
  assert.ok(patterns.every(pattern => !pattern.test('District Court, Larimer County, State of Colorado')));
});

for (const [court, id] of [
  [COLORADO_COURT, 'district-court'],
  ['District Court, City and County of Denver, Colorado', 'district-court'],
  ['County Court, Arapahoe County, Colorado', 'county-court'],
  ['Small Claims Division, County Court, Boulder County, Colorado', 'small-claims'],
  [COLORADO_COURT + ', Case No. 2025CV31234', 'district-court'],
]) {
  test('lookup matches ' + court, () => {
    const { forum, ...details } = success(['lookup', '--court', court]);
    assert.equal(forum.pack, 'colorado');
    assert.equal(forum.id, id);
    assert.equal(forum.file, join(COLORADO, 'forum', id + '.json'));
    assert.equal(forum.own_pack, false);
    assert.equal(forum.filing_profile, id === 'district-court' ? 'colorado-district' : null);
    assert.deepEqual(forum.obtain, id === 'district-court'
      ? ["the judicial district's local rules", "the assigned division's practice standards",
        'any case management or other order entered in the case']
      : ["the court's local rules or practice standards", 'any order entered in the case']);
    const expected = coloradoDetails([forum.file]);
    assert.deepEqual({ ...details, stale: byFileAndId(details.stale), gaps: byFileAndId(details.gaps) },
      { stale: byFileAndId(expected.stale), gaps: byFileAndId(expected.gaps), invalid_packs: [] });
  });
}

const coloradoCourtForms = {
  'district-court': [
    'District Court, Larimer County',
    'District Court, City and County of Denver',
    'Larimer County District Court',
    'City and County of Denver District Court',
  ],
  'county-court': [
    'County Court, Larimer County',
    'County Court, City and County of Denver',
    'Larimer County Court',
    'City and County of Denver County Court',
  ],
  'small-claims': [
    'Small Claims Court, Larimer County',
    'Small Claims Division, Larimer County',
    'Small Claims Court, County Court, Larimer County',
    'Small Claims Division, County Court, Larimer County',
    'Small Claims Court, City and County of Denver',
    'Small Claims Division, City and County of Denver',
    'Small Claims Court, County Court, City and County of Denver',
    'Small Claims Division, County Court, City and County of Denver',
    'Larimer County Small Claims Court',
    'Larimer County Small Claims Division',
    'Larimer County Court Small Claims Division',
    'City and County of Denver Small Claims Court',
    'City and County of Denver Small Claims Division',
    'City and County of Denver County Court Small Claims Division',
  ],
};

for (const [id, forms] of Object.entries(coloradoCourtForms)) {
  for (const form of forms) {
    test('lookup matches only ' + id + ' for ' + form, () => {
      for (const state of ['Colorado', 'State of Colorado']) {
        for (const reference of ['', ', Case No. 2025CV169']) {
          const court = form + ', ' + state + reference;
          // An overlapping match fails the CLI, so success also checks forum exclusivity.
          const { forum, invalid_packs } = success(['lookup', '--court', court]);
          assert.deepEqual(invalid_packs, [], court);
          assert.equal(forum.pack, 'colorado', court);
          assert.equal(forum.id, id, court);
        }
      }
    });
  }
}

test('resolve matches a county-first Colorado court with a case reference in the matter declaration', t => {
  const court = 'Larimer County District Court, State of Colorado, Case No. 2025CV169';
  const path = matter(t, { court });
  const { declaration, forum } = success(['resolve', '--matter', path]);
  assert.equal(declaration['Court or forum'].value, court);
  assert.equal(forum.pack, 'colorado');
  assert.equal(forum.id, 'district-court');
});

test('lookup reports uncovered courts and requires a whole court-name match', () => {
  for (const court of ['Supreme Court of Example State', COLORADO_COURT + ' Annex']) {
    assert.deepEqual(success(['lookup', '--court', court]), {
      forum: { status: 'none', reason: 'no pack covers this court' }, stale: [], gaps: [], invalid_packs: [],
    });
  }
});

test('lookup matches Colorado law names and returns one row with all four law files', () => {
  for (const law of ['Colorado', 'Colorado law', 'the law of Colorado', 'the laws of the State of Colorado', 'State of Colorado']) {
    assert.deepEqual(success(['lookup', '--law', law]), {
      governing_law: [{
        claim: null, law_named: law, clause_and_document: null, source_and_date: null,
        pack: 'colorado', files: COLORADO_AREAS.map(area => join(COLORADO, 'law', area + '.json')), own_pack: false,
      }],
      ...coloradoDetails(COLORADO_AREAS.map(area => join(COLORADO, 'law', area + '.json'))), invalid_packs: [],
    });
  }
});

test('lookup holds the leading Colorado law match and returns the whole exception', () => {
  const law = 'Colorado, except as to wages';
  const { governing_law: [row] } = success(['lookup', '--law', law]);
  assert.equal(row.law_named, law);
  assert.equal(row.pack, 'colorado');
  assert.deepEqual(row.files, COLORADO_AREAS.map(area => join(COLORADO, 'law', area + '.json')));
  assert.equal(row.held, true);
  assert.equal(row.matched_law, 'Colorado');
  assert.equal(row.exception, law);
});

test('lookup reports uncovered law and does not match names in the middle', () => {
  for (const law of ['Example State', 'Example State except where Colorado applies']) {
    assert.deepEqual(success(['lookup', '--law', law]), {
      governing_law: [{
        claim: null, law_named: law, clause_and_document: null, source_and_date: null,
        status: 'none', reason: 'no pack covers this law',
      }],
      stale: [], gaps: [], invalid_packs: [],
    });
  }
});

test('lookup prefers matter packs for both sides without a declaration', t => {
  const path = join(temporary(t), 'AGENTS.md');
  writeFileSync(path, '# Example matter\n');
  const pack = copyMatterPack(path, STATE, 'matter-colorado');
  editJson(pack, 'pack.json', data => {
    data.forums[0].court_match = [COLORADO_COURT];
    data.law_match = ['Colorado'];
  });

  const { forum, governing_law: [law], invalid_packs } = success([
    'lookup', '--court', COLORADO_COURT, '--law', 'Colorado', '--matter', path,
  ]);
  assert.equal(forum.file, join(pack, FORUM));
  assert.deepEqual(law.files, [join(pack, CONTRACT), join(pack, CONSUMER)]);
  for (const result of [forum, law]) {
    assert.equal(result.pack, 'matter-colorado');
    assert.equal(result.own_pack, true);
    assert.equal(result.pack_directory, pack);
    assert.deepEqual(result.set_aside, ['colorado']);
  }
  assert.deepEqual(invalid_packs, []);
});

test('lookup returns the same age prompts and gaps as resolve for selected files', t => {
  const path = matter(t);
  const own = copyMatterPack(path, STATE, 'matter-state');
  const unused = copyMatterPack(path, ARBITRATION);
  editJson(own, CONTRACT, data => {
    data.statements[0].state = '[verify]';
    data.statements[0].last_read = '2000-01-01';
  });
  editJson(unused, 'forum/example-panel.json', data => { data.statements[0].state = '[verify]'; });
  const resolved = resolveMatter(path);
  const result = success(['lookup', '--court', COURT, '--law', LAW, '--matter', path], PACKS);
  assert.deepEqual(result.forum, resolved.forum);
  assert.deepEqual(result.governing_law, [{
    ...resolved.governing_law[0], claim: null, clause_and_document: null, source_and_date: null,
  }]);
  assert.deepEqual(result.stale, resolved.stale);
  assert.ok(result.stale.some(prompt => prompt.file === join(own, CONTRACT) && prompt.own_pack && prompt.pack_directory === own));
  assert.deepEqual(result.gaps, resolved.gaps);
  assert.deepEqual(result.gaps, [{
    pack: 'matter-state', file: join(own, CONTRACT), id: 'contract-notice',
    reason: 'Statement is marked [verify].', own_pack: true, pack_directory: own,
  }]);
});

test('lookup keeps a valid match when the other side of a shipped pack is broken', t => {
  const pack = copyPack(t);
  const root = dirname(pack);
  const both = ['lookup', '--court', COURT, '--law', LAW];
  const excerpt = join(pack, CONTRACT_EXCERPT);
  rmSync(excerpt);
  const withForum = success(both, root);
  assert.equal(withForum.forum.file, join(pack, FORUM));
  assert.equal(withForum.governing_law[0].reason, 'no pack covers this law');
  assert.deepEqual(withForum.invalid_packs[0].matches, { forum: false, governing_law: [0] });
  assert.deepEqual(JSON.parse(failure(['lookup', '--law', LAW], root)).failures, withForum.invalid_packs[0].failures);

  cpSync(join(STATE, CONTRACT_EXCERPT), excerpt);
  rmSync(join(pack, 'excerpts', 'trial.txt'));
  const withLaw = success(both, root);
  assert.equal(withLaw.forum.reason, 'no pack covers this court');
  assert.deepEqual(withLaw.governing_law[0].files, [join(pack, CONTRACT), join(pack, CONSUMER)]);
  assert.deepEqual(withLaw.invalid_packs[0].matches, { forum: true, governing_law: [] });
  assert.deepEqual(JSON.parse(failure(['lookup', '--court', COURT], root)).failures, withLaw.invalid_packs[0].failures);
});

test('lookup refuses overlapping valid forums or laws with the same errors as resolve', t => {
  const path = matter(t);
  const root = temporary(t);
  copyPack(t, STATE, root);
  const other = copyPack(t, ARBITRATION, root);
  editJson(other, 'pack.json', data => { data.forums[0].court_match = [COURT]; });
  const forumError = failure(['resolve', '--matter', path], root);
  assert.match(forumError, /Multiple forums matched/);
  assert.equal(failure(['lookup', '--court', COURT], root), forumError);

  const own = copyMatterPack(path, STATE, 'matter-law');
  editJson(own, 'pack.json', data => { data.forums = []; });
  const second = copyMatterPack(path, STATE, 'other-law');
  editJson(second, 'pack.json', data => { data.forums = []; });
  const lawError = failure(['resolve', '--matter', path], PACKS);
  assert.match(lawError, /Multiple governing-law packs matched/);
  assert.equal(failure(['lookup', '--law', LAW, '--matter', path], PACKS), lawError);
});

test('lookup help lists all flags and bad usage exits with empty stdout', () => {
  const help = run(['lookup', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /lookup \[--court <court name>\] \[--law <law name>\] \[--matter <absolute-AGENTS\.md>\]/);
  assert.match(failure(['lookup']), /--court or --law is required/);
  assert.match(failure(['lookup', '--matter', 'AGENTS.md']), /--court or --law is required/);
  assert.match(failure(['lookup', '--court', COURT, '--court', COURT]), /Duplicate option --court/);
  assert.match(failure(['lookup', '--law', LAW, '--law', LAW]), /Duplicate option --law/);
  assert.match(failure(['lookup', '--law', LAW, '--matter', 'AGENTS.md']), /--matter must be an absolute path/);
});

test('validate refuses a missing Verified excerpt', t => {
  const pack = copyPack(t);
  rmSync(join(pack, CONTRACT_EXCERPT));
  validationFailure(pack, CONTRACT, 'contract-notice', /Verified excerpt file must exist/);
});

test('validate refuses an empty Verified excerpt', t => {
  const pack = copyPack(t);
  writeFileSync(join(pack, CONTRACT_EXCERPT), ' \n');
  validationFailure(pack, CONTRACT, 'contract-notice', /non-empty/);
});

test('validate refuses a mismatched source URL in a Verified excerpt', t => {
  const pack = copyPack(t);
  writeFileSync(join(pack, CONTRACT_EXCERPT), 'https://other-example.invalid/1\n2025-01-01\nFictional excerpt.\n');
  validationFailure(pack, CONTRACT, 'contract-notice', /first line must equal source\.url/);
});

test('validate accepts a Verified statement sourced by title and section with no url', t => {
  const pack = copyPack(t);
  editJson(pack, CONTRACT, data => delete data.statements[0].source.url);
  writeFileSync(join(pack, CONTRACT_EXCERPT), 'Example State Fictional Code § 1\n2025-01-01\nFictional excerpt.\n');
  const result = success(['validate', '--pack', pack]);
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('validate refuses a title-and-section excerpt whose first line is not the citation', t => {
  const pack = copyPack(t);
  editJson(pack, CONTRACT, data => delete data.statements[0].source.url);
  writeFileSync(join(pack, CONTRACT_EXCERPT), 'Example State Fictional Code § 2\n2025-01-01\nFictional excerpt.\n');
  validationFailure(pack, CONTRACT, 'contract-notice', /source\.citation where the source has no url/);
});

test('validate still refuses a url that is given but malformed', t => {
  const pack = copyPack(t);
  editJson(pack, CONTRACT, data => { data.statements[0].source.url = 'not a url'; });
  validationFailure(pack, CONTRACT, 'contract-notice', /source\.url, when given, must be an absolute/);
});

test('validate refuses a mismatched date in a Verified excerpt', t => {
  const pack = copyPack(t);
  writeFileSync(join(pack, CONTRACT_EXCERPT), 'https://example-state.invalid/code/1\n2025-01-02\nFictional excerpt.\n');
  validationFailure(pack, CONTRACT, 'contract-notice', /second line must equal last_read/);
});

test('validate refuses a missing last_read', t => {
  const pack = copyPack(t);
  editJson(pack, CONTRACT, data => delete data.statements[0].last_read);
  validationFailure(pack, CONTRACT, 'contract-notice', /last_read is required/);
});

test('validate refuses a missing tier and a pattern that does not compile', t => {
  const pack = copyPack(t);
  editJson(pack, 'pack.json', data => {
    delete data.forums[0].tier;
    data.forums[0].court_match = ['[invalid'];
  });
  const { failures } = validationFailure(pack, 'pack.json', null, /tier is required/);
  assert.ok(failures.some(item => /\.court_match\[0\] must compile/.test(item.reason)));
});

test('validate refuses a duplicate statement id across halves', t => {
  const pack = copyPack(t);
  editJson(pack, FORUM, data => { data.statements[0].id = 'contract-notice'; });
  validationFailure(pack, FORUM, 'contract-notice', /Duplicate statement id/);
});

test('validate refuses a missing law file', t => {
  const pack = copyPack(t);
  rmSync(join(pack, CONSUMER));
  validationFailure(pack, CONSUMER, null, /Referenced file does not exist/);
});

test('validate records a gap for a [verify] statement with no saved excerpt', t => {
  const pack = copyPack(t);
  rmSync(join(pack, CONTRACT_EXCERPT));
  editJson(pack, CONTRACT, data => { data.statements[0].state = '[verify]'; });
  const result = success(['validate', '--pack', pack]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.gaps, [{
    pack: 'example-state', file: CONTRACT, id: 'contract-notice', reason: 'Statement is marked [verify].',
  }]);
});

test('validate refuses an excerpt reference that escapes the pack through a symlink', t => {
  const pack = copyPack(t);
  const excerpt = join(pack, CONTRACT_EXCERPT);
  rmSync(excerpt);
  symlinkSync(join(STATE, CONTRACT_EXCERPT), excerpt);
  validationFailure(pack, CONTRACT, 'contract-notice', /outside its allowed pack directory/);
});

test('resolve returns both halves, matter records first and prompts only for returned files', t => {
  const path = matter(t, { rules: '`rules/local.md`', laws: [LAW, 'State of Example'] });
  const rules = join(dirname(path), 'rules', 'local.md');
  mkdirSync(dirname(rules));
  writeFileSync(rules, 'Fictional matter rules.\n');
  const before = readFileSync(path, 'utf8');
  const result = resolveMatter(path);
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.deepEqual(result.declaration['Court or forum'], { value: COURT, source_and_date: SOURCE });
  assert.deepEqual(result.matter_records, [{ path: rules, exists: true }]);
  assert.deepEqual(result.forum, {
    pack: 'example-state', id: 'example-trial', name: 'Example Trial Court', file: join(STATE, FORUM),
    tier: 'general-jurisdiction trial court', filing_profile: 'example-trial',
    obtain: ['Local rules', "Assigned judge's practice standards"], own_pack: false,
  });
  const files = [join(STATE, CONTRACT), join(STATE, CONSUMER)];
  assert.deepEqual(result.governing_law, [
    { claim: 'Agreement 1', law_named: LAW, clause_and_document: '§ 1 of the agreement', source_and_date: SOURCE,
      pack: 'example-state', files, own_pack: false },
    { claim: 'Agreement 2', law_named: 'State of Example', clause_and_document: '§ 1 of the agreement', source_and_date: SOURCE,
      pack: 'example-state', files, own_pack: false },
  ]);
  const selected = new Set([result.forum.file, ...files]);
  const expected = success(['stale'], PACKS).prompts.filter(entry => selected.has(entry.file))
    .map(entry => ({ ...entry, own_pack: false }));
  const byId = (a, b) => a.id.localeCompare(b.id);
  assert.deepEqual(result.stale.sort(byId), expected.sort(byId));
});

test('resolve matches the case-insensitive court name with a trailing case number', t => {
  const result = resolveMatter(matter(t, { court: COURT.toLowerCase() + ', Case No. 2025-EX-12' }));
  assert.equal(result.forum.file, join(STATE, FORUM));
});

test('resolve leaves the forum and the governing-law selections independent', t => {
  const result = resolveMatter(matter(t, {
    court: 'Example Arbitration Association, Reference 17',
    forumType: 'arbitration',
    filingProfile: "not a court: submissions follow the forum's own rules",
  }));
  assert.equal(result.forum.pack, 'example-arbitration');
  assert.equal(result.forum.tier, 'arbitration forum');
  assert.equal(result.forum.filing_profile, null);
  assert.equal(result.governing_law[0].pack, 'example-state');
});

test('resolve returns missing and the parties record direction when the section is absent', t => {
  const path = matter(t, { alter: text => replaceRequired(text, '## Forum and posture', '## Prior declaration') });
  const result = resolveMatter(path, path);
  assert.equal(result.declaration, 'missing');
  assert.equal(result.forum.status, 'none');
  assert.match(result.forum.reason, /forum must come from the parties record/);
  assert.deepEqual(result.governing_law, []);
  assert.deepEqual(result.matter_records, []);
  assert.deepEqual(result.stale, []);
});

test('resolve returns missing when the declaration heading exists without its field table', t => {
  const path = matter(t, { alter: text => replaceRequired(text, '| Field | Value | Source and date |', 'No field table.') });
  assert.equal(resolveMatter(path).declaration, 'missing');
});

test('resolve returns none for pending court and law fields', t => {
  const result = resolveMatter(matter(t, { court: 'pending', governingLaw: 'pending', laws: ['pending'] }));
  assert.deepEqual(result.forum, { status: 'none', reason: 'pending' });
  assert.equal(result.governing_law[0].status, 'none');
  assert.equal(result.governing_law[0].reason, 'pending');
});

test('resolve returns none when a claim states no law', t => {
  const result = resolveMatter(matter(t, { laws: ['not stated'] }));
  assert.equal(result.governing_law[0].status, 'none');
  assert.equal(result.governing_law[0].reason, 'not stated');
});

test('resolve reports when the shipped catalog covers neither the court nor the law', t => {
  const result = resolveMatter(matter(t, { court: COURT, laws: [LAW] }), join(temporary(t), 'absent'));
  assert.deepEqual(result.forum, { status: 'none', reason: 'no pack covers this court' });
  assert.equal(result.governing_law[0].status, 'none');
  assert.equal(result.governing_law[0].reason, 'no pack covers this law');
});

test('resolve preserves a governing-law exception and holds the match', t => {
  const clause = 'Example State, except where Other State law requires';
  const { governing_law: [result] } = resolveMatter(matter(t, { laws: [clause] }));
  assert.equal(result.pack, 'example-state');
  assert.equal(result.exception, clause);
  assert.equal(result.held, true);
  assert.deepEqual(result.files, [join(STATE, CONTRACT), join(STATE, CONSUMER)]);
});

test('resolve uses whole matches and does not take a name from the middle of a cell', t => {
  const result = resolveMatter(matter(t, { court: COURT + ' Annex', laws: ['Other State except where Example State law requires'] }));
  assert.equal(result.forum.status, 'none');
  assert.equal(result.governing_law[0].reason, 'no pack covers this law');
});

test('resolve reports a missing rules path inside the matter', t => {
  const path = matter(t, { rules: 'rules/not-yet/local.md' });
  assert.deepEqual(resolveMatter(path).matter_records, [{ path: join(dirname(path), 'rules', 'not-yet', 'local.md'), exists: false }]);
});

test('resolve refuses a rules path outside the matter', t => {
  const path = matter(t, { rules: '../outside.md' });
  assert.match(failure(['resolve', '--matter', path], PACKS), /Rules home resolves outside the matter folder/);
});

test('resolve refuses an escaping rules path through a symlink to an existing ancestor', t => {
  const path = matter(t, { rules: 'rules/not-yet/local.md' });
  symlinkSync(temporary(t), join(dirname(path), 'rules'), 'dir');
  assert.match(failure(['resolve', '--matter', path], PACKS), /Rules home resolves outside the matter folder/);
});

test('resolve refuses two matching forums and names both', t => {
  const root = temporary(t);
  copyPack(t, STATE, root);
  const other = copyPack(t, ARBITRATION, root);
  editJson(other, 'pack.json', data => { data.forums[0].court_match = [COURT]; });
  const stderr = failure(['resolve', '--matter', matter(t)], root);
  assert.match(stderr, /Multiple forums matched/);
  assert.match(stderr, /example-state\/example-trial/);
  assert.match(stderr, /example-arbitration\/example-panel/);
});

test('stale lists a statement 181 days old and excludes one 180 days old', () => {
  assert.deepEqual(success(['stale', '--pack', STATE, '--today', '2025-07-01']), { prompts: [{
    pack: 'example-state', file: join(STATE, CONTRACT), id: 'contract-notice', message: 'confirm: last read 2025-01-01',
  }] });
  assert.deepEqual(success(['stale', '--pack', STATE, '--today', '2025-06-30']), { prompts: [] });
  assert.deepEqual(success(['stale', '--pack', STATE, '--today', '2025-07-01', '--days', '181']), { prompts: [] });
});

test('stale refuses an invalid date or day count and accepts a zero-day limit', () => {
  assert.match(failure(['stale', '--today', '2025-02-29']), /--today must be a calendar date/);
  assert.match(failure(['stale', '--days', '-1']), /--days must be a nonnegative safe integer/);
  assert.equal(success(['stale', '--pack', STATE, '--today', '2025-01-02', '--days', '0']).prompts.length, 1);
});

test('help works without packs and the command rejects unknown flags and relative paths', () => {
  const help = run(['resolve', '--help'], STATE);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /resolve --matter/);
  assert.match(failure(['resolve', '--matter', 'AGENTS.md']), /--matter must be an absolute path/);
  assert.match(failure(['validate', '--pack', 'tests/fixtures/packs/example-state']), /--pack must be a shipped id or an absolute pack directory/);
  assert.match(failure(['list', '--install']), /Unknown option --install/);
});

test('resolve prefers a matter forum and names the shipped forum pack set aside', t => {
  const path = matter(t, { rules: 'local.md' });
  const rules = join(dirname(path), 'local.md');
  writeFileSync(rules, 'Fictional matter rules.\n');
  const pack = copyMatterPack(path, ARBITRATION, 'matter-forum');
  editJson(pack, 'pack.json', data => { data.forums[0].court_match = [COURT]; });

  const result = resolveMatter(path);
  assert.deepEqual(result.matter_records, [{ path: rules, exists: true }]);
  assert.equal(result.forum.pack, 'matter-forum');
  assert.equal(result.forum.file, join(pack, 'forum', 'example-panel.json'));
  assert.equal(result.forum.own_pack, true);
  assert.equal(result.forum.pack_directory, pack);
  assert.deepEqual(result.forum.set_aside, ['example-state']);
  assert.equal(result.governing_law[0].own_pack, false);
  assert.deepEqual(result.stale.filter(prompt => prompt.own_pack), success(['stale', '--pack', pack]).prompts
    .map(prompt => ({ ...prompt, own_pack: true, pack_directory: pack })));
  assert.ok(result.stale.every(prompt => prompt.file !== join(STATE, FORUM)));
});

test('resolve prefers matter law and names the shipped law pack set aside for each claim', t => {
  const exception = LAW + ', except where Other State law requires';
  const path = matter(t, { laws: [LAW, exception] });
  const pack = copyMatterPack(path, STATE, 'matter-law');
  editJson(pack, 'pack.json', data => { data.forums = []; });

  const result = resolveMatter(path);
  assert.equal(result.forum.own_pack, false);
  assert.equal(result.forum.set_aside, undefined);
  for (const law of result.governing_law) {
    assert.equal(law.pack, 'matter-law');
    assert.equal(law.own_pack, true);
    assert.equal(law.pack_directory, pack);
    assert.deepEqual(law.files, [join(pack, CONTRACT), join(pack, CONSUMER)]);
    assert.deepEqual(law.set_aside, ['example-state']);
  }
  assert.equal(result.governing_law[0].held, undefined);
  assert.equal(result.governing_law[1].held, true);
  assert.equal(result.governing_law[1].matched_law, LAW);
  assert.equal(result.governing_law[1].exception, exception);
  const ownPrompts = result.stale.filter(prompt => prompt.own_pack);
  assert.deepEqual(ownPrompts, success(['stale', '--pack', pack]).prompts
    .map(prompt => ({ ...prompt, own_pack: true, pack_directory: pack })));
});

test('resolve searches eligible law names in the matter before using a whole shipped match', t => {
  const law = LAW + ', Special Rules';
  const path = matter(t, { laws: [law] });
  const pack = copyMatterPack(path, STATE, 'matter-law');
  const shipped = temporary(t);
  const state = copyPack(t, STATE, shipped);
  editJson(state, 'pack.json', data => { data.law_match = [law]; });

  const [result] = resolveMatter(path, shipped).governing_law;
  assert.equal(result.pack_directory, pack);
  assert.equal(result.exception, law);
  assert.equal(result.held, true);
  assert.deepEqual(result.set_aside, ['example-state']);
});

test('resolve lists a bad matter excerpt and falls through to shipped law', t => {
  const path = matter(t);
  const pack = copyMatterPack(path, STATE, 'matter-state');
  writeFileSync(join(pack, CONTRACT_EXCERPT), 'https://other-example.invalid/1\n2025-01-01\nFictional excerpt.\n');

  const result = resolveMatter(path);
  const { failures } = JSON.parse(failure(['validate', '--pack', pack]));
  assert.match(failures[0].reason, /first line must equal source\.url/);
  assert.deepEqual(result.invalid_packs, [{
    pack: 'matter-state', own_pack: true, pack_directory: pack, failures, matches: { forum: false, governing_law: [0] },
  }]);
  assert.equal(result.forum.file, join(pack, FORUM));
  assert.equal(result.forum.own_pack, true);
  assert.deepEqual(result.forum.set_aside, ['example-state']);
  assert.equal(result.governing_law[0].own_pack, false);
  assert.equal(result.governing_law[0].set_aside, undefined);
});

test('resolve names an escaping referenced file and continues with a valid matter pack', t => {
  const path = matter(t);
  const invalid = copyMatterPack(path, STATE, 'unsafe-state');
  editJson(invalid, 'pack.json', data => { data.forums = []; });
  const excerpt = join(invalid, CONTRACT_EXCERPT);
  rmSync(excerpt);
  symlinkSync(join(STATE, CONTRACT_EXCERPT), excerpt);
  const valid = copyMatterPack(path);

  const result = resolveMatter(path);
  const { failures } = JSON.parse(failure(['validate', '--pack', invalid]));
  assert.match(failures[0].reason, /"excerpts\/contract\.txt" resolves outside its allowed pack directory/);
  assert.deepEqual(result.invalid_packs, [{
    pack: 'unsafe-state', own_pack: true, pack_directory: invalid, failures, matches: { forum: false, governing_law: [0] },
  }]);
  assert.equal(result.forum.pack_directory, valid);
  assert.equal(result.governing_law[0].pack_directory, valid);
});

test('matter commands refuse an escaping jurisdictions entry by name', t => {
  const path = matter(t);
  const root = join(dirname(path), 'jurisdictions');
  mkdirSync(root);
  symlinkSync(copyPack(t), join(root, 'outside-pack'), 'dir');

  for (const command of ['resolve', 'validate', 'stale']) {
    assert.match(failure([command, '--matter', path], PACKS), /Matter pack directory "outside-pack" resolves outside the matter folder/);
  }
});

test('matter commands refuse an escaping jurisdictions directory by name', t => {
  const path = matter(t);
  symlinkSync(temporary(t), join(dirname(path), 'jurisdictions'), 'dir');

  for (const command of ['resolve', 'validate', 'stale']) {
    assert.match(failure([command, '--matter', path], PACKS), /Matter jurisdictions directory resolves outside the matter folder/);
  }
});

test('validate and stale select all matter packs with the same findings as individual packs', t => {
  const path = matter(t);
  const packs = [copyMatterPack(path, ARBITRATION), copyMatterPack(path)];
  editJson(packs[1], CONTRACT, data => { data.statements[0].state = '[verify]'; });
  rmSync(join(packs[1], CONTRACT_EXCERPT));
  const individual = packs.map(pack => success(['validate', '--pack', pack]));
  const age = ['--today', '2026-01-01', '--days', '0'];

  assert.deepEqual(success(['validate', '--matter', path], PACKS), {
    ok: true, packs: individual.flatMap(result => result.packs), failures: [], gaps: individual.flatMap(result => result.gaps),
  });
  assert.deepEqual(success(['stale', '--matter', path, ...age], PACKS),
    { prompts: packs.flatMap(pack => success(['stale', '--pack', pack, ...age]).prompts) });
});

test('validate and stale report the same structural failure under --matter and --pack', t => {
  const path = matter(t);
  const pack = copyMatterPack(path);
  editJson(pack, CONTRACT, data => { delete data.statements[0].last_read; });

  for (const command of ['validate', 'stale']) {
    const result = failure([command, '--matter', path], PACKS);
    assert.equal(result, failure([command, '--pack', pack]));
    assert.match(result, /last_read is required/);
  }
});

test('validate and stale reject --matter combined with --pack', t => {
  const path = matter(t);
  for (const command of ['validate', 'stale']) {
    const stderr = failure([command, '--matter', path, '--pack', STATE], PACKS);
    assert.match(stderr, /--matter and --pack cannot be used together/);
  }
});

test('a matter without jurisdictions keeps shipped resolution and has no packs of its own', t => {
  const path = matter(t);
  const result = resolveMatter(path);
  assert.equal(result.forum.file, join(STATE, FORUM));
  assert.equal(result.forum.own_pack, false);
  assert.deepEqual(result.governing_law[0].files, [join(STATE, CONTRACT), join(STATE, CONSUMER)]);
  assert.equal(result.governing_law[0].own_pack, false);
  assert.equal(result.invalid_packs, undefined);
  assert.equal(result.forum.set_aside, undefined);
  assert.equal(result.governing_law[0].set_aside, undefined);
  assert.deepEqual(success(['validate', '--matter', path], PACKS), { ok: true, packs: [], failures: [], gaps: [] });
  assert.deepEqual(success(['stale', '--matter', path], PACKS), { prompts: [] });
});

test('resolve keeps numbered court names when stripping a trailing docket reference', t => {
  const pack = copyPack(t);
  const root = dirname(pack);
  const circuit = 'United States Court of Appeals, 9th Circuit';
  const district = 'Example Trial Court, 17th Judicial Circuit, Division 12';
  editJson(pack, 'pack.json', data => { data.forums[0].court_match = [circuit, district]; });
  for (const court of [
    circuit, circuit + ', Case No. 23-1234', circuit + ' Docket 23-1234',
    circuit + ' Civil Action No. 23-1234', circuit + ', No. 23-1234',
    circuit + ' Index No. 123456/2025', district, district + ', 1:25-cv-01234',
  ]) {
    assert.equal(resolveMatter(matter(t, { court }), root).forum.file, join(pack, FORUM), court);
  }
  editJson(pack, 'pack.json', data => { data.forums[0].court_match = ['Superior Court']; });
  assert.equal(resolveMatter(matter(t, { court: 'Superior Court, Department 12' }), root).forum.status, 'none');
});

test('resolve keeps simple No. numbers in court and department names', t => {
  const pack = copyPack(t);
  const root = dirname(pack);
  const numbered = 'County Court at Law No. 4';
  const department = 'Superior Court, Department No. 12';
  editJson(pack, 'pack.json', data => {
    data.forums[0].court_match = ['County Court at Law', 'Superior Court', 'Superior Court, Department'];
  });
  for (const court of [numbered, department]) {
    assert.deepEqual(resolveMatter(matter(t, { court }), root).forum,
      { status: 'none', reason: 'no pack covers this court' }, court);
  }
  editJson(pack, 'pack.json', data => {
    data.forums[0].court_match = ['County Court at Law No\\. 4', 'Superior Court, Department No\\. 12'];
  });
  assert.equal(resolveMatter(matter(t, { court: numbered }), root).forum.file, join(pack, FORUM));
  assert.equal(resolveMatter(matter(t, { court: department }), root).forum.file, join(pack, FORUM));
});

test('resolve strips No. with a docket shape and explicit case labels', t => {
  for (const suffix of [', No. 23-1234', ', No. 23:1234', ', No. 23/1234', ', Case No. 2025-EX-12',
    ', Case No. 12', ', Docket No. 12', ', Index 12', ', Civil Action No. 12']) {
    assert.equal(resolveMatter(matter(t, { court: COURT + suffix })).forum.file, join(STATE, FORUM), suffix);
  }
});

test('resolve strips a marked case number in the last court-name part', t => {
  const court = COURT + ' Case No. 2025-EX-12';
  assert.equal(resolveMatter(matter(t, { court })).forum.file, join(STATE, FORUM));
});

test('resolve accepts a literal own-pack court pattern including the declared reference', t => {
  const court = 'Example Trial Court (Civil), Case No. 2025-EX-12';
  const path = matter(t, { court });
  const pack = copyMatterPack(path);
  editJson(pack, 'pack.json', data => {
    data.forums[0].court_match = ['Example Trial Court \\(Civil\\), Case No\\. 2025-EX-12'];
  });
  assert.equal(resolveMatter(path).forum.file, join(pack, FORUM));
});

for (const [defect, replacement, reason] of [
  ['missing', null, /Verified excerpt file must exist/],
  ['empty', ' \n', /non-empty/],
  ['wrong source', 'https://other-example.invalid/1\n2025-01-01\nFictional excerpt.\n', /first line must equal/],
  ['wrong date', 'https://example-state.invalid/code/1\n2025-01-02\nFictional excerpt.\n', /second line must equal/],
]) {
  for (const command of ['resolve', 'stale']) {
    test('shipped ' + command + ' rejects a Verified excerpt with this defect: ' + defect, t => {
      const pack = copyPack(t);
      const excerpt = join(pack, CONTRACT_EXCERPT);
      if (replacement === null) rmSync(excerpt);
      else writeFileSync(excerpt, replacement);
      const result = validationFailure(pack, CONTRACT, 'contract-notice', reason);
      const selection = command === 'resolve' ? ['--matter', matter(t, { court: 'pending' })] : ['--pack', 'example-state'];
      assert.deepEqual(JSON.parse(failure([command, ...selection], dirname(pack))).failures, result.failures);
    });
  }
}

test('validate allows optional and bounded groups containing unbounded quantifiers or alternatives', t => {
  const pack = copyPack(t);
  editJson(pack, 'pack.json', data => {
    data.forums[0].court_match = ['(?:\\d+)?', '(?: No\\. \\d+)?', 'District Court(?: No\\. \\d+)?', '(?:a+){2}', '(?:a|b){2}'];
    data.law_match = ['Colorado(?:\\s+Revised)?'];
  });
  assert.equal(success(['validate', '--pack', pack]).ok, true);
  assert.equal(success(['validate', '--pack', ARBITRATION]).ok, true);
});

test('validate treats a leading closing bracket inside a character class as literal', t => {
  const pack = copyPack(t);
  editJson(pack, 'pack.json', data => { data.forums[0].court_match = ['[^])]', '[])]']; });
  assert.equal(success(['validate', '--pack', pack]).ok, true);
  assert.equal(resolveMatter(matter(t, { court: '[' }), dirname(pack)).forum.file, join(pack, FORUM));
  assert.equal(resolveMatter(matter(t, { court: ']' }), dirname(pack)).forum.file, join(pack, FORUM));
  editJson(pack, 'pack.json', data => { data.forums[0].court_match = ['[^]([a]+)+']; });
  validationFailure(pack, 'pack.json', null, /nested quantifiers/);
});

test('validate and resolve refuse nested quantifiers and repeated alternatives', t => {
  const pack = copyPack(t);
  const path = matter(t, { court: 'a'.repeat(30), laws: ['a'.repeat(30)] });
  editJson(pack, 'pack.json', data => {
    data.forums[0].court_match = ['(a+)+b', '(a*)*', '(a|a)+', '(?:([a?])+){2,}'];
    data.law_match = ['(a+)+'];
  });
  const { failures } = validationFailure(pack, 'pack.json', null, /nested quantifiers/);
  assert.equal(failures.length, 5);
  assert.ok(failures.some(item => /repeated alternation/.test(item.reason)));
  const result = resolveMatter(path, dirname(pack));
  assert.deepEqual(result.invalid_packs, [{ pack: 'example-state', own_pack: false, failures }]);
  assert.equal(result.forum.status, 'none');
  assert.equal(result.governing_law[0].status, 'none');
});

test('resolve accepts an optional arbitration panel suffix and a long nonmatch', t => {
  assert.equal(resolveMatter(matter(t, { court: 'Example Arbitration Association Panel' })).forum.pack, 'example-arbitration');
  assert.equal(resolveMatter(matter(t, { court: 'Example Arbitration Association ' + 'a'.repeat(10000) })).forum.status, 'none');
});

test('resolve reads the shipped template without interpreting its placeholder as a claim', t => {
  const path = join(temporary(t), 'AGENTS.md');
  writeFileSync(path, TEMPLATE);
  const result = resolveMatter(path);
  assert.deepEqual(result.forum, { status: 'none', reason: 'pending' });
  assert.deepEqual(result.governing_law, []);
});

test('resolve leaves later posture prose with pipes outside the claim table', t => {
  const path = matter(t, { alter: text => replaceRequired(text,
    '\nUse one row per claim or agreement. Record `not stated` when the source names no law. ' +
      'Record a law with any exception as written.\n\n**Posture** [Proceeding type',
    '\n**Posture** Plaintiff | Defendant | Filed | Pending [Proceeding type') });
  const result = resolveMatter(path);
  assert.equal(result.forum.file, join(STATE, FORUM));
  assert.equal(result.governing_law[0].files[0], join(STATE, CONTRACT));
});

for (const [kind, inserted] of [
  ['a second header', '| Claim or agreement | Law named | Clause and document | Source and date |\n'],
  ['a row after a blank line', '\n'],
]) {
  test('resolve refuses ' + kind + ' in the claim table and names its line', t => {
    let lineNumber;
    const path = matter(t, { laws: [LAW, 'State of Example'], alter: text => {
      const malformed = replaceRequired(text, '\n| Agreement 2', '\n' + inserted + '| Agreement 2');
      lineNumber = malformed.slice(0, malformed.indexOf(inserted + '| Agreement 2')).split('\n').length;
      if (kind === 'a row after a blank line') lineNumber++;
      return malformed;
    } });
    assert.match(failure(['resolve', '--matter', path], PACKS), new RegExp('Governing law by claim.*line ' + lineNumber + '\\b'));
  });
}

test('resolve reports an unmatched broken shipped manifest and keeps a valid matter and shipped match', t => {
  const root = temporary(t);
  const state = copyPack(t, STATE, root);
  const broken = copyPack(t, ARBITRATION, root);
  writeFileSync(join(broken, 'pack.json'), '{\n');
  const path = matter(t);
  const own = copyMatterPack(path, ARBITRATION, 'matter-forum');
  editJson(own, 'pack.json', data => { data.forums[0].court_match = [COURT]; });
  const result = resolveMatter(path, root);
  assert.equal(result.forum.pack_directory, own);
  assert.equal(result.forum.set_aside[0], 'example-state');
  assert.equal(result.governing_law[0].files[0], join(state, CONTRACT));
  assert.deepEqual(result.invalid_packs, [{
    pack: 'example-arbitration', own_pack: false,
    failures: [{ pack: 'example-arbitration', file: 'pack.json', id: null, reason: 'File contains invalid JSON.' }],
  }]);
});

test('resolve retains a valid forum alongside a broken sole shipped law match', t => {
  const root = temporary(t);
  const broken = copyPack(t, STATE, root);
  const forum = copyPack(t, ARBITRATION, root);
  rmSync(join(broken, CONTRACT_EXCERPT));
  const result = resolveMatter(matter(t, { court: 'Example Arbitration Association' }), root);
  assert.equal(result.forum.file, join(forum, 'forum/example-panel.json'));
  assert.equal(result.governing_law[0].reason, 'no pack covers this law');
  assert.deepEqual(result.invalid_packs, [{
    pack: 'example-state', own_pack: false, matches: { forum: false, governing_law: [0] },
    failures: [{ pack: 'example-state', file: CONTRACT, id: 'contract-notice',
      reason: 'Verified excerpt file must exist and be non-empty.' }],
  }]);
});

test('resolve retains valid law rows alongside a broken sole shipped forum match', t => {
  const root = temporary(t);
  const law = copyPack(t, STATE, root);
  const broken = copyPack(t, ARBITRATION, root);
  rmSync(join(broken, 'excerpts/panel.txt'));
  const result = resolveMatter(matter(t, { court: 'Example Arbitration Association', laws: [LAW, 'State of Example'] }), root);
  assert.deepEqual(result.forum, { status: 'none', reason: 'no pack covers this court' });
  assert.deepEqual(result.governing_law.map(row => row.files), [
    [join(law, CONTRACT), join(law, CONSUMER)], [join(law, CONTRACT), join(law, CONSUMER)],
  ]);
  assert.deepEqual(result.invalid_packs[0].matches, { forum: true, governing_law: [] });
  assert.equal(result.invalid_packs[0].failures[0].file, 'forum/example-panel.json');
  const path = matter(t, { court: 'Example Arbitration Association', laws: ['pending'] });
  assert.deepEqual(JSON.parse(failure(['resolve', '--matter', path], root)).failures, result.invalid_packs[0].failures);
});

test('resolve keeps the valid side when both sides are in the same shipped pack', t => {
  const pack = copyPack(t);
  const root = dirname(pack);
  const path = matter(t);
  const excerpt = join(pack, CONTRACT_EXCERPT);
  rmSync(excerpt);
  const withForum = resolveMatter(path, root);
  assert.equal(withForum.forum.file, join(pack, FORUM));
  assert.equal(withForum.governing_law[0].status, 'none');
  assert.deepEqual(withForum.invalid_packs[0].matches, { forum: false, governing_law: [0] });

  cpSync(join(STATE, CONTRACT_EXCERPT), excerpt);
  rmSync(join(pack, 'excerpts/trial.txt'));
  const withLaw = resolveMatter(path, root);
  assert.equal(withLaw.forum.status, 'none');
  assert.deepEqual(withLaw.governing_law[0].files, [join(pack, CONTRACT), join(pack, CONSUMER)]);
  assert.deepEqual(withLaw.invalid_packs[0].matches, { forum: true, governing_law: [] });
});

test('resolve skips a shipped pack with a bad unused half without blocking a valid shipped match', t => {
  const root = temporary(t);
  const state = copyPack(t, STATE, root);
  const broken = copyPack(t, ARBITRATION, root);
  rmSync(join(broken, 'excerpts', 'panel.txt'));
  const result = resolveMatter(matter(t), root);
  assert.equal(result.forum.file, join(state, FORUM));
  assert.equal(result.invalid_packs[0].pack, 'example-arbitration');
  assert.match(result.invalid_packs[0].failures[0].reason, /Verified excerpt file must exist/);
});

test('validate refuses a duplicate excerpt path across halves', t => {
  const pack = copyPack(t);
  editJson(pack, FORUM, data => {
    const original = JSON.parse(readFileSync(join(pack, CONTRACT), 'utf8')).statements[0];
    data.statements[0] = { ...original, id: data.statements[0].id };
  });
  validationFailure(pack, FORUM, 'trial-docket-label', /Duplicate excerpt path/);
});

test('resolve reports gaps once per returned file and stale accepts gaps', t => {
  const root = temporary(t);
  const pack = copyPack(t, STATE, root);
  const other = copyPack(t, ARBITRATION, root);
  editJson(pack, CONTRACT, data => { data.statements[0].state = '[verify]'; });
  rmSync(join(pack, CONTRACT_EXCERPT));
  editJson(other, 'forum/example-panel.json', data => { data.statements[0].state = '[verify]'; });
  const path = matter(t, { laws: [LAW, LAW] });
  assert.deepEqual(resolveMatter(path, root).gaps, [{
    pack: 'example-state', file: join(pack, CONTRACT), id: 'contract-notice',
    reason: 'Statement is marked [verify].', own_pack: false,
  }]);
  assert.ok(success(['stale'], root).prompts.some(item => item.id === 'contract-notice'));

  const own = copyMatterPack(path, STATE, 'matter-law');
  editJson(own, CONTRACT, data => { data.statements[0].state = '[verify]'; });
  assert.deepEqual(resolveMatter(path, root).gaps, [{
    pack: 'matter-law', file: join(own, CONTRACT), id: 'contract-notice',
    reason: 'Statement is marked [verify].', own_pack: true, pack_directory: own,
  }]);
});

test('forum profiles accept a profile id or null and document the declaration as controlling', t => {
  const pack = copyPack(t);
  assert.equal(success(['validate', '--pack', pack]).ok, true);
  editJson(pack, FORUM, data => { data.filing_profile = null; });
  assert.equal(success(['validate', '--pack', pack]).ok, true);
  editJson(pack, FORUM, data => { data.filing_profile = 'none: papers follow the court’s own rules'; });
  validationFailure(pack, FORUM, null, /filing_profile must be a profile id or null/);
  const format = readFileSync(join(__dirname, '..', 'schema', 'pack-format.md'), 'utf8');
  assert.match(format, /declared .Filing profile. governs/);
  assert.match(format, /pack.s .filing_profile. is only a suggestion/);
});
