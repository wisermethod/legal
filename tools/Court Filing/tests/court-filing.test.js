import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync,
  statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Marked } from 'marked';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { compose, parseFilingMarkdown, prepareBody } from '../scripts/compose-core.js';
import { resolveLimits, suggestTypes, titleChecks, validateCaption, validateProfile } from '../scripts/schema-core.js';
import { markdownWordCount, printedBodyText, wordCount } from '../scripts/body-text-core.js';
import { validate } from '../scripts/validate-core.js';
import { bodyEvidence, removeRepeatedHeaders } from '../scripts/filing-text-core.js';
import { readTextLines } from '../scripts/pdf-evidence-core.js';

const tool = fileURLToPath(new URL('..', import.meta.url));
const cli = join(tool, 'scripts', 'court-filing.js');
const asset = name => join(tool, 'assets', name);
const profilePath = join(tool, 'profiles', 'colorado-district.json');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const example = () => readJson(asset('example-caption.json'));
const profile = () => readJson(profilePath);
const body = () => readFileSync(asset('example-body.md'), 'utf8');
const marked = new Marked({ gfm: true });
const parse = body => parseFilingMarkdown(marked, body);
const digest = text => createHash('sha256').update(text).digest('hex');
const compos = inputs => compose(inputs, parse, digest);
const noLimit = ['--no-length-limit'];
const motionLimit = ['--limit', 'general-motion-pages'];
const resultOf = response => JSON.parse(response.status === 0 ? response.stdout : response.stderr);
const run = (args, options = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', ...options });
const checksByName = output => Object.fromEntries(output.checks.map(({ label, status }) => [label, status]));
const poppler = Object.values(JSON.parse(run(['check']).stdout).poppler).every(Boolean);

function pairedProfile(type, lengthMode = 'alternatives') {
  const custom = profile();
  custom.jurisdiction_id = 'fixture-length-pair';
  const id = 'fixture-' + type + '-words';
  custom.validation.limits[id] = {
    unit: 'words', maximum: type === 'reply' ? 2500 : 4000,
    citation: 'Fictional rule for testing', verification: 'working-default',
  };
  const treatment = custom.document_types[type];
  treatment.length_mode = lengthMode;
  treatment.length_presets = [treatment.length_presets[0], id];
  return custom;
}

function temp(t) {
  const path = mkdtempSync(join(tmpdir(), 'court-filing-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return realpathSync(path);
}

test('compose lays out the boxed caption, body spacing, signature and certificate', () => {
  const caption = example();
  caption.parties.splice(1, 0, { role: 'Defendant and Counterclaimant', name: 'Second <Party>' });
  caption.parties.push({ role: 'Plaintiff', name: 'Second Plaintiff' });
  caption.title = 'Motion for an "Example" & Request';
  const composed = compos({ caption, body: body(), profile: profile() });
  assert.match(composed.html, /@page \{ size: letter; margin: 1in 1in 1in 1in; \}/);
  assert.match(composed.html, /font-family: 'Times New Roman', Times, serif; font-size: 12pt/);
  assert.match(composed.html, /\.body p \{ line-height: 2;/);
  assert.match(composed.html, /table\.caption \{ break-inside: avoid; \}/);
  assert.match(composed.html, /\.closing \{[^}]+break-inside: avoid/);
  assert.match(composed.html, /row[^>]*>\s*<td colspan="2" class="doc-title">Motion for an &quot;Example&quot; &amp; Request/);
  assert.match(composed.html, /&#9650; COURT USE ONLY &#9650;/);
  assert.match(composed.html, /Plaintiff:<\/span> ROWAN EXAMPLE;/);
  assert.match(composed.html, /Defendant and Counterclaimant:<\/span> SECOND &lt;PARTY&gt;\./);
  assert.equal((composed.html.match(/class="vs">v\./g) ?? []).length, 1);
  assert.match(composed.html, /ROWAN EXAMPLE;[\s\S]*class="vs">v\.[\s\S]*SECOND &lt;PARTY&gt;\.[\s\S]*IMAGINARY WORKSHOP LLC[\s\S]*SECOND PLAINTIFF;/);
  assert.match(composed.html, /<div class="counsel-label">Pro Se Plaintiff:<\/div>/);
  assert.match(composed.html, /<h2>Statement of the request<\/h2>/);
  assert.match(composed.html, /Respectfully submitted,[\s\S]*Date: ____________________/);
  assert.ok(composed.html.includes('____ day of __________, ' + new Date().getFullYear() + ','));
  assert.match(composed.html, /Morgan Sample \(morgan@example.invalid; former-service@example.invalid\)/);
  assert.match(composed.html, /<em>Counsel for Imaginary Workshop LLC<\/em>/);
  assert.deepEqual(composed.pdf, {
    paperSize: 'Letter', margin: '1in 1in 1in 1in', printBackground: true,
    footerFormat: 'Page {page} of {pages}', footerPosition: 'center', footerFontSize: 10, footerSkipFirst: false,
  });
  caption.caption_counsel = false;
  assert.doesNotMatch(compos({ caption, body: body(), profile: profile() }).html, /class="counsel-block"/);
  caption.caption_counsel = true;
  caption.signer.role = 'Attorney';
  caption.counsel_label = 'Counsel for Applicant:';
  assert.match(compos({ caption, body: body(), profile: profile() }).html, /class="counsel-label">Counsel for Applicant:/);
});

test('compose applies uppercase only in the caption title cell and keeps the typed title in the certificate', () => {
  const caption = { ...example(), title: 'Motion for an "Example" & Request' };
  const { html } = compos({ caption, body: body(), profile: profile() });
  assert.match(html, /tr\.caption-title-row td\.doc-title \{[^}]*text-transform: uppercase;[^}]*\}/);
  assert.match(html, /tr\.caption-title-row td\.doc-title \{[^}]*white-space: pre-wrap;[^}]*\}/);
  assert.match(html, /<div class="cert">[\s\S]*foregoing\s+Motion for an &quot;Example&quot; &amp; Request was served by email/);
});

test('headings keep with their text in production, and a replay omits the rule to reproduce earlier page breaks', () => {
  const rule = /\.body h1, \.body h2, \.body h3, \.body h4, \.body h5, \.body h6 \{ break-after: avoid; \}/;
  assert.match(compos({ caption: example(), body: body(), profile: profile() }).html, rule);
  const replayed = compos({ caption: example(), body: body(), profile: profile(), replay: true }).html;
  assert.doesNotMatch(replayed, /break-after/);
  assert.match(replayed, /tr\.caption-title-row td\.doc-title \{[^}]*text-transform: uppercase;[^}]*\}/);
});

test('profile types own their title, blocks, packet and limit choices', () => {
  const current = profile();
  for (const [change, expected] of [
    [{ division: '' }, /division must be populated/],
    [{ signer: undefined }, /signer must be an object/],
    [{ parties: [] }, /parties must be a non-empty array/],
    [{ document_type: 'unknown' }, /document_type is not listed/],
    [{ type_confirmed: 'true' }, /type_confirmed must be an object/],
  ]) assert.throws(() => validateCaption({ ...example(), ...change }, current), expected);
  const brokenEmail = example();
  brokenEmail.service.recipients[0].emails = ['not an email'];
  assert.throws(() => validateCaption(brokenEmail, current), /caption\.service\.recipients\[0\]\.emails\[0\] must be an email address/);
  const limited = preset => resolveLimits(current, example(), preset);
  assert.deepEqual(limited(), { choice: 'profile-preset', pages: 15, words: null, preset: 'general-motion-pages' });
  assert.throws(() => limited({ noLimit: true }), /not allowed for this profile document type/);
  assert.throws(() => limited({ preset: 'general-reply-pages' }), /not listed for this profile document type/);
  assert.throws(() => compos({ caption: { ...example(), document_type: 'rule-12-or-56-motion' }, body: body(), profile: current }), /set caption.type_confirmed to the exact title and document_type/);
  assert.equal(validateCaption({ ...example(), document_type: 'rule-12-or-56-motion', title: 'Motion for Summary Judgment' }, current)
    .document_type, 'rule-12-or-56-motion');
  assert.deepEqual(limited({ preset: 'general-motion-pages' }), {
    choice: 'profile-preset', pages: 15, words: null, preset: 'general-motion-pages',
  });
  assert.throws(() => limited({ preset: 'general-motion-pages', pages: 10 }), /cannot be combined/);
  assert.throws(() => limited({ pages: 1.5 }), /--max-pages must be a positive integer/);

  for (const [mutate, expected] of [
    [p => { p.document_types.motion.filing_packet = 'typo'; }, /must name a listed packet/],
    [p => { p.document_types.motion.length_presets = ['made-up']; }, /unlisted length preset/],
    [p => { p.document_types.motion.certificate = false; }, /omission needs/],
    [p => { p.layout.footer.format = 'Just a label'; }, /profile\.layout\.footer\.format/],
  ]) {
    const broken = profile();
    mutate(broken);
    assert.throws(() => validateProfile(broken), expected);
  }
});

test('shipped Colorado length presets are exclusively page limits', () => {
  const shipped = profile();
  assert.deepEqual(Object.fromEntries(Object.entries(shipped.validation.limits)
    .map(([id, { unit, maximum }]) => [id, [unit, maximum]])), {
    'general-motion-pages': ['pages', 15],
    'general-reply-pages': ['pages', 10],
    'rule-12-or-56-motion-pages': ['pages', 25],
    'rule-12-or-56-reply-pages': ['pages', 15],
  });
  assert.ok(Object.values(shipped.document_types).every(type => type.length_mode !== 'alternatives'));
  assert.equal(validateProfile(shipped), shipped);
  for (const [type, pages] of Object.entries({
    motion: 15, response: 15, reply: 10, brief: 15, 'other-paper': 15,
    'rule-12-or-56-motion': 25, 'rule-12-or-56-response': 25, 'rule-12-or-56-reply': 15,
  })) {
    const length = resolveLimits(shipped, { ...example(), document_type: type });
    assert.equal(length.pages, pages, type);
    assert.equal(length.words, null, type);
  }
});

const orderCaption = () => {
  const { signer, service, ...fields } = example();
  return { ...fields, title: '[Proposed] Order Setting a Conference', document_type: 'proposed-order' };
};

const declarationCaption = () => {
  const { service, ...fields } = example();
  return { ...fields, title: 'Declaration of Rowan Example in Support of Response to Motion',
    document_type: 'supporting-declaration', filing_packet: 'motion_response_with_declaration' };
};

const initialCaption = () => ({
  ...example(), title: 'Initial Complaint and Jury Demand', document_type: 'new-case-complaint',
  filing_packet: 'new_case_complaint', case_number: '', division: '',
});

test('one exact custom certificate omission is a listed document type', () => {
  const { service, ...initial } = example();
  const listed = profile();
  const { title_pattern, ...type } = listed.document_types.motion;
  const caption = { ...initial, document_type: 'fictional-exemption' };
  listed.document_types[caption.document_type] = { ...type, certificate: false, exact_title: caption.title };
  assert.deepEqual(validateCaption(caption, listed), caption);
  assert.equal(titleChecks(listed, { ...caption, title: 'Motion for Something Else' })[0].status, 'fail');
  assert.throws(() => validateCaption({ ...caption, service }, listed), /service must be omitted/);
  assert.throws(() => validateCaption({ ...initial, no_service_certificate: 'fictional-exemption' }, listed), /not a recognized field/);
});

test('packet modes cannot waive service on a motion or invent a judicial form', () => {
  const order = orderCaption();
  const declaration = declarationCaption();
  const proposedBody = 'The request is granted.\n\nDATED: __________\n\nBY THE COURT: __________\n\nDistrict Court Judge';
  const { html: orderHtml } = compos({ caption: order, body: proposedBody, profile: profile() });
  assert.doesNotMatch(orderHtml, /class="(?:closing|cert|counsel-block)"/);
  assert.match(orderHtml, /BY THE COURT: __________/);
  const { html: declarationHtml } = compos({ caption: declaration, body: body(), profile: profile() });
  assert.match(declarationHtml, /class="closing"/);
  assert.doesNotMatch(declarationHtml, /class="cert"/);
  assert.equal(titleChecks(profile(), { ...order, title: 'Order to Show Cause' })[0].status, 'fail');
  assert.throws(() => validateCaption({ ...order, signer: example().signer }, profile()), /omit filer/);
  assert.throws(() => compos({ caption: order, body: 'The request is denied.', profile: profile() }), /blank signature line/);
  assert.throws(() => validateCaption({ ...declaration, filing_packet: undefined }, profile()), /filing_packet/);
  assert.throws(() => validateCaption({ ...declaration, service: example().service }, profile()), /service must be omitted/);
  assert.equal(titleChecks(profile(), { ...declaration, title: 'Motion to Strike the Declaration' })[0].status, 'fail');
});

test('compose refuses raw HTML, image loads and non-document links', () => {
  for (const [markdown, expected] of [
    ['<style>body{font-size:1px}</style>', /raw HTML/],
    ['![Exhibit](https://example.invalid/asset.png)', /contains an image/],
    ['[private file](file:///missing)', /link must use/],
    ['[citation](https://example.invalid "Title")', /link titles are unsupported/],
    ["[citation](https://example.invalid '\"><style>p{font-size:8pt}</style>')", /link titles are unsupported/],
    ['[citation](<https://example.invalid/path with space>)', /link must use/],
    ['- [ ] Fictional item', /task checkboxes are unsupported/],
    ['Insert &#x202E;here.', /produce visible filing text/],
  ]) {
    assert.throws(() => compos({ caption: example(), body: markdown, profile: profile() }), expected);
  }
  assert.match(parse('A [citation](https://example.invalid/opinion).'), /<a href="https:\/\/example.invalid\/opinion">citation<\/a>/);
});

test('word counter counts visible body text and leaves out markup and destinations', () => {
  const tick = String.fromCharCode(96);
  const markdown = 'Before **bold** and *italic*, [site text](https://example.invalid/).\n\n' +
    tick + 'one two' + tick + '.\n\n- Item&nbsp;one\n- Item two.';
  assert.equal(wordCount(printedBodyText(parse(markdown), false)), 12);
});

test('composition counts ordered-list markers and retains additional Markdown tokens', () => {
  const markdown = '3. First example.\n4. Second example.\n\n- Another example.\n+ One more example.';
  assert.equal(markdownWordCount(markdown), 11);
  assert.equal(compos({ caption: example(), body: markdown, profile: profile() }).bodyWords, 11);
  const table = '| Item | Value |\n| --- | --- |\n| A | 3 |';
  assert.equal(wordCount(printedBodyText(parse(table))), 4);
  assert.equal(markdownWordCount(table), 6);
  assert.equal(compos({ caption: example(), body: table, profile: profile() }).bodyWords, 6);
  assert.equal(markdownWordCount('Text `hidden from this count` [link words](#target).\n\n' +
    '```\ncode block\n```\n\n![ignored](#image)'), 3);
});

