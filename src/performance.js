export function createFrameStats(capacity = 120) {
  const samples = new Float64Array(capacity);
  let cursor = 0;
  let count = 0;
  return {
    reset() {cursor = 0; count = 0;},
    sample(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 1000) return;
      samples[cursor] = milliseconds;
      cursor = (cursor + 1) % capacity;
      count = Math.min(count + 1, capacity);
    },
    read() {
      if (!count) return {fps: 0, frameMs: 0, p95Ms: 0};
      const sorted = Array.from(samples.subarray(0, count)).sort((left, right) => left - right);
      const frameMs = sorted.reduce((total, value) => total + value, 0) / count;
      return {fps: 1000 / frameMs, frameMs, p95Ms: sorted[Math.ceil(count * 0.95) - 1]};
    },
  };
}

export function createPerformanceOverlay(renderer) {
  const panel = document.createElement('pre');
  panel.id = 'performanceStats';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Rendering performance statistics');
  document.body.append(panel);
  const stats = createFrameStats();
  let refresh = 0;
  return {
    toggle() {panel.hidden = !panel.hidden; stats.reset(); refresh = 0;},
    update(milliseconds, now, sectors, cinematic) {
      if (panel.hidden) return;
      stats.sample(milliseconds);
      if (now - refresh < 250) return;
      refresh = now;
      const frame = stats.read();
      const info = renderer.info;
      const canvas = renderer.domElement;
      panel.textContent = `PERFORMANCE · ? TO CLOSE\n${frame.fps.toFixed(0)} FPS · ${frame.frameMs.toFixed(1)} ms/frame\nP95 ${frame.p95Ms.toFixed(1)} ms · rolling 120 frames\n${info.render.calls} draw calls · ${(info.render.triangles / 1000).toFixed(1)}k triangles\n${info.memory.geometries} geometries · ${info.memory.textures} textures\n${canvas.width} × ${canvas.height} · DPR ${renderer.getPixelRatio().toFixed(2)}\n${sectors} sectors · cinema ${cinematic ? 'ON' : 'OFF'}\nRender totals include shadows / postprocessing.\nFrame time is not a GPU timing measurement.`;
    },
  };
}
