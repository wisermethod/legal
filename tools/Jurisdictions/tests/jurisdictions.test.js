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
const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'skills', 'Open a Matter',
  'assets', 'matter-template', 'AGENTS.md'), 'utf8');

const COURT = 'Example Trial Court, Sample County, Example State';
const LAW = 'Example State';
const CONTRACT = 'law/contract.json';
const CONSUMER = 'law/consumer.json';
const FORUM = 'forum/example-trial.json';
const CONTRACT_EXCERPT = 'excerpts/contract.txt';
const SOURCE = 'Fictional agreement, 2025-07-01';

function run(args, packsDirectory) {
  const invocation = packsDirectory === undefined ? [CLI, ...args] : [
    '-e', 'const [script, packsDirectory, ...args] = process.argv.slice(1);' +
      'process.exitCode = require(script).main(args, { packsDirectory });',
    '--', CLI, packsDirectory, ...args,
  ];
  const result = spawnSync(process.execPath, invocation, { encoding: 'utf8' });
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

test('list on the shipped tree returns an empty array', () => {
  assert.deepEqual(success(['list']), []);
});

test('list describes each fictional pack and forum tier', () => {
  assert.deepEqual(success(['list'], PACKS), [
    { id: 'example-arbitration', name: 'Example Arbitration Association', kind: 'arbitration-forum', law: [],
      forums: [{ id: 'example-panel', name: 'Example Arbitration Association Panel', tier: 'arbitration forum' }] },
    { id: 'example-state', name: 'Example State', kind: 'state', law: ['contract', 'consumer'],
      forums: [{ id: 'example-trial', name: 'Example Trial Court', tier: 'general-jurisdiction trial court' }] },
  ]);
});

test('validate accepts a good pack by absolute directory', () => {
  assert.deepEqual(success(['validate', '--pack', STATE]), {
    ok: true, packs: ['example-state'], failures: [], gaps: [],
  });
  assert.equal(success(['validate', '--pack', ARBITRATION]).ok, true);
});

test('validate selects all shipped packs by default or one by id', () => {
  assert.deepEqual(success(['validate']).packs, []);
  assert.deepEqual(success(['validate'], PACKS).packs, ['example-arbitration', 'example-state']);
  assert.deepEqual(success(['validate', '--pack', 'example-arbitration'], PACKS).packs, ['example-arbitration']);
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
  const expected = success(['stale'], PACKS).filter(entry => selected.has(entry.file))
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
  assert.deepEqual(result.forum, { status: 'none', reason: 'no shipped pack covers this court' });
  assert.equal(result.governing_law[0].status, 'none');
  assert.equal(result.governing_law[0].reason, 'no shipped pack');
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
  assert.equal(result.governing_law[0].reason, 'no shipped pack');
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
  assert.deepEqual(success(['stale', '--pack', STATE, '--today', '2025-07-01']), [{
    pack: 'example-state', file: join(STATE, CONTRACT), id: 'contract-notice', message: 'confirm: last read 2025-01-01',
  }]);
  assert.deepEqual(success(['stale', '--pack', STATE, '--today', '2025-06-30']), []);
  assert.deepEqual(success(['stale', '--pack', STATE, '--today', '2025-07-01', '--days', '181']), []);
});

test('stale refuses an invalid date or day count and accepts a zero-day limit', () => {
  assert.match(failure(['stale', '--today', '2025-02-29']), /--today must be a calendar date/);
  assert.match(failure(['stale', '--days', '-1']), /--days must be a nonnegative safe integer/);
  assert.equal(success(['stale', '--pack', STATE, '--today', '2025-01-02', '--days', '0']).length, 1);
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
  assert.deepEqual(result.stale.filter(prompt => prompt.own_pack), success(['stale', '--pack', pack])
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
  assert.equal(result.governing_law[1].exception, exception);
  const ownPrompts = result.stale.filter(prompt => prompt.own_pack);
  assert.deepEqual(ownPrompts, success(['stale', '--pack', pack])
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

test('resolve lists a bad matter excerpt and falls through to shipped packs', t => {
  const path = matter(t);
  const pack = copyMatterPack(path, STATE, 'matter-state');
  writeFileSync(join(pack, CONTRACT_EXCERPT), 'https://other-example.invalid/1\n2025-01-01\nFictional excerpt.\n');

  const result = resolveMatter(path);
  const { failures } = JSON.parse(failure(['validate', '--pack', pack]));
  assert.match(failures[0].reason, /first line must equal source\.url/);
  assert.deepEqual(result.invalid_packs, [{ pack: 'matter-state', own_pack: true, pack_directory: pack, failures }]);
  assert.equal(result.forum.pack, 'example-state');
  assert.equal(result.forum.own_pack, false);
  assert.equal(result.forum.set_aside, undefined);
  assert.equal(result.governing_law[0].own_pack, false);
  assert.equal(result.governing_law[0].set_aside, undefined);
});

test('resolve names an escaping referenced file and continues with a valid matter pack', t => {
  const path = matter(t);
  const invalid = copyMatterPack(path, STATE, 'unsafe-state');
  const excerpt = join(invalid, CONTRACT_EXCERPT);
  rmSync(excerpt);
  symlinkSync(join(STATE, CONTRACT_EXCERPT), excerpt);
  const valid = copyMatterPack(path);

  const result = resolveMatter(path);
  const { failures } = JSON.parse(failure(['validate', '--pack', invalid]));
  assert.match(failures[0].reason, /"excerpts\/contract\.txt" resolves outside its allowed pack directory/);
  assert.deepEqual(result.invalid_packs, [{ pack: 'unsafe-state', own_pack: true, pack_directory: invalid, failures }]);
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
    packs.flatMap(pack => success(['stale', '--pack', pack, ...age])));
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
  assert.deepEqual(success(['stale', '--matter', path], PACKS), []);
});
