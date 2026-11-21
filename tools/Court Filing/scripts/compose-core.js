import { blockBindings, bodyMarks, judicialClosing, printedBodyText, tableHeaderBindings, wordCount } from './body-text-core.js';
import { counselLabel, documentType, SIDES, validateCaption, validateProfile } from './schema-core.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lines(arr) {
  return (arr || []).map(l => `<div>${escapeHtml(l)}</div>`).join('');
}

export function formatPartyName(name, role) {
  const upper = String(name || '').toUpperCase();
  const suffix = role.trim().toLowerCase() === 'plaintiff' ? ';' : '.';
  return `${upper}${suffix}`;
}

function counselInCaption(c) {
  const s = c.signer;
  if (!s || c.caption_counsel === false) return '';
  const label = counselLabel(c);
  return `
    <div class="counsel-block">
      <div class="counsel-label">${escapeHtml(label)}</div>
      <div class="counsel-name">${escapeHtml(s.name)}</div>
      ${lines(s.lines)}
    </div>`;
}

export function captionParties(parties) {
  const separator = parties.findIndex(party => /^defendants?\b/i.test(party.role.trim()));
  return { ordered: parties, separator: separator > 0 ? separator : -1 };
}

/**
 * Colorado district court caption (C.R.C.P. 10 style), modeled on the source caption: two-column header, counsel block under parties on the left,
 * COURT USE ONLY in the upper right, case metadata below, document title in a
 * full-width row at the bottom of the caption box.
 */
function captionTable(c) {
  const partyBlocks = [];
  const { ordered, separator } = captionParties(c.parties);
  for (const [index, p] of ordered.entries()) {
    if (index === separator) partyBlocks.push('<div class="vs">v.</div>');
    partyBlocks.push(
      `<div class="party"><span class="role">${escapeHtml(p.role)}:</span> ${escapeHtml(formatPartyName(p.name, p.role))}</div>`
    );
  }
  const parties = partyBlocks.join('');
  return `
  <table class="caption">
    <tr class="caption-main">
      <td class="cap-left">
        <div class="court-name">${escapeHtml(c.court)}</div>
        <div class="court-addr">${escapeHtml(c.court_address || '')}</div>
        <div class="parties">${parties}</div>
        ${counselInCaption(c)}
      </td>
      <td class="cap-right">
        <div class="cap-right-top">
          <div class="court-use">&#9650; COURT USE ONLY &#9650;</div>
        </div>
        <div class="cap-right-bottom">
          <div><strong>Case No:</strong> ${escapeHtml(c.case_number)}</div>
          <div><strong>Division:</strong> ${escapeHtml(c.division)}</div>
        </div>
      </td>
    </tr>
    <tr class="caption-title-row">
      <td colspan="2" class="doc-title">${escapeHtml(c.title)}</td>
    </tr>
  </table>`;
}

function signatureBlock(s) {
  if (!s) return '';
  return `
  <div class="closing">
    <p>Respectfully submitted,</p>
    <p>Date: ____________________</p>
    <div class="sig-line">_____________________________</div>
    <div class="sig-name">${escapeHtml(s.name)}, ${escapeHtml(s.role || '')}</div>
    ${lines(s.lines)}
  </div>`;
}

function certificateOfService(svc, title, year, signer) {
  if (!svc) return '';
  const recips = (svc.recipients || []).map(r =>
    `<div class="recipient">${escapeHtml(r.name)} (${(r.emails || []).map(escapeHtml).join('; ')})</div>`
  ).join('');
  const firm = svc.firm ? `<div>${escapeHtml(svc.firm)}</div>` : '';
  const firmLines = lines(svc.firm_lines);
  const firmNote = svc.firm_note ? `<div class="firm-note"><em>${escapeHtml(svc.firm_note)}</em></div>` : '';
  return `
  <div class="cert">
    <h2 class="cert-title">CERTIFICATE OF SERVICE</h2>
    <p>I certify that on this ____ day of __________, ${year ?? "____"}, a true and correct copy of the foregoing
    ${escapeHtml(title)} was served by ${escapeHtml(svc.method || 'email')} to:</p>
    <div class="service-list">
      ${recips}
      ${firm}${firmLines}${firmNote}
    </div>
    <div class="sig-line">_____________________________</div>
    <div class="sig-name">${escapeHtml(svc.served_by ?? signer.name)}</div>
  </div>`;
}

