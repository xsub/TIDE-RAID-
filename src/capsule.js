const clamp = (value) => Math.max(0,Math.min(1,value));

export function hullCapsule(body) {
  const radius = (body.beam ?? 2.8)/2;
  const half = Math.max(0,(body.length ?? 7.4)/2-radius);
  const offsetX = Math.sin(body.heading ?? 0)*half;
  const offsetZ = Math.cos(body.heading ?? 0)*half;
  return {ax:body.x-offsetX,az:body.z-offsetZ,bx:body.x+offsetX,bz:body.z+offsetZ,radius};
}

function nearest(segment,x,z) {
  const deltaX=segment.bx-segment.ax; const deltaZ=segment.bz-segment.az;
  const squared=deltaX*deltaX+deltaZ*deltaZ;
  const fraction=squared>1e-12 ? clamp(((x-segment.ax)*deltaX+(z-segment.az)*deltaZ)/squared) : 0;
  return {x:segment.ax+deltaX*fraction,z:segment.az+deltaZ*fraction};
}

function closest(first,second) {
  const firstX=first.bx-first.ax; const firstZ=first.bz-first.az;
  const secondX=second.bx-second.ax; const secondZ=second.bz-second.az;
  const offsetX=first.ax-second.ax; const offsetZ=first.az-second.az;
  const firstSquared=firstX**2+firstZ**2; const secondSquared=secondX**2+secondZ**2;
  const product=firstX*secondX+firstZ*secondZ;
  const firstOffset=firstX*offsetX+firstZ*offsetZ;
  const secondOffset=secondX*offsetX+secondZ*offsetZ;
  let fractionFirst=0; let fractionSecond=0;
  if(firstSquared<1e-12) fractionSecond=secondSquared>1e-12 ? clamp(secondOffset/secondSquared) : 0;
  else if(secondSquared<1e-12) fractionFirst=clamp(-firstOffset/firstSquared);
  else {
    const denominator=firstSquared*secondSquared-product*product;
    fractionFirst=denominator>1e-10 ? clamp((product*secondOffset-firstOffset*secondSquared)/denominator) : 0.5;
    fractionSecond=(product*fractionFirst+secondOffset)/secondSquared;
    if(fractionSecond<0) {fractionSecond=0;fractionFirst=clamp(-firstOffset/firstSquared);}
    else if(fractionSecond>1) {fractionSecond=1;fractionFirst=clamp((product-firstOffset)/firstSquared);}
  }
  return {firstX:first.ax+firstX*fractionFirst,firstZ:first.az+firstZ*fractionFirst,secondX:second.ax+secondX*fractionSecond,secondZ:second.az+secondZ*fractionSecond};
}

function separatingAxis(first,second,axes) {
  let best=null;
  for(const [axisX,axisZ] of axes) {
    const length=Math.hypot(axisX,axisZ);
    if(length<1e-9) continue;
    const normalX=axisX/length; const normalZ=axisZ/length;
    const firstA=first.ax*normalX+first.az*normalZ; const firstB=first.bx*normalX+first.bz*normalZ;
    const secondA=second.ax*normalX+second.az*normalZ; const secondB=second.bx*normalX+second.bz*normalZ;
    const positive=Math.max(secondA,secondB)+second.radius-Math.min(firstA,firstB)+first.radius;
    const negative=Math.max(firstA,firstB)+first.radius-Math.min(secondA,secondB)+second.radius;
    const sign=positive<=negative ? 1 : -1;
    const depth=Math.min(positive,negative);
    if(!best || depth<best.depth) best={normalX:normalX*sign,normalZ:normalZ*sign,depth};
  }
  return best;
}

