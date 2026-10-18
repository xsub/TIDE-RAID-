import test from 'node:test';
import assert from 'node:assert/strict';
import {impactFeedback} from '../src/impact-feedback.js';
test('feedback follows energy monotonically with bounded calm levels',()=>{
  let previous=0;
  for(const energy of [0,10,1000,10000,1e6,1e12]){const mix=impactFeedback(energy);assert.ok(mix.gain>=previous && mix.gain<=0.13);assert.ok(Object.values(mix).every(Number.isFinite));previous=mix.gain;}
  assert.ok(impactFeedback(10000,2).cutoff<impactFeedback(10000,3).cutoff);
});
test('landing and malformed energy feedback remain bounded and repeatable',()=>{
  assert.ok(impactFeedback(1e9,0,true).gain<=0.085);
  assert.deepEqual(impactFeedback(NaN),impactFeedback(0));
  assert.deepEqual(impactFeedback(5000,3),impactFeedback(5000,3));
});
