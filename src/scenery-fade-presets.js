export const SCENERY_FADE_PRESETS = Object.freeze({
  subtle: Object.freeze({amount: 0.35, fadeIn: 0.75, fadeOut: 0.75}),
  balanced: Object.freeze({amount: 0.65, fadeIn: 1, fadeOut: 1.5}),
  strong: Object.freeze({amount: 1, fadeIn: 0.75, fadeOut: 2.5}),
});

const validKind = (kind) => kind === 'tree' || kind === 'building';
export function applySceneryFadePreset(preferences, kind, name) {
  if (!validKind(kind) || !Object.hasOwn(SCENERY_FADE_PRESETS, name)) return false;
  const preset = SCENERY_FADE_PRESETS[name];
  preferences[`${kind}FadeAmount`] = preset.amount;
  preferences[`${kind}FadeInSpeed`] = preset.fadeIn;
  preferences[`${kind}FadeOutSpeed`] = preset.fadeOut;
  return true;
}

export function currentSceneryFadePreset(preferences, kind) {
  if (!validKind(kind)) return 'custom';
  for (const [name, preset] of Object.entries(SCENERY_FADE_PRESETS)) {
    if (preferences[`${kind}FadeAmount`] === preset.amount && preferences[`${kind}FadeInSpeed`] === preset.fadeIn && preferences[`${kind}FadeOutSpeed`] === preset.fadeOut) return name;
  }
  return 'custom';
}

export function resetSceneryFading(preferences, kind = null) {
  if (kind !== null && !validKind(kind)) return false;
  if (kind === null) {
    preferences.sceneryFading = true;
    for (const suffix of ['Amount', 'Speed', 'InSpeed', 'OutSpeed']) preferences[`sceneryFade${suffix}`] = 1;
  }
  for (const target of kind === null ? ['tree', 'building'] : [kind]) {
    for (const suffix of ['Amount', 'InSpeed', 'OutSpeed']) preferences[`${target}Fade${suffix}`] = 1;
  }
  return true;
}
