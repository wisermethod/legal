import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';
import { inspect } from '../scripts/court-filing.js';
import { resolveLimits, suggestTypes, validateCaption, validateProfile } from '../scripts/schema-core.js';
import {
  assertChecks, expectFailedMutations, invokeCli, layoutFixture, pdfTest, statuses, temp, validatePrintedFixture,
} from './layout-fixtures.mjs';

const id = 'new-york-supreme-court';
const file = id + '.json';
const asset = name => fileURLToPath(new URL('../assets/new-york-fictional-' + name, import.meta.url));
const memo = readFileSync(asset('memorandum.md'), 'utf8');
const noticeBody = readFileSync(asset('notice.md'), 'utf8');
const notice = () => JSON.parse(readFileSync(asset('notice.json'), 'utf8'));
const ny = layoutFixture(file, memo);
const mustPass = (receipt, labels) => {
  assert.equal(receipt.ok, true, JSON.stringify(receipt.checks));
  assertChecks(receipt, labels, 'pass');
  assert.ok(receipt.checks.every(check => ['pass', 'advisory', 'not_applicable'].includes(check.status)));
};

test('New York profile is selectable by ID and keeps S.D.N.Y. path-only', t => {
  const cwd = temp(t);
  const list = invokeCli(['profiles'], cwd);
  assert.equal(list.status, 0, list.stderr);
  assert.deepEqual(JSON.parse(list.stdout).profiles.map(profile => profile.jurisdiction_id),
    ['colorado-district', id]);
  const classify = invokeCli(['classify', '--profile', id, '--title', 'Reply in Further Support'], cwd);
  assert.equal(classify.status, 0, classify.stderr);
  assert.deepEqual(JSON.parse(classify.stdout).suggestions, ['reply-memorandum']);
});

test('New York court and county guards refuse foreign, appellate and unresolved courts before writing, even on replay', t => {
  const cwd = temp(t);
  const output = join(cwd, 'must-stay-unwritten.html');
  const caption = join(cwd, 'caption.json');
  for (const [court, county] of [
    ['United States District Court for the Southern District of New York', 'New York'],
    ['Supreme Court of the United States', 'New York'],
    ['Supreme Court of the State of Colorado', 'New York'],
    ['Supreme Court of the State of New York, Appellate Division, First Department', 'New York'],
    ['Supreme Court of the State of New York, New York County, Commercial Division', 'New York'],
    ['Supreme Court of the State of New York, Example County', 'New York'],
    ['Supreme Court of the State of New York, New York County 123456/2099', 'New York'],
    ['Supreme Court', 'New York'],
    ['New York State Supreme Court, New York County', 'Kings'],
    ['New York State Supreme Court, County of Kings', 'Example'],
  ]) {
    writeFileSync(caption, JSON.stringify(ny.caption({ court, county })));
    for (const flags of [[], ['--replay']]) {
      const run = invokeCli(['compose', '--profile', id, '--caption', caption, '--body', asset('memorandum.md'),
        '--out', output, ...flags], cwd);
      assert.equal(run.status, 1, court);
      assert.match(run.stderr, /outside profile|county|New York motion paper/iu);
      assert.equal(existsSync(output), false);
    }
  }
  assert.match(ny.composeMock(ny.caption({ court: 'New York State Supreme Court, County of Kings', county: 'Kings' })).html,
    /COUNTY OF KINGS/);
  assert.match(ny.composeMock(ny.caption({ court: 'Supreme Court, State of New York', county: 'St. Lawrence' })).html,
    /COUNTY OF ST\. LAWRENCE/);
});