test('CLI lists the full profile and publishes to a new path only', t => {
  const scratch = temp(t);
  const output = join(scratch, 'new', 'out.html');
  const customPath = join(scratch, 'custom.json');
  const custom = profile();
  custom.jurisdiction_id = 'fictional-a4';
  custom.layout.page_size = 'A4';
  custom.layout.margins_inches = { top: 0.7, right: 0.8, bottom: 0.9, left: 1.1 };
  custom.layout.certificate_year = null;
  writeFileSync(customPath, JSON.stringify(custom));
  const args = ['compose', '--caption', asset('example-caption.json'), '--body', asset('example-body.md'), '--profile', customPath, '--out', output];
  const call = run(args);
  assert.equal(call.status, 0, call.stderr);
  assert.equal(call.stderr, '');
  const result = JSON.parse(call.stdout);
  assert.equal(result.html, output);
  assert.equal(result.footerFont, 'Times New Roman');
  assert.deepEqual(result.pdfArgs, [
    '--paper-size', 'A4', '--margin', '0.7in 0.8in 0.9in 1.1in',
    '--print-background', 'true', '--footer-format', 'Page {page} of {pages}',
    '--footer-position', 'center', '--footer-font-size', '10',
  ]);
  assert.match(readFileSync(output, 'utf8'), /@page \{ size: a4; margin: 0\.7in 0\.8in 0\.9in 1\.1in; \}/);
  assert.ok(readFileSync(output, 'utf8').includes('____ day of __________, ' + new Date().getFullYear() + ','));
  assert.match(run(args).stderr, /already exists/);
  const listed = JSON.parse(run(['profiles']).stdout).profiles;
  assert.deepEqual(listed.map(({ jurisdiction_id }) => jurisdiction_id), ['colorado-district', 'new-york-supreme-court']);
  assert.deepEqual(listed[0], profile());
  assert.deepEqual(listed[1], readJson(join(tool, 'profiles', 'new-york-supreme-court.json')));
  const packet = listed[0].filing_packets.new_case_complaint;
  assert.deepEqual(packet.required_at_filing.map(({ item }) => item), ['Complaint']);
  assert.equal(listed[0].validation.limits['general-motion-pages'].citation, 'C.R.C.P. 121 section 1-15(1)(a)');
});

test('Colorado rejects the withdrawn certificate waiver and composes a blank-number complaint with service', t => {
  const scratch = temp(t);
  const caption = join(scratch, 'caption.json');
  const output = join(scratch, 'initial.html');
  const { service, ...initial } = example();
  Object.assign(initial, { ...initialCaption(), service: undefined });
  const composeArgs = ['compose', '--body', asset('example-body.md'), '--caption', caption,
    '--profile', 'colorado-district', '--out', output];
  const validateArgs = ['validate', '--pdf', join(scratch, 'unwritten.pdf'), '--caption', caption,
    '--profile', 'colorado-district', '--body', asset('example-body.md'), '--body-sha256', digest(body()), ...noLimit];
  for (const fields of [{}, { no_service_certificate: 'unsupported-reason' },
    { no_service_certificate: ['initial', 'complaint', 'before', 'service'].join('-') },
    { service, no_service_certificate: 'fictional-test-exemption' }]) {
    writeFileSync(caption, JSON.stringify({ ...initial, ...fields }));
    for (const args of [composeArgs, validateArgs]) {
      const refused = run(args);
      assert.equal(refused.status, 1);
      assert.equal(refused.stdout, '');
      assert.match(refused.stderr, /service must be supplied|no_service_certificate/);
    }
    assert.equal(existsSync(output), false);
  }
  writeFileSync(caption, JSON.stringify({ ...initial, service, filing_packet: 'new_case_complaint', case_number: '' }));
  const composed = run(composeArgs);
  assert.equal(composed.status, 0, composed.stderr);
  const html = readFileSync(JSON.parse(composed.stdout).html, 'utf8');
  assert.match(html, /CERTIFICATE OF SERVICE/);
  assert.match(html, /<strong>Case No:<\/strong> <\/div>/);
  assert.match(html, /Respectfully submitted/);
  assert.match(html, /Initial Complaint and Jury Demand/);
});

test('CLI rejects unknown options, duplicate fields, and private or linked files', t => {
  const scratch = temp(t);
  assert.match(run(['compose', '--install', '--made-up']).stderr, /Unknown option --made-up/);
  assert.match(run(['profiles', '--install']).stderr, /Unknown option --install/);
  assert.match(run(['validate', '--pdf', 'one', '--pdf', 'two']).stderr, /Duplicate option --pdf/);
  const raw = join(scratch, 'repeated.json');
  writeFileSync(raw, '{ "court": "First", "court": "Second" }');
  const args = caption => ['compose', '--caption', caption, '--body', asset('example-body.md'), '--profile', 'colorado-district', '--out', join(scratch, 'fresh.html')];
  assert.match(run(args(raw)).stderr, /repeats the JSON key "court"/);
  assert.match(run(args('relative.json')).stderr, /absolute path/);
  const privateDir = join(scratch, 'secrets');
  mkdirSync(privateDir);
  const privatePath = join(privateDir, 'test.json');
  writeFileSync(privatePath, '{}');
  const soft = join(scratch, 'soft.json');
  const hard = join(scratch, 'hard.json');
  symlinkSync(privatePath, soft);
  linkSync(privatePath, hard);
  assert.match(run(args(soft)).stderr, /private configuration/);
  assert.match(run(args(hard)).stderr, /one filesystem link/);
  const toolAlias = join(scratch, 'tool');
  symlinkSync(tool, toolAlias, 'dir');
  const outputArgs = args(asset('example-caption.json'));
  outputArgs[outputArgs.length - 1] = join(toolAlias, 'missing', 'blocked.html');
  assert.match(run(outputArgs).stderr, /outside this tool directory/);
  assert.equal(existsSync(join(tool, 'missing')), false);
});

test('install survey, refusal and consented offline install in a fresh copy', t => {
  const scratch = temp(t);
  const root = join(scratch, 'legal');
  const copy = join(root, 'tools', 'Court Filing');
  mkdirSync(copy, { recursive: true });
  for (const name of ['assets', 'profiles', 'scripts', 'package-lock.json', 'package.json']) {
    cpSync(join(tool, name), join(copy, name), { recursive: true });
  }
  const testHome = join(scratch, 'home');
  const env = {
    ...process.env, HOME: testHome, USERPROFILE: testHome,
    XDG_CONFIG_HOME: join(testHome, 'config'), APPDATA: join(testHome, 'AppData'),
    WISER_ALLOW_INSTALL: '0', npm_config_offline: 'true',
  };
  // The suite install seeded this archive in npm's cache. Consent is isolated.
  env.npm_config_cache ??= join(process.env.HOME ?? process.env.USERPROFILE, '.npm');
  const copyRun = args => spawnSync(process.execPath, [join(copy, 'scripts', 'court-filing.js'), ...args], { env, encoding: 'utf8' });
  assert.match(copyRun(['help']).stdout, /authorizes the package install/);
  assert.deepEqual(JSON.parse(copyRun(['profiles']).stdout).profiles.map(({ jurisdiction_id }) => jurisdiction_id),
    ['colorado-district', 'new-york-supreme-court']);
  assert.equal(JSON.parse(copyRun(['check']).stdout).marked, 'absent');
  assert.equal(existsSync(join(root, '.wiser-consent')), false);
  mkdirSync(join(copy, 'node_modules', 'marked'), { recursive: true });
  writeFileSync(join(copy, 'node_modules', 'marked', 'package.json'), JSON.stringify({ version: '0.0.0' }));
  assert.equal(JSON.parse(copyRun(['check']).stdout).marked, 'incomplete');
  const output = join(scratch, 'out.html');
  const composeArgs = ['compose', '--body', asset('example-body.md'), '--caption', asset('example-caption.json'),
    '--profile', 'colorado-district', '--out', output];
  const refused = copyRun(composeArgs);
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.match(refused.stderr, /^This Wiser skill needs to download and install Marked/);
  assert.equal(existsSync(output), false);
  const installed = copyRun([...composeArgs, '--install']);
  assert.equal(installed.status, 0, installed.stderr);
  assert.match(installed.stderr, /First run: installing dependencies/);
  assert.equal(JSON.parse(installed.stdout).html, output);
  assert.equal(JSON.parse(copyRun(['check']).stdout).marked, 'complete');
  const copyMarker = join(root, '.wiser-consent');
  assert.equal(readJson(copyMarker).realpath, root);
  assert.equal(existsSync(join(copy, 'scripts', 'consent.js')), false);
  if (process.platform !== 'win32') assert.equal(statSync(copyMarker).mode & 0o777, 0o600);
  const again = copyRun(['check', '--install']);
  assert.doesNotMatch(again.stderr, /First run: installing dependencies/);
  assert.equal(again.status, 0);
});

const fixtureBody = 'I request a fictional conference.';
const fixtureDigest = digest(fixtureBody);

async function fixture(t, options = {}) {
  const caption = options.caption ?? example();
  const pdf = await PDFDocument.create();
  const composed = compos({ caption, body: fixtureBody, profile: profile() });
  pdf.setTitle(options.metadata ?? composed.html.match(/<title>([^<]+)<\/title>/)[1]);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const pages = options.pages ?? 2;
  for (let number = 1; number <= pages; number++) {
    const page = pdf.addPage(options.secondSize && number === 2 ? options.secondSize : [612, 792]);
    function draw(line, y, x = 75) {
      page.drawText(line, { x, y, size: 12, font });
    }
    function centered(line, y) {
      draw(line, y, (page.getWidth() - font.widthOfTextAtSize(line, 12)) / 2);
    }
    if (number === 1) {
      [options.court ?? caption.court.toUpperCase(), caption.court_address,
        options.party ?? 'Plaintiff: ROWAN EXAMPLE;', 'v.', 'Defendant: IMAGINARY WORKSHOP LLC.']
        .forEach((line, index) => draw(line, 706 - index * 14));
      ['Pro Se Plaintiff:', caption.signer.name, ...caption.signer.lines]
        .forEach((line, index) => draw(line, 632 - index * 13));
      draw(options.marker ?? 'COURT USE ONLY', 651, 385);
      draw('Case No: ' + (options.caseNumber ?? caption.case_number), 629, 378);
      draw('Division: ' + (options.division ?? caption.division), 610, 378);
      centered(options.title ?? caption.title.toUpperCase(), 558);
      if (options.extraTitleLine) centered(options.extraTitleLine, 543);
      draw(options.bodyText ?? fixtureBody, 530);
    }
    if (number > 1 && options.bodyExtra) draw(options.bodyExtra, 700);
    if (number === pages) {
      const closing = ['Respectfully submitted,', 'Date: ____________________', '_____________________________',
        caption.signer.name + ', ' + caption.signer.role, ...caption.signer.lines];
      closing.forEach((line, index) => draw(line, 500 - 20 * index));
      if (!options.withoutCertificate) {
        centered(certificateHeading, 322);
        const date = options.certificateDate ?? '____ day of __________, ' + (caption.certificate_year ?? new Date().getFullYear());
        draw('I certify that on this ' + date + ', a true and correct copy of the foregoing', 297);
        draw(caption.title + ' was served by email', 275);
        draw('to:', 261);
        draw(caption.service.recipients[0].name + ' (morgan@example.invalid; ' +
          (options.email ?? 'former-service@example.invalid') + ')', 237);
        const svc = caption.service;
        [svc.firm, ...svc.firm_lines, svc.firm_note, '_____________________________', svc.served_by]
          .forEach((line, index) => draw(line, 220 - index * 20));
      }
    }
    const footer = 'Page ' + number + ' of ' + (options.wrongTotal ?? pages);
    if (!options.withoutFooter || number !== pages) {
      page.drawText(footer, {
        x: (page.getWidth() - font.widthOfTextAtSize(footer, 10)) / 2,
        y: options.footerInBody ? 100 : 20, size: 10, font,
        opacity: options.invisibleFooter ? 0 : 1,
      });
    }
    if (options.outside && number === pages) {
      page.drawRectangle({ x: 5, y: 450, width: 20, height: 20, color: rgb(0, 0, 0) });
    }
  }
  const path = join(temp(t), 'fixture.pdf');
  writeFileSync(path, await pdf.save());
  return path;
}

const certificateHeading = 'CERTIFICATE OF SERVICE';

function validateFile(path, options = {}) {
  const {
    caption = asset('example-caption.json'), hash = fixtureDigest,
    profileName = 'colorado-district', flags = motionLimit,
  } = options;
  const bodyPath = join(path, '..', 'fixture.md');
  writeFileSync(bodyPath, fixtureBody);
  const cliResult = run(['validate', '--pdf', path, '--caption', caption, '--profile', profileName,
    '--body-sha256', hash, '--body', bodyPath, ...flags]);
  assert.equal(cliResult.status === 0 ? cliResult.stderr : cliResult.stdout, '');
  return { status: cliResult.status, result: resultOf(cliResult) };
}

const pdfTest = (name, fn) => test(name, { skip: poppler ? false : 'Poppler PDF inspection programs are unavailable' }, fn);

pdfTest('browser-free PDF verifies both limits, caption, body, ink and footer and exposes unembedded fonts', async t => {
  const current = pairedProfile('motion', 'all');
  const profileName = join(temp(t), 'all.json');
  writeFileSync(profileName, JSON.stringify(current));
  const { status, result } = validateFile(await fixture(t), { profileName, flags: ['--max-pages', '2', '--max-words', '5'] });
  assert.equal(status, 1);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(result.bodyWords, 5);
  assert.equal(result.pdfBodyWords, 5);
  assert.equal(checksByName(result)['Within page limit (2)'], 'pass');
  assert.equal(checksByName(result)['Within word limit (5)'], 'pass');
  assert.deepEqual(result.checks.filter(check => check.status !== 'pass').map(check => check.label),
    ['Embedded profile fonts', 'Profile type size', 'Boxed caption ruling']);
  assert.match(result.checks.find(check => check.label === 'Embedded profile fonts').detail, /Times-Roman \(not embedded\)/);
});

pdfTest('PDF length and binding catch an expanded body that keeps the composition metadata', async t => {
  const path = await fixture(t, { bodyExtra: 'These words were inserted into the PDF after composition.' });
  const profileName = join(temp(t), 'paired.json');
  writeFileSync(profileName, JSON.stringify(pairedProfile('motion')));
  const { result } = validateFile(path, { profileName, flags: ['--max-pages', '1', '--max-words', '5'] });
  const checks = checksByName(result);
  assert.equal(result.bodyWords, 5);
  assert.equal(result.pdfBodyWords, 14);
  assert.equal(checks['Within a profile length alternative'], 'fail');
  assert.deepEqual(result.limits.satisfiedBy, []);
  assert.equal(checks['Composed body SHA-256'], 'pass');
  assert.equal(checks['Printed PDF body matches composition'], 'fail');
  const substituted = checksByName(validateFile(await fixture(t, { bodyText: 'I oppose a fictional conference.' })).result);
  assert.equal(substituted['Printed PDF body matches composition'], 'fail');
  const other = validateFile(await fixture(t, { metadata: 'Court Filing ' + digest('A different body.') }));
  assert.equal(checksByName(other.result)['Composed body SHA-256'], 'fail');
  const assertedBody = run(['validate', '--pdf', path, '--caption', asset('example-caption.json'),
    '--profile', 'colorado-district', '--body-sha256', fixtureDigest, '--body', asset('example-body.md'), ...motionLimit]);
  assert.equal(assertedBody.status, 1);
  assert.equal(assertedBody.stdout, '');
  assert.match(assertedBody.stderr, /--body does not match --body-sha256/);
});

pdfTest('wrong docket values, title, court and party cannot borrow matches from the body', async t => {
  for (const suffix of ['.1', '/1', '(1)', ')1', '1']) {
    const path = await fixture(t, { caseNumber: example().case_number + suffix, bodyText: example().case_number });
    assert.equal(checksByName(validateFile(path).result)['Case number in caption'], 'fail');
  }
  const caption = example();
  const path = await fixture(t, {
    court: 'WRONG COURT', party: 'Plaintiff: WRONG PARTY;', division: 'OTHER',
    title: 'OPPOSITION TO ' + caption.title.toUpperCase(),
    bodyText: caption.court + ' ' + caption.parties[0].name + ' ' + caption.title + ' Division: X',
  });
  const checks = checksByName(validateFile(path).result);
  for (const label of ['Court name in caption', 'Party in caption: Plaintiff Rowan Example', 'Division in caption', 'Document title in caption']) {
    assert.equal(checks[label], 'fail', label);
  }
  for (const option of [{ title: 'OTHER', bodyExtra: caption.title.toUpperCase() }, { extraTitleLine: 'AND OTHER RELIEF' }]) {
    assert.equal(checksByName(validateFile(await fixture(t, option)).result)['Document title in caption'], 'fail');
  }
  const email = await fixture(t, { email: 'former-service@example.invalid.example.invalid', bodyText: 'former-service@example.invalid' });
  assert.equal(checksByName(validateFile(email).result)['Service email present: former-service@example.invalid'], 'fail');
});

