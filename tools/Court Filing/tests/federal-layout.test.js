import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveLimits, suggestTypes, validateProfile } from '../scripts/schema-core.js';
import { getLayout } from '../scripts/layout-index-core.js';
import {
  assertChecks, expectFailedMutations, invokeCli, layoutFixture, markdown, pdfTest, replaceField,
  statuses, temp, validatePrintedFixture,
} from './layout-fixtures.mjs';

const { load, caption: fictionalCaption, composeMock, build } = layoutFixture('federal-district-sdny.json');
const longBrief = Array(90).fill(Array(100).fill('record').join(' ')).join('\n\n');

test('federal schema admits a sourced word-only fallback and leaves Colorado page treatment in place', () => {
  const profile = load();
  assert.equal(validateProfile(profile), profile);
  const types = profile.document_types;
  const fallback = types['other-paper'];
  fallback.word_count_certificate = true;
  fallback.length_presets = ['memorandum-words'];
  assert.equal(validateProfile(profile), profile);
  assert.equal(resolveLimits(profile, { document_type: 'other-paper' }).words, 8750);
  const colorado = layoutFixture('colorado-district.json').load();
  colorado.validation.limits['fictional-words'] = { ...profile.validation.limits['memorandum-words'] };
  colorado.document_types['other-paper'].length_presets = ['fictional-words'];
  assert.throws(() => validateProfile(colorado), /page preset/);

  const reply = { ...profile.caption_defaults, document_type: 'reply-memorandum', title: 'Reply Memorandum of Law in Support of a Motion' };
  assert.equal(resolveLimits(profile, reply).words, 3500);
  assert.equal(resolveLimits(profile, reply, { orderPages: 10, orderSource: 'Fictional order' }).words, 3500);
  assert.throws(() => resolveLimits(profile, reply, { noLimit: true }), /not allowed/);
  assert.throws(() => composeMock({ ...reply, document_type: 'memorandum-of-law',
    type_confirmed: { title: reply.title, document_type: 'memorandum-of-law' } }, profile), /matching federal type/);
});

pdfTest('federal memorandum validates from outside the tool with an absolute profile path', t => {
  const directory = temp(t);
  const profile = load();
  profile.jurisdiction_id = 'fictional-alternate-id';
  const copy = join(directory, 'outside-the-tool.json');
  writeFileSync(copy, JSON.stringify(profile));
  const body = Array.from({ length: 23 }, (_, n) => markdown.replace('INTRODUCTION', 'SECTION ' + (n + 1))).join('\n\n') +
    '\n\n1. First example.\n2. Second example.\n\n| Example | Detail |\n| --- | --- |\n| A | One fictional row |';
  const filed = build(directory, 'memorandum', profile.caption_defaults, body, copy);
  const checked = filed.check(filed.renderPdf('correct'));
  assert.ok(checked.pages > 1);
  assert.equal(checked.profile, profile.jurisdiction_id);
  assertChecks(checked, [
    'Court name in caption', 'Parties in caption order', 'Caption colon column', 'Case number in caption',
    'Document title in caption', 'Signer in signature block', 'Word-count certificate present',
    'Certificate of service present', 'Colorado caption strings absent', 'Dashed caption rules', 'Colorado caption box absent',
    'Printed PDF body matches composition', 'Within word limit (8750)', 'Embedded profile fonts', 'Profile type size',
    'Body paragraph spacing', 'Visible margin geometry', 'Page-number footer', 'Visible filing ink',
  ], 'pass');
  assert.doesNotMatch(filed.html, /COURT USE ONLY|Division:|Case No:|a true and correct copy of the foregoing/i);
});

pdfTest('the printed compliance certificate counts the full body including front matter', t => {
  const body = '## Index\n\nExample entries\n\n## Table of Contents\n\nArgument appears below\n\n' +
    '## Table of Authorities\n\nExample v. Sample, 1 Fictional 2.\n\n## Argument\n\n' +
    'The fictional record supports the requested relief.';
  const filed = build(temp(t), 'front-matter', fictionalCaption(), body);
  const pdf = filed.renderPdf('inclusive');
  const checked = filed.check(pdf);
  assert.equal(checked.bodyWords, 26);
  assert.equal(checked.pdfBodyWords, 26);
  assertChecks(checked, [
    'Composed body SHA-256', 'Printed PDF body matches composition',
    'Within word limit (8750)', 'Word-count certificate present',
  ], 'pass');
  const printed = execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }).replace(/\s+/gu, ' ');
  assert.match(printed, /I certify that this brief complies with the applicable word-count limit under Local Civil Rule 7\.1\(c\) and that its body contains 26 words, including any index, table of contents or table of authorities in the body\./u);
});

