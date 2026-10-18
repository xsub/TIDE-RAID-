export function dampedAttitude(angle,rate,target,frequency,dt) {
  const offset=angle-target;
  const combined=rate+frequency*offset;
  const decay=Math.exp(-frequency*dt);
  return {angle:target+(offset+combined*dt)*decay,rate:(rate-frequency*combined*dt)*decay};
}
