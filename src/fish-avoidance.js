export function fishEscape(x, y, z, player, ships = [], output = {}) {
  let pushX = 0; let pushZ = 0;
  const inspect = (boat) => {
    if (!boat || boat.active === false || !Number.isFinite(boat.x) || !Number.isFinite(boat.z)) return;
    const velocityX = Number.isFinite(boat.vx) ? boat.vx : 0;
    const velocityZ = Number.isFinite(boat.vz) ? boat.vz : 0;
    const speed = Math.hypot(velocityX, velocityZ);
    const prediction = Math.min(0.65, 12 / Math.max(1, speed));
    const travelX = velocityX * prediction; const travelZ = velocityZ * prediction;
    const travelSquared = travelX * travelX + travelZ * travelZ;
    const along = travelSquared > 0 ? Math.max(0, Math.min(1, ((x - boat.x) * travelX + (z - boat.z) * travelZ) / travelSquared)) : 0;
    const awayX = x - boat.x - travelX * along; const awayZ = z - boat.z - travelZ * along;
    const distance = Math.hypot(awayX, awayZ);
    const beam = Number.isFinite(boat.beam) ? Math.max(0, Math.min(16, boat.beam)) : 3;
    const range = 10 + beam * 0.5 + Math.min(8, speed * 0.2);
    const boatY = Number.isFinite(boat.y) ? boat.y : 0;
    const vertical = Math.max(0, 1 - Math.abs(y - boatY) / 16);
    const proximity = Math.max(0, 1 - distance / range);
    const aft = (x - boat.x) * Math.sin(boat.heading ?? 0) + (z - boat.z) * Math.cos(boat.heading ?? 0);
    const lateral = Math.abs((x - boat.x) * Math.cos(boat.heading ?? 0) - (z - boat.z) * Math.sin(boat.heading ?? 0));
    const wash = aft > 0 && aft < 18 ? Math.sin(aft / 18 * Math.PI) ** 2 * Math.exp(-lateral * lateral / 9) * Math.min(1, speed / 12) : 0;
    const strength = Math.min(1, proximity * proximity * (3 - 2 * proximity) + wash * 0.7) * vertical;
    pushX += (distance > 0.001 ? awayX / distance : 1) * strength;
    pushZ += (distance > 0.001 ? awayZ / distance : 0) * strength;
  };
  inspect(player);
  for (let index = 0; index < Math.min(32, ships.length); index++) inspect(ships[index]);
  const magnitude = Math.hypot(pushX, pushZ);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  output.x = pushX * scale; output.z = pushZ * scale; output.strength = Math.min(1, magnitude);
  return output;
}
