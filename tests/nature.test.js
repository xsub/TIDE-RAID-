import test from 'node:test';
import assert from 'node:assert/strict';
import {natureLayout, coastHeight, beachWidth} from '../src/nature.js';
import {channel, CHUNK_COUNT, CHUNK_SIZE, START_Z} from '../src/world.js';

test('nature is deterministic, bounded, varied and leaves the navigable channel clear', () => {
  const species = new Set();
  for (let index = 0; index < CHUNK_COUNT; index++) {
    const layout = natureLayout(index);
    assert.deepEqual(layout, natureLayout(index));
    assert.ok(layout.trees.length > 150 && layout.trees.length < 330);
    assert.equal(layout.birds.length, 6);
    for (const [kind, items] of Object.entries(layout)) {
      assert.ok(items.length < 330);
      for (const item of items) {
        assert.ok([item.x, item.y, item.z, item.scale, item.rotation].every(Number.isFinite));
        if (item.species) species.add(item.species);
        if (kind === 'birds' || item.island) continue;
        const banks = channel(item.z);
        assert.ok(item.x < banks.left - 3 || item.x > banks.right + 3);
        assert.ok(item.z <= START_Z - index * CHUNK_SIZE && item.z >= START_Z - (index + 1) * CHUNK_SIZE);
      }
    }
  }
  assert.deepEqual([...species].sort(), ['broadleaf', 'palm', 'pine']);
});

test('terrain and beach boundaries are continuous between streamed sectors', () => {
  for (let index = 0; index < CHUNK_COUNT; index++) {
    const z = START_Z - index * CHUNK_SIZE;
    for (const side of [-1, 1]) {
      assert.ok(beachWidth(z, side) > 0);
      const edge = side < 0 ? channel(z).left : channel(z).right;
      const x = edge + side * (beachWidth(z, side) + 80);
      assert.ok(Math.abs(coastHeight(x, z - 0.0001, 80) - coastHeight(x, z + 0.0001, 80)) < 0.01);
    }
  }
});
