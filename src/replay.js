import {step} from './physics.js';
import {updateTraffic,collideTraffic} from './traffic.js';
export const REPLAY_VERSION=1;
export function stateChecksum(state,traffic) {
  const text=JSON.stringify({state,traffic});let hash=2166136261;
  for(let index=0;index<text.length;index++)hash=Math.imul(hash^text.charCodeAt(index),16777619)>>>0;
  return hash;
}
export const finitePhysicsState=(state)=>Object.values(state).every((value)=>typeof value==='number' && Number.isFinite(value));
export function createReplayTape(initialState,initialTraffic,capacity=72000) {
  const origin=structuredClone({state:initialState,traffic:initialTraffic});
  const values=new Float64Array(capacity*3);const flags=new Uint8Array(capacity);const checksums=new Uint32Array(capacity);
  let count=0;let truncated=false;
  return {
    record(input,time,swell) {
      if(count===capacity){truncated=true;return false;}
      values[count*3]=input.turn;values[count*3+1]=time;values[count*3+2]=swell;
      flags[count]=(input.throttle ? 1 : 0)|(input.brake ? 2 : 0)|(input.reverse ? 4 : 0)|(input.boost ? 8 : 0);
      count++;return true;
    },
    seal(state,traffic) {if(count && count%120===0 && !truncated)checksums[count-1]=stateChecksum(state,traffic);},
    export() {return {version:REPLAY_VERSION,origin,truncated,frames:Array.from({length:count},(unused,index)=>[values[index*3],values[index*3+1],values[index*3+2],flags[index],checksums[index]])};},
  };
}
export function runReplay(recording) {
  if(recording.version!==REPLAY_VERSION || !Array.isArray(recording.frames) || recording.frames.length>72000)throw new Error('Unsupported replay');
  const {state,traffic}=structuredClone(recording.origin);
  if(!finitePhysicsState(state))throw new Error('Invalid initial state');
  for(const frame of recording.frames) {
    if(frame.length!==5 || !frame.every(Number.isFinite))throw new Error('Invalid replay frame');
    const [turn,time,swell,flags,checksum]=frame;
    if(Math.abs(turn)>1.5 || swell<0 || swell>2 || !Number.isInteger(flags) || flags<0 || flags>15)throw new Error('Replay input out of range');
    step(state,{turn,throttle:Boolean(flags&1),brake:Boolean(flags&2),reverse:Boolean(flags&4),boost:Boolean(flags&8)},1/120,time,swell,(body)=>{
      let hit=false;for(const ship of traffic.boats)hit=collideTraffic(body,ship)||hit;return hit;
    });
    updateTraffic(traffic,state,1/120);
    if(!finitePhysicsState(state))throw new Error('Invalid replay state');
    if(checksum && stateChecksum(state,traffic)!==checksum)throw new Error('Replay checksum mismatch');
  }
  return {state,traffic};
}
