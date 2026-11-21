import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync,
  statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { Marked } from 'marked';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { checkMarkdownToken, compose } from '../scripts/compose-core.js';
import { resolveLimits, validateCaption, validateProfile } from '../scripts/schema-core.js';
import { countWords, validate } from '../scripts/validate-core.js';

const tool = fileURLToPath(new URL('..', import.meta.url));
const cli = join(tool, 'scripts', 'court-filing.js');
const asset = name => join(tool, 'assets', name);
const profilePath = join(tool, 'profiles', 'colorado-district.json');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const example = () => readJson(asset('example-caption.json'));
const profile = () => readJson(profilePath);
const body = () => readFileSync(asset('example-body.md'), 'utf8');
const parse = new Marked({ walkTokens: checkMarkdownToken }).parse;
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
  caption.parties.push({ role: 'Defendant', name: 'Second <Party>' });
  caption.title = 'An "Example" & Request';
  const composed = compose({ caption, body: body(), profile: profile() }, parse);
  assert.match(composed.html, /@page \{ size: letter; margin: 1in 1in 1in 1in; \}/);
  assert.match(composed.html, /font-family: 'Times New Roman', Times, serif; font-size: 12pt/);
  assert.match(composed.html, /\.body p \{ line-height: 2;/);
  assert.match(composed.html, /\.closing \{[^}]+break-inside: avoid/);
  assert.match(composed.html, /row[^>]*>\s*<td colspan="2" class="doc-title">An &quot;Example&quot; &amp; Request/);
  assert.match(composed.html, /&#9650; COURT USE ONLY &#9650;/);
  assert.match(composed.html, /Plaintiff:<\/span> ROWAN EXAMPLE;/);
  assert.match(composed.html, /Defendant:<\/span> SECOND &lt;PARTY&gt;\./);
  assert.equal((composed.html.match(/class="vs">v\./g) ?? []).length, 2);
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
  assert.doesNotMatch(compose({ caption, body: body(), profile: profile() }, parse).html, /class="counsel-block"/);
  caption.caption_counsel = true;
  caption.counsel_label = 'Counsel for Applicant:';
  assert.match(compose({ caption, body: body(), profile: profile() }, parse).html, /class="counsel-label">Counsel for Applicant:/);
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
  assert.deepEqual(resolveLimits(profile()), { pages: null, words: null, preset: null });
  assert.deepEqual(resolveLimits(profile(), 'rule-12-or-56-reply-pages'), {
    pages: 15, words: null, preset: 'rule-12-or-56-reply-pages',
  });
  assert.throws(() => resolveLimits(profile(), 'general-motion-words', 10), /cannot be combined/);
  assert.throws(() => resolveLimits(profile(), undefined, 1.5), /--max-pages must be a positive integer/);
});

test('the caption requires service or one exact, profile-listed no-certificate reason', () => {
  const { service, ...initial } = example();
  const listed = profile();
  const reason = 'initial-complaint-before-service';
  const declared = { ...initial, no_service_certificate: reason };
  assert.deepEqual(validateCaption(declared, listed), declared);
  assert.throws(() => validateCaption(initial, listed), /exactly one of service and no_service_certificate/);
  assert.throws(() => validateCaption({ ...declared, service }, listed), /exactly one of service and no_service_certificate/);
  for (const refused of ['not-listed', 'constructor', reason + ' ', 'before-' + reason]) {
    assert.throws(() => validateCaption({ ...initial, no_service_certificate: refused }, listed), /no_service_certificate/);
  }
  assert.throws(() => validateCaption({ ...initial, no_service_certificate: true }, listed), /no_service_certificate/);
  delete listed.no_service_certificate_reasons;
  assert.throws(() => validateCaption(declared, listed), /no_service_certificate is not listed/);
  assert.deepEqual(validateCaption({ ...initial, service }, listed), { ...initial, service });
  listed.no_service_certificate_reasons = { [reason]: '' };
  assert.throws(() => validateProfile(listed), /no_service_certificate_reasons.*must be non-blank/);
});

