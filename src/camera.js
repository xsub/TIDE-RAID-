export const CAMERA_ZOOM_PRESETS = [{name: 'Wide', zoom: 1}, {name: 'Closer', zoom: 2}, {name: 'Close', zoom: 4}, {name: 'Detail', zoom: 8}];
export const clampCameraZoom = (zoom) => Number.isFinite(zoom) ? Math.max(0.5, Math.min(8, zoom)) : 1;

export function cameraPose(state, mode, angle, aspect, portrait = false, channelWidth = 400, zoom = 1) {
  zoom = clampCameraZoom(zoom);
  const speed = Math.max(0, Math.min(70, state.speed));
  const fov = mode === 'arcade' ? (portrait ? 90 : 55) : (portrait ? 78 : 58) + speed / 70 * 10;
  const height = mode === 'arcade' ? Math.max(20, Math.max(210, channelWidth / (2 * Math.tan(fov * Math.PI / 360) * aspect * 0.8)) / zoom) : Math.max(2.5, (5.2 + speed * 0.018) / Math.sqrt(zoom));
  const back = mode === 'arcade' ? height * 0.48 : Math.max((state.length ?? 7.4) * 0.8 + 2, (15 + speed * 0.025) / zoom);
  const orbit = state.heading + angle * Math.PI / 180;
  const ahead = mode === 'arcade' ? 35 / Math.max(1, zoom) : 2.5;
  return {
    x: state.x + Math.sin(orbit) * back, y: state.y + height, z: state.z + Math.cos(orbit) * back,
    lookX: state.x - Math.sin(state.heading) * ahead, lookY: state.y + 0.5, lookZ: state.z - Math.cos(state.heading) * ahead,
    fov,
  };
}
