export const CAMERA_ZOOM_PRESETS = [{name: 'Wide', zoom: 1}, {name: 'Closer', zoom: 2}, {name: 'Close', zoom: 4}, {name: 'Detail', zoom: 8}];
export const clampCameraZoom = (zoom) => Number.isFinite(zoom) ? Math.max(0.5, Math.min(8, zoom)) : 1;

export function cameraPose(state, mode, angle, aspect, portrait = false, channelWidth = 400, zoom = 1, manual = null) {
  zoom = clampCameraZoom(zoom);
  const speed = Math.max(0, Math.min(70, state.speed));
  if (mode === 'pilot') {
    const forward = state.helmForward ?? 0.2; const side = state.helmSide ?? -0.35;
    const eyeX = state.x - Math.sin(state.heading) * forward + Math.cos(state.heading) * side;
    const eyeZ = state.z - Math.cos(state.heading) * forward - Math.sin(state.heading) * side;
    const eyeY = state.y + (state.helmHeight ?? 1.45);
    const pitch = Math.max(-0.16, Math.min(0.16, (state.pitch ?? 0) * 0.35));
    return {x: eyeX, y: eyeY, z: eyeZ, lookX: eyeX - Math.sin(state.heading) * 70, lookY: eyeY + Math.sin(pitch) * 70, lookZ: eyeZ - Math.cos(state.heading) * 70, fov: portrait ? 88 : 76};
  }
  const fov = mode === 'arcade' ? (portrait ? 90 : 55) : (portrait ? 78 : 58) + speed / 70 * 10;
  const height = mode === 'arcade' ? Math.max(20, Math.max(210, channelWidth / (2 * Math.tan(fov * Math.PI / 360) * aspect * 0.8)) / zoom) : Math.max(2.5, (5.2 + speed * 0.018) / Math.sqrt(zoom));
  const back = mode === 'arcade' ? height * 0.48 : Math.max((state.length ?? 7.4) * 0.8 + 2, (15 + speed * 0.025) / zoom);
  const orbit = state.heading + angle * Math.PI / 180;
  const ahead = mode === 'arcade' ? 35 / Math.max(1, zoom) : 2.5;
  if (manual) {
    const elevation = Math.max(5, Math.min(85, Number.isFinite(manual.elevation) ? manual.elevation : 30));
    const waterHeight = Number.isFinite(manual.waterHeight) ? manual.waterHeight : state.y - 0.6;
    const requestedHeight = Math.max(3, Math.min(500, Number.isFinite(manual.height) ? manual.height : 15));
    const targetHeight = Math.max(waterHeight + 0.5, state.y + 0.5);
    const cameraHeight = Math.max(waterHeight + requestedHeight / zoom, targetHeight + 2.5);
    const distance = Math.min(1000, Math.max((state.length ?? 7.4) * 0.8 + 2, (cameraHeight - targetHeight) / Math.tan(elevation * Math.PI / 180)));
    return {x: state.x + Math.sin(orbit) * distance, y: cameraHeight, z: state.z + Math.cos(orbit) * distance,
      lookX: state.x, lookY: targetHeight, lookZ: state.z, fov};
  }
  return {
    x: state.x + Math.sin(orbit) * back, y: state.y + height, z: state.z + Math.cos(orbit) * back,
    lookX: state.x - Math.sin(state.heading) * ahead, lookY: state.y + 0.5, lookZ: state.z - Math.cos(state.heading) * ahead,
    fov,
  };
}
