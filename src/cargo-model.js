export const CROSSING_SECONDS = 90;
export const CARGO = Object.freeze(Array.from({length: 18}, (_, index) => Object.freeze({id: index, tonnes: [38, 12, 30, 18, 25, 40, 14, 32, 20, 36, 16, 28, 22, 34, 10, 26, 24, 42][index]})));
export const SLOTS = Object.freeze(Array.from({length: 24}, (_, index) => Object.freeze({bay: Math.floor(index / 6), column: Math.floor(index / 2) % 3, tier: index % 2, x: (Math.floor(index / 2) % 3 - 1) * 4.5, z: (Math.floor(index / 6) - 1.5) * 12, y: 4.2 + index % 2 * 2.2})));
export function createCargoGame() {
  return {board: Array(24).fill(null), phase: 'loading', time: 0, roll: 0, rollRate: 0, pitch: 0, pitchRate: 0, integrity: 1, peakRoll: 0, dangerTime: 0, moves: 4, pending: null, assisted: false, history: []};
}
export function cargoBalance(board) {
  let mass = 360; let vertical = mass * 1.2; let across = 0; let fore = 0;
  for (let index = 0; index < board.length; index++) {
    if (board[index] === null) continue;
    const cargo = CARGO[board[index]]; const slot = SLOTS[index];
    mass += cargo.tonnes; vertical += cargo.tonnes * slot.y;
    across += cargo.tonnes * slot.x; fore += cargo.tonnes * slot.z;
  }
  const kg = vertical / mass; const gm = 4.3 - kg;
  return {mass, kg, gm, list: Math.atan2(across, mass * Math.max(0.15, gm)), trim: Math.atan2(fore, mass * 35)};
}
export function seaState(time) {
  const stage = time < 30 ? 0 : time < 60 ? 1 : 2;
  const blend = Math.min(1, Math.max(0, (time - stage * 30) / 8));
  const amplitude = stage === 0 ? 0.035 : stage === 1 ? 0.035 + blend * 0.055 : 0.09 + blend * 0.055;
  return {stage, amplitude, roll: amplitude * (Math.sin(time * 0.8) + 0.35 * Math.sin(time * 1.37)), pitch: amplitude * 0.28 * Math.sin(time * 0.63), crane: (time >= 22 && time < 30) || (time >= 52 && time < 60)};
}
export function canMove(game, cargoId, target) {
  if (!Number.isInteger(cargoId) || !CARGO[cargoId] || !Number.isInteger(target) || !SLOTS[target] || game.board[target] !== null || game.pending) return false;
  const source = game.board.indexOf(cargoId);
  if (source >= 0 && SLOTS[source].tier === 0 && game.board[source + 1] !== null) return false;
  if (SLOTS[target].tier === 1 && (game.board[target - 1] === null || target - 1 === source)) return false;
  return game.phase === 'loading' || (game.phase === 'crossing' && source >= 0 && game.moves > 0 && seaState(game.time).crane && Math.abs(game.roll) < 0.35);
}
function place(game, cargoId, target) {
  const source = game.board.indexOf(cargoId);
  if (source >= 0) game.board[source] = null;
  game.board[target] = cargoId;
}
export function moveCargo(game, cargoId, target) {
  if (!canMove(game, cargoId, target)) return false;
  if (game.phase === 'loading') {
    game.history.push([...game.board]); if (game.history.length > 24) game.history.shift();
    place(game, cargoId, target);
  } else {game.pending = {cargoId, target, remaining: 3}; game.moves--;}
  return true;
}
export function unloadCargo(game, cargoId) {
  const source = game.board.indexOf(cargoId);
  if (game.phase !== 'loading' || source < 0 || (SLOTS[source].tier === 0 && game.board[source + 1] !== null)) return false;
  game.history.push([...game.board]); if (game.history.length > 24) game.history.shift(); game.board[source] = null; return true;
}
export function undoCargo(game) {
  if (game.phase !== 'loading' || !game.history.length) return false;
  game.board = game.history.pop(); return true;
}
export function startCrossing(game) {
  const loaded = game.board.filter((id) => id !== null);
  if (game.phase !== 'loading' || loaded.length !== CARGO.length || new Set(loaded).size !== CARGO.length || loaded.some((id) => !Number.isInteger(id) || !CARGO[id]) || game.board.some((id, index) => id !== null && SLOTS[index].tier === 1 && game.board[index - 1] === null)) return false;
  game.phase = 'crossing'; game.history = []; return true;
}
export function tickCargo(game, dt) {
  if (game.phase !== 'crossing' || !(dt > 0 && dt <= 1 / 30)) return;
  if (game.pending) {
    game.pending.remaining -= dt;
    if (game.pending.remaining <= 0) {place(game, game.pending.cargoId, game.pending.target); game.pending = null;}
  }
  const sea = seaState(game.time); const balance = cargoBalance(game.board);
  const stiffness = 9.81 * Math.max(0.08, balance.gm) / 28;
  const rollTarget = balance.list + sea.roll;
  game.rollRate += (stiffness * (rollTarget - game.roll) - 0.22 * game.rollRate) * dt;
  game.roll += game.rollRate * dt;
  game.pitchRate += (0.8 * (balance.trim + sea.pitch - game.pitch) - 0.65 * game.pitchRate) * dt;
  game.pitch += game.pitchRate * dt;
  game.peakRoll = Math.max(game.peakRoll, Math.abs(game.roll));
  game.integrity = Math.max(0, game.integrity - Math.max(0, Math.abs(game.roll) - 0.35) * dt * 0.12);
  game.dangerTime = Math.abs(game.roll) > 1.05 ? game.dangerTime + dt : 0;
  game.time = Math.min(CROSSING_SECONDS, game.time + dt);
  if (game.integrity === 0 || game.dangerTime > 2) {game.phase = 'failed'; game.pending = null;}
  else if (game.time >= CROSSING_SECONDS) {game.phase = 'arrived'; game.pending = null;}
}
