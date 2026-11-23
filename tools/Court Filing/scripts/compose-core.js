import { blockBindings, bodyMarks, markdownWordCount, printedBodyText, tableHeaderBindings, wordCount } from './body-text-core.js';
import { cssInches, REPLAY_PREFIX } from './composition-core.js';
import { defaultLayout, getLayout } from './layout-index-core.js';
import { SIDES } from './schema-fields-core.js';
import { compileCourtPattern, documentType, titleChecks, validateCaption, validateProfile } from './schema-core.js';

export { REPLAY_PREFIX } from './composition-core.js';

export function validateCourtMatch(court, profile) {
  const { renderer_profile: layout, jurisdiction_id: id, court_match: patterns } = profile;
  const name = court.trim();
  const refusal = detail => new Error('Caption court ' + JSON.stringify(court) + ' is outside profile "' + id + '". ' +
    detail + ' A paper for that court needs a profile for that court or the unprofiled route in the Produce Court Filing skill.');
  const { courtRule: rule } = getLayout(layout, () =>
    refusal('The ' + layout + ' layout has no court rule, so no court can be checked against it.'));
  if (!rule.matches(name)) throw refusal('The ' + layout + ' layout ' + rule.requirement);
  if (patterns && !patterns.some(pattern => compileCourtPattern(pattern).test(name))) {
    throw refusal('The court name does not match the profile’s court_match rule.');
  }
}

function resolveTableStyles(headers, presentation) {
  if (!presentation) return [];
  if (presentation.default && headers.length === 0) {
    throw new Error('caption.table_presentation.default needs at least one Markdown pipe table.');
  }
  for (const key of Object.keys(presentation.tables ?? {})) {
    if (Number(key) > headers.length) throw new Error('caption.table_presentation.tables.' + key + ' does not name a Markdown pipe table.');
  }
  return headers.map(({ columns }, index) => {
    const key = index + 1;
    const style = { ...presentation.default, ...presentation.tables?.[key] };
    for (const field of ['column_widths_percent', 'column_alignment', 'header_alignment']) {
      if (Array.isArray(style[field]) && style[field].length > columns) {
        throw new Error('Table ' + key + ' has fewer columns than caption.table_presentation ' + field + '.');
      }
    }
    if (style.column_widths_percent?.reduce((sum, width) => sum + (width ?? 0), 0) > 100) {
      throw new Error('Table ' + key + ' column_widths_percent must total at most 100.');
    }
    if (style.nowrap_columns?.some(column => column > columns) ||
        style.nowrap_columns && new Set(style.nowrap_columns).size !== style.nowrap_columns.length) {
      throw new Error('Table ' + key + ' nowrap_columns must name distinct existing columns.');
    }
    return style;
  });
}

function styleTables(bodyHtml, styles) {
  let index = 0;
  const rules = [];
  const html = bodyHtml.replace(/<table>/g, tag => {
    const style = styles[index++];
    if (!style || !Object.keys(style).length) return tag;
    const table = '.body table[data-table="' + index + '"]';
    const rule = (target, property, value) => rules.push(table + target + ' { ' + property + ': ' + value + '; }');
    const columns = (values, target, property, format = value => value) => values?.forEach((value, i) => {
      if (value !== null) rule(' ' + target + ':nth-child(' + (i + 1) + ')', property, format(value));
    });
    const widths = style.column_widths_percent;
    if (widths) {
      rules.push(table + ' { width: 100%; table-layout: fixed; }');
      columns(widths, 'col', 'width', value => value + '%');
    }
    const align = value => value + ' !important'; // Overrides Marked's GFM column alignment where declared.
    columns(style.column_alignment, 'td', 'text-align', align);
    if (Array.isArray(style.header_alignment)) columns(style.header_alignment, 'th', 'text-align', align);
    else if (style.header_alignment) rule(' th', 'text-align', align(style.header_alignment));
    for (const column of style.nowrap_columns ?? []) rule(' td:nth-child(' + column + ')', 'white-space', 'nowrap');
    for (const cell of ['th', 'td']) {
      const padding = (cell === 'td' ? style.body_cell_padding_pt : undefined) ?? style.cell_padding_pt;
      if (padding !== undefined) rule(' ' + cell, 'padding', [].concat(padding).map(value => value + 'pt').join(' '));
      if (style.vertical_alignment) rule(' ' + cell, 'vertical-align', style.vertical_alignment);
    }
    if (style.font_size_pt !== undefined) rule('', 'font-size', style.font_size_pt + 'pt');
    const cols = widths ? '<colgroup>' + '<col>'.repeat(widths.length) + '</colgroup>' : '';
    return '<table data-table="' + index + '">' + cols;
  });
  return { html, css: rules.join('\n') };
}

export function prepareBody(body, treatment, parseMarkdown, digest, presentation, renderer = defaultLayout) {
  if (typeof body !== 'string' || body.trim() === '') {
    throw new Error('Body markdown must contain filing text.');
  }
  if (/^ {0,3}\[\^[^\]\n]+\]:/m.test(body)) {
    throw new Error('Markdown footnotes are unsupported. Put each note in a numbered paragraph in the body.');
  }
  if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(body.replace(/[\t\r\n]/g, ''))) {
    throw new Error('Body Markdown contains a hidden control character. Use visible filing text.');
  }
  const bodyHtml = parseMarkdown(body);
  const bodyText = printedBodyText(bodyHtml);
  const ruledClosing = treatment.judicial_closing && renderer.prepareJudicialClosing(body, bodyHtml, bodyText);
  const printedWords = wordCount(bodyText);
  if (!printedWords) throw new Error('Body Markdown must produce readable filing text. Add the filing text and compose again.');
  const bodyWords = Math.max(printedWords, markdownWordCount(body));
  const headers = tableHeaderBindings(bodyHtml);
  return {
    bodyHtml, bodyText, bodyWords, bodySha256: digest(body),
    headers, tableStyles: resolveTableStyles(headers, presentation),
    paragraphs: blockBindings(bodyHtml, 'p'),
    ruledClosing, marks: bodyMarks(bodyHtml, ruledClosing),
  };
}

