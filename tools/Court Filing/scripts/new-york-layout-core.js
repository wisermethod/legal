import { newYorkHtml } from './new-york-compose-core.js';
import { newYorkCaptionText, newYorkClosing, newYorkPdfEvidence, newYorkRuling, rulingChecks } from './new-york-evidence-core.js';
import { newYorkCourt, newYorkSchema } from './new-york-schema-core.js';

export default {
  courtRule: {
    matches: name => Boolean(newYorkCourt(name)),
    requirement: 'requires the whole name of New York State Supreme Court and a recognized New York county if included.',
  },
  compose: newYorkHtml,
  cssFooter: true,
  captionText: newYorkCaptionText,
  closing: newYorkClosing,
  captionEvidence: { checks: rulingChecks, inspect: newYorkRuling },
  pdfEvidence: newYorkPdfEvidence,
  schema: newYorkSchema,
  spacing: layout => () => layout.body_line_height,
};
