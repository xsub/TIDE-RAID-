import {resolveCollision} from './world.js';
import {resolveHarborCollision} from './harbor-layout.js';

export const MAX_CONTACT_PASSES=3;

export function settleContacts(body,resolveTraffic=null) {
  let hit=false;
  for(let pass=0;pass<MAX_CONTACT_PASSES;pass++) {
    const world=resolveCollision(body);
    const harbor=resolveHarborCollision(body);
    const traffic=resolveTraffic ? resolveTraffic(body) : false;
    hit=world||harbor||traffic||hit;
    if(!world && !harbor && !traffic) break;
  }
  return hit;
}
