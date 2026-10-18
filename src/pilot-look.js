export function dragPilotLook(yaw, pitch, deltaX, deltaY, sensitivity = 1) {
  const horizontal = Number.isFinite(deltaX) ? deltaX : 0;
  const vertical = Number.isFinite(deltaY) ? deltaY : 0;
  const heading = Number.isFinite(yaw) ? yaw : 0;
  const elevation = Number.isFinite(pitch) ? pitch : 0;
  const scale = Number.isFinite(sensitivity) ? Math.max(0.25, Math.min(3, sensitivity)) : 1;
  return {yaw: ((heading + horizontal * 0.25 * scale + 180) % 360 + 360) % 360 - 180,
    pitch: Math.max(-75, Math.min(75, elevation - vertical * 0.22 * scale))};
}

export function smoothPilotLook(previous, target, dt, smoothing = 0.35, output = {}) {
  const amount = Number.isFinite(smoothing) ? Math.max(0, Math.min(1, smoothing)) : 0.35;
  const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  const blend = amount === 0 ? 1 : 1 - Math.exp(-elapsed / (0.02 + amount * 0.1));
  const yaw = Number.isFinite(previous.yaw) ? previous.yaw : 0;
  const pitch = Number.isFinite(previous.pitch) ? previous.pitch : 0;
  const targetYaw = Number.isFinite(target.yaw) ? target.yaw : yaw;
  const targetPitch = Number.isFinite(target.pitch) ? Math.max(-75, Math.min(75, target.pitch)) : pitch;
  const difference = ((targetYaw - yaw + 180) % 360 + 360) % 360 - 180;
  output.yaw = ((yaw + difference * blend + 180) % 360 + 360) % 360 - 180;
  output.pitch = pitch + (targetPitch - pitch) * blend;
  return output;
}
