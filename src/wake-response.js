export function wakeResponse(body, ships, time, dt) {
  let roll = 0; let pitch = 0; let strength = 0;
  for (let index = 0; index < Math.min(32, ships.length); index++) {
    const ship = ships[index]; if (!ship.active || ship.speed < 3) continue;
    const heading = ship.heading ?? 0; const deltaX = body.x - ship.x; const deltaZ = body.z - ship.z;
    const aft = deltaX * Math.sin(heading) + deltaZ * Math.cos(heading);
    if (aft < 3 || aft > 85) continue;
    const across = deltaX * Math.cos(heading) - deltaZ * Math.sin(heading);
    const edge = Math.abs(across) - aft * 0.25;
    const envelope = Math.exp(-edge * edge / 9) * Math.sin(Math.PI * (aft - 3) / 82) ** 2 * Math.min(1, ship.speed / 15);
    const phase = aft * 0.7 - time * 5;
    const response = envelope * Math.sin(phase);
    roll += response * Math.sign(across) * Math.cos(body.heading - heading);
    pitch += response * Math.sin(body.heading - heading); strength = Math.max(strength, envelope);
  }
  const inertia = Math.min(1, 1800 / Math.max(800, body.mass));
  body.rollRate += Math.max(-1, Math.min(1, roll)) * inertia * dt * 1.8;
  body.pitchRate += Math.max(-1, Math.min(1, pitch)) * inertia * dt;
  body.vy += Math.max(-1, Math.min(1, roll + pitch)) * inertia * dt * 0.6;
  body.wakeStrength = strength;
}
