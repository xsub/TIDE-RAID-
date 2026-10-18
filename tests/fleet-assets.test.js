import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {TRAFFIC_TYPES} from '../src/traffic.js';

test('shipped Kenney models include every referenced texture and the original license', () => {
  const directory = new URL('../public/assets/watercraft/', import.meta.url);
  for (const name of ['boat-speed-c', ...TRAFFIC_TYPES.map((type) => type.model)]) {
    const data = readFileSync(new URL(`${name}.glb`, directory));
    assert.equal(data.toString('ascii', 0, 4), 'glTF');
    const manifest = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)));
    for (const image of manifest.images ?? []) if (image.uri && !image.uri.startsWith('data:')) assert.ok(existsSync(new URL(image.uri, directory)));
  }
  assert.match(readFileSync(new URL('License.txt', directory), 'utf8'), /Creative Commons Zero, CC0/);
});