pdfTest('9,000-word support, opposition and reply briefs retain their caps and certificates', t => {
  const directory = temp(t);
  const profile = join(directory, 'sdny.json');
  writeFileSync(profile, JSON.stringify(load()));
  const cases = [
    ["Brief in Support of Defendant's Motion to Dismiss", 'memorandum-of-law', 'memorandum-words', 8750],
    ['Memorandum in Opposition to the Motion', 'memorandum-of-law', 'memorandum-words', 8750],
    ["Defendant's Reply in Further Support of Its Motion to Dismiss", 'reply-memorandum', 'reply-words', 3500],
    ["Reply to Plaintiff's Opposition", 'reply-memorandum', 'reply-words', 3500],
  ];
  for (const [index, [title, type, preset, maximum]] of cases.entries()) {
    const name = 'brief-' + index;
    const caption = fictionalCaption({ title, document_type: type, service: { method: 'electronic-filing' } });
    const filed = build(directory, name, caption, longBrief, profile);
    const pdf = filed.renderPdf('over-limit');
    const checked = filed.check(pdf, 1);
    assert.equal(checked.bodyWords, 9000);
    assert.equal(checked.pdfBodyWords, 9000);
    assert.equal(checked.limits.preset, preset);
    assertChecks(checked, ['Word-count certificate present', 'Printed PDF body matches composition'], 'pass');
    assertChecks(checked, ['Within word limit (' + maximum + ')'], 'fail');

    const classify = invokeCli(['classify', '--profile', profile, '--title', title], directory);
    assert.equal(classify.status, 0, classify.stderr);
    assert.equal(JSON.parse(classify.stdout).suggestions[0], type);
    for (const document_type of ['other-paper', 'notice-of-motion', 'memorandum-of-law'].filter(value => value !== type)) {
      const stem = join(directory, name + '-' + document_type);
      for (const confirmed of [false, true]) {
        const candidate = { ...caption, document_type };
        if (confirmed) candidate.type_confirmed = { title, document_type };
        writeFileSync(stem + '.json', JSON.stringify(candidate));
        const result = invokeCli(['compose', '--profile', profile, '--caption', stem + '.json',
          '--body', join(directory, name + '.md'), '--out', stem + '.html'], directory);
        assert.equal(result.status, 1, result.stdout);
        assert.match(result.stderr, new RegExp('matching type\\(s\\) ' + type + '.*matching federal type', 'u'));
        assert.equal(existsSync(stem + '.html'), false);
      }
    }

    const document_type = index === 0 ? 'other-paper' : 'notice-of-motion';
    const formerlyUncapped = filed.renderPdf('without-certificate', html =>
      html.replace(/<section class="cert compliance">[\s\S]*?<\/section>/u, ''));
    const result = invokeCli(['validate', '--profile', profile,
      '--caption', join(directory, name + '-' + document_type + '.json'),
      '--body', join(directory, name + '.md'), '--body-sha256', checked.bodySha256, '--pdf', formerlyUncapped], directory);
    assert.equal(result.status, 1, result.stdout);
    const refused = JSON.parse(result.stderr);
    assert.equal(refused.pdfBodyWords, 9000);
    assertChecks(refused, ['Printed PDF body matches composition'], 'pass');
    assertChecks(refused, ['Document type confirmation'], 'fail');
  }
});

test('support and response title variants resolve to the memorandum while replies keep their own type', () => {
  const profile = load();
  for (const title of [
    'Brief in Opposition to the Motion', 'Memorandum in Support of the Motion',
    'Brief in Response to the Motion', 'Memorandum in Response to the Motion',
    'Memorandum of Law in Further Support of the Motion',
    'Memorandum in Further Support of the Motion',
  ]) {
    assert.deepEqual(suggestTypes(profile, title), ['memorandum-of-law', 'other-paper'], title);
  }
  for (const title of ['Reply Brief in Support of the Motion', 'Brief in Reply on the Motion', 'Memorandum in Reply',
    "Defendant's Reply in Further Support of Its Motion to Dismiss", "Reply to Plaintiff's Opposition"]) {
    assert.deepEqual(suggestTypes(profile, title), ['reply-memorandum', 'other-paper'], title);
  }
});

