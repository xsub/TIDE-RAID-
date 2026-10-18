export function hullResponse(body, speed = 0) {
  const mass = Math.max(100, body.mass ?? 1400);
  const area = body.waterplaneArea ?? 6.7;
  const spring = 1025 * 9.81 * area / mass;
  const foreLoad = body.foreLoad ?? 0.5;
  const rollInertia = body.rollInertiaFactor ?? 1;
  const pitchInertia = body.pitchInertiaFactor ?? 1;
  const stability = Math.max(0.18, (body.beam ?? 2.8) * (body.stabilityFactor ?? 0.5) - (body.cgHeight ?? 0.65));
  const deadrise = (body.deadrise ?? 18) / 45;
  return {spring, damping: 4.5 * Math.sqrt(spring / 48), foreLoad,
    contactWidth: body.beam * (body.supportBeam ?? 0.32),
    contactLength: body.length * (body.supportLength ?? 0.257),
    pitchFrequency: Math.max(2, Math.min(8, 0.75 * Math.sqrt(spring / pitchInertia))),
    rollFrequency: Math.max(2, Math.min(10, 2.6 * Math.sqrt(9.81 * stability / (body.beam ** 2 / 12 * rollInertia)))),
    bank: Math.max(-0.3, Math.min(0.3, (body.yawRate ?? 0) * speed * (body.cgHeight ?? 0.65) / (9.81 * stability) * (body.bankFactor ?? 0.35))),
    dragScale: 1 + deadrise * 0.12,
    planingTrim: body.planingTrim ?? 0.045};
}
