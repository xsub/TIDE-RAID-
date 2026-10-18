export const underwaterAmount = (amount) => Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
export function underwaterBlend(previous, depth, enabled, dt) {
  const target = enabled && Number.isFinite(depth) ? underwaterAmount(depth / 0.6) : 0;
  const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  return underwaterAmount(previous) + (target - underwaterAmount(previous)) * (1 - Math.exp(-elapsed * 8));
}
export function underwaterAudio(amount) {
  const blend = underwaterAmount(amount);
  return {cutoff: 6500 * Math.pow(420 / 6500, blend), gain: 1 - 0.4 * blend};
}
