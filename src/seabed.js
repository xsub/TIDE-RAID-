import * as THREE from 'three';
import {waterDepth} from './depth.js';
import {createSeagrass} from './seagrass.js';
import {createFish} from './fish.js';

export function seabedHeight(x, z, scale = 1) {return -waterDepth(x, z, scale);}
export function createSeabed(scene) {
  const group = new THREE.Group(); group.name = 'Local underwater terrain'; scene.add(group);
  const geometry = new THREE.PlaneGeometry(256, 256, 32, 32).rotateX(-Math.PI / 2);
  const uniforms = {uSeaTime: {value: 0}, uSeaSun: {value: 1}};
  const sand = new THREE.MeshStandardMaterial({color: 0xa4b298, roughness: 0.9});
  sand.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec3 vSeabed;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeabed=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vSeabed; uniform float uSeaTime; uniform float uSeaSun;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float ripple=sin(vSeabed.x*1.3+sin(vSeabed.z*0.9)+uSeaTime*0.8)*sin(vSeabed.z*1.15+sin(vSeabed.x*0.8)-uSeaTime*0.6);
      float caustic=pow(max(0.0,ripple),8.0)*uSeaSun*exp(vSeabed.y*0.035);
      diffuseColor.rgb*=vec3(0.7,0.92,0.87)*(0.75+caustic*1.4);`);
  };
  sand.customProgramCacheKey = () => 'underwater-sand-caustics-v1';
  const floor = new THREE.Mesh(geometry, sand); group.add(floor);
  const fallbackRock = new THREE.IcosahedronGeometry(1, 1);
  const fallbackMaterial = new THREE.MeshStandardMaterial({color: 0x697e75, roughness: 0.95});
  const rocks = new THREE.InstancedMesh(fallbackRock, fallbackMaterial, 48); rocks.count = 0; group.add(rocks);
  const rayPositions = []; const rayUv = [];
  for (let index = 0; index < 8; index++) {
    const lateral = (index % 4 - 1.5) * 13; const longitudinal = (Math.floor(index / 4) - 0.5) * 22;
    for (const [across, down] of [[-1,0],[1,0],[-1,1],[1,0],[1,1],[-1,1]]) {
      rayPositions.push(lateral + across * (1 + down * 2) + down * 8, -0.3 - down * 32, longitudinal + down * 4);
      rayUv.push((across + 1) / 2, down);
    }
  }
  const rayGeometry = new THREE.BufferGeometry(); rayGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3)); rayGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(rayUv, 2));
  const rayMaterial = new THREE.ShaderMaterial({uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vRayUv; varying vec3 vRayWorld; void main(){vRayUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vRayWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader: 'varying vec2 vRayUv; varying vec3 vRayWorld; uniform float uSeaSun; void main(){float fade=sin(vRayUv.y*3.14159)*pow(sin(vRayUv.x*3.14159),2.0);float distanceFade=exp(-distance(cameraPosition,vRayWorld)*0.035);gl_FragColor=vec4(0.55,0.86,0.74,fade*distanceFade*uSeaSun*0.065);}',
  });
  const rays = new THREE.Mesh(rayGeometry, rayMaterial); group.add(rays);
  const grass = createSeagrass(group);
  const fish = createFish(group);
  const transform = new THREE.Object3D(); let lastCell = ''; let centerX = 0; let centerZ = 0;
  function hash(x, z) {return Math.sin(x * 127.1 + z * 311.7) * 43758.5453 % 1 + 1;}
  return {
    setAssets(assets) {
      sand.map = assets.textures.sand.map; sand.needsUpdate = true;
      const source = assets.models.rock.far[0];
      if (source) {rocks.geometry = source.geometry; rocks.material = source.material; fallbackRock.dispose(); fallbackMaterial.dispose();}
      lastCell = '';
    },
    update(state, camera, time, amount, weather, ships = []) {
      group.visible = amount > 0.01;
      if (!group.visible) return;
      uniforms.uSeaTime.value = time; uniforms.uSeaSun.value = weather.sun;
      grass.animate(time, state);
      fish.update(state, camera, time, ships);
      rays.visible = weather.sun > 0.05;
      rays.position.set(state.x, 0, state.z);
      const cellX = Math.round(state.x / 32); const cellZ = Math.round(state.z / 32);
      const key = `${cellX}/${cellZ}/${state.depthScale ?? 1}`;
      if (key === lastCell) return;
      lastCell = key; centerX = cellX * 32; centerZ = cellZ * 32;
      grass.rebuild(cellX, cellZ, state.depthScale);
      const vertices = geometry.attributes.position; const uv = geometry.attributes.uv;
      for (let index = 0; index < vertices.count; index++) {
        const lateral = (index % 33 / 32 - 0.5) * 256 + centerX;
        const longitudinal = (Math.floor(index / 33) / 32 - 0.5) * 256 + centerZ;
        vertices.setXYZ(index, lateral, seabedHeight(lateral, longitudinal, state.depthScale), longitudinal); uv.setXY(index, lateral / 12, longitudinal / 12);
      }
      vertices.needsUpdate = true; uv.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      let count = 0;
      for (let row = -4; row < 4 && count < 48; row++) for (let column = -4; column < 4 && count < 48; column++) {
        const gridX = cellX * 2 + column; const gridZ = cellZ * 2 + row;
        const worldX = gridX * 16 + (hash(gridX, gridZ) % 1) * 5;
        const worldZ = gridZ * 16 + (hash(gridZ, gridX) % 1) * 5;
        if (Math.hypot(worldX - state.x, worldZ - state.z) < state.length * 0.6 + 4) continue;
        const size = 1.3 + (hash(gridX, gridZ) % 1) * 2;
        transform.position.set(worldX, seabedHeight(worldX, worldZ, state.depthScale) + size * 0.2, worldZ); transform.scale.set(size * 1.3, size, size * 1.1); transform.rotation.y = hash(worldX, worldZ) * Math.PI;
        transform.updateMatrix(); rocks.setMatrixAt(count++, transform.matrix);
      }
      rocks.count = count; rocks.instanceMatrix.needsUpdate = true; rocks.computeBoundingSphere();
    },
  };
}
