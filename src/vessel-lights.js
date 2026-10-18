import * as THREE from 'three';

const navigationMaterial = new THREE.PointsMaterial({size: 0.22, vertexColors: true, toneMapped: false});
const beamGeometry = new THREE.ConeGeometry(5, 55, 12, 1, true).rotateX(Math.PI / 2).translate(0, 1.3, -28);
const beamMaterial = new THREE.MeshBasicMaterial({color: 0xcce9ff, transparent: true, opacity: 0.018, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false});
navigationMaterial.onBeforeCompile = (shader) => {shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'void main() { if (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};

export function createVesselLights(length, beam) {
  const group = new THREE.Group(); group.name = 'Navigation lamps and forward beam';
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-beam * 0.42, 0.65, -length * 0.15, beam * 0.42, 0.65, -length * 0.15, 0, 1.5, 0, 0, 0.6, length * 0.4], 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([3, 0.05, 0.02, 0.02, 2.5, 0.2, 3, 2.8, 2.1, 2.5, 2.5, 2.2], 3));
  group.add(new THREE.Points(geometry, navigationMaterial));
  const cone = new THREE.Mesh(beamGeometry, beamMaterial); cone.position.z = -length * 0.4; group.add(cone);
  return group;
}
