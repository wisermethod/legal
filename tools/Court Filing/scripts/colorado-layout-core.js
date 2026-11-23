import { coloradoHtml } from './colorado-compose-core.js';
import {
  coloradoCaptionEvidence, coloradoCaptionText, coloradoClosing, judicialEvidence, matchesMetadataSuffix, prepareJudicialClosing,
} from './colorado-evidence-core.js';
import { coloradoSchema } from './colorado-schema-core.js';

export default {
  courtRule: {
    matches: name => /, Colorado$/i.test(name),
    requirement: 'requires a court name ending in ", Colorado".',
  },
  compose: coloradoHtml,
  captionText: coloradoCaptionText,
  closing: coloradoClosing,
  matchesMetadataSuffix,
  captionEvidence: coloradoCaptionEvidence,
  prepareJudicialClosing,
  judicialEvidence,
  schema: coloradoSchema,
  spacing: layout => (tag, kind, insideList) =>
    tag === 'h2' ? 1.4 : kind === 'list' || insideList ? layout.body_line_height : 1,
};
