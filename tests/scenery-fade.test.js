import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSceneryFade} from '../src/scenery-fade.js';
import {clearCameraBounds} from '../src/camera-obstacles.js';
import {createHarbors} from '../src/harbors.js';
import {createNature} from '../src/nature-view.js';

test('cutaway composes existing shaders and reuses bounded uniforms without transparency passes', () => {
  const fade = createSceneryFade(); const material = new THREE.MeshStandardMaterial();
  let calls = 0; material.onBeforeCompile = () => {calls++;};
  fade.patch(material); const hook = material.onBeforeCompile; fade.patch(material);
  assert.equal(material.onBeforeCompile, hook);
  const shader = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  assert.equal(calls, 1); assert.match(shader.vertexShader, /instanceMatrix \* fadePosition/);
  assert.match(shader.fragmentShader, /if \(fadePattern < fadeAmount\) discard/);
  assert.equal(material.transparent, false); assert.equal(material.depthWrite, true);
  const eye = new THREE.Vector3(2, 10, 4); const boat = {x: 1, y: 2, z: 3};
  const reference = fade.uniforms.uFadeEye.value;
  fade.update(eye, boat, true, 100);
  assert.equal(fade.uniforms.uFadeRadius.value, 14);
  assert.equal(shader.uniforms.uFadeEnabled.value, 1);
  fade.update(eye, boat, false, 1);
  assert.equal(fade.uniforms.uFadeEye.value, reference);
  assert.equal(shader.uniforms.uFadeEnabled.value, 0);
});

test('only fadeable sightline obstructions relax the boom; lens contact stays solid', () => {
  const target = {x: 0, y: 2, z: 0};
  for (const kind of ['tree', 'building', 'rock', 'dock', 'lighthouse']) {
    const box = {kind, minX: 4, maxX: 8, minZ: -3, maxZ: 3, bottom: 0, top: 20};
    const eye = clearCameraBounds({x: 20, y: 3, z: 0}, target, [box], 0.8, true);
    assert.equal(eye.x === 20, kind === 'tree' || kind === 'building');
    const contact = clearCameraBounds({x: 7, y: 3, z: 0}, target, [box], 0.8, true);
    assert.ok(contact.x < 3.2);
  }
});

test('merged harbor geometry marks houses but preserves opaque docks and lighthouse towers', () => {
  const fade = createSceneryFade(); const parent = new THREE.Group();
  createHarbors(fade).add(parent, 0);
  let marked = 0; let opaque = 0; let batches = 0;
  parent.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry.attributes.cameraFade) return;
    batches++;
    const mask = mesh.geometry.attributes.cameraFade.array;
    for (const value of mask) {if (value === 1) marked++; else {assert.equal(value, 0); opaque++;}}
    assert.equal(mask.length, mesh.geometry.attributes.position.count);
  });
  assert.ok(marked > 0 && opaque > 0); assert.ok(batches < 15);
});

test('procedural tree cutaways preserve breeze shaders and do not fade rocks or shrubs', () => {
  const group = new THREE.Group(); createNature(null, createSceneryFade()).add(group, 0);
  const fading = group.children.filter((mesh) => mesh.material.customProgramCacheKey().includes('boat-cutaway'));
  assert.ok(fading.length >= 2);
  assert.ok(group.children.some((mesh) => !fading.includes(mesh)));
  for (const mesh of fading) {
    const shader = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader};
    mesh.material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /vFadeMask = 1.0/);
    if (shader.uniforms.uBreezeTime) assert.match(shader.vertexShader, /uBreezeTime \* 0.7/);
    assert.equal(mesh.material.transparent, false);
  }
});

test('photographic tree and impostor materials fade without modifying rock materials', () => {
  const makeModel = () => ({near: [{geometry: new THREE.BoxGeometry(), material: new THREE.MeshStandardMaterial()}], far: [{geometry: new THREE.PlaneGeometry(), material: new THREE.MeshBasicMaterial()}]});
  const models = {pine: makeModel(), broadleaf: makeModel(), rock: makeModel()};
  createNature({models}, createSceneryFade());
  for (const kind of ['pine', 'broadleaf']) for (const level of ['near', 'far']) {
    const material = models[kind][level][0].material;
    const source = level === 'far' ? THREE.ShaderLib.basic : THREE.ShaderLib.standard;
    const shader = {uniforms: {}, vertexShader: source.vertexShader, fragmentShader: source.fragmentShader};
    material.onBeforeCompile(shader);
    assert.match(shader.fragmentShader, /fadePattern/);
  }
  assert.ok(!models.rock.near[0].material.customProgramCacheKey().includes('boat-cutaway'));
});
