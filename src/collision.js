export const VESSEL_MASS = {'boat-speed-c': 1400, 'boat-speed-a': 1800, 'boat-house-a': 4200, 'boat-tug-a': 3000, 'boat-speed-d': 1700};

export function bodyMass(body) {
  return Number.isFinite(body.mass) && body.mass > 0 ? body.mass : 1400;
}

function kinetic(body, mass) {
  return body ? 0.5 * mass * (body.vx * body.vx + body.vz * body.vz) : 0;
}

export function contactImpulse(first, second, normalX, normalZ, restitution = 0.12, friction = 0.25) {
  const length = Math.hypot(normalX, normalZ);
  if (length < 1e-9) return {impulse: 0, energyLost: 0};
  normalX /= length; normalZ /= length;
  const firstMass = bodyMass(first);
  const secondMass = second ? bodyMass(second) : 0;
  const inverseFirst = 1 / firstMass;
  const inverseSecond = second ? 1 / secondMass : 0;
  const inverseSum = inverseFirst + inverseSecond;
  const relativeX = first.vx - (second?.vx ?? 0);
  const relativeZ = first.vz - (second?.vz ?? 0);
  const closing = relativeX * normalX + relativeZ * normalZ;
  if (closing >= 0) return {impulse: 0, energyLost: 0};
  const before = kinetic(first,firstMass) + kinetic(second,secondMass);
  const impulse = -(1 + Math.max(0,Math.min(1,restitution))) * closing / inverseSum;
  const tangentX = -normalZ; const tangentZ = normalX;
  const tangentVelocity = relativeX * tangentX + relativeZ * tangentZ;
  const frictionLimit = Math.max(0,friction) * impulse;
  const tangentImpulse = Math.max(-frictionLimit,Math.min(frictionLimit,-tangentVelocity/inverseSum));
  const impulseX = normalX * impulse + tangentX * tangentImpulse;
  const impulseZ = normalZ * impulse + tangentZ * tangentImpulse;
  first.vx += impulseX * inverseFirst; first.vz += impulseZ * inverseFirst;
  if (second) {second.vx -= impulseX * inverseSecond; second.vz -= impulseZ * inverseSecond;}
  const energyLost = Math.max(0,before-kinetic(first,firstMass)-kinetic(second,secondMass));
  first.impactEnergy = energyLost;
  if (second) second.impactEnergy = energyLost;
  return {impulse,energyLost};
}
