export function engineMix(speed, throttle, airborne, boost) {
  const load = Math.min(1, Math.max(0, speed) / 55);
  return {rpm: 32 + load * 65 + (throttle ? 16 : 0) + (airborne ? 22 : 0) + (boost ? 14 : 0),
    motor: 0.035 + load * 0.045 + (throttle ? 0.025 : 0),
    spray: airborne ? 0.003 : load * load * 0.055,
    cutoff: 140 + load * 420 + (throttle ? 170 : 0)};
}

export function createAudio() {
  let context;
  let enabled = false;
  let volume = 0.65;
  let master;
  let motor;
  let sub;
  let motorGain;
  let motorFilter;
  let sprayGain;
  let windGain;
  let noise;
  let lastImpact = false;
  let lastLanding = false;
  function build() {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 5;
    master.connect(compressor).connect(context.destination);
    noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    motor = context.createOscillator();
    const real = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);
    const imaginary = new Float32Array([0, 1, 0.45, 0.3, 0.18, 0.12, 0.06, 0.035]);
    motor.setPeriodicWave(context.createPeriodicWave(real, imaginary));
    sub = context.createOscillator();
    sub.type = 'sine';
    motorFilter = context.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.Q.value = 0.6;
    motorGain = context.createGain();
    motorGain.gain.value = 0;
    motor.connect(motorFilter).connect(motorGain).connect(master);
    const subGain = context.createGain();
    subGain.gain.value = 0.3;
    sub.connect(subGain).connect(motorGain);
    const pulse = context.createOscillator();
    pulse.frequency.value = 17;
    const pulseDepth = context.createGain();
    pulseDepth.gain.value = 0.008;
    pulse.connect(pulseDepth).connect(motorGain.gain);
    sprayGain = context.createGain();
    windGain = context.createGain();
    for (const [destination, frequency, type] of [[sprayGain, 1700, 'bandpass'], [windGain, 350, 'lowpass']]) {
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = 0.5;
      destination.gain.value = 0;
      source.connect(filter).connect(destination).connect(master);
      source.start();
    }
    motor.start(); sub.start(); pulse.start();
  }
  function burst(impact) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(impact ? 600 : 3500, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, context.currentTime + 0.6);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(impact ? 0.3 : 0.18, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.75);
    source.connect(filter).connect(envelope).connect(master);
    source.start(); source.stop(context.currentTime + 0.8);
    source.onended = () => {source.disconnect(); filter.disconnect(); envelope.disconnect();};
  }
  return {
    setVolume(value) {volume = Math.max(0, Math.min(1, value));},
    async toggle() {
      if (!context) build();
      if (!enabled) await context.resume();
      enabled = !enabled;
      if (!enabled) master.gain.setTargetAtTime(0, context.currentTime, 0.05);
      return enabled;
    },
    update(state, paused, throttle, boost = false) {
      if (!context) return;
      const time = context.currentTime;
      const mix = engineMix(state.speed, throttle, state.airtime > 0.15, boost);
      master.gain.setTargetAtTime(enabled && !paused ? volume : 0, time, 0.09);
      motor.frequency.setTargetAtTime(mix.rpm, time, 0.18);
      sub.frequency.setTargetAtTime(mix.rpm * 0.5, time, 0.2);
      motorFilter.frequency.setTargetAtTime(mix.cutoff, time, 0.15);
      motorGain.gain.setTargetAtTime(mix.motor, time, 0.12);
      sprayGain.gain.setTargetAtTime(mix.spray, time, 0.2);
      windGain.gain.setTargetAtTime(0.012 + Math.min(state.speed / 1800, 0.035), time, 0.3);
      if (enabled && !paused && state.collision > 0 && !lastImpact) burst(true);
      if (enabled && !paused && state.landing > 0 && !lastLanding) burst(false);
      lastImpact = state.collision > 0;
      lastLanding = state.landing > 0;
    },
  };
}
