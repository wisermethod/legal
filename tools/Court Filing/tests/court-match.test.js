import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { compose } from '../scripts/compose-core.js';
import { validateProfile } from '../scripts/schema-core.js';

const tool = fileURLToPath(new URL('..', import.meta.url));
const asset = name => join(tool, 'assets', name);
const examplePath = asset('example-caption.json');
const example = () => JSON.parse(readFileSync(examplePath, 'utf8'));
const profile = () => JSON.parse(readFileSync(join(tool, 'profiles', 'colorado-district.json'), 'utf8'));
const denver = 'District Court, City and County of Denver, Colorado';
const county = 'County Court, Example County, Colorado';
const newYork = 'Supreme Court of the State of New York, County of New York';
const layoutRule = /colorado-two-column-boxed layout/;
const profileRule = /court_match rule/;

function composeCli(t, { caption, customProfile, flags = [] } = {}) {
  const path = mkdtempSync(join(tmpdir(), 'court-filing-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  const scratch = realpathSync(path);
  const captionPath = caption ? join(scratch, 'caption.json') : examplePath;
  if (caption) writeFileSync(captionPath, JSON.stringify(caption));
  const profilePath = customProfile ? join(scratch, 'profile.json') : 'colorado-district';
  if (customProfile) writeFileSync(profilePath, JSON.stringify(customProfile));
  const out = join(scratch, 'output', 'filing.html');
  const call = spawnSync(process.execPath, [join(tool, 'scripts', 'court-filing.js'), 'compose',
    '--body', asset('example-body.md'), '--caption', captionPath, '--profile', profilePath, '--out', out, ...flags],
  { encoding: 'utf8' });
  return { call, out };
}

function assertComposed({ call, out }, court, jurisdiction = 'colorado-district') {
  assert.equal(call.status, 0, call.stderr);
  assert.equal(call.stderr, '');
  const receipt = JSON.parse(call.stdout);
  assert.equal(receipt.html, out);
  assert.equal(receipt.profile, jurisdiction);
  assert.ok(readFileSync(out, 'utf8').includes('<div class="court-name">' + court + '</div>'));
}

function assertRefused({ call, out }, rule, court, jurisdiction = 'colorado-district') {
  assert.equal(call.status, 1, call.stdout || call.stderr);
  assert.equal(call.stdout, '');
  assert.match(call.stderr, rule);
  if (court !== undefined && court.trim() !== '') {
    assert.ok(call.stderr.includes(court), call.stderr);
    assert.ok(call.stderr.includes(jurisdiction), call.stderr);
    assert.match(call.stderr, /profile for that court or the unprofiled route in the Produce Court Filing skill/);
  }
  assert.equal(existsSync(out), false);
  assert.equal(existsSync(dirname(out)), false);
}

test('compose accepts the shipped example and both case and surrounding space variations', t => {
  assertComposed(composeCli(t), example().court);
  for (const court of [denver, '  ' + denver.toUpperCase() + '  ']) {
    assertComposed(composeCli(t, { caption: { ...example(), court } }), court);
  }
});

test('compose refuses courts outside the shipped profile even in replay', t => {
  for (const [court, rule] of [
    [county, profileRule],
    [newYork, layoutRule],
    ['United States District Court, Southern District of New York', layoutRule],
    [example().court + ' (copy)', layoutRule],
    ['United States ' + example().court, profileRule],
  ]) {
    const caption = { ...example(), court };
    for (const flags of [[], ['--replay']]) {
      assertRefused(composeCli(t, { caption, flags }), rule, court);
    }
  }
});

test('an older custom profile uses the layout rule and a broad court_match cannot override it', t => {
  const customProfile = profile();
  const jurisdiction = customProfile.jurisdiction_id = 'fictional-custom';
  delete customProfile.court_match;
  assertComposed(composeCli(t, { customProfile }), example().court, jurisdiction);
  const caption = { ...example(), court: newYork };
  assertRefused(composeCli(t, { caption, customProfile }), layoutRule, newYork, jurisdiction);
  customProfile.court_match = ['.*'];
  assertRefused(composeCli(t, { caption, customProfile }), layoutRule, newYork, jurisdiction);
});

test('court_match anchors both ends of a pattern with alternatives', t => {
  const customProfile = profile();
  customProfile.court_match = [example().court + '|' + county];
  assertComposed(composeCli(t, { caption: { ...example(), court: county }, customProfile }), county);
  for (const court of ['Other ' + example().court, county + ' (copy), Colorado']) {
    assertRefused(composeCli(t, { caption: { ...example(), court }, customProfile }), profileRule, court);
  }
});

test('the profile schema rejects invalid court_match fields', () => {
  for (const court_match of [[], '.*', [42], [''], [' '], ['['], ['x)|.*|(']]) {
    assert.throws(() => validateProfile({ ...profile(), court_match }), /profile\.court_match(?:\[0\])? must/);
  }
});

test('compose requires a nonblank caption court even in replay', t => {
  for (const [court, rule] of [
    [undefined, /caption\.court is required/],
    ['', /caption\.court must be non-blank/],
    ['   ', /caption\.court must be non-blank/],
  ]) {
    assertRefused(composeCli(t, { caption: { ...example(), court }, flags: ['--replay'] }), rule);
  }
});

test('the compose core checks the court before parsing the body', () => {
  const caption = { ...example(), court: county };
  const parse = () => assert.fail('Markdown must not be parsed on a court mismatch');
  assert.throws(() => compose({ caption, profile: profile(), body: 'Fictional filing.' }, parse), profileRule);
});
