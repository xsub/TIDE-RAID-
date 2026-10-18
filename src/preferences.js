export const DEFAULT_BINDINGS = {throttle: 'KeyW', brake: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', recover: 'KeyH', camera: 'KeyC', pause: 'KeyP', reset: 'KeyR'};
export const isBindable = (code) => /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space)$/.test(code);

export function readPreferences(storage) {
  let saved;
  try {saved = JSON.parse(storage.getItem('tide-raid-preferences-v1'));} catch {}
  const defaults = {detail: 75, camera: 'chase', sensitivity: 1, volume: 0.65, music: 0.32, effects: 0.65, traffic: 0.65, ambience: 0.55, cinema: true, hints: true, bindings: {...DEFAULT_BINDINGS}};
  if (!saved || typeof saved !== 'object') return defaults;
  if (Number.isFinite(saved.detail) && saved.detail >= 0 && saved.detail <= 100) defaults.detail = saved.detail;
  if (['chase', 'arcade'].includes(saved.camera)) defaults.camera = saved.camera;
  if (Number.isFinite(saved.sensitivity) && saved.sensitivity >= 0.5 && saved.sensitivity <= 1.5) defaults.sensitivity = saved.sensitivity;
  if (typeof saved.hints === 'boolean') defaults.hints = saved.hints;
  if (Number.isFinite(saved.volume) && saved.volume >= 0 && saved.volume <= 1) defaults.volume = saved.volume;
  for (const name of ['music', 'effects', 'traffic', 'ambience']) if (Number.isFinite(saved[name]) && saved[name] >= 0 && saved[name] <= 1) defaults[name] = saved[name];
  if (typeof saved.cinema === 'boolean') defaults.cinema = saved.cinema;
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
    throttle: pressed(7), brake: pressed(6), boost: pressed(0), recover: pressed(2), camera: pressed(3), pause: pressed(9)};
}

export function advanceLesson(lesson, input, state, checkpoints, dt) {
  if (lesson.stage === 0 && state.speed > 5) lesson.stage = 1;
  else if (lesson.stage === 1) {
    if (Math.abs(input.turn) > 0.2) lesson.steering += dt;
    if (lesson.steering > 0.4) lesson.stage = 2;
  } else if (lesson.stage === 2 && input.boost && input.throttle) lesson.stage = 3;
  else if (lesson.stage === 3 && checkpoints > 0) lesson.stage = 4;
}
