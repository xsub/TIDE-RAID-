import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {weatherState} from '../src/weather.js';
import {createRain} from '../src/weather-view.js';
import {createVesselLights} from '../src/vessel-lights.js';
import {readPreferences, savePreferences} from '../src/preferences.js';

test('day cycle is repeatable, wraps, and distinguishes weather and night', () => {
  const day = weatherState({hour: 12, weather: 'sunny'});
  const night = weatherState({hour: 0, weather: 'rain'});
  assert.equal(day.daylight, 1); assert.equal(night.night, 1);
  assert.equal(night.rain, 1); assert.ok(night.cloud > day.cloud);
  assert.equal(weatherState({hour: 12, dayCycle: true, cycleMinutes: 20}, 1200).hour, 12);
  assert.equal(weatherState({hour: 12, dayCycle: true, cycleMinutes: 20}, 600).hour, 0);
  for (let time = 0; time < 3000; time += 7) {
    const settings = {hour: 18, dayCycle: true, cycleMinutes: 5, wind: 100, windAngle: 360};
    const weather = weatherState(settings, time);
    assert.deepEqual(weather, weatherState(settings, time));
    assert.ok(Object.values(weather).every(Number.isFinite));
    assert.ok(weather.hour >= 0 && weather.hour < 24 && weather.daylight >= 0 && weather.daylight <= 1);
  }
});

test('rain reuses fixed geometry, has finite wind-driven streaks and hides in sunshine', () => {
  const scene = new THREE.Scene(); const rain = createRain(scene); const mesh = scene.children[0];
  const vertices = mesh.geometry.attributes.position.array;
  assert.equal(vertices.length, 480 * 6);
  for (const time of [0, 100, 1e6]) rain.update(time, {x: 10, z: 20}, weatherState({weather: 'rain', wind: 100, windAngle: 240}));
  assert.equal(mesh.geometry.attributes.position.array, vertices);
  assert.ok([...vertices].every(Number.isFinite)); assert.equal(mesh.visible, true);
  rain.update(100, {x: 0, z: 0}, weatherState({weather: 'sunny'})); assert.equal(mesh.visible, false);
});

test('vessel lighting shares the beam and lamp materials without per-ship lights or shadows', () => {
  const first = createVesselLights(7.4, 2.8); const second = createVesselLights(12, 4);
  assert.equal(first.children.length, 2);
  assert.equal(first.children[1].geometry, second.children[1].geometry);
  assert.equal(first.children[0].material, second.children[0].material);
  assert.equal(first.children[1].material.depthWrite, false);
  assert.ok(first.children.every((child) => !child.isLight && !child.castShadow));
});

test('weather preferences migrate, validate and persist independently', () => {
  const legacy = readPreferences(undefined); assert.equal(legacy.hour, 12); assert.equal(legacy.dayCycle, false);
  const invalid = readPreferences({getItem: () => JSON.stringify({hour: -1, wind: 101, weather: 'storm', dayCycle: 'yes'})});
  assert.equal(invalid.hour, 12); assert.equal(invalid.wind, 20); assert.equal(invalid.weather, 'sunny');
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...legacy, weather: 'rain', hour: 0, dayCycle: true, glow: false});
  assert.equal(readPreferences(storage).weather, 'rain'); assert.equal(readPreferences(storage).glow, false);
});