test('using a profile declaration never clears missing PDF evidence', () => {
  const { service, ...initial } = example();
  const caption = { ...initial, no_service_certificate: 'initial-complaint-before-service' };
  const currentProfile = profile();
  const result = validate({ pdf: new Uint8Array(), caption, profile: currentProfile, limits: resolveLimits(currentProfile, undefined, 1, 10) }, () => null);
  assert.equal(result.ok, false);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(checksByName(result)['Signer name present'], 'not_checked');
  assert.equal(checksByName(result)['Within page limit (1)'], 'not_checked');
  assert.equal(checksByName(result)['Within word limit (10)'], 'not_checked');
  assert.equal(checksByName(result)['Page-number footer'], 'not_checked');
  assert.deepEqual(result.checks.find(check => check.status === 'not_applicable'), {
    label: 'Certificate of service present',
    status: 'not_applicable',
    detail: 'Not applicable by declaration (' + caption.no_service_certificate + '): ' +
      currentProfile.no_service_certificate_reasons[caption.no_service_certificate],
  });
  assert.equal(result.checks.some(check => check.label.startsWith('Service email')), false);
});

test('compose refuses raw HTML, image loads and non-document links', () => {
  for (const [markdown, expected] of [
    ['<style>body{font-size:1px}</style>', /raw HTML/],
    ['![Exhibit](https://example.invalid/asset.png)', /contains an image/],
    ['[private file](file:///missing)', /link must use/],
  ]) {
    assert.throws(() => compose({ caption: example(), body: markdown, profile: profile() }, parse), expected);
  }
  assert.match(parse('A [citation](https://example.invalid/opinion).'), /<a href="https:\/\/example.invalid\/opinion">citation<\/a>/);
});

