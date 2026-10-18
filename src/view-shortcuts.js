export function viewShortcut(event, bindings, mode) {
  if (event.ctrlKey || event.metaKey || event.altKey || Object.values(bindings).includes(event.code)) return null;
  if (event.code === 'KeyZ') return event.repeat ? null : 'sound';
  if (mode === 'pilot') return null;
  if (event.code === 'NumpadAdd' || event.key === '+' || event.key === '=') return 'zoomIn';
  if (event.code === 'NumpadSubtract' || event.key === '-') return 'zoomOut';
  return null;
}
