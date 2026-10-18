import {performance} from 'node:perf_hooks';
import {createState,recover,step} from '../src/physics.js';
import {createTraffic,updateTraffic} from '../src/traffic.js';
import {boundaryAtlas} from '../src/water-boundary.js';
boundaryAtlas();
const body=createState();recover(body,0,1);
const traffic=createTraffic(body);
const timings=[];
for(let tick=1;tick<=12000;tick++) {
  const start=performance.now();
  step(body,{throttle:true,turn:Math.sin(tick/180)*0.2},1/120,tick/120,1);
  updateTraffic(traffic,body,1/120);
  if(tick>1200)timings.push(performance.now()-start);
  if(!Object.values(body).every(Number.isFinite))throw new Error('Invalid simulation state');
}
timings.sort((left,right)=>left-right);
console.log(JSON.stringify({scenario:'120 Hz hull + 18 traffic, 100 simulated seconds',samples:timings.length,meanMs:timings.reduce((total,value)=>total+value,0)/timings.length,p95Ms:timings[Math.floor(timings.length*0.95)],note:'Local CPU-only observation; no GPU timing or universal budget guarantee'},null,2));