test('New York only classifies covered motion papers and retains stricter word treatment', () => {
  const profile = ny.load();
  for (const [type, words, titles] of [
    ['memorandum-of-law', 7000, ['Memorandum of Law in Support of Motion', 'Memorandum in Opposition to Motion',
      'Brief in Response to Motion', 'Plaintiff’s Opposition to Defendant’s Motion', 'Response to Motion']],
    ['reply-memorandum', 4200, ['Reply Memorandum of Law', 'Reply in Further Support', 'Reply in Further Support of Motion',
      'Reply to Plaintiff’s Opposition', "Defendant's Reply to Opposition", 'Memorandum of Law in Reply',
      'Brief in Further Support of Motion']],
    ['notice-of-motion', null, ['Notice of Motion']],
  ]) {
    for (const title of titles) {
      const caption = type === 'notice-of-motion' ? notice() : ny.caption({ title, document_type: type });
      assert.deepEqual(suggestTypes(profile, title), [type]);
      validateCaption(caption, profile);
      assert.equal(resolveLimits(profile, caption).words, words);
      if (words) {
        assert.throws(() => resolveLimits(profile, caption, { noLimit: true }), /not allowed/);
        assert.equal(resolveLimits(profile, caption, { pages: 2 }).words, words);
        assert.throws(() => resolveLimits(profile, caption, { words: words + 1 }), /cannot exceed/);
        assert.throws(() => resolveLimits(profile, caption, { orderWords: words + 1 }), /--order-source/);
      }
    }
  }
  for (const title of ['Reply in Further Support', 'Reply to Plaintiff’s Opposition', 'Affidavit of Robin Sample',
    'Affirmation in Opposition to Motion', 'Attorney Affirmation', 'Sur-Reply Memorandum of Law',
    'Memorandum of Law in Support of Motion and Affirmation in Support',
    'Memorandum of Law in Support of Motion (in Reply)', 'Notice of Cross-Motion', 'Order to Show Cause']) {
    const caption = ny.caption({ title, type_confirmed: { title, document_type: 'memorandum-of-law' } });
    assert.throws(() => ny.composeMock(caption), /sourced unprofiled route/iu, title);
    assert.throws(() => validateCaption(caption, profile, 'caption', true), /Replay requires/);
  }
  assert.throws(() => ny.composeMock(ny.caption({ document_type: 'other-paper' })), /not listed/);
  const cross = ny.caption({ title: 'Memorandum of Law in Opposition to Motion and in Support of Cross-Motion' });
  assert.throws(() => validateCaption(cross, profile), /motion\.posture/);
  cross.motion.posture = 'opposition-with-cross-motion';
  validateCaption(cross, profile);
  assert.equal(resolveLimits(profile, cross).words, 7000);
  cross.document_type = 'reply-memorandum';
  cross.title = 'Reply to Opposition to Principal Motion and in Opposition to Cross-Motion';
  cross.motion.posture = 'principal-reply-on-cross-motion';
  validateCaption(cross, profile);
  assert.equal(resolveLimits(profile, cross).words, 4200);
  cross.title = 'Reply in Further Support of Defendant’s Cross-Motion';
  assert.throws(() => validateCaption(cross, profile), /motion\.posture/);
});

test('New York source-bearing fields and layout rules are closed against waivers', () => {
  const profile = ny.load();
  const caption = ny.caption();
  for (const name of ['county', 'index_number', 'assigned_judge', 'signer', 'motion', 'service']) {
    const copy = structuredClone(caption);
    delete copy[name];
    assert.throws(() => validateCaption(copy, profile), new RegExp(name + ' is required'));
  }
  for (const [field, value] of [
    ['assigned_judge', 'Not assigned'], ['index_number', 'Supreme Court 123456/2099'],
    ['signer', { ...caption.signer, name: caption.signer.represents }],
    ['signer', { ...caption.signer, telephone: 'unknown' }],
    ['parties', [...caption.parties].reverse()], ['motion', { ...caption.motion, source: ' ' }],
    ['service', { ...caption.service, recipients: [] }], ['service', { ...caption.service, source: '' }],
    ['notice', notice().notice], ['bookmarks_present', true], ['no_service_certificate', true],
  ]) assert.throws(() => validateCaption({ ...caption, [field]: value }, profile), Error, field);
  for (const mutate of [
    p => { p.layout.margins_inches.left = 0.8; },
    p => { p.layout.body_line_height = 1; },
    p => { p.validation.limits['reply-words'].maximum = 7000; },
    p => { p.document_types['reply-memorandum'].word_count_certificate = false; },
    p => { p.document_types['notice-of-motion'].exact_title = 'Affirmation'; },
    p => { p.document_types['reply-memorandum'].double_spacing = ['heading']; },
  ]) {
    const copy = structuredClone(profile);
    mutate(copy);
    assert.throws(() => validateProfile(copy), /approved New York layout treatment/);
  }
  assert.throws(() => ny.composeMock(notice(), profile, 'Only an unrelated paragraph.'), /Relief requested/);
});