function courtCss(layout) {
  const margin = SIDES.map(side => cssInches(layout.margins_inches[side])).join(" ");
  return `
  @page { size: ${layout.page_size.toLowerCase()}; margin: ${margin}; }
  html, body { margin: 0; padding: 0; }
  body { font-family: '${layout.body_font}', Times, serif; font-size: ${layout.body_font_size_pt}pt; color: #000; }

  table.caption { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; margin-bottom: 18pt; table-layout: fixed; }
  table.caption { break-inside: avoid; }
  table.caption td { vertical-align: top; }
  td.cap-left { width: 62%; border-right: 1.5pt solid #000; padding: 8pt 10pt; }
  td.cap-right { width: 38%; padding: 0; }
  .cap-right-top { min-height: 96pt; display: flex; align-items: flex-end; justify-content: center; padding: 8pt 10pt; border-bottom: 1.5pt solid #000; }
  .cap-right-bottom { padding: 8pt 10pt; }
  .cap-right-bottom div { margin: 2pt 0; }
  .court-name { font-weight: bold; text-transform: uppercase; }
  .court-addr { margin-bottom: 10pt; }
  .party { margin: 2pt 0; }
  .party .role { font-weight: bold; }
  .vs { margin: 6pt 0; }
  .court-use { text-align: center; font-weight: bold; width: 100%; }
  .counsel-block { margin-top: 10pt; padding-top: 8pt; border-top: 1pt solid #000; }
  .counsel-label { font-weight: bold; margin-bottom: 2pt; }
  .counsel-name { margin-bottom: 2pt; }
  tr.caption-title-row td.doc-title { border-top: 1.5pt solid #000; text-align: center; font-weight: bold; text-transform: uppercase; line-height: 1.3; padding: 8pt 12pt; }

  .body p { line-height: ${layout.body_line_height}; margin: 0 0 6pt 0; text-align: left; }
  .body h1, .body h4, .body h5, .body h6 { font-size: ${layout.body_font_size_pt}pt; }
  .body code { font-family: inherit; }
  .body h2 { font-size: ${layout.body_font_size_pt}pt; font-weight: bold; line-height: 1.4; margin: 14pt 0 6pt 0; }
  .body h3 { font-size: ${layout.body_font_size_pt}pt; font-weight: bold; font-style: italic; margin: 10pt 0 4pt 0; }
  .body ol, .body ul { line-height: ${layout.body_line_height}; margin: 0 0 6pt 0; padding-left: 36pt; }
  .body em { font-style: italic; }
  .body strong { font-weight: bold; }

  .closing { margin-top: 18pt; line-height: 1.4; break-inside: avoid; }
  .closing p { margin: 12pt 0; }
  .sig-line { margin-top: 18pt; }
  .sig-name { font-weight: bold; }

  .cert { margin-top: 24pt; line-height: 1.4; break-inside: avoid; }
  .cert-title { text-align: center; font-weight: bold; font-size: ${layout.body_font_size_pt}pt; margin: 12pt 0; }
  .cert p { line-height: 1.5; }
  .service-list { margin: 8pt 0 18pt 24pt; }
  .recipient { margin: 2pt 0; }
  .firm-note { margin-top: 2pt; }
`;
}

function buildHtml(caption, layout, bodyHtml, binding) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(binding)}</title><style>${courtCss(layout)}</style></head>
<body>
  ${captionTable(caption)}
  <div class="body">${bodyHtml}</div>
  ${signatureBlock(caption.signer)}
  ${caption.service ? certificateOfService(caption.service, caption.title, layout.certificate_year, caption.signer) : ''}
</body></html>`;
}

function cssInches(value) {
  return value + 'in';
}

export function prepareBody(body, treatment, parseMarkdown, digest) {
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
  const ruledClosing = treatment.judicial_closing &&
    /<p>BY THE COURT *:<\/p>\s*<hr>\s*(?:<p>[\p{L} .,'’-]{1,70}<\/p>\s*)?<p>[\p{L} .,'’-]{0,30}JUDGE\.?<\/p>\s*$/iu.test(bodyHtml) &&
    /BY THE COURT *:\s*\n\s*_{3,} *\r?\n/iu.test(body);
  if (treatment.judicial_closing && !judicialClosing(bodyText, ruledClosing)) {
    throw new Error('Proposed-order Markdown must end with BY THE COURT, a blank signature line and a judge designation.');
  }
  const bodyWords = wordCount(printedBodyText(bodyHtml, false));
  if (!bodyWords) throw new Error('Body Markdown must produce readable filing text. Add the filing text and compose again.');
  return {
    bodyHtml, bodyText, bodyWords, bodySha256: digest(body),
    headers: tableHeaderBindings(bodyHtml),
    paragraphs: blockBindings(bodyHtml, 'p'),
    ruledClosing, marks: bodyMarks(bodyHtml, ruledClosing),
  };
}

export function compose({ caption, body, profile }, parseMarkdown, digest) {
  validateProfile(profile);
  validateCaption(caption, profile);
  const layout = profile.layout;
  const prepared = prepareBody(body, documentType(profile, caption), parseMarkdown, digest);
  return {
    bodySha256: prepared.bodySha256,
    bodyWords: prepared.bodyWords,
    html: buildHtml(caption, layout, prepared.bodyHtml, 'Court Filing ' + prepared.bodySha256),
    pdf: {
      paperSize: layout.page_size,
      margin: SIDES.map(side => cssInches(layout.margins_inches[side])).join(' '),
      printBackground: true,
      footerFormat: layout.footer.format,
      footerPosition: layout.footer.position,
      footerFontSize: layout.footer.size_pt,
      footerSkipFirst: false,
    },
    footerFont: layout.footer.font,
  };
}

export function checkMarkdownToken(token) {
  if (token.type === 'html') {
    throw new Error('Body Markdown contains raw HTML. Rewrite it in supported Markdown. Use Markdown emphasis for underlining, literal superscript characters or inline notation for superscripts, and a Markdown line break or new paragraph for a break.');
  }
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
