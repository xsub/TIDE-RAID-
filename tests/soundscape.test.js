import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficMix} from '../src/audio.js';
import {musicStep, midiFrequency, MUSIC_BPM} from '../src/music.js';
import {readPreferences} from '../src/preferences.js';

test('nearby vessels fade with distance, pan with heading and have bounded Doppler', () => {
  const listener = {x: 0, z: 0, vx: 0, vz: -50, heading: 0};
  const ship = {x: 15, z: -20, vx: 0, vz: -10, active: true, model: 'boat-speed-a', speed: 10};
  const near = trafficMix(ship, listener);
  assert.ok(near.gain > trafficMix({...ship, z: -140}, listener).gain);
  assert.ok(near.pan > 0);
  assert.ok(trafficMix({...ship, x: -15}, listener).pan < 0);
  assert.equal(trafficMix({...ship, z: -250}, listener).gain, 0);
  assert.equal(trafficMix({...ship, active: false}, listener).gain, 0);
  assert.equal(trafficMix({...ship, model: 'boat-tug-a'}, listener).sail, true);
  for (const velocity of [-1000, 0, 1000]) {
    const mix = trafficMix({...ship, x: 0, z: 0, vz: velocity}, listener);
    assert.ok(Object.values(mix).filter((value) => typeof value === 'number').every(Number.isFinite));
    assert.ok(mix.rpm > 40 && mix.rpm < 70);
  }
});

test('original ambient score has a slow tempo, bounded range and intentional rests', () => {
  assert.ok(MUSIC_BPM >= 50 && MUSIC_BPM <= 70);
  assert.equal(midiFrequency(69), 440);
  let chords = 0; let rests = 0;
  for (let beat = 0; beat < 32; beat++) {
    const step = musicStep(beat);
    if (step.chord.length) chords++;
    if (!step.melody) rests++;
    for (const frequency of [...step.chord, ...(step.melody ? [step.melody] : [])]) assert.ok(Number.isFinite(frequency) && frequency > 60 && frequency < 1000);
  }
  assert.equal(chords, 4);
  assert.ok(rests > 16);
});

test('sound and cinematic preferences validate independently and migrate old settings', () => {
  const preferences = readPreferences({getItem: () => JSON.stringify({volume: 0.4, music: 0, effects: 0.2, traffic: 8, ambience: -1, cinema: false})});
  assert.equal(preferences.volume, 0.4); assert.equal(preferences.music, 0);
  assert.equal(preferences.effects, 0.2); assert.equal(preferences.traffic, 0.65);
  assert.equal(preferences.ambience, 0.55); assert.equal(preferences.cinema, false);
});
