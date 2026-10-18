import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVessel, VESSEL_STYLES} from '../src/vessels.js';

test('every fleet helm has an opaque overhead cover and side enclosure', () => {
  for (const style of Object.values(VESSEL_STYLES)) {
    const vessel = createVessel(style);
    vessel.updateMatrixWorld(true);
    const helm = style === 'cruiser' ? [0, 2.65, 0.1] : style === 'sail' ? [0, 1.65, -0.25] : [-0.56, 1.15, 0.2];
    const overhead = new THREE.Raycaster(new THREE.Vector3(helm[0], 6, helm[2]), new THREE.Vector3(0, -1, 0)).intersectObject(vessel);
    assert.ok(overhead.some((hit) => hit.point.y > helm[1] && !hit.object.material.transparent), `${style} roof`);
    const side = new THREE.Raycaster(new THREE.Vector3(4, helm[1], helm[2]), new THREE.Vector3(-1, 0, 0)).intersectObject(vessel);
    assert.ok(side.some((hit) => hit.point.x > 0 && !hit.object.material.transparent), `${style} glazing`);
    assert.equal(vessel.userData.helmEnclosed, true);
    assert.ok(vessel.children.length < 13);
    vessel.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry.dispose();
      child.material.dispose();
    });
  }
});