pdfTest('New York memorandum renders by ID, binds its exact count and fails six independent physical defects', t => {
  const filing = ny.build(temp(t), 'opening', ny.caption(), memo, id);
  const pdf = filing.renderPdf('approved');
  const receipt = filing.check(pdf);
  mustPass(receipt, [
    'Court name in caption', 'County in caption', 'Parties in caption order', 'Other court caption strings absent',
    'Index number in caption', 'Assigned judge in caption', 'Document title in caption', 'Signer in signature block',
    'Word-count certificate present', 'Word-count certificate on separate final page', 'Within word limit (7000)',
    'Embedded profile fonts', 'Profile type size', 'Body paragraph spacing', 'Visible margin geometry',
    'Printed PDF body matches composition', 'Dashed caption rules', 'Footer inside one-inch page boundary',
  ]);
  assert.equal(receipt.pages, 3);
  assert.equal(receipt.pdfBodyWords, 336);
  assert.match(filing.html, /The printed memorandum body contains 336 words/);
  assert.match(filing.html, /Dated: _{16}<\/p>\s*<p>_{32}<\/p>/);
  expectFailedMutations(filing, [
    ['font', 'font: 12pt / 24pt "Times New Roman"', 'font: 11pt / 24pt "Times New Roman"', 'Profile type size'],
    ['margin', '</style>', '@page { margin-left: 0.65in; margin-right: 0.65in; }</style>', 'Visible margin geometry'],
    ['spacing', '</style>', '.body { line-height: 17pt; }</style>', 'Body paragraph spacing'],
    ['index', '>123456/2099<', '>654321/2099<', 'Index number in caption'],
    ['certificate', /<section class="certificate">[\s\S]*?<\/section>/u, '', 'Word-count certificate present'],
    ['body', 'The fictional dispute concerns a contract', 'The fictional dispute involves an agreement',
      'Printed PDF body matches composition'],
  ]);
  expectFailedMutations(filing, [
    ['wrong-county', 'COUNTY OF NEW YORK', 'COUNTY OF KINGS', 'County in caption'],
    ['wrong-judge', 'Hon. Avery Example', 'Hon. Taylor Example', 'Assigned judge in caption'],
    ['wrong-title', '>Memorandum of Law in Support of Motion<', '>Memorandum of Law in Opposition to Motion<', 'Document title in caption'],
    ['wrong-party', '>JANE EXAMPLE,', '>JANET EXAMPLE,', 'Parties in caption order'],
    ['wrong-role', '>Defendant.', '>Plaintiff.', 'Parties in caption order'],
    ['wrong-contact', 'morgan@example.invalid', 'wrong@example.invalid', 'Signer in signature block'],
    ['wrong-count', 'contains 336 words', 'contains 335 words', 'Word-count certificate present'],
    ['missing-signature', '<p>________________________________</p>', '', 'Signer in signature block'],
    ['wrong-footer-height', 'padding-top: 6pt;', 'padding-top: 28pt;', 'Footer inside one-inch page boundary'],
    ['missing-dashes', 'border-top: 1px dashed #000;', 'border-top: 1px solid #000;', 'Dashed caption rules'],
    ['blue-type', 'body { margin: 0; color: #000;', 'body { margin: 0; color: #0000ee;', 'Black filing type'],
  ]);
  const short = ny.build(temp(t), 'short-opening', ny.caption(), 'The fictional movant requests a scheduling conference.', id);
  expectFailedMutations(short, [[
    'same-page-certificate', '.notice-closing, .certificate { break-before: page; }', '',
    'Word-count certificate on separate final page',
  ]]);
  const order = filing.check(pdf, 0, ['--order-max-words', '7200', '--order-source', 'Fictional order dated 2099-01-02, docket item 9']);
  assertChecks(order, ['Within word limit (7200, set by order)'], 'pass');
  assertChecks(order, ['Order ceiling above profile (words)'], 'advisory');
});