pdfTest('certificate words in the body do not replace a certificate block', async t => {
  const { status, result } = validateFile(await fixture(t, { withoutCertificate: true, bodyText: certificateHeading }));
  assert.equal(status, 1);
  assert.equal(checksByName(result)['Certificate of service present'], 'fail');
  assert.equal(checksByName(result)['Service email present: former-service@example.invalid'], 'fail');
});

pdfTest('certificate date uses the caption year for preprints and complete dates one year either way', async t => {
  const caption = { ...example(), certificate_year: 2098 };
  const captionPath = join(temp(t), 'caption.json');
  writeFileSync(captionPath, JSON.stringify(caption));
  const { html } = compos({ caption, body: fixtureBody, profile: profile() });
  assert.match(html, /____ day of __________, 2098,/);
  assert.throws(() => validateCaption({ ...caption, certificate_year: '2098' }, profile()), /four-digit year/);
  for (const [certificateDate, status] of [
    ['____ day of __________, 2098', 'pass'],
    ['____ day of __________, 2097', 'pass'],
    ['____ day of __________, 2099', 'pass'],
    ['____ day of __________, 2100', 'fail'],
    ['12th day of January, 2099', 'pass'],
    ['31 day of December, 2097', 'pass'],
    ['1st day of Oct., 2098', 'pass'],
    ['3rd day of Nov, 2098', 'pass'],
    ['12 day of January, 2100', 'fail'],
    ['12 day of January, 2096', 'fail'],
    ['29 day of February, 2099', 'fail'],
    ['12 day of January, ____', 'fail'],
    ['12 day of __________, 2098', 'fail'],
    ['____ day of January, 2098', 'fail'],
  ]) {
    const pdf = await fixture(t, { caption, certificateDate });
    const checks = checksByName(validateFile(pdf, { caption: captionPath }).result);
    assert.equal(checks['Certificate date fields'], status, certificateDate);
    assert.equal(checks['Certificate of service present'], 'pass');
    assert.equal(checks['Composed body SHA-256'], 'pass');
  }
  const calendarYear = new Date().getFullYear();
  const withoutOverride = await fixture(t, { caption: { ...caption, certificate_year: calendarYear + 4 },
    certificateDate: '12 day of January, ' + (calendarYear + 4) });
  const movedYear = checksByName(validateFile(withoutOverride).result);
  assert.equal(movedYear['Certificate date fields'], 'fail');
  assert.equal(movedYear['Composed body SHA-256'], 'pass');
  const archived = await fixture(t, { metadata: 'Court Filing ' + fixtureDigest,
    certificateDate: '____ day of __________, ' + calendarYear });
  const archivedChecks = checksByName(validateFile(archived).result);
  assert.equal(archivedChecks['Certificate date fields'], 'pass');
  assert.equal(archivedChecks['Composed body SHA-256'], 'pass');
});

pdfTest('injected validation date anchors the certificate independently of PDF metadata', async t => {
  const current = profile();
  current.layout.certificate_year = 2030;
  const caption = example();
  const title = 'Court Filing ' + fixtureDigest;
  const prepared = prepareBody(fixtureBody, current.document_types.motion, parse, digest);
  const limitOptions = { preset: 'general-motion-pages' };
  for (const [validationYear, metadataYear, certificateDate, expected] of [
    [2026, 2030, '____ day of __________, 2030', 'fail'],
    [2026, 2030, '12th day of Sept., 2030', 'fail'],
    [2026, 2030, '12th day of Sept., 2026', 'pass'],
    [2026, 2026, '12th day of Sept, 2026', 'pass'],
    [2026, 2026, '12th day of Sep., 2026', 'pass'],
    [2026, 2026, '31 day of Sept., 2026', 'fail'],
    [2027, 2026, '____ day of __________, 2026', 'pass'],
    [2026, 2027, '____ day of __________, 2027', 'pass'],
    [2027, null, '____ day of __________, 2027', 'pass'],
    [2028, 2026, '____ day of __________, 2026', 'fail'],
    [2028, 2028, '29th day of Feb., 2028', 'pass'],
  ]) {
    const metadata = metadataYear ? title + ' | Certificate year ' + metadataYear : title;
    const pdf = await fixture(t, { metadata, certificateDate });
    const validationDate = new Date(validationYear, 0, 1);
    const result = validate({ pdf, caption, profile: current, limitOptions, prepared, validationDate }, kind => {
      if (kind === 'page-info') return spawnSync('pdfinfo', ['-box', '-f', '1', '-l', '2', pdf]).stdout;
      if (kind === 'text') return spawnSync('pdftotext', ['-enc', 'UTF-8', '-raw', pdf, '-']).stdout;
      return null;
    });
    const checks = checksByName(result);
    assert.equal(checks['Certificate of service present'], 'pass', certificateDate);
    assert.equal(checks['Certificate date fields'], expected, certificateDate);
    assert.equal(checks['Composed body SHA-256'], 'pass');
  }
});

pdfTest('a 16-page PDF fails the selected 15-page profile preset', async t => {
  const { result } = validateFile(await fixture(t, { pages: 16 }), { flags: ['--limit', 'general-motion-pages'] });
  assert.equal(result.pages, 16);
  assert.equal(result.limits.choice, 'profile-preset');
  assert.equal(checksByName(result)['Within page limit (15)'], 'fail');
});

pdfTest('browser-free PDF fails wrong geometry on a later page and missing, incorrect or invisible footers', async t => {
  const alternate = await fixture(t, { secondSize: [595.28, 841.89] });
  const a4 = checksByName(validateFile(alternate).result);
  assert.equal(a4['Page size'], 'fail');
  assert.equal(a4['Visible margin geometry'], 'not_checked');
  const outside = await fixture(t, { outside: true });
  assert.equal(checksByName(validateFile(outside).result)['Visible margin geometry'], 'fail');
  for (const bad of [{ withoutFooter: true }, { wrongTotal: 3 }, { footerInBody: true }, { invisibleFooter: true }]) {
    assert.equal(checksByName(validateFile(await fixture(t, bad)).result)['Page-number footer'], 'fail');
  }
});

pdfTest('malformed PDF sends one failed validation result to stderr', t => {
  const file = join(temp(t), 'broken.pdf');
  writeFileSync(file, '%PDF-1.4\ncorrupt');
  const value = validateFile(file);
  assert.equal(value.status, 1);
  assert.equal(value.result.ok, false);
  assert.match(value.result.remediation, /Resolve/);
  const checks = checksByName(value.result);
  assert.equal(checks['PDF parses'], 'fail');
  assert.equal(checks['Case number in caption'], 'not_checked');
  assert.equal(checks['Visible margin geometry'], 'not_checked');
  for (const label of ['PDF parses', 'Case number in caption', 'Within page limit (15)', 'Visible margin geometry']) {
    assert.match(value.result.checks.find(check => check.label === label).detail, /pdfinfo.*exit status/);
  }
});

test('missing PDF system programs produce named unchecked results and presence commands on stderr', t => {
  const file = join(temp(t), 'fixture.pdf');
  writeFileSync(file, '%PDF-1.4');
  const markdown = join(file, '..', 'fixture.md');
  writeFileSync(markdown, fixtureBody);
  const response = run(['validate', '--pdf', file, '--caption', asset('example-caption.json'),
    '--profile', 'colorado-district', '--body', markdown, '--body-sha256', fixtureDigest, ...motionLimit], { env: { ...process.env, PATH: '' } });
  assert.equal(response.status, 1);
  assert.equal(response.stdout, '');
  const result = JSON.parse(response.stderr);
  assert.equal(result.ok, false);
  assert.equal(checksByName(result)['PDF parses'], 'not_checked');
  assert.equal(checksByName(result)['Page size'], 'not_checked');
  assert.deepEqual(result.unavailable.map(entry => entry.check),
    ['pdfinfo -v', 'pdftotext -v', 'pdffonts -v', 'pdftohtml -v', 'pdfimages -v', 'pdftoppm -v']);
  assert.ok(result.unavailable.every(entry => entry.errorCode === 'ENOENT'));
  assert.match(result.checks.find(check => check.label === 'PDF parses').detail, /pdfinfo.*ENOENT.*pdftotext.*ENOENT/);
});

test('unavailable inspection evidence cannot produce a successful gate', () => {
  const result = validate({
    pdf: new Uint8Array(), caption: example(), profile: profile(), limitOptions: { preset: 'general-motion-pages' },
    prepared: prepareBody(fixtureBody, profile().document_types.motion, parse, digest),
  }, () => null);
  assert.equal(result.ok, false);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(checksByName(result)['Page-number footer'], 'not_checked');
});

test('PDF inspection retries a spawn error once and keeps the final error code', async () => {
  const { inspect } = await import('../scripts/court-filing.js');
  const input = Buffer.from('fixture');
  const error = { code: 'EAGAIN', message: 'Private diagnostic deliberately omitted' };
  let attempts = 0;
  const spawn = () => ++attempts === 1 ? { error, status: null, signal: null } :
    { error: { ...error, code: 'ENOENT' }, status: null, signal: null };
  const failed = inspect('fonts', input, undefined, spawn);
  assert.equal(attempts, 2);
  assert.deepEqual(failed, { bytes: null, issue: {
    program: 'pdffonts', check: 'fonts', errorCode: 'ENOENT', status: null, signal: null, stderr: '',
  } });
});

test('only the complaint type may use the new-case packet and blank docket', () => {
  const current = profile();
  const initial = initialCaption();
  assert.equal(validateCaption(initial, current).case_number, '');
  assert.throws(() => validateCaption({ ...initial, case_number: '2099CV00000' }, current), /case_number must be blank/);
  assert.equal(titleChecks(current, { ...initial, title: 'Motion to Amend the Complaint' })[0].status, 'fail');
  assert.equal(titleChecks(current, { ...initial, title: 'Complaint and Notice of Hearing' })[0].status, 'advisory');
  assert.throws(() => validateCaption({ ...initial, filing_packet: 'unknown_packet' }, current), /filing_packet must match/);
  assert.throws(() => validateCaption({ ...example(), case_number: '' }, current), /case_number must be populated/);
  assert.throws(() => resolveLimits(current, initial, { preset: 'general-motion-pages' }), /not listed for this profile document type/);
  assert.match(run(['validate', '--no-length-limit', 'n/a']).stderr, /Unknown option n\/a/);
});

test('multiple-paper hints never switch or refuse a matched unlimited type', () => {
  for (const [document_type, simple, mixed] of [
    ['answer', "Defendant's Answer", "Defendant's Answer and Motion for Summary Judgment"],
    ['discovery-request', "Plaintiff's First Requests for Production", "Plaintiff's Requests for Production and Motion to Compel"],
    ['discovery-response', 'Responses to Interrogatories', 'Responses to Interrogatories and Motion to Compel'],
    ['discovery-disclosure', 'Supplemental Disclosures', 'Supplemental Disclosures and Notice of Hearing'],
    ['case-management-submission', 'Proposed Case Management Order', 'Proposed Case Management Order and Motion for Extension'],
  ]) {
    const caption = { ...example(), document_type, title: simple };
    assert.equal(resolveLimits(profile(), caption, { noLimit: true }).pages, null);
    const result = compos({ caption: { ...caption, title: mixed }, body: fixtureBody, profile: profile() });
    assert.equal(result.documentType, document_type);
    assert.equal(result.advisories[0].label, 'Possible second paper in title');
  }
});

const auditTitles = [
  ['motion', "Plaintiff's Emergency Motion for a Protective Order"],
  ['motion', "Plaintiff's Cross-Motion for Sanctions"],
  ['discovery-request', "Plaintiff's First Set of Interrogatories"],
  ['discovery-response', "Defendant's Responses to Plaintiff's First Set of Interrogatories"],
  ['case-management-submission', "Plaintiff's Proposed Case Management Order Pursuant to C.R.C.P. 16"],
];

test('compose keeps ordinary Colorado titles across modifiers, discovery sets and case management', t => {
  const cases = [
    ...auditTitles,
    ['motion', "Defendant's Unopposed Motion to Extend the Discovery Deadline"],
    ['motion', 'Joint Motion to Vacate the Settlement Conference'],
    ['motion', "Respondent's Amended Motion to Compel a Deposition"],
    ['motion', "Plaintiff's Verified Motion for Temporary Relief"],
    ['motion', "Defendants' Renewed Motion to Strike an Exhibit"],
    ['motion', 'Stipulated Motion to Modify the Briefing Schedule'],
    ['motion', 'Expedited Motion to Continue the Hearing'],
    ['rule-12-or-56-motion', 'Renewed Cross-Motion for Partial Summary Judgment'],
    ['response', 'Verified Response to the Motion to Amend'],
    ['rule-12-or-56-response', "Defendant's Expedited Opposition to Plaintiff's Renewed Motion for Summary Judgment"],
    ['rule-12-or-56-reply', "Plaintiff’s Amended Reply in Support of Defendant’s Motion to Dismiss Under Rule 12(b)(2)"],
    ['brief', 'Amended Memorandum in Support of a Renewed Motion to Extend Time'],
    ['discovery-request', 'Amended Second Set of Requests for Production of Records'],
    ['discovery-request', "Defendants' Fifth Requests for Admission"],
    ['discovery-request', '12th Set of Interrogatories to Defendant'],
    ['discovery-response', 'Amended Responses and Objections to the First Set of Requests for Production'],
    ['discovery-disclosure', 'Second Supplemental Disclosures Concerning Additional Witnesses'],
    ['case-management-submission', 'Joint Proposed Case-Management Order Following the Status Conference'],
  ];
  const scratch = temp(t);
  const captionPath = join(scratch, 'caption.json');
  for (const [index, [document_type, title]] of cases.entries()) {
    const output = join(scratch, 'filing-' + index + '.html');
    writeFileSync(captionPath, JSON.stringify({ ...example(), title, document_type }));
    const composed = run(['compose', '--caption', captionPath, '--body', asset('example-body.md'),
      '--profile', 'colorado-district', '--out', output]);
    assert.equal(composed.status, 0, title + ': ' + composed.stderr);
    assert.ok(readFileSync(output, 'utf8').includes('class="doc-title">' + title + '</td>'), title);
  }
});

test('the longer page presets require an actual Rule 12 or 56 motion phrase', () => {
  const cases = [
    ['motion', 'Motion for Partial Summary Judgment', 'Motion to Continue the Summary Judgment Hearing'],
    ['motion', 'Motion to Dismiss under C.R.C.P. 12(b)(1)', 'Motion to Exclude Testimony in a Rule 56 Proceeding'],
    ['motion', 'Motion to Dismiss Pursuant to Rule 12(b)(2)', 'Motion to Dismiss under Rule 12(b)(6)'],
    ['response', "Plaintiffs' Response to Defendants' Motion for Partial Summary Judgment", 'Response to Motion to Continue the Summary Judgment Hearing'],
    ['reply', 'Reply in Support of Motion for Summary Judgment', 'Reply in Support of Motion to Exclude Evidence Under Rule 56'],
  ];
  for (const [kind, eligible, ineligible] of cases) {
    const document_type = 'rule-12-or-56-' + kind;
    assert.equal(validateCaption({ ...example(), document_type, title: eligible }, profile()).title, eligible);
    const title = titleChecks(profile(), { ...example(), document_type, title: ineligible });
    assert.equal(title[0].status, 'fail');
  }
});

