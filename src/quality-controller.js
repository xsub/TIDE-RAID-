export const QUALITY_PRESETS = {custom: {ratio: 1.75}, low: {ratio: 0.8, detail: 35}, balanced: {ratio: 1.1, detail: 65}, high: {ratio: 1.75, detail: 90}, auto: {ratio: 1.25, detail: 65}};
export function createQualityController() {
  let mode = ''; let ratio = 1.25; let seconds = 0; let total = 0; let count = 0; let fastWindows = 0;
  return {update(selected, milliseconds, active) {
    if (!QUALITY_PRESETS[selected]) selected = 'custom';
    if (selected !== mode) {mode = selected; ratio = QUALITY_PRESETS[mode].ratio; seconds = 0; total = 0; count = 0; fastWindows = 0;}
    if (mode !== 'auto' || !active || !Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 100) return ratio;
    seconds += milliseconds / 1000; total += milliseconds; count++;
    if (seconds >= 3) {
      const average = total / count;
      if (average > 22) {ratio = Math.max(0.65, ratio - 0.15); fastWindows = 0;}
      else if (average < 15) {if (++fastWindows >= 3) {ratio = Math.min(1.5, ratio + 0.1); fastWindows = 0;}}
      else fastWindows = 0;
      seconds = 0; total = 0; count = 0;
    }
    return ratio;
  }};
}
