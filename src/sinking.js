export const createSinking = () => ({water: [0, 0, 0, 0], list: 0, trim: 0, air: 1, ingress: 0});
export function resetSinking(voyage) {voyage.flooding = 0; voyage.sinking = createSinking();}
export function leakRate(hull, head, fill, state, mode, bias = 1) {
  const threshold = mode === 'arcade' ? 0.12 : 0.3;
  const severity = Math.max(0, Math.min(1, (threshold - hull) / threshold));
  if (head <= 0 || severity === 0 || mode === 'off') return 0;
  const capacity = Math.max(0.15, state.mass / 1025 * 0.28);
  const speed = Math.max(0, Math.min(70, state.speed ?? 0));
  const ramHead = Math.min(2, speed * speed / (2 * 9.81) * 0.008);
  const pressure = Math.max(0, head + ramHead - fill * state.draft * 0.45);
  if (mode === 'arcade') return severity * (0.25 + 0.75 * severity * severity) / 16 * Math.sqrt(Math.min(2, pressure));
  const opening = (0.004 * severity + 0.014 * severity * severity) * bias;
  return 0.62 * opening * Math.sqrt(2 * 9.81 * pressure) / capacity;
}
export function tickSinking(voyage, state, mode, dt, waterHeight = 0) {
  if (!(dt > 0 && Number.isFinite(dt))) return;
  const sinking = voyage.sinking ??= createSinking();
  if (mode === 'off') {if (voyage.flooding > 0 || sinking.water.some((fill) => fill > 0)) resetSinking(voyage); return;}
  const capacity = Math.max(0.15, state.mass / 1025 * 0.28);
  const head = Math.max(0, waterHeight - (state.y - state.draft - 0.35));
  let ingress = 0;
  for (let index = 0; index < 4; index++) {
    const side = index % 2 ? 1 : -1;
    const aft = index >= 2;
    const bias = (aft ? 1.2 : 0.8) * (side < 0 ? 1.2 : 0.8);
    const localHead = Math.max(0, head + side * Math.sin(state.roll) * state.beam * 0.3 + (aft ? 1 : -1) * Math.sin(state.pitch) * state.length * 0.2);
    const rate = leakRate(voyage.hull, localHead, sinking.water[index], state, mode, bias);
    const previous = sinking.water[index];
    sinking.water[index] = Math.min(1, Math.max(0, previous + rate * dt));
    ingress += (sinking.water[index] - previous) * capacity / dt;
  }
  voyage.flooding = sinking.water.reduce((sum, fill) => sum + fill, 0) / 4;
  sinking.ingress = ingress * 1000;
  const port = (sinking.water[0] + sinking.water[2]) / 2;
  const starboard = (sinking.water[1] + sinking.water[3]) / 2;
  const fore = (sinking.water[0] + sinking.water[1]) / 2;
  const aft = (sinking.water[2] + sinking.water[3]) / 2;
  const softness = 1 - Math.exp(-dt * 1.8);
  sinking.list += ((port - starboard) * 0.8 - sinking.list) * softness;
  sinking.trim += ((aft - fore) * 0.45 - sinking.trim) * softness;
  sinking.air = Math.max(0, sinking.air - dt * (voyage.flooding > 0.02 ? 0.012 + 0.025 * voyage.flooding : 0));
}
export function pumpSinking(voyage, dt) {
  for (let index = 0; index < 4; index++) voyage.sinking.water[index] = Math.max(0, voyage.sinking.water[index] - dt * 0.4);
  voyage.flooding = voyage.sinking.water.reduce((sum, fill) => sum + fill, 0) / 4;
  if (voyage.flooding === 0 && (voyage.sinking.list !== 0 || voyage.sinking.trim !== 0 || voyage.sinking.air !== 1)) resetSinking(voyage);
}
export function floodedHandling(voyage, state) {
  const fill = voyage.flooding;
  return {mass: state.mass * (1 + fill * 1.12), draft: state.draft + fill * 0.5,
    cgHeight: state.cgHeight + fill * (1 - fill) * 1.2,
    buoyancy: 1 - Math.max(0, (fill - 0.55) / 0.45) * 0.96,
    power: Math.max(0, 1 - fill / 0.75)};
}
export function settleFloodedHull(state, voyage, surface, dt) {
  const drag = Math.exp(-voyage.flooding * 0.8 * dt);
  state.vx *= drag; state.vz *= drag; state.speed = Math.hypot(state.vx, state.vz);
  const floor = surface - Math.max(0.4, Math.min(state.depth - 0.5, state.length * 0.8 + 3));
  if (state.y < floor) {state.y = floor; state.vy = Math.max(0, state.vy);}
}
