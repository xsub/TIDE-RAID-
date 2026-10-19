import * as THREE from 'three';
import {getWavelength, waterMeshPolicy} from './wave-settings.js';
import {channel, chunkFeatures, chunkIndex, CHUNK_SIZE, CHUNK_COUNT, START_Z} from './world.js';
import {createWaterMaterial} from './water-material.js';
import {boundaryAtlas, BOUNDARY_WIDTH, BOUNDARY_HEIGHT} from './water-boundary.js';
import {createNature} from './nature-view.js';
import {createHarbors} from './harbors.js';
import {beachWidth, coastHeight, islandHeight} from './nature.js';
import {organicRock,sandyShore,naturalMaterial} from './natural-surfaces.js';
import {createSceneryFade} from './scenery-fade.js';

export function createWater(scene) {
  const boundary = new THREE.DataTexture(boundaryAtlas(), BOUNDARY_WIDTH, BOUNDARY_HEIGHT, THREE.RedFormat, THREE.UnsignedByteType);
  boundary.minFilter = THREE.NearestFilter; boundary.magFilter = THREE.NearestFilter;
  boundary.generateMipmaps = false; boundary.needsUpdate = true;
  const uniforms = {uTime: {value: 0}, uSwell: {value: 1}, uFaceted: {value: 0}, uBoat: {value: new THREE.Vector2()}, uHeading: {value: 0}, uSpeed: {value: 0}, uDay: {value: 1}, uCloud: {value: 0}, uGlow: {value: 0}, uSunDirection: {value: new THREE.Vector3(-0.58, 0.46, -0.67).normalize()}};
  uniforms.uBoundary = {value: boundary};
  uniforms.uHarborShelter = {value: 0};
  uniforms.uWavelength = {value: 1};
  uniforms.uHeadlight = {value: 1};
  const material = createWaterMaterial(uniforms);
  const group = new THREE.Group();
  scene.add(group);
  let geometry = new THREE.BufferGeometry();
  let segments;
  let centerSegments; let centerGeometry = new THREE.BufferGeometry(); let requestedDetail = 25;
  let nearGeometry = new THREE.BufferGeometry();
  const tiles = [];
  const size = 256;
  for (let index = 0; index < 25; index++) {
    const tile = new THREE.Mesh(geometry, material);
    tile.frustumCulled = false;
    tiles.push(tile);
    group.add(tile);
  }
  function setDetail(value, swell = 1) {
    requestedDetail = value;
    const policy = waterMeshPolicy(value, swell, getWavelength()); const next = policy.segments;
    if (next !== segments || policy.center !== centerSegments) {
      geometry?.dispose();
      nearGeometry.dispose();
      centerGeometry.dispose();
      geometry = new THREE.PlaneGeometry(size, size, next, next);
      geometry.rotateX(-Math.PI / 2);
      nearGeometry = new THREE.PlaneGeometry(size, size, next * 2, next * 2);
      nearGeometry.rotateX(-Math.PI / 2);
      centerGeometry = new THREE.PlaneGeometry(size, size, policy.center, policy.center).rotateX(-Math.PI / 2);
      tiles.forEach((tile, index) => {tile.geometry = index === 12 ? centerGeometry : Math.abs(index % 5 - 2) <= 1 && Math.abs(Math.floor(index / 5) - 2) <= 1 ? nearGeometry : geometry;});
      segments = next;
      centerSegments = policy.center;
    }
    const faceted = value < 55;
    uniforms.uFaceted.value = faceted ? 1 : 0;
    return `${faceted ? 'Faceted' : 'Smooth'} · ${(96 * segments * segments + 2 * centerSegments * centerSegments) / 1000}k triangles${policy.refined ? ' · rough-sea refinement' : ''}`;
  }
  setDetail(25);
  return {
    setDetail,
    update(x, z, time, swell, heading = 0, speed = 0, weather = null) {
      if (weather) {
        uniforms.uHarborShelter.value = weather.harborShelter ? 1 : 0;
        uniforms.uHeadlight.value = weather.headlight ?? 1;
        uniforms.uDay.value = weather.daylight; uniforms.uCloud.value = weather.cloud; uniforms.uGlow.value = weather.glow;
        uniforms.uSunDirection.value.set(-0.58, Math.max(0.05, weather.elevation), -0.67).normalize();
      }
      uniforms.uTime.value = time;
      uniforms.uSwell.value = swell;
      uniforms.uWavelength.value = getWavelength();
      const quality = setDetail(requestedDetail, weather?.baseSwell ?? swell);
      uniforms.uBoat.value.set(x, z);
      uniforms.uHeading.value = heading;
      uniforms.uSpeed.value = speed;
      const originX = Math.round(x / size) * size;
      const originZ = Math.round(z / size) * size;
      tiles.forEach((tile, index) => tile.position.set(originX + (index % 5 - 2) * size, 0, originZ + (Math.floor(index / 5) - 2) * size));
      return quality;
    },
  };
}

