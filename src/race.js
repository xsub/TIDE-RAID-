import {START_Z, channel, chunkFeatures, chunkIndex} from './world.js';

export const COURSE_ID = 'coastal-sprint-capsules-v8';
export const COURSE_LENGTH = 4000;
export const MEDALS = {gold: 130, silver: 170, bronze: 220};
export const gates = [800, 1600, 2400, 3200, 4000].map((distance) => {
  let z = START_Z - 20 - distance;
  for (let attempt = 0; attempt < 30; attempt++) {
    const features = [-1, 0, 1].flatMap((offset) => chunkFeatures(Math.max(0, chunkIndex(z) + offset)));
    if (features.every((feature) => Math.abs(feature.z - z) > feature.radius + 12)) break;
    z -= 3;
  }
  const banks = channel(z);
  return {z, x: banks.center, halfWidth: banks.width * 0.88};
});

export function createRace(phase = 'ready') {
  return {phase, countdown: 3, elapsed: 0, penalty: 0, next: 0, boost: 1,
    recovering: 0, collisions: 0, result: null, boostLocked: false};
}

export function tickCountdown(race, dt) {
  if (race.phase !== 'countdown') return;
  race.countdown = Math.max(0, race.countdown - dt);
  if (race.countdown < 0.00001) race.phase = 'racing';
}

export function useBoost(race, requested, throttle, dt) {
  if (!requested) race.boostLocked = false;
  const active = requested && throttle && race.boost > 0 && !race.boostLocked;
  race.boost = Math.max(0, Math.min(1, race.boost + (active ? -0.24 : 0.1) * dt));
  if (race.boost === 0) race.boostLocked = true;
  return active;
}

export function updateRace(race, before, after, dt) {
  if (race.phase !== 'racing') return false;
  race.elapsed += dt;
  race.recovering = Math.max(0, race.recovering - dt);
  if (after.collision > 0 && before.collision <= 0) {
    race.penalty += 2;
    race.collisions++;
  }
  const gate = gates[race.next];
  if (before.z > gate.z && after.z <= gate.z) {
    const fraction = (before.z - gate.z) / (before.z - after.z);
    const crossingX = before.x + (after.x - before.x) * fraction;
    if (Math.abs(crossingX - gate.x) <= gate.halfWidth) {
      race.next++;
      if (race.next === gates.length) {
        const time = race.elapsed + race.penalty;
        race.phase = 'finished';
        race.result = {time, medal: time <= MEDALS.gold ? 'GOLD' : time <= MEDALS.silver ? 'SILVER' : time <= MEDALS.bronze ? 'BRONZE' : 'FINISHER'};
        return true;
      }
    }
  }
  return false;
}

export function recoverRace(race, state) {
  if (race.phase !== 'racing') return;
  race.penalty += 5;
  race.recovering = 2;
  const gate = gates[race.next];
  if (state.z <= gate.z + 20) state.z = gate.z + 45;
}

export function readBest(storage) {
  try {
    const value = JSON.parse(storage.getItem(COURSE_ID));
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  } catch {return null;}
}

export function saveBest(storage, time) {
  const previous = readBest(storage);
  const best = previous === null ? time : Math.min(time, previous);
  try {storage.setItem(COURSE_ID, JSON.stringify(best)); return {best, saved: true};}
  catch {return {best, saved: false};}
}

export function formatTime(seconds) {
  const hundredths = Math.round(seconds * 100);
  return `${Math.floor(hundredths / 6000)}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
}
