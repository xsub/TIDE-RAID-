import {bodyInertia} from './collision.js';

export function applyRudder(body,turn,forward,wet,dt) {
  const immersion=Math.max(0,Math.min(1,wet));
  const flow=Math.min(30,Math.abs(forward));
  const angle=Math.max(-1,Math.min(1,turn))*0.4;
  const force=0.5*1025*(body.rudderArea ?? 0.035)*flow*flow*Math.sin(angle)*immersion;
  const torque=-force*(body.length ?? 7.4)*0.35*Math.sign(forward);
  const damping=0.15+immersion*(1.8+Math.abs(forward)*0.035);
  const decay=Math.exp(-damping*dt);
  body.yawRate=(body.yawRate ?? 0)*decay+torque/bodyInertia(body)*(1-decay)/damping;
}
