import { federalHtml } from './federal-compose-core.js';
import { federalCaptionText, federalClosing, federalRuling, federalRulingChecks } from './federal-evidence-core.js';
import { federalCourtLines, federalSchema } from './federal-schema-core.js';

export default {
  courtRule: {
    matches: name => Boolean(federalCourtLines(name)),
    requirement: 'requires the full United States District Court name including its district.',
  },
  compose: federalHtml,
  captionText: federalCaptionText,
  closing: federalClosing,
  captionEvidence: { checks: federalRulingChecks, inspect: federalRuling },
  schema: federalSchema,
  spacing: layout => (_tag, kind, insideList) => {
    if (kind === 'heading') return layout.heading_line_height;
    if (kind === 'list' || insideList) return layout.body_line_height;
    return kind === 'table' ? layout.table_line_height : 1;
  },
};
