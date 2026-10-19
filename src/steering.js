import {bodyInertia} from './collision.js';

export function applyRudder(body,turn,forward,wet,dt,input={}) {
  const immersion=Math.max(0,Math.min(1,wet));
  const flow=Math.min(30,Math.abs(forward));
  const angle=Math.max(-1,Math.min(1,turn))*0.4;
  const force=0.5*1025*(body.rudderArea ?? 0.035)*flow*flow*Math.sin(angle)*immersion;
  const direction=input.brake ? 0 : input.reverse ? -1 : input.throttle ? 1 : 0;
  const thrust=direction ? Math.min(body.maxThrust ?? 0,(body.power ?? 0)/Math.max(5,Math.abs(forward))) * (direction<0 ? 0.25 : input.boost ? 1.35 : 1) : 0;
  const propellerForce=thrust*Math.max(0,Math.min(1,body.steerableThrust ?? 0))*Math.sin(angle)*immersion;
  const torque=-(force*Math.sign(forward)+propellerForce*direction)*(body.length ?? 7.4)*0.35;
  const damping=0.15+immersion*(1.8+Math.abs(forward)*0.035);
  const decay=Math.exp(-damping*dt);
  body.yawRate=(body.yawRate ?? 0)*decay+torque/bodyInertia(body)*(1-decay)/damping;
}