export function createScenery(scene,realAssets=null) {
  const grass = naturalMaterial({color: 0xc7cbb8, vertexColors: true, roughness: 1, side: THREE.DoubleSide},0.9,'grass');
  const islandGrass = naturalMaterial({color: 0xa6b292, roughness: 1, side: THREE.DoubleSide},0.9,'grass');
  const sand = naturalMaterial({color: 0xffffff, roughness: 1, side: THREE.DoubleSide},2,'sand');
  const beachSand = sand.clone(); beachSand.vertexColors = true;
  beachSand.onBeforeCompile=sand.onBeforeCompile;beachSand.customProgramCacheKey=sand.customProgramCacheKey;
  const rock = naturalMaterial({color: 0xffffff, roughness: 0.95},1.8,'rock');
  const stone = organicRock(20,14);
  const cylinder = sandyShore();
  const fade = createSceneryFade();
  const nature = createNature(realAssets, fade);
  const harbors = createHarbors(fade);
  const sharedGeometry = new Set([stone, cylinder, ...nature.shared, ...harbors.shared]);
  const loaded = new Map();
  function sourcedRock(x,y,z,width,height) {
    const group=new THREE.Group();const model=realAssets.models.rock;
    for(const level of ['near','far'])for(const part of model[level]) {
      const mesh=new THREE.Mesh(part.geometry,part.material);mesh.userData.rockLevel=level;group.add(mesh);
    }
    group.position.set(x,y,z);group.scale.set(width/(model.width/model.height),height,width/(model.width/model.height));
    group.userData.realRock=true;return group;
  }
  function strip(index, side, beach) {
    const positions = [];
    const indices = [];
    const colors = [];
    const distances = beach ? [0,0.2,0.45,0.7,1] : [0,3,7,12,20,30,45,65,100,150,220,320,450,560,700];
    const columns = distances.length - 1;
    const rows = 64;
    for (let row = 0; row <= rows; row++) {
      const z = START_Z - index * CHUNK_SIZE - row * CHUNK_SIZE / rows;
      const banks = channel(z);
      const edge = side === -1 ? banks.left : banks.right;
      const beachSize = beachWidth(z, side);
      for (let column = 0; column <= columns; column++) {
        const distance = distances[column];
        const x = edge + side * (beach ? distance * beachSize : beachSize + distance);
        const height = beach ? -0.45 + distance * 1.55 : coastHeight(x, z, distance);
        positions.push(x, height, z);
        const shade = 0.82 + 0.18 * Math.sin(x * 0.023 + z * 0.011);
        const meadow = 0.5 + 0.5 * Math.sin(x * 0.015 + Math.sin(z * 0.013));
        if (beach) colors.push(0.64 + distance * 0.36, 0.68 + distance * 0.32, 0.66 + distance * 0.34);
        else colors.push((0.27 + meadow * 0.1) * shade, (0.43 + meadow * 0.08) * shade, (0.23 + meadow * 0.025) * shade);
      }
      if (row < rows) {
        for (let column = 0; column < columns; column++) {
          const base = row * (columns + 1) + column;
          indices.push(base, base + 1, base + columns + 1, base + 1, base + columns + 2, base + columns + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, beach ? beachSand : grass);
  }
  function islandSurface(radius) {
    const positions = [];
    const indices = [];
    const segments = 64;
    const rings = [0,0.15,0.3,0.45,0.6,0.75,0.9,1];
    rings.forEach((fraction, ring) => {
      for (let angle = 0; angle < segments; angle++) {
        const phase = angle / segments * Math.PI * 2;
        positions.push(Math.cos(phase) * radius * fraction, islandHeight(fraction), Math.sin(phase) * radius * fraction);
        if (ring === rings.length - 1) continue;
        const inner = ring * segments + angle;
        const next = ring * segments + (angle + 1) % segments;
        indices.push(inner, next + segments, inner + segments, inner, next, next + segments);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, islandGrass);
  }
  function load(index) {
    const group = new THREE.Group();
    for (const side of [-1, 1]) group.add(strip(index, side, false), strip(index, side, true));
    const features = chunkFeatures(index);
    for (const feature of features) {
      const {x, z, radius, kind} = feature;
      if (kind === 'rock') {
        const mesh = realAssets ? sourcedRock(x,-0.6,z,radius*2,radius*1.5) : new THREE.Mesh(stone, rock);
        if(!realAssets){mesh.position.set(x, 1.3, z);mesh.scale.set(radius, radius * 0.8, radius);}
        group.add(mesh);
      } else {
        const rim = new THREE.Mesh(cylinder, sand);
        rim.position.set(x, 0, z);
        rim.scale.set(radius, 1, radius);
        group.add(rim);
        if (kind === 'island') {
          const top = islandSurface(radius * 0.86);
          top.position.set(x, 0, z);
          group.add(top);
          const peak = realAssets ? sourcedRock(x,3,z,radius*0.6,9) : new THREE.Mesh(stone, rock);
          if(!realAssets){peak.position.set(x, 6, z);peak.scale.set(radius * 0.3, 9, radius * 0.3);}
          group.add(peak);
        }
      }
    }
    nature.add(group, index);
    harbors.add(group, index);
    group.traverse((child) => {
      if (!child.isMesh || child.userData.beacon || child.userData.localMaterial) return;
      child.receiveShadow = true;
      if (!child.isInstancedMesh) child.castShadow = true;
    });
    scene.add(group);
    loaded.set(index, group);
  }
  return {
    updateCameraFade(eye, boat, enabled, beam) {fade.update(eye, boat, enabled, beam);},
    update(z, time = 0, x=channel(z).center, night = 0) {
      nature.update(time);
      harbors.update(time, night);
      const center = chunkIndex(z);
      const desired = new Set();
      for (let index = Math.max(0, center - 3); index <= Math.min(CHUNK_COUNT - 1, center + 3); index++) {
        desired.add(index);
        if (!loaded.has(index)) load(index);
      }
      for (const [index, group] of loaded) {
        if(realAssets) {
          nature.updatePosition(group,x,z);
          for(const child of group.children)if(child.userData.realRock) {
            const level=Math.hypot(child.position.x-x,child.position.z-z)<120 ? 'near' : 'far';
            for(const part of child.children)part.visible=part.userData.rockLevel===level;
          }
        }
        if (desired.has(index)) continue;
        scene.remove(group);
        harbors.forget(group);
        group.traverse((child) => {
          if (child.isMesh && !sharedGeometry.has(child.geometry)) child.geometry.dispose();
          if (child.isInstancedMesh) child.dispose();
        });
        loaded.delete(index);
      }
      return loaded.size;
    },
    dispose() {
      const materials=new Set();
      for(const group of loaded.values()) {
        scene.remove(group);harbors.forget(group);
        group.traverse((child)=>{
          if(!child.isMesh)return;
          if(!sharedGeometry.has(child.geometry))child.geometry.dispose();
          if(child.isInstancedMesh)child.dispose();
          materials.add(child.material);
        });
      }
      for(const geometry of sharedGeometry)geometry.dispose();
      for(const material of materials)material.dispose();
      loaded.clear();
    },
  };
}
