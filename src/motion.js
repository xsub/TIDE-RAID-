export const MAX_MOTION_STEPS = 32;

export function advanceHull(body,dt,steeringRate,resolve) {
  let remaining=dt;
  let steps=0;
  const travelLimit=(body.beam ?? 2.8)*0.25;
  const reach=(body.length ?? 7.4)/2;
  while(remaining>1e-10 && steps<MAX_MOTION_STEPS) {
    const rotation=steeringRate+(body.yawRate ?? 0);
    const surfaceSpeed=Math.hypot(body.vx,body.vz)+Math.abs(rotation)*reach;
    const interval=Math.min(remaining,travelLimit/Math.max(surfaceSpeed,1e-9));
    body.x+=body.vx*interval;
    body.z+=body.vz*interval;
    body.heading=(body.heading ?? 0)+rotation*interval;
    resolve(body);
    remaining-=interval;
    steps++;
  }
  return {steps,discardedTime:Math.max(0,remaining)};
}
