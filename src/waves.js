import {sampleBoundary, boundaryGLSL} from './water-boundary.js';
import {harborWater, harborGLSL} from './harbor-water.js';
import {getWavelength} from './wave-settings.js';

// Shared analytical water field. Rendered mesh and hull contact sample the same function.
export const components = [
  [0.22,0.22,0.9,0.435,1.47],
  [0.12,0.65,-0.5,0.866,2.52],
  [0.065,1.2,0.75,-0.66,3.43],
  [0.035,1.95,-0.88,-0.47,4.37],
];
export function sampleWave(x,z,t,roughness=1){
  const length = getWavelength(); const period = Math.sqrt(length);
  let h=0,dx=0,dz=0,dt=0;
  for(const [a,k,ux,uz,w] of components){
    const p=k/length*(ux*x+uz*z)-w/period*t;
    const amp=a*roughness;
    h+=amp*Math.sin(p);
    dx+=amp*k/length*ux*Math.cos(p);
    dz+=amp*k/length*uz*Math.cos(p);
    dt-=amp*w/period*Math.cos(p);
  }
  const boundary = sampleBoundary(x,z);
  const distance = Math.max(0,boundary.distance);
  const fraction = Math.min(1,distance/24);
  const attenuation = 0.3+0.7*fraction*fraction*(3-2*fraction);
  const attenuationDerivative = boundary.distance>0 && distance<24 ? 0.7*6*fraction*(1-fraction)/24 : 0;
  const ramp = Math.min(1,distance/3);
  const envelope = 0.025*roughness*Math.exp(-distance/10)*ramp*ramp*(3-2*ramp);
  const envelopeDerivative = boundary.distance>0 ? -envelope/10+(distance<3 ? 0.025*roughness*Math.exp(-distance/10)*6*ramp*(1-ramp)/3 : 0) : 0;
  const phase = distance*0.9/length-t*2.6/period;
  const reflected = envelope*Math.sin(phase);
  const radialDerivative = envelopeDerivative*Math.sin(phase)+(boundary.distance>0 ? envelope*0.9/length*Math.cos(phase) : 0);
  const shelter = harborWater(x,z); const height = h*attenuation+reflected;
  return {h:height*shelter.scale,dx:(dx*attenuation+(h*attenuationDerivative+radialDerivative)*boundary.dx)*shelter.scale+height*shelter.dx,dz:(dz*attenuation+(h*attenuationDerivative+radialDerivative)*boundary.dz)*shelter.scale+height*shelter.dz,dt:(dt*attenuation-envelope*2.6/period*Math.cos(phase))*shelter.scale};
}

export const waveGLSL = `
${boundaryGLSL}
${harborGLSL}
uniform float uWavelength;
void tideWaveBoundary(vec2 point, float time, float roughness, float boundaryDistance, vec2 boundaryGradient, out float height, out vec2 slope) {
  height = 0.0;
  slope = vec2(0.0);
  float waveLength=max(1.0,uWavelength);float wavePeriod=sqrt(waveLength);
  ${components.map(([amplitude, frequency, directionX, directionZ, speed]) => `
  {
    vec2 direction = vec2(${directionX.toFixed(6)}, ${directionZ.toFixed(6)});
    float phase = ${frequency.toFixed(6)} / waveLength * dot(direction, point) - ${speed.toFixed(6)} / wavePeriod * time;
    height += ${amplitude.toFixed(6)} * roughness * sin(phase);
    slope += ${amplitude.toFixed(6)} * roughness * ${frequency.toFixed(6)} / waveLength * direction * cos(phase);
  }`).join('')}
  float distance = max(0.0,boundaryDistance);
  float fraction = clamp(distance/24.0,0.0,1.0);
  float attenuation = 0.3+0.7*fraction*fraction*(3.0-2.0*fraction);
  float attenuationDerivative = boundaryDistance>0.0 && distance<24.0 ? 0.7*6.0*fraction*(1.0-fraction)/24.0 : 0.0;
  float ramp = clamp(distance/3.0,0.0,1.0);
  float envelope = 0.025*roughness*exp(-distance/10.0)*ramp*ramp*(3.0-2.0*ramp);
  float envelopeDerivative = boundaryDistance>0.0 ? -envelope/10.0+(distance<3.0 ? 0.025*roughness*exp(-distance/10.0)*6.0*ramp*(1.0-ramp)/3.0 : 0.0) : 0.0;
  float phase = distance*0.9/waveLength-time*2.6/wavePeriod;
  float radialDerivative = envelopeDerivative*sin(phase)+(boundaryDistance>0.0 ? envelope*0.9/waveLength*cos(phase) : 0.0);
  slope = slope*attenuation+(height*attenuationDerivative+radialDerivative)*boundaryGradient;
  height = height*attenuation+envelope*sin(phase);
  float shelter;vec2 shelterGradient;harborField(point,shelter,shelterGradient);
  slope=slope*shelter+height*shelterGradient;height*=shelter;
}
void tideWave(vec2 point, float time, float roughness, out float height, out vec2 slope) {
  float distance; vec2 gradient;
  waterBoundary(point,distance,gradient);
  tideWaveBoundary(point,time,roughness,distance,gradient,height,slope);
}
`;
