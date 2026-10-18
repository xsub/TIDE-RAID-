import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import config from '../vite.config.js';
import {REAL_ASSET_ROOT} from '../src/real-scenery.js';

test('Pages build supports repository subpaths and keeps scenery assets local', () => {
  assert.equal(config.base, './');
  const deployment = new URL('https://xsub.github.io/TIDE-RAID-/');
  const browserAssetRoot = `${config.base}assets/real-scenery/`;
  assert.equal(new URL(`${browserAssetRoot}rock_07-near.glb`, deployment).pathname, '/TIDE-RAID-/assets/real-scenery/rock_07-near.glb');
  assert.equal(REAL_ASSET_ROOT, '/assets/real-scenery/');
  const source = readFileSync(new URL('../src/real-scenery.js', import.meta.url), 'utf8');
  assert.ok(source.includes('import.meta.env?.BASE_URL'));
});
