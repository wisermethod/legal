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
import { checkMarkdownToken, compose } from '../scripts/compose-core.js';
import { resolveLimits, validateCaption, validateProfile } from '../scripts/schema-core.js';
import { printedBodyText, wordCount } from '../scripts/body-text-core.js';
import { validate } from '../scripts/validate-core.js';

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
const noLimit = ['--no-length-limit', 'Fictional order sets no length limit'];
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
  caption.parties.unshift({ role: 'Defendant', name: 'Second <Party>' });
  caption.parties.push({ role: 'Plaintiff', name: 'Second Plaintiff' });
  caption.title = 'An "Example" & Request';
  const composed = compos({ caption, body: body(), profile: profile() });
  assert.match(composed.html, /@page \{ size: letter; margin: 1in 1in 1in 1in; \}/);
  assert.match(composed.html, /font-family: 'Times New Roman', Times, serif; font-size: 12pt/);
  assert.match(composed.html, /\.body p \{ line-height: 2;/);
  assert.match(composed.html, /table\.caption \{ break-inside: avoid; \}/);
  assert.match(composed.html, /\.closing \{[^}]+break-inside: avoid/);
  assert.match(composed.html, /row[^>]*>\s*<td colspan="2" class="doc-title">An &quot;Example&quot; &amp; Request/);
  assert.match(composed.html, /&#9650; COURT USE ONLY &#9650;/);
  assert.match(composed.html, /Plaintiff:<\/span> ROWAN EXAMPLE;/);
  assert.match(composed.html, /Defendant:<\/span> SECOND &lt;PARTY&gt;\./);
  assert.equal((composed.html.match(/class="vs">v\./g) ?? []).length, 1);
  assert.match(composed.html, /ROWAN EXAMPLE;[\s\S]*SECOND PLAINTIFF;[\s\S]*class="vs">v\.[\s\S]*SECOND &lt;PARTY&gt;\.[\s\S]*IMAGINARY WORKSHOP LLC/);
  assert.match(composed.html, /<div class="counsel-label">Pro Se Plaintiff:<\/div>/);
  assert.match(composed.html, /<h2>Statement of the request<\/h2>/);
  assert.match(composed.html, /Respectfully submitted,[\s\S]*Date: ____________________/);
  assert.match(composed.html, /CERTIFICATE OF SERVICE[\s\S]*____ day of __________, 2026/);
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

test('caption and profile refuse precise invalid field paths and keep supplied rule limits explicit', () => {
  const badEmail = example();
  badEmail.service.recipients[0].emails = ['not an email'];
  assert.throws(() => validateCaption(badEmail), /caption\.service\.recipients\[0\]\.emails\[0\] must be an email address/);
  assert.throws(() => validateCaption({ ...example(), division: '' }), /caption\.division must be non-blank/);
  const noSigner = example();
  delete noSigner.signer;
  assert.throws(() => validateCaption(noSigner), /caption\.signer is required/);
  assert.throws(() => validateCaption({ ...example(), parties: [] }), /caption\.parties must be a non-empty array/);
  const broken = profile();
  broken.layout.margins_inches.right = '1';
  assert.throws(() => validateProfile(broken), /profile\.layout\.margins_inches\.right must be a number/);
  broken.layout.margins_inches.right = 1;
  broken.layout.footer.format = 'Just a label';
  assert.throws(() => validateProfile(broken), /profile\.layout\.footer\.format/);
  assert.throws(() => resolveLimits(profile()), /Choose --limit/);
  assert.deepEqual(resolveLimits(profile(), 'rule-12-or-56-reply-pages'), {
    choice: 'profile-preset', pages: 15, words: null, preset: 'rule-12-or-56-reply-pages',
  });
  assert.throws(() => resolveLimits(profile(), 'general-motion-words', 10), /cannot be combined/);
  assert.throws(() => resolveLimits(profile(), undefined, 1.5), /--max-pages must be a positive integer/);
});

test('the caption requires service or one exact, profile-listed no-certificate reason', () => {
  const { service, ...initial } = example();
  const listed = profile();
  const reason = 'fictional-test-exemption';
  listed.no_service_certificate_reasons = { [reason]: { description: 'Test fixture only.', title: initial.title } };
  const declared = { ...initial, no_service_certificate: reason };
  assert.deepEqual(validateCaption(declared, listed), declared);
  assert.throws(() => validateCaption({ ...declared, title: 'A different motion' }, listed), /not allowed for this title/);
  assert.throws(() => validateCaption(initial, listed), /exactly one of service and no_service_certificate/);
  assert.throws(() => validateCaption({ ...declared, service }, listed), /exactly one of service and no_service_certificate/);
  for (const refused of ['not-listed', 'constructor', reason + ' ', 'before-' + reason]) {
    assert.throws(() => validateCaption({ ...initial, no_service_certificate: refused }, listed), /no_service_certificate/);
  }
  assert.throws(() => validateCaption({ ...initial, no_service_certificate: true }, listed), /no_service_certificate/);
  delete listed.no_service_certificate_reasons;
  assert.throws(() => validateCaption(declared, listed), /no_service_certificate is not listed/);
  assert.deepEqual(validateCaption({ ...initial, service }, listed), { ...initial, service });
  listed.no_service_certificate_reasons = { [reason]: { description: '', title: initial.title } };
  assert.throws(() => validateProfile(listed), /no_service_certificate_reasons.*must be non-blank/);
});

test('using a profile declaration never clears missing PDF evidence', () => {
  const { service, ...initial } = example();
  const caption = { ...initial, no_service_certificate: 'fictional-test-exemption' };
  const currentProfile = profile();
  currentProfile.no_service_certificate_reasons = { 'fictional-test-exemption': { description: 'Test fixture only.', title: caption.title } };
  const result = validate({ pdf: new Uint8Array(), caption, profile: currentProfile, limits: resolveLimits(currentProfile, undefined, 1, 10) }, () => null);
  assert.equal(result.ok, false);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(checksByName(result)['Signer in signature block'], 'not_checked');
  assert.equal(checksByName(result)['Within page limit (1)'], 'not_checked');
  assert.equal(checksByName(result)['Within word limit (10)'], 'not_checked');
  assert.equal(checksByName(result)['Page-number footer'], 'not_checked');
  assert.deepEqual(result.checks.find(check => check.status === 'not_applicable'), {
    label: 'Certificate of service present',
    status: 'not_applicable',
    detail: 'Not applicable by declaration (' + caption.no_service_certificate + '): ' +
      currentProfile.no_service_certificate_reasons[caption.no_service_certificate].description,
  });
  assert.equal(result.checks.some(check => check.label.startsWith('Service email')), false);
});

test('compose refuses raw HTML, image loads and non-document links', () => {
  for (const [markdown, expected] of [
    ['<style>body{font-size:1px}</style>', /raw HTML/],
    ['![Exhibit](https://example.invalid/asset.png)', /contains an image/],
    ['[private file](file:///missing)', /link must use/],
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
  assert.match(readFileSync(output, 'utf8'), /____ day of __________, ____,/);
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
  initial.title = 'Fictional Initial Complaint';
  const composeArgs = ['compose', '--body', asset('example-body.md'), '--caption', caption,
    '--profile', 'colorado-district', '--out', output];
  const validateArgs = ['validate', '--pdf', join(scratch, 'unwritten.pdf'), '--caption', caption,
    '--profile', 'colorado-district', '--body-sha256', digest(body()), ...noLimit];
  for (const fields of [{}, { no_service_certificate: 'unsupported-reason' },
    { no_service_certificate: ['initial', 'complaint', 'before', 'service'].join('-') },
    { service, no_service_certificate: 'fictional-test-exemption' }]) {
    writeFileSync(caption, JSON.stringify({ ...initial, ...fields }));
    for (const args of [composeArgs, validateArgs]) {
      const refused = run(args);
      assert.equal(refused.status, 1);
      assert.equal(refused.stdout, '');
      assert.match(refused.stderr, /no_service_certificate/);
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
  assert.match(html, /Fictional Initial Complaint/);
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
  pdf.setTitle(composed.html.match(/<title>([^<]+)<\/title>/)[1]);
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
        draw('I certify that on this ____ day of __________, 2026, a true and correct copy of the foregoing', 297);
        draw(caption.title + ' was served by email', 275);
        draw('to:', 261);
        draw(caption.service.recipients[0].name + ' (morgan@example.invalid; ' +
          (options.email ?? 'service@example.invalid') + ')', 237);
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
    profileName = 'colorado-district', flags = noLimit,
  } = options;
  const cliResult = run(['validate', '--pdf', path, '--caption', caption, '--profile', profileName, '--body-sha256', hash, ...flags]);
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
  assert.deepEqual(result.checks.filter(check => check.status !== 'pass').map(check => check.label), ['Embedded profile fonts']);
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
  const other = validateFile(path, { hash: digest('A different body.') });
  assert.equal(checksByName(other.result)['Composed body SHA-256'], 'fail');
  const assertedBody = run(['validate', '--pdf', path, '--caption', asset('example-caption.json'),
    '--profile', 'colorado-district', '--body-sha256', fixtureDigest, '--body', asset('example-body.md'), ...noLimit]);
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
  const response = run(['validate', '--pdf', file, '--caption', asset('example-caption.json'),
    '--profile', 'colorado-district', '--body-sha256', fixtureDigest, ...noLimit], { env: { ...process.env, PATH: '' } });
  assert.equal(response.status, 1);
  assert.equal(response.stdout, '');
  const result = JSON.parse(response.stderr);
  assert.equal(result.ok, false);
  assert.equal(checksByName(result)['PDF parses'], 'not_checked');
  assert.equal(checksByName(result)['Page size'], 'not_checked');
  assert.deepEqual(result.unavailable.map(entry => entry.check),
    ['pdfinfo -v', 'pdftotext -v', 'pdffonts -v', 'pdftoppm -v']);
});

test('unavailable inspection evidence cannot produce a successful gate', () => {
  const result = validate({
    pdf: new Uint8Array(), caption: example(), profile: profile(), limits: resolveLimits(profile(), 'general-motion-pages'),
    bodySha256: fixtureDigest, digest,
  }, () => null);
  assert.equal(result.ok, false);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(checksByName(result)['Page-number footer'], 'not_checked');
});

test('new-case packet alone accepts and requires an empty docket number', () => {
  const caption = example();
  const current = profile();
  assert.throws(() => validateCaption({ ...caption, case_number: '' }, current), /case_number must be blank/);
  const initial = { ...caption, title: 'Fictional Initial Complaint', filing_packet: 'new_case_complaint' };
  assert.throws(() => validateCaption(initial, current), /case_number must be blank/);
  assert.throws(() => validateCaption({ ...initial, title: caption.title, case_number: '' }, current), /must identify the complaint/);
  assert.throws(() => validateCaption({ ...initial, filing_packet: 'unknown_packet', case_number: '' }, current), /not listed/);
  assert.equal(validateCaption({ ...initial, case_number: '' }, current).case_number, '');
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
  assert.throws(() => compos({ caption, body: body(), profile: profile() }), /counsel_label is required/);
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

pdfTest('real render chain validates the example, a new complaint and a two-by-two defendant filing', t => {
  const render = process.env.COURT_FILING_RENDER;
  if (!render) return t.skip('Set COURT_FILING_RENDER to an installed render.js and Chromium runtime.');
  const scratch = temp(t);
  const initial = { ...example(), title: 'Fictional Initial Complaint', filing_packet: 'new_case_complaint', case_number: '' };
  const defendant = example();
  defendant.title = 'Defendant’s Motion for a Scheduling Conference, Additional Proposed Dates and Updates to the Fictional Calendar';
  defendant.parties.splice(1, 0, { role: 'Plaintiff', name: 'Grove Fictional' });
  defendant.parties.push({ role: 'Defendant', name: 'Casey Imagined' });
  defendant.signer = { name: 'Casey Imagined', role: 'Pro Se Defendant', lines: ['casey@example.invalid'] };
  const richBody = '> A quoted sentence.\n\n| Day | Time |\n| --- | --- |\n| Monday | 3 p.m. |\n| Friday | 2 p.m. |\n\nI request a scheduling conference.';
  const exemptProfile = profile();
  const exemptFile = join(scratch, 'test-profile.json');
  const reason = 'fixture-only-exemption';
  exemptProfile.jurisdiction_id = 'fixture-only';
  exemptProfile.no_service_certificate_reasons[reason] = { description: 'Fixture only.', title: initial.title };
  writeFileSync(exemptFile, JSON.stringify(exemptProfile));
  const { service, ...exempt } = initial;
  exempt.no_service_certificate = reason;
  const cases = [
    ['motion', example(), body(), ['--limit', 'general-motion-words']],
    ['initial', initial, fixtureBody, noLimit],
    ['defendant', defendant, richBody, ['--limit', 'general-motion-pages']],
    ['exempt', exempt, fixtureBody, noLimit, exemptFile],
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
    assert.equal(checksByName(result)['Certificate of service present'], name === 'exempt' ? 'not_applicable' : 'pass');
    if (name === 'exempt') {
      assert.equal(checksByName(result)['Certificate of service absent'], 'pass');
      const withCertificate = [...cliArgs];
      withCertificate[withCertificate.indexOf(out)] = join(scratch, 'initial.pdf');
      const refused = run([...withCertificate, ...noLimit]);
      assert.equal(refused.status, 1);
      assert.equal(checksByName(resultOf(refused))['Certificate of service absent'], 'fail');
    }
    if (name === 'motion') {
      assert.deepEqual([result.bodyWords, result.pdfBodyWords], [73, 75]);
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
      assert.equal(result.limits.reason, noLimit[1]);
      assert.equal(checksByName(result)['No length limit declared'], 'pass');
      assert.equal(checksByName(result)['Case number blank for new-case packet'], 'pass');
      const comparison = [...cliArgs];
      comparison[comparison.indexOf(out)] = join(scratch, 'motion.pdf');
      const populated = run([...comparison, ...noLimit]);
      assert.equal(populated.status, 1);
      assert.equal(checksByName(resultOf(populated))['Case number blank for new-case packet'], 'fail');
    }
  }
});
