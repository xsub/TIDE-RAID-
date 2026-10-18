export function immersionStep(previous = {submerged: false, pulse: 0}, depth, dt) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  const submerged = Number.isFinite(depth) ? (previous.submerged ? depth > -0.16 : depth > 0.12) : false;
  const crossed = submerged !== previous.submerged;
  return {submerged, pulse: crossed ? 1 : Math.max(0, previous.pulse - elapsed / 0.42)};
}
