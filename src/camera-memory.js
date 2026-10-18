const fields = {cameraAngle: [0, 360], cameraZoom: [0.5, 8], cameraElevation: [5, 85], cameraHeight: [3, 500]};
export function cameraMemory(saved = {}) {
  const result = {};
  for (const mode of ['chase', 'arcade', 'wreck']) {
    const source = saved?.[mode];
    if (!source || typeof source !== 'object') continue;
    const entry = {manualCamera: source.manualCamera === true};
    for (const [name, [minimum, maximum]] of Object.entries(fields)) if (Number.isFinite(source[name]) && source[name] >= minimum && source[name] <= maximum) entry[name] = source[name];
    result[mode] = entry;
  }
  return result;
}
export function rememberCamera(settings, from, to) {
  settings.cameraViews ??= {};
  if (from !== 'pilot') settings.cameraViews[from] = Object.fromEntries([...Object.keys(fields), 'manualCamera'].map((name) => [name, settings[name]]));
  if (to !== 'pilot') Object.assign(settings, {cameraAngle: 20, cameraZoom: 1, cameraElevation: 30, cameraHeight: 15, manualCamera: false}, settings.cameraViews[to]);
}
