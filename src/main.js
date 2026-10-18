import * as THREE from 'three';
import {createState, step, recover} from './physics.js';
import {createAudio} from './audio.js';
import {createBoat} from './boat.js';
import {loadFleet, createTrafficView} from './fleet.js';
import {createTraffic, updateTraffic} from './traffic.js';
import {createSpray} from './spray.js';
import {createAtmosphere} from './atmosphere.js';
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
      <label for="detail">WATER SURFACE <output id="quality"></output></label>
      <input id="detail" type="range" min="0" max="100" value="25">
      <small>Faceted → smooth. Surface tessellation only; shared analytical waves, no particle-fluid solver.</small>
      <label for="swell">SWELL <output id="swellValue">1.0×</output></label>
      <input id="swell" type="range" min="0" max="200" value="100">
      <button id="camera">CAMERA / ARCADE</button><button id="sound">SOUND / OFF</button><button id="recover">RECOVER BOAT / H</button><button id="reset">RESTART RUN</button>
      <label for="volume">SOUND VOLUME</label><input id="volume" type="range" min="0" max="100" value="65">
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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('view').append(renderer.domElement);
const scene = new THREE.Scene();
createAtmosphere(scene, renderer);
scene.add(new THREE.HemisphereLight(0xdff8ff, 0x324f44, 1.4));
const sun = new THREE.DirectionalLight(0xffe3b5, 3.2);
sun.position.set(-120, 160, -60);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 90 : 55, innerWidth / innerHeight, 0.5, 1600);
const water = createWater(scene);
const scenery = createScenery(scene);
elements.quality.textContent = water.setDetail(preferences.detail);
document.getElementById('detail').value = preferences.detail;
const boat = createBoat();
scene.add(boat);
const spray = createSpray(scene);
let state = createState();
let traffic = createTraffic(state);
let trafficView = null;
let fleetError = false;
loadFleet().then((factory) => {
  const oldParts = [...boat.children];
  boat.clear();
  for (const part of oldParts) part.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {material.map?.dispose(); material.dispose();}
  });
  boat.add(factory('boat-speed-c', 7.4));
  trafficView = createTrafficView(scene, factory, traffic);
  document.getElementById('fleetStatus').textContent = 'KENNEY WATERCRAFT / 18 BOATS';
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
let race = createRace();
let personalBest = readBest(storage);
let bestSaved = true;
let accumulator = 0;
let lastFrame = performance.now();
let hudTimer = 0;
const keys = new Set();
const map = document.getElementById('map').getContext('2d');
const cameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const smoothLook = new THREE.Vector3();
const audio = createAudio();
audio.setVolume(preferences.volume);
document.getElementById('volume').value = preferences.volume * 100;
let pendingBinding = null;
let previousPad = {};
let lesson = {stage: 0, steering: 0};
const keyName = (action) => preferences.bindings[action].replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Shift');
const held = (action, alias) => keys.has(preferences.bindings[action]) || Boolean(alias && keys.has(alias) && !Object.values(preferences.bindings).includes(alias));
function persistPreferences() {
  if (!savePreferences(storage, preferences)) document.getElementById('bindingStatus').textContent = 'Preferences apply this session; saving is unavailable.';
}
function renderBindings() {
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
  state = createState();
  traffic = createTraffic(state);
  race = createRace(phase);
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
  const width = channel(state.z).width * 2;
  const height = mode === 'arcade' ? Math.max(210, width / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 0.8)) : 12 + state.speed * 0.07;
  const back = mode === 'arcade' ? height * 0.48 : 22 + state.speed * 0.15;
  cameraPosition.set(state.x + Math.sin(state.heading) * back, state.y + height, state.z + Math.cos(state.heading) * back);
  const ahead = mode === 'arcade' ? 35 : 10 + state.speed * 0.25;
  lookTarget.set(state.x - Math.sin(state.heading) * ahead, state.y, state.z - Math.cos(state.heading) * ahead);
}
function snapCamera() {
  cameraGoal();
  camera.position.copy(cameraPosition);
  camera.lookAt(lookTarget);
  smoothLook.copy(lookTarget);
}
snapCamera();

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
  const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  const pad = readGamepad(navigator.getGamepads?.() ?? []);
  if (pad.camera && !previousPad.camera) toggleCamera();
  if (pad.recover && !previousPad.recover) rescue();
  if (pad.pause && !previousPad.pause) {
    if (race.phase === 'ready' || race.phase === 'finished') reset('countdown');
    else togglePause();
  }
  previousPad = pad;
  const input = {throttle: held('throttle', 'ArrowUp') || pad.throttle, brake: held('brake', 'ArrowDown') || pad.brake,
    turn: Math.max(-1, Math.min(1, Number(held('right', 'ArrowRight')) - Number(held('left', 'ArrowLeft')) + pad.turn)) * preferences.sensitivity,
    boost: held('boost', 'ShiftRight') || pad.boost};
  if (!paused && race.phase === 'countdown') tickCountdown(race, elapsed);
  if (!paused && !complete && (race.phase === 'racing' || race.phase === 'explore')) {
    accumulator += elapsed;
    while (accumulator >= 1 / 120) {
      simTime += 1 / 120;
      const before = {x: state.x, z: state.z, collision: state.collision};
      const boosting = useBoost(race, input.boost, input.throttle && !input.brake, 1 / 120);
      step(state, {...input, boost: boosting}, 1 / 120, simTime, roughness);
      if (trafficView) updateTraffic(traffic, state, 1 / 120);
      advanceLesson(lesson, {...input, boost: boosting}, state, race.next, 1 / 120);
      if (updateRace(race, before, state, 1 / 120)) {
        complete = true;
        const saved = saveBest(storage, race.result.time);
        personalBest = saved.best;
        bestSaved = saved.saved;
        accumulator = 0;
        break;
      }
      accumulator -= 1 / 120;
    }
    if (race.phase === 'explore' && state.z <= END_Z + 8) complete = true;
    spray.update(state, simTime, elapsed, roughness);
  }
  boat.position.set(state.x, state.y, state.z);
  boat.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  water.update(state.x, state.z, simTime, roughness, state.heading, state.airtime > 0.15 ? 0 : state.speed);
  const chunks = scenery.update(state.z);
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
  audio.update(state, paused || complete || race.phase === 'ready', input.throttle, input.boost && race.boost > 0 && !race.boostLocked);
  document.body.classList.toggle('impact', state.collision > 0 && !paused);
  renderer.render(scene, camera);
  hudTimer += elapsed;
  if (hudTimer > 0.1) {
    hudTimer = 0;
    elements.speed.textContent = Math.round(state.speed * 3.6).toString().padStart(3, '0');
    elements.air.textContent = state.collision ? `IMPACT · ${keyName('recover')} TO RECOVER` : state.airtime > 0.15 ? `AIRBORNE / ${state.airtime.toFixed(1)}s` : state.landing ? 'SPLASHDOWN' : state.speed > 22 ? 'PLANING' : 'WATERBORNE';
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
    if (!paused && race.phase === 'ready') message = `<h2>COASTAL SPRINT</h2><p>4 km · 5 gates · Traffic to overtake.</p><p>Steer through orange gates. ${keyName('boost')} / A boosts; release to recharge.<br>Boat/shore impacts +2s · ${keyName('recover')} / X recovery +5s.</p><small>${best}<br>Gold 2:10 · Silver 2:50 · Bronze 3:40</small>${actions}`;
    if (!paused && race.phase === 'countdown') message = `<h2>${Math.ceil(race.countdown)}</h2><p>FOLLOW THE CHANNEL · AIM FOR ORANGE GATES</p>`;
    if (!paused && race.phase === 'finished') message = `<h2>${race.result.medal} · ${formatTime(race.result.time)}</h2><p>${traffic.overtakes} clean passes · ${race.collisions} impacts · ${race.penalty}s penalties<br>Best jump ${state.longestJump.toFixed(1)}s</p><p>${best}${bestSaved ? '' : ' · SESSION ONLY (saving unavailable)'}</p>${actions}`;
    if (!paused && complete && race.phase === 'explore') message = `EXPEDITION COMPLETE · BEST JUMP ${state.longestJump.toFixed(1)}s${actions}`;
    if (elements.message.innerHTML !== message) elements.message.innerHTML = message;
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
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < innerHeight ? 90 : 55;
  camera.updateProjectionMatrix();
});