export function compose({ caption, body, profile, replay = false }, parseMarkdown, digest) {
  validateProfile(profile);
  validateCaption(caption, profile, 'caption', replay);
  validateCourtMatch(caption.court, profile);
  const checks = titleChecks(profile, caption);
  const refusal = checks.find(check => check.status === 'fail');
  if (refusal) throw new Error(refusal.detail);
  const layout = profile.layout;
  const treatment = documentType(profile, caption);
  const renderer = getLayout(profile.renderer_profile);
  const prepared = prepareBody(body, treatment, parseMarkdown, digest, caption.table_presentation, renderer);
  const presentation = styleTables(prepared.bodyHtml, prepared.tableStyles);
  const html = renderer.compose({ caption, layout, prepared, treatment, presentation, replay });
  return {
    documentType: caption.document_type,
    checks,
    advisories: checks.filter(check => check.status === 'advisory'),
    bodySha256: prepared.bodySha256,
    bodyWords: prepared.bodyWords,
    html,
    pdfFilenamePrefix: replay ? REPLAY_PREFIX : null,
    pdf: {
      paperSize: layout.page_size,
      margin: SIDES.map(side => cssInches(layout.margins_inches[side])).join(' '),
      printBackground: true,
      ...(renderer.cssFooter ? {} : {
        footerFormat: layout.footer.format,
        footerPosition: layout.footer.position,
        footerFontSize: layout.footer.size_pt,
        footerSkipFirst: false,
      }),
    },
    footerFont: layout.footer.font,
  };
}

const tableConversions = [
  [/(?:\bwidth\s*[:=]|<col\b)/iu, 'column_widths_percent'],
  [/\b(?:text-align\s*:|align\s*=)/iu, 'column_alignment or header_alignment'],
  [/\b(?:white-space\s*:\s*nowrap|nowrap\b)/iu, 'nowrap_columns'],
  [/\b(?:padding(?:-(?:top|right|bottom|left))?\s*:|cellpadding\s*=)/iu, 'cell_padding_pt or body_cell_padding_pt'],
  [/\bfont-size\s*:/iu, 'font_size_pt'],
  [/\b(?:vertical-align\s*:|valign\s*=)/iu, 'vertical_alignment'],
];

export function parseFilingMarkdown(parser, markdown) {
  const tokens = parser.lexer(markdown);
  const html = [];
  parser.walkTokens(tokens, token => { if (token.type === 'html') html.push(token.raw); });
  if (html.length) {
    const source = html.join('\n');
    const constructs = new Set();
    if (/^\s*<style\b/iu.test(markdown)) constructs.add('leading <style> block');
    for (const [, tag] of source.matchAll(/<\/?([a-z][a-z0-9:-]*)\b/giu)) {
      if (tag.toLowerCase() !== 'style' || !constructs.has('leading <style> block')) constructs.add('<' + tag.toLowerCase() + '>');
    }
    if (/<!--/u.test(source)) constructs.add('HTML comment');
    if (/<![^-]|<\?/u.test(source)) constructs.add('HTML declaration');
    if (/\bstyle\s*=/iu.test(source)) constructs.add('inline style attribute');
    const conversions = tableConversions.filter(([pattern]) => pattern.test(source)).map(([, field]) => field);
    const table = /<(?:table|thead|tbody|tr|th|td|colgroup|col)\b/iu.test(source) ?
      ' Convert HTML tables to Markdown pipe tables.' : '';
    const styles = conversions.length ? ' For table styling use caption.table_presentation with ' + conversions.join(', ') + '.' : '';
    throw new Error('Body Markdown contains raw HTML (' + ([...constructs].join(', ') || 'HTML markup') +
      '). Rewrite it in supported Markdown.' + table + styles +
      ' Use Markdown emphasis, literal superscript characters, or Markdown line breaks as needed.');
  }
  parser.walkTokens(tokens, checkMarkdownToken);
  return parser.parser(tokens);
}

function checkMarkdownToken(token) {
  if (token.type === 'text' && /\[\^[^\]\n]+\]/.test(token.raw)) {
    throw new Error('Markdown footnotes are unsupported. Put each note in a numbered paragraph in the body.');
  }
  if (token.type === 'image') throw new Error('Body markdown contains an image. Supply exhibits separately from the filing body.');
  if (token.type === 'list_item' && token.task) throw new Error('Markdown task checkboxes are unsupported. Write the status in words.');
  if (token.type === 'link') {
    if (token.title != null) throw new Error('Markdown link titles are unsupported. Put any necessary title in the visible link text.');
    if (!/^(?:https?:\/\/|mailto:|#)[^\s<>"'\p{Cc}\p{Cf}]+$/iu.test(token.href)) {
      throw new Error('Body Markdown link must use http, https, mailto or an in-document anchor and contain no spaces or attribute punctuation.');
    }
  }
  if (token.type === 'list' && token.ordered && token.start > 2147483647) {
    throw new Error('Markdown list numbering exceeds the supported range.');
  }
}
