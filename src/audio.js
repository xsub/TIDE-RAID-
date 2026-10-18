import {createMusic} from './music.js';
import {impactFeedback} from './impact-feedback.js';

export function engineMix(speed, throttle, airborne, boost) {
  const load = Math.min(1, Math.max(0, speed) / 55);
  return {rpm: 30 + load * 56 + (throttle ? 10 : 0) + (airborne ? 13 : 0) + (boost ? 8 : 0),
    motor: 0.022 + load * 0.027 + (throttle ? 0.012 : 0),
    spray: airborne ? 0.002 : load * load * 0.024,
    cutoff: 170 + load * 240 + (throttle ? 70 : 0)};
}

export function trafficMix(ship, listener) {
  const deltaX = ship.x - listener.x;
  const deltaZ = ship.z - listener.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const radial = ((ship.vx - listener.vx) * deltaX + (ship.vz - listener.vz) * deltaZ) / Math.max(1, distance);
  const doppler = Math.max(0.94, Math.min(1.06, 343 / Math.max(200, 343 + radial)));
  const sail = ship.model === 'boat-tug-a';
  return {distance, pan: Math.max(-1, Math.min(1, (deltaX * Math.cos(listener.heading) - deltaZ * Math.sin(listener.heading)) / 65)),
    gain: !ship.active || distance >= 190 ? 0 : (sail ? 0.009 : 0.05) * (1 - distance / 190) ** 2 / (1 + distance / 25),
    rpm: (sail ? 27 : 37 + ship.speed * 1.8) * doppler,
    cutoff: 150 + 650 * Math.max(0, 1 - distance / 190), sail};
}

