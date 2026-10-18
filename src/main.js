import * as THREE from 'three';
import {createState, step} from './physics.js';
import {createWater, createScenery} from './scenery.js';
import {channel, chunkFeatures, chunkIndex, START_Z, END_Z, WORLD_SIZE, CHUNK_COUNT} from './world.js';
import {sampleWave} from './waves.js';
import './style.css';

document.getElementById('app').innerHTML = `
  <header><div class="brand">TIDE<span>RAID</span><sup>2.0</sup></div><span class="tagline">COASTAL EXPEDITION / 01</span>
    <button id="pause" aria-label="Pause game">PAUSE</button></header>
  <section id="telemetry"><div><b id="speed">000</b><span>KM/H</span></div><p id="air">WATERBORNE</p>
    <div class="progress"><i id="progress"></i></div><small id="distance">0 / 18.78 KM</small></section>
  <aside><canvas id="map" width="220" height="240" aria-label="Local river navigation map"></canvas>
    <div class="map-label">CHANNEL SCANNER <span id="chunks"></span></div>
    <details><summary>HELM SETTINGS</summary>
      <label for="detail">WATER SURFACE <output id="quality"></output></label>
      <input id="detail" type="range" min="0" max="100" value="25">
      <small>Faceted → smooth. Surface tessellation only; shared analytical waves, no particle-fluid solver.</small>
      <label for="swell">SWELL <output id="swellValue">1.0×</output></label>
      <input id="swell" type="range" min="0" max="200" value="100">
      <button id="camera">CAMERA / ARCADE</button><button id="reset">RESTART RUN</button>
    </details></aside>
  <div id="view"></div><div id="message" role="status"></div>
  <footer><span>W / ↑ THROTTLE &nbsp; S / ↓ BRAKE &nbsp; A D / ← → STEER</span><span>SHIFT BOOST &nbsp; C CAMERA &nbsp; P PAUSE &nbsp; R RESET</span></footer>
  <nav id="touch" aria-label="Boat controls"><button data-key="KeyA" aria-label="Steer left">◀</button><button data-key="KeyD" aria-label="Steer right">▶</button><button data-key="KeyS">BRAKE</button><button data-key="KeyW">GO</button><button data-key="ShiftLeft">BOOST</button></nav>`;

const elements = Object.fromEntries(['speed', 'air', 'progress', 'distance', 'quality', 'swellValue', 'camera', 'pause', 'message', 'chunks'].map((id) => [id, document.getElementById(id)]));
document.querySelector('details').open = innerWidth > 900;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('view').append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa7c8d0);
scene.fog = new THREE.Fog(0xa7c8d0, 700, 1150);
scene.add(new THREE.HemisphereLight(0xdff8ff, 0x485c4b, 2.5));
const sun = new THREE.DirectionalLight(0xffe8c4, 3);
sun.position.set(-100, 180, 90);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 90 : 55, innerWidth / innerHeight, 0.5, 1600);
const water = createWater(scene);
const scenery = createScenery(scene);
elements.quality.textContent = water.setDetail(25);
const boat = new THREE.Group();
const material = (color) => new THREE.MeshStandardMaterial({color, roughness: 0.35});
const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 5.8), material(0xf4edda));
hull.position.y = 0.1;
boat.add(hull);
const bowShape = new THREE.Shape();
bowShape.moveTo(-1.2, 0); bowShape.lineTo(1.2, 0); bowShape.lineTo(0, 2.5); bowShape.closePath();
const bow = new THREE.Mesh(new THREE.ExtrudeGeometry(bowShape, {depth: 0.7, bevelEnabled: false}), material(0xf26338));
bow.rotation.x = -Math.PI / 2;
bow.position.set(0, -0.25, -2.8);
boat.add(bow);
const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.8, 1.9), material(0x183a4a));
cockpit.position.set(0, 0.8, 0.1);
boat.add(cockpit);
const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 5.5), material(0xf26338));
stripe.position.y = 0.49;
boat.add(stripe);
scene.add(boat);

const wakeCount = 150;
const wakePositions = new Float32Array(wakeCount * 3);
const wakeGeometry = new THREE.BufferGeometry();
wakeGeometry.setAttribute('position', new THREE.BufferAttribute(wakePositions, 3));
const wake = new THREE.Points(wakeGeometry, new THREE.PointsMaterial({color: 0xdaf7ee, size: 1.7, transparent: true, opacity: 0.55, depthWrite: false}));
wake.frustumCulled = false;
scene.add(wake);
let wakeCursor = 0;
let state = createState();
let simTime = 0;
let roughness = 1;
let mode = 'arcade';
let paused = false;
let complete = false;
let accumulator = 0;
let lastFrame = performance.now();
let hudTimer = 0;
const keys = new Set();
const map = document.getElementById('map').getContext('2d');
const cameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function reset() {
  state = createState();
  complete = false;
  accumulator = 0;
  wakePositions.fill(0);
  wakeGeometry.setDrawRange(0, 0);
  wakeCursor = 0;
  snapCamera();
}
function toggleCamera() {
  mode = mode === 'arcade' ? 'chase' : 'arcade';
  elements.camera.textContent = `CAMERA / ${mode.toUpperCase()}`;
}
function togglePause() {
  paused = !paused;
  accumulator = 0;
  keys.clear();
  elements.pause.textContent = paused ? 'RESUME' : 'PAUSE';
}
function cameraGoal() {
  const width = channel(state.z).width * 2;
  const height = mode === 'arcade' ? Math.max(210, width / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 0.8)) : 30 + width * 0.04;
  const back = mode === 'arcade' ? height * 0.48 : height * 1.2;
  cameraPosition.set(state.x + Math.sin(state.heading) * back, state.y + height, state.z + Math.cos(state.heading) * back);
  lookTarget.set(state.x - Math.sin(state.heading) * 35, state.y, state.z - Math.cos(state.heading) * 35);
}
function snapCamera() {
  cameraGoal();
  camera.position.copy(cameraPosition);
  camera.lookAt(lookTarget);
}
snapCamera();

addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, select')) return;
  if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyC') toggleCamera();
  if (event.code === 'KeyP' || event.code === 'Escape') togglePause();
  if (event.code === 'KeyR') reset();
});
addEventListener('keyup', (event) => keys.delete(event.code));
addEventListener('blur', () => {keys.clear(); if (!paused) togglePause();});
document.addEventListener('visibilitychange', () => {if (document.hidden && !paused) togglePause();});
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.key);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.key));
}
document.getElementById('camera').onclick = toggleCamera;
document.getElementById('reset').onclick = reset;
document.getElementById('pause').onclick = togglePause;
document.getElementById('detail').oninput = (event) => {elements.quality.textContent = water.setDetail(Number(event.target.value));};
document.getElementById('swell').oninput = (event) => {
  roughness = Number(event.target.value) / 100;
  elements.swellValue.textContent = `${roughness.toFixed(1)}×`;
};

function drawMap() {
  map.clearRect(0, 0, 220, 240);
  const scale = 0.3;
  const mapX = (x) => 110 + (x - state.x) * scale;
  const mapY = (z) => 190 + (z - state.z) * scale;
  map.fillStyle = '#345b4e';
  for (const side of ['left', 'right']) {
    map.beginPath();
    map.moveTo(side === 'left' ? 0 : 220, 0);
    for (let row = 0; row <= 24; row++) {
      const z = state.z + (row * 10 - 190) / scale;
      map.lineTo(mapX(channel(z)[side]), row * 10);
    }
    map.lineTo(side === 'left' ? 0 : 220, 240);
    map.fill();
  }
  const current = chunkIndex(state.z);
  for (let index = Math.max(0, current - 4); index <= Math.min(CHUNK_COUNT - 1, current + 4); index++) {
    for (const feature of chunkFeatures(index)) {
      map.beginPath();
      map.arc(mapX(feature.x), mapY(feature.z), feature.radius * scale, 0, Math.PI * 2);
      map.fillStyle = feature.kind === 'rock' ? '#a4b5ad' : '#d9c38b';
      map.fill();
    }
  }
  map.save(); map.translate(110, 190); map.rotate(-state.heading);
  map.beginPath(); map.moveTo(0, -8); map.lineTo(5, 6); map.lineTo(-5, 6); map.closePath();
  map.fillStyle = '#ff7b49'; map.fill(); map.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (!paused && !complete) {
    accumulator += elapsed;
    const input = {throttle: keys.has('KeyW') || keys.has('ArrowUp'), brake: keys.has('KeyS') || keys.has('ArrowDown'),
      turn: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight')};
    while (accumulator >= 1 / 120) {
      simTime += 1 / 120;
      step(state, input, 1 / 120, simTime, roughness);
      accumulator -= 1 / 120;
    }
    if (state.z <= END_Z + 8) complete = true;
    if (state.speed > 3 && state.airtime < 0.1) {
      const index = wakeCursor % wakeCount * 3;
      const x = state.x + Math.sin(state.heading) * 3 + (Math.random() - 0.5) * 2;
      const z = state.z + Math.cos(state.heading) * 3;
      wakePositions.set([x, sampleWave(x, z, simTime, roughness).h + 0.15, z], index);
      wakeCursor++;
      wakeGeometry.setDrawRange(0, Math.min(wakeCursor, wakeCount));
      wakeGeometry.attributes.position.needsUpdate = true;
    }
  }
  boat.position.set(state.x, state.y, state.z);
  boat.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  water.update(state.x, state.z, simTime, roughness);
  const chunks = scenery.update(state.z);
  cameraGoal();
  camera.position.lerp(cameraPosition, 1 - Math.exp(-5 * elapsed));
  camera.lookAt(lookTarget);
  renderer.render(scene, camera);
  hudTimer += elapsed;
  if (hudTimer > 0.1) {
    hudTimer = 0;
    elements.speed.textContent = Math.round(state.speed * 3.6).toString().padStart(3, '0');
    elements.air.textContent = state.collision ? 'SHORE IMPACT' : state.airtime > 0.15 ? `AIRBORNE / ${state.airtime.toFixed(1)}s` : state.landing ? 'SPLASHDOWN' : state.speed > 22 ? 'PLANING' : 'WATERBORNE';
    const distance = Math.max(0, START_Z - 20 - state.z);
    elements.distance.textContent = `${(distance / 1000).toFixed(2)} / ${((WORLD_SIZE - 20) / 1000).toFixed(2)} KM`;
    elements.progress.style.width = `${Math.min(100, distance / (WORLD_SIZE - 20) * 100)}%`;
    elements.chunks.textContent = `${chunks} SECTORS`;
    elements.message.textContent = complete ? `EXPEDITION COMPLETE · BEST JUMP ${state.longestJump.toFixed(1)}s · R TO RESTART` : paused ? 'PAUSED · P TO RESUME' : '';
    drawMap();
  }
}
requestAnimationFrame(frame);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < innerHeight ? 90 : 55;
  camera.updateProjectionMatrix();
});
