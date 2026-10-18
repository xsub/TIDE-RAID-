import test from 'node:test';
import assert from 'node:assert/strict';
import {contactImpulse} from '../src/collision.js';
import {settleContacts,MAX_CONTACT_PASSES} from '../src/contacts.js';
import {createState,recover} from '../src/physics.js';

test('slow contacts stop closing without tiny repeated rebounds',()=>{
  const body={mass:1400,vx:-0.1,vz:0,yawRate:0};
  contactImpulse(body,null,1,0,0.8,0);
  assert.equal(body.vx,0);
  for(let index=0;index<100;index++) assert.equal(contactImpulse(body,null,1,0,0.8,0).impulse,0);
});
test('settling retries changed contacts in a bounded fixed order',()=>{
  const body=createState();recover(body,0,0);let calls=0;
  assert.equal(settleContacts(body,()=>{calls++;return calls===1;}),true);
  assert.equal(calls,2);
  calls=0;
  settleContacts(body,()=>{calls++;return true;});
  assert.equal(calls,MAX_CONTACT_PASSES);
});
test('resting-contact settlement is deterministic and finite under repeated calls',()=>{
  function run(){const body=createState();recover(body,0,0);for(let tick=0;tick<1000;tick++)settleContacts(body);return body;}
  assert.deepEqual(run(),run());assert.ok(Object.values(run()).every(Number.isFinite));
});