pdfTest('a reconsideration brief retains the default cap and records a sourced order ceiling', t => {
  const source = 'Fictional order dated 2099-01-05, docket entry 12';
  const caption = fictionalCaption({ title: 'Memorandum in Support of the Motion for Reconsideration' });
  const frontMatter = Array(260).fill('entry').join(' ');
  const argument = longBrief.split(/\s+/u).slice(0, 8736).join(' ');
  const body = '## Table of Authorities\n\n' + frontMatter + '\n\n## Argument\n\n' + argument;
  const filed = build(temp(t), 'reconsideration', caption, body);
  const pdf = filed.renderPdf('long');
  const held = filed.check(pdf, 1);
  assert.equal(held.pdfBodyWords, 9000);
  assert.equal(held.bodyWords, 9000);
  assert.equal(held.limits.words, 8750);
  assertChecks(held, ['Within word limit (8750)'], 'fail');
  assertChecks(held, ['Word-count certificate present', 'Printed PDF body matches composition'], 'pass');
  assert.throws(() => resolveLimits(load(), caption, { noLimit: true }), /not allowed/u);
  assert.throws(() => resolveLimits(load(), caption, { orderWords: 9100 }), /--order-source/u);
  const checked = filed.check(pdf, 0, ['--order-max-words', '9100', '--order-source', source]);
  assert.equal(checked.limits.choice, 'order-maxima');
  assert.deepEqual(checked.limits.order, { pages: null, words: 9100, source, aboveProfile: { words: 8750 } });
  assertChecks(checked, ['Within word limit (9100, set by order)', 'Word-count certificate present'], 'pass');
  assertChecks(checked, ['Order ceiling above profile (words)'], 'advisory');
  assert.ok(checked.checks.find(({ label }) => label === 'Order ceiling above profile (words)').detail.includes(source));
});

pdfTest('electronic-filing validation detects punctuated service headings and allows inline discussion', t => {
  const directory = temp(t);
  const caption = fictionalCaption({ service: { method: 'electronic-filing' } });
  const body = 'The fictional record supports the requested relief.\n\n';
  const cases = [
    ['period', 'CERTIFICATE OF SERVICE.', 'fail'],
    ['colon', '## Certificate of Service:', 'fail'],
    ['statement', 'CERTIFICATE OF SERVICE: served by email.', 'fail'],
    ['inline', 'Rule 5 discusses a certificate of service: its treatment depends on the method.', 'pass'],
  ];
  for (const [name, text, status] of cases) {
    const filed = build(directory, name, caption, body + text);
    const checked = filed.check(filed.renderPdf('efile'), status === 'pass' ? 0 : 1);
    assertChecks(checked, ['Certificate of service absent'], status);
    assertChecks(checked, ['Printed PDF body matches composition', 'Federal closing ends the filing'], 'pass');
  }
});

pdfTest('reply, notice, and general paper apply their own word limits and certificate treatment', t => {
  const directory = temp(t);
  const sample = fictionalCaption();
  const efile = { ...sample, service: { method: 'electronic-filing' } };
  const reply = { ...efile, title: 'Reply Brief in Support of the Motion', document_type: 'reply-memorandum' };
  const overlyLong = Array(50).fill(Array(71).fill('record').join(' ')).join('\n\n');
  const builtReply = build(directory, 'reply', reply, overlyLong);
  const replyChecks = statuses(builtReply.check(builtReply.renderPdf('long'), 1));
  assert.equal(replyChecks['Within word limit (3500)'], 'fail');
  assert.equal(replyChecks['Word-count certificate present'], 'pass');
  assert.equal(replyChecks['Certificate of service absent'], 'pass');

  const notice = build(directory, 'notice', { ...efile, title: 'Notice of Motion', document_type: 'notice-of-motion' });
  const noticeChecks = statuses(notice.check(notice.renderPdf('correct')));
  assert.equal(noticeChecks['Certificate of service absent'], 'pass');
  assert.equal(noticeChecks['No length preset for profile document type'], 'pass');
  assert.equal(noticeChecks['Word-count certificate present'], undefined);
  const added = notice.renderPdf('with-service-certificate', html => html.replace('</body>',
    '<section class="cert"><h3>CERTIFICATE OF SERVICE</h3><p>A fictional statement.</p></section></body>'));
  assert.equal(statuses(notice.check(added, 1))['Certificate of service absent'], 'fail');

  const service = { method: 'first-class mail', recipients: [{ name: 'Lane Example',
    address: ['5 Sample Avenue', 'Example City, NY 10000'] }] };
  const general = build(directory, 'general', { ...sample, service, title: 'Status Report', document_type: 'other-paper' });
  const generalChecks = statuses(general.check(general.renderPdf('mail')));
  assert.equal(generalChecks['Certificate of service present'], 'pass');
  assert.equal(generalChecks['No length preset for profile document type'], 'pass');
});

