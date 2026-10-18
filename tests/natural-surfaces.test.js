import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {organicRock,organicPine,sandyShore,naturalMaterial} from '../src/natural-surfaces.js';
import {createNature} from '../src/nature-view.js';

test('organic scenery meshes are repeatable, finite and bounded in triangle count',()=>{
  for(const build of [organicRock,organicPine,sandyShore]) {
    const first=build();const second=build();
    assert.deepEqual(first.attributes.position.array,second.attributes.position.array);
    assert.ok(first.attributes.position.array.every(Number.isFinite));assert.ok(first.attributes.normal.array.every(Number.isFinite));
    const triangles=(first.index?.count ?? first.attributes.position.count)/3;
    assert.ok(triangles<=1200);
    first.dispose();second.dispose();
  }
});
test('nature retains instancing, smooth surfaces and separate wind/bird shader programs',()=>{
  const nature=createNature();const group=new THREE.Group();nature.add(group,0);
  const keys=new Set();let trees=0;
  for(const mesh of group.children) {
    assert.equal(mesh.isInstancedMesh,true);assert.equal(mesh.material.flatShading,false);
    keys.add(mesh.material.customProgramCacheKey());trees+=mesh.count;
    mesh.dispose();
  }
  assert.ok(trees>100);assert.ok(keys.has('natural-breeze-0.8-v1'));assert.ok(keys.has('natural-bird-0.8-v1'));
  for(const geometry of nature.shared)geometry.dispose();
});
test('natural material adds deterministic world-space detail without texture allocation',()=>{
  const material=naturalMaterial({color:0x67834a});
  const shader={vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <color_fragment>'};
  material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('vNaturalWorld'));
  assert.ok(shader.fragmentShader.includes('detailFade'));
  assert.equal(material.map,null);assert.equal(material.flatShading,false);material.dispose();
});
