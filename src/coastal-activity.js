import {SERVICE_STATIONS} from './voyage.js';
export function createActivity(mode, state) {
  let origin = 0;
  for (let index = 1; index < SERVICE_STATIONS.length; index++) if (Math.hypot(state.x - SERVICE_STATIONS[index].x, state.z - SERVICE_STATIONS[index].z) < Math.hypot(state.x - SERVICE_STATIONS[origin].x, state.z - SERVICE_STATIONS[origin].z)) origin = index;
  return {mode, target: origin, phase: mode === 'delivery' ? 'pickup' : mode === 'docking' ? 'dock' : 'off', elapsed: 0, hold: 0, score: 0};
}
export function tickActivity(activity, state, dt, throttle = false) {
  if (activity.phase === 'off' || activity.phase === 'done') return;
  activity.elapsed += dt;
  const station = SERVICE_STATIONS[activity.target];
  const inside = Math.hypot(state.x - station.x, state.z - station.z) < (activity.mode === 'docking' ? 10 : 18);
  activity.hold = inside && state.speed < (activity.mode === 'docking' ? 0.7 : 1.5) && !throttle ? activity.hold + dt : 0;
  if (activity.hold < (activity.mode === 'docking' ? 5 : 2)) return;
  activity.hold = 0;
  if (activity.phase === 'pickup') {activity.phase = 'deliver'; activity.target = (activity.target + 1) % SERVICE_STATIONS.length;}
  else {activity.phase = 'done'; activity.score = Math.max(100, Math.round(1000 - activity.elapsed * 0.5));}
}
export function activityText(activity, state) {
  if (activity.phase === 'off') return 'FREE EXPLORATION';
  if (activity.phase === 'done') return `COMPLETE · ${activity.score} POINTS · ${Math.round(activity.elapsed)} s · select another activity to replay`;
  const station = SERVICE_STATIONS[activity.target];
  return `${activity.phase.toUpperCase()} · ${station.name} · ${Math.round(Math.hypot(state.x - station.x, state.z - station.z))} m · HOLD ${activity.hold.toFixed(1)} s · ${Math.round(activity.elapsed)} s`;
}
