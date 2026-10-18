import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {prepareModel} from '../src/real-scenery.js';
import {treeImpostor} from '../src/real-scenery.js';
import {createNature} from '../src/nature-view.js';
const root=new URL('../public/assets/real-scenery/',import.meta.url);

test('bundled photographic assets have verified provenance, hashes and bounded download size',()=>{
  const sources=JSON.parse(fs.readFileSync(new URL('sources.json',root)));
  assert.equal(sources.license,'CC0-1.0');assert.equal(sources.records.length,7);
  let total=0;
  for(const file of sources.files) {
    const data=fs.readFileSync(new URL(file.file,root));total+=data.length;
    assert.equal(data.length,file.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),file.sha256);
  }
  assert.ok(total<8*1024*1024);
  assert.ok(sources.records.every((record)=>record.source.startsWith('https://polyhaven.com/a/') && record.sourceFiles.every((file)=>file.md5)));
});
test('real model LODs are self-contained and stay within geometry budgets',()=>{
  for(const id of ['rock_07','fir_sapling_medium','tree_small_02'])for(const level of ['near','far']) {
    const data=fs.readFileSync(new URL(`${id}-${level}.glb`,root));
    assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(8),data.length);
    const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
    assert.ok(json.buffers.every((buffer)=>!buffer.uri));assert.ok(json.images.every((image)=>image.bufferView!==undefined));
    if(json.images.some((image)=>image.mimeType==='image/webp'))assert.ok(json.extensionsRequired.includes('EXT_texture_webp'));
    const triangles=json.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((subtotal,primitive)=>subtotal+json.accessors[primitive.indices].count/3,0),0);
    assert.ok(triangles<=(level==='near' ? 7500 : 1200),`${id}-${level}: ${triangles}`);
    for(const accessor of json.accessors)if(accessor.type==='VEC3' && accessor.min)assert.ok([...accessor.min,...accessor.max].every(Number.isFinite));
  }
});
test('prepared authored LODs share material instances and normalize from common bounds',()=>{
  const first=new THREE.Group();const second=new THREE.Group();
  const material=new THREE.MeshStandardMaterial();material.name='shared';
  first.add(new THREE.Mesh(new THREE.BoxGeometry(2,4,2),material));second.add(new THREE.Mesh(new THREE.BoxGeometry(2,4,2),material.clone()));
  const model=prepareModel(first,second);
  assert.equal(model.near[0].material,model.far[0].material);
  model.near[0].geometry.computeBoundingBox();assert.equal(model.near[0].geometry.boundingBox.max.y,1);
  for(const part of [...model.near,...model.far])part.geometry.dispose();model.near[0].material.dispose();
});
test('source-rendered tree impostors use eight triangles and compact LOD batches never submit hidden near instances',()=>{
  const impostor=treeImpostor(new THREE.Texture());assert.equal(impostor.geometry.index.count/3,8);
  const geometry=new THREE.BoxGeometry(0.3,1,0.3);const material=new THREE.MeshStandardMaterial();
  const model={near:[{geometry,material}],far:[{geometry,material}]};
  const nature=createNature({models:{pine:model,broadleaf:model,rock:model}});const group=new THREE.Group();nature.add(group,0);
  const first=group.userData.realBatches[0].items[0];nature.updatePosition(group,first.x,first.z);
  for(const batch of group.userData.realBatches){assert.ok(batch.near[0].count<=8);assert.equal(batch.near[0].count+batch.far[0].count,batch.items.length);}
  group.traverse((child)=>{if(child.isInstancedMesh)child.dispose();});for(const shared of nature.shared)shared.dispose();material.dispose();impostor.geometry.dispose();impostor.material.dispose();
});
