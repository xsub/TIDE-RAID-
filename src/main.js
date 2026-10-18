import * as THREE from 'three';
import {createState, step, recover} from './physics.js';
import {createAudio} from './audio.js';
import {createBoat} from './boat.js';
import {loadFleet, createTrafficView} from './fleet.js';
import {PLAYER_BOATS} from './player-boats.js';
import {vesselProfile} from './vessel-profiles.js';
import {createReplayTape,finitePhysicsState} from './replay.js';
import {VESSEL_MASS} from './collision.js';
import {createTraffic, updateTraffic, collideTraffic} from './traffic.js';
import {createSpray} from './spray.js';
import {createAtmosphere, SUN_DIRECTION} from './atmosphere.js';
import {createCinema} from './cinema.js';
import {cameraPose} from './camera.js';
import {createPerformanceOverlay} from './performance.js';
import {createRace, gates, COURSE_LENGTH, tickCountdown, updateRace, recoverRace, useBoost, readBest, saveBest, formatTime} from './race.js';
import {DEFAULT_BINDINGS, readPreferences, savePreferences, remap, readGamepad, advanceLesson} from './preferences.js';
import {createWater, createScenery} from './scenery.js';
import {channel, chunkFeatures, chunkIndex, START_Z, END_Z, WORLD_SIZE, CHUNK_COUNT} from './world.js';
import './style.css';
import './feedback.css';

document.getElementById('app').innerHTML = `
  <header><div class="brand">TIDE<span>RAID</span><sup>2.0</sup></div><span class="tagline">COASTAL EXPEDITION / 01</span>
    <button id="quickSound">SOUND / OFF</button><button id="pause" aria-label="Pause game">PAUSE</button></header>
  <section id="telemetry"><div><b id="speed">000</b><span>KM/H</span></div><p id="air">WATERBORNE</p>
    <div class="progress"><i id="progress"></i></div><small id="distance">0 / 18.78 KM</small>
    <p id="raceClock">0:00.00</p><small id="checkpoint">COASTAL SPRINT</small><p id="passes">CLEAN PASSES / 0</p><small id="fleetStatus">LOADING WATERCRAFT…</small>
    <label>BOOST <meter id="boost" min="0" max="1" value="1"></meter></label></section>
  <aside><canvas id="map" width="220" height="240" aria-label="Local river navigation map"></canvas>
    <div class="map-label">CHANNEL SCANNER <span id="chunks"></span></div>
    <details><summary>HELM SETTINGS</summary>
      <button id="beauty">BEAUTY PRESET</button>
      <button id="exportReplay">EXPORT PHYSICS REPLAY</button><small>Up to 10 minutes, local input/state diagnostics only. No upload.</small>
      <label for="playerBoat">YOUR BOAT</label>
      <select id="playerBoat" disabled>${PLAYER_BOATS.map((boat) => `<option value="${boat.model}">${boat.name}</option>`).join('')}</select>
      <small>Native hull sizes, mass, power and handling. Sailboat uses auxiliary power. Changing boat restarts the run. Reverse: B / gamepad B (keyboard remappable).</small>
      <label for="detail">WATER SURFACE <output id="quality"></output></label>
      <input id="detail" type="range" min="0" max="100" value="25">
      <small>Faceted → smooth. Surface tessellation only; shared analytical waves, no particle-fluid solver.</small>
      <label for="swell">SWELL <output id="swellValue">1.0×</output></label>
      <input id="swell" type="range" min="0" max="200" value="100">
      <button id="camera">CAMERA / ARCADE</button>
      <label for="cameraAngle">CAMERA ORBIT <output id="cameraAngleValue"></output></label>
      <input id="cameraAngle" type="range" min="0" max="360" step="1" value="20">
      <small>0° rear · 90° side · 180° front · 270° side. Or right-drag the water. Steering stays boat-relative.</small>
      <button id="cameraRear">RESET CAMERA / REAR QUARTER</button>
      <button id="sound">SOUND / OFF</button><button id="recover">RECOVER BOAT / H</button><button id="reset">RESTART RUN</button>
      <label for="volume">SOUND VOLUME</label><input id="volume" type="range" min="0" max="100" value="65">
      <details id="soundMix"><summary>CALM SOUND MIX</summary>
        <label for="music">AMBIENT MUSIC</label><input id="music" type="range" min="0" max="100" value="32">
        <label for="effects">YOUR BOAT & WATER</label><input id="effects" type="range" min="0" max="100" value="65">
        <label for="traffic">NEARBY BOATS</label><input id="traffic" type="range" min="0" max="100" value="65">
        <label for="ambience">COAST AMBIENCE</label><input id="ambience" type="range" min="0" max="100" value="55">
      </details><label><input id="cinema" type="checkbox" checked> CINEMATIC LIGHTING</label>
      <label for="sensitivity">STEERING SENSITIVITY</label><input id="sensitivity" type="range" min="50" max="150" value="100">
      <label><input id="hints" type="checkbox" checked> DRIVING HINTS</label>
      <p id="controller">CONTROLLER / NOT CONNECTED</p><small>Standard pad: RT throttle · LT brake · stick steer · A boost · X recover · Y camera · Start pause.</small>
      <details id="bindings"><summary>REMAP KEYBOARD</summary><div id="bindingButtons"></div><small id="bindingStatus">Select an action, then press a key. Esc cancels. Conflicting bindings swap.</small></details>
    </details></aside>
  <div id="lesson" role="status"></div>
  <div id="view"></div><div id="message" role="status"></div>
  <footer><span>W / ↑ THROTTLE &nbsp; S / ↓ BRAKE &nbsp; A D / ← → STEER</span><span>SHIFT BOOST &nbsp; C CAMERA &nbsp; H RECOVER &nbsp; P PAUSE &nbsp; R RESET</span></footer>
  <nav id="touch" aria-label="Boat controls"><button data-key="KeyA" aria-label="Steer left">◀</button><button data-key="KeyD" aria-label="Steer right">▶</button><button data-key="KeyS">BRAKE</button><button data-key="KeyW">GO</button><button data-key="ShiftLeft">BOOST</button></nav>`;