pdfTest('New York reply and notice render by absolute profile path from outside the tool', t => {
  const cwd = temp(t);
  const reply = ny.caption({ title: 'Reply to Plaintiff’s Opposition', document_type: 'reply-memorandum' });
  const replyFiling = ny.build(cwd, 'reply', reply);
  mustPass(replyFiling.check(replyFiling.renderPdf('approved')), [
    'Within word limit (4200)', 'Word-count certificate present', 'Word-count certificate on separate final page',
  ]);
  const form = notice();
  const filing = ny.build(cwd, 'notice', form, noticeBody);
  const pdf = filing.renderPdf('approved');
  const receipt = filing.check(pdf);
  mustPass(receipt, ['Notice recipients', 'Oral argument box in caption',
    'Notice supporting papers and return fields', 'Notice relief, grounds and conditional fields', 'Word-count certificate absent']);
  assert.equal(receipt.pages, 2);
  assert.equal(receipt.limits.choice, 'no-length-limit');
  expectFailedMutations(filing, [
    ['recipient', 'jane@example.invalid', 'different@example.invalid', 'Notice recipients'],
    ['request-box', '□ Oral argument is requested', '■ Oral argument is requested', 'Oral argument box in caption'],
    ['return-date', 'on ________________, at', 'on November 30, 2099, at', 'Notice supporting papers and return fields'],
  ]);
  const selected = notice();
  selected.notice.oral_argument_requested = true;
  selected.notice.seven_day_demand = true;
  const demand = ny.build(cwd, 'notice-demand', selected, noticeBody);
  mustPass(demand.check(demand.renderPdf('approved')), ['Oral argument box in caption', 'Notice relief, grounds and conditional fields']);
  const check = validatePrintedFixture(pdf, noticeBody);
  const separate = check({ ...form, service: { ...form.service, method: 'separate-proof-required' } }, ny.load());
  assert.equal(separate.ok, false);
  assertChecks(separate, ['Service proof treatment'], 'not_checked');
  const disclosure = check({ ...form, motion: { ...form.motion, procedure: 'disclosure-or-bill-of-particulars' } }, ny.load());
  assert.equal(disclosure.ok, false);
  assertChecks(disclosure, ['Good-faith affirmation'], 'not_checked');
});

function wordFixture(count) {
  const numbered = Array.from({ length: count - 4 }, (_, i) => 'record' + (i + 1));
  const paragraphs = words => Array.from({ length: Math.ceil(words.length / 60) }, (_, i) =>
    words.slice(i * 60, i * 60 + 60).join(' ')).join('\n\n');
  const split = Math.floor(numbered.length / 2);
  return '## Fictional Record\n\n' + paragraphs(numbered.slice(0, split)) +
    '\n\n## Proposed Schedule\n\n' + paragraphs(numbered.slice(split));
}

async function addOutline(pdf, output, { headingPage, target = 'correct' }) {
  const doc = await PDFDocument.load(readFileSync(pdf), { updateMetadata: false });
  const { context, catalog } = doc;
  const root = context.nextRef();
  const first = context.nextRef();
  const last = context.nextRef();
  const page = doc.getPage(target === 'wrong-page' ? 0 : headingPage - 1).ref;
  const destination = target === 'external' ? { A: { S: 'URI', URI: PDFHexString.fromText('https://example.invalid/') } } :
    { Dest: [page, 'XYZ', 72, target === 'off-page' ? 1900 : 650, null] };
  context.assign(root, context.obj({ Type: 'Outlines', First: first, Last: last, Count: 2 }));
  context.assign(first, context.obj({ Title: PDFHexString.fromText('Fictional Record'), Parent: root, Next: last,
    Dest: [doc.getPage(0).ref, 'Fit'] }));
  context.assign(last, context.obj({ Title: PDFHexString.fromText('Proposed Schedule'), Parent: root, Prev: first,
    ...destination }));
  catalog.set(PDFName.of('Outlines'), root);
  writeFileSync(output, await doc.save());
}