test('suggestions rank specific matches and title heuristics remain advisory', () => {
  const current = validateProfile(profile());
  for (const [document_type, title] of [
    ['motion', 'Motion for Continuance and Notice of Hearing'],
    ['rule-12-or-56-motion', 'Motion for Summary Judgment and Brief in Support'],
    ['discovery-response', "Defendant's Answers and Responses to Plaintiff's First Set of Interrogatories"],
    ['discovery-response', 'Responses and Answers to Requests for Admission'],
    ['discovery-response', 'Answers to Interrogatories and Responses to Requests for Production'],
    ['discovery-response', "Defendant's Objections to Plaintiff's First Set of Interrogatories"],
    ['amended-complaint', 'Fourth Amended Complaint'],
    ['amended-complaint', 'Twenty-First Amended and Restated Complaint'],
    ['amended-complaint', 'Amended and Supplemental Complaint'],
    ['amended-complaint', '42nd Amended Complaint'],
    ['proposed-order', 'Proposed Order'],
    ['proposed-order', "Order re: Applicant's Request"],
  ]) {
    const base = document_type === 'proposed-order' ? orderCaption() : example();
    const markdown = document_type === 'proposed-order' ?
      'Conference set.\n\nBY THE COURT: __________\n\nDistrict Court Judge' : fixtureBody;
    const caption = { ...base, document_type, title };
    const result = compos({ caption, body: markdown, profile: current });
    assert.equal(suggestTypes(current, title)[0], document_type, title);
    assert.deepEqual(result.advisories, [], title);
    assert.equal(result.documentType, document_type, title);
    assert.ok(result.html.includes(title), title);
  }
  assert.deepEqual(resultOf(run(['classify', '--profile', 'colorado-district', '--title', 'Motion for Summary Judgment'])), {
    profile: 'colorado-district', suggestions: ['rule-12-or-56-motion', 'other-paper'],
  });
  for (const [document_type, title] of [
    ['rule-12-or-56-response', 'Response to Motion for Summary Judgment and Motion to Strike'],
    ['response', "Defendant's Response to the Motion to Compel and Defendant's Motion for Sanctions"],
    ['motion', 'Motion for Leave to File a Sur-Reply and Response to Supplemental Authority'],
    ['reply', 'Reply in Support of the Motion to Compel and Motion for Sanctions'],
    ['other-paper', 'Status Report & Brief in Support of a Motion'],
    ['motion', 'Motion for Settlement Conference and Response Deadlines'],
  ]) {
    const result = compos({ caption: { ...example(), document_type, title }, body: fixtureBody, profile: current });
    assert.equal(result.documentType, document_type);
    assert.ok(result.advisories.some(check => check.label === 'Possible second paper in title'), title);
  }
  const oddMotion = compos({ caption: { ...example(), title: 'Request for a Fictional Conference' }, body: fixtureBody, profile: current });
  assert.equal(oddMotion.advisories[0].label, 'Declared type and title');
  assert.match(oddMotion.advisories[0].detail, /usual wording/);
});

test('a looser off-pattern type requires fresh confirmation of the exact title and type', () => {
  const current = profile();
  const guarded = [
    { ...example(), document_type: 'rule-12-or-56-motion' },
    { ...example(), document_type: 'discovery-response' },
    { ...orderCaption(), title: 'Scheduling of the Fictional Conference' },
    { ...declarationCaption(), title: 'Affidavit Regarding an Exhibit' },
  ];
  for (const caption of guarded) {
    assert.throws(() => compos({ caption, body: fixtureBody, profile: current }),
      /set caption.type_confirmed to the exact title and document_type/);
    for (const boolean of [true, false]) {
      assert.throws(() => compos({ caption: { ...caption, type_confirmed: boolean }, body: fixtureBody, profile: current }),
        /no longer accepts a boolean.*exact title.*exact type/);
    }
    const { title, document_type } = caption;
    const confirmed = { ...caption, type_confirmed: { title, document_type } };
    const markdown = caption.document_type === 'proposed-order' ?
      'The request is granted.\n\nBY THE COURT: __________\n\nDistrict Court Judge' : fixtureBody;
    const result = compos({ caption: confirmed, body: markdown, profile: current });
    assert.match(result.advisories[0].detail, /confirmed this exact title and type/);
    for (const changed of [{ title: title + '.' }, { document_type: 'other-paper' }]) {
      assert.throws(() => compos({ caption: { ...confirmed, ...changed }, body: markdown, profile: current }),
        /type_confirmed must match the exact title and document_type/);
    }
  }
  const types = current.document_types;
  const wider = { ...types.motion, title_pattern: 'Special paper' };
  types['word-extension'] = { ...wider, length_mode: 'alternatives' };
  current.validation.limits['extra-words'] = { unit: 'words', maximum: 5000, citation: null, verification: 'working-default' };
  types['word-extension'].length_presets = ['general-motion-pages', 'extra-words'];
  assert.equal(titleChecks(current, { ...example(), document_type: 'word-extension' })[0].status, 'fail');
});

test('every independently written ordinary title composes verbatim', () => {
  const current = validateProfile(profile());
  const titles = [
    "Statement of Compliance with the Scheduling Directive",
    "Application to Attend the Conference by Telephone",
    "Request for a Certified Copy of the Docket",
    "Designation of a Substitute Custodian of Records",
    "Objection to the Taxation of Transcript Costs",
    "Withdrawal of a Pending Request for Clarification",
    "Election to Proceed on the Existing Record",
    "Amendment to the List of Trial Exhibits",
    "Summary of Undisputed Ledger Entries",
    "Verification of the Corrected Exhibit Index",
    "Tender of the Revised Demonstrative Set",
    "Consent to the Use of Recorded Testimony",
    "Reservation of Objections to the Transcript",
    "Submission of Agreed Corrections to the Minutes",
    "Defendant's Supplemental Disclosures for the Status Conference",
    "Filer's Statement Regarding the Availability of an Interpreter",
    "Witness List and Exhibit List for the Evidentiary Hearing",
    "Affidavit of the Museum's Records Custodian",
    "Declaration Concerning the Timing of the Delivery",
    "Acknowledgment of Receipt of the Sealed Materials",
    "Certificate of Compliance with the Exchange Schedule",
    "Praecipe for a Transcript of the Status Conference",
    "Memorandum Regarding the Treatment of Archived Photographs",
    "Petition to Preserve the Original Specimens",
    "Stipulation for the Return of the Demonstrative Models",
    "Status Update Following the Equipment Inspection",
    "Filing of the Corrected Site Diagram",
    "Supplement to the Register of Recorded Statements",
    "Objections to the Form of the Lodged Judgment",
    "Written Election of the Preferred Hearing Dates",
  ];
  for (const title of titles) {
    const document_type = 'other-paper';
    const caption = { ...example(), title, document_type };
    const { html } = compos({ caption, body: fixtureBody, profile: current });
    assert.ok(html.includes('class="doc-title">' + title + '</td>'), title);
  }
});

test('the independently drafted titles and review examples compose with their own treatments', () => {
  const current = profile();
  const captions = { 'proposed-order': orderCaption, 'new-case-complaint': initialCaption,
    'supporting-declaration': declarationCaption };
  const proposedBody = 'Conference set.\n\nBY THE COURT: __________\n\nDistrict Court Judge';
  const cases = [
    ["new-case-complaint", "Verified Civil Complaint for Declaratory Relief"],
    ["new-case-complaint", "Complaint and Jury Demand"],
    ["amended-complaint", "Plaintiff's Second Amended Complaint"],
    ["answer", "First Amended Answer and Counterclaims"],
    ["motion", "Plaintiff's Motion to Extend the Discovery Deadline"],
    ["motion", "Joint Motion to Continue the Trial Setting Conference"],
    ["motion", "Defendant's Motion to Dismiss Under C.R.C.P. 12(b)(5)"],
    ["rule-12-or-56-motion", "Plaintiff's Motion for Partial Summary Judgment"],
    ["response", "Defendant's Response to Plaintiff's Motion to Compel"],
    ["response", "Plaintiff's Opposition to the Motion for a Protective Order"],
    ["response", "Plaintiff's Response to Defendant's Motion to Dismiss"],
    ["rule-12-or-56-response", "Defendant's Opposition to Plaintiff's Motion for Summary Judgment"],
    ["reply", "Plaintiff's Reply in Support of Motion to Extend Time"],
    ["reply", "Reply Brief in Support of the Motion to Compel Discovery"],
    ["reply", "Defendant's Reply in Support of Its Motion to Dismiss"],
    ["rule-12-or-56-reply", "Plaintiff's Reply in Support of Motion for Partial Summary Judgment"],
    ["discovery-request", "Plaintiff's First Set of Requests for Production to Defendant"],
    ["discovery-request", "Defendant's Second Set of Interrogatories to Plaintiff"],
    ["discovery-response", "Defendant's Responses and Objections to Plaintiff's First Requests for Production"],
    ["discovery-response", "Plaintiff's Answers to Defendant's Second Set of Interrogatories"],
    ["discovery-disclosure", "Defendant's Supplemental Rule 26(a)(1) Disclosures"],
    ["discovery-disclosure", "Plaintiff's Initial Disclosures Pursuant to C.R.C.P. 26(a)(1)"],
    ["other-paper", "Declaration of River Example in Support of the Motion to Compel"],
    ["other-paper", "Affidavit of Rowan Example Regarding Service"],
    ["case-management-submission", "Joint Proposed Case Management Order"],
    ["case-management-submission", "Proposed Case Management Plan"],
    ["proposed-order", "Proposed Order on Joint Motion to Continue Trial"],
    ["proposed-order", "[Proposed] Order Granting Motion for Leave to Amend"],
    ["other-paper", "Notice of Change of Address"],
    ["other-paper", "Joint Status Report"],
    ["rule-12-or-56-motion", "Motion to Dismiss Pursuant to C.R.C.P. 12(b)(1)"],
    ["rule-12-or-56-response", "Response to Motion to Dismiss Under Rule 12(b)(2)"],
    ["rule-12-or-56-reply", "Plaintiff's Reply in Support of Defendant's Motion to Dismiss Pursuant to Rule 12(b)(1)"],
    ["brief", "Memorandum in Support of the Motion for More Time"],
    ["supporting-declaration", "Affidavit of Lake Example in Support of the Response to the Motion to Compel"],
    ["proposed-order", "Proposed Order re Plaintiff's Motion to Compel"],
    ["proposed-order", "Proposed Order re Plaintiff's Motion"],
    ["proposed-order", "Proposed Order Regarding Continuance"],
    ["discovery-disclosure", "Plaintiff's C.R.C.P. 26(a)(1) Disclosures"],
    ["new-case-complaint", "Civil Complaint"],
  ];
  for (const [document_type, title] of cases) {
    const base = (captions[document_type] ?? example)();
    const caption = { ...base, title, document_type };
    const body = document_type === 'proposed-order' ? proposedBody : fixtureBody;
    const result = compos({ caption, body, profile: current });
    assert.equal(result.documentType, document_type, title);
    assert.ok(result.html.includes('class="doc-title">' + title + '</td>'), title);
    if (document_type !== 'other-paper') assert.equal(suggestTypes(current, title)[0], document_type, title);
  }
  for (const [index, type] of [[6, 'rule-12-or-56-motion'], [10, 'rule-12-or-56-response'], [14, 'rule-12-or-56-reply']]) {
    const [, title] = cases[index];
    assert.throws(() => compos({ caption: { ...example(), title, document_type: type }, body: fixtureBody, profile: current }),
      /set caption.type_confirmed to the exact title and document_type/);
  }
});

test('type guard considers every other match and covers omitted filing blocks', () => {
  const current = profile();
  const reply = { ...example(), title: 'Reply in Support of the Motion to Compel', document_type: 'rule-12-or-56-reply' };
  assert.throws(() => compos({ caption: reply, body: fixtureBody, profile: current }), /matching type\(s\) reply/);

  const general = { ...example(), title: 'Proposed Order', document_type: 'other-paper' };
  const order = { ...orderCaption(), title: general.title };
  const { title, document_type } = general;
  assert.throws(() => compos({ caption: general, body: fixtureBody, profile: current }), /matching type\(s\) proposed-order/);
  compos({ caption: { ...general, type_confirmed: { title, document_type } }, body: fixtureBody, profile: current });
  assert.throws(() => compos({
    caption: { ...order, type_confirmed: { title, document_type: order.document_type } },
    body: fixtureBody, profile: current,
  }), /must end with BY THE COURT/);

  const { service, ...withoutService } = example();
  const motion = current.document_types.motion;
  const { title_pattern, ...treatment } = motion;
  const allowed = { ...withoutService, document_type: 'fictional-exemption' };
  current.document_types[allowed.document_type] = { ...treatment, certificate: false, exact_title: allowed.title };
  assert.throws(() => compos({ caption: allowed, body: fixtureBody, profile: current }), /matching type\(s\) motion/);
  current.document_types['narrow-fictional-motion'] = { ...motion, exact_title: allowed.title };
  delete current.document_types['narrow-fictional-motion'].title_pattern;
  current.validation.limits['narrow-fictional-pages'] = { ...current.validation.limits['general-motion-pages'], maximum: 2 };
  current.document_types['narrow-fictional-motion'].length_presets = ['narrow-fictional-pages'];
  assert.throws(() => compos({ caption: allowed, body: fixtureBody, profile: current }), /motion, narrow-fictional-motion/);
});

test('other-paper is declared and requires both filer blocks and its page ceiling', () => {
  const current = validateProfile(profile());
  const caption = { ...example(), title: 'Notice of Entry of a Substituted Appearance', document_type: 'other-paper' };
  const { html } = compos({ caption, body: fixtureBody, profile: current });
  assert.ok(html.includes('class="doc-title">' + caption.title + '</td>'));
  assert.match(html, /class="closing"/);
  assert.match(html, /class="cert"/);
  for (const field of ['signer', 'service']) {
    const incomplete = { ...caption };
    delete incomplete[field];
    assert.throws(() => validateCaption(incomplete, current), new RegExp(field + ' (?:is required|must be supplied)'));
  }
  assert.equal(titleChecks(current, { ...caption, title: example().title })[0].status, 'advisory');
  assert.deepEqual(resolveLimits(current, caption), { choice: 'profile-preset', preset: 'general-motion-pages', pages: 15, words: null });
  assert.deepEqual(resolveLimits(current, caption, { preset: 'general-motion-pages' }), {
    choice: 'profile-preset', preset: 'general-motion-pages', pages: 15, words: null,
  });
  assert.throws(() => resolveLimits(current, caption, { preset: 'fixture-other-paper-words' }), /not listed/);
  assert.deepEqual(resolveLimits(current, caption, { pages: 12 }), {
    choice: 'explicit-maxima', preset: null, pages: 12, words: null,
  });
  assert.throws(() => resolveLimits(current, caption, { preset: 'rule-12-or-56-motion-pages' }), /not listed/);
  assert.throws(() => resolveLimits(current, caption, { noLimit: true }), /not allowed/);
  assert.throws(() => resolveLimits(current, caption, { pages: 16 }), /cannot exceed/);
  assert.deepEqual(resolveLimits(current, caption, { words: 100 }), {
    choice: 'explicit-maxima', preset: null, pages: 15, words: 100,
  });
});

