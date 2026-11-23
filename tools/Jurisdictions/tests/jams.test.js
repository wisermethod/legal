'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { cpSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');

const TOOL = realpathSync(join(__dirname, '..'));
const CLI = join(TOOL, 'scripts', 'jurisdictions.js');
const PACK = join(TOOL, 'packs', 'jams');
const FORUM = 'forum/employment.json';
const { obtain, statements } = JSON.parse(readFileSync(join(PACK, FORUM), 'utf8'));
const EXPECTED_FORUM = {
  pack: 'jams', id: 'employment', name: 'JAMS employment arbitration',
  file: join(PACK, FORUM), tier: 'arbitration forum', filing_profile: null, obtain, own_pack: false,
};

function run(args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  return result;
}

function success(args) {
  const { status, stdout, stderr } = run(args);
  assert.equal(status, 0, stderr);
  assert.equal(stderr, '');
  return JSON.parse(stdout);
}

function temporary(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jurisdictions-jams-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('the shipped JAMS pack validates and includes one official excerpt for each of 34 rules', () => {
  assert.deepEqual(success(['validate', '--pack', 'jams']), { ok: true, packs: ['jams'], failures: [], gaps: [] });
  const entries = Array.from({ length: 34 }, (_, index) => 'rule-' + String(index + 1).padStart(2, '0') + '.txt');
  assert.deepEqual(readdirSync(join(PACK, 'excerpts')).sort(), entries);
  assert.deepEqual(statements.map(statement => statement.excerpt).sort(), entries.map(file => 'excerpts/' + file));
  assert.equal(new Set(statements.map(statement => statement.id)).size, 34);
  for (const [index, statement] of statements.entries()) {
    const rule = index + 1;
    assert.equal(statement.state, 'Verified');
    assert.equal(statement.source.url, 'https://www.jamsadr.com/rules-employment-arbitration#rule-' + rule);
    assert.match(statement.source.citation, new RegExp('Rule ' + rule + '\\b.*June 1, 2021'));
    const [url, date, ...body] = readFileSync(join(PACK, statement.excerpt), 'utf8').split('\n');
    assert.equal(url, statement.source.url);
    assert.equal(date, statement.last_read);
    assert.ok(body.join('\n').trim(), statement.excerpt);
  }
});

for (const court of [
  'JAMS',
  'jams employment',
  'JAMS Employment Rules',
  'JAMS Employment Arbitration Rules and Procedures',
  'JAMS Employment Arbitration Forum',
  'JAMS (Employment Arbitration)',
  'JAMS - Employment Arbitration',
  'JAMS, Employment Arbitration',
  'JAMS, Case No. 2025-EX-12',
  'JAMS Employment Arbitration, Reference 17',
]) {
  test('lookup matches ' + court + ' as a forum without supplying law', () => {
    const result = success(['lookup', '--court', court]);
    assert.deepEqual(result.forum, EXPECTED_FORUM);
    assert.equal(Object.hasOwn(result, 'governing_law'), false);
    assert.deepEqual(result.gaps, []);
    assert.deepEqual(result.invalid_packs, []);
  });
}

test('lookup excludes other JAMS rule sets and other forums from the JAMS employment match', () => {
  for (const court of [
    'JAMS Comprehensive Arbitration Rules and Procedures',
    'JAMS Commercial Arbitration',
    'JAMS International Arbitration Rules, Case No. 2025-EX-12',
    'JAMS (Streamlined Arbitration Rules and Procedures)',
    'JAMS Consumer Arbitration',
    'JAMS Employment Arbitration under Comprehensive Rules',
    'JAMS, Commercial Arbitration',
    'JAMS Arbitration',
    'AAA Employment Arbitration',
    'American Arbitration Association (Employment Arbitration)',
    'United States District Court for the District of Colorado',
    'Supreme Court of the State of New York, County of New York',
  ]) {
    assert.notEqual(success(['lookup', '--court', court]).forum.pack, 'jams', court);
  }
  assert.equal(success(['lookup', '--court', 'District Court, Denver County, Colorado']).forum.pack, 'colorado');
});

test('lookup does not treat JAMS as a law name', () => {
  const result = success(['lookup', '--law', 'JAMS']);
  assert.equal(Object.hasOwn(result, 'forum'), false);
  assert.deepEqual(result.governing_law, [{
    claim: null, law_named: 'JAMS', clause_and_document: null, source_and_date: null,
    status: 'none', reason: 'no pack covers this law',
  }]);
});

test('resolve does not infer the JAMS forum from prose when the declaration is missing', t => {
  const path = join(temporary(t), 'AGENTS.md');
  writeFileSync(path, '# Example employment matter\n\nThe parties discussed JAMS in a fictional letter.\n');
  assert.deepEqual(success(['resolve', '--matter', path]), {
    declaration: 'missing', matter_records: [],
    forum: { status: 'none', reason: 'The forum must come from the parties record.' },
    governing_law: [], stale: [], gaps: [],
  });
});

test('resolve matches a declared JAMS forum without changing governing-law results', t => {
  const dir = temporary(t);
  const path = join(dir, 'AGENTS.md');
  const rules = join(dir, 'rules.md');
  const declaration = [
    '# Example employment matter',
    '',
    '## Forum and posture',
    '',
    '| Field | Value | Source and date |',
    '| --- | --- | --- |',
    '| Court or forum | JAMS | Fictional agreement, 2025-07-01 |',
    '| Forum type | arbitration | Fictional agreement, 2025-07-01 |',
    '| Governing law | see Governing law by claim | Fictional agreements, 2025-07-01 |',
    '| Rules home | rules.md | Fictional case file, 2025-08-01 |',
    '| Filing profile | pending | Fictional case file, 2025-08-01 |',
    '',
    '### Governing law by claim',
    '',
    '| Claim or agreement | Law named | Clause and document | Source and date |',
    '| --- | --- | --- | --- |',
    '| Deferred compensation | Example State | Section 3, fictional compensation plan | Fictional plan, 2025-07-01 |',
    '| Reimbursement | pending | Fictional expenses policy under review | Fictional policy, 2025-07-01 |',
    '| Bonus | not stated | Section 2, fictional bonus letter | Fictional letter, 2025-07-01 |',
    '| Separation agreement | Colorado, except as to wages | Section 5, fictional agreement | Fictional agreement, 2025-07-01 |',
    '',
  ].join('\n');
  writeFileSync(rules, 'Fictional case rules record.\n');
  writeFileSync(path, declaration);

  const resolved = success(['resolve', '--matter', path]);
  assert.deepEqual(resolved.declaration['Court or forum'], {
    value: 'JAMS', source_and_date: 'Fictional agreement, 2025-07-01',
  });
  assert.deepEqual(resolved.matter_records, [{ path: rules, exists: true }]);
  assert.deepEqual(resolved.forum, EXPECTED_FORUM);
  const law = resolved.governing_law;
  assert.deepEqual(law.map(({ law_named }) => law_named), ['Example State', 'pending', 'not stated', 'Colorado, except as to wages']);
  assert.deepEqual(law.slice(0, 3).map(({ status, reason }) => [status, reason]), [
    ['none', 'no pack covers this law'], ['none', 'pending'], ['none', 'not stated'],
  ]);
  assert.equal(law[3].pack, 'colorado');
  assert.equal(law[3].held, true);
  assert.equal(law[3].exception, 'Colorado, except as to wages');

  writeFileSync(path, declaration.replace('| Court or forum | JAMS |', '| Court or forum | pending |'));
  const withoutForum = success(['resolve', '--matter', path]);
  assert.deepEqual(withoutForum.forum, { status: 'none', reason: 'pending' });
  assert.deepEqual(resolved.governing_law, withoutForum.governing_law);
});

test('stale excludes JAMS statements at 180 days and reports all beyond 180 days', () => {
  const dates = statements.map(statement => statement.last_read).sort();
  const after = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000).toISOString().slice(0, 10);
  const args = ['stale', '--pack', 'jams', '--today'];
  assert.deepEqual(success([...args, after(dates[0], 180)]), { prompts: [] });
  assert.deepEqual(success([...args, after(dates.at(-1), 181)]), {
    prompts: statements.map(({ id, last_read }) => ({
      pack: 'jams', file: join(PACK, FORUM), id, message: 'confirm: last read ' + last_read,
    })),
  });
});

