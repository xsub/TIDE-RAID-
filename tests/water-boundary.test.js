import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryAtlas, sampleBoundary, BOUNDARY_WIDTH, BOUNDARY_HEIGHT} from '../src/water-boundary.js';
import {channel, chunkFeatures} from '../src/world.js';
import {harborLayout} from '../src/harbor-layout.js';
import {sampleWave} from '../src/waves.js';

test('boundary atlas is cached, bounded and resolves islands, rocks, sandbanks and docks', () => {
  const atlas = boundaryAtlas();
  assert.equal(atlas, boundaryAtlas());
  assert.equal(atlas.byteLength, BOUNDARY_WIDTH * BOUNDARY_HEIGHT);
  assert.equal(atlas.byteLength, 524288);
  for (const index of [1, 12, 40, 80]) {
    for (const feature of chunkFeatures(index)) {
      assert.ok(sampleBoundary(feature.x, feature.z).distance < 0, feature.kind);
      assert.ok(sampleBoundary(feature.x + feature.radius + 12, feature.z).distance > 0);
    }
    const banks = channel(-index * 200);
    assert.ok(sampleBoundary(banks.right + 10, -index * 200).distance < 0);
  }
  for (const dock of harborLayout(0).docks) assert.ok(sampleBoundary(dock.x, dock.z).distance < 1);
});

test('near-land wave gradients and temporal velocity match finite differences', () => {
  const epsilon = 0.00001;
  const island = chunkFeatures(12).find((feature) => feature.kind === 'island');
  for (const [x, z] of [[island.x + island.radius + 5, island.z], [channel(-3000).left + 10, -3000]]) {
    const time = 3.4;
    const wave = sampleWave(x,z,time);
    const dx = (sampleWave(x+epsilon,z,time).h-sampleWave(x-epsilon,z,time).h)/(2*epsilon);
    const dz = (sampleWave(x,z+epsilon,time).h-sampleWave(x,z-epsilon,time).h)/(2*epsilon);
    const dt = (sampleWave(x,z,time+epsilon).h-sampleWave(x,z,time-epsilon).h)/(2*epsilon);
    assert.ok(Math.abs(wave.dx-dx)<1e-6);
    assert.ok(Math.abs(wave.dz-dz)<1e-6);
    assert.ok(Math.abs(wave.dt-dt)<1e-6);
  }
});

test('shore interaction is deterministic and calm water stays calm', () => {
  const x = channel(-1500).left + 6;
  assert.deepEqual(sampleWave(x,-1500,4),sampleWave(x,-1500,4));
  assert.deepEqual(sampleWave(x,-1500,4,0),{h:0,dx:0,dz:0,dt:0});
  let nearEnergy = 0;
  let openEnergy = 0;
  const banks = channel(-1500);
  const openX = Array.from({length: 21}, (unused,index) => banks.left + index / 20 * banks.width * 2).find((candidate) => sampleBoundary(candidate,-1500).distance>30);
  assert.ok(Number.isFinite(openX));
  for (let tick=0;tick<1000;tick++) {
    nearEnergy += sampleWave(x,-1500,tick/20).h**2;
    openEnergy += sampleWave(openX,-1500,tick/20).h**2;
  }
  assert.ok(nearEnergy<openEnergy*0.5);
});
