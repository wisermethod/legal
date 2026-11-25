import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Marked } from 'marked';
import { compose, prepareBody, parseFilingMarkdown } from '../scripts/compose-core.js';
import { getLayout } from '../scripts/layout-index-core.js';
import { inspect } from '../scripts/court-filing.js';
import { documentType, validateCaption, validateProfile } from '../scripts/schema-core.js';
import { validate } from '../scripts/validate-core.js';

const tool = fileURLToPath(new URL('..', import.meta.url));
const cli = join(tool, 'scripts', 'court-filing.js');
const render = process.env.COURT_FILING_RENDER;
export const markdown = '## INTRODUCTION\n\n' +
  'The fictional record describes an imaginary request for documents and the response to that request. '.repeat(5).trim();
const mark = new Marked({ gfm: true });
const parse = value => parseFilingMarkdown(mark, value);
const digest = value => createHash('sha256').update(value).digest('hex');
export const statuses = receipt => Object.fromEntries(receipt.checks.map(({ label, status }) => [label, status]));
export const pdfTest = (name, fn) => test(name, t => {
  assert.ok(render, 'Set COURT_FILING_RENDER to the wiser plugin\'s tools/render/scripts/render.js to run the real render chain.');
  return fn(t);
});

export function temp(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'court-filing-layout-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function invoke(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

export const invokeCli = (args, cwd) => invoke(cli, args, cwd);

function command(script, args, cwd, expected = 0) {
  const output = invoke(script, args, cwd);
  assert.equal(output.status, expected, output.error?.message ?? (output.stderr || output.stdout));
  const receipt = JSON.parse(expected === 0 ? output.stdout : output.stderr);
  if (expected !== 0) {
    assert.equal(output.stdout, '');
    assert.equal(receipt.result, 'VALIDATION FAILED');
  }
  return receipt;
}

function build(directory, name, caption, body, selected) {
  const path = extension => join(directory, name + extension);
  writeFileSync(path('.json'), JSON.stringify(caption));
  writeFileSync(path('.md'), body);
  const base = ['--profile', selected, '--caption', path('.json'), '--body', path('.md')];
  const composed = command(cli, ['compose', ...base, '--out', path('.html')], directory);
  const html = readFileSync(composed.html, 'utf8');
  function renderPdf(suffix, edit = text => text) {
    const source = path('-' + suffix + '.html');
    const pdf = path('-' + suffix + '.pdf');
    writeFileSync(source, edit(html));
    command(render, ['pdf', '--input', source, '--output', pdf, ...composed.pdfArgs], directory);
    return pdf;
  }
  function check(pdf, expected = 0, flags = []) {
    return command(cli, ['validate', ...base, '--pdf', pdf, '--body-sha256', composed.bodySha256, ...flags], directory, expected);
  }
  return { html, renderPdf, check };
}

export function layoutFixture(profileFile, body = markdown) {
  const profilePath = join(tool, 'profiles', profileFile);
  const load = () => JSON.parse(readFileSync(profilePath, 'utf8'));
  return {
    load,
    caption: (overrides = {}) => ({ ...load().caption_defaults, ...overrides }),
    composeMock: (caption, profile = load(), source = body) => compose({ caption, body: source, profile }, parse, digest),
    build: (directory, name, caption, source = body, selected = profilePath) =>
      build(directory, name, caption, source, selected),
  };
}

export function expectFailedMutations(filing, mutations) {
  for (const [name, before, after, label] of mutations) {
    const pdf = filing.renderPdf(name, html => {
      const changed = html.replace(before, after);
      assert.notEqual(changed, html, name);
      return changed;
    });
    assert.doesNotThrow(() => {
      assert.equal(statuses(filing.check(pdf, 1))[label], 'fail');
    }, name + ' should fail ' + label);
  }
}

export function assertChecks(receipt, labels, expected, context) {
  const evidence = statuses(receipt);
  for (const label of labels) {
    assert.equal(evidence[label], expected, context ? context + ' (' + label + ')' : label);
  }
}

export function validatePrintedFixture(path, body) {
  const pdf = readFileSync(path);
  const cache = new Map();
  const evidence = (kind, bytes, page) => {
    const key = kind + ':' + page;
    if (!cache.has(key)) cache.set(key, inspect(kind, bytes, page).bytes);
    return cache.get(key);
  };
  return (caption, profile) => {
    validateProfile(profile);
    validateCaption(caption, profile);
    return validate({
      pdf, caption, profile,
      prepared: prepareBody(body, documentType(profile, caption), parse, digest, caption.table_presentation,
        getLayout(profile.renderer_profile)),
    }, evidence);
  };
}

export function replaceField(value, path, blank) {
  const copy = structuredClone(value);
  const parent = path.slice(0, -1).reduce((node, key) => node[key], copy);
  const key = path.at(-1);
  if (blank) parent[key] = '';
  else delete parent[key];
  return copy;
}
