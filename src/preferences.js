import {isPlayerBoat} from './player-boats.js';
import {cameraMemory} from './camera-memory.js';

export const DEFAULT_BINDINGS = {throttle: 'KeyW', brake: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', recover: 'KeyH', camera: 'KeyC', pause: 'KeyP', reset: 'KeyR', reverse: 'KeyB'};
export const isBindable = (code) => /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space)$/.test(code);

export function readPreferences(storage) {
  let saved;
  try {saved = JSON.parse(storage.getItem('tide-raid-preferences-v1'));} catch {}
  const defaults = {detail: 75, camera: 'chase', cameraAngle: 20, sensitivity: 1, volume: 0.65, music: 0.32, effects: 0.65, traffic: 0.65, ambience: 0.55, cinema: true, hints: true, bindings: {...DEFAULT_BINDINGS}};
  defaults.playerBoat = 'boat-speed-c';
  defaults.cameraViews = {}; defaults.reducedCameraMotion = false;
  defaults.livingWeather = true;
  defaults.qualityPreset = 'custom';
  defaults.shallowThreshold = 1; defaults.shallowMuted = false;
  defaults.riverDepth = 2;
  defaults.pilotSinkWithBoat = false;
  defaults.pilotYaw = 0; defaults.pilotPitch = 0;
  defaults.mouseLookSensitivity = 1; defaults.pilotLookSmoothing = 0.35;
  defaults.weather = 'sunny'; defaults.hour = 12; defaults.dayCycle = false; defaults.cycleMinutes = 20; defaults.wind = 20; defaults.windAngle = 45; defaults.glow = true;
  defaults.damageMode = 'arcade'; defaults.sinkingMode = 'off'; defaults.fuelMode = 'arcade';
  defaults.cameraZoom = 1;
  defaults.manualCamera = false; defaults.cameraElevation = 30; defaults.cameraHeight = 15;
  if (!saved || typeof saved !== 'object') return defaults;
  if (['custom', 'low', 'balanced', 'high', 'auto'].includes(saved.qualityPreset)) defaults.qualityPreset = saved.qualityPreset;
  if (typeof saved.livingWeather === 'boolean') defaults.livingWeather = saved.livingWeather;
  defaults.cameraViews = cameraMemory(saved.cameraViews);
  if (typeof saved.reducedCameraMotion === 'boolean') defaults.reducedCameraMotion = saved.reducedCameraMotion;
  if (Number.isFinite(saved.mouseLookSensitivity) && saved.mouseLookSensitivity >= 0.25 && saved.mouseLookSensitivity <= 3) defaults.mouseLookSensitivity = saved.mouseLookSensitivity;
  if (Number.isFinite(saved.pilotLookSmoothing) && saved.pilotLookSmoothing >= 0 && saved.pilotLookSmoothing <= 1) defaults.pilotLookSmoothing = saved.pilotLookSmoothing;
  if (Number.isFinite(saved.pilotYaw) && saved.pilotYaw >= -180 && saved.pilotYaw <= 180) defaults.pilotYaw = saved.pilotYaw;
  if (Number.isFinite(saved.pilotPitch) && saved.pilotPitch >= -75 && saved.pilotPitch <= 75) defaults.pilotPitch = saved.pilotPitch;
  if (isPlayerBoat(saved.playerBoat)) defaults.playerBoat = saved.playerBoat;
  if (Number.isFinite(saved.shallowThreshold) && saved.shallowThreshold >= 0.2 && saved.shallowThreshold <= 5) defaults.shallowThreshold = saved.shallowThreshold;
  if (typeof saved.shallowMuted === 'boolean') defaults.shallowMuted = saved.shallowMuted;
  if (Number.isFinite(saved.riverDepth) && saved.riverDepth >= 0.5 && saved.riverDepth <= 4) defaults.riverDepth = saved.riverDepth;
  if (typeof saved.pilotSinkWithBoat === 'boolean') defaults.pilotSinkWithBoat = saved.pilotSinkWithBoat;
  if (typeof saved.manualCamera === 'boolean') defaults.manualCamera = saved.manualCamera;
  if (Number.isFinite(saved.cameraElevation) && saved.cameraElevation >= 5 && saved.cameraElevation <= 85) defaults.cameraElevation = saved.cameraElevation;
  if (Number.isFinite(saved.cameraHeight) && saved.cameraHeight >= 3 && saved.cameraHeight <= 500) defaults.cameraHeight = saved.cameraHeight;
  if (['sunny', 'cloudy', 'rain'].includes(saved.weather)) defaults.weather = saved.weather;
  for (const [name, minimum, maximum] of [['hour', 0, 24], ['cycleMinutes', 5, 60], ['wind', 0, 100], ['windAngle', 0, 360]]) if (Number.isFinite(saved[name]) && saved[name] >= minimum && saved[name] <= maximum) defaults[name] = saved[name];
  for (const name of ['dayCycle', 'glow']) if (typeof saved[name] === 'boolean') defaults[name] = saved[name];
  if (['arcade', 'realistic'].includes(saved.damageMode)) defaults.damageMode = saved.damageMode;
  for (const name of ['sinkingMode', 'fuelMode']) if (['off', 'arcade', 'realistic'].includes(saved[name])) defaults[name] = saved[name];
  if (Number.isFinite(saved.cameraZoom) && saved.cameraZoom >= 0.5 && saved.cameraZoom <= 8) defaults.cameraZoom = saved.cameraZoom;
  if (Number.isFinite(saved.detail) && saved.detail >= 0 && saved.detail <= 100) defaults.detail = saved.detail;
  if (['chase', 'arcade', 'pilot', 'wreck'].includes(saved.camera)) defaults.camera = saved.camera;
  if (Number.isFinite(saved.cameraAngle) && saved.cameraAngle >= 0 && saved.cameraAngle <= 360) defaults.cameraAngle = saved.cameraAngle;
  if (Number.isFinite(saved.sensitivity) && saved.sensitivity >= 0.5 && saved.sensitivity <= 1.5) defaults.sensitivity = saved.sensitivity;
  if (typeof saved.hints === 'boolean') defaults.hints = saved.hints;
  if (Number.isFinite(saved.volume) && saved.volume >= 0 && saved.volume <= 1) defaults.volume = saved.volume;
  for (const name of ['music', 'effects', 'traffic', 'ambience']) if (Number.isFinite(saved[name]) && saved[name] >= 0 && saved[name] <= 1) defaults[name] = saved[name];
  if (typeof saved.cinema === 'boolean') defaults.cinema = saved.cinema;
  if(saved.bindings && (typeof saved.bindings!=='object' || Array.isArray(saved.bindings)))saved.bindings=null;
  if(saved.bindings && !saved.bindings.reverse) saved.bindings.reverse=['KeyB','KeyV','KeyN'].find((code)=>!Object.values(saved.bindings).includes(code));
  if (saved.bindings && Object.keys(DEFAULT_BINDINGS).every((action) => isBindable(saved.bindings[action]))) {
    const codes = Object.keys(DEFAULT_BINDINGS).map((action) => saved.bindings[action]);
    if (new Set(codes).size === codes.length) defaults.bindings = Object.fromEntries(Object.keys(DEFAULT_BINDINGS).map((action) => [action, saved.bindings[action]]));
  }
  return defaults;
}