test('word evidence reconciles a hyphenated line wrap without accepting different text', () => {
  assert.deepEqual(bodyEvidence([['This is court-', 'approved.']], 'This is court-approved.'),
    { wordsMatch: true, pdfBodyWords: 3 });
  assert.equal(bodyEvidence([['This is courtapproved.']], 'This is court-approved.').wordsMatch, false);
  assert.equal(bodyEvidence([['This is courtapproved.']], 'This is court approved.').wordsMatch, false);
});

test('headers are removed only when the bound repeated text ends on a line boundary', () => {
  const headers = [{ offset: 0, end: 35, text: 'ItemDetail' }];
  assert.deepEqual(removeRepeatedHeaders([['Item Detail', 'Old entry'], ['Item Detail', 'New entry']], headers),
    { pages: [['Item Detail', 'Old entry'], ['New entry']], aligned: true,
      repeated: [{ page: 1, offset: 0, lines: ['Item Detail'] }] });
  assert.equal(removeRepeatedHeaders([['Item Detail', 'Old entry'], ['Item Detail New entry']], headers).aligned, false);
  assert.deepEqual(removeRepeatedHeaders([['Item Detail', 'Old entry after the end of that table'], ['Item Detail']],
    headers).pages[1], ['Item Detail']);
});

test('the counsel block identifies the role or requires an explicit label', () => {
  for (const [role, label] of [
    ['Pro Se Defendant', 'Pro Se Defendant:'], ['Petitioner', 'Petitioner:'], ['Pro Se Respondent', 'Pro Se Respondent:'],
    ['Attorney for Rowan Example', 'Counsel for Rowan Example:'],
  ]) {
    const caption = example();
    caption.signer.role = role;
    const made = compos({ caption, body: body(), profile: profile() });
    assert.ok(made.html.includes('class="counsel-label">' + label + '</div>'));
  }
  const caption = example();
  for (const role of ['Pro Se Plaintiff/Defendant', 'Attorney', 'Counsel for Unknown Party', undefined]) {
    if (role === undefined) delete caption.signer.role;
    else caption.signer.role = role;
    assert.throws(() => compos({ caption, body: body(), profile: profile() }), /counsel_label is required/);
  }
  caption.caption_counsel = false;
  assert.doesNotMatch(compos({ caption, body: body(), profile: profile() }).html, /class="counsel-block"/);
  caption.caption_counsel = true;
  caption.signer.role = 'Pro Se Defendant';
  caption.counsel_label = 'Pro Se Plaintiff:';
  assert.throws(() => compos({ caption, body: body(), profile: profile() }), /conflicts with the signer role/);
  caption.signer.role = 'Authorized signer';
  caption.counsel_label = 'Authorized signer:';
  assert.match(compos({ caption, body: body(), profile: profile() }).html, /Authorized signer:/);
});

test('blocks, tables, and footnotes have explicit Markdown treatment', () => {
  const inputs = { caption: example(), profile: profile() };
  const markdown = '> A quotation.\n\n| Item | Value |\n| --- | --- |\n| A | 3 |';
  const made = compos({ ...inputs, body: markdown });
  assert.match(made.html, /<blockquote>\s*<p>A quotation/);
  assert.match(made.html, /<table>\s*<thead>/);
  for (const footnote of ['Text.[^1]', '[^note]: A real note']) {
    assert.throws(() => compos({ ...inputs, body: footnote }), /Put each note in a numbered paragraph/);
  }
  for (const html of ['<u>underlined</u>', 'x<sup>2</sup>', 'line<br>break']) {
    assert.throws(() => compos({ ...inputs, body: html }), /Markdown emphasis.*literal superscript.*Markdown line break/);
  }
});

test('legacy HTML refusal inventories constructs and identifies the declarative table equivalents', () => {
  const markdown = '<style>td { width: 25%; text-align: left; white-space: nowrap; padding: 2px; ' +
    'font-size: 10pt; vertical-align: top; }</style>\n\n' +
    '<!-- legacy comment -->\n\n<table><tr><td style="padding: 0">Entry</td></tr></table>\n\nText<br>here.';
  assert.throws(() => parse(markdown), error => {
    for (const phrase of ['leading <style> block', 'HTML comment', '<table>', '<tr>', '<td>', '<br>',
      'inline style attribute', 'Markdown pipe tables', 'column_widths_percent', 'column_alignment',
      'header_alignment', 'nowrap_columns', 'cell_padding_pt', 'font_size_pt', 'vertical_alignment']) {
      assert.ok(error.message.includes(phrase), phrase);
    }
    return true;
  });
  const legacy = example();
  delete legacy.document_type;
  assert.throws(() => compos({ caption: legacy, body: markdown, profile: profile() }), /document_type is required/);
});

test('table presentation applies bounded defaults and top-level table overrides', () => {
  const table = '| Entry | Count |\n| --- | ---: |\n| Sample | 5 |';
  const markdown = table + '\n\n' + table;
  const caption = { ...example(), table_presentation: {
    smaller_font_authority: { source: 'Fictional court order', minimum_font_size_pt: 10 },
    default: { column_widths_percent: [60, 40], column_alignment: ['left', 'center'],
      header_alignment: ['left', null], nowrap_columns: [2], cell_padding_pt: 2, vertical_alignment: 'top' },
    tables: { 2: { body_cell_padding_pt: [1, 2, 3, 4], font_size_pt: 10, nowrap_columns: [] } },
  } };
  const result = compos({ caption, body: markdown, profile: profile() });
  assert.match(result.html, /data-table="1"\] col:nth-child\(1\) \{ width: 60%;/);
  assert.match(result.html, /data-table="1"\] th:nth-child\(1\) \{ text-align: left !important;/);
  assert.match(result.html, /data-table="1"\] td:nth-child\(2\) \{ white-space: nowrap;/);
  assert.match(result.html, /data-table="1"\] td \{ vertical-align: top;/);
  assert.doesNotMatch(result.html, /data-table="2"\].*white-space/);
  assert.match(result.html, /data-table="2"\] td \{ padding: 1pt 2pt 3pt 4pt;/);
  assert.match(result.html, /data-table="2"\] \{ font-size: 10pt;/);
  for (const [change, expected] of [
    [{ font_size_pt: 7 }, /8 through 16/],
    [{ cell_padding_pt: [0, 0, 13, 0] }, /0 through 12/],
    [{ column_alignment: ['left; color: red'] }, /one of left, center, right/],
    [{ column_widths_percent: [60, 50] }, /total at most 100/],
    [{ header_alignment: ['left', 'right', 'center'] }, /fewer columns/],
    [{ nowrap_columns: [3] }, /distinct existing columns/],
    [{ style: 'display:none' }, /not a recognized field/],
  ]) {
    const invalid = { ...caption, table_presentation: { default: change } };
    assert.throws(() => compos({ caption: invalid, body: markdown, profile: profile() }), expected);
  }
  const nonexistent = { ...caption, table_presentation: { tables: { 3: {} } } };
  assert.throws(() => compos({ caption: nonexistent, body: markdown, profile: profile() }), /does not name a Markdown pipe table/);
  assert.throws(() => compos({ caption, body: fixtureBody, profile: profile() }), /needs at least one/);
});

pdfTest('compare reports changed tokens, page geometry and RGB pixel differences without writing files', async t => {
  const reference = await fixture(t, { bodyText: 'I request different relief.' });
  const rebuilt = await fixture(t, { pages: 3, secondSize: [595.28, 841.89] });
  const before = [reference, rebuilt].map(path => digest(readFileSync(path)));
  const args = ['compare', '--reference', reference, '--pdf', rebuilt];
  const compared = run(args);
  assert.equal(compared.status, 0, compared.stderr);
  const result = resultOf(compared);
  assert.equal(result.label, 'Not for filing');
  assert.match(result.note, /signature or filled date on the reference is expected to differ/);
  assert.deepEqual([result.reference.sha256, result.rebuilt.sha256], before);
  assert.deepEqual([reference, rebuilt].map(path => digest(readFileSync(path))), before);
  assert.equal(result.samePageCount, false);
  assert.equal(result.samePageSizes, false);
  assert.deepEqual(result.reference.pageSizesPt[0], [612, 792]);
  assert.equal(result.text.equal, false);
  assert.ok(result.text.changes.some(change => change.referenceTokens.includes('different')));
  assert.equal(result.raster.perPage.length, 3);
  assert.ok(result.raster.perPage[0].differencePercent > 0);
  assert.equal(result.raster.perPage[2].differencePercent, 100);
  assert.match(run(['compare', '--reference', reference, '--pdf', 'relative.pdf']).stderr, /must be an absolute path/);
  const same = resultOf(run(['compare', '--reference', reference, '--pdf', reference]));
  assert.equal(same.samePageCount, true);
  assert.equal(same.samePageSizes, true);
  assert.equal(same.text.equal, true);
  assert.deepEqual(same.text.changes, []);
  assert.deepEqual(same.raster.perPage.map(page => page.differencePercent), [0, 0]);
});

function renderFiling(scratch, name, caption, markdown, remake, flags = []) {
  const abs = extension => join(scratch, name + extension);
  const [cap, input, html] = ['.json', '.md', '.html'].map(abs);
  writeFileSync(cap, JSON.stringify(caption));
  writeFileSync(input, markdown);
  const base = ['--caption', cap, '--body', input, '--profile', 'colorado-district'];
  const composed = run(['compose', ...base, '--out', html, ...flags]);
  assert.equal(composed.status, 0, composed.stderr);
  const receipt = resultOf(composed);
  const pdf = join(scratch, (receipt.pdfFilenamePrefix ?? '') + name + '.pdf');
  if (remake) writeFileSync(html, remake(readFileSync(html, 'utf8')));
  const rendered = spawnSync(process.execPath, [process.env.COURT_FILING_RENDER, 'pdf', '--input', html,
    '--output', pdf, ...receipt.pdfArgs], { encoding: 'utf8' });
  assert.equal(rendered.status, 0, rendered.stderr);
  const validateArgs = ['validate', ...base, '--pdf', pdf, '--body-sha256', receipt.bodySha256];
  return { pdf, cap, receipt, validateArgs };
}

pdfTest('Colorado general motion and fallback enforce the page cap on short text', async t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const markdown = paragraphs => Array(paragraphs).fill('The fictional record states this fact.').join('\n\n');
  const check = (built, expected, flags = []) => {
    const response = run([...built.validateArgs, ...flags]);
    const result = resultOf(response);
    assert.equal(result.pages > 15, expected === 'fail');
    assert.ok(result.bodyWords < 4000 && result.pdfBodyWords < 4000);
    assert.equal(response.status, expected === 'pass' ? 0 : 1);
    assert.equal(checksByName(result)['Within page limit (15)'], expected);
    assert.deepEqual(result.checks.filter(check => check.status === 'fail').map(check => check.label),
      expected === 'pass' ? [] : ['Within page limit (15)']);
    return result;
  };
  const motion = renderFiling(scratch, 'long-motion', example(), markdown(325));
  await t.test('over 15 pages fails', () => check(motion, 'fail'));
  await t.test('the shortened motion passes', () => {
    check(renderFiling(scratch, 'shortened-motion', example(), markdown(265)), 'pass');
  });
  await t.test('a word-only order retains the page cap', () => {
    const source = 'Fictional Order, 2099-04-05, docket entry 7 at page 2';
    const ordered = check(motion, 'fail', ['--order-max-words', '4000', '--order-source', source]);
    assert.equal(checksByName(ordered)['Within word limit (4000, set by order)'], 'pass');
    assert.deepEqual(ordered.limits.order, { pages: null, words: 4000, source, aboveProfile: {} });
  });
  await t.test('fallback over 15 pages fails', () => {
    const fallback = { ...example(), title: 'Notice of Filing', document_type: 'other-paper' };
    check(renderFiling(scratch, 'long-notice', fallback, markdown(325)), 'fail');
  });
});

pdfTest('validation reports unsuccessful Poppler inspections and retries a signal once', async t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  if (process.platform === 'win32') return t.skip('The stand-in uses a POSIX shell and signals.');
  const scratch = temp(t);
  const built = renderFiling(scratch, 'inspection', example(), fixtureBody);
  const normal = run(built.validateArgs);
  assert.equal(normal.status, 0, normal.stderr);
  const utility = join(scratch, 'pdffonts');
  const calls = utility + '.calls';
  const warning = 'Synthetic warning: ' + 'x'.repeat(240);
  writeFileSync(utility, `#!/bin/sh
if [ "$1" = '-v' ]; then
  printf 'pdffonts version fixture\\n' >&2
  exit 0
fi
printf 'call\\n' >> "$0.calls"
case "$COURT_FILING_FIXTURE_MODE" in
  status) cat >/dev/null; exit 7 ;;
  stderr) printf '%s' '${warning}' >&2 ;;
  recover) if [ "$(wc -l < "$0.calls")" -eq 1 ]; then cat >/dev/null; kill -TERM "$$"; fi ;;
  signal) cat >/dev/null; kill -TERM "$$" ;;
esac
PATH="$COURT_FILING_FIXTURE_PATH" exec pdffonts "$@"
`, { mode: 0o700 });
  const inspectFonts = mode => {
    writeFileSync(calls, '');
    const response = run(built.validateArgs, { env: {
      ...process.env, PATH: scratch + delimiter + process.env.PATH,
      COURT_FILING_FIXTURE_PATH: process.env.PATH, COURT_FILING_FIXTURE_MODE: mode,
    } });
    const result = resultOf(response);
    return { response, result, calls: readFileSync(calls, 'utf8').trim().split('\n').length };
  };
  for (const [mode, status, signal, stderr, attempts] of [
    ['status', 7, null, '', 1],
    ['stderr', 0, null, warning.slice(0, 200), 1],
    ['signal', null, 'SIGTERM', '', 2],
  ]) {
    await t.test(mode, () => {
      const { response, result, calls } = inspectFonts(mode);
      assert.equal(calls, attempts);
      assert.equal(response.status, 1);
      assert.equal(response.stdout, '');
      assert.equal(result.ok, false);
      const fontCheck = result.checks.find(check => check.label === 'Embedded profile fonts');
      assert.equal(fontCheck.status, 'not_checked');
      assert.match(fontCheck.detail, /pdffonts/);
      if (status !== null) assert.match(fontCheck.detail, new RegExp('exit status ' + status));
      if (signal) assert.ok(fontCheck.detail.includes(signal));
      if (stderr) assert.ok(fontCheck.detail.includes(stderr) && !fontCheck.detail.includes(warning));
      assert.deepEqual(result.unavailable, [{ program: 'pdffonts', check: 'fonts', errorCode: null, status, signal, stderr }]);
      assert.ok(!response.stderr.includes(scratch));
    });
  }
  await t.test('the retry can provide usable evidence', () => {
    const { response, result, calls } = inspectFonts('recover');
    assert.equal(calls, 2);
    assert.equal(response.status, 0, response.stderr);
    assert.equal(checksByName(result)['Embedded profile fonts'], 'pass');
    assert.deepEqual(result.unavailable, []);
  });
});

pdfTest('a mixed-case title prints in capitals in the caption and as typed in the certificate', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const caption = { ...example(), title: 'Motion for a Straße Conference' };
  const built = renderFiling(temp(t), 'title-casing', caption, fixtureBody);
  const validated = run(built.validateArgs);
  assert.equal(validated.status, 0, validated.stderr);
  const result = resultOf(validated);
  const checks = checksByName(result);
  assert.equal(checks['Document title in caption'], 'pass');
  assert.equal(checks['Certificate of service present'], 'pass');
  const positioned = spawnSync('pdftotext', ['-tsv', built.pdf, '-']);
  assert.equal(positioned.status, 0, positioned.stderr.toString());
  const [first] = readTextLines(positioned.stdout, result.pages);
  assert.ok(first.lines.some(line => line.words.map(word => word.text).join(' ') === 'MOTION FOR A STRASSE CONFERENCE'));
  const printed = spawnSync('pdftotext', ['-raw', built.pdf, '-'], { encoding: 'utf8' });
  assert.equal(printed.status, 0, printed.stderr);
  assert.match(printed.stdout, /foregoing\s+Motion for a Straße Conference was served by email/);
});

