export function dragPilotLook(yaw, pitch, deltaX, deltaY) {
  const horizontal = Number.isFinite(deltaX) ? deltaX : 0;
  const vertical = Number.isFinite(deltaY) ? deltaY : 0;
  const heading = Number.isFinite(yaw) ? yaw : 0;
  const elevation = Number.isFinite(pitch) ? pitch : 0;
  return {yaw: ((heading + horizontal * 0.25 + 180) % 360 + 360) % 360 - 180,
    pitch: Math.max(-75, Math.min(75, elevation - vertical * 0.22))};
}
