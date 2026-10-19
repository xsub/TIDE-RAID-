import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {SCENERY_FADE_PRESETS, applySceneryFadePreset, currentSceneryFadePreset, resetSceneryFading} from '../src/scenery-fade-presets.js';

const defaults = () => readPreferences({getItem: () => null});
test('presets are immutable, bounded and update only the selected kind', () => {
  assert.ok(Object.isFrozen(SCENERY_FADE_PRESETS));
  for (const kind of ['tree', 'building']) for (const name of ['subtle', 'balanced', 'strong']) {
    const preferences = {...defaults(), sceneryFading: false, sceneryFadeSpeed: 2, camera: 'pilot'};
    const before = {...preferences};
    assert.equal(applySceneryFadePreset(preferences, kind, name), true);
    assert.equal(currentSceneryFadePreset(preferences, kind), name);
    for (const key of Object.keys(before)) if (!key.startsWith(`${kind}Fade`)) assert.deepEqual(preferences[key], before[key]);
    assert.ok(Object.isFrozen(SCENERY_FADE_PRESETS[name]));
    assert.ok(preferences[`${kind}FadeAmount`] > 0 && preferences[`${kind}FadeAmount`] <= 1);
    for (const suffix of ['InSpeed', 'OutSpeed']) assert.ok(preferences[`${kind}Fade${suffix}`] >= 0.25 && preferences[`${kind}Fade${suffix}`] <= 3);
    preferences[`${kind}FadeAmount`] = 0.1;
    assert.equal(currentSceneryFadePreset(preferences, kind), 'custom');
  }
});
test('preset values persist without extra preset identity state', () => {
  let saved; const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  const preferences = defaults();
  applySceneryFadePreset(preferences, 'tree', 'subtle'); applySceneryFadePreset(preferences, 'building', 'strong');
  savePreferences(storage, preferences);
  const restored = readPreferences(storage);
  assert.equal(currentSceneryFadePreset(restored, 'tree'), 'subtle');
  assert.equal(currentSceneryFadePreset(restored, 'building'), 'strong');
});
test('per-kind and all-fading resets restore defaults without touching gameplay settings', () => {
  const preferences = {...defaults(), sceneryFading: false, sceneryFadeSpeed: 3, volume: 0.2, camera: 'wreck'};
  applySceneryFadePreset(preferences, 'tree', 'subtle'); applySceneryFadePreset(preferences, 'building', 'strong');
  const house = preferences.buildingFadeOutSpeed;
  resetSceneryFading(preferences, 'tree');
  assert.equal(preferences.treeFadeAmount, 1); assert.equal(preferences.buildingFadeOutSpeed, house);
  assert.equal(preferences.sceneryFading, false); assert.equal(preferences.sceneryFadeSpeed, 3);
  resetSceneryFading(preferences);
  const original = defaults();
  for (const key of Object.keys(original).filter((key) => /^(scenery|tree|building)Fad/.test(key))) assert.equal(preferences[key], original[key]);
  assert.equal(preferences.volume, 0.2); assert.equal(preferences.camera, 'wreck');
});
test('invalid presets and kinds leave settings untouched and repeated application is deterministic', () => {
  const preferences = defaults(); const before = structuredClone(preferences);
  assert.equal(applySceneryFadePreset(preferences, 'rock', 'strong'), false);
  assert.equal(applySceneryFadePreset(preferences, 'tree', 'toString'), false);
  assert.equal(resetSceneryFading(preferences, 'rock'), false);
  assert.deepEqual(preferences, before);
  applySceneryFadePreset(preferences, 'tree', 'balanced');
  const applied = structuredClone(preferences);
  applySceneryFadePreset(preferences, 'tree', 'balanced'); assert.deepEqual(preferences, applied);
});
