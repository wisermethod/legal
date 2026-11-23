import { wordCount } from './body-text-core.js';
import { federalCourtLines, federalPartySplit } from './federal-schema-core.js';
import { compositionTitle, escapeHtml as esc } from './composition-core.js';
import { SIDES } from './schema-fields-core.js';

export const complianceHeading = 'CERTIFICATE OF COMPLIANCE';
export const serviceHeading = 'CERTIFICATE OF SERVICE';
export const submitted = 'Respectfully submitted,';
export const actionLabel = 'Civil Action No.';
export const against = '-against-';
export const partyWidth = 0.58;
export const colonWidth = 0.04;
export const blankDate = '____________________';
export const signature = '_____________________________';

export const partyName = party => party.name.toUpperCase().replace(/,$/u, '') + ',';
export const partyRole = (party, defense) => party.role.replace(/[,.]$/u, '') + (defense ? '.' : ',');
export const signerName = signer => signer.name + (signer.role ? ', ' + signer.role : '');
export const contacts = signer => [...signer.address, signer.email, signer.telephone];
export const complianceStatement = words => 'I certify that this memorandum of law contains ' + words +
  ' words, not counting the caption, any index, table of contents, table of authorities, signature blocks or required certificates, ' +
  'as counted by the word-processing program used to prepare it, and that it complies with the word-count limit of Local Civil Rule 7.1(c).';

export function serviceStatement(caption, recipient, date = blankDate) {
  const { method } = caption.service;
  const target = (recipient.counsel_for ? 'counsel for ' + recipient.counsel_for + ', ' : '') + recipient.name;
  const destination = (method.trim().toLowerCase() === 'email' ? recipient.emails : recipient.address).join('; ');
  return 'I certify that on ' + date + ' I served a copy of this ' + caption.title + ' on ' + target + ', by ' + method +
    ' to ' + destination + '.';
}

function federalCss(layout, replay) {
  const margin = SIDES.map(side => layout.margins_inches[side] + 'in').join(' ');
  return `
  @page { size: ${layout.page_size.toLowerCase()}; margin: ${margin}; }
  html, body { margin: 0; padding: 0; }
  body { font-family: '${layout.body_font}', Times, serif; font-size: ${layout.body_font_size_pt}pt; line-height: ${layout.body_line_height}; color: #000; }
  /* Keep each block in source order in Chromium’s PDF text stream. */
  body > * { position: relative; z-index: 0; }
  .federal-caption { break-inside: avoid; line-height: 1.2; isolation: isolate; }
  .court, .title { text-align: center; font-weight: bold; margin: 0 0 12pt; }
  .cap { display: grid; grid-template-columns: ${partyWidth * 100}% ${colonWidth * 100}% 1fr; align-items: center; margin-bottom: 18pt; }
  .cap > * { z-index: 0; }
  .parties { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6pt 8pt 6pt 0; position: relative; overflow-wrap: anywhere; }
  .xmark { position: absolute; right: 0; transform: translate(50%, -50%); }
  .xmark.top { top: 0; }
  .xmark.bot { top: 100%; }
  .role { margin: 0 0 5pt 58%; }
  .against { margin: 5pt 0 5pt 29%; }
  .colons { margin-left: -2pt; align-self: stretch; display: flex; flex-direction: column; justify-content: space-evenly; }
  .number { overflow-wrap: anywhere; }
  .title { position: relative; z-index: 0; text-transform: uppercase; overflow-wrap: anywhere; }
  .body p { margin: 0; text-indent: 0.5in; }
  .body li p, .body td p { text-indent: 0; }
  .body h1, .body h2, .body h3, .body h4, .body h5, .body h6 {
    font-size: ${layout.body_font_size_pt}pt; line-height: ${layout.heading_line_height}; margin: 8pt 0 6pt;
    text-align: center; text-transform: none; ${replay ? '' : 'break-after: avoid;'}
  }
  .body ol, .body ul { margin: 0 0 6pt; padding-left: 36pt; }
  .body table { line-height: ${layout.table_line_height}; }
  .body code, .body pre { font-family: inherit; }
  .closing, .cert { break-inside: avoid; line-height: 1.2; }
  .closing { display: grid; grid-template-columns: 52% 48%; margin-top: 18pt; }
  .closing p { margin: 0 0 4pt; }
  .closing .signature { margin-top: 12pt; }
  .cert { margin-top: 24pt; }
  .cert h3 { font-size: ${layout.body_font_size_pt}pt; text-align: center; margin: 0 0 8pt; }
  .cert p { margin: 0 0 6pt; text-indent: 0.5in; }
`;
}

export function federalHtml({ caption, layout, prepared, treatment, presentation, replay }) {
  const { court, parties, case_number: number, signer, service } = caption;
  const { bodyText, bodySha256 } = prepared;
  const split = federalPartySplit(parties);
  const names = parties.map((party, index) => (index === split ? '<div class="against">' + against + '</div>' : '') +
    '<div>' + esc(partyName(party)) + '</div><div class="role">' + esc(partyRole(party, index >= split)) + '</div>').join('');
  const certificate = (className, heading, statements, name) => `
  <section class="cert ${className}">
    <h3>${heading}</h3>
    ${statements.map(statement => '<p>' + esc(statement) + '</p>').join('')}
    <p>${signature} &nbsp; ${esc(name)}</p>
  </section>`;
  const compliance = treatment.word_count_certificate ?
    certificate('compliance', complianceHeading, [complianceStatement(wordCount(bodyText))], signer.name) : '';
  const proofOfService = service.method !== 'electronic-filing' ?
    certificate('service', serviceHeading, service.recipients.map(recipient => serviceStatement(caption, recipient)),
      service.served_by ?? signer.name) : '';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${compositionTitle(bodySha256, replay)}</title><style>${federalCss(layout, replay)}${presentation.css}</style></head>
<body>
  <header class="federal-caption">
    <div class="court">${federalCourtLines(court).map(esc).join('<br>')}</div>
    <div class="cap">
      <div class="parties"><span class="xmark top">x</span>${names}<span class="xmark bot">x</span></div>
      <div class="colons">${'<span>:</span>'.repeat(parties.length * 3 + 1)}</div>
      <div class="number">${actionLabel} ${esc(number)}</div>
    </div>
    <div class="title">${esc(caption.title)}</div>
  </header>
  <div class="body">${presentation.html}</div>
  <section class="closing">
    <div><p>Dated: ${blankDate}</p>${caption.dated_at ? '<p>' + esc(caption.dated_at) + '</p>' : ''}</div>
    <div><p>${submitted}</p><p class="signature">${signature}</p>
    <p>${esc(signerName(signer))}</p>${contacts(signer).map(contact => '<p>' + esc(contact) + '</p>').join('')}</div>
  </section>
  ${compliance}
  ${proofOfService}
</body></html>`;
}
