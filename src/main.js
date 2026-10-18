import * as THREE from 'three';
import {rememberCamera} from './camera-memory.js';
import {DEFAULT_SWELL, MAX_SWELL, TRIAL_SWELL, clampSwell} from './swell.js';
import {cameraGroundHeight, clearCameraTerrain, cameraDefaults} from './camera-safety.js';
import {dragPilotLook, smoothPilotLook} from './pilot-look.js';
import {viewShortcut} from './view-shortcuts.js';
import {cameraKeyMotion} from './camera-keys.js';
import {sampleWave} from './waves.js';
import {floodedHandling, resetSinking, settleFloodedHull} from './sinking.js';
import {createSinkingBubbles} from './sinking-bubbles.js';
import {underwaterBlend} from './underwater-model.js';
import {createUnderwaterView} from './underwater-view.js';
import {createSeabed, seabedHeight} from './seabed.js';
import {waterDepth} from './depth.js';
import {depthReadings} from './depth-gauge.js';
import {weatherState} from './weather.js';
import {createRain} from './weather-view.js';
import {createVesselLights} from './vessel-lights.js';
import {createState, step, recover} from './physics.js';
import {createVoyage, tickVoyage, voyageDrive, SERVICE_STATIONS} from './voyage.js';
import {createServiceView, createWearView} from './voyage-view.js';
import {createAudio} from './audio.js';
import {createBoat} from './boat.js';
import {loadFleet, createTrafficView} from './fleet.js';
import {PLAYER_BOATS} from './player-boats.js';
import {vesselProfile, VESSEL_HANDLING} from './vessel-profiles.js';
import {createReplayTape,finitePhysicsState} from './replay.js';
import {VESSEL_MASS} from './collision.js';
import {createTraffic, updateTraffic, collideTraffic} from './traffic.js';
import {createSpray} from './spray.js';
import {createAtmosphere} from './atmosphere.js';
import {createCinema} from './cinema.js';
import {cameraPose, CAMERA_ZOOM_PRESETS, clampCameraZoom} from './camera.js';
import {createPerformanceOverlay} from './performance.js';
import {createRace, gates, COURSE_LENGTH, tickCountdown, updateRace, recoverRace, useBoost, readBest, saveBest, formatTime} from './race.js';
import {DEFAULT_BINDINGS, readPreferences, savePreferences, remap, readGamepad, advanceLesson} from './preferences.js';
import {createWater, createScenery} from './scenery.js';
import {loadRealScenery} from './real-scenery.js';
import {channel, chunkFeatures, chunkIndex, START_Z, END_Z, WORLD_SIZE, CHUNK_COUNT} from './world.js';
import './style.css';
import './feedback.css';

