import test from 'node:test';
import assert from 'node:assert/strict';
import {chunkFeatures,CHUNK_COUNT} from '../src/world.js';
import {harborLayout} from '../src/harbor-layout.js';
test('all finite-world collision layouts are cached immutable references',()=>{
  for(let index=0;index<CHUNK_COUNT;index++) {
    const features=chunkFeatures(index);const harbor=harborLayout(index);
    assert.equal(features,chunkFeatures(index));assert.equal(harbor,harborLayout(index));
    assert.ok(Object.isFrozen(features));assert.ok(Object.isFrozen(harbor));
    assert.ok(Object.isFrozen(harbor.docks));
    if(features.length)assert.throws(()=>{features[0].radius=999;},TypeError);
  }
});
