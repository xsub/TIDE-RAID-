export function wakeResponse(body, ships, time, dt) {
  let roll = 0; let pitch = 0; let strength = 0;
  let crossingImpact = 0; let crossingSide = 1;
  for (let index = 0; index < Math.min(32, ships.length); index++) {
    const ship = ships[index]; if (!ship.active || ship.speed < 3) continue;
    const heading = ship.heading ?? 0; const deltaX = body.x - ship.x; const deltaZ = body.z - ship.z;
    const aft = deltaX * Math.sin(heading) + deltaZ * Math.cos(heading);
    if (aft < 3 || aft > 85) continue;
    const across = deltaX * Math.cos(heading) - deltaZ * Math.sin(heading);
    const edge = Math.abs(across) - aft * 0.25;
    const envelope = Math.exp(-edge * edge / 9) * Math.sin(Math.PI * (aft - 3) / 82) ** 2 * Math.min(1, ship.speed / 15);
    const phase = aft * 0.7 - time * 5;
    const relativeX = (body.vx ?? 0) - (ship.vx ?? -Math.sin(heading) * ship.speed);
    const relativeZ = (body.vz ?? 0) - (ship.vz ?? -Math.cos(heading) * ship.speed);
    const normalX = Math.sign(across) * Math.cos(heading) - 0.25 * Math.sin(heading);
    const normalZ = -Math.sign(across) * Math.sin(heading) - 0.25 * Math.cos(heading);
    const crossingSpeed = Math.abs(relativeX * normalX + relativeZ * normalZ);
    const impact = envelope * Math.min(1, crossingSpeed / 12);
    if (impact > crossingImpact) {crossingImpact = impact; crossingSide = Math.sign(normalX * Math.cos(body.heading) - normalZ * Math.sin(body.heading)) || 1;}
    const response = envelope * Math.sin(phase);
    roll += response * Math.sign(across) * Math.cos(body.heading - heading);
    pitch += response * Math.sin(body.heading - heading); strength = Math.max(strength, envelope);
  }
  const inertia = Math.min(1, 1800 / Math.max(800, body.mass));
  body.rollRate += Math.max(-1, Math.min(1, roll)) * inertia * dt * 1.8;
  body.pitchRate += Math.max(-1, Math.min(1, pitch)) * inertia * dt;
  body.vy += Math.max(-1, Math.min(1, roll + pitch)) * inertia * dt * 0.6;
  body.wakeStrength = strength;
  body.wakeEvent ??= 0; body.wakeContact ??= 0; body.wakeLastTime ??= -1000000;
  if (strength < 0.12 || (body.airtime ?? 0) > 0.15) body.wakeContact = 0;
  if (strength > 0.3 && crossingImpact > 0.07 && !body.wakeContact && (body.airtime ?? 0) <= 0.15 && time - body.wakeLastTime >= 0.5) {
    body.wakeContact = 1; body.wakeEvent++; body.wakeImpact = crossingImpact; body.wakeSide = crossingSide; body.wakeLastTime = time;
  }
}
