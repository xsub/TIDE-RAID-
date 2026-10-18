import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraPose, clampCameraZoom, CAMERA_ZOOM_PRESETS} from '../src/camera.js';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {createState} from '../src/physics.js';
import {VESSEL_PROFILES} from '../src/vessel-profiles.js';

test('pilot free look rotates the gaze without moving any vessel helm or changing zoom', () => {
  for (const model of Object.keys(VESSEL_PROFILES)) {
    const state = {...createState(model), heading: 0, pitch: 0, y: -8};
    const pose = (yaw, pitch) => cameraPose(state, 'pilot', 0, 16 / 9, false, 400, 1, null, {yaw, pitch});
    const forward = pose(0, 0); const right = pose(90, 0); const left = pose(-90, 0);
    assert.ok(right.lookX > right.x); assert.ok(left.lookX < left.x);
    assert.ok(pose(0, 45).lookY > forward.y); assert.ok(pose(0, -45).lookY < forward.y);
    for (const adjusted of [right, left, pose(180, 75), pose(0, -75)]) {
      assert.deepEqual([adjusted.x, adjusted.y, adjusted.z], [forward.x, forward.y, forward.z]);
      assert.ok(Object.values(adjusted).every(Number.isFinite));
    }
    assert.deepEqual(pose(0, 0), forward);
  }
});

test('pilot look preferences migrate, validate and persist independently of exterior orbit', () => {
  const defaults = readPreferences(undefined); assert.equal(defaults.pilotYaw, 0); assert.equal(defaults.pilotPitch, 0);
  const invalid = readPreferences({getItem: () => JSON.stringify({pilotYaw: 400, pilotPitch: '20'})});
  assert.equal(invalid.pilotYaw, 0); assert.equal(invalid.pilotPitch, 0);
  let saved; const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...defaults, pilotYaw: -120, pilotPitch: 40, cameraAngle: 25});
  const restored = readPreferences(storage);
  assert.equal(restored.pilotYaw, -120); assert.equal(restored.pilotPitch, 40); assert.equal(restored.cameraAngle, 25);
});

test('pilot sink-with-boat option is opt-in and persists only boolean values', () => {
  assert.equal(readPreferences(undefined).pilotSinkWithBoat, false);
  assert.equal(readPreferences({getItem: () => JSON.stringify({pilotSinkWithBoat: 'true'})}).pilotSinkWithBoat, false);
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...readPreferences(undefined), pilotSinkWithBoat: true});
  assert.equal(readPreferences(storage).pilotSinkWithBoat, true);
  const surface = cameraPose({...createState(), y: 0.2}, 'pilot', 0, 16 / 9);
  const submerged = cameraPose({...createState(), y: -5}, 'pilot', 0, 16 / 9);
  assert.ok(submerged.y < 0);
  assert.ok(Math.abs((surface.y - submerged.y) - 5.2) < 1e-8);
});

test('pilot eye follows every helm and heading while exterior orbit/zoom do not move it', () => {
  for (const model of Object.keys(VESSEL_PROFILES)) for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const state = {...createState(model), heading, pitch: 0.4, roll: 0.3};
    const pose = cameraPose(state, 'pilot', 0, 16 / 9);
    const adjusted = cameraPose(state, 'pilot', 180, 16 / 9, false, 400, 8, {height: 300, elevation: 80});
    assert.deepEqual(pose, adjusted);
    assert.ok(Object.values(pose).every(Number.isFinite));
    assert.equal(pose.y, state.y + state.helmHeight);
    assert.ok(Math.abs((pose.lookX - pose.x) + Math.sin(heading) * 70) < 1e-8);
    assert.ok(Math.abs((pose.lookZ - pose.z) + Math.cos(heading) * 70) < 1e-8);
    assert.ok(Math.abs(pose.lookY - pose.y) < 12);
  }
  assert.ok(createState('boat-house-a').helmHeight > createState('boat-cat-42').helmHeight);
});

test('pilot mode persists and portrait POV stays within a bounded field of view', () => {
  assert.equal(readPreferences({getItem: () => JSON.stringify({camera: 'pilot'})}).camera, 'pilot');
  const pose = cameraPose(createState(), 'pilot', 0, 9 / 16, true);
  assert.equal(pose.fov, 88);
});

test('manual camera respects water height, requested angle, full orbit and hull clearance', () => {
  const state = {x: 10, y: 1, z: 20, heading: 0.5, speed: 20, length: 12};
  const manual = {height: 40, elevation: 30, waterHeight: 0.4};
  for (const mode of ['arcade', 'chase']) for (const angle of [0, 90, 180, 270, 360]) {
    const pose = cameraPose(state, mode, angle, 16 / 9, false, 400, 1, manual);
    assert.ok(Math.abs(pose.y - 40.4) < 1e-8);
    const actual = Math.atan2(pose.y - pose.lookY, Math.hypot(pose.x - pose.lookX, pose.z - pose.lookZ)) * 180 / Math.PI;
    assert.ok(Math.abs(actual - 30) < 1e-8);
    assert.equal(pose.lookX, state.x); assert.equal(pose.lookZ, state.z);
  }
  const close = cameraPose(state, 'chase', 0, 9 / 16, true, 400, 8, {height: 3, elevation: 85, waterHeight: 0.4});
  assert.ok(close.y >= state.y + 3); assert.ok(Math.hypot(close.x - state.x, close.z - state.z) >= state.length * 0.8 + 2 - 1e-9);
  assert.ok(Object.values(close).every(Number.isFinite));
  const distant = cameraPose(state, 'arcade', 0, 16 / 9, false, 400, 0.5, {height: 500, elevation: 5, waterHeight: 0});
  assert.ok(Math.hypot(distant.x - distant.lookX, distant.y - distant.lookY, distant.z - distant.lookZ) < 1600);
});