pdfTest('New York bookmark rule holds actual electronic PDFs at 4,501 words, with a real outline control', async t => {
  const cwd = temp(t);
  const cap = ny.caption();
  const boundary = ny.build(cwd, 'exact', cap, wordFixture(4500), id);
  const at = boundary.check(boundary.renderPdf('pdf'));
  assert.equal(at.pdfBodyWords, 4500);
  assertChecks(at, ['Electronic navigational bookmarks'], 'not_applicable');

  const above = ny.build(cwd, 'above', cap, wordFixture(4501), id);
  const pdf = above.renderPdf('pdf');
  const absent = above.check(pdf, 1);
  assert.equal(absent.pdfBodyWords, 4501);
  assertChecks(absent, ['Within word limit (7000)', 'Word-count certificate present'], 'pass');
  assertChecks(absent, ['Electronic navigational bookmarks'], 'fail');
  const raw = inspect('text', readFileSync(pdf)).bytes.toString();
  const headingPage = raw.split('\f').findIndex(page => page.includes('Proposed Schedule')) + 1;
  assert.ok(headingPage > 1);
  const evidence = {};
  for (const target of ['correct', 'off-page', 'wrong-page', 'external']) {
    const outlined = join(cwd, target + '.pdf');
    await addOutline(pdf, outlined, { headingPage, target });
    const receipt = above.check(outlined, 1);
    assertChecks(receipt, ['Printed PDF body matches composition', 'Word-count certificate present'], 'pass');
    assertChecks(receipt, ['Electronic navigational bookmarks'], ['correct', 'off-page'].includes(target) ? 'not_checked' : 'fail');
    evidence[target] = inspect('typography', readFileSync(outlined)).bytes.toString().match(/<outline>[\s\S]+<\/outline>/u)?.[0];
  }
  assert.match(evidence.correct, /Proposed Schedule/);
  assert.equal(evidence.correct, evidence['off-page']);
});

pdfTest('New York reply word ceiling and order apply to the same exact printed certificate', t => {
  const cwd = temp(t);
  const reply = ny.caption({ title: 'Reply in Further Support', document_type: 'reply-memorandum' });
  const short = ny.build(cwd, 'reply-edge', reply, wordFixture(4200), id);
  const at = short.check(short.renderPdf('pdf'));
  assert.equal(at.pdfBodyWords, 4200);
  assertChecks(at, ['Within word limit (4200)', 'Word-count certificate present'], 'pass');
  const over = ny.build(cwd, 'reply-over', reply, wordFixture(4201), id);
  const pdf = over.renderPdf('pdf');
  const rejected = over.check(pdf, 1);
  assert.equal(rejected.pdfBodyWords, 4201);
  assertChecks(rejected, ['Within word limit (4200)'], 'fail');
  assertChecks(rejected, ['Word-count certificate present'], 'pass');
  assertChecks(over.check(pdf, 0, ['--order-max-words', '4300', '--order-source', 'Fictional order, dated 2099-01-02, docket item 9']),
    ['Within word limit (4300, set by order)'], 'pass');
});

pdfTest('New York replay preserves type and court restrictions and cannot pass as a renamed production PDF', t => {
  const cwd = temp(t);
  const caption = join(cwd, 'caption.json');
  writeFileSync(caption, JSON.stringify(ny.caption()));
  const args = ['--profile', id, '--caption', caption, '--body', asset('memorandum.md')];
  const composed = invokeCli(['compose', ...args, '--out', join(cwd, 'replay.html'), '--replay'], cwd);
  assert.equal(composed.status, 0, composed.stderr);
  const receipt = JSON.parse(composed.stdout);
  const pdf = join(cwd, receipt.pdfFilenamePrefix + 'fictional.pdf');
  const { status, stderr } = spawnSync(process.execPath, [process.env.COURT_FILING_RENDER, 'pdf',
    '--input', receipt.html, '--output', pdf, ...receipt.pdfArgs], { cwd, encoding: 'utf8' });
  assert.equal(status, 0, stderr);
  const validation = ['validate', ...args, '--pdf', pdf, '--body-sha256', receipt.bodySha256];
  const replay = invokeCli([...validation, '--replay'], cwd);
  assert.equal(replay.status, 0, replay.stderr);
  assert.equal(JSON.parse(replay.stdout).result, 'REPLAY CHECKS PASSED - NOT FOR FILING');
  const production = invokeCli(validation, cwd);
  assert.equal(production.status, 1);
  assert.equal(statuses(JSON.parse(production.stderr))['PDF replay metadata'], 'fail');
});
