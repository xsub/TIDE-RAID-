const sport={mass:1400,length:7.4,beam:2.8,power:950000,maxThrust:28000,waterDrag:0.0045,planingSpeed:45,planingLift:0.06,rudderArea:0.035,draft:0.55,lateralGrip:2.6};
export const VESSEL_PROFILES=Object.freeze({
  'boat-cat-42':Object.freeze({...sport,mass:1600,length:9.4,beam:3.7,power:1100000,maxThrust:30000,waterDrag:0.004,planingSpeed:32,planingLift:0.04,draft:0.45,lateralGrip:2.1}),
  'boat-speed-c':Object.freeze(sport),
  'boat-speed-a':Object.freeze({...sport,mass:1800,power:600000,maxThrust:24000,waterDrag:0.0055,planingSpeed:32,draft:0.65}),
  'boat-house-a':Object.freeze({...sport,mass:4200,length:11,beam:4.16,power:380000,maxThrust:18000,waterDrag:0.006,planingSpeed:25,planingLift:0.025,rudderArea:0.09,draft:1.1,lateralGrip:1.8}),
  'boat-tug-a':Object.freeze({...sport,mass:3000,length:12,beam:4.54,power:45000,maxThrust:3500,waterDrag:0.009,planingSpeed:100,planingLift:0,rudderArea:0.12,draft:1.6,lateralGrip:3.2}),
  'boat-speed-d':Object.freeze({...sport,mass:1700,power:450000,maxThrust:18000,waterDrag:0.005,planingSpeed:30,draft:0.65}),
});
export const vesselProfile=(model)=>VESSEL_PROFILES[model] ?? VESSEL_PROFILES['boat-speed-c'];

export function propulsionAcceleration(state,input,forward,wet,dt) {
  if(input.brake) return -Math.sign(forward)*Math.min(Math.abs(forward)/dt,30);
  const direction=input.reverse ? -1 : input.throttle ? 1 : 0;
  if(!direction || (direction<0 && forward < -5)) return 0;
  const power=state.power ?? sport.power;
  const thrust=state.maxThrust ?? sport.maxThrust;
  const reverseScale=direction<0 ? 0.25 : 1;
  const boost=input.boost && direction>0 ? 1.35 : 1;
  return direction*Math.min(thrust,power/Math.max(5,Math.abs(forward)))*reverseScale*boost/(state.mass ?? sport.mass);
}
