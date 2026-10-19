import {DEFAULT_SWELL, TRIAL_SWELL} from './swell.js';
export const DEFAULT_WAVELENGTH = 2;
let wavelength = 1;
export const clampWavelength = (value) => Number.isFinite(value) ? Math.max(1, Math.min(4, value)) : 1;
export function setWavelength(value) {wavelength = clampWavelength(value); return wavelength;}
export const getWavelength = () => wavelength;
export const seaForPhase = (phase, preference = DEFAULT_WAVELENGTH) => phase === 'explore' ? {swell: DEFAULT_SWELL, wavelength: clampWavelength(preference)} : {swell: TRIAL_SWELL, wavelength: 1};
export function waterMeshPolicy(detail, swell, length) {
  const refined = swell > 3 && length < 2;
  const level = Math.max(refined ? 3 : 0, Math.min(4, Math.floor(Math.max(0, detail) / 21)));
  const segments = [10, 18, 30, 46, 64][level];
  return {segments, center: segments * (refined ? 4 : 2), refined};
}