test('close zoom and wreck tilt produce visibly different camera poses at requested angles', () => {
  const state = {...createState(), y: -12};
  for (const mode of ['chase', 'arcade', 'wreck']) {
    const poses = [20, 45, 70].map((elevation) => cameraPose(state, mode, 0, 16 / 9, false, 400, 8, {height: 3, elevation, waterHeight: 0}));
    for (const [index, pose] of poses.entries()) {
      const actual = Math.atan2(pose.y - pose.lookY, Math.hypot(pose.x - pose.lookX, pose.z - pose.lookZ)) * 180 / Math.PI;
      assert.ok(Math.abs(actual - [20, 45, 70][index]) < 1e-7);
      if (index) assert.notDeepEqual(pose, poses[index - 1]);
    }
  }
});

test('manual placement preferences persist and invalid values retain defaults', () => {
  const invalid = readPreferences({getItem: () => JSON.stringify({cameraElevation: 0, cameraHeight: 900, manualCamera: 'yes'})});
  assert.equal(invalid.cameraElevation, 30); assert.equal(invalid.cameraHeight, 15); assert.equal(invalid.manualCamera, false);
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...invalid, cameraElevation: 45, cameraHeight: 80, manualCamera: true});
  assert.equal(readPreferences(storage).cameraElevation, 45); assert.equal(readPreferences(storage).cameraHeight, 80); assert.equal(readPreferences(storage).manualCamera, true);
});

test('zoom presets enlarge the arcade boat and preserve orbit and safe chase clearance', () => {
  const state = {x: 0, y: 0, z: 0, heading: 0, speed: 40, length: 12};
  let previousHeight = Infinity;
  for (const {zoom} of CAMERA_ZOOM_PRESETS) {
    const pose = cameraPose(state, 'arcade', 90, 16 / 9, false, 400, zoom);
    assert.ok(pose.y < previousHeight); previousHeight = pose.y;
    assert.ok(Math.abs(pose.z) < 1e-8);
    for (const aspect of [16 / 9, 9 / 16]) {
      const chase = cameraPose(state, 'chase', 0, aspect, aspect < 1, 400, zoom);
      assert.ok(chase.z >= state.length * 0.8 + 2);
      assert.ok(Object.values(chase).every(Number.isFinite));
    }
  }
  assert.equal(clampCameraZoom(Infinity), 1);
  assert.equal(clampCameraZoom(-1), 0.5);
  assert.equal(clampCameraZoom(100), 8);
});

test('zoom preferences migrate and reject invalid values', () => {
  for (const cameraZoom of [null, '4', -1, 9]) assert.equal(readPreferences({getItem: () => JSON.stringify({cameraZoom})}).cameraZoom, 1);
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...readPreferences(undefined), cameraZoom: 4});
  assert.equal(readPreferences(storage).cameraZoom, 4);
});

test('orbit covers the full circle in both camera modes without moving its target', () => {
  const state = {x: 10, y: 0.5, z: -100, heading: 0.7, speed: 40};
  for (const mode of ['chase', 'arcade']) {
    const rear = cameraPose(state, mode, 0, 16 / 9);
    const full = cameraPose(state, mode, 360, 16 / 9);
    assert.ok(Math.abs(rear.x - full.x) < 1e-9);
    assert.ok(Math.abs(rear.z - full.z) < 1e-9);
    const front = cameraPose(state, mode, 180, 16 / 9);
    assert.ok(Math.abs((rear.x + front.x) / 2 - state.x) < 1e-9);
    for (let angle = 0; angle <= 360; angle++) {
      const pose = cameraPose(state, mode, angle, 9 / 16, true);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.equal(pose.lookX, rear.lookX);
      assert.equal(pose.lookZ, rear.lookZ);
      assert.ok(pose.y > state.y + 5);
    }
  }
});

test('chase stays close and low at speed with bounded wider perspective', () => {
  const state = {x: 0, y: 0, z: 0, heading: 0, speed: 0};
  const rest = cameraPose(state, 'chase', 0, 16 / 9);
  const fast = cameraPose({...state, speed: 70}, 'chase', 0, 16 / 9);
  assert.ok(fast.y < 7 && fast.z < 18);
  assert.ok(fast.fov > rest.fov && fast.fov <= 68);
});

test('camera angle preferences migrate, validate and persist', () => {
  assert.equal(readPreferences(undefined).cameraAngle, 20);
  for (const cameraAngle of [-1, 361, '90', null]) {
    assert.equal(readPreferences({getItem: () => JSON.stringify({cameraAngle})}).cameraAngle, 20);
  }
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...readPreferences(undefined), cameraAngle: 270});
  assert.equal(readPreferences(storage).cameraAngle, 270);
});