pdfTest('validation refuses a PDF with a mixed-case caption title', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const built = renderFiling(temp(t), 'mixed-case-caption', example(), fixtureBody, html =>
    html.replace(/(tr\.caption-title-row td\.doc-title \{[^}]*?)text-transform: uppercase;/, '$1'));
  const validated = run(built.validateArgs);
  assert.equal(checksByName(resultOf(validated))['Document title in caption'], 'fail');
  assert.equal(validated.status, 1, validated.stdout);
});

pdfTest('a heading at a page break moves to the next page with its paragraph', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const caption = { ...example(), title: example().title.toUpperCase() };
  const markdown = [...Array(11).fill('A short fictional paragraph fills the page.'),
    '## Test heading', 'Its paragraph belongs here.'].join('\n\n');
  const split = renderFiling(scratch, 'split-heading', caption, markdown, html => html.replace('break-after: avoid;', ''));
  const kept = renderFiling(scratch, 'kept-heading', caption, markdown);
  const pagesOf = filing => {
    const printed = spawnSync('pdftotext', ['-raw', filing.pdf, '-'], { encoding: 'utf8' });
    assert.equal(printed.status, 0, printed.stderr);
    return printed.stdout.split('\f').map(page => page.replace(/^Page \d+ of \d+$/m, '').trim());
  };
  const [splitFirst, splitSecond] = pagesOf(split);
  assert.match(splitFirst, /\nTest heading$/);
  assert.match(splitSecond, /^Its paragraph belongs here\./);
  const [keptFirst, keptSecond] = pagesOf(kept);
  assert.doesNotMatch(keptFirst, /Test heading/);
  assert.match(keptSecond, /^Test heading\s+Its paragraph belongs here\./);

  const validateFiling = filing => {
    const validated = run(filing.validateArgs);
    assert.equal(validated.status, 0, validated.stderr);
    return resultOf(validated);
  };
  const checked = validateFiling(kept);
  const checks = checksByName(checked);
  for (const label of ['Page size', 'Body paragraph spacing', 'Visible margin geometry', 'Visible filing ink']) {
    assert.equal(checks[label], 'pass', label);
  }
  const spacing = result => result.checks.find(check => check.label === 'Table, list and heading double spacing').counts;
  assert.deepEqual(spacing(checked), spacing(validateFiling(split)));
  assert.equal(spacing(checked).heading, 1);
});

pdfTest('only exceeded explicit targets receive advisories when the other alternative passes', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const caption = { ...example(), title: 'Reply in Support of the Motion to Compel', document_type: 'reply' };
  const markdown = Array(30).fill('A short fictional paragraph fills the page.').join('\n\n');
  const built = renderFiling(scratch, 'reply-with-targets', caption, markdown);
  const pairedPath = join(scratch, 'paired.json');
  writeFileSync(pairedPath, JSON.stringify(pairedProfile('reply')));
  const check = (flags, expectedStatus = 0, selected = pairedPath) => {
    const response = run([...built.validateArgs.map(arg => arg === 'colorado-district' ? selected : arg), ...flags]);
    assert.equal(response.status, expectedStatus, response.stderr);
    return resultOf(response);
  };
  const targetChecks = list => list.filter(({ label }) => label.startsWith('Target exceeded ('));
  for (const [unit, alternative, count] of [['pages', 'words', 'PDF pages'], ['words', 'pages', 'body words']]) {
    const result = check(['--max-' + unit, '1']);
    assert.deepEqual(result.limits.satisfiedBy, [alternative]);
    const advisories = targetChecks(result.advisories);
    assert.deepEqual(targetChecks(result.checks), advisories);
    assert.equal(advisories.length, 1);
    const [advisory] = advisories;
    assert.equal(advisory.label, 'Target exceeded (' + unit + ')');
    assert.equal(advisory.status, 'advisory');
    const number = unit === 'pages' ? result.pages : Math.max(result.bodyWords, result.pdfBodyWords);
    assert.ok(advisory.detail.includes(number + ' ' + count), advisory.detail);
    assert.match(advisory.detail, /target of 1\b/);
    assert.ok(advisory.detail.includes('--order-max-' + unit), advisory.detail);
    assert.match(advisory.detail, /--order-source/);
    assert.match(advisory.detail, /enforced on its own unit/);

    const custom = pairedProfile('reply');
    custom.validation.limits[unit === 'pages' ? 'general-reply-pages' : 'fixture-reply-words'].maximum = 1;
    const customPath = join(scratch, unit + '-profile.json');
    writeFileSync(customPath, JSON.stringify(custom));
    const otherTarget = alternative === 'pages' ? '5' : '250';
    const fromProfile = check(['--max-' + alternative, otherTarget], 0, customPath);
    assert.deepEqual(fromProfile.limits.satisfiedBy, [alternative]);
    assert.deepEqual(targetChecks(fromProfile.advisories), []);
    assert.deepEqual(targetChecks(fromProfile.checks), []);

    const order = check(['--order-max-' + unit, '1', '--order-source', 'Fictional order'], 1);
    assert.deepEqual(targetChecks(order.advisories), []);
    assert.deepEqual(targetChecks(order.checks), []);
  }
  const defaults = check([]);
  for (const result of [
    check(['--max-pages', String(defaults.pages), '--max-words', String(defaults.bodyWords)]),
    check(['--max-pages', '1', '--max-words', '1'], 1),
  ]) {
    assert.deepEqual(targetChecks(result.advisories), []);
    assert.deepEqual(targetChecks(result.checks), []);
  }
});

pdfTest('replay PDF filename, metadata and result cannot be used for production', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const replay = renderFiling(scratch, 'comparison', example(), fixtureBody, undefined, ['--replay']);
  assert.equal(replay.receipt.pdfFilenamePrefix, 'Not for filing - ');
  const metadata = spawnSync('pdfinfo', [replay.pdf], { encoding: 'utf8' });
  assert.equal(metadata.status, 0, metadata.stderr);
  assert.match(metadata.stdout, /^Title:.*Not for filing$/m);
  const checked = run([...replay.validateArgs, '--replay']);
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(resultOf(checked).result, 'REPLAY CHECKS PASSED - NOT FOR FILING');

  const renamed = join(scratch, 'ordinary.pdf');
  cpSync(replay.pdf, renamed);
  const renamedArgs = replay.validateArgs.map(arg => arg === replay.pdf ? renamed : arg);
  const production = run(renamedArgs);
  assert.equal(production.status, 1, production.stdout);
  assert.equal(checksByName(resultOf(production))['PDF replay metadata'], 'fail');
  const badReplayName = run([...renamedArgs, '--replay']);
  assert.equal(badReplayName.status, 1, badReplayName.stdout);
  assert.match(badReplayName.stderr, /requires a PDF filename starting with "Not for filing - "/);

  const normal = renderFiling(scratch, 'normal', example(), fixtureBody);
  const falseLabel = join(scratch, 'Not for filing - normal.pdf');
  cpSync(normal.pdf, falseLabel);
  const unmarked = run([...normal.validateArgs.map(arg => arg === normal.pdf ? falseLabel : arg), '--replay']);
  assert.equal(unmarked.status, 1, unmarked.stdout);
  assert.equal(checksByName(resultOf(unmarked))['PDF replay metadata'], 'fail');
  const caption = example();
  caption.type_confirmed = { title: caption.title, document_type: caption.document_type };
  assert.throws(() => compos({ caption, body: fixtureBody, profile: profile(), replay: true }),
    /Replay requires a caption without type_confirmed/);
  writeFileSync(replay.cap, JSON.stringify(caption));
  const confirmed = run([...replay.validateArgs, '--replay']);
  assert.equal(confirmed.status, 1, confirmed.stdout);
  assert.match(confirmed.stderr, /Replay requires a caption without type_confirmed/);
});

pdfTest('explicit maxima preserve custom alternatives and shipped page-only caps', async t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const markdown = Array.from({ length: 230 }, (_, i) => 'record '.repeat(i < 160 ? 9 : 8).trim()).join('\n\n');
  const motion = renderFiling(scratch, 'motion', example(), markdown);
  const profilePath = join(scratch, 'paired-motion.json');
  writeFileSync(profilePath, JSON.stringify(pairedProfile('motion')));
  const pairedArgs = motion.validateArgs.map(arg => arg === 'colorado-district' ? profilePath : arg);
  const successful = run([...pairedArgs, '--max-pages', '10', '--max-words', '3000']);
  assert.equal(successful.status, 0, successful.stderr);
  const wordAlternative = resultOf(successful);
  assert.equal(wordAlternative.pages, 12);
  assert.equal(wordAlternative.bodyWords, 2000);
  assert.deepEqual(wordAlternative.limits.satisfiedBy, ['words']);
  const pageAlternative = run([...pairedArgs, '--max-words', '100']);
  assert.equal(pageAlternative.status, 0, pageAlternative.stderr);
  assert.deepEqual(resultOf(pageAlternative).limits.satisfiedBy, ['pages']);
  const overflow = run([...pairedArgs, '--max-pages', '10', '--max-words', '100']);
  assert.equal(overflow.status, 1, overflow.stdout);
  assert.deepEqual(resultOf(overflow).limits.satisfiedBy, []);

  const specialCaption = { ...example(), title: 'Motion for Partial Summary Judgment', document_type: 'rule-12-or-56-motion' };
  const rule56 = renderFiling(scratch, 'rule-56', specialCaption, markdown);
  for (const filing of [motion, rule56]) {
    const raised = run([...filing.validateArgs, '--max-pages', '40']);
    assert.equal(raised.status, 1, raised.stdout);
    assert.match(raised.stderr, /cannot exceed its document type’s profile ceiling/);
  }
  const added = run([...rule56.validateArgs, '--max-words', '100']);
  assert.equal(added.status, 1, added.stdout);
  assert.equal(checksByName(resultOf(added))['Within word limit (100)'], 'fail');
  const overPages = validateFile(await fixture(t, { caption: specialCaption, pages: 26 }),
    { caption: rule56.cap, flags: ['--max-words', '100'] });
  assert.equal(overPages.status, 1);
  assert.equal(overPages.result.limits.pages, 25);
  assert.equal(checksByName(overPages.result)['Within page limit (25)'], 'fail');
  assert.equal(checksByName(overPages.result)['Within word limit (100)'], 'pass');
});

test('order limits retain an omitted page ceiling and replace the pair in custom alternatives', () => {
  const current = profile();
  const source = 'Fictional Order, 2099-04-05, docket entry 7 at page 2';
  const limit = (type, flags, selected = current) => resolveLimits(selected,
    { ...example(), document_type: type }, { orderSource: source, ...flags });
  assert.equal(limit('motion', { orderPages: 10 }).words, null);
  assert.equal(limit('rule-12-or-56-motion', { orderWords: 100 }).pages, 25);
  assert.equal(limit('rule-12-or-56-response', { orderWords: 100 }).pages, 25);
  assert.equal(limit('rule-12-or-56-reply', { orderWords: 100 }).pages, 15);
  assert.equal(limit('rule-12-or-56-motion', { orderPages: 30 }).pages, 30);
  assert.equal(limit('reply', { orderWords: 100 }).pages, 10);
  assert.equal(limit('other-paper', { orderWords: 100 }).pages, 15);
  assert.equal(limit('other-paper', { orderPages: 16 }).words, null);
  assert.equal(limit('reply', { orderWords: 100 }, pairedProfile('reply')).pages, null);
  const unverified = profile();
  unverified.validation.limits['rule-12-or-56-motion-pages'].verification = 'verify';
  assert.throws(() => resolveLimits(unverified, { ...example(), document_type: 'rule-12-or-56-motion' }, { orderSource: source, orderWords: 100 }),
    /still requires verification/);
  assert.equal(resolveLimits(unverified, { ...example(), document_type: 'rule-12-or-56-motion' }, { orderSource: source, orderPages: 20 }).pages, 20);
  assert.equal(limit('proposed-order', { orderPages: 10 }).choice, 'order-maxima');
  const both = pairedProfile('motion', 'all');
  const resolved = limit('motion', { orderPages: 10 }, both);
  assert.equal(resolved.words, 4000);
  assert.equal(resolved.order.words, null);
  assert.equal(limit('motion', { orderWords: 100 }).pages, 15);
  both.validation.limits['fixture-motion-words'].verification = 'verify';
  assert.throws(() => limit('motion', { orderPages: 10 }, both), /requires both ceilings/);
  assert.equal(limit('motion', { orderPages: 10, orderWords: 100 }, both).words, 100);
});

pdfTest('case-specific order ceilings are mandatory and preserve their source', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const build = (name, paragraphs) => renderFiling(scratch, name, example(),
    Array.from({ length: paragraphs }, () => 'The fictional record states this fact.').join('\n\n'));
  const over = build('fourteen-pages', 265);
  const exact = build('ten-pages', 175);
  const raised = build('twenty-eight-pages', 555);
  const source = 'Fictional Order, 2099-04-05, docket entry 7 at page 2';
  const orderSource = ['--order-source', source];
  const check = (filing, flags, status) => {
    const response = run([...filing.validateArgs, ...flags]);
    assert.equal(response.status, status, response.stdout || response.stderr);
    return resultOf(response);
  };
  const personal = check(over, ['--max-pages', '10'], 1);
  assert.equal(checksByName(personal)['Within page limit (10)'], 'fail');
  const lower = check(over, ['--order-max-pages', '10', ...orderSource], 1);
  assert.equal(lower.pages, 14);
  assert.ok(lower.bodyWords < 4000);
  assert.equal(lower.ok, false);
  assert.equal(lower.result, 'VALIDATION FAILED');
  assert.deepEqual(lower.limits, { choice: 'order-maxima', pages: 10, words: null, preset: null,
    order: { source, pages: 10, words: null, aboveProfile: {} } });
  assert.equal(checksByName(lower)['Within page limit (10, set by order)'], 'fail');
  assert.equal(checksByName(lower)['Within a profile length alternative'], undefined);

  const atCeiling = check(exact, ['--order-max-pages', '10', ...orderSource], 0);
  assert.equal(atCeiling.pages, 10);
  assert.equal(atCeiling.result, 'ALL CHECKS PASSED');
  assert.equal(checksByName(atCeiling)['Within page limit (10, set by order)'], 'pass');
  const above = check(raised, ['--order-max-pages', '30', ...orderSource], 0);
  assert.equal(above.pages, 28);
  assert.equal(above.result, 'ALL CHECKS PASSED');
  const advisory = above.advisories.find(entry => entry.label === 'Order ceiling above profile (pages)');
  assert.ok(advisory?.detail.includes(source));
  assert.match(advisory.detail, /30.*15.*preview/);

  for (const [pages, words, pageResult, wordResult] of [
    ['10', '4000', 'fail', 'pass'],
    ['14', '100', 'pass', 'fail'],
    ['14', '4000', 'pass', 'pass'],
  ]) {
    const expectedStatus = pageResult === 'pass' && wordResult === 'pass' ? 0 : 1;
    const result = check(over, ['--order-max-pages', pages, '--order-max-words', words, ...orderSource], expectedStatus);
    assert.equal(checksByName(result)['Within page limit (' + pages + ', set by order)'], pageResult);
    assert.equal(checksByName(result)['Within word limit (' + words + ', set by order)'], wordResult);
  }
  const wordOnly = check(exact, ['--order-max-words', '100', ...orderSource], 1);
  assert.equal(wordOnly.limits.pages, 15);
  assert.equal(checksByName(wordOnly)['Within page limit (15)'], 'pass');
  assert.equal(checksByName(wordOnly)['Within word limit (100, set by order)'], 'fail');

  for (const [flags, error] of [
    [['--order-max-pages', '10'], /--order-source must be non-blank single-line text/],
    [['--order-max-words', '100'], /--order-source must be non-blank single-line text/],
    [['--order-max-pages', '10', '--order-source', ' '], /--order-source must be non-blank single-line text/],
    [['--order-max-words', '0', ...orderSource], /--order-max-words must be a positive integer/],
    [orderSource, /--order-source requires --order-max-pages or --order-max-words/],
    [['--order-max-pages', '10', ...orderSource, '--max-words', '100'], /Order flags cannot be combined/],
  ]) {
    const rejected = run([...over.validateArgs, ...flags]);
    assert.equal(rejected.status, 1, rejected.stdout);
    assert.equal(rejected.stdout, '');
    assert.match(rejected.stderr, error);
  }
});