const elements = Object.fromEntries(['speed', 'air', 'progress', 'distance', 'quality', 'swellValue', 'camera', 'pause', 'message', 'chunks', 'raceClock', 'checkpoint', 'boost'].map((id) => [id, document.getElementById(id)]));
let storage;
try {storage = localStorage;} catch {}
const preferences = readPreferences(storage);
document.querySelector('details').open = innerWidth > 900;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.info.autoReset = false;
const performanceOverlay = createPerformanceOverlay(renderer);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = preferences.cinema;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMappingExposure = 1.05;
document.getElementById('view').append(renderer.domElement);
const scene = new THREE.Scene();
const atmosphere = createAtmosphere(scene, renderer);
scene.add(new THREE.HemisphereLight(0xc6e1f4, 0x344d3f, 1.1));
const sun = new THREE.DirectionalLight(0xffdb9f, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera, {left: -100, right: 100, top: 100, bottom: -100, near: 1, far: 450});
sun.shadow.normalBias = 0.12; sun.shadow.bias = -0.0002;
scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 90 : 55, innerWidth / innerHeight, 0.5, 1600);
const cinema = createCinema(renderer, scene, camera);
const water = createWater(scene);
const scenery = createScenery(scene);
elements.quality.textContent = water.setDetail(preferences.detail);
document.getElementById('detail').value = preferences.detail;
const boat = createBoat();
scene.add(boat);
const spray = createSpray(scene);
let state = createState(preferences.playerBoat);
state.mass = VESSEL_MASS[preferences.playerBoat];
let traffic = createTraffic(state);
let replayTape=createReplayTape(state,traffic);
document.getElementById('exportReplay').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(replayTape.export())],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='tide-raid-physics-replay.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
let trafficView = null;
let fleetError = false;
const playerModels = new Map();
const playerBoatSelect = document.getElementById('playerBoat');
playerBoatSelect.value = preferences.playerBoat;
function showPlayerBoat() {
  boat.clear();
  boat.add(playerModels.get(preferences.playerBoat));
  const selected = PLAYER_BOATS.find((entry) => entry.model === preferences.playerBoat);
  document.getElementById('fleetStatus').textContent = `${selected.name.toUpperCase()} / ${VESSEL_MASS[preferences.playerBoat]} KG / 18 TRAFFIC BOATS`;
}
playerBoatSelect.onchange = () => {
  preferences.playerBoat = playerBoatSelect.value;
  showPlayerBoat();
  persistPreferences();
  reset(race.phase === 'explore' ? 'explore' : 'ready');
};
loadFleet().then((factory) => {
  const oldParts = [...boat.children];
  boat.clear();
  for (const part of oldParts) part.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {material.map?.dispose(); material.dispose();}
  });
  for (const entry of PLAYER_BOATS) playerModels.set(entry.model, factory(entry.model, vesselProfile(entry.model).length));
  showPlayerBoat();
  playerBoatSelect.disabled = false;
  trafficView = createTrafficView(scene, factory, traffic);
}).catch(() => {
  fleetError = true;
  document.getElementById('fleetStatus').textContent = 'FLEET LOAD FAILED · RELOAD TO RETRY';
});
let simTime = 0;
let roughness = 1;
let mode = preferences.camera;
elements.camera.textContent = `CAMERA / ${mode.toUpperCase()}`;
let paused = false;
let complete = false;
let race = createRace('ready',preferences.playerBoat);
let personalBest = readBest(storage,preferences.playerBoat);
let bestSaved = true;
let accumulator = 0;
let lastFrame = performance.now();
let hudTimer = 0;
let lastMessage = '';
const keys = new Set();
const map = document.getElementById('map').getContext('2d');
const cameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const smoothLook = new THREE.Vector3();
const audio = createAudio();
audio.setVolume(preferences.volume);
document.getElementById('volume').value = preferences.volume * 100;
for (const name of ['music', 'effects', 'traffic', 'ambience']) {
  audio.setMix(name, preferences[name]);
  document.getElementById(name).value = preferences[name] * 100;
  document.getElementById(name).oninput = (event) => {
    preferences[name] = Number(event.target.value) / 100;
    audio.setMix(name, preferences[name]);
    persistPreferences();
  };
}
document.getElementById('cinema').checked = preferences.cinema;
document.getElementById('cinema').onchange = (event) => {
  preferences.cinema = event.target.checked;
  renderer.shadowMap.enabled = preferences.cinema;
  persistPreferences();
};
document.getElementById('beauty').onclick = () => {
  preferences.detail = 100; preferences.cinema = true;
  document.getElementById('detail').value = 100;
  document.getElementById('cinema').checked = true;
  renderer.shadowMap.enabled = true;
  elements.quality.textContent = water.setDetail(100);
  persistPreferences();
};
let pendingBinding = null;
let previousPad = {};
let lesson = {stage: 0, steering: 0};
const keyName = (action) => preferences.bindings[action].replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Shift');
const held = (action, alias) => keys.has(preferences.bindings[action]) || Boolean(alias && keys.has(alias) && !Object.values(preferences.bindings).includes(alias));
function persistPreferences() {
  if (!savePreferences(storage, preferences)) document.getElementById('bindingStatus').textContent = 'Preferences apply this session; saving is unavailable.';
}
function renderBindings() {
  document.querySelector('footer').setAttribute('title',`${keyName('reverse')} / GAMEPAD B: REVERSE`);
  document.getElementById('bindingButtons').innerHTML = Object.keys(DEFAULT_BINDINGS).map((action) => `<button data-bind="${action}">${action.toUpperCase()} / ${keyName(action)}</button>`).join('');
  document.getElementById('recover').textContent = `RECOVER BOAT / ${keyName('recover')}`;
  document.querySelector('footer').textContent = `${keyName('throttle')} / ↑ THROTTLE · ${keyName('brake')} / ↓ BRAKE · ${keyName('left')} ${keyName('right')} STEER · ${keyName('boost')} BOOST · ${keyName('camera')} CAMERA · ${keyName('recover')} RECOVER · ${keyName('pause')} PAUSE · ${keyName('reset')} RETRY`;
}
renderBindings();
document.getElementById('sensitivity').value = preferences.sensitivity * 100;
document.getElementById('hints').checked = preferences.hints;
document.getElementById('sensitivity').oninput = (event) => {preferences.sensitivity = Number(event.target.value) / 100; persistPreferences();};
document.getElementById('hints').onchange = (event) => {preferences.hints = event.target.checked; persistPreferences();};
document.getElementById('bindingButtons').onclick = (event) => {
  if (!event.target.dataset.bind) return;
  pendingBinding = event.target.dataset.bind;
  keys.clear();
  document.getElementById('bindingStatus').textContent = `Press a key for ${pendingBinding}. Escape cancels.`;
};
const gateGroup = new THREE.Group();
const gateMaterial = new THREE.MeshStandardMaterial({color: 0xff8051, emissive: 0x552211});
for (const side of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 12, 8), gateMaterial);
  post.position.set(side, 5, 0);
  gateGroup.add(post);
}
const gateLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.25, 2), new THREE.MeshBasicMaterial({color: 0xffbc85, transparent: true, opacity: 0.6}));
gateLine.position.y = 0.3;
gateGroup.add(gateLine);
scene.add(gateGroup);