export function createAudio(contextFactory = () => new AudioContext()) {
  let context;
  let enabled = false;
  let volume = 0.65;
  const levels = {music: 0.32, effects: 0.65, traffic: 0.65, ambience: 0.55};
  let master;
  let buses;
  let motor;
  let spray;
  let ambience;
  let grounding;
  let noise;
  let music;
  let voices;
  let lastImpact = false;
  let lastLanding = false;
  function gain(destination, value = 0) {
    const node = context.createGain(); node.gain.value = value; node.connect(destination); return node;
  }
  function wash(destination, frequency, type) {
    const source = context.createBufferSource(); source.buffer = noise; source.loop = true;
    const filter = context.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = 0.45;
    const envelope = gain(destination);
    source.connect(filter).connect(envelope); source.start();
    return envelope;
  }
  function engine(destination, stereo = false) {
    const output = context.createGain(); output.gain.value = 0;
    const panner = stereo ? context.createStereoPanner() : null;
    if (panner) output.connect(panner).connect(destination); else output.connect(destination);
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.45;
    filter.frequency.value = 280;
    filter.connect(output);
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 40;
    oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.32, 0.2, 0.08, 0.04, 0.015])));
    const tone = gain(filter, 1);
    oscillator.connect(tone); oscillator.start();
    const sub = context.createOscillator(); sub.type = 'sine';
    sub.frequency.value = 20;
    const bass = gain(filter, 0.28);
    sub.connect(bass); sub.start();
    const texture = wash(filter, 150, 'lowpass'); texture.gain.value = 0.13;
    return {output, filter, oscillator, sub, panner, tone, bass, texture};
  }
  function build() {
    context = contextFactory();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16; compressor.knee.value = 18; compressor.ratio.value = 3;
    const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 25;
    const soften = context.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 6500;
    master = context.createGain(); master.gain.value = 0;
    master.connect(highpass).connect(soften).connect(compressor).connect(context.destination);
    buses = Object.fromEntries(Object.entries(levels).map(([name, value]) => [name, gain(master, value)]));
    noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = noise.getChannelData(0);
    let smooth = 0;
    let seed = 9041;
    for (let index = 0; index < samples.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      smooth = smooth * 0.65 + (seed / 4294967296 * 2 - 1) * 0.35;
      samples[index] = smooth;
    }
    motor = engine(buses.effects);
    spray = wash(buses.effects, 1800, 'bandpass');
    ambience = wash(buses.ambience, 560, 'lowpass');
    grounding = wash(buses.effects, 190, 'lowpass');
    voices = Array.from({length: 6}, () => engine(buses.traffic, true));
    music = createMusic(context, buses.music);
  }
  function burst(impact,energy=0,material=0) {
    const feedback=impactFeedback(energy,material,!impact);
    const source = context.createBufferSource(); source.buffer = noise;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass';
    filter.frequency.setValueAtTime(feedback.cutoff, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(130, context.currentTime + 0.7);
    const envelope = gain(buses.effects);
    envelope.gain.setValueAtTime(feedback.gain, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.05);
    source.connect(filter).connect(envelope); source.start(); source.stop(context.currentTime + 1.1);
    source.onended = () => {source.disconnect(); filter.disconnect(); envelope.disconnect();};
  }
  return {
    setVolume(value) {volume = Math.max(0, Math.min(1, value));},
    setMix(name, value) {if (Object.hasOwn(levels, name)) levels[name] = Math.max(0, Math.min(1, value));},
    async toggle() {
      if (!context) build();
      if (!enabled) await context.resume();
      enabled = !enabled;
      if (!enabled) master.gain.setTargetAtTime(0, context.currentTime, 0.15);
      return enabled;
    },
    update(state, paused, throttle, boost = false, ships = [], engineActive = true) {
      if (!context) return;
      const time = context.currentTime;
      const audible = enabled && !paused;
      master.gain.setTargetAtTime(audible ? volume : 0, time, 0.22);
      for (const [name, value] of Object.entries(levels)) buses[name].gain.setTargetAtTime(value, time, 0.25);
      const mix = engineMix(state.speed, throttle, state.airtime > 0.15, boost);
      motor.oscillator.frequency.setTargetAtTime(mix.rpm, time, 0.3);
      motor.sub.frequency.setTargetAtTime(mix.rpm * 0.5, time, 0.35);
      motor.filter.frequency.setTargetAtTime(mix.cutoff, time, 0.25);
      motor.output.gain.setTargetAtTime(engineActive ? mix.motor : 0, time, 0.3);
      spray.gain.setTargetAtTime(engineActive ? mix.spray : 0, time, 0.3);
      grounding.gain.setTargetAtTime(engineActive ? Math.min(0.035,(state.grounded ?? 0)*state.speed*0.003) : 0,time,0.2);
      ambience.gain.setTargetAtTime(0.025 + Math.sin(time * 0.22) * 0.008 + Math.sin(time * 0.37) * 0.005, time, 0.7);
      const nearest = engineActive ? ships.filter((ship) => ship.active).map((ship) => ({ship, mix: trafficMix(ship, state)})).filter((entry) => entry.mix.gain > 0).sort((first, second) => first.mix.distance - second.mix.distance).slice(0, voices.length) : [];
      voices.forEach((voice, index) => {
        const nearby = nearest[index]?.mix;
        voice.output.gain.setTargetAtTime(nearby?.gain ?? 0, time, 0.3);
        if (!nearby) return;
        voice.oscillator.frequency.setTargetAtTime(nearby.rpm, time, 0.28);
        voice.sub.frequency.setTargetAtTime(nearby.rpm * 0.5, time, 0.3);
        voice.filter.frequency.setTargetAtTime(nearby.sail ? 120 : nearby.cutoff, time, 0.3);
        voice.tone.gain.setTargetAtTime(nearby.sail ? 0 : 1, time, 0.2);
        voice.bass.gain.setTargetAtTime(nearby.sail ? 0 : 0.28, time, 0.2);
        voice.texture.gain.setTargetAtTime(nearby.sail ? 0.7 : 0.13, time, 0.2);
        voice.panner.pan.setTargetAtTime(nearby.pan, time, 0.18);
      });
      music.update(time, audible && levels.music > 0);
      if (audible && engineActive && state.collision > 0 && !lastImpact) burst(true,state.impactEnergy,state.impactMaterial);
      if (audible && engineActive && state.landing > 0 && !lastLanding) burst(false,state.landingEnergy);
      lastImpact = state.collision > 0; lastLanding = state.landing > 0;
    },
  };
}
