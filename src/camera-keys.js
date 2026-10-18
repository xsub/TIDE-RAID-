export function cameraKeyMotion(keys, bindings, mode, dt) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(0.05, dt)) : 0;
  const assigned = Object.values(bindings);
  const held = (code) => keys.has(code) && !assigned.includes(code);
  return {orbit: (Number(held('KeyL')) - Number(held('KeyJ'))) * 65 * elapsed,
    tilt: (Number(held('KeyI')) - Number(held('KeyK'))) * 35 * elapsed};
}
