import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {surfaceTextures,foliageTexture,foliageCrown} from '../src/land-textures.js';
import {naturalMaterial} from '../src/natural-surfaces.js';
test('land maps are bounded shared mipmapped color and linear detail textures',()=>{
  let bytes=0;
  for(const kind of ['rock','sand','grass','bark']) {
    const maps=surfaceTextures(kind);assert.equal(maps,surfaceTextures(kind));
    assert.equal(maps.map.colorSpace,THREE.SRGBColorSpace);assert.equal(maps.detail.colorSpace,THREE.NoColorSpace);
    for(const map of [maps.map,maps.detail]){assert.equal(map.image.width,256);assert.equal(map.generateMipmaps,true);bytes+=map.image.data.byteLength;}
    const material=naturalMaterial({color:0xffffff},1,kind);assert.equal(material.bumpMap,maps.detail);assert.equal(material.roughnessMap,maps.detail);material.dispose();
    const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader);assert.ok(shader.fragmentShader.includes('float roughnessFactor='));assert.ok(shader.fragmentShader.includes('perturbNormalArb'));
  }
  assert.equal(bytes,2097152);
});
test('foliage cutouts contain opaque leaves and transparent gaps with low geometry cost',()=>{
  for(const pine of [false,true]) {
    const map=foliageTexture(pine);assert.equal(map,foliageTexture(pine));
    let opaque=0;let clear=0;
    for(let offset=3;offset<map.image.data.length;offset+=4){if(map.image.data[offset]>200)opaque++;if(map.image.data[offset]===0)clear++;}
    assert.ok(opaque>100 && clear>1000);
    const geometry=foliageCrown(pine);assert.ok(geometry.index.count/3<=176);assert.ok(geometry.attributes.position.array.every(Number.isFinite));assert.ok(geometry.attributes.uv);geometry.dispose();
  }
});
