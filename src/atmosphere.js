import * as THREE from 'three';

export function createAtmosphere(scene, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#245f8d');
  gradient.addColorStop(0.46, '#b7d9d6');
  gradient.addColorStop(0.51, '#e7d5ad');
  gradient.addColorStop(1, '#294e4b');
  context.fillStyle = gradient; context.fillRect(0, 0, 512, 256);
  const glow = context.createRadialGradient(330, 70, 2, 330, 70, 60);
  glow.addColorStop(0, '#fff8df'); glow.addColorStop(0.1, '#fff2cd'); glow.addColorStop(1, '#fff2cd00');
  context.fillStyle = glow; context.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromEquirectangular(texture);
  scene.environment = environment.texture;
  scene.background = texture;
  scene.backgroundBlurriness = 0.12;
  generator.dispose();
  scene.fog = new THREE.Fog(0x8ab8c2, 700, 1150);
}
