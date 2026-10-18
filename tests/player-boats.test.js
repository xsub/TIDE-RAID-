import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PLAYER_BOATS, PLAYER_LENGTH} from '../src/player-boats.js';
import {VESSEL_STYLES} from '../src/vessels.js';
import {loadFleet} from '../src/fleet.js';
import {readPreferences, savePreferences} from '../src/preferences.js';

test('every fleet vessel is selectable and fits the shared player length', async () => {
  assert.deepEqual(PLAYER_BOATS.map((entry) => entry.model).sort(), Object.keys(VESSEL_STYLES).sort());
  const factory = await loadFleet();
  const geometries = new Set();
  const materials = new Set();
  for (const entry of PLAYER_BOATS) {
    const model = factory(entry.model, PLAYER_LENGTH);
    const bounds = new THREE.Box3().setFromObject(model);
    assert.ok(Math.abs(bounds.max.z - bounds.min.z - PLAYER_LENGTH) < 1e-6);
    model.traverse((child) => {
      if (!child.isMesh) return;
      geometries.add(child.geometry); materials.add(child.material);
      assert.ok(child.geometry.attributes.position.array.every(Number.isFinite));
    });
  }
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
});

test('boat preference migrates safely and persists every playable selection', () => {
  assert.equal(readPreferences(undefined).playerBoat, 'boat-speed-c');
  for (const playerBoat of [null, 'invalid', {}, 12]) {
    assert.equal(readPreferences({getItem: () => JSON.stringify({playerBoat})}).playerBoat, 'boat-speed-c');
  }
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  for (const entry of PLAYER_BOATS) {
    savePreferences(storage, {...readPreferences(undefined), playerBoat: entry.model});
    assert.equal(readPreferences(storage).playerBoat, entry.model);
  }
});