export function savePreferences(storage, preferences) {
  try {storage.setItem('tide-raid-preferences-v1', JSON.stringify(preferences)); return true;}
  catch {return false;}
}

export function remap(preferences, action, code) {
  if (!Object.hasOwn(DEFAULT_BINDINGS, action) || !isBindable(code)) return false;
  const conflict = Object.keys(preferences.bindings).find((other) => other !== action && preferences.bindings[other] === code);
  if (conflict) preferences.bindings[conflict] = preferences.bindings[action];
  preferences.bindings[action] = code;
  return true;
}

export function readGamepad(pads) {
  const pad = Array.from(pads).find((candidate) => candidate?.connected && candidate.mapping === 'standard');
  const pressed = (index) => Boolean(pad?.buttons[index]?.pressed || pad?.buttons[index]?.value > 0.25);
  const axis = Number.isFinite(pad?.axes[0]) ? Math.max(-1, Math.min(1, pad.axes[0])) : 0;
  return {connected: Boolean(pad), turn: Math.abs(axis) < 0.15 ? 0 : Math.sign(axis) * (Math.abs(axis) - 0.15) / 0.85,
    throttle: pressed(7), brake: pressed(6), reverse: pressed(1), boost: pressed(0), recover: pressed(2), camera: pressed(3), pause: pressed(9)};
}

export function advanceLesson(lesson, input, state, checkpoints, dt) {
  if (lesson.stage === 0 && state.speed > 5) lesson.stage = 1;
  else if (lesson.stage === 1) {
    if (Math.abs(input.turn) > 0.2) lesson.steering += dt;
    if (lesson.steering > 0.4) lesson.stage = 2;
  } else if (lesson.stage === 2 && input.boost && input.throttle) lesson.stage = 3;
  else if (lesson.stage === 3 && checkpoints > 0) lesson.stage = 4;
}