pdfTest('an oversized general reply with few words fails the page cap and cannot use the longer Rule 12 or 56 type', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const caption = { ...example(), title: 'Reply in Support of the Motion to Compel', document_type: 'reply' };
  const markdown = Array(265).fill('The fictional record states this fact.').join('\n\n');
  const built = renderFiling(temp(t), 'reply', caption, markdown);
  const result = run(built.validateArgs);
  assert.equal(result.status, 1, result.stdout);
  const reply = resultOf(result);
  assert.ok(reply.pages > 10);
  assert.ok(reply.bodyWords < 2500 && reply.pdfBodyWords < 2500);
  assert.equal(checksByName(reply)['Within page limit (10)'], 'fail');
  writeFileSync(built.cap, JSON.stringify({ ...caption, document_type: 'rule-12-or-56-reply' }));
  const guarded = run(built.validateArgs);
  assert.equal(guarded.status, 1, guarded.stdout);
  assert.equal(checksByName(resultOf(guarded))['Document type confirmation'], 'fail');
});

pdfTest('default Markdown tables center unaligned headings, wrap cells and repeat headers across page breaks', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const caption = { ...example(), title: 'MOTION FOR A FICTIONAL CONFERENCE', certificate_year: 2026 };
  const markdown = ['## Fictional exhibit inventory', '', '| Entry | Description | Code |', '| --- | --- | --- |',
    ...Array.from({ length: 64 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return '| Row' + n + ' | A fictional item with a long descriptive label for checking ordinary wrapping across narrow columns. | S' + n + ' |';
    }), '', 'The inventory ends here.'].join('\n');
  const { pdf, validateArgs } = renderFiling(temp(t), 'default-table', caption, markdown);
  const checked = run(validateArgs);
  assert.equal(checked.status, 0, checked.stderr);
  const tsv = spawnSync('pdftotext', ['-tsv', pdf, '-']);
  assert.equal(tsv.status, 0);
  const pages = readTextLines(tsv.stdout, 5);
  assert.ok(pages);
  // Recorded from a fresh old-renderer build of this same fixture.
  const legacyStarts = [1, 12, 33, 54];
  const legacyRows = [11, 21, 21, 11, 0];
  const legacyHeaderX = [76.58, 280.34, 511.08];
  for (const [index, { lines }] of pages.entries()) {
    const words = lines.flatMap(line => line.words);
    const rows = words.filter(({ text }) => /^Row\d{2}$/u.test(text));
    assert.equal(rows.length, legacyRows[index]);
    if (!rows.length) continue;
    assert.equal(Number(rows[0].text.slice(3)), legacyStarts[index]);
    const headings = ['Entry', 'Description', 'Code'].map(name => words.find(word => word.text === name));
    for (const [i, heading] of headings.entries()) assert.ok(Math.abs(heading.bounds.x - legacyHeaderX[i]) < 1);
    const wrapped = words.filter(({ text }) => text === 'columns.');
    assert.equal(wrapped.length, rows.length);
    assert.ok(Math.abs(wrapped[0].bounds.x - 181.90) < 1);
    assert.ok(wrapped[0].bounds.y > rows[0].bounds.y);
  }
});

pdfTest('styled table fonts validate only with the declared presentation', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const caption = { ...example(), table_presentation: {
    smaller_font_authority: { source: 'Fictional order on table type size', minimum_font_size_pt: 10 },
    tables: { 1: {
      column_widths_percent: [20, 80], header_alignment: 'left', column_alignment: ['right', 'left'],
      cell_padding_pt: 2, nowrap_columns: [1], font_size_pt: 10,
    } },
  } };
  const markdown = fixtureBody + '\n\n| Sample | Description |\n| --- | --- |\n| A & B | A fictional appendix row. |';
  const scratch = temp(t);
  const built = renderFiling(scratch, 'styled', caption, markdown);
  const validated = run(built.validateArgs);
  assert.equal(validated.status, 0, validated.stderr);
  const wrong = renderFiling(scratch, 'wrong-size', caption, markdown, html =>
    html.replace(/(data-table="1"\] \{ font-size:) 10pt/, '$1 11pt'));
  const refused = run(wrong.validateArgs);
  assert.equal(refused.status, 1);
  assert.equal(checksByName(resultOf(refused))['Profile type size'], 'fail');
});

pdfTest('a page-only filing cannot build or validate an undersized table without recorded authority', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const caption = { ...example(), title: 'Motion for Summary Judgment', document_type: 'rule-12-or-56-motion' };
  const markdown = '| Data | Sample |\n| --- | --- |\n| Example | Fictional row |';
  const restricted = { default: { font_size_pt: 8 } };
  assert.throws(() => compos({ caption: { ...caption, table_presentation: restricted }, body: markdown, profile: profile() }),
    /requires smaller_font_authority/);
  const insufficient = { ...restricted, smaller_font_authority: { source: 'Fictional table order', minimum_font_size_pt: 10 } };
  assert.throws(() => compos({ caption: { ...caption, table_presentation: insufficient }, body: markdown, profile: profile() }),
    /requires smaller_font_authority/);

  const authorized = { ...restricted, smaller_font_authority: { source: 'Fictional table order', minimum_font_size_pt: 8 } };
  const built = renderFiling(temp(t), 'small-table', { ...caption, table_presentation: authorized }, markdown);
  const accepted = run(built.validateArgs);
  assert.equal(accepted.status, 0, accepted.stderr);
  writeFileSync(built.cap, JSON.stringify({ ...caption, table_presentation: restricted }));
  const refused = run(built.validateArgs);
  assert.equal(refused.status, 1, refused.stdout);
  assert.match(refused.stderr, /requires smaller_font_authority/);
  writeFileSync(built.cap, JSON.stringify(caption));
  const undeclared = run(built.validateArgs);
  assert.equal(undeclared.status, 1, undeclared.stdout);
  assert.equal(checksByName(resultOf(undeclared))['Profile type size'], 'fail');
});

const skillPath = join(tool, '..', '..', 'skills', 'Produce Court Filing', 'SKILL.md');

test('unprofiled production discloses unavailable mechanics and continues to preview and approval', () => {
  const skill = readFileSync(skillPath, 'utf8');
  const [, unprofiled] = /^4\. \*\*Build and check([\s\S]+?)^5\. /m.exec(skill);
  assert.match(unprofiled, /record Court Filing validation as unavailable and disclose that at preview/);
  assert.match(unprofiled, /Continue to step 5 and the approval decision in step 6 once the applicable forum checks below pass/);
  assert.match(unprofiled, /Hold if a required compatible proof or applicable forum check cannot be completed/);
  assert.match(skill, /^5\. \*\*Review the exact artifact with the litigant/m);
  assert.match(skill, /^6\. \*\*Record release and filing separately/m);
});

pdfTest('both quick starts reconcile the fictional draft before rendering and validating', t => {
  const render = process.env.COURT_FILING_RENDER;
  if (!render) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const draft = example();
  assert.equal(draft.division, 'W');
  assert.ok(draft.service.recipients[0].emails.includes('former-service@example.invalid'));
  assert.ok(!draft.service.recipients[0].emails.includes('service@example.invalid'));
  for (const instruction of [join(tool, 'TOOL.md'), skillPath]) {
    const cwd = temp(t);
    const markdown = readFileSync(instruction, 'utf8');
    const fenceStart = markdown.indexOf('\x60\x60\x60sh\n');
    assert.notEqual(fenceStart, -1);
    const snippet = markdown.slice(fenceStart + 6).split('\n\x60\x60\x60')[0]
      .replace('court="/absolute/path/to/legal/tools/Court Filing"', 'court="$1"')
      .replace('render="/absolute/path/to/wiser/tools/render/scripts/render.js"', 'render="$2"');
    const checked = spawnSync('sh', ['-s', '--', tool, render], {
      cwd, input: snippet, encoding: 'utf8', env: { ...process.env, TMPDIR: cwd },
    });
    assert.equal(checked.status, 0, checked.stderr);
    const receipt = JSON.parse(checked.stdout.trim().split('\n').at(-1));
    assert.equal(receipt.result, 'ALL CHECKS PASSED');
    const pdf = join(cwd, 'Fictional Motion - review.pdf');
    const printed = spawnSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' });
    assert.equal(printed.status, 0, printed.stderr);
    assert.match(printed.stdout, /Division: X/);
    assert.match(printed.stdout, /[ (;]service@example.invalid[);]/);
    assert.doesNotMatch(printed.stdout, /former-service@example.invalid|Division: W/);
  }
});

pdfTest('custom fallback alternatives pass on either unit and can require both', t => {
  if (!process.env.COURT_FILING_RENDER) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const caption = { ...example(), title: 'Notice of Filing', document_type: 'other-paper' };
  const built = renderFiling(scratch, 'alternatives', caption, fixtureBody);
  const short = pairedProfile('other-paper');
  const limits = short.validation.limits;
  const check = (name, pages, words, mode, flags, accepted, satisfiedBy) => {
    const path = join(scratch, name + '.json');
    limits['general-motion-pages'].maximum = pages;
    limits['fixture-other-paper-words'].maximum = words;
    if (mode) short.document_types['other-paper'].length_mode = mode;
    else delete short.document_types['other-paper'].length_mode;
    writeFileSync(path, JSON.stringify(short));
    const result = run([...built.validateArgs.map(arg => arg === 'colorado-district' ? path : arg), ...flags]);
    assert.equal(result.status, accepted ? 0 : 1, result.stderr);
    const parsed = resultOf(result);
    assert.deepEqual(parsed.limits.satisfiedBy, satisfiedBy);
    if (satisfiedBy) {
      const evidence = parsed.checks.find(check => check.label === 'Within a profile length alternative');
      assert.deepEqual(evidence.counts, { pageCount: parsed.pages, bodyWords: 5, pdfBodyWords: 5 });
    }
    return parsed;
  };
  check('page-only', 15, 4, 'alternatives', [], true, ['pages']);
  check('word-only', 1, 4000, 'alternatives', [], true, ['words']);
  check('neither', 1, 4, 'alternatives', [], false, []);
  check('pinned-words', 15, 4, 'alternatives', ['--limit', 'fixture-other-paper-words'], false);
  check('both-required', 15, 4, 'all', [], false);
  const legacy = check('implicit-both', 15, 4, undefined, [], false);
  assert.equal(legacy.limits.choice, 'profile-all');
  const retained = check('order-and-required-profile-words', 15, 4, 'all',
    ['--order-max-pages', '5', '--order-source', 'Fictional Order, 2099-04-05, docket entry 7 at page 2'], false);
  assert.equal(checksByName(retained)['Within page limit (5, set by order)'], 'pass');
  assert.equal(checksByName(retained)['Within word limit (4)'], 'fail');
});

pdfTest('an ambiguous reply keeps the reply cap and confirmation persists in validation', async t => {
  const scratch = temp(t);
  const caption = { ...example(), document_type: 'reply', title: 'Reply in Support of the Motion to Compel and Motion for Sanctions' };
  const cap = join(scratch, 'reply.json');
  writeFileSync(cap, JSON.stringify(caption));
  const reply = validateFile(await fixture(t, { caption, pages: 11 }), { caption: cap, flags: ['--limit', 'general-reply-pages'] });
  assert.equal(reply.result.documentType, 'reply');
  assert.equal(checksByName(reply.result)['Within page limit (10)'], 'fail');
  assert.equal(checksByName(reply.result)['Possible second paper in title'], 'advisory');

  const confirmation = { document_type: 'discovery-response', title: 'Responses Regarding the Inventory' };
  const confirmed = { ...example(), ...confirmation, type_confirmed: confirmation };
  const confirmedPdf = await fixture(t, { caption: confirmed });
  writeFileSync(cap, JSON.stringify(confirmed));
  const result = validateFile(confirmedPdf, { caption: cap, flags: [] }).result;
  assert.equal(checksByName(result)['No length preset for profile document type'], 'pass');
  assert.match(result.advisories[0].detail, /confirmed this exact title and type/);
  assert.deepEqual(validateFile(confirmedPdf, { caption: cap, flags: noLimit }).result.limits, result.limits);
  assert.equal(validateFile(confirmedPdf, { caption: cap, flags: ['--max-pages', '1'] }).result.limits.choice, 'explicit-maxima');
  delete confirmed.type_confirmed;
  writeFileSync(cap, JSON.stringify(confirmed));
  const unconfirmed = validateFile(confirmedPdf, { caption: cap, flags: [] }).result;
  const guard = unconfirmed.checks.find(check => check.label === 'Document type confirmation');
  assert.equal(guard.status, 'fail');
  assert.match(guard.detail, /set caption.type_confirmed to the exact title and document_type/);
});