pdfTest('rendered federal defects fail their text, raster and shared checks', t => {
  const caption = fictionalCaption();
  const filed = build(temp(t), 'memo', caption);
  const variants = [
    ['parties', 'JANE EXAMPLE,', 'FICTIONAL PARTY,', 'Parties in caption order'],
    ['separator', '>-against-<', '>v.<', 'Parties in caption order'],
    ['docket', caption.case_number, caption.case_number + ' A', 'Case number in caption'],
    ['title', 'text-transform: uppercase;', '', 'Document title in caption'],
    ['address', caption.signer.address[0], '100 Wrong Street', 'Signer in signature block'],
    ['email', caption.signer.email, 'jane@wrong.invalid', 'Signer in signature block'],
    ['telephone', caption.signer.telephone, '(555) 010-9999', 'Signer in signature block'],
    ['count', /contains \d+ words/u, 'contains 1 words', 'Word-count certificate present'],
    ['service', 'sam@example.invalid', 'wrong@example.invalid', 'Certificate of service present'],
    ['solid-rules', /1px dashed/gu, '1px solid', 'Dashed caption rules'],
    ['body', 'fictional record', 'unrelated record', 'Printed PDF body matches composition'],
    ['font', '.body p {', '.body p { font-size: 10pt;', 'Profile type size'],
    ['spacing', 'line-height: 2; color', 'line-height: 1; color', 'Body paragraph spacing'],
    ['margin', 'margin: 1in 1in 1in 1in', 'margin: 0.5in 1in 1in 0.5in', 'Visible margin geometry'],
  ];
  expectFailedMutations(filed, variants);
});

pdfTest('omitting or blanking each optional input still refuses a page missing required certificates', t => {
  const current = load();
  const caption = current.caption_defaults;
  caption.service.served_by = caption.signer.name;
  caption.service.recipients[0].address = ['5 Sample Avenue'];
  caption.type_confirmed = { title: caption.title, document_type: caption.document_type };
  const style = {
    column_widths_percent: [50, 50], column_alignment: ['left', 'right'], header_alignment: 'center',
    nowrap_columns: [1], cell_padding_pt: 1, body_cell_padding_pt: 1,
    font_size_pt: 12, vertical_alignment: 'middle',
  };
  caption.table_presentation = {
    default: style, tables: { 1: { ...style } },
    smaller_font_authority: { source: 'Fictional order', minimum_font_size_pt: 12 },
  };
  const body = markdown + '\n\n| Key | Value |\n| --- | --- |\n| A | B |';
  const file = build(temp(t), 'optional', caption, body);
  const pdf = file.renderPdf('missing-certificates', html =>
    html.replace(/<section class="cert (?:compliance|service)">[\s\S]*?<\/section>/gu, ''));
  const validatePdf = validatePrintedFixture(pdf, body);
  function refuses(candidate, profile, context) {
    const receipt = validatePdf(candidate, profile);
    assert.equal(receipt.ok, false, context);
    assertChecks(receipt, ['Word-count certificate present', 'Certificate of service present'], 'fail', context);
  }
  refuses(caption, current, 'unmodified inputs');
  const fields = [
    ['dated_at'], ['signer', 'role'], ['service', 'served_by'], ['service', 'recipients', 0, 'counsel_for'],
    ['service', 'recipients', 0, 'address'],
    ['type_confirmed'], ['table_presentation'],
    ...['default', 'tables', 'smaller_font_authority'].map(key => ['table_presentation', key]),
    ...Object.keys(style).flatMap(key => [['table_presentation', 'default', key], ['table_presentation', 'tables', 1, key]]),
  ];
  const fieldName = path => path.reduce((name, key) =>
    name + (typeof key === 'number' && !name.endsWith('.tables') ? '[' + key + ']' : '.' + key), 'caption');
  const required = [
    ['court'], ['case_number'], ['parties'], ['parties', 0, 'name'], ['parties', 0, 'role'],
    ['title'], ['document_type'], ['service'], ['service', 'method'], ['service', 'recipients'],
    ['service', 'recipients', 0, 'name'], ['service', 'recipients', 0, 'emails'],
    ['signer'], ['signer', 'name'], ['signer', 'address'], ['signer', 'email'], ['signer', 'telephone'],
    ...Object.keys(caption.type_confirmed).map(key => ['type_confirmed', key]),
    ...Object.keys(caption.table_presentation.smaller_font_authority).map(key => ['table_presentation', 'smaller_font_authority', key]),
  ];
  for (const path of fields) {
    refuses(replaceField(caption, path, false), current, 'delete ' + fieldName(path));
  }
  const typeField = key => ['document_types', 'memorandum-of-law', key];
  const profileFields = [
    [['availability'], 'profile.availability', true],
    [['fallback_document_type'], 'profile.fallback_document_type', false, 'profile.document_types.other-paper'],
    [['validation', 'double_spacing'], 'profile.validation.double_spacing', false, '.double_spacing needs a sourced'],
    [['court_match'], 'profile.court_match'],
    ...['double_spacing', 'word_count_certificate', 'length_presets', 'title_pattern']
      .map(key => [typeField(key), 'profile.document_types.memorandum-of-law.' + key, false,
        key === 'title_pattern' ? 'requires one of exact_title and title_pattern' : undefined]),
    [typeField('length_mode'), 'profile.document_types.memorandum-of-law.length_mode', true],
  ];
  const rejects = (run, detail) => assert.throws(run, error => error.message.includes(detail), detail);
  for (const blank of [false, true]) {
    for (const path of blank ? [...fields, ...required] : required) {
      rejects(() => validatePdf(replaceField(caption, path, blank), current), fieldName(path));
    }
    for (const [path, detail, optional, missingDetail] of profileFields) {
      const candidate = replaceField(current, path, blank);
      if (!blank && optional) refuses(caption, candidate, 'delete ' + path.join('.'));
      else rejects(() => validatePdf(caption, candidate), blank ? detail : missingDetail ?? detail);
    }
    const exact = structuredClone(current);
    const type = exact.document_types['memorandum-of-law'];
    delete type.title_pattern;
    type.exact_title = caption.title;
    rejects(() => validatePdf(caption, replaceField(exact, typeField('exact_title'), blank)), 'exact_title');
  }
});

