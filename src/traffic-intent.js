export function trafficIntent(ship,others,player) {
  let speedFactor=1;let offset=0;
  function consider(other) {
    if(other===ship || other.active===false)return;
    const deltaX=other.x-ship.x;const deltaZ=other.z-ship.z;
    if(Math.abs(deltaX)>100 || Math.abs(deltaZ)>120)return;
    const relativeX=(other.vx ?? 0)-ship.vx;const relativeZ=(other.vz ?? 0)-ship.vz;
    const squared=relativeX**2+relativeZ**2;
    const time=squared>1e-6 ? Math.max(0,Math.min(4,-(deltaX*relativeX+deltaZ*relativeZ)/squared)) : 0;
    const distance=Math.hypot(deltaX+relativeX*time,deltaZ+relativeZ*time);
    const clearance=((ship.length ?? 7.4)+(other.length ?? 7.4))*0.5+5;
    if(distance>=clearance)return;
    if(deltaZ<0)speedFactor=Math.min(speedFactor,Math.max(0.15,time/4));
    const side=deltaX===0 ? (ship.id%2 ? -1 : 1) : -Math.sign(deltaX);
    offset=side*Math.max(Math.abs(offset),Math.min(12,clearance-distance));
  }
  for(const other of others)consider(other);
  if(player)consider(player);
  return {speedFactor,offset};
}