pdfTest('real render chain validates ordinary and separate packet artifacts, including a table continued across pages', t => {
  const render = process.env.COURT_FILING_RENDER;
  if (!render) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const initial = { ...initialCaption(), title: 'Civil Complaint' };
  const defendant = example();
  defendant.title = 'Defendant’s Motion for a Scheduling Conference, Additional Proposed Dates and Updates to the Fictional Calendar';
  defendant.parties.splice(1, 0, { role: 'Plaintiff', name: 'Grove Fictional' });
  defendant.parties.push({ role: 'Defendant', name: 'Casey Imagined' });
  defendant.signer = { name: 'Casey Imagined', role: 'Pro Se Defendant', lines: ['casey@example.invalid'] };
  const richBody = '> A quoted sentence.\n\n| Day | Time |\n| --- | --- |\n| Monday | 3 p.m. |\n| Friday | 2 p.m. |\n\nI request a scheduling conference.';
  const exemptProfile = profile();
  const exemptFile = join(scratch, 'test-profile.json');
  exemptProfile.jurisdiction_id = 'fixture-only';
  const { service, ...exempt } = initial;
  const { title_pattern, ...type } = exemptProfile.document_types['new-case-complaint'];
  exemptProfile.document_types['fixture-only-exemption'] = { ...type, certificate: false, exact_title: exempt.title };
  exempt.document_type = 'fixture-only-exemption';
  exempt.type_confirmed = { title: exempt.title, document_type: exempt.document_type };
  writeFileSync(exemptFile, JSON.stringify(exemptProfile));
  const proposed = { ...orderCaption(), title: "Proposed Order re Plaintiff's Motion" };
  proposed.type_confirmed = { title: proposed.title, document_type: proposed.document_type };
  const supporting = declarationCaption();
  const table = ['| Entry | Detail |', '| --- | --- |',
    ...Array.from({ length: 90 }, (_, index) => '| Sample ' + index + ' | A fictional table entry. |')]
    .join('\n');
  const cases = [
    ['motion', example(), body(), motionLimit],
    ['initial', initial, fixtureBody, []],
    ['defendant', defendant, richBody, ['--limit', 'general-motion-pages']],
    ['exempt', exempt, fixtureBody, noLimit, exemptFile],
    ['proposed', proposed, 'The fictional conference will be scheduled.\n\nSO ORDERED on __________.\n\n' +
      'BY THE COURT:\n\n________________\n\nDistrict Court Judge', noLimit],
    ['supporting', supporting, fixtureBody, noLimit],
    ['ruled-order', proposed, 'The request is granted.\n\nBY THE COURT:\n\n____________\n\nDistrict Court Judge', noLimit],
    ['table', example(), table, motionLimit],
    ['list-spacing', example(), '## Schedule\n\n1. First entry.\n2. Second entry.\n\nThe conference is requested.', motionLimit],
    ...auditTitles.map(([document_type, title], index) => [
      'audit-title-' + index, { ...example(), document_type, title }, fixtureBody,
      document_type === 'motion' ? motionLimit : noLimit,
    ]),
    ['disclosure', { ...example(), document_type: 'discovery-disclosure', title: 'Supplemental Disclosures Regarding Exhibits' },
      fixtureBody, []],
    ['combined-discovery', { ...example(), document_type: 'discovery-response',
      title: "Defendant's Answers to Plaintiff's First Set of Interrogatories and Responses to Plaintiff's First Set of Requests for Production" },
    fixtureBody, []],
    ['fallback', { ...example(), document_type: 'other-paper', title: 'Notice of Entry of a Substituted Appearance' },
      fixtureBody, []],
    ['dated', { ...example(), certificate_year: 2098 }, fixtureBody, motionLimit],
  ];
  for (const [name, fields, markdown, flags, selected = 'colorado-district'] of cases) {
    const cap = join(scratch, name + '.json');
    const input = join(scratch, name + '.md');
    const html = join(scratch, name + '.html');
    const out = join(scratch, name + '.pdf');
    writeFileSync(cap, JSON.stringify(fields));
    writeFileSync(input, markdown);
    const composed = run(['compose', '--body', input, '--caption', cap, '--profile', selected, '--out', html]);
    assert.equal(composed.status, 0, composed.stderr);
    const { bodySha256, pdfArgs } = resultOf(composed);
    assert.equal(bodySha256, digest(markdown));
    const rendered = spawnSync(process.execPath, [render, 'pdf', '--input', html, '--output', out, ...pdfArgs], { encoding: 'utf8' });
    assert.equal(rendered.status, 0, name + ': ' + rendered.stderr);
    const cliArgs = ['validate', '--pdf', out, '--caption', cap, '--profile', selected, '--body-sha256', bodySha256, '--body', input];
    const validated = run([...cliArgs, ...flags]);
    assert.equal(validated.status, 0, name + ': ' + validated.stderr);
    const result = resultOf(validated);
    assert.equal(result.result, 'ALL CHECKS PASSED');
    assert.equal(result.pdfSha256, digest(readFileSync(out)));
    assert.equal(checksByName(result)['Certificate of service present'],
      ['exempt', 'proposed', 'supporting', 'ruled-order'].includes(name) ? 'not_applicable' : 'pass');
    if (name === 'fallback') {
      assert.deepEqual(result.limits, { choice: 'profile-preset', preset: 'general-motion-pages', pages: 15, words: null });
      assert.equal(checksByName(result)['Signer in signature block'], 'pass');
      assert.equal(checksByName(result)['Within page limit (15)'], 'pass');
    }
    if (name === 'proposed') {
      assert.equal(checksByName(result)['Judicial signature block in proposed order'], 'pass');
      assert.equal(checksByName(result)['Filer signature and certificate of service absent'], 'pass');
    }
    if (name === 'ruled-order') {
      assert.equal(checksByName(result)['Visible judicial signature ruling'], 'pass');
    }
    if (name === 'supporting') {
      assert.equal(checksByName(result)['Signer in signature block'], 'pass');
      assert.equal(checksByName(result)['Certificate of service absent'], 'pass');
    }
    if (name === 'table') {
      const extracted = spawnSync('pdftotext', ['-raw', out, '-'], { encoding: 'utf8' });
      assert.equal(extracted.status, 0, extracted.stderr);
      assert.ok(extracted.stdout.split('\f').slice(1).some(page => page.trimStart().startsWith('Entry Detail')));
      assert.equal(checksByName(result)['Printed PDF body matches composition'], 'pass');
      const spacingLabel = 'Table, list and heading double spacing';
      const spacing = result.checks.find(check => check.label === spacingLabel);
      assert.equal(spacing.status, 'advisory');
      assert.equal(spacing.counts.share, 1);
      assert.ok(spacing.counts.table > 91, 'a running header is counted on each continuation page');
      assert.equal(result.limits.words, null);
      const custom = profile();
      custom.document_types.motion.double_spacing = ['table'];
      assert.throws(() => validateProfile(custom), /needs a sourced validation.double_spacing rule/);
      custom.validation.double_spacing = { citation: 'Fixture court order', verification: 'recorded-in-source' };
      const strict = join(scratch, 'strict-table.json');
      writeFileSync(strict, JSON.stringify(custom));
      const required = run([...cliArgs.map(arg => arg === selected ? strict : arg), ...flags]);
      assert.equal(required.status, 1);
      assert.equal(checksByName(resultOf(required))[spacingLabel], 'fail');
      custom.document_types.motion.double_spacing = ['list'];
      writeFileSync(strict, JSON.stringify(custom));
      const unrelated = run([...cliArgs.map(arg => arg === selected ? strict : arg), ...flags]);
      assert.equal(unrelated.status, 0, unrelated.stderr);
      assert.equal(checksByName(resultOf(unrelated))[spacingLabel], 'advisory');
      const exactLimit = Math.max(result.bodyWords, result.pdfBodyWords);
      assert.equal(run([...cliArgs, '--max-words', String(exactLimit)]).status, 0);
    }
    if (name === 'list-spacing') {
      assert.deepEqual([result.bodyWords, result.pdfBodyWords], [11, 11]);
      const both = pairedProfile('motion', 'all');
      const bothPath = join(scratch, 'list-both-limits.json');
      writeFileSync(bothPath, JSON.stringify(both));
      const bothArgs = cliArgs.map(arg => arg === selected ? bothPath : arg);
      assert.equal(run([...bothArgs, '--max-words', '11']).status, 0);
      const overLimit = resultOf(run([...bothArgs, '--max-words', '10']));
      const wordCheck = overLimit.checks.find(check => check.label === 'Within word limit (10)');
      assert.equal(wordCheck.status, 'fail');
      assert.match(wordCheck.detail, /include ordered-list markers/);
      const spacingLabel = 'Table, list and heading double spacing';
      const originalSpacing = result.checks.find(check => check.label === spacingLabel);
      assert.equal(originalSpacing.counts.heading, 1);
      assert.equal(originalSpacing.counts.list, 0);
      const compactHtml = join(scratch, 'compact-list.html');
      const compactPdf = join(scratch, 'compact-list.pdf');
      writeFileSync(compactHtml, readFileSync(html, 'utf8').replace('.body ol, .body ul { line-height: 2;',
        '.body ol, .body ul { line-height: 1;'));
      const compactRender = spawnSync(process.execPath, [render, 'pdf', '--input', compactHtml, '--output', compactPdf, ...pdfArgs],
        { encoding: 'utf8' });
      assert.equal(compactRender.status, 0, compactRender.stderr);
      const compact = run([...cliArgs.map(arg => arg === out ? compactPdf : arg), ...flags]);
      assert.equal(compact.status, 0, compact.stderr);
      const shortLists = resultOf(compact).checks.find(check => check.label === spacingLabel);
      assert.equal(shortLists.status, 'advisory');
      assert.equal(shortLists.counts.list, 2);
      assert.equal(shortLists.counts.underDoubleLines, 3);
      assert.equal(shortLists.counts.share, 0.75);
    }
    if (name === 'dated') {
      const signedHtml = join(scratch, 'signed.html');
      const signedPdf = join(scratch, 'signed.pdf');
      writeFileSync(signedHtml, readFileSync(html, 'utf8').replace('____ day of __________, 2098', '5th day of January, 2099'));
      const signedRender = spawnSync(process.execPath, [render, 'pdf', '--input', signedHtml, '--output', signedPdf, ...pdfArgs],
        { encoding: 'utf8' });
      assert.equal(signedRender.status, 0, signedRender.stderr);
      const signed = run([...cliArgs.map(arg => arg === out ? signedPdf : arg), ...flags]);
      assert.equal(signed.status, 0, signed.stderr);
      assert.equal(checksByName(resultOf(signed))['Certificate date fields'], 'pass');
    }
    if (name === 'exempt') {
      assert.equal(checksByName(result)['Certificate of service absent'], 'pass');
      const withCertificate = [...cliArgs];
      withCertificate[withCertificate.indexOf(out)] = join(scratch, 'initial.pdf');
      const refused = run([...withCertificate, ...noLimit]);
      assert.equal(refused.status, 1);
      assert.equal(checksByName(resultOf(refused))['Certificate of service absent'], 'fail');
    }
    if (name === 'motion') {
      assert.deepEqual([result.bodyWords, result.pdfBodyWords], [75, 75]);
      assert.equal(run([...cliArgs, '--max-words', '75']).status, 0);
      const limited = run([...cliArgs, '--max-words', '74']);
      assert.equal(limited.status, 1, limited.stdout);
      assert.equal(checksByName(resultOf(limited))['Within word limit (74)'], 'fail');
      assert.equal(checksByName(resultOf(limited))['Within page limit (15)'], 'pass');
      const defaults = run(cliArgs);
      assert.equal(defaults.status, 0, defaults.stderr);
      assert.deepEqual(resultOf(defaults).limits, { choice: 'profile-preset', pages: 15, words: null, preset: 'general-motion-pages' });
      assert.match(run([...cliArgs, ...noLimit, '--max-pages', '2']).stderr, /cannot be combined/);
    }
    if (name === 'initial') {
      assert.equal(result.limits.choice, 'no-length-limit');
      assert.equal(result.documentType, 'new-case-complaint');
      assert.equal(checksByName(result)['No length preset for profile document type'], 'pass');
      assert.equal(checksByName(result)['Division in caption'], 'pass');
      assert.equal(checksByName(result)['Case number blank for new-case packet'], 'pass');
      const comparison = [...cliArgs];
      comparison[comparison.indexOf(out)] = join(scratch, 'motion.pdf');
      const populated = run([...comparison, ...noLimit]);
      assert.equal(populated.status, 1);
      assert.equal(checksByName(resultOf(populated))['Case number blank for new-case packet'], 'fail');
    }
  }
});

pdfTest('real PDF validation refuses substituted text, layout, extra ink and corrupted certificate fields', t => {
  const render = process.env.COURT_FILING_RENDER;
  if (!render) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const captionPath = join(scratch, 'caption.json');
  const input = join(scratch, 'original.md');
  const html = join(scratch, 'original.html');
  const paragraph = 'The fictional record supports the request for a conference on the dates described below. '.repeat(5).trim();
  const original = paragraph + '\n\nThe requested relief is available.';
  writeFileSync(captionPath, JSON.stringify(example()));
  writeFileSync(input, original);
  const composed = run(['compose', '--body', input, '--caption', captionPath, '--profile', 'colorado-district', '--out', html]);
  assert.equal(composed.status, 0, composed.stderr);
  const { bodySha256, pdfArgs } = resultOf(composed);
  const source = readFileSync(html, 'utf8');
  const counterfeitBody = original.replace('available.', 'unavailable.');
  const fakeTitle = 'Court Filing ' + bodySha256 + ' ' + digest(counterfeitBody.replace(/\s/g, '')) + ' ' + wordCount(counterfeitBody);
  const variants = [
    ['substituted', source.replace('relief is available.', 'relief is unavailable.'), 'Printed PDF body matches composition'],
    ['forged-title', source.replace(/<title>[^<]+<\/title>/u, '<title>' + fakeTitle + '</title>')
      .replace('relief is available.', 'relief is unavailable.'), 'Printed PDF body matches composition'],
    ['type-size', source.replace('.body p {', '.body p { font-size: 8pt;'), 'Profile type size'],
    ['line-spacing', source.replace('.body p { line-height: 2;', '.body p { line-height: 1;'), 'Body paragraph spacing'],
    ['vector', source.replace('</body>', '<div style="position:fixed;left:20pt;bottom:10pt;width:70pt;height:15pt;background:black"></div></body>'),
      'Visible filing ink'],
    ['firm', source.replace('Example Counsel</div>', 'Other Counsel</div>'), 'Certificate firm details'],
    ['server', source.replace('sig-name">Rowan Example</div>', 'sig-name">Different Person</div>'),
      'Certificate signer and end of filing'],
    ['year', source.replace('__________, 2026,', '__________, 2030,'), 'Certificate date fields'],
  ];
  const completed = source.replace('Date: ____________________', 'Date: November 20, 2026')
    .replace('____ day of __________, 2026,', '20th day of November, 2026,')
    .replaceAll('class="sig-line">_____________________________</div>', 'class="sig-line">/s/ Rowan Example</div>');
  variants.push(['completed-signatures', completed, null]);
  for (const [name, page, check] of variants) {
    const edited = join(scratch, name + '.html');
    const pdf = join(scratch, name + '.pdf');
    assert.notEqual(page, source);
    writeFileSync(edited, page);
    const rendered = spawnSync(process.execPath, [render, 'pdf', '--input', edited, '--output', pdf, ...pdfArgs], { encoding: 'utf8' });
    assert.equal(rendered.status, 0, name + ': ' + rendered.stderr);
    const args = ['validate', '--pdf', pdf, '--caption', captionPath, '--profile', 'colorado-district',
      '--body-sha256', bodySha256, ...motionLimit];
    const emptyBody = run(args);
    assert.equal(emptyBody.stdout, '');
    assert.match(emptyBody.stderr, /--body is required/);
    const checked = run([...args, '--body', input]);
    if (check === null) {
      assert.equal(checked.status, 0, checked.stderr);
      assert.equal(resultOf(checked).pdfSha256, digest(readFileSync(pdf)));
    } else {
      assert.equal(checked.status, 1);
      assert.equal(checked.stdout, '');
      assert.equal(checksByName(resultOf(checked))[check], 'fail', name + ': ' + checked.stderr);
    }
  }
});

pdfTest('supporting declaration cannot carry a certificate heading anywhere in its body', t => {
  const render = process.env.COURT_FILING_RENDER;
  if (!render) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const caption = join(scratch, 'caption.json');
  const input = join(scratch, 'body.md');
  const html = join(scratch, 'input.html');
  const pdf = join(scratch, 'output.pdf');
  writeFileSync(caption, JSON.stringify(declarationCaption()));
  writeFileSync(input, fixtureBody + '\n\n## CERTIFICATE OF SERVICE\n\nThis heading cannot replace the enclosing certificate.');
  const made = run(['compose', '--caption', caption, '--body', input, '--profile', 'colorado-district', '--out', html]);
  assert.equal(made.status, 0, made.stderr);
  const { bodySha256, pdfArgs } = resultOf(made);
  const rendered = spawnSync(process.execPath, [render, 'pdf', '--input', html, '--output', pdf, ...pdfArgs], { encoding: 'utf8' });
  assert.equal(rendered.status, 0, rendered.stderr);
  const refused = run(['validate', '--pdf', pdf, '--caption', caption, '--profile', 'colorado-district',
    '--body', input, '--body-sha256', bodySha256, ...noLimit]);
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.equal(checksByName(resultOf(refused))['Certificate of service absent'], 'fail');
});
