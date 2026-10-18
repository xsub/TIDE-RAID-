import {channel, chunkFeatures, chunkIndex, CHUNK_COUNT, START_Z, WORLD_SIZE} from './world.js';
import {harborLayout} from './harbor-layout.js';

export const BOUNDARY_WIDTH = 128;
export const BOUNDARY_HEIGHT = 4096;
export const BOUNDARY_SPAN = 640;
let atlas;

export function boundaryAtlas() {
  if (atlas) return atlas;
  const features = Array.from({length: CHUNK_COUNT}, (unused, index) => chunkFeatures(index));
  const docks = Array.from({length: CHUNK_COUNT}, (unused, index) => harborLayout(index).docks);
  const data = new Uint8Array(BOUNDARY_WIDTH * BOUNDARY_HEIGHT);
  for (let row = 0; row < BOUNDARY_HEIGHT; row++) {
    const z = START_Z - row / (BOUNDARY_HEIGHT - 1) * WORLD_SIZE;
    const banks = channel(z);
    const sector = chunkIndex(z);
    const circles = features.slice(Math.max(0, sector - 1), Math.min(CHUNK_COUNT, sector + 2)).flat();
    const piers = docks.slice(Math.max(0, sector - 1), Math.min(CHUNK_COUNT, sector + 2)).flat();
    for (let column = 0; column < BOUNDARY_WIDTH; column++) {
      const x = banks.center + (column / (BOUNDARY_WIDTH - 1) - 0.5) * BOUNDARY_SPAN;
      let distance = banks.width - Math.abs(x - banks.center);
      for (const feature of circles) distance = Math.min(distance, Math.hypot(x - feature.x, z - feature.z) - feature.radius);
      for (const dock of piers) {
        const sideX = Math.abs(x - dock.x) - dock.width / 2;
        const sideZ = Math.abs(z - dock.z) - dock.depth / 2;
        distance = Math.min(distance, Math.hypot(Math.max(0, sideX), Math.max(0, sideZ)) + Math.min(Math.max(sideX, sideZ), 0));
      }
      data[row * BOUNDARY_WIDTH + column] = Math.round(Math.max(0, Math.min(1, (distance + 16) / 96)) * 255);
    }
  }
  atlas = data;
  return atlas;
}

export function sampleBoundary(x, z) {
  const data = boundaryAtlas();
  const banks = channel(z);
  const horizontal = (x - banks.center) / BOUNDARY_SPAN + 0.5;
  const vertical = (START_Z - z) / WORLD_SIZE;
  const column = Math.max(0, Math.min(BOUNDARY_WIDTH - 1.000001, horizontal * (BOUNDARY_WIDTH - 1)));
  const row = Math.max(0, Math.min(BOUNDARY_HEIGHT - 1.000001, vertical * (BOUNDARY_HEIGHT - 1)));
  const baseX = Math.floor(column); const baseZ = Math.floor(row);
  const fractionX = column - baseX; const fractionZ = row - baseZ;
  const offset = baseZ * BOUNDARY_WIDTH + baseX;
  const first = data[offset] * 96 / 255 - 16;
  const second = data[offset + 1] * 96 / 255 - 16;
  const third = data[offset + BOUNDARY_WIDTH] * 96 / 255 - 16;
  const fourth = data[offset + BOUNDARY_WIDTH + 1] * 96 / 255 - 16;
  const horizontalDerivative = (second - first) * (1 - fractionZ) + (fourth - third) * fractionZ;
  const verticalDerivative = (third - first) * (1 - fractionX) + (fourth - second) * fractionX;
  const centerDerivative = 0.585 * Math.cos((z - START_Z) * 0.0009) + 0.651 * Math.cos((z - START_Z) * 0.0031);
  const lateralScale = horizontal > 0 && horizontal < 1 ? (BOUNDARY_WIDTH - 1) / BOUNDARY_SPAN : 0;
  const longitudinalScale = vertical > 0 && vertical < 1 ? -(BOUNDARY_HEIGHT - 1) / WORLD_SIZE : 0;
  return {
    distance: first * (1 - fractionX) * (1 - fractionZ) + second * fractionX * (1 - fractionZ) + third * (1 - fractionX) * fractionZ + fourth * fractionX * fractionZ,
    dx: horizontalDerivative * lateralScale,
    dz: -horizontalDerivative * lateralScale * centerDerivative + verticalDerivative * longitudinalScale,
  };
}

export const boundaryGLSL = `
uniform sampler2D uBoundary;
void waterBoundary(vec2 point, out float distance, out vec2 gradient) {
  float center = 650.0*sin((point.y-200.0)*0.0009)+210.0*sin((point.y-200.0)*0.0031);
  vec2 coordinate = vec2((point.x-center)/640.0+0.5,(200.0-point.y)/18800.0);
  vec2 grid = clamp(coordinate*vec2(127.0,4095.0),vec2(0.0),vec2(126.999999,4094.999999));
  vec2 base = floor(grid); vec2 fraction = fract(grid);
  vec2 size = vec2(128.0,4096.0);
  float first = texture2D(uBoundary,(base+vec2(0.5,0.5))/size).r*96.0-16.0;
  float second = texture2D(uBoundary,(base+vec2(1.5,0.5))/size).r*96.0-16.0;
  float third = texture2D(uBoundary,(base+vec2(0.5,1.5))/size).r*96.0-16.0;
  float fourth = texture2D(uBoundary,(base+vec2(1.5,1.5))/size).r*96.0-16.0;
  distance = mix(mix(first,second,fraction.x),mix(third,fourth,fraction.x),fraction.y);
  float horizontal = mix(second-first,fourth-third,fraction.y);
  float vertical = mix(third-first,fourth-second,fraction.x);
  float lateralScale = coordinate.x>0.0 && coordinate.x<1.0 ? 127.0/640.0 : 0.0;
  float longitudinalScale = coordinate.y>0.0 && coordinate.y<1.0 ? -4095.0/18800.0 : 0.0;
  float centerDerivative = 0.585*cos((point.y-200.0)*0.0009)+0.651*cos((point.y-200.0)*0.0031);
  gradient = vec2(horizontal*lateralScale,-horizontal*lateralScale*centerDerivative+vertical*longitudinalScale);
}
`;