function reset(phase = race.phase === 'explore' ? 'explore' : 'countdown') {
  if (phase !== 'explore' && !trafficView) return;
  state = createState(preferences.playerBoat);
  state.mass = VESSEL_MASS[preferences.playerBoat];
  traffic = createTraffic(state);
  replayTape=createReplayTape(state,traffic);
  race = createRace(phase,preferences.playerBoat);
  personalBest=readBest(storage,preferences.playerBoat);
  lesson = {stage: 0, steering: 0};
  paused = false;
  elements.pause.textContent = 'PAUSE';
  keys.clear();
  complete = false;
  accumulator = 0;
  spray.reset();
  if (phase !== 'explore') {
    roughness = 1;
    document.getElementById('swell').value = '100';
    elements.swellValue.textContent = '1.0×';
  }
  document.getElementById('swell').disabled = phase !== 'explore';
  snapCamera();
}
function rescue() {
  if (complete || race.phase === 'ready' || race.phase === 'countdown') return;
  recoverRace(race, state);
  recover(state, simTime, roughness);
}
function toggleCamera() {
  mode = mode === 'arcade' ? 'chase' : 'arcade';
  elements.camera.textContent = `CAMERA / ${mode.toUpperCase()}`;
  preferences.camera = mode;
  persistPreferences();
}
function togglePause() {
  paused = !paused;
  accumulator = 0;
  keys.clear();
  elements.pause.textContent = paused ? 'RESUME' : 'PAUSE';
}
function cameraGoal() {
  const pose = cameraPose(state, mode, preferences.cameraAngle, camera.aspect, innerWidth < innerHeight, channel(state.z).width * 2);
  cameraPosition.set(pose.x, pose.y, pose.z);
  lookTarget.set(pose.lookX, pose.lookY, pose.lookZ);
  if (Math.abs(camera.fov - pose.fov) > 0.01) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}
