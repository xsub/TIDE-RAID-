export function cameraPose(state, mode, angle, aspect, portrait = false, channelWidth = 400) {
  const speed = Math.max(0, Math.min(70, state.speed));
  const fov = mode === 'arcade' ? (portrait ? 90 : 55) : (portrait ? 78 : 58) + speed / 70 * 10;
  const height = mode === 'arcade' ? Math.max(210, channelWidth / (2 * Math.tan(fov * Math.PI / 360) * aspect * 0.8)) : 5.2 + speed * 0.018;
  const back = mode === 'arcade' ? height * 0.48 : 15 + speed * 0.025;
  const orbit = state.heading + angle * Math.PI / 180;
  const ahead = mode === 'arcade' ? 35 : 2.5;
  return {
    x: state.x + Math.sin(orbit) * back, y: state.y + height, z: state.z + Math.cos(orbit) * back,
    lookX: state.x - Math.sin(state.heading) * ahead, lookY: state.y + 0.5, lookZ: state.z - Math.cos(state.heading) * ahead,
    fov,
  };
}