export function capsulePair(firstBody,secondBody) {
  const first=hullCapsule(firstBody); const second=hullCapsule(secondBody);
  const reach=(firstBody.length ?? 7.4)/2+(secondBody.length ?? 7.4)/2;
  if(Math.abs(firstBody.x-secondBody.x)>reach || Math.abs(firstBody.z-secondBody.z)>reach) return null;
  const points=closest(first,second);
  const deltaX=points.firstX-points.secondX; const deltaZ=points.firstZ-points.secondZ;
  const distance=Math.hypot(deltaX,deltaZ); const radius=first.radius+second.radius;
  if(distance>=radius-1e-8) return null;
  const contact=distance>1e-8 ? {normalX:deltaX/distance,normalZ:deltaZ/distance,depth:radius-distance}
    : separatingAxis(first,second,[[first.bz-first.az,first.ax-first.bx],[second.bz-second.az,second.ax-second.bx],[1,0],[0,1]]);
  return {...contact,x:(points.firstX-contact.normalX*first.radius+points.secondX+contact.normalX*second.radius)/2,z:(points.firstZ-contact.normalZ*first.radius+points.secondZ+contact.normalZ*second.radius)/2};
}

export function capsuleCircle(body,circle) {
  const capsule=hullCapsule(body);
  const point=nearest(capsule,circle.x,circle.z);
  const deltaX=point.x-circle.x; const deltaZ=point.z-circle.z;
  const distance=Math.hypot(deltaX,deltaZ);
  const depth=capsule.radius+circle.radius-distance;
  if(depth<=1e-8) return null;
  const normalX=distance>1e-8 ? deltaX/distance : Math.cos(body.heading ?? 0);
  const normalZ=distance>1e-8 ? deltaZ/distance : -Math.sin(body.heading ?? 0);
  return {normalX,normalZ,depth,x:circle.x+normalX*circle.radius,z:circle.z+normalZ*circle.radius};
}

export function capsuleBox(body,box) {
  const capsule=hullCapsule(body);
  const lowX=box.x-box.width/2; const highX=box.x+box.width/2;
  const lowZ=box.z-box.depth/2; const highZ=box.z+box.depth/2;
  if(Math.max(capsule.ax,capsule.bx)+capsule.radius<lowX || Math.min(capsule.ax,capsule.bx)-capsule.radius>highX
    || Math.max(capsule.az,capsule.bz)+capsule.radius<lowZ || Math.min(capsule.az,capsule.bz)-capsule.radius>highZ) return null;
  const corners=[[lowX,lowZ],[highX,lowZ],[highX,highZ],[lowX,highZ]];
  let best=null; let squared=Infinity;
  for(let index=0;index<4;index++) {
    const start=corners[index]; const end=corners[(index+1)%4];
    const points=closest(capsule,{ax:start[0],az:start[1],bx:end[0],bz:end[1]});
    const next=(points.firstX-points.secondX)**2+(points.firstZ-points.secondZ)**2;
    if(next<squared) {squared=next;best=points;}
  }
  const inside=(x,z) => x>=lowX && x<=highX && z>=lowZ && z<=highZ;
  if(squared>1e-16 && !inside(capsule.ax,capsule.az) && !inside(capsule.bx,capsule.bz)) {
    const distance=Math.sqrt(squared);
    if(distance>=capsule.radius-1e-8) return null;
    return {normalX:(best.firstX-best.secondX)/distance,normalZ:(best.firstZ-best.secondZ)/distance,depth:capsule.radius-distance,x:best.secondX,z:best.secondZ};
  }
  let result=null;
  for(const [axisX,axisZ] of [[1,0],[0,1],[capsule.bz-capsule.az,capsule.ax-capsule.bx]]) {
    const length=Math.hypot(axisX,axisZ); if(length<1e-9) continue;
    const normalX=axisX/length; const normalZ=axisZ/length;
    const projections=corners.map(([x,z]) => x*normalX+z*normalZ);
    const first=capsule.ax*normalX+capsule.az*normalZ; const second=capsule.bx*normalX+capsule.bz*normalZ;
    const positive=Math.max(...projections)-Math.min(first,second)+capsule.radius;
    const negative=Math.max(first,second)+capsule.radius-Math.min(...projections);
    const sign=positive<=negative ? 1 : -1;
    const depth=Math.min(positive,negative);
    if(!result || depth<result.depth) result={normalX:normalX*sign,normalZ:normalZ*sign,depth};
  }
  return {...result,x:best.secondX,z:best.secondZ};
}
