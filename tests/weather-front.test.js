import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {frontField, createWeatherFront} from '../src/weather-front.js';
import {weatherState} from '../src/weather.js';
test('fronts advect deterministically with continuous bounded rain strength', () => {
  const front = frontField(0, 0, 0, 0.5, 0); assert.equal(front.x, -500);
  assert.deepEqual(front, frontField(0, 0, 0, 0.5, 0));
  assert.ok(frontField(0, 0, 10, 0.5, 0).x > front.x);
  const time = 500 / 12; assert.equal(frontField(0, 0, time, 0.5, 0).strength, 1);
  assert.equal(frontField(0, 0, time, 0.5, 0, false).strength, 0);
  const settings = {movingFronts: true, weather: 'sunny', wind: 50, windAngle: 0};
  const passing = weatherState(settings, time); assert.ok(passing.rain > 0.9 && passing.cloud > 0.9);
  assert.equal(weatherState({...settings, livingWeather: false}, time).rain, 0);
});
test('fronts reuse two render batches and hide below water or when disabled', () => {
  const scene = new THREE.Scene(); const view = createWeatherFront(scene); const group = scene.children[0];
  const weather = weatherState({movingFronts: true}, 0);
  const geometry = group.children[0].geometry;
  for (let tick = 0; tick < 100; tick++) view.update(weather, tick);
  assert.equal(group.children.length, 2); assert.equal(group.children[0].geometry, geometry); assert.equal(group.children[1].count, 3);
  view.update(weather, 100, 1); assert.equal(group.visible, false);
  view.update({...weather, frontEnabled: 0}, 100); assert.equal(group.visible, false);
  assert.ok(group.children.every((child) => !child.isLight && !child.castShadow));
});
