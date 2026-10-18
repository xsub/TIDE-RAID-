const sport={mass:1400,length:7.4,beam:2.8,power:950000,maxThrust:28000,waterDrag:0.0045,planingSpeed:45,planingLift:0.06,rudderArea:0.035,draft:0.55,lateralGrip:2.6,waterplaneArea:6.7,foreLoad:0.44,cgHeight:0.65,deadrise:22,supportBeam:0.32,supportLength:0.257,yawInertiaFactor:1,pitchInertiaFactor:1,rollInertiaFactor:1,stabilityFactor:0.5,bankFactor:0.35,planingTrim:0.045};
export const VESSEL_PROFILES=Object.freeze({
  'boat-cat-42':Object.freeze({...sport,mass:1600,length:9.4,beam:3.7,power:1100000,maxThrust:30000,waterDrag:0.004,planingSpeed:32,planingLift:0.04,draft:0.45,lateralGrip:2.1,waterplaneArea:8.3,foreLoad:0.4,cgHeight:0.5,deadrise:12,supportBeam:0.39,yawInertiaFactor:1.25,pitchInertiaFactor:1.1,rollInertiaFactor:1.5,stabilityFactor:0.75,bankFactor:0.08,planingTrim:0.025}),
  'boat-speed-c':Object.freeze(sport),
  'boat-speed-a':Object.freeze({...sport,mass:1800,power:600000,maxThrust:24000,waterDrag:0.0055,planingSpeed:32,draft:0.65,waterplaneArea:7.4,foreLoad:0.47,cgHeight:0.8,deadrise:18,pitchInertiaFactor:1.15}),
  'boat-house-a':Object.freeze({...sport,mass:4200,length:11,beam:4.16,power:380000,maxThrust:18000,waterDrag:0.006,planingSpeed:25,planingLift:0.025,rudderArea:0.09,draft:1.1,lateralGrip:1.8,waterplaneArea:16.5,foreLoad:0.52,cgHeight:1.65,deadrise:12,yawInertiaFactor:1.25,pitchInertiaFactor:1.4,rollInertiaFactor:1.7,bankFactor:0.15,planingTrim:0.03}),
  'boat-tug-a':Object.freeze({...sport,mass:3000,length:12,beam:4.54,power:45000,maxThrust:3500,waterDrag:0.009,planingSpeed:100,planingLift:0,rudderArea:0.12,draft:1.6,lateralGrip:3.2,waterplaneArea:9.5,foreLoad:0.5,cgHeight:0.55,deadrise:30,supportBeam:0.27,yawInertiaFactor:1.45,pitchInertiaFactor:1.5,rollInertiaFactor:1.8,stabilityFactor:0.6,bankFactor:0.12,planingTrim:0}),
  'boat-speed-d':Object.freeze({...sport,mass:1700,power:450000,maxThrust:18000,waterDrag:0.005,planingSpeed:30,draft:0.65,waterplaneArea:6.8,foreLoad:0.48,cgHeight:0.7,deadrise:16,pitchInertiaFactor:1.2}),
});
export const PILOT_HELMS = Object.freeze({
  'boat-speed-c': Object.freeze({helmHeight: 1.45, helmForward: 0.1, helmSide: -0.45}),
  'boat-cat-42': Object.freeze({helmHeight: 1.1, helmForward: -0.6, helmSide: -0.25}),
  'boat-speed-a': Object.freeze({helmHeight: 1.5, helmForward: 0.1, helmSide: -0.45}),
  'boat-house-a': Object.freeze({helmHeight: 3.1, helmForward: 0.1, helmSide: -0.25}),
  'boat-tug-a': Object.freeze({helmHeight: 1.9, helmForward: 0.2, helmSide: -0.3}),
  'boat-speed-d': Object.freeze({helmHeight: 1.4, helmForward: 0.1, helmSide: -0.45}),
});
export const vesselProfile=(model)=>({... (VESSEL_PROFILES[model] ?? VESSEL_PROFILES['boat-speed-c']), ...(PILOT_HELMS[model] ?? PILOT_HELMS['boat-speed-c'])});
export const VESSEL_HANDLING = Object.freeze({
  'boat-speed-c': 'Deep-V racer · aft-loaded · responsive bank and pitch',
  'boat-cat-42': 'Twin-sponson racer · low center of gravity · wide, flatter cornering',
  'boat-speed-a': 'Coastal runabout · moderate V · softer, slower wave response',
  'boat-house-a': 'Heavy cruiser · high center of gravity · slower roll and yaw response',
  'boat-tug-a': 'Ballasted sailboat · displacement hull · auxiliary propulsion, no planing lift',
  'boat-speed-d': 'Classic runabout · moderate V · balanced trim and measured pitch',
});

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
