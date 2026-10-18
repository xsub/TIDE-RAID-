export function landingSound(energy, speed = 0) {
  const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;
  const strength = Math.sqrt(1 - Math.exp(-safeEnergy / 9000));
  const flow = Number.isFinite(speed) ? Math.min(1, Math.max(0, speed) / 55) : 0;
  return {gain: safeEnergy < 80 ? 0 : 0.045 * strength,
    duration: 0.16 + strength * 0.2 + flow * 0.08,
    cutoff: 950 + strength * 1100 + flow * 450};
}
