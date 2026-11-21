import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync,
  statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Marked } from 'marked';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { checkMarkdownToken, compose, prepareBody } from '../scripts/compose-core.js';
import { classifyTitle, resolveLimits, validateCaption, validateProfile } from '../scripts/schema-core.js';
import { markdownWordCount, printedBodyText, wordCount } from '../scripts/body-text-core.js';
import { validate } from '../scripts/validate-core.js';
import { bodyEvidence, removeRepeatedHeaders } from '../scripts/filing-text-core.js';

const tool = fileURLToPath(new URL('..', import.meta.url));
const cli = join(tool, 'scripts', 'court-filing.js');
const asset = name => join(tool, 'assets', name);
const profilePath = join(tool, 'profiles', 'colorado-district.json');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const example = () => readJson(asset('example-caption.json'));
const profile = () => readJson(profilePath);
const body = () => readFileSync(asset('example-body.md'), 'utf8');
const parse = new Marked({ walkTokens: checkMarkdownToken }).parse;
const digest = text => createHash('sha256').update(text).digest('hex');
const compos = inputs => compose(inputs, parse, digest);
const noLimit = ['--no-length-limit'];
const motionLimit = ['--limit', 'general-motion-pages'];
const resultOf = response => JSON.parse(response.status === 0 ? response.stdout : response.stderr);
const run = (args, options = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', ...options });
const checksByName = output => Object.fromEntries(output.checks.map(({ label, status }) => [label, status]));
const poppler = Object.values(JSON.parse(run(['check']).stdout).poppler).every(Boolean);

function temp(t) {
  const path = mkdtempSync(join(tmpdir(), 'court-filing-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return realpathSync(path);
}

test('compose preserves the legacy caption, spacing and signature/service blocks', () => {
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
  assert.match(composed.html, /Morgan Sample \(morgan@example.invalid; service@example.invalid\)/);
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

test('profile types own their title, blocks, packet and limit choices', () => {
  const current = profile();
  for (const [change, expected] of [
    [{ division: '' }, /division must be populated/],
    [{ signer: undefined }, /signer must be an object/],
    [{ parties: [] }, /parties must be a non-empty array/],
    [{ document_type: 'unknown' }, /document_type is not listed/],
    [{ title: 'Stage Directions' }, /title does not match/],
  ]) assert.throws(() => validateCaption({ ...example(), ...change }, current), expected);
  const brokenEmail = example();
  brokenEmail.service.recipients[0].emails = ['not an email'];
  assert.throws(() => validateCaption(brokenEmail, current), /caption\.service\.recipients\[0\]\.emails\[0\] must be an email address/);
  const limited = preset => resolveLimits(current, example(), preset);
  assert.throws(() => limited(), /Choose --limit/);
  assert.throws(() => limited({ noLimit: true }), /not allowed for this profile document type/);
  assert.throws(() => limited({ preset: 'general-reply-pages' }), /not listed for this profile document type/);
  assert.throws(() => validateCaption({ ...example(), document_type: 'rule-12-or-56-motion' }, current), /title does not match/);
  assert.equal(validateCaption({ ...example(), document_type: 'rule-12-or-56-motion', title: 'Motion for Summary Judgment' }, current)
    .document_type, 'rule-12-or-56-motion');
  assert.deepEqual(limited({ preset: 'general-motion-pages' }), {
    choice: 'profile-preset', pages: 15, words: null, preset: 'general-motion-pages',
  });
  assert.throws(() => limited({ preset: 'general-motion-words', pages: 10 }), /cannot be combined/);
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
  assert.throws(() => validateCaption({ ...caption, title: 'Motion for Something Else' }, listed), /title does not match/);
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
  assert.throws(() => validateCaption({ ...order, title: 'Order to Show Cause' }, profile()), /title does not match/);
  assert.throws(() => validateCaption({ ...order, signer: example().signer }, profile()), /omit filer/);
  assert.throws(() => compos({ caption: order, body: 'The request is denied.', profile: profile() }), /blank signature line/);
  assert.throws(() => validateCaption({ ...declaration, filing_packet: undefined }, profile()), /filing_packet/);
  assert.throws(() => validateCaption({ ...declaration, service: example().service }, profile()), /service must be omitted/);
  assert.throws(() => validateCaption({ ...declaration, title: 'Motion to Strike the Declaration' }, profile()), /title does not match/);
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
  assert.deepEqual(listed, [profile()]);
  assert.equal(listed[0].filing_packets.new_case_complaint.required_at_filing[3].verification, 'verify');
  assert.equal(listed[0].validation.limits['general-motion-words'].citation, 'C.R.C.P. 121 section 1-15(1)(a)');
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
  assert.equal(JSON.parse(copyRun(['profiles']).stdout).profiles.length, 1);
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
          (options.email ?? 'service@example.invalid') + ')', 237);
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
  const { status, result } = validateFile(await fixture(t), { flags: ['--max-pages', '2', '--max-words', '5'] });
  assert.equal(status, 1);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(result.bodyWords, 5);
  assert.equal(result.pdfBodyWords, 5);
  assert.deepEqual(result.checks.filter(check => check.status !== 'pass').map(check => check.label),
    ['Embedded profile fonts', 'Profile type size', 'Boxed caption ruling']);
  assert.match(result.checks.find(check => check.label === 'Embedded profile fonts').detail, /Times-Roman \(not embedded\)/);
});

pdfTest('PDF length and binding catch an expanded body that keeps the composition metadata', async t => {
  const path = await fixture(t, { bodyExtra: 'These words were inserted into the PDF after composition.' });
  const { result } = validateFile(path, { flags: ['--max-pages', '1', '--max-words', '5'] });
  const checks = checksByName(result);
  assert.equal(result.bodyWords, 5);
  assert.equal(result.pdfBodyWords, 14);
  assert.equal(checks['Within page limit (1)'], 'fail');
  assert.equal(checks['Within word limit (5)'], 'fail');
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
  const email = await fixture(t, { email: 'service@example.invalid.example.invalid', bodyText: 'service@example.invalid' });
  assert.equal(checksByName(validateFile(email).result)['Service email present: service@example.invalid'], 'fail');
});

pdfTest('certificate words in the body do not replace a certificate block', async t => {
  const { status, result } = validateFile(await fixture(t, { withoutCertificate: true, bodyText: certificateHeading }));
  assert.equal(status, 1);
  assert.equal(checksByName(result)['Certificate of service present'], 'fail');
  assert.equal(checksByName(result)['Service email present: service@example.invalid'], 'fail');
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
  const limits = resolveLimits(current, caption, { preset: 'general-motion-pages' });
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
    const result = validate({ pdf, caption, profile: current, limits, prepared, validationDate }, kind => {
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
});

test('unavailable inspection evidence cannot produce a successful gate', () => {
  const result = validate({
    pdf: new Uint8Array(), caption: example(), profile: profile(), limits: resolveLimits(profile(), example(), { preset: 'general-motion-pages' }),
    prepared: prepareBody(fixtureBody, profile().document_types.motion, parse, digest),
  }, () => null);
  assert.equal(result.ok, false);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(checksByName(result)['Page-number footer'], 'not_checked');
});

test('only the complaint type may use the new-case packet and blank docket', () => {
  const current = profile();
  const initial = initialCaption();
  assert.equal(validateCaption(initial, current).case_number, '');
  assert.throws(() => validateCaption({ ...initial, case_number: '2099CV00000' }, current), /case_number must be blank/);
  assert.throws(() => validateCaption({ ...initial, title: 'Motion to Amend the Complaint' }, current), /title does not match/);
  assert.throws(() => validateCaption({ ...initial, title: 'Complaint and Notice of Hearing' }, current), /title does not match/);
  assert.throws(() => validateCaption({ ...initial, filing_packet: 'unknown_packet' }, current), /filing_packet must match/);
  assert.throws(() => validateCaption({ ...example(), case_number: '' }, current), /case_number must be populated/);
  assert.throws(() => resolveLimits(current, initial, { preset: 'general-motion-pages' }), /requires --no-length-limit/);
  assert.match(run(['validate', '--no-length-limit', 'n/a']).stderr, /Unknown option n\/a/);
});

test('unlimited answers and discovery cannot include motions or other briefed papers', () => {
  for (const [document_type, simple, mixed] of [
    ['answer', "Defendant's Answer", "Defendant's Answer and Motion for Summary Judgment"],
    ['discovery-request', "Plaintiff's First Requests for Production", "Plaintiff's Requests for Production and Motion to Compel"],
    ['discovery-response', 'Responses to Interrogatories', 'Responses to Interrogatories and Motion to Compel'],
    ['discovery-disclosure', 'Supplemental Disclosures', 'Supplemental Disclosures and Notice of Hearing'],
    ['case-management-submission', 'Proposed Case Management Order', 'Proposed Case Management Order and Motion for Extension'],
  ]) {
    const caption = { ...example(), document_type, title: simple };
    assert.equal(resolveLimits(profile(), caption, { noLimit: true }).pages, null);
    assert.throws(() => validateCaption({ ...caption, title: mixed }, profile()), /title does not match/);
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
    assert.throws(() => validateCaption({ ...example(), document_type, title: ineligible }, profile()), /title does not match/);
  }
});

test('classifies real title forms before falling back and refuses only definite second papers', () => {
  const current = validateProfile(profile());
  const cases = [
    ['discovery-response', "Defendant's Answers to Plaintiff's First Set of Interrogatories"],
    ['discovery-response', "Defendant's Answers and Objections to Plaintiff's First Set of Interrogatories"],
    ['discovery-response', "Plaintiff's Supplemental Responses to Defendant's First Set of Interrogatories"],
    ['discovery-response', "Objections and Responses to Plaintiff's First Set of Requests for Production"],
    ['discovery-response', "Defendant's Objections and Answers to the Third Set of Interrogatories"],
    ['discovery-response', 'Amended Answers and Objections to the Second Set of Interrogatories'],
    ['discovery-response', 'Supplemental Objections and Responses to Requests for Admission'],
    ['discovery-response', 'Answer to the Fourth Set of Interrogatories'],
    ['motion', "Plaintiff's Opposed Motion to Compel"],
    ['motion', "Plaintiff's Supplemental Motion to Compel"],
    ['motion', 'Motion for Leave to File a Sur-Reply'],
    ['motion', 'Motion to Strike the Response'],
    ['motion', 'Motion to Strike (And Motion to Strike in the Quoted Heading)'],
    ['motion', 'Motion to Strike (Use Exhibit (A) and Notice of Hearing for Reference)'],
    ['brief', 'Brief in Support of the Motion to Dismiss'],
    ['brief', 'Brief in Support of Its Motion to Confirm the Award'],
    ['brief', 'Memorandum in Support of His Motion to Exclude Testimony'],
    ['brief', 'Brief in Support of Her Motion for Extension of Time'],
    ['brief', 'Brief in Support of Their Motion to Adjust Discovery Limits'],
    ['answer', "Defendant's Amended Answer"],
    ['answer', 'Answer and Counterclaim'],
    ['answer', 'Answer and Counterclaims'],
    ['answer', 'Answer and Affirmative Defenses'],
    ['answer', 'Answer and Jury Demand'],
    ['answer', 'Answer and Counterclaims and Jury Demand'],
    ['case-management-submission', "Plaintiff's Proposed Case Management Order on Outstanding Discovery Responses"],
    ['case-management-submission', 'Amended Proposed Case-Management Order Regarding the Notice of Hearing'],
    ['other-paper', 'Case Management Order'],
    ['other-paper', 'Amended Case Management Order'],
    ['other-paper', 'Response to Motion to Dismiss and Motion to Strike'],
    ['other-paper', 'Response to Motion for Summary Judgment and Motion to Strike'],
    ['other-paper', 'Notice Regarding the Hearing and the Supplemental Motion for Leave'],
    ['other-paper', 'Notice Regarding the Hearing and Supplemental Motion for Leave'],
    ['other-paper', 'Statement Re: Exhibit Numbering & Reply to Objections'],
    ['other-paper', 'Motion for Leave to File a Sur-Reply and Response to Supplemental Authority'],
    ['other-paper', 'Motion for Settlement Conference and Response Deadlines'],
    ['other-paper', 'Status Report on Courtroom Access and Notice Requirements'],
    ['other-paper', 'Notice of Entry of a Substituted Appearance'],
    ['rule-12-or-56-motion', 'Opposed Motion for Partial Summary Judgment'],
    ['rule-12-or-56-response', 'Supplemental Opposition to the Motion for Partial Summary Judgment'],
    ['rule-12-or-56-reply', 'Joint Reply in Support of the Motion for Summary Judgment'],
    ['response', 'Amended Response to an Objection About the Exhibit Index'],
    ['reply', 'Reply to Written Objections Regarding the Proposed Schedule'],
    [null, 'Renewed Motion for Summary Judgment and Motion to Strike'],
    [null, 'Joint Response and Motion for Sanctions'],
    [null, 'Amended Reply and Motion for Leave'],
    [null, "Reply & Defendant's Supplemental Cross-Motion for Leave"],
    [null, 'Motion for Summary Judgment; Amended Opposition to Leave'],
    [null, 'Answer, and Joint Notice of Hearing'],
    [null, 'Notice of Hearing and Answer to an Amended Complaint'],
    [null, 'Status Report & Brief in Support of a Motion'],
    [null, 'Answer and Counterclaims & Motion for Leave'],
    [null, 'Proposed Order Setting a Hearing; Separate Notice of Setting'],
    [null, 'Motion to Compel and Example Workshop LLC’s Motion for Sanctions'],
    [null, 'Example Workshop LLC’s Motion to Compel and Reply to Objections'],
    [null, "Memorandum of Costs, and Plaintiffs' Reply"],
    [null, 'Answer and Cross Motion'],
    [null, 'Reply and Counterclaim for Restitution'],
    [null, 'Response; and Requesting Party’s Renewed Motion for Leave'],
    [null, 'Response and Brief'],
    [null, 'Reply and Opposition'],
  ];
  for (const [type, title] of cases) {
    if (type) {
      assert.equal(classifyTitle(current, title), type, title);
      const caption = { ...example(), title, document_type: type };
      assert.equal(validateCaption(caption, current).title, title);
    } else {
      assert.throws(() => classifyTitle(current, title), /does not match a single paper/, title);
      for (const document_type of Object.keys(current.document_types)) {
        const caption = { ...example(), title, document_type };
        assert.throws(() => compos({ caption, body: body(), profile: current }), /does not match a single paper/, title);
      }
    }
  }
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
    const document_type = classifyTitle(current, title);
    assert.ok(document_type, title);
    const caption = { ...example(), title, document_type };
    const { html } = compos({ caption, body: fixtureBody, profile: current });
    assert.ok(html.includes('class="doc-title">' + title + '</td>'), title);
  }
});

test('other-paper keeps the real title, both general limits and the filer and service blocks', () => {
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
  assert.throws(() => validateCaption({ ...caption, document_type: 'motion' }, current), /title does not match.*Use other-paper/);
  assert.throws(() => validateCaption({ ...caption, title: example().title }, current), /title does not match.*Use motion/);
  for (const document_type of ['case-management-submission', 'proposed-order']) {
    assert.throws(() => validateCaption({ ...caption, title: 'Case Management Order', document_type }, current),
      /title does not match.*Use other-paper/);
  }
  assert.deepEqual(resolveLimits(current, caption), { choice: 'profile-fallback', preset: null, pages: 15, words: 4000 });
  assert.deepEqual(resolveLimits(current, caption, { pages: 12 }), {
    choice: 'explicit-maxima', preset: null, pages: 12, words: 4000,
  });
  for (const preset of ['general-motion-pages', 'general-motion-words']) {
    assert.deepEqual(resolveLimits(current, caption, { preset }), { choice: 'profile-preset', preset, pages: 15, words: 4000 });
  }
  for (const preset of ['rule-12-or-56-motion-pages', 'rule-12-or-56-reply-pages']) {
    assert.throws(() => resolveLimits(current, caption, { preset }), /not listed/);
  }
  assert.throws(() => resolveLimits(current, caption, { noLimit: true }), /not allowed/);
  assert.throws(() => resolveLimits(current, caption, { pages: 16 }), /cannot exceed/);
  assert.throws(() => resolveLimits(current, caption, { words: 4001 }), /cannot exceed/);
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

pdfTest('real render chain validates ordinary and separate packet artifacts, including a table continued across pages', t => {
  const render = process.env.COURT_FILING_RENDER;
  if (!render) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const initial = initialCaption();
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
  writeFileSync(exemptFile, JSON.stringify(exemptProfile));
  const proposed = orderCaption();
  const supporting = declarationCaption();
  const table = ['| Entry | Detail |', '| --- | --- |',
    ...Array.from({ length: 90 }, (_, index) => '| Sample ' + index + ' | A fictional table entry. |')]
    .join('\n');
  const cases = [
    ['motion', example(), body(), ['--limit', 'general-motion-words']],
    ['initial', initial, fixtureBody, noLimit],
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
      fixtureBody, noLimit],
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
      assert.deepEqual(result.limits, { choice: 'profile-fallback', preset: null, pages: 15, words: 4000 });
      assert.deepEqual(result.checks.find(check => check.label === 'Document type fallback'), {
        label: 'Document type fallback', status: 'pass',
        detail: 'The title matched no specific type. The general limits were applied (15 pages and 4000 words).',
      });
      assert.equal(checksByName(result)['Signer in signature block'], 'pass');
      assert.equal(checksByName(result)['Within page limit (15)'], 'pass');
      assert.equal(checksByName(result)['Within word limit (4000)'], 'pass');
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
      assert.equal(run([...cliArgs, '--max-words', '11']).status, 0);
      const overLimit = resultOf(run([...cliArgs, '--max-words', '10']));
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
      assert.equal(limited.status, 1);
      assert.equal(limited.stdout, '');
      assert.equal(checksByName(resultOf(limited))['Within word limit (74)'], 'fail');
      const missingChoice = run(cliArgs);
      assert.equal(missingChoice.status, 1);
      assert.equal(missingChoice.stdout, '');
      assert.match(missingChoice.stderr, /Choose --limit/);
      assert.match(run([...cliArgs, ...noLimit, '--max-pages', '2']).stderr, /cannot be combined/);
    }
    if (name === 'initial') {
      assert.equal(result.limits.choice, 'no-length-limit');
      assert.equal(result.documentType, 'new-case-complaint');
      assert.equal(checksByName(result)['No length limit for profile document type'], 'pass');
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
