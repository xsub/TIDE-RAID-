// Shared analytical water field. Rendered mesh and hull contact sample the same function.
export const components = [
  [0.22,0.22,0.9,0.435,1.47],
  [0.12,0.65,-0.5,0.866,2.52],
  [0.065,1.2,0.75,-0.66,3.43],
  [0.035,1.95,-0.88,-0.47,4.37],
];
export function sampleWave(x,z,t,roughness=1){
  let h=0,dx=0,dz=0,dt=0;
  for(const [a,k,ux,uz,w] of components){
    const p=k*(ux*x+uz*z)-w*t;
    const amp=a*roughness;
    h+=amp*Math.sin(p);
    dx+=amp*k*ux*Math.cos(p);
    dz+=amp*k*uz*Math.cos(p);
    dt-=amp*w*Math.cos(p);
  }
  return {h,dx,dz,dt};
}

export const waveGLSL = `
void tideWave(vec2 point, float time, float roughness, out float height, out vec2 slope) {
  height = 0.0;
  slope = vec2(0.0);
  ${components.map(([amplitude, frequency, directionX, directionZ, speed]) => `
  {
    vec2 direction = vec2(${directionX.toFixed(6)}, ${directionZ.toFixed(6)});
    float phase = ${frequency.toFixed(6)} * dot(direction, point) - ${speed.toFixed(6)} * time;
    height += ${amplitude.toFixed(6)} * roughness * sin(phase);
    slope += ${amplitude.toFixed(6)} * roughness * ${frequency.toFixed(6)} * direction * cos(phase);
  }`).join('')}
}
`;
