import {SERVICE_STATIONS} from './voyage.js';
import {harborLayout} from './harbor-layout.js';
import {CHUNK_COUNT, channel} from './world.js';
import {createRescueMission, tickRescue} from './rescue-mission.js';
export const LIGHTHOUSE_ROUTE = Object.freeze(Array.from({length: CHUNK_COUNT}, (_, index) => harborLayout(index).lighthouses).flat().map((tower, index) => {
  const banks = channel(tower.z);
  return Object.freeze({x: tower.side < 0 ? banks.left + 65 : banks.right - 65, z: tower.z, name: `Lighthouse ${index + 1}`});
}));
export const activityTarget = (activity) => activity.mode === 'rescue' && activity.phase === 'assist' ? activity.rescueBoat : (activity.mode === 'lighthouse' ? LIGHTHOUSE_ROUTE : SERVICE_STATIONS)[activity.target];
export function createActivity(mode, state) {
  if (mode === 'rescue') return createRescueMission(state);
  let origin = 0;
  if (mode === 'lighthouse') {
    for (let index = 1; index < LIGHTHOUSE_ROUTE.length; index++) if (Math.hypot(state.x - LIGHTHOUSE_ROUTE[index].x, state.z - LIGHTHOUSE_ROUTE[index].z) < Math.hypot(state.x - LIGHTHOUSE_ROUTE[origin].x, state.z - LIGHTHOUSE_ROUTE[origin].z)) origin = index;
    return {mode, target: origin, phase: 'visit', visited: 0, elapsed: 0, hold: 0, score: 0};
  }
  for (let index = 1; index < SERVICE_STATIONS.length; index++) if (Math.hypot(state.x - SERVICE_STATIONS[index].x, state.z - SERVICE_STATIONS[index].z) < Math.hypot(state.x - SERVICE_STATIONS[origin].x, state.z - SERVICE_STATIONS[origin].z)) origin = index;
  return {mode, target: origin, phase: mode === 'delivery' ? 'pickup' : mode === 'docking' ? 'dock' : 'off', elapsed: 0, hold: 0, score: 0};
}
export function tickActivity(activity, state, dt, throttle = false) {
  if (activity.mode === 'rescue') {tickRescue(activity, state, dt, throttle); return;}
  if (activity.phase === 'off' || activity.phase === 'done') return;
  activity.elapsed += dt;
  if (activity.mode === 'lighthouse') {
    const target = activityTarget(activity);
    if (Math.hypot(state.x - target.x, state.z - target.z) < 45 && state.speed < 20 && !throttle) {
      activity.visited++;
      if (activity.visited >= 3) {activity.phase = 'done'; activity.score = Math.max(100, Math.round(1500 - activity.elapsed * 0.3));}
      else activity.target = (activity.target + 1) % LIGHTHOUSE_ROUTE.length;
    }
    return;
  }
  const station = SERVICE_STATIONS[activity.target];
  const inside = Math.hypot(state.x - station.x, state.z - station.z) < (activity.mode === 'docking' ? 10 : 18);
  activity.hold = inside && state.speed < (activity.mode === 'docking' ? 0.7 : 1.5) && !throttle ? activity.hold + dt : 0;
  if (activity.hold < (activity.mode === 'docking' ? 5 : 2)) return;
  activity.hold = 0;
  if (activity.phase === 'pickup') {activity.phase = 'deliver'; activity.target = (activity.target + 1) % SERVICE_STATIONS.length;}
  else {activity.phase = 'done'; activity.score = Math.max(100, Math.round(1000 - activity.elapsed * 0.5));}
}
export function activityText(activity, state) {
  if (activity.phase === 'off') return activity.notice ?? 'FREE EXPLORATION';
  if (activity.phase === 'done') return `${activity.mode === 'rescue' ? 'RESCUE COMPLETE · CREW SAFE AT HARBOR' : 'COMPLETE'} · ${activity.score} POINTS · ${Math.round(activity.elapsed)} s · select another activity to replay`;
  const station = activityTarget(activity);
  if (activity.mode === 'rescue') return `${activity.phase === 'assist' ? 'ASSIST STRANDED CREW' : 'CREW ABOARD · RETURN'} · ${station.name} · ${Math.round(Math.hypot(state.x - station.x, state.z - station.z))} m · HOLD ${activity.hold.toFixed(1)}/${activity.phase === 'assist' ? 4 : 2} s · ${Math.round(activity.elapsed)} s`;
  return `${activity.phase.toUpperCase()} · ${station.name} · ${Math.round(Math.hypot(state.x - station.x, state.z - station.z))} m · ${activity.mode === 'lighthouse' ? `${activity.visited}/3 LANDMARKS` : `HOLD ${activity.hold.toFixed(1)} s`} · ${Math.round(activity.elapsed)} s`;
}