document.getElementById('app').innerHTML = `
  <header><div class="brand">TIDE<span>RAID</span><sup>2.0</sup></div><span class="tagline">COASTAL EXPEDITION / 01</span>
    <button id="quickSound" title="Toggle sound · Z">SOUND / OFF</button><button id="pause" aria-label="Pause game">PAUSE</button></header>
  <section id="telemetry"><div><b id="speed">000</b><span>KM/H</span></div><p id="air">WATERBORNE</p>
    <div class="progress"><i id="progress"></i></div><small id="distance">0 / 18.78 KM</small>
    <p id="raceClock">0:00.00</p><small id="checkpoint">COASTAL SPRINT</small><p id="passes">CLEAN PASSES / 0</p><small id="fleetStatus">LOADING WATERCRAFT…</small>
    <label>BOOST <meter id="boost" min="0" max="1" value="1"></meter></label>
    <p id="voyageStatus" style="max-width:240px;line-height:1.6"></p>
    <label id="hullLabel">HULL <meter id="hullMeter" min="0" max="1" value="1"></meter></label>
    <label id="fuelLabel">FUEL <meter id="fuelMeter" min="0" max="1" value="1"></meter></label></section>
  <section id="depthGauge" aria-label="Estimated depth gauge"><small>ESTIMATED DEPTH · METRES</small><div class="depth-values"><div>RIVER<strong id="gaugeDepth">—</strong></div><div>UNDER HULL<strong id="gaugeClearance">—</strong></div><div>CAMERA BELOW WATER<strong id="gaugeCamera">—</strong></div></div><small id="gaugeStatus">DEPTH UNAVAILABLE</small></section>
  <aside><canvas id="map" width="220" height="240" aria-label="Local river navigation map"></canvas>
    <div class="map-label">CHANNEL SCANNER <span id="chunks"></span></div>
    <details><summary>HELM SETTINGS</summary>
      <button id="beauty">BEAUTY PRESET</button>
      <a href="./cargo.html" style="display:block;padding:12px 0;color:#9ee6ca">CARGO BALANCE LAB · SEPARATE PROTOTYPE ↗</a>
      <details><summary>WEATHER & TIME</summary>
        <label for="weather">WEATHER</label><select id="weather"><option value="sunny">Sunny</option><option value="cloudy">Cloudy</option><option value="rain">Rain</option></select>
        <label for="hour">TIME OF DAY <output id="hourValue"></output></label><input id="hour" type="range" min="0" max="24" step="0.25">
        <label><input id="dayCycle" type="checkbox"> AUTOMATIC DAY / NIGHT CYCLE</label>
        <label for="cycleMinutes">FULL DAY LENGTH (MINUTES)</label><input id="cycleMinutes" type="range" min="5" max="60" step="5"><output id="cycleValue"></output>
        <label for="wind">WIND STRENGTH</label><input id="wind" type="range" min="0" max="100"><output id="windValue"></output>
        <label for="windAngle">WIND DIRECTION</label><input id="windAngle" type="range" min="0" max="360" step="15"><output id="windAngleValue"></output>
        <label><input id="glow" type="checkbox"> GLOWING NIGHT WAKE</label>
        <small>Visual weather: wind moves clouds/rain, not the hull. Swell remains separate. Night lamps and forward beams switch on automatically. Glow is a stylized bioluminescent effect. Cycle pauses with the game; time changes do not affect trial physics.</small>
      </details>
      <details><summary>DAMAGE & FUEL / EXPLORATION</summary>
        <label for="damageMode">DAMAGE MODEL</label><select id="damageMode"><option value="arcade">Arcade · forgiving wear</option><option value="realistic">Realistic · harsher impacts</option></select>
        <label for="sinkingMode">SINKING</label><select id="sinkingMode"><option value="off">Disallowed · stay afloat</option><option value="arcade">Arcade · slower critical-damage flooding</option><option value="realistic">Realistic · progressive flooding</option></select>
        <label for="fuelMode">FUEL CONSUMPTION</label><select id="fuelMode"><option value="off">Unlimited fuel</option><option value="arcade">Arcade · shorter fuel strategy</option><option value="realistic">Realistic · estimated engine load</option></select>
        <button id="floodingDrill">START FLOODING DRILL</button><small>Exploration with sinking enabled only: damages the hull for practice. H / Recover ends the drill and pumps the water out.</small>
        <small>Exploration only. Realistic means game approximation. Green + stations repair/refuel free: stop below 5 km/h, release throttle for 1.5 seconds. H / Recover provides rescue and emergency fuel. Changing rules restarts exploration. Time trials keep original rules.</small>
      </details>
      <button id="exportReplay">EXPORT PHYSICS REPLAY</button><small>Up to 10 minutes, local input/state diagnostics only. No upload.</small>
      <label for="playerBoat">YOUR BOAT</label>
      <select id="playerBoat" disabled>${PLAYER_BOATS.map((boat) => `<option value="${boat.model}">${boat.name}</option>`).join('')}</select>
      <small id="handlingDescription"></small>
      <small>Native hull sizes, mass, power and handling. Sailboat uses auxiliary power. Changing boat restarts the run. Reverse: B / gamepad B (keyboard remappable).</small>
      <label for="detail">WATER SURFACE <output id="quality"></output></label>
      <input id="detail" type="range" min="0" max="100" value="25">
      <small>Faceted → smooth. Surface tessellation only; shared analytical waves, no particle-fluid solver.</small>
      <label for="swell">SWELL <output id="swellValue">${DEFAULT_SWELL.toFixed(1)}×</output></label>
      <input id="swell" type="range" min="0" max="${MAX_SWELL * 100}" value="${DEFAULT_SWELL * 100}">
      <label for="riverDepth">RIVER DEPTH <output id="riverDepthValue"></output></label>
      <input id="riverDepth" type="range" min="0.5" max="4" step="0.25">
      <small>Exploration only · 1× original / 2× deeper / 4× very deep. Maximum 80 m; shorelines and shallow banks remain. Changing depth restarts exploration.</small>
      <button id="camera">CAMERA / ARCADE</button>
      <label for="cameraView">CAMERA VIEW</label><select id="cameraView" style="width:100%;padding:10px;background:#15383c;color:inherit;font:inherit"><option value="chase">Chase</option><option value="pilot">Pilot / driver POV</option><option value="arcade">Arcade overview</option><option value="wreck">Wreck inspection · underwater orbit</option></select>
      <label><input id="reducedCameraMotion" type="checkbox" style="width:auto"> REDUCED CAMERA MOTION · NO FOLLOW LAG</label>
      <small>Wreck inspection follows the hull underwater. Orbit, tilt and zoom work; manual height is ignored. V resets the current view to its default.</small>
      <small id="pilotHint" hidden>Pilot view: drag with the left or right mouse button to look around, or use J/L and I/K (±75° tilt). V / Reset Camera looks straight ahead. Eye stays at the helm, including the sink-with-boat option. Exterior hull is hidden; no detailed cockpit interior yet. Zoom and height remain exterior-only. Driving remaps take priority over V.</small>
      <label for="mouseLookSensitivity">DRIVER MOUSE SENSITIVITY <output id="mouseLookSensitivityValue"></output></label>
      <input id="mouseLookSensitivity" type="range" min="0.25" max="3" step="0.05">
      <label for="pilotLookSmoothing">DRIVER LOOK SMOOTHING <output id="pilotLookSmoothingValue"></output></label>
      <input id="pilotLookSmoothing" type="range" min="0" max="100" step="5">
      <small>Sensitivity affects mouse drag only; IJKL speed is unchanged. Smoothing softens both mouse and keyboard look. 0% is immediate; V always recenters immediately.</small>
      <label><input id="pilotSinkWithBoat" type="checkbox" style="width:auto"> DRIVER POV: SINK WITH BOAT</label>
      <label><input id="manualCamera" type="checkbox" style="width:auto"> MANUAL CAMERA HEIGHT / TILT</label>
      <label for="cameraElevation">ANGLE ABOVE WATER <output id="cameraElevationValue"></output></label>
      <input id="cameraElevation" type="range" min="5" max="85" step="1">
      <label for="cameraHeight">HEIGHT ABOVE WATER <output id="cameraHeightValue"></output></label>
      <input id="cameraHeight" type="range" min="3" max="500" step="1">
      <output id="cameraActual"></output>
      <small>5° looks along the water; 85° looks down. Sliders enable manual mode. Zoom divides the requested height; hull clearance and render-distance limits can change the actual angle. Orbit still rotates around the boat.</small>
      <button id="cameraAuto">RESTORE AUTOMATIC HEIGHT / TILT</button>
      <label for="cameraZoom">CAMERA ZOOM <output id="cameraZoomValue"></output></label>
      <input id="cameraZoom" type="range" min="0.5" max="8" step="0.1" value="1">
      <button id="zoomIn">ZOOM IN +</button><button id="zoomOut">ZOOM OUT −</button>
      <label for="zoomPreset">ZOOM PRESET</label>
      <select id="zoomPreset" style="width:100%;padding:10px;background:#15383c;color:inherit;font:inherit" aria-label="Zoom preset">
        <option value="custom">Custom</option>${CAMERA_ZOOM_PRESETS.map((preset) => `<option value="${preset.zoom}">${preset.name} · ${preset.zoom}×</option>`).join('')}
      </select>
      <small>Scroll over the water to zoom. Wide shows the channel; Close and Detail enlarge the boat. Chase stops at a safe hull distance.</small>
      <label for="cameraAngle">CAMERA ORBIT <output id="cameraAngleValue"></output></label>
      <small>Hold J / L to orbit · I / K to tilt, including wreck view. In Pilot, look around/up/down from the helm instead. + / − zoom in / out (exterior) · Z toggles sound. Remapped driving keys take priority.</small>
      <input id="cameraAngle" type="range" min="0" max="360" step="1" value="20">
      <small>0° rear · 90° side · 180° front · 270° side. Or right-drag the water. Steering stays boat-relative.</small>
      <button id="cameraRear">RESET CAMERA / REAR QUARTER</button>
      <button id="sound">SOUND / OFF</button><button id="recover">RECOVER BOAT / H</button><button id="reset">RESTART RUN</button>
      <label for="volume">SOUND VOLUME</label><input id="volume" type="range" min="0" max="100" value="65">
      <details id="soundMix"><summary>CALM SOUND MIX</summary>
        <label for="shallowThreshold">SHALLOW-WATER ALARM THRESHOLD <output id="shallowThresholdValue"></output></label><input id="shallowThreshold" type="range" min="0.2" max="5" step="0.1">
        <label><input id="shallowMuted" type="checkbox" style="width:auto"> MUTE SHALLOW-WATER WARNING</label><small>Uses estimated under-hull clearance. Master sound must be on; alarm respects effects volume and pauses. Cadence increases near contact; a release margin prevents chatter. Suppressed after severe flooding.</small>
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
renderer.toneMappingExposure = 0.98;
document.getElementById('view').append(renderer.domElement);
const scene = new THREE.Scene();
const atmosphere = createAtmosphere(scene, renderer);
const seabed = createSeabed(scene);
const underwaterView = createUnderwaterView(scene, document.getElementById('view'));
let underwater = 0;
const hemisphere = new THREE.HemisphereLight(0xc6d8e2, 0x343b2e, 0.65); scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xffedce, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera, {left: -100, right: 100, top: 100, bottom: -100, near: 1, far: 450});
sun.shadow.normalBias = 0.12; sun.shadow.bias = -0.0002;
scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 90 : 55, innerWidth / innerHeight, 0.5, 1600);
const cinema = createCinema(renderer, scene, camera);
const water = createWater(scene);
let scenery = createScenery(scene);
const sceneryStatus=document.createElement('small');sceneryStatus.id='sceneryStatus';sceneryStatus.textContent='PHOTO ASSETS / LOADING';
document.getElementById('fleetStatus').after(sceneryStatus);
loadRealScenery().then((assets)=>{
  seabed.setAssets(assets);
  scenery.dispose();scenery=createScenery(scene,assets);sceneryStatus.textContent='PHOTO ASSETS / READY · POLY HAVEN CC0';
}).catch(()=>{sceneryStatus.textContent='PHOTO ASSETS / FAILED · FALLBACK ACTIVE · RELOAD TO RETRY';});
elements.quality.textContent = water.setDetail(preferences.detail);
document.getElementById('detail').value = preferences.detail;
const boat = createBoat();
const rainView = createRain(scene);
let playerLights = null;
let playerLightModel = null;
const searchlight = new THREE.SpotLight(0xcce9ff, 0, 95, 0.28, 0.7, 2);
scene.add(searchlight, searchlight.target);
const serviceView = createServiceView(scene);
let wearView = null;
let voyage = createVoyage();
scene.add(boat);
const spray = createSpray(scene);
const sinkingBubbles = createSinkingBubbles(scene);
let state = createState(preferences.playerBoat);
state.mass = VESSEL_MASS[preferences.playerBoat];
let traffic = createTraffic(state);
let replayTape=createReplayTape(state,traffic);
document.getElementById('exportReplay').onclick=()=>{
  if (race.phase === 'explore') {alert('Voyage replay is not supported yet. Trial replay is available.'); return;}
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
  document.getElementById('handlingDescription').textContent = VESSEL_HANDLING[preferences.playerBoat];
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
let roughness = DEFAULT_SWELL;
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
const pilotLook = {yaw: preferences.pilotYaw, pitch: preferences.pilotPitch};
const pilotLookTarget = {yaw: preferences.pilotYaw, pitch: preferences.pilotPitch};
let cameraCut = true;
const audio = createAudio();
document.getElementById('shallowThreshold').value = preferences.shallowThreshold;
document.getElementById('shallowThresholdValue').textContent = `${preferences.shallowThreshold.toFixed(1)} m`;
document.getElementById('shallowMuted').checked = preferences.shallowMuted;
document.getElementById('shallowThreshold').oninput = (event) => {preferences.shallowThreshold = Number(event.target.value); document.getElementById('shallowThresholdValue').textContent = `${preferences.shallowThreshold.toFixed(1)} m`; persistPreferences();};
document.getElementById('shallowMuted').onchange = (event) => {preferences.shallowMuted = event.target.checked; persistPreferences();};
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
  audio.setClearanceWarning(null, preferences.shallowThreshold, preferences.shallowMuted, false);
  if (phase !== 'explore' && !trafficView) return;
  state = createState(preferences.playerBoat);
  voyage = createVoyage();
  if (phase === 'explore') state.depthScale = preferences.riverDepth;
  sinkingBubbles.reset();
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
    roughness = TRIAL_SWELL;
  }
  document.getElementById('swell').disabled = phase !== 'explore';
  if (phase === 'explore') roughness = DEFAULT_SWELL;
  document.getElementById('swell').value = String(roughness * 100);
  elements.swellValue.textContent = `${roughness.toFixed(1)}×`;
  document.getElementById('riverDepth').disabled = phase !== 'explore';
  snapCamera();
}
function rescue() {
  if (complete || race.phase === 'ready' || race.phase === 'countdown') return;
  recoverRace(race, state);
  recover(state, simTime, roughness);
  if (race.phase === 'explore') {
    voyage.hull = Math.max(0.4, voyage.hull); voyage.fuel = Math.max(0.2, voyage.fuel);
    resetSinking(voyage); sinkingBubbles.reset(); voyage.mooring = 0; voyage.servicing = false;
  }
}
function toggleCamera() {
  rememberCamera(preferences, mode, ({chase: 'pilot', pilot: 'arcade', arcade: 'wreck', wreck: 'chase'})[mode]);
  mode = ({chase: 'pilot', pilot: 'arcade', arcade: 'wreck', wreck: 'chase'})[mode];
  elements.camera.textContent = `CAMERA / ${mode.toUpperCase()}`;
  preferences.camera = mode;
  document.getElementById('cameraView').value = mode;
  setCameraAngle(preferences.cameraAngle); setCameraZoom(preferences.cameraZoom); syncCameraPlacement();
  snapCamera();
  persistPreferences();
}
function togglePause() {
  paused = !paused;
  accumulator = 0;
  keys.clear();
  elements.pause.textContent = paused ? 'RESUME' : 'PAUSE';
}
function cameraGoal() {
  const waterHeight = sampleWave(state.x, state.z, simTime, roughness).h;
  const cameraState = race.phase === 'explore' && voyage.flooding > 0.2 && mode !== 'wreck' && !(mode === 'pilot' && preferences.pilotSinkWithBoat) ? {...state, y: Math.max(state.y, waterHeight + 0.2)} : state;
  const pose = cameraPose(cameraState, mode, preferences.cameraAngle, camera.aspect, innerWidth < innerHeight, channel(state.z).width * 2, preferences.cameraZoom,
    preferences.manualCamera ? {elevation: preferences.cameraElevation, height: preferences.cameraHeight, waterHeight} : null,
    pilotLook);
  if (mode === 'wreck') pose.y = Math.max(pose.y, seabedHeight(pose.x, pose.z, state.depthScale) + 1.5);
  const horizontal = Math.hypot(pose.x - pose.lookX, pose.z - pose.lookZ);
  document.getElementById('cameraActual').textContent = `Actual: ${(pose.y - waterHeight).toFixed(1)} m · ${(Math.atan2(pose.y - pose.lookY, horizontal) * 180 / Math.PI).toFixed(1)}°`;
  cameraPosition.set(pose.x, pose.y, pose.z);
  lookTarget.set(pose.lookX, pose.lookY, pose.lookZ);
  if (Math.abs(camera.fov - pose.fov) > 0.01) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}
function snapCamera() {
  cameraCut = true;
  pilotLook.yaw = preferences.pilotYaw; pilotLook.pitch = preferences.pilotPitch;
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
let cameraKeysDirty = false; let cameraKeysIdle = 0;
function syncCameraPlacement() {
  document.getElementById('manualCamera').checked = preferences.manualCamera;
  document.getElementById('cameraElevation').value = preferences.cameraElevation;
  document.getElementById('cameraHeight').value = preferences.cameraHeight;
  document.getElementById('cameraElevationValue').textContent = `${Math.round(preferences.cameraElevation)}°`;
  document.getElementById('cameraHeightValue').textContent = `${preferences.cameraHeight} m (before zoom)`;
}
syncCameraPlacement();
for (const name of ['mouseLookSensitivity', 'pilotLookSmoothing']) {
  const control = document.getElementById(name); const output = document.getElementById(`${name}Value`);
  const smoothing = name === 'pilotLookSmoothing';
  const sync = () => {control.value = preferences[name] * (smoothing ? 100 : 1); output.textContent = smoothing ? `${Math.round(preferences[name] * 100)}%` : `${preferences[name].toFixed(2)}×`;};
  sync();
  control.oninput = () => {preferences[name] = Number(control.value) / (smoothing ? 100 : 1); sync();};
  control.onchange = persistPreferences;
}
for (const name of ['cameraElevation', 'cameraHeight']) document.getElementById(name).oninput = (event) => {
  preferences[name] = Number(event.target.value); preferences.manualCamera = true;
  syncCameraPlacement(); persistPreferences();
};
document.getElementById('manualCamera').onchange = (event) => {preferences.manualCamera = event.target.checked; persistPreferences();};
document.getElementById('cameraAuto').onclick = () => {preferences.manualCamera = false; syncCameraPlacement(); persistPreferences();};
function setCameraZoom(zoom) {
  preferences.cameraZoom = Math.round(clampCameraZoom(zoom) * 10) / 10;
  document.getElementById('cameraZoom').value = preferences.cameraZoom;
  document.getElementById('cameraZoomValue').textContent = `${preferences.cameraZoom.toFixed(1)}×`;
  document.getElementById('zoomPreset').value = CAMERA_ZOOM_PRESETS.some((preset) => preset.zoom === preferences.cameraZoom) ? String(preferences.cameraZoom) : 'custom';
}
setCameraZoom(preferences.cameraZoom);
document.getElementById('cameraZoom').oninput = (event) => setCameraZoom(Number(event.target.value));
document.getElementById('cameraZoom').onchange = persistPreferences;
document.getElementById('zoomPreset').onchange = (event) => {
  if (event.target.value === 'custom') return;
  setCameraZoom(Number(event.target.value)); persistPreferences();
};
document.getElementById('zoomIn').onclick = () => {setCameraZoom(preferences.cameraZoom * 1.25); persistPreferences();};
document.getElementById('zoomOut').onclick = () => {setCameraZoom(preferences.cameraZoom / 1.25); persistPreferences();};
renderer.domElement.addEventListener('wheel', (event) => {
  if (mode === 'pilot' || event.ctrlKey || !event.deltaY) return;
  event.preventDefault();
  setCameraZoom(preferences.cameraZoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
  persistPreferences();
}, {passive: false});
document.getElementById('cameraAngle').oninput = (event) => setCameraAngle(Number(event.target.value));
document.getElementById('cameraAngle').onchange = persistPreferences;
document.getElementById('cameraRear').onclick = () => {
  keys.delete('KeyI'); keys.delete('KeyJ'); keys.delete('KeyK'); keys.delete('KeyL');
  if (orbitDrag) finishOrbit({pointerId: orbitDrag.id});
  Object.assign(preferences, cameraDefaults(mode));
  setCameraAngle(preferences.cameraAngle); setCameraZoom(preferences.cameraZoom); syncCameraPlacement();
  snapCamera();
  persistPreferences();
};
let orbitDrag = null;
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (orbitDrag || (mode === 'pilot' ? (event.pointerType !== 'mouse' || ![0, 2].includes(event.button)) : event.button !== 2)) return;
  event.preventDefault();
  renderer.domElement.tabIndex = 0; renderer.domElement.focus({preventScroll: true});
  orbitDrag = {id: event.pointerId, x: event.clientX, y: event.clientY, mode};
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (orbitDrag?.id !== event.pointerId) return;
  if (orbitDrag.mode !== mode) {finishOrbit(event); return;}
  if (mode === 'pilot') {
    const look = dragPilotLook(preferences.pilotYaw, preferences.pilotPitch, event.clientX - orbitDrag.x, event.clientY - orbitDrag.y, preferences.mouseLookSensitivity);
    preferences.pilotYaw = look.yaw; preferences.pilotPitch = look.pitch;
  } else setCameraAngle((preferences.cameraAngle + (event.clientX - orbitDrag.x) * 0.35 + 360) % 360);
  orbitDrag.x = event.clientX; orbitDrag.y = event.clientY;
});
function finishOrbit(event) {
  if (orbitDrag?.id !== event.pointerId) return;
  orbitDrag = null;
  if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
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
  if (event.target.matches('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
  const shortcut = viewShortcut(event, preferences.bindings, mode);
  if (shortcut) {
    event.preventDefault();
    if (shortcut === 'sound') void toggleSound();
    else if (shortcut === 'resetLook') document.getElementById('cameraRear').click();
    else {setCameraZoom(preferences.cameraZoom * (shortcut === 'zoomIn' ? 1.25 : 1 / 1.25)); persistPreferences();}
    return;
  }
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
addEventListener('keyup', (event) => {
  keys.delete(event.code);
  if (cameraKeysDirty && ['KeyI', 'KeyJ', 'KeyK', 'KeyL'].includes(event.code)) {persistPreferences(); cameraKeysDirty = false;}
});
addEventListener('blur', () => {if (orbitDrag) finishOrbit({pointerId: orbitDrag.id}); keys.clear(); if (!paused) togglePause();});
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
document.getElementById('cameraView').value = mode;
document.getElementById('pilotSinkWithBoat').checked = preferences.pilotSinkWithBoat;
document.getElementById('pilotSinkWithBoat').onchange = (event) => {preferences.pilotSinkWithBoat = event.target.checked; persistPreferences();};
document.getElementById('cameraView').onchange = (event) => {
  rememberCamera(preferences, mode, event.target.value);
  mode = event.target.value; preferences.camera = mode;
  setCameraAngle(preferences.cameraAngle); setCameraZoom(preferences.cameraZoom); syncCameraPlacement();
  elements.camera.textContent = `CAMERA / ${mode.toUpperCase()}`; persistPreferences(); snapCamera();
};
document.getElementById('floodingDrill').onclick = () => {
  if (race.phase !== 'explore' || preferences.sinkingMode === 'off') return;
  voyage.hull = preferences.sinkingMode === 'arcade' ? 0 : 0.08;
};
let weatherEpoch = 0;
document.getElementById('reducedCameraMotion').checked = preferences.reducedCameraMotion;
document.getElementById('reducedCameraMotion').onchange = (event) => {preferences.reducedCameraMotion = event.target.checked; persistPreferences(); snapCamera();};
for (const name of ['weather', 'hour', 'dayCycle', 'cycleMinutes', 'wind', 'windAngle', 'glow']) {
  const control = document.getElementById(name);
  if (control.type === 'checkbox') control.checked = preferences[name]; else control.value = preferences[name];
  control.oninput = () => {
    preferences[name] = control.type === 'checkbox' ? control.checked : name === 'weather' ? control.value : Number(control.value);
    if (['hour', 'dayCycle', 'cycleMinutes'].includes(name)) weatherEpoch = simTime;
    persistPreferences();
  };
}
for (const name of ['damageMode', 'sinkingMode', 'fuelMode']) {
  const control = document.getElementById(name);
  control.value = preferences[name];
  control.onchange = () => {
    preferences[name] = control.value; persistPreferences();
    if (race.phase === 'explore') reset('explore');
  };
}
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
  roughness = clampSwell(Number(event.target.value) / 100);
  elements.swellValue.textContent = `${roughness.toFixed(1)}×`;
};
document.getElementById('riverDepth').value = preferences.riverDepth;
document.getElementById('riverDepthValue').textContent = `${preferences.riverDepth.toFixed(2)}×`;
document.getElementById('riverDepth').disabled = race.phase !== 'explore';
document.getElementById('riverDepth').oninput = (event) => {document.getElementById('riverDepthValue').textContent = `${Number(event.target.value).toFixed(2)}×`;};
document.getElementById('riverDepth').onchange = (event) => {
  preferences.riverDepth = Number(event.target.value); persistPreferences();
  if (race.phase === 'explore') reset('explore');
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
  if (race.phase === 'explore') for (const station of SERVICE_STATIONS) {
    const positionY = mapY(station.z);
    if (positionY < 5 || positionY > 235) continue;
    map.save(); map.resetTransform();
    map.fillStyle = '#63ffc1'; map.font = 'bold 16px monospace';
    map.fillText('+', mapX(station.x) - 5, positionY + 5); map.restore();
  }
  map.beginPath(); map.moveTo(0, -8); map.lineTo(5, 6); map.lineTo(-5, 6); map.closePath();
  map.fillStyle = '#ff7b49'; map.fill(); map.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  const frameMilliseconds = now - lastFrame;
  const elapsed = Math.min(frameMilliseconds / 1000, 0.05);
  lastFrame = now;
  const editing = pendingBinding || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
  const cameraMotion = cameraKeyMotion(editing ? new Set() : keys, preferences.bindings, mode, elapsed);
  if (cameraMotion.orbit || cameraMotion.tilt) {
    if (mode === 'pilot') {
      preferences.pilotYaw = ((preferences.pilotYaw + cameraMotion.orbit + 180 + 360) % 360) - 180;
      preferences.pilotPitch = Math.max(-75, Math.min(75, preferences.pilotPitch + cameraMotion.tilt));
    } else {
      if (cameraMotion.orbit) setCameraAngle((preferences.cameraAngle + cameraMotion.orbit + 360) % 360);
      if (cameraMotion.tilt) {
        preferences.cameraElevation = Math.max(5, Math.min(85, preferences.cameraElevation + cameraMotion.tilt));
        preferences.manualCamera = true; syncCameraPlacement();
      }
    }
    cameraKeysDirty = true; cameraKeysIdle = 0;
  } else if (cameraKeysDirty) {
    cameraKeysIdle += elapsed;
    if (cameraKeysIdle > 0.4) {persistPreferences(); cameraKeysDirty = false;}
  }
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
      const exploring = race.phase === 'explore';
      if (exploring) state.serviceDocks = 1;
      const canDrive = !exploring || voyageDrive(voyage);
      const driveInput = {...input, throttle: input.throttle && canDrive, reverse: input.reverse && canDrive, boost: boosting && canDrive};
      if (!exploring) replayTape.record(driveInput,simTime,roughness);
      const fullPower = state.power;
      const dryMass = state.mass; const dryDraft = state.draft; const dryCG = state.cgHeight;
      const flooded = exploring ? floodedHandling(voyage, state) : null;
      if (flooded) {state.mass = flooded.mass; state.draft = flooded.draft; state.cgHeight = flooded.cgHeight; state.power *= flooded.power;}
      if (exploring && preferences.damageMode === 'realistic') state.power *= 0.35 + 0.65 * voyage.hull;
      step(state, driveInput, 1 / 120, simTime, roughness, trafficView ? (body) => {
        if (exploring && voyage.flooding > 0.8) return false;
        let hit=false;
        for(const ship of traffic.boats) hit=collideTraffic(body,ship)||hit;
        return hit;
      } : null, flooded?.buoyancy ?? 1);
      state.power = fullPower;
      state.mass = dryMass; state.draft = dryDraft; state.cgHeight = dryCG;
      if (exploring) {
        const surface = sampleWave(state.x, state.z, simTime, roughness).h;
        tickVoyage(voyage, state, driveInput, preferences, 1 / 120, surface);
        settleFloodedHull(state, voyage, surface, 1 / 120);
        sinkingBubbles.update(state, voyage, 1 / 120, simTime, roughness, preferences.sinkingMode !== 'off');
      }
      if (trafficView) updateTraffic(traffic, state, 1 / 120);
      if (!exploring) replayTape.seal(state,traffic);
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
  boat.visible = mode !== 'pilot';
  document.getElementById('pilotHint').hidden = mode !== 'pilot';
  for (const id of ['manualCamera', 'cameraElevation', 'cameraHeight', 'cameraAuto', 'cameraZoom', 'zoomIn', 'zoomOut', 'zoomPreset', 'cameraAngle']) document.getElementById(id).disabled = mode === 'pilot';
  document.getElementById('cameraRear').textContent = 'RESET CURRENT VIEW / V';
  for (const id of ['manualCamera', 'cameraElevation', 'cameraAuto']) document.getElementById(id).disabled = mode === 'pilot';
  document.getElementById('cameraHeight').disabled = mode === 'pilot' || mode === 'wreck';
  boat.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  const weather = weatherState(preferences, simTime - weatherEpoch);
  const displayedHour = Math.floor(weather.hour * 60);
  document.getElementById('hourValue').textContent = `${String(Math.floor(displayedHour / 60)).padStart(2, '0')}:${String(displayedHour % 60).padStart(2, '0')}`;
  document.getElementById('cycleValue').textContent = `${preferences.cycleMinutes} minutes`;
  document.getElementById('windValue').textContent = `${preferences.wind}%`;
  document.getElementById('windAngleValue').textContent = `${preferences.windAngle}°`;
  const exploring = race.phase === 'explore';
  weather.headlight = exploring && voyage.flooding >= 0.75 ? 0 : 1;
  if (trafficView && !wearView) wearView = createWearView(boat);
  wearView?.update(voyage, state, exploring);
  if (exploring) {boat.rotation.z += voyage.sinking.list; boat.rotation.x += voyage.sinking.trim;}
  document.getElementById('floodingDrill').disabled = !exploring || preferences.sinkingMode === 'off';
  serviceView.update(state.z, exploring);
  document.getElementById('hullLabel').hidden = !exploring;
  document.getElementById('fuelLabel').hidden = !exploring;
  document.getElementById('hullMeter').value = voyage.hull;
  document.getElementById('fuelMeter').value = voyage.fuel;
  if (exploring) {
    const nearest = SERVICE_STATIONS.reduce((best, candidate) => Math.hypot(candidate.x - state.x, candidate.z - state.z) < Math.hypot(best.x - state.x, best.z - state.z) ? candidate : best);
    const status = voyage.flooding >= 1 ? 'SUNK · H / RECOVER' : voyage.servicing ? 'MOORED · REPAIRING + REFUELING' : voyage.flooding > 0.1 ? `FLOODING ${Math.round(voyage.flooding * 100)}% · SEEK SERVICE / H` : !voyageDrive(voyage) ? 'STRANDED · H / RECOVER' : voyage.fuel < 0.2 ? 'LOW FUEL · SEEK GREEN +' : 'VOYAGE';
    document.getElementById('voyageStatus').textContent = `${status} · HULL ${Math.round(voyage.hull * 100)}% · FUEL ${Math.round(voyage.fuel * 100)}% · ${voyage.flooding > 0 ? `WATER ${Math.round(voyage.flooding * state.mass * 1.12 / 1.025)} L / ${voyage.sinking.ingress.toFixed(1)} L/s · ` : ''}${nearest.name} ${Math.round(Math.hypot(nearest.x - state.x, nearest.z - state.z))} m`;
  } else document.getElementById('voyageStatus').textContent = '';
  water.update(state.x, state.z, simTime, roughness, state.heading, state.airtime > 0.15 || (exploring && voyage.flooding > 0.55) ? 0 : state.speed, weather);
  const chunks = scenery.update(state.z, simTime,state.x, weather.night);
  trafficView?.(traffic, simTime, roughness, weather.night, state);
  if (!playerLights || playerLightModel !== preferences.playerBoat) {
    if (playerLights) {scene.remove(playerLights); playerLights.children[0].geometry.dispose();}
    playerLights = createVesselLights(state.length, state.beam); scene.add(playerLights); playerLightModel = preferences.playerBoat;
  }
  playerLights.position.copy(boat.position); playerLights.rotation.copy(boat.rotation); playerLights.visible = weather.night > 0.1 && (!exploring || voyage.flooding < 0.75);
  searchlight.intensity = weather.night * 1800 * (exploring ? 1 - voyage.flooding : 1);
  searchlight.position.set(state.x, boat.position.y + 1.6, state.z);
  searchlight.target.position.set(state.x - Math.sin(state.heading) * 55, 0, state.z - Math.cos(state.heading) * 55);
  rainView.update(simTime, state, weather);
  gateGroup.visible = race.phase === 'racing' || race.phase === 'countdown';
  if (gateGroup.visible) {
    const gate = gates[race.next];
    gateGroup.position.set(gate.x, 0, gate.z);
    gateGroup.children[0].position.x = -gate.halfWidth;
    gateGroup.children[1].position.x = gate.halfWidth;
    gateLine.scale.x = gate.halfWidth * 2;
  }
  pilotLookTarget.yaw = preferences.pilotYaw; pilotLookTarget.pitch = preferences.pilotPitch;
  if (mode === 'pilot') smoothPilotLook(pilotLook, pilotLookTarget, elapsed, preferences.pilotLookSmoothing, pilotLook);
  cameraGoal();
  camera.position.lerp(cameraPosition, 1 - Math.exp(-(mode === 'pilot' ? 16 : 5) * elapsed));
  if (preferences.reducedCameraMotion) {camera.position.copy(cameraPosition); smoothLook.copy(lookTarget);}
  if (mode === 'pilot') smoothLook.copy(lookTarget);
  else smoothLook.lerp(lookTarget, 1 - Math.exp(-7 * elapsed));
  if (mode !== 'pilot') clearCameraTerrain(camera.position, smoothLook, (x, z) => cameraGroundHeight(x, z, state.depthScale), mode === 'wreck' ? -Infinity : sampleWave(camera.position.x, camera.position.z, simTime, roughness).h + 1);
  camera.lookAt(smoothLook);
  const cameraSurface = sampleWave(camera.position.x, camera.position.z, simTime, roughness).h;
  const underwaterEnabled = ((mode === 'pilot' && preferences.pilotSinkWithBoat) || mode === 'wreck') && exploring;
  if (cameraCut) {
    underwater = underwaterEnabled ? Math.max(0, Math.min(1, (cameraSurface - camera.position.y) / 0.6)) : 0;
    underwaterView.reset(cameraSurface - camera.position.y, simTime); cameraCut = false;
  } else underwater = underwaterBlend(underwater, cameraSurface - camera.position.y, underwaterEnabled, elapsed);
  seabed.update(state, camera, simTime, underwater, weather, trafficView ? traffic.boats : []);
  underwaterView.update(simTime, camera, underwater, voyage.sinking.air, roughness);
  audio.update(state, paused, input.throttle, input.boost && race.boost > 0 && !race.boostLocked,
    traffic.boats, !complete && race.phase !== 'ready' && (!exploring || voyage.flooding < 0.75), underwater);
  atmosphere.update(simTime, camera, weather, underwater);
  sun.intensity = 0.08 + weather.sun * 2.7;
  sun.color.set(weather.daylight < 0.5 ? 0xabc6ff : weather.elevation < 0.3 ? 0xffbb7a : 0xffedce);
  hemisphere.intensity = 0.22 + weather.daylight * (0.45 - weather.cloud * 0.15);
  renderer.toneMappingExposure = 0.98 + weather.night * 0.3;
  sun.target.position.set(state.x, 0, state.z);
  sun.position.set(-0.58, Math.max(0.12, weather.elevation), -0.67).normalize().multiplyScalar(200).add(sun.target.position);
  document.body.classList.toggle('impact', state.collision > 0 && !paused);
  renderer.info.reset();
  cinema.render(preferences.cinema);
  performanceOverlay.update(frameMilliseconds, now, chunks, preferences.cinema);
  hudTimer += elapsed;
  if (hudTimer > 0.1) {
    const readings = depthReadings(state, camera.position, sampleWave(state.x, state.z, simTime, roughness).h, cameraSurface, (x, z) => waterDepth(x, z, state.depthScale), state.draft + (exploring ? voyage.flooding * 0.5 : 0));
    const metres = (value) => value === null ? '—' : `${Math.max(0, value).toFixed(1)} m`;
    document.getElementById('gaugeDepth').textContent = metres(readings.river);
    document.getElementById('gaugeClearance').textContent = metres(readings.clearance);
    document.getElementById('gaugeCamera').textContent = readings.cameraDepth === 0 ? 'ABOVE WATER' : metres(readings.cameraDepth);
    document.getElementById('gaugeStatus').textContent = readings.status;
    document.getElementById('depthGauge').dataset.warning = String(readings.status !== 'CLEAR');
    audio.setClearanceWarning(readings.clearance, preferences.shallowThreshold, preferences.shallowMuted, !complete && (race.phase === 'explore' || race.phase === 'racing') && (!exploring || voyage.flooding < 0.75));
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
