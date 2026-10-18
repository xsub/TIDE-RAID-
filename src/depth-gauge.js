export function depthReadings(state, camera, surface, cameraSurface, depthAt, draft = state.draft) {
  const valid = [state.x, state.y, state.z, state.heading, state.length, state.beam, draft, surface].every(Number.isFinite);
  let river = null; let clearance = null;
  if (valid) {
    const centerDepth = depthAt(state.x, state.z);
    if (Number.isFinite(centerDepth) && centerDepth >= 0) river = Math.max(0, centerDepth + surface);
    let lowest = Infinity;
    for (const [across, along] of [[0, 0], [0, -state.length * 0.25], [0, state.length * 0.25], [-state.beam * 0.4, 0], [state.beam * 0.4, 0]]) {
      const worldX = state.x + Math.cos(state.heading) * across + Math.sin(state.heading) * along;
      const worldZ = state.z - Math.sin(state.heading) * across + Math.cos(state.heading) * along;
      const depth = depthAt(worldX, worldZ);
      if (!Number.isFinite(depth) || depth < 0) {lowest = NaN; break;}
      const keel = state.y - 0.6 - draft - along * Math.sin(state.pitch ?? 0) + across * Math.sin(state.roll ?? 0);
      lowest = Math.min(lowest, keel + depth);
    }
    if (Number.isFinite(lowest)) clearance = lowest;
  }
  const cameraDepth = Number.isFinite(camera.y) && Number.isFinite(cameraSurface) ? Math.max(0, cameraSurface - camera.y) : null;
  const status = clearance === null ? 'DEPTH UNAVAILABLE' : clearance <= 0 ? 'GROUND CONTACT' : clearance < Math.max(0.5, draft * 0.5) ? 'LOW CLEARANCE' : 'CLEAR';
  return {river, clearance, cameraDepth, status};
}
