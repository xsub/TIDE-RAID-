export function clearanceWarning(wasActive, clearance, threshold, enabled = true) {
  const limit = Number.isFinite(threshold) ? Math.max(0.2, Math.min(5, threshold)) : 1;
  const valid = clearance !== null && Number.isFinite(clearance);
  const active = enabled && valid && (wasActive ? clearance < limit + Math.max(0.15, limit * 0.1) : clearance <= limit);
  const urgency = active ? Math.max(0, Math.min(1, 1 - clearance / limit)) : 0;
  return {active, urgency, period: 1.6 - urgency * 0.7};
}