for (const [defect, reason] of [
  ['missing file', /Verified excerpt file must exist/],
  ['wrong source header', /first line must equal source\.url/],
  ['wrong date header', /second line must equal last_read/],
  ['missing excerpt path', /excerpt is required/],
  ['missing read date', /last_read is required/],
]) {
  test('JAMS validation rejects a Verified excerpt with a ' + defect, t => {
    const pack = join(temporary(t), 'jams');
    cpSync(PACK, pack, { recursive: true });
    const { excerpt, id } = statements[0];
    const path = join(pack, excerpt);
    const forum = join(pack, FORUM);
    if (defect === 'missing file') {
      rmSync(path);
    } else if (defect === 'wrong source header' || defect === 'wrong date header') {
      const lines = readFileSync(path, 'utf8').split('\n');
      if (defect === 'wrong source header') lines[0] = 'https://example.invalid/fictional-rule';
      else lines[1] = '2000-01-01';
      writeFileSync(path, lines.join('\n'));
    } else {
      const data = JSON.parse(readFileSync(forum, 'utf8'));
      const field = defect === 'missing excerpt path' ? 'excerpt' : 'last_read';
      delete data.statements[0][field];
      writeFileSync(forum, JSON.stringify(data) + '\n');
    }

    const { status, stdout, stderr } = run(['validate', '--pack', pack]);
    assert.equal(status, 1, stderr);
    assert.equal(stdout, '');
    const result = JSON.parse(stderr);
    assert.equal(result.ok, false);
    assert.deepEqual(result.packs, ['jams']);
    assert.ok(result.failures.some(failure =>
      failure.pack === 'jams' && failure.file === FORUM && failure.id === id && reason.test(failure.reason)), stderr);
  });
}
