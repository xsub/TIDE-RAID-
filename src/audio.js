export function createAudio() {
  let context;
  let engine;
  let gain;
  let enabled = false;
  let lastImpact = false;
  let lastLanding = false;
  let noise;
  function burst(level) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(level, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    source.connect(envelope).connect(context.destination);
    source.start();
    source.onended = () => {source.disconnect(); envelope.disconnect();};
  }
  return {
    async toggle() {
      if (!context) {
        context = new AudioContext();
        engine = context.createOscillator();
        engine.type = 'triangle';
        gain = context.createGain();
        gain.gain.value = 0;
        engine.connect(gain).connect(context.destination);
        engine.start();
        noise = context.createBuffer(1, context.sampleRate * 0.3, context.sampleRate);
        const data = noise.getChannelData(0);
        for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
      }
      enabled = !enabled;
      if (enabled) await context.resume();
      else gain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      return enabled;
    },
    update(state, paused, throttle) {
      if (!context) return;
      const audible = enabled && !paused;
      engine.frequency.setTargetAtTime(42 + state.speed * 2 + (throttle ? 14 : 0), context.currentTime, 0.1);
      gain.gain.setTargetAtTime(audible ? 0.025 + Math.min(state.speed / 1000, 0.035) : 0, context.currentTime, 0.08);
      if (audible && state.collision > 0 && !lastImpact) burst(0.09);
      if (audible && state.landing > 0 && !lastLanding) burst(0.045);
      lastImpact = state.collision > 0;
      lastLanding = state.landing > 0;
    },
  };
}
