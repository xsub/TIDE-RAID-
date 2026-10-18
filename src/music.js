export const MUSIC_BPM = 62;
export const midiFrequency = (note) => 440 * 2 ** ((note - 69) / 12);
const CHORDS = [[48, 55, 59, 64], [45, 52, 55, 59], [41, 48, 52, 57], [43, 50, 55, 57]];
const MELODY = [76, null, 79, 74, null, 72, 71, null, 76, null, 74, 72, 69, null, 71, null];

export function musicStep(index) {
  const chordIndex = Math.floor(index / 8) % CHORDS.length;
  return {chord: index % 8 === 0 ? CHORDS[chordIndex].map(midiFrequency) : [],
    melody: index % 2 === 0 && MELODY[Math.floor(index / 2) % MELODY.length] !== null ? midiFrequency(MELODY[Math.floor(index / 2) % MELODY.length]) : null};
}

export function createMusic(context, destination) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 2600; filter.Q.value = 0.35;
  filter.connect(destination);
  const reverb = context.createConvolver();
  const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 2.8), context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smooth = 0;
    for (let index = 0; index < data.length; index++) {
      smooth = smooth * 0.55 + (Math.sin(index * 78.233 + channel * 19.7) * 43758.5453 % 1) * 0.45;
      data[index] = smooth * (1 - index / data.length) ** 3 * 0.22;
    }
  }
  reverb.buffer = impulse;
  const wet = context.createGain(); wet.gain.value = 0.3;
  filter.connect(reverb).connect(wet).connect(destination);
  let nextBeat = 0;
  let index = 0;
  function note(frequency, start, pad) {
    const oscillator = context.createOscillator();
    oscillator.type = pad ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(pad ? 0.026 : 0.027, start + (pad ? 1.4 : 0.018));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + (pad ? 7.5 : 3.5));
    oscillator.connect(envelope).connect(filter);
    oscillator.start(start); oscillator.stop(start + (pad ? 8 : 3.8));
    oscillator.onended = () => {oscillator.disconnect(); envelope.disconnect();};
  }
  return {
    update(time, active) {
      if (!active) {nextBeat = time + 0.08; return;}
      if (nextBeat < time - 0.25) nextBeat = time + 0.05;
      let scheduled = 0;
      while (nextBeat < time + 0.16 && scheduled++ < 4) {
        const step = musicStep(index++);
        for (const frequency of step.chord) note(frequency, nextBeat, true);
        if (step.melody) note(step.melody, nextBeat, false);
        nextBeat += 60 / MUSIC_BPM;
      }
    },
  };
}
