import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {setPhotographicTextures} from './land-textures.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const REAL_ASSET_ROOT=`${import.meta.env?.BASE_URL ?? '/'}assets/real-scenery/`;
export const REAL_MODEL_IDS={pine:'fir_sapling_medium',broadleaf:'tree_small_02',rock:'rock_07'};
export function treeImpostor(map) {
  const planes=[];
  for(let view=0;view<4;view++) {
    const geometry=new THREE.PlaneGeometry(1.08,1.08);
    const coordinates=geometry.attributes.uv;
    for(let index=0;index<coordinates.count;index++)coordinates.setX(index,(coordinates.getX(index)+view)/4);
    if(view===3)geometry.rotateX(-Math.PI/2).translate(0,0.65,0);
    else geometry.rotateY(view*Math.PI/3).translate(0,0.5,0);
    planes.push(geometry);
  }
  const geometry=mergeGeometries(planes);for(const plane of planes)plane.dispose();
  const material=new THREE.MeshBasicMaterial({map,alphaTest:0.35,side:THREE.DoubleSide,fog:true});
  return {geometry,material};
}
export function prepareModel(nearScene,farScene) {
  nearScene.updateMatrixWorld(true);farScene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(nearScene);
  const center=bounds.getCenter(new THREE.Vector3());
  const height=Math.max(0.001,bounds.max.y-bounds.min.y);
  const materials=new Map();
  function parts(scene,reuse) {
    const result=[];
    scene.traverse((child)=>{
      if(!child.isMesh)return;
      const geometry=child.geometry.clone().applyMatrix4(child.matrixWorld);
      geometry.translate(-center.x,-bounds.min.y,-center.z).scale(1/height,1/height,1/height);
      let material=child.material;
      if(reuse && materials.has(material.name))material=materials.get(material.name);
      else {material.roughness=0.9;material.metalness=0;material.envMapIntensity=0.5;materials.set(material.name,material);}
      if(material.alphaMode==='BLEND' || material.transparent){material.transparent=false;material.alphaTest=0.35;material.side=THREE.DoubleSide;}
      result.push({geometry,material});
    });
    return result;
  }
  const near=parts(nearScene,false);const far=parts(farScene,true);
  const used=new Set([...near,...far].map((part)=>part.material));
  for(const scene of [nearScene,farScene])scene.traverse((child)=>{
    if(!child.isMesh)return;
    child.geometry.dispose();
    if(!used.has(child.material)) {
      for(const value of Object.values(child.material))if(value?.isTexture)value.dispose();
      child.material.dispose();
    }
  });
  return {near,far,height,width:bounds.max.x-bounds.min.x};
}

export async function loadRealScenery() {
  const loader=new GLTFLoader();const textureLoader=new THREE.TextureLoader();
  const models=Object.fromEntries(await Promise.all(Object.entries(REAL_MODEL_IDS).map(async([kind,id])=>{
    const [near,far]=await Promise.all(['near','far'].map((level)=>loader.loadAsync(`${REAL_ASSET_ROOT}${id}-${level}.glb`)));
    return [kind,prepareModel(near.scene,far.scene)];
  })));
  for(const [kind,id] of Object.entries(REAL_MODEL_IDS))if(kind!=='rock') {
    const map=await textureLoader.loadAsync(`${REAL_ASSET_ROOT}${id}-impostor.webp`);map.colorSpace=THREE.SRGBColorSpace;
    const impostor=treeImpostor(map);const model=models[kind];
    for(const part of model.far)part.geometry.dispose();
    model.far=[impostor];model.near.push(impostor);
  }
  const textures=Object.fromEntries(await Promise.all(['grass','sand','rock','bark'].map(async(kind)=>{
    const [map,detail]=await Promise.all([textureLoader.loadAsync(`${REAL_ASSET_ROOT}${kind}-color.webp`),textureLoader.loadAsync(`${REAL_ASSET_ROOT}${kind}-detail.png`)]);
    map.colorSpace=THREE.SRGBColorSpace;
    for(const texture of [map,detail]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;}
    return [kind,{map,detail}];
  })));
  setPhotographicTextures(textures);
  return {models,textures};
}
