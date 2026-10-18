import {channel,chunkFeatures,chunkIndex,CHUNK_COUNT} from './world.js';
const features=new Map();
function sectorFeatures(index) {
  if(!features.has(index))features.set(index,chunkFeatures(index));
  return features.get(index);
}
export function waterDepth(x,z,scale=1) {
  const banks=channel(z);
  let depth=Math.max(0.05,(banks.width-Math.abs(x-banks.center))*0.12);
  const sector=chunkIndex(z);
  for(let index=Math.max(0,sector-1);index<=Math.min(CHUNK_COUNT-1,sector+1);index++) {
    for(const feature of sectorFeatures(index)) {
      if(feature.kind==='rock')continue;
      const gap=Math.hypot(x-feature.x,z-feature.z)-feature.radius;
      depth=Math.min(depth,Math.max(0.05,gap*(feature.kind==='sandbank' ? 0.09 : 0.16)));
    }
  }
  const multiplier = Number.isFinite(scale) ? Math.max(0.5, Math.min(4, scale)) : 1;
  if (multiplier === 1) return depth;
  return Math.min(80, 0.05 + (depth - 0.05) * multiplier);
}
export function applyShallows(body,dt) {
  const sine=Math.sin(body.heading);const cosine=Math.cos(body.heading);
  let depth=waterDepth(body.x,body.z,body.depthScale);
  for(const offset of [-0.25,0.25])depth=Math.min(depth,waterDepth(body.x+sine*body.length*offset,body.z+cosine*body.length*offset,body.depthScale));
  body.depth=depth;
  body.grounded=Math.max(0,Math.min(1,1-depth/body.draft));
  body.shallowFactor=Math.max(0.25,Math.min(1,(depth-body.draft)/(body.draft*1.5)));
  const speed=Math.hypot(body.vx,body.vz);
  const slowdown=Math.max(0,1-0.55*9.81*body.grounded*dt/Math.max(speed,1e-9))*Math.exp(-(1-body.shallowFactor)*0.18*dt);
  body.vx*=slowdown;body.vz*=slowdown;
}
