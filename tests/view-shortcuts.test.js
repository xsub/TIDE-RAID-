import test from 'node:test';
import assert from 'node:assert/strict';
import {viewShortcut} from '../src/view-shortcuts.js';

test('plus/minus zoom shortcuts support main keyboard and keypad', () => {
  for (const event of [{key: '+', code: 'Equal'}, {key: '=', code: 'Equal'}, {key: '+', code: 'NumpadAdd'}]) assert.equal(viewShortcut(event, {}, 'chase'), 'zoomIn');
  for (const event of [{key: '-', code: 'Minus'}, {code: 'NumpadSubtract'}]) assert.equal(viewShortcut(event, {}, 'wreck'), 'zoomOut');
  assert.equal(viewShortcut({key: '+', code: 'Equal', repeat: true}, {}, 'arcade'), 'zoomIn');
  assert.equal(viewShortcut({key: '+', code: 'Equal'}, {}, 'pilot'), null);
});

test('Z toggles sound once, respecting remaps and browser modifier shortcuts', () => {
  assert.equal(viewShortcut({code: 'KeyZ'}, {}, 'pilot'), 'sound');
  assert.equal(viewShortcut({code: 'KeyZ', repeat: true}, {}, 'chase'), null);
  assert.equal(viewShortcut({code: 'KeyZ'}, {throttle: 'KeyZ'}, 'chase'), null);
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) assert.equal(viewShortcut({code: 'KeyZ', [modifier]: true}, {}, 'chase'), null);
  assert.equal(viewShortcut({code: 'KeyW'}, {}, 'chase'), null);
});
