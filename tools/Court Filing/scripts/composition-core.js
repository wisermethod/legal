export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const REPLAY_LABEL = 'Not for filing';
export const REPLAY_PREFIX = REPLAY_LABEL + ' - ';
export const REPLAY_TITLE_SUFFIX = ' | ' + REPLAY_LABEL;

export function compositionTitle(bodySha256, replay = false, metadataSuffix = '') {
  return 'Court Filing ' + bodySha256 + metadataSuffix +
    (replay ? REPLAY_TITLE_SUFFIX : '');
}

export function cssInches(value) {
  return value + 'in';
}
