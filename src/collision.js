export const VESSEL_MASS = {'boat-speed-c': 1400, 'boat-speed-a': 1800, 'boat-house-a': 4200, 'boat-tug-a': 3000, 'boat-speed-d': 1700, 'boat-cat-42': 1600};

export function bodyMass(body) {
  return Number.isFinite(body.mass) && body.mass > 0 ? body.mass : 1400;
}

function kinetic(body, mass) {
  return body ? 0.5 * mass * (body.vx * body.vx + body.vz * body.vz) + 0.5*bodyInertia(body)*(body.yawRate ?? 0)**2 : 0;
}

export function bodyInertia(body) {
  const length = body.length ?? 7.4;
  const beam = body.beam ?? 2.8;
  return bodyMass(body)*(length*length+beam*beam)/12;
}

export function hullContact(body, normalX, normalZ) {
  const heading = body.heading ?? 0;
  const cosine = Math.cos(heading); const sine = Math.sin(heading);
  const lateral = normalX*cosine-normalZ*sine;
  const longitudinal = normalX*sine+normalZ*cosine;
  const halfBeam = (body.beam ?? 2.8)/2;
  const halfLength = (body.length ?? 7.4)/2;
  const denominator = Math.max(1e-9,Math.hypot(halfBeam*lateral,halfLength*longitudinal));
  const localX = -halfBeam*halfBeam*lateral/denominator;
  const localZ = -halfLength*halfLength*longitudinal/denominator;
  return {x:body.x+localX*cosine+localZ*sine,z:body.z-localX*sine+localZ*cosine};
}

export function contactImpulse(first, second, normalX, normalZ, restitution = 0.12, friction = 0.25, contact = null) {
  const length = Math.hypot(normalX, normalZ);
  if (length < 1e-9) return {impulse: 0, energyLost: 0};
  normalX /= length; normalZ /= length;
  const firstMass = bodyMass(first);
  const secondMass = second ? bodyMass(second) : 0;
  const inverseFirst = 1 / firstMass;
  const inverseSecond = second ? 1 / secondMass : 0;
  const inverseSum = inverseFirst + inverseSecond;
  const firstX = contact ? contact.x-first.x : 0; const firstZ = contact ? contact.z-first.z : 0;
  const secondX = contact && second ? contact.x-second.x : 0; const secondZ = contact && second ? contact.z-second.z : 0;
  const inverseInertiaFirst = contact ? 1/bodyInertia(first) : 0;
  const inverseInertiaSecond = contact && second ? 1/bodyInertia(second) : 0;
  const normalArmFirst = firstZ*normalX-firstX*normalZ;
  const normalArmSecond = secondZ*normalX-secondX*normalZ;
  const relativeX = first.vx+(first.yawRate ?? 0)*firstZ-(second?.vx ?? 0)-(second?.yawRate ?? 0)*secondZ;
  const relativeZ = first.vz-(first.yawRate ?? 0)*firstX-(second?.vz ?? 0)+(second?.yawRate ?? 0)*secondX;
  const closing = relativeX * normalX + relativeZ * normalZ;
  if (closing >= 0) return {impulse: 0, energyLost: 0};
  const before = kinetic(first,firstMass) + kinetic(second,secondMass);
  const bounce = closing > -0.5 ? 0 : Math.max(0,Math.min(1,restitution));
  const impulse = -(1 + bounce) * closing / (inverseSum+normalArmFirst**2*inverseInertiaFirst+normalArmSecond**2*inverseInertiaSecond);
  function apply(impulseX,impulseZ) {
    first.vx += impulseX*inverseFirst; first.vz += impulseZ*inverseFirst;
    if (contact) first.yawRate = (first.yawRate ?? 0)+(firstZ*impulseX-firstX*impulseZ)*inverseInertiaFirst;
    if (second) {
      second.vx -= impulseX*inverseSecond; second.vz -= impulseZ*inverseSecond;
      if (contact) second.yawRate = (second.yawRate ?? 0)-(secondZ*impulseX-secondX*impulseZ)*inverseInertiaSecond;
    }
  }
  apply(normalX*impulse,normalZ*impulse);
  const tangentX = -normalZ; const tangentZ = normalX;
  const tangentArmFirst = firstZ*tangentX-firstX*tangentZ;
  const tangentArmSecond = secondZ*tangentX-secondX*tangentZ;
  const tangentVelocity = (first.vx+(first.yawRate ?? 0)*firstZ-(second?.vx ?? 0)-(second?.yawRate ?? 0)*secondZ)*tangentX
    +(first.vz-(first.yawRate ?? 0)*firstX-(second?.vz ?? 0)+(second?.yawRate ?? 0)*secondX)*tangentZ;
  const frictionLimit = Math.max(0,friction) * impulse;
  const tangentImpulse = Math.max(-frictionLimit,Math.min(frictionLimit,-tangentVelocity/(inverseSum+tangentArmFirst**2*inverseInertiaFirst+tangentArmSecond**2*inverseInertiaSecond)));
  apply(tangentX*tangentImpulse,tangentZ*tangentImpulse);
  const energyLost = Math.max(0,before-kinetic(first,firstMass)-kinetic(second,secondMass));
  first.impactEnergy = energyLost;
  if (second) second.impactEnergy = energyLost;
  return {impulse,energyLost};
}
