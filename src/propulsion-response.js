export function propulsionResponse(state, input) {
  const ventilation = Math.max(0, Math.min(0.85, (state.airtime ?? 0) * 3));
  const planing = Math.max(0, Math.min(1, state.speed / Math.max(8, state.planingSpeed)));
  const throttle = input.throttle && !input.brake ? 1 : 0;
  const loading = Math.max(0.7, Math.min(1.3, (1 - state.foreLoad) / 0.55));
  return {power: 1 - ventilation, trim: state.planingTrim * loading * (0.65 + throttle * 0.35) * (0.4 + planing * 0.6), ventilation};
}