function snapCamera() {
  cameraGoal();
  camera.position.copy(cameraPosition);
  camera.lookAt(lookTarget);
  smoothLook.copy(lookTarget);
}
snapCamera();

function setCameraAngle(angle) {
  preferences.cameraAngle = angle;
  document.getElementById('cameraAngle').value = angle;
  document.getElementById('cameraAngleValue').textContent = `${Math.round(angle)}°`;
}
setCameraAngle(preferences.cameraAngle);
document.getElementById('cameraAngle').oninput = (event) => setCameraAngle(Number(event.target.value));
document.getElementById('cameraAngle').onchange = persistPreferences;
document.getElementById('cameraRear').onclick = () => {setCameraAngle(20); persistPreferences();};
let orbitDrag = null;
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 2) return;
  orbitDrag = {id: event.pointerId, x: event.clientX};
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (orbitDrag?.id !== event.pointerId) return;
  setCameraAngle((preferences.cameraAngle + (event.clientX - orbitDrag.x) * 0.35 + 360) % 360);
  orbitDrag.x = event.clientX;
});
function finishOrbit(event) {
  if (orbitDrag?.id !== event.pointerId) return;
  orbitDrag = null;
  persistPreferences();
}
renderer.domElement.addEventListener('pointerup', finishOrbit);
renderer.domElement.addEventListener('pointercancel', finishOrbit);
renderer.domElement.addEventListener('lostpointercapture', finishOrbit);

