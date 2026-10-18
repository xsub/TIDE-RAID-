import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,saveBest,readBest} from '../src/race.js';
import {readPreferences,DEFAULT_BINDINGS} from '../src/preferences.js';
import {createReplayTape} from '../src/replay.js';
import {createState} from '../src/physics.js';
import {createTraffic} from '../src/traffic.js';
test('vessel records are isolated and invalid finish times never overwrite results',()=>{
  const store=new Map();const storage={getItem:(key)=>store.get(key),setItem:(key,value)=>store.set(key,value)};
  saveBest(storage,120);saveBest(storage,700,'boat-tug-a');
  assert.equal(readBest(storage),120);assert.equal(readBest(storage,'boat-tug-a'),700);
  assert.equal(saveBest(storage,NaN).saved,false);assert.equal(readBest(storage),120);
  assert.ok(createRace('ready','boat-tug-a').medalScale>createRace().medalScale);
});
test('malformed bindings are rejected while legacy remaps migrate without conflicts',()=>{
  for(const bindings of ['bad',12,[],true])assert.deepEqual(readPreferences({getItem:()=>JSON.stringify({bindings})}).bindings,DEFAULT_BINDINGS);
  const bindings={...DEFAULT_BINDINGS,throttle:'KeyB'};delete bindings.reverse;
  const migrated=readPreferences({getItem:()=>JSON.stringify({bindings})}).bindings;
  assert.equal(migrated.throttle,'KeyB');assert.equal(migrated.reverse,'KeyV');
});
test('replay memory allocation rejects invalid and unbounded capacities',()=>{
  const state=createState();const traffic=createTraffic(state);
  for(const capacity of [-1,0,Infinity,1e9,2.5])assert.throws(()=>createReplayTape(state,traffic,capacity),/capacity/);
});
