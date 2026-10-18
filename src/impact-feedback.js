export function impactFeedback(energy,material=0,landing=false) {
  const safeEnergy=Number.isFinite(energy) ? Math.max(0,energy) : 0;
  const strength=Math.sqrt(1-Math.exp(-safeEnergy/(landing ? 15000 : 100000)));
  return {gain:(landing ? 0.02 : 0.025)+strength*(landing ? 0.065 : 0.105),cutoff:landing ? 1200+strength*800 : material===2 ? 180 : material===3 ? 650 : 430,strength};
}
