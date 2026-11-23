import { normalize, printedBodyText, wordCount } from './body-text-core.js';
import { compositionTitle, cssInches, escapeHtml as esc } from './composition-core.js';
import { SIDES } from './schema-fields-core.js';
import { courtLines, noticeType, partyFor } from './new-york-schema-core.js';

export const partyWidth = 3.75 * 72;
export const columnGap = 0.32 * 72;
export const roleInset = 0.34 * 72;
export const against = '-against-';
export const indexLabel = 'Index No.';
export const judgeLabel = 'Name of Assigned Judge';
export const certificateHeading = 'Word Count Certification';
const blankDate = '________________';
const blankSignature = '________________________________';
const box = checked => checked ? '■' : '□';
export const oralArgument = caption => box(caption.notice.oral_argument_requested) + ' Oral argument is requested';
export const partyName = party => party.name.toUpperCase() + ',';
export const partyRole = party => party.role + (party.role === 'Plaintiff' ? ',' : '.');

function contacts(person, labeled) {
  const [street, ...address] = person.address;
  return [labeled ? 'Address: ' + street : street, ...address,
    (labeled ? 'Telephone number: ' : '') + person.telephone, ...(person.email ? [person.email] : [])];
}

export function signerLines(caption) {
  const { signer } = caption;
  const party = partyFor(caption, signer.represents);
  const notice = caption.document_type === noticeType;
  const role = notice ? 'Attorney in charge for the moving party, ' : 'Attorney for ' + party.role + ' ';
  return ['Dated: ' + blankDate, blankSignature, signer.name, role + party.name, ...contacts(signer, notice)];
}

export function recipientLines(caption, recipient) {
  const { name, party, appearance } = recipient;
  const role = partyFor(caption, party).role;
  return ['TO: ' + name, appearance === 'counsel' ? 'Attorney for ' + role + ' ' + party : role + ', self-represented',
    ...contacts(recipient, true)];
}

export function certificateLines(caption, prepared) {
  return [
    certificateHeading,
    '22 NYCRR § 202.8-b(c)',
    'The printed memorandum body contains ' + wordCount(prepared.bodyText) + ' words.',
    'I certify that this memorandum complies with the applicable word-count limit.',
    ...signerLines(caption),
  ];
}

export function noticeIntro(caption) {
  const { supporting_affiant: affiant, supporting_papers: papers } = caption.notice;
  const affidavit = affiant ? 'Upon the affidavit of ' + affiant + ', sworn to on ' + blankDate + ', and upon ' : 'Upon ';
  return affidavit + papers.join('; ') + ', ' + caption.signer.represents +
    ' will move this Court in Room ______ at the ________________ Courthouse, ____________, New York, on ' +
    blankDate + ', at ______ (a.m./p.m.), for the relief stated below.';
}

export function noticeOptions(caption) {
  return [
    'The above-entitled action is for ' + caption.notice.action_nature + '.',
    '□ This motion is for or relates to interim maintenance or child support.',
    caption.motion.procedure === 'ordinary' ?
      'Good-faith affirmation (disclosure or bill of particulars only): N/A.' :
      'Good-faith affirmation required for disclosure or a bill of particulars.',
    box(caption.notice.seven_day_demand) + ' Pursuant to CPLR 2214(b), answering affidavits, if any, must be served on the undersigned at least seven days before the return date.',
  ];
}

export function validNoticeBody(prepared) {
  const blocks = [...prepared.bodyHtml.matchAll(/<p>([\s\S]*?)<\/p>/gu)];
  return blocks.length === 2 && normalize(prepared.bodyHtml) === normalize(blocks.map(block => block[0]).join(' ')) &&
    ['Relief requested:', 'Grounds:'].every((label, i) => {
      const paragraph = normalize(printedBodyText(blocks[i][1]));
      return paragraph.startsWith(label + ' ') && /[\p{L}\p{N}]/u.test(paragraph.slice(label.length));
    });
}

