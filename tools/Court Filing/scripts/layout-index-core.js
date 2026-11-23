const layouts = new Map(await Promise.all([
  ['colorado-two-column-boxed', import('./colorado-layout-core.js')],
  ['federal-district-ruled', import('./federal-layout-core.js')],
].map(async ([name, module]) => [name, (await module).default])));

// Preserve the original closing treatment for callers of prepareBody without a layout.
export const defaultLayout = layouts.get('colorado-two-column-boxed');

export function getLayout(rendererProfile, onUnknown) {
  const layout = layouts.get(rendererProfile);
  if (!layout) {
    if (onUnknown) throw onUnknown();
    const name = rendererProfile === undefined ? 'is required' :
      'has unknown layout ' + JSON.stringify(rendererProfile);
    throw new Error('profile.renderer_profile ' + name + '. Expected one of ' + [...layouts.keys()].join(', ') + '.');
  }
  return layout;
}
