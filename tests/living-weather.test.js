import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherState} from '../src/weather.js';
test('living weather produces bounded deterministic gusts and can be disabled', () => {
  const settings = {wind: 100, weather: 'rain'};
  assert.deepEqual(weatherState(settings, 12), weatherState(settings, 12));
  assert.notEqual(weatherState(settings, 12).waveFactor, weatherState(settings, 24).waveFactor);
  assert.equal(weatherState({...settings, livingWeather: false}, 12).waveFactor, 1);
  for (let time = 0; time < 200; time++) {
    const weather = weatherState(settings, time); assert.ok(weather.wind >= 0 && weather.wind <= 1); assert.ok(weather.waveFactor >= 0.8 && weather.waveFactor <= 1.2);
  }
});