function css(layout, replay) {
  return `
  @page {
    size: ${layout.page_size} portrait;
    margin: ${SIDES.map(side => cssInches(layout.margins_inches[side])).join(' ')};
    @bottom-center {
      content: counter(page) " / " counter(pages);
      vertical-align: top; padding-top: 6pt;
      font: ${layout.footer.size_pt}pt / 24pt "${layout.footer.font}", serif;
    }
  }
  body { margin: 0; color: #000; background: #fff; font: 12pt / 24pt "${layout.body_font}", serif; orphans: 3; widows: 3; }
  p, h1, h2, h3, h4, h5, h6 { margin: 0; }
  h1, h2, h3, h4, h5, h6 { font-size: 12pt; font-weight: bold; ${replay ? '' : 'break-after: avoid;'} }
  .caption { break-inside: avoid; }
  .court { font-weight: bold; }
  .caption-grid {
    display: grid; grid-template-columns: ${partyWidth}pt minmax(0, 1fr); column-gap: ${columnGap}pt;
    overflow-wrap: anywhere;
  }
  .caption-rule { width: ${partyWidth}pt; display: flex; align-items: center; gap: 0.1in; }
  .caption-rule::before { content: ""; flex: 1; border-top: 1px dashed #000; }
  .party-role { padding-right: ${roleInset}pt; text-align: right; }
  .body, .notice-intro { margin-top: 18pt; }
  .body h1:not(:first-child), .body h2:not(:first-child), .body h3:not(:first-child) { margin-top: 6pt; }
  .body p { text-indent: 0.25in; }
  .body li p, .body td p, .notice .body p { text-indent: 0; }
  .body ol, .body ul { margin: 0 0 6pt; padding-left: 36pt; }
  .body table { line-height: 2; }
  .body code, .body pre { font-family: inherit; }
  .body a { color: inherit; }
  .notice .body, .notice .body p + p, .notice-option { margin-top: 6pt; }
  .signature-block, .recipient { break-inside: avoid; }
  .signature-block { margin-top: 12pt; }
  .signature-block p:nth-child(n+3) { line-height: 16pt; }
  .notice-closing, .certificate { break-before: page; }
  .notice-closing .signature-block { margin-top: 0; }
  .recipient { margin-top: 24pt; }
  .certificate h2 { text-align: center; margin-bottom: 24pt; }
`;
}

const paragraphs = lines => lines.map(line => '<p>' + esc(line) + '</p>').join('\n');
export function newYorkHtml({ caption, layout, prepared, treatment, presentation, replay }) {
  const isNotice = caption.document_type === noticeType;
  if (isNotice && !validNoticeBody(prepared)) {
    throw new Error('New York notice Markdown must contain two paragraphs beginning “Relief requested:” and “Grounds:”.');
  }
  const split = caption.parties.findIndex(party => party.role === 'Defendant');
  const parties = caption.parties.map((party, i) => (i === split ? '<p>' + against + '</p>' : '') +
    '<p>' + esc(partyName(party)) + '</p><p class="party-role">' + esc(partyRole(party)) + '</p>').join('');
  const right = [indexLabel, caption.index_number, judgeLabel, caption.assigned_judge, ...(isNotice ? [oralArgument(caption)] : [])];
  const body = '<div class="body">' + presentation.html + '</div>';
  const signer = '<div class="signature-block">' + paragraphs(signerLines(caption)) + '</div>';
  const recipients = caption.service.recipients.map(recipient =>
    '<div class="recipient">' + paragraphs(recipientLines(caption, recipient)) + '</div>').join('');
  const noticeBody = isNotice ? '<p class="notice-intro">' + esc(noticeIntro(caption)) + '</p>' + body +
    noticeOptions(caption).map(line => '<p class="notice-option">' + esc(line) + '</p>').join('') +
    '<section class="notice-closing">' + signer + recipients + '</section>' : body + signer;
  const [heading, citation, count, statement, ...certSigner] = certificateLines(caption, prepared);
  const certification = treatment.word_count_certificate ? `
    <section class="certificate"><h2>${heading}</h2>
      ${paragraphs([citation, count, statement])}
      <div class="signature-block">${paragraphs(certSigner)}</div>
    </section>` : '';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${compositionTitle(prepared.bodySha256, replay)}</title>
<style>${css(layout, replay)}${presentation.css}</style></head>
<body class="${isNotice ? 'notice' : 'memorandum'}">
  <header class="caption">
    <div class="court">${courtLines(caption).map(esc).join('<br>')}</div>
    <div class="caption-rule">x</div>
    <div class="caption-grid">
      <div class="parties">${parties}</div>
      <div class="docket"><h1>${esc(caption.title)}</h1>${paragraphs(right)}</div>
    </div>
    <div class="caption-rule">x</div>
  </header>
  ${noticeBody}
  ${certification}
</body></html>`;
}