test('word counter counts visible body text and leaves out markup and destinations', () => {
  const tick = String.fromCharCode(96);
  const markdown = 'Before **bold** and *italic*, [site text](https://example.invalid/).\n\n' +
    tick + 'one two' + tick + '.\n\n- Item&nbsp;one\n- Item two.';
  assert.equal(countWords(parse(markdown)), 12);
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

test('CLI omits the certificate only for a listed declaration and rejects it on both commands otherwise', t => {
  const scratch = temp(t);
  const caption = join(scratch, 'caption.json');
  const output = join(scratch, 'initial.html');
  const { service, ...initial } = example();
  initial.title = 'Fictional Initial Complaint';
  const composeArgs = ['compose', '--body', asset('example-body.md'), '--caption', caption,
    '--profile', 'colorado-district', '--out', output];
  const validateArgs = ['validate', '--pdf', join(scratch, 'unwritten.pdf'), '--caption', caption,
    '--profile', 'colorado-district'];
  for (const fields of [{}, { no_service_certificate: 'unsupported-reason' },
    { service, no_service_certificate: 'initial-complaint-before-service' }]) {
    writeFileSync(caption, JSON.stringify({ ...initial, ...fields }));
    for (const args of [composeArgs, validateArgs]) {
      const refused = run(args);
      assert.equal(refused.status, 1);
      assert.equal(refused.stdout, '');
      assert.match(refused.stderr, /no_service_certificate/);
    }
    assert.equal(existsSync(output), false);
  }
  writeFileSync(caption, JSON.stringify({ ...initial, no_service_certificate: 'initial-complaint-before-service' }));
  const composed = run(composeArgs);
  assert.equal(composed.status, 0, composed.stderr);
  const html = readFileSync(JSON.parse(composed.stdout).html, 'utf8');
  assert.doesNotMatch(html, /CERTIFICATE OF SERVICE|morgan@example.invalid|service@example.invalid/);
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
  if (process.platform !== 'win32') assert.equal(statSync(copyMarker).mode & 0o777, 0o600);
  const again = copyRun(['check', '--install']);
  assert.doesNotMatch(again.stderr, /First run: installing dependencies/);
  assert.equal(again.status, 0);
});

async function fixture(t, options = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const caption = example();
  const pages = options.pages ?? 2;
  for (let number = 1; number <= pages; number++) {
    const page = pdf.addPage(options.secondSize && number === 2 ? options.secondSize : [612, 792]);
    const lines = number === 1 ? [
      options.caseNumber ?? caption.case_number,
      options.title ?? caption.title.toUpperCase(),
      options.marker ?? 'COURT USE ONLY',
      caption.signer.name,
    ] : [];
    if (number === pages && !options.withoutCertificate) lines.push('CERTIFICATE OF SERVICE', 'morgan@example.invalid',
      options.email ?? 'service@example.invalid');
    lines.forEach((line, i) => page.drawText(line, { x: 75, y: 700 - 30 * i, size: 12, font }));
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

function validateFile(path, ...extra) {
  const cliResult = run(['validate', '--pdf', path, '--caption', asset('example-caption.json'), '--profile', 'colorado-district', ...extra]);
  assert.equal(cliResult.stderr, '', cliResult.stderr);
  return { status: cliResult.status, result: JSON.parse(cliResult.stdout) };
}

const pdfTest = (name, fn) => test(name, { skip: poppler ? false : 'Poppler PDF inspection programs are unavailable' }, fn);

pdfTest('browser-free PDF verifies both limits, text, size, footer and ink, and exposes unembedded fonts', async t => {
  const path = await fixture(t);
  const { status, result } = validateFile(path, '--max-pages', '2', '--max-words', '73', '--body', asset('example-body.md'));
  assert.equal(status, 1);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(result.bodyWords, 73);
  assert.deepEqual(result.checks.filter(check => check.status !== 'pass').map(check => check.label), ['Embedded profile fonts']);
  assert.match(result.checks.find(check => check.label === 'Embedded profile fonts').detail, /Times-Roman \(not embedded\)/);
});

pdfTest('browser-free PDF catches an over-limit PDF, partial strings and missing word evidence', async t => {
  const path = await fixture(t, {
    caseNumber: 'X2099CV000000', email: 'service@example.invalid.example.invalid',
    title: 'Unrelated Heading', marker: 'Another Marker',
  });
  const { status, result } = validateFile(path, '--max-pages', '1', '--max-words', '5');
  assert.equal(status, 1);
  const checks = checksByName(result);
  assert.equal(checks['Within page limit (1)'], 'fail');
  assert.equal(checks['Within word limit (5)'], 'not_checked');
  assert.equal(checks['Case number present'], 'fail');
  assert.equal(checks['Document title present'], 'fail');
  assert.equal(checks['COURT USE ONLY caption marker'], 'fail');
  assert.equal(checks['Service email present: service@example.invalid'], 'fail');
  assert.equal(checks['Service email present: morgan@example.invalid'], 'pass');
  assert.equal(checksByName(validateFile(path, '--body', asset('example-body.md'), '--max-words', '5').result)['Within word limit (5)'], 'fail');
});

pdfTest('default service requirements hold a PDF with the certificate missing', async t => {
  const { status, result } = validateFile(await fixture(t, { withoutCertificate: true }));
  assert.equal(status, 1);
  assert.equal(checksByName(result)['Certificate of service present'], 'fail');
  assert.equal(checksByName(result)['Service email present: service@example.invalid'], 'fail');
});

pdfTest('browser-free PDF fails wrong geometry on a later page and missing, incorrect or invisible footers', async t => {
  const alternate = await fixture(t, { secondSize: [595.28, 841.89] });
  const a4 = checksByName(validateFile(alternate).result);
  assert.equal(a4['Page size'], 'fail');
  assert.equal(a4['Visible margin geometry'], 'not_checked');
  const outside = await fixture(t, { outside: true });
  assert.equal(checksByName(validateFile(outside).result)['Visible margin geometry'], 'fail');
  for (const bad of [{ withoutFooter: true }, { wrongTotal: 3 }, { footerInBody: true }, { invisibleFooter: true }]) {
    const path = await fixture(t, bad);
    assert.equal(checksByName(validateFile(path).result)['Page-number footer'], 'fail');
  }
});

pdfTest('malformed PDF returns one failed validation result with downstream evidence unavailable', t => {
  const file = join(temp(t), 'broken.pdf');
  writeFileSync(file, '%PDF-1.4\ncorrupt');
  const value = validateFile(file);
  assert.equal(value.status, 1);
  assert.equal(value.result.ok, false);
  const checks = checksByName(value.result);
  assert.equal(checks['PDF parses'], 'fail');
  assert.equal(checks['Case number present'], 'not_checked');
  assert.equal(checks['Visible margin geometry'], 'not_checked');
});

test('missing PDF system programs produce named unchecked results and presence commands', t => {
  const file = join(temp(t), 'fixture.pdf');
  writeFileSync(file, '%PDF-1.4');
  const response = run(['validate', '--pdf', file, '--caption', asset('example-caption.json'),
    '--profile', 'colorado-district'], { env: { ...process.env, PATH: '' } });
  assert.equal(response.status, 1);
  assert.equal(response.stderr, '');
  const result = JSON.parse(response.stdout);
  assert.equal(result.ok, false);
  assert.equal(checksByName(result)['PDF parses'], 'not_checked');
  assert.equal(checksByName(result)['Page size'], 'not_checked');
  assert.deepEqual(result.unavailable.map(entry => entry.check),
    ['pdfinfo -v', 'pdftotext -v', 'pdffonts -v', 'pdftoppm -v']);
});

test('unavailable inspection evidence cannot produce a successful gate', () => {
  const result = validate({ pdf: new Uint8Array(), caption: example(), profile: profile(), limits: resolveLimits(profile()) }, () => null);
  assert.equal(result.ok, false);
  assert.equal(result.result, 'VALIDATION FAILED');
  assert.equal(checksByName(result)['Page-number footer'], 'not_checked');
});

pdfTest('Chromium round trip through the CLI produces an all-pass filing', async t => {
  const driver = process.env.COURT_FILING_PLAYWRIGHT;
  if (!driver) return t.skip('No Playwright driver supplied via COURT_FILING_PLAYWRIGHT.');
  const { chromium } = await import(pathToFileURL(driver));
  let browser;
  try { browser = await chromium.launch(); } catch (error) {
    if (/Executable doesn't exist|Failed to launch/.test(error.message)) return t.skip('No usable Chromium build for the supplied Playwright driver.');
    throw error;
  }
  t.after(() => browser.close());
  const scratch = temp(t);
  const { service, ...initial } = example();
  const initialPath = join(scratch, 'initial.json');
  writeFileSync(initialPath, JSON.stringify({
    ...initial, title: 'Fictional Initial Complaint', no_service_certificate: 'initial-complaint-before-service',
  }));
  for (const [label, caption] of [['motion', asset('example-caption.json')], ['initial', initialPath]]) {
    const result = run(['compose', '--body', asset('example-body.md'), '--caption', caption,
      '--profile', 'colorado-district', '--out', join(scratch, label + '.html')]);
    assert.equal(result.status, 0, result.stderr);
    const { html, pdf, footerFont } = JSON.parse(result.stdout);
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    await page.setContent(readFileSync(html, 'utf8'));
    const [top, right, bottom, left] = pdf.margin.split(' ');
    const footer = pdf.footerFormat.replace('{page}', '<span class="pageNumber"></span>')
      .replace('{pages}', '<span class="totalPages"></span>');
    const out = join(scratch, label + '.pdf');
    await page.pdf({
      path: out, format: pdf.paperSize, preferCSSPageSize: true, margin: { top, right, bottom, left },
      printBackground: pdf.printBackground, displayHeaderFooter: true, headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;text-align:' + pdf.footerPosition + ';font-size:' + pdf.footerFontSize +
        "pt;font-family:'" + footerFont + "',serif\">" + footer + '</div>',
    });
    await page.close();
    const limits = label === 'motion' ? ['--limit', 'general-motion-words'] : ['--max-words', '73'];
    const args = ['validate', '--pdf', out, '--caption', caption, '--profile', 'colorado-district',
      '--body', asset('example-body.md')];
    const validation = run([...args, ...limits]);
    assert.equal(validation.status, 0, validation.stdout || validation.stderr);
    const validated = JSON.parse(validation.stdout);
    assert.equal(validated.result, 'ALL CHECKS PASSED');
    assert.ok(validated.pages >= 2);
    assert.equal(checksByName(validated)['Certificate of service present'], label === 'motion' ? 'pass' : 'not_applicable');
    if (label === 'initial') {
      const tooLong = run([...args, '--max-pages', '1', '--max-words', '72']);
      assert.equal(tooLong.status, 1);
      assert.equal(checksByName(JSON.parse(tooLong.stdout))['Within word limit (72)'], 'fail');
    }
  }
});
