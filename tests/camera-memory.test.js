import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraMemory, rememberCamera} from '../src/camera-memory.js';
test('camera memories isolate views and sanitize persisted values', () => {
  const settings = {cameraAngle: 80, cameraZoom: 4, cameraElevation: 45, cameraHeight: 20, manualCamera: true};
  rememberCamera(settings, 'chase', 'arcade'); assert.equal(settings.cameraZoom, 1);
  settings.cameraAngle = 130; rememberCamera(settings, 'arcade', 'chase');
  assert.equal(settings.cameraAngle, 80); assert.equal(settings.cameraZoom, 4);
  assert.deepEqual(cameraMemory({chase: {cameraZoom: 100, cameraAngle: 20}, fake: {}}), {chase: {manualCamera: false, cameraAngle: 20}});
});
