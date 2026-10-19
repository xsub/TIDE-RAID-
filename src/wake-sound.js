export function wakeSound(impact, speed = 0) {
  const strength = Number.isFinite(impact) ? Math.max(0, Math.min(1, impact)) : 0;
  const flow = Number.isFinite(speed) ? Math.max(0, Math.min(1, speed / 40)) : 0;
  return {gain: strength < 0.07 ? 0 : 0.028 * Math.sqrt(strength), duration: 0.14 + strength * 0.12 + flow * 0.04, cutoff: 900 + strength * 900 + flow * 350};
}