test('federal court identity yields the same visible caption for either full-name form', () => {
  const caption = fictionalCaption();
  const canonical = composeMock(caption).html;
  const comma = 'United States District Court, Southern District of New York';
  assert.equal(composeMock({ ...caption, court: ' ' + comma.toUpperCase() + ' ' }).html, canonical);
  assert.match(canonical, /UNITED STATES DISTRICT COURT<br>SOUTHERN DISTRICT OF NEW YORK/);
  assert.throws(() => composeMock({ ...caption, district: 'Southern District of New York' }), /caption\.district is not a recognized field/);
  for (const court of ['United States District Court', caption.court + ' 1:99-cv-00000']) {
    assert.throws(() => composeMock({ ...caption, court }), /layout requires the full United States District Court name/);
  }
  for (const name of ['unknown-layout', '__proto__', 'constructor', 'toString']) {
    assert.throws(() => getLayout(name), /profile\.renderer_profile has unknown layout/);
    assert.throws(() => validateProfile({ ...load(), renderer_profile: name }), /profile\.renderer_profile has unknown layout/);
  }
});

pdfTest('compose and artifact validation refuse substantive court mismatches', t => {
  const directory = temp(t);
  const federal = fictionalCaption();
  const control = build(directory, 'control', federal);
  const pdf = control.renderPdf('correct');
  const checked = control.check(pdf);
  assertChecks(checked, ['Court name in caption'], 'pass');
  const colorado = layoutFixture('colorado-district.json').caption();
  const profileFile = join(directory, 'sdny.json');
  writeFileSync(profileFile, JSON.stringify(load()));
  const body = join(directory, 'control.md');
  const digest = checked.bodySha256;
  const cases = [
    [federal, 'United States District Court for the Eastern District of New York', profileFile, 'court_match rule'],
    [federal, colorado.court, profileFile, 'federal-district-ruled layout'],
    [colorado, federal.court, 'colorado-district', 'colorado-two-column-boxed layout'],
  ];
  for (const [index, [caption, court, profile, reason]] of cases.entries()) {
    const captionFile = join(directory, 'mismatch-' + index + '.json');
    const out = join(directory, 'mismatch-' + index + '.html');
    writeFileSync(captionFile, JSON.stringify({ ...caption, court }));
    const input = ['--caption', captionFile, '--body', body, '--profile', profile];
    for (const args of [
      ['compose', ...input, '--out', out],
      ['validate', ...input, '--pdf', pdf, '--body-sha256', digest],
    ]) {
      const result = invokeCli(args, directory);
      assert.equal(result.status, 1, result.stderr || result.stdout);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /Caption court .* is outside profile/);
      assert.ok(result.stderr.includes(court), result.stderr);
      assert.ok(result.stderr.includes(reason), result.stderr);
    }
    assert.equal(existsSync(out), false);
  }
  const implicit = invokeCli(['classify', '--profile', 'federal-district-sdny', '--title', federal.title], directory);
  assert.equal(implicit.status, 1, implicit.stdout);
  assert.match(implicit.stderr, /requires an absolute JSON path/);
});
