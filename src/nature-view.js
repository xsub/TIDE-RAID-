import * as THREE from 'three';
import {natureLayout} from './nature.js';
import {organicRock,naturalMaterial} from './natural-surfaces.js';
import {foliageTexture,foliageCrown} from './land-textures.js';

export function createNature(realAssets=null, fade=null) {
  const material = (color, doubleSide = false) => naturalMaterial({color, roughness: 1, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide},0.8);
  const wood = naturalMaterial({color:0xffffff,roughness:1},1.5,'bark');
  const leaves = material(0xffffff,true);
  const pineLeaves = material(0xffffff,true);
  for(const [surface,pine] of [[leaves,false],[pineLeaves,true]]){surface.map=foliageTexture(pine);surface.alphaTest=0.35;surface.alphaToCoverage=true;}
  const palmLeaves = material(0x74944e, true);
  const stone = naturalMaterial({color:0xffffff,roughness:1},1.8,'rock');
  const grassMaterial = material(0x879d51, true);
  const flowerMaterial = material(0xffe2a4);
  const trunk = new THREE.CylinderGeometry(0.35, 0.65, 8, 12, 3).translate(0, 4, 0);
  const pine = foliageCrown(true);
  const broadleaf = foliageCrown(false);
  const palmVertices = [];
  for (let leaf = 0; leaf < 7; leaf++) {
    const angle = leaf / 7 * Math.PI * 2;
    for (let section = 0; section < 4; section++) {
      const corners = [];
      for (const progress of [section / 4, (section + 1) / 4]) {
        const reach = progress * 7;
        const width = Math.sin(progress * Math.PI) * 0.95 + 0.04;
        const height = 13 + Math.sin(progress * Math.PI) * 1.8 - progress * 2;
        for (const side of [-1, 1]) corners.push([Math.cos(angle) * reach - Math.sin(angle) * width * side, height, Math.sin(angle) * reach + Math.cos(angle) * width * side]);
      }
      for (const vertex of [0, 2, 1, 1, 2, 3]) palmVertices.push(...corners[vertex]);
    }
  }
  const palm = new THREE.BufferGeometry();
  palm.setAttribute('position', new THREE.Float32BufferAttribute(palmVertices, 3));
  palm.computeVertexNormals();
  const shrub = foliageCrown(false).translate(0,-6.5,0);
  const rock = organicRock(12,8);
  const log = new THREE.CylinderGeometry(0.35, 0.45, 6, 12).rotateZ(Math.PI / 2);
  const blades = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.4;
    const x = Math.cos(angle) * 0.55;
    const z = Math.sin(angle) * 0.55;
    blades.push(x - 0.1, 0, z, x + 0.1, 0, z, x + Math.cos(angle) * 0.6, 1.2 + blade * 0.17, z + Math.sin(angle) * 0.6);
  }
  const reeds = new THREE.BufferGeometry();
  reeds.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  reeds.computeVertexNormals();
  const flower = new THREE.IcosahedronGeometry(0.35, 0).translate(0, 0.6, 0);
  const bird = new THREE.BufferGeometry();
  bird.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -2,0.15,-0.3, -0.7,0,0.4, 0,0,0, 0.7,0,0.4, 2,0.15,-0.3], 3));
  bird.computeVertexNormals();
  const birdMaterial = material(0xe1e4d2, true);
  const time = {value: 0};
  for (const surface of [leaves, pineLeaves, palmLeaves, grassMaterial]) {
    const naturalCompile=surface.onBeforeCompile;
    surface.onBeforeCompile = (shader) => {
      naturalCompile(shader);
      shader.uniforms.uBreezeTime = time;
      shader.vertexShader = `uniform float uBreezeTime;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        vec3 transformed = position;
        float phase = uBreezeTime * 0.7 + instanceMatrix[3].x * 0.08 + instanceMatrix[3].z * 0.04;
        transformed.x += sin(phase) * position.y * 0.025;
        transformed.z += cos(phase * 0.8) * position.y * 0.015;
      `);
    };
    surface.customProgramCacheKey=()=> 'natural-breeze-0.8-v1';
  }
  const birdCompile=birdMaterial.onBeforeCompile;
  birdMaterial.onBeforeCompile = (shader) => {
    birdCompile(shader);
    shader.uniforms.uNatureTime = time;
    shader.vertexShader = `uniform float uNatureTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = position;
      transformed.y += sin(uNatureTime * 4.0 + instanceMatrix[3].z) * abs(position.x) * 0.5;
      transformed.x += sin(uNatureTime * 0.12 + instanceMatrix[3].x) * 16.0;
      transformed.z += cos(uNatureTime * 0.12 + instanceMatrix[3].x) * 16.0;
    `);
  };
  birdMaterial.customProgramCacheKey=()=> 'natural-bird-0.8-v1';
  const shared = new Set([trunk, pine, broadleaf, palm, shrub, rock, log, reeds, flower, bird]);
  if(realAssets)for(const model of Object.values(realAssets.models))for(const level of ['near','far'])for(const part of model[level])shared.add(part.geometry);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  function instances(group, geometry, surface, items, scaleFor) {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, surface, items.length);
    mesh.castShadow = geometry === trunk || geometry === pine || geometry === broadleaf || geometry === palm;
    mesh.receiveShadow = geometry !== bird;
    items.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z);
      transform.rotation.set(0, item.rotation, 0);
      transform.scale.set(...scaleFor(item));
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      color.setRGB(0.78 + item.shade * 0.22, 0.85 + item.shade * 0.15, 0.73 + item.shade * 0.2);
      mesh.setColorAt(index, color);
    });
    if (geometry === bird) mesh.frustumCulled = false;
    group.add(mesh);return mesh;
  }
  function realInstances(group,model,items,scaleFor) {
    if(!items.length)return;
    const batches={items,scaleFor,near:[],far:[],cell:null};
    for(const level of ['near','far'])for(const part of model[level]) {
      const mesh=instances(group,part.geometry,part.material,items,scaleFor);
      mesh.castShadow=level==='near';mesh.receiveShadow=true;
      batches[level].push(mesh);
    }
    (group.userData.realBatches ??= []).push(batches);
  }
  function treeSurface(surface) {
    if (!fade) return surface;
    const copy = surface.clone();
    copy.onBeforeCompile = surface.onBeforeCompile;
    copy.customProgramCacheKey = surface.customProgramCacheKey.bind(surface);
    return fade.patch(copy);
  }
  const treeWood = treeSurface(wood);
  const treeLeaves = treeSurface(leaves);
  const treePineLeaves = treeSurface(pineLeaves);
  const treePalmLeaves = treeSurface(palmLeaves);
  if (fade && realAssets) for (const kind of ['pine', 'broadleaf']) for (const level of ['near', 'far']) for (const part of realAssets.models[kind][level]) fade.patch(part.material);
  return {
    shared,
    update(value) {time.value = value;},
    updatePosition(group,x,z) {
      for(const batch of group.userData.realBatches ?? []) {
        const cell=`${Math.floor(x/20)},${Math.floor(z/20)}`;if(batch.cell===cell)continue;batch.cell=cell;
        const near=new Set(batch.items.map((item,index)=>({index,distance:(item.x-x)**2+(item.z-z)**2})).filter((entry)=>entry.distance<100**2).sort((first,second)=>first.distance-second.distance||first.index-second.index).slice(0,8).map((entry)=>entry.index));
        const counters={near:0,far:0};
        batch.items.forEach((item,index)=>{
          transform.position.set(item.x,item.y,item.z);transform.rotation.set(0,item.rotation,0);
          const level=near.has(index) ? 'near' : 'far';const target=counters[level]++;
          transform.scale.set(...batch.scaleFor(item));transform.updateMatrix();
          color.setRGB(0.78+item.shade*0.22,0.85+item.shade*0.15,0.73+item.shade*0.2);
          for(const mesh of batch[level]){mesh.setMatrixAt(target,transform.matrix);mesh.setColorAt(target,color);}
        });
        for(const level of ['near','far'])for(const mesh of batch[level]){mesh.count=counters[level];mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
      }
    },
    add(group, index) {
      const layout = natureLayout(index);
      if(realAssets) {
        realInstances(group,realAssets.models.pine,layout.trees.filter((item)=>item.species==='pine'),(item)=>[item.scale*18,item.scale*18,item.scale*18]);
        realInstances(group,realAssets.models.broadleaf,layout.trees.filter((item)=>item.species!=='pine'),(item)=>[item.scale*14,item.scale*14,item.scale*14]);
        realInstances(group,realAssets.models.rock,layout.rocks,(item)=>[item.scale*2,item.scale*2,item.scale*2]);
      } else {
        instances(group, trunk, treeWood, layout.trees, (item) => [item.scale, item.scale * (item.species === 'palm' ? 1.55 : 1), item.scale]);
        for (const [species, geometry, surface] of [['pine', pine, treePineLeaves], ['broadleaf', broadleaf, treeLeaves], ['palm', palm, treePalmLeaves]]) instances(group, geometry, surface, layout.trees.filter((item) => item.species === species), (item) => [item.scale, item.scale, item.scale]);
        instances(group, rock, stone, layout.rocks, (item) => [item.scale * 1.6, item.scale, item.scale * 1.3]);
      }
      instances(group, shrub, leaves, layout.shrubs, (item) => [item.scale * 0.45, item.scale * 0.22, item.scale * 0.4]);
      instances(group, reeds, grassMaterial, layout.grass, (item) => [item.scale * 1.4, item.scale, item.scale * 1.4]);
      instances(group, log, wood, layout.logs, (item) => [item.scale, item.scale, item.scale]);
      instances(group, flower, flowerMaterial, layout.flowers, (item) => [item.scale, item.scale, item.scale]);
      instances(group, bird, birdMaterial, layout.birds, (item) => [item.scale, item.scale, item.scale]);
    },
  };
}
