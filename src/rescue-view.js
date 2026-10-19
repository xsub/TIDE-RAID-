import * as THREE from 'three';
import {sampleWave} from './waves.js';

export function createRescueView(scene) {
  const group = new THREE.Group(); group.name = 'Stranded rescue runabout'; group.visible = false; scene.add(group);
  const lampGeometry = new THREE.SphereGeometry(0.13, 8, 6);
  const lampMaterial = new THREE.MeshBasicMaterial({color: 0xffb34e});
  for (const side of [-1, 1]) {const lamp = new THREE.Mesh(lampGeometry, lampMaterial); lamp.position.set(side * 0.9, 2.3, 0.3); group.add(lamp);}
  let hull = null;
  return {setFactory(factory) {if (hull) return; hull = factory('boat-speed-a', 7.4); group.add(hull);}, update(activity, player, time, swell, enabled) {
    const boat = activity.rescueBoat;
    group.visible = Boolean(enabled && hull && activity.mode === 'rescue' && boat && ['assist', 'return'].includes(activity.phase) && Math.hypot(boat.x - player.x, boat.z - player.z) < 600);
    if (!group.visible) return;
    const wave = sampleWave(boat.x, boat.z, time, swell);
    group.position.set(boat.x, wave.h + 0.5, boat.z);
    group.rotation.set(Math.max(-0.18, Math.min(0.18, wave.dz * 0.4)), boat.heading, Math.max(-0.18, Math.min(0.18, wave.dx * 0.4)), 'YXZ');
    lampMaterial.color.setHex(activity.helped ? 0x65d9a0 : 0xffb34e);
    const pulse = 0.5 + Math.sin(time * 6) * 0.5;
    for (let index = 0; index < 2; index++) group.children[index].visible = activity.helped || pulse > 0.35;
  }};
}
