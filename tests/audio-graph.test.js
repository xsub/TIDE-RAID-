import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';

test('clearance warning reuses one voice and obeys mute, pause and active gates', async () => {
  const context = mockContext(); const audio = createAudio(() => context);
  audio.setMix('music', 0); await audio.toggle();
  const state = {x: 0, z: 0, vx: 0, vz: 0, heading: 0, speed: 0, airtime: 0, collision: 0, landing: 0};
  const before = context.created.length;
  audio.setClearanceWarning(0.3, 1, false, true);
  audio.update(state, false, false);
  const voice = context.created.slice(before);
  assert.equal(voice.filter((node) => node.kind === 'oscillator').length, 1);
  const envelope = voice.find((node) => node.kind === 'gain');
  assert.ok(envelope.gain.value > 0);
  const count = context.created.length;
  for (let frame = 0; frame < 120; frame++) audio.update(state, false, false);
  assert.equal(context.created.length, count);
  context.currentTime = 0.2; audio.update(state, false, false);
  assert.equal(envelope.gain.value, 0);
  for (const [clearance, muted, active, paused] of [[0.3, true, true, false], [0.3, false, true, true], [0.3, false, false, false], [null, false, true, false], [2, false, true, false]]) {
    audio.setClearanceWarning(clearance, 1, muted, active); audio.update(state, paused, false);
    assert.equal(envelope.gain.value, 0);
  }
  audio.setClearanceWarning(0.3, 1, false, true); audio.update(state, false, false);
  assert.ok(envelope.gain.value > 0);
  await audio.toggle(); audio.update(state, false, false);
  assert.equal(envelope.gain.value, 0);
});

function mockContext() {
  const created = [];
  const parameter = () => ({value: 0, setValueAtTime(value) {assert.ok(Number.isFinite(value)); this.value = value;},
    setTargetAtTime(value) {assert.ok(Number.isFinite(value)); this.value = value;},
    linearRampToValueAtTime(value) {assert.ok(Number.isFinite(value)); this.value = value;},
    exponentialRampToValueAtTime(value) {assert.ok(value > 0 && Number.isFinite(value)); this.value = value;}});
  const node = (kind) => {
    const output = {kind, gain: parameter(), frequency: parameter(), Q: parameter(), pan: parameter(), threshold: parameter(), knee: parameter(), ratio: parameter(),
      connect(destination) {assert.ok(destination); return destination;}, disconnect() {}, start() {}, stop() {}, setPeriodicWave() {}};
    created.push(output); return output;
  };
  return {created, sampleRate: 8000, currentTime: 0, destination: {}, resume: async () => {},
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'), createOscillator: () => node('oscillator'),
    createStereoPanner: () => node('panner'), createBufferSource: () => node('source'), createConvolver: () => node('reverb'),
    createDynamicsCompressor: () => node('compressor'), createPeriodicWave: () => ({}),
    createBuffer(channels, length) {const data = Array.from({length: channels}, () => new Float32Array(length)); return {getChannelData: (channel) => data[channel]};}};
}

test('underwater audio reuses its filter and respects pause/mute while restoring the surface mix', async () => {
  const context = mockContext(); const audio = createAudio(() => context);
  audio.setMix('music', 0); await audio.toggle();
  const filter = context.created.find((node) => node.kind === 'filter' && node.frequency.value === 6500);
  const master = context.created.find((node) => node.kind === 'gain');
  const state = {x: 0, z: 0, vx: 0, vz: 0, heading: 0, speed: 0, airtime: 0, collision: 0, landing: 0};
  const count = context.created.length;
  for (let frame = 0; frame < 120; frame++) audio.update(state, false, false, false, [], false, 1);
  assert.ok(Math.abs(filter.frequency.value - 420) < 1e-8); assert.equal(context.created.length, count);
  audio.update(state, true, false, false, [], false, 1); assert.equal(master.gain.value, 0);
  audio.update(state, false, false, false, [], false, 0); assert.equal(filter.frequency.value, 6500);
  await audio.toggle(); audio.update(state, false, false, false, [], false, 1); assert.equal(master.gain.value, 0);
});

test('landing uses two bounded water layers, suppresses tiny/repeated contacts and cleans up', async () => {
  const context = mockContext();
  const audio = createAudio(() => context);
  audio.setMix('music', 0);
  await audio.toggle();
  const state = {x: 0, z: 0, vx: 0, vz: 0, heading: 0, speed: 30, airtime: 0, collision: 0, landing: 0, landingEnergy: 4000};
  const sources = () => context.created.filter((node) => node.kind === 'source').length;
  const before = sources();
  state.landing = 0.65;
  audio.update(state, false, true);
  assert.equal(sources(), before + 2);
  audio.update(state, false, true);
  assert.equal(sources(), before + 2);
  state.landing = 0; audio.update(state, false, true);
  state.landing = 0.65; context.currentTime = 0.1; audio.update(state, false, true);
  assert.equal(sources(), before + 2);
  state.landing = 0; audio.update(state, false, true);
  state.landing = 0.65; context.currentTime = 1; state.landingEnergy = 10; audio.update(state, false, true);
  assert.equal(sources(), before + 2);
  state.landing = 0; audio.update(state, false, true);
  state.landing = 0.65; state.landingEnergy = 5000; audio.update(state, true, true);
  assert.equal(sources(), before + 2);
  const transient = context.created.filter((node) => node.kind === 'source' && node.onended);
  assert.equal(transient.length, 2);
  for (const source of transient) assert.doesNotThrow(() => source.onended());
});

test('traffic audio reuses six stereo voices and master mute/pause/volume all silence the bus', async () => {
  const context = mockContext();
  const audio = createAudio(() => context);
  audio.setMix('music', 0);
  assert.equal(await audio.toggle(), true);
  const state = {x: 0, z: 0, vx: 0, vz: 0, heading: 0, speed: 20, airtime: 0, collision: 0, landing: 0};
  const ships = Array.from({length: 30}, (_, index) => ({x: index, z: -index * 3, vx: 0, vz: -10, speed: 10, model: 'boat-speed-a', active: true}));
  for (let frame = 0; frame < 120; frame++) {context.currentTime += 1 / 60; audio.update(state, false, true, false, ships);}
  assert.equal(context.created.filter((node) => node.kind === 'panner').length, 6);
  assert.equal(context.created.filter((node) => node.kind === 'oscillator').length, 14);
  const master = context.created.find((node) => node.kind === 'gain');
  assert.ok(master.gain.value > 0);
  audio.update(state, true, false, false, ships); assert.equal(master.gain.value, 0);
  audio.setVolume(0); audio.update(state, false, false); assert.equal(master.gain.value, 0);
  audio.setVolume(0.5); assert.equal(await audio.toggle(), false);
  audio.update(state, false, false); assert.equal(master.gain.value, 0);
});

test('music can start on the menu and resume after a long inactive interval without a scheduling storm', async () => {
  const context = mockContext();
  const audio = createAudio(() => context);
  await audio.toggle();
  const state = {x: 0, z: 0, vx: 0, vz: 0, heading: 0, speed: 0, airtime: 0, collision: 0, landing: 0};
  audio.update(state, false, false, false, [], false);
  assert.ok(context.created.filter((node) => node.kind === 'oscillator').length > 14);
  const before = context.created.length;
  context.currentTime = 600;
  audio.update(state, false, false, false, [], false);
  assert.ok(context.created.length - before < 12);
});
