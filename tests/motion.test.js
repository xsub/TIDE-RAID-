import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceHull,MAX_MOTION_STEPS} from '../src/motion.js';
import {capsuleBox,capsuleCircle} from '../src/capsule.js';
import {contactImpulse} from '../src/collision.js';

const hull=() => ({x:-20,z:0,heading:0,vx:400,vz:0,yawRate:0,length:7.4,beam:2.8,mass:1400});
test('fast motion cannot skip a thin dock or a rock in the supported travel budget',()=>{
  for(const query of [(body)=>capsuleBox(body,{x:0,z:0,width:0.2,depth:20}),(body)=>capsuleCircle(body,{x:0,z:0,radius:1})]) {
    const body=hull();let hits=0;
    const result=advanceHull(body,0.1,0,()=>{
      const contact=query(body);if(!contact)return;
      hits++;
      body.x+=contact.normalX*(contact.depth+1e-6);body.z+=contact.normalZ*(contact.depth+1e-6);
      contactImpulse(body,null,contact.normalX,contact.normalZ,0,0,contact);
    });
    assert.ok(hits>0);assert.ok(body.x<0);assert.ok(result.steps<=MAX_MOTION_STEPS);
  }
});
test('rotation contributes to subdivision and absurd speeds stop at the work budget',()=>{
  const spinning={...hull(),vx:0,yawRate:20};
  assert.ok(advanceHull(spinning,0.1,0,()=>{}).steps>1);
  const body={...hull(),vx:1e9};
  const result=advanceHull(body,1,0,()=>{});
  assert.equal(result.steps,MAX_MOTION_STEPS);assert.ok(result.discardedTime>0.9);
  assert.ok(body.x<3);
});
test('normal motion uses one step and replays exactly',()=>{
  function run(){const body={...hull(),vx:40};const result=advanceHull(body,1/120,0,()=>{});return{body,result};}
  assert.equal(run().result.steps,1);assert.deepEqual(run(),run());
});