addEventListener('keydown', (event) => {
  if (pendingBinding) {
    event.preventDefault();
    if (event.code === 'Escape') {
      pendingBinding = null;
      document.getElementById('bindingStatus').textContent = 'Remap cancelled.';
    } else if (remap(preferences, pendingBinding, event.code)) {
      pendingBinding = null;
      renderBindings();
      document.getElementById('bindingStatus').textContent = 'Binding updated.';
      persistPreferences();
    }
    return;
  }
  if (event.target.matches('input, textarea, select')) return;
  if (event.key === '?') {
    event.preventDefault();
    if (!event.repeat) performanceOverlay.toggle();
    return;
  }
  if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === preferences.bindings.camera) toggleCamera();
  if (event.code === preferences.bindings.pause || event.code === 'Escape') togglePause();
  if (event.code === preferences.bindings.reset) reset();
  if (event.code === preferences.bindings.recover) rescue();
  if (event.code === 'Enter' && (race.phase === 'ready' || race.phase === 'finished')) reset('countdown');
});
addEventListener('keyup', (event) => keys.delete(event.code));
addEventListener('blur', () => {keys.clear(); if (!paused) togglePause();});
document.addEventListener('visibilitychange', () => {if (document.hidden && !paused) togglePause();});
for (const button of document.querySelectorAll('[data-key]')) {
  let pressedCode;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const action = Object.keys(DEFAULT_BINDINGS).find((candidate) => DEFAULT_BINDINGS[candidate] === button.dataset.key);
    pressedCode = preferences.bindings[action];
    keys.add(pressedCode);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(pressedCode));
}
document.getElementById('camera').onclick = toggleCamera;
document.getElementById('reset').onclick = () => reset();
document.getElementById('pause').onclick = togglePause;
document.getElementById('recover').onclick = rescue;
elements.message.onclick = (event) => {
  if (event.target.dataset.action === 'trial') reset('countdown');
  if (event.target.dataset.action === 'explore') reset('explore');
};
const toggleSound = async () => {
  let text;
  try {text = `SOUND / ${await audio.toggle() ? 'ON' : 'OFF'}`;}
  catch {text = 'SOUND UNAVAILABLE';}
  document.getElementById('sound').textContent = text;
  document.getElementById('quickSound').textContent = text;
};
document.getElementById('sound').onclick = toggleSound;
document.getElementById('quickSound').onclick = toggleSound;
document.getElementById('volume').oninput = (event) => {
  preferences.volume = Number(event.target.value) / 100;
  audio.setVolume(preferences.volume);
  persistPreferences();
};
document.getElementById('detail').oninput = (event) => {
  preferences.detail = Number(event.target.value);
  elements.quality.textContent = water.setDetail(preferences.detail);
  persistPreferences();
};
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
  if (trafficView) for (const ship of traffic.boats) {
    if (!ship.active) continue;
    map.save(); map.translate(mapX(ship.x), mapY(ship.z)); map.rotate(-ship.heading);
    map.fillStyle = '#ffe5a0';
    map.beginPath(); map.moveTo(0, -4); map.lineTo(3, 3); map.lineTo(-3, 3); map.closePath(); map.fill(); map.restore();
  }
  if (race.phase === 'racing' || race.phase === 'countdown') {
    const gate = gates[race.next];
    const gateY = Math.max(10, Math.min(230, mapY(gate.z)));
    map.strokeStyle = '#ff8051';
    map.lineWidth = 3;
    map.beginPath();
    map.moveTo(Math.max(8, mapX(gate.x - gate.halfWidth)), gateY);
    map.lineTo(Math.min(212, mapX(gate.x + gate.halfWidth)), gateY);
    map.stroke();
    map.fillStyle = '#ffe1b5';
    map.font = '10px monospace';
    map.fillText(`GATE ${race.next + 1} / ${Math.max(0, Math.round(state.z - gate.z))}m`, 8, gateY + 14);
  }
  map.save(); map.translate(110, 190); map.rotate(-state.heading);
  map.beginPath(); map.moveTo(0, -8); map.lineTo(5, 6); map.lineTo(-5, 6); map.closePath();
  map.fillStyle = '#ff7b49'; map.fill(); map.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  const frameMilliseconds = now - lastFrame;
  const elapsed = Math.min(frameMilliseconds / 1000, 0.05);
  lastFrame = now;
  const pad = readGamepad(navigator.getGamepads?.() ?? []);
  if (pad.camera && !previousPad.camera) toggleCamera();
  if (pad.recover && !previousPad.recover) rescue();
  if (pad.pause && !previousPad.pause) {
    if (race.phase === 'ready' || race.phase === 'finished') reset('countdown');
    else togglePause();
  }
  previousPad = pad;
  const input = {throttle: held('throttle', 'ArrowUp') || pad.throttle, brake: held('brake', 'ArrowDown') || pad.brake, reverse: held('reverse') || pad.reverse,
    turn: Math.max(-1, Math.min(1, Number(held('right', 'ArrowRight')) - Number(held('left', 'ArrowLeft')) + pad.turn)) * preferences.sensitivity,
    boost: held('boost', 'ShiftRight') || pad.boost};
  if (!paused && race.phase === 'countdown') tickCountdown(race, elapsed);
  if (!paused && !complete && (race.phase === 'racing' || race.phase === 'explore')) {
    accumulator += elapsed;
    while (accumulator >= 1 / 120) {
      if(!finitePhysicsState(state)) {
        reset('ready');
        document.getElementById('fleetStatus').textContent='INVALID STATE · SAFELY RESET TO START';
        break;
      }
      simTime += 1 / 120;
      const before = {x: state.x, z: state.z, collision: state.collision};
      const boosting = useBoost(race, input.boost, input.throttle && !input.brake, 1 / 120);
      replayTape.record({...input,boost:boosting},simTime,roughness);
      step(state, {...input, boost: boosting}, 1 / 120, simTime, roughness, trafficView ? (body) => {
        let hit=false;
        for(const ship of traffic.boats) hit=collideTraffic(body,ship)||hit;
        return hit;
      } : null);
      if (trafficView) updateTraffic(traffic, state, 1 / 120);
      replayTape.seal(state,traffic);
      spray.update(state, simTime, 1 / 120, roughness);
      advanceLesson(lesson, {...input, boost: boosting}, state, race.next, 1 / 120);
      if (updateRace(race, before, state, 1 / 120)) {
        complete = true;
        const saved = saveBest(storage, race.result.time,preferences.playerBoat);
        personalBest = saved.best;
        bestSaved = saved.saved;
        accumulator = 0;
        break;
      }
      accumulator -= 1 / 120;
    }
    if (race.phase === 'explore' && state.z <= END_Z + 8) complete = true;
  }
  boat.position.set(state.x, state.y, state.z);
  boat.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  water.update(state.x, state.z, simTime, roughness, state.heading, state.airtime > 0.15 ? 0 : state.speed);
  const chunks = scenery.update(state.z, simTime);
  trafficView?.(traffic, simTime, roughness);
  gateGroup.visible = race.phase === 'racing' || race.phase === 'countdown';
  if (gateGroup.visible) {
    const gate = gates[race.next];
    gateGroup.position.set(gate.x, 0, gate.z);
    gateGroup.children[0].position.x = -gate.halfWidth;
    gateGroup.children[1].position.x = gate.halfWidth;
    gateLine.scale.x = gate.halfWidth * 2;
  }
  cameraGoal();
  camera.position.lerp(cameraPosition, 1 - Math.exp(-5 * elapsed));
  smoothLook.lerp(lookTarget, 1 - Math.exp(-7 * elapsed));
  camera.lookAt(smoothLook);
  audio.update(state, paused, input.throttle, input.boost && race.boost > 0 && !race.boostLocked,
    traffic.boats, !complete && race.phase !== 'ready');
  atmosphere.update(simTime, camera);
  sun.target.position.set(state.x, 0, state.z);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIRECTION, 200);
  document.body.classList.toggle('impact', state.collision > 0 && !paused);
  renderer.info.reset();
  cinema.render(preferences.cinema);
  performanceOverlay.update(frameMilliseconds, now, chunks, preferences.cinema);
  hudTimer += elapsed;
  if (hudTimer > 0.1) {
    hudTimer = 0;
    elements.speed.textContent = Math.round(state.speed * 3.6).toString().padStart(3, '0');
    elements.air.textContent = state.grounded>0 ? `GROUNDING / ${state.depth.toFixed(1)} M DEPTH · REVERSE / RECOVER` : state.collision ? `IMPACT / ${(state.impactEnergy / 1000).toFixed(1)} kJ · ${keyName('recover')} TO RECOVER` : state.airtime > 0.15 ? `AIRBORNE / ${state.airtime.toFixed(1)}s` : state.landing ? 'SPLASHDOWN' : state.speed > 22 ? 'PLANING' : 'WATERBORNE';
    const distance = Math.max(0, START_Z - 20 - state.z);
    const length = race.phase === 'explore' ? WORLD_SIZE - 20 : COURSE_LENGTH;
    elements.distance.textContent = `${(distance / 1000).toFixed(2)} / ${(length / 1000).toFixed(2)} KM`;
    elements.progress.style.width = `${Math.min(100, distance / length * 100)}%`;
    elements.raceClock.textContent = formatTime(race.elapsed + race.penalty);
    const missed = race.phase === 'racing' && state.z <= gates[race.next].z;
    elements.checkpoint.textContent = race.phase === 'explore' ? 'FREE EXPLORATION' : missed ? `MISSED GATE · ${keyName('recover')} TO RECOVER` : `GATES ${race.next}/${gates.length} · +${race.penalty}s PENALTY`;
    elements.boost.value = race.boost;
    document.getElementById('passes').textContent = `CLEAN PASSES / ${traffic.overtakes}`;
    elements.chunks.textContent = `${chunks} SECTORS`;
    const actions = `<button data-action="trial" ${trafficView ? '' : 'disabled'}>${trafficView ? 'START TIME TRIAL / ENTER' : fleetError ? 'TRIAL NEEDS FLEET · RELOAD TO RETRY' : 'LOADING BOATS…'}</button><button data-action="explore">EXPLORE THE COAST</button>`;
    const best = personalBest === null ? 'Set your first personal best' : `PERSONAL BEST ${formatTime(personalBest)}`;
    let message = paused ? `PAUSED · ${keyName('pause')} / START TO RESUME` : '';
    if (!paused && race.phase === 'ready') message = `<h2>COASTAL SPRINT</h2><p>4 km · 5 gates · Traffic to overtake.</p><p>Steer through orange gates. ${keyName('boost')} / A boosts; release to recharge.<br>Boat/shore impacts +2s · ${keyName('recover')} / X recovery +5s.</p><small>${best}<br>Gold ${formatTime(130*race.medalScale)} · Silver ${formatTime(170*race.medalScale)} · Bronze ${formatTime(220*race.medalScale)}</small>${actions}`;
    if (!paused && race.phase === 'countdown') message = `<h2>${Math.ceil(race.countdown)}</h2><p>FOLLOW THE CHANNEL · AIM FOR ORANGE GATES</p>`;
    if (!paused && race.phase === 'finished') message = `<h2>${race.result.medal} · ${formatTime(race.result.time)}</h2><p>${traffic.overtakes} clean passes · ${race.collisions} impacts · ${race.penalty}s penalties<br>Best jump ${state.longestJump.toFixed(1)}s</p><p>${best}${bestSaved ? '' : ' · SESSION ONLY (saving unavailable)'}</p>${actions}`;
    if (!paused && complete && race.phase === 'explore') message = `EXPEDITION COMPLETE · BEST JUMP ${state.longestJump.toFixed(1)}s${actions}`;
    if (lastMessage !== message) {
      elements.message.innerHTML = message;
      lastMessage = message;
    }
    document.getElementById('controller').textContent = `CONTROLLER / ${pad.connected ? 'CONNECTED' : 'NOT CONNECTED'}`;
    const hints = [`Hold ${keyName('throttle')} / ↑ / RT to accelerate.`, `${keyName('left')} ${keyName('right')} / stick steer. Look ahead into the bend.`, `Hold ${keyName('boost')} / A for boost. Release to recharge.`, 'Pass between the orange posts. Use the scanner to plan your line.'];
    const lessonText = preferences.hints && !paused && !complete && race.phase === 'racing' && lesson.stage < hints.length ? hints[lesson.stage] : '';
    if (document.getElementById('lesson').textContent !== lessonText) document.getElementById('lesson').textContent = lessonText;
    drawMap();
  }
}
requestAnimationFrame(frame);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cinema.resize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < innerHeight ? 90 : 55;
  camera.updateProjectionMatrix();
});
