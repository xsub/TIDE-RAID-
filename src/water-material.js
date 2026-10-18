import * as THREE from 'three';
import {waveGLSL} from './waves.js';

export function createWaterMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uSwell;
      varying vec3 vWorld;
      ${waveGLSL}
      void main() {
        vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
        float height; vec2 slope;
        tideWave(world.xz, uTime, uSwell, height, slope);
        world.y = height;
        vWorld = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSwell;
      uniform float uFaceted;
      uniform vec2 uBoat;
      uniform float uHeading;
      uniform float uSpeed;
      varying vec3 vWorld;
      ${waveGLSL}
      vec2 surfaceNoise(vec2 point) {
        vec2 cell = floor(point); vec2 fraction = fract(point);
        vec2 blend = fraction * fraction * (3.0 - 2.0 * fraction);
        vec2 derivative = 6.0 * fraction * (1.0 - fraction);
        vec4 hash = fract(sin(vec4(dot(cell,vec2(127.1,311.7)),dot(cell+vec2(1.0,0.0),vec2(127.1,311.7)),dot(cell+vec2(0.0,1.0),vec2(127.1,311.7)),dot(cell+vec2(1.0),vec2(127.1,311.7)))) * 43758.5453);
        return vec2(mix(hash.y-hash.x,hash.w-hash.z,blend.y)*derivative.x,mix(hash.z-hash.x,hash.w-hash.y,blend.x)*derivative.y);
      }
      void main() {
        float height; vec2 slope;
        tideWave(vWorld.xz, uTime, uSwell, height, slope);
        vec2 point = vWorld.xz;
        float warp = sin(point.x * 0.19 + sin(point.y * 0.13)) * 1.8;
        float rippleA = dot(point, vec2(1.7, 0.8)) + warp + sin(point.y * 0.49 + uTime * 0.15) - uTime * 3.3;
        float rippleB = dot(point, vec2(-0.9, 2.2)) + sin(point.y * 0.23) * 1.2 + sin(point.x * 0.37) - uTime * 4.1;
        float microDetail = 1.0 - smoothstep(80.0, 350.0, distance(cameraPosition, vWorld));
        float rippleFootprint = max(length(dFdx(point)), length(dFdy(point)));
        float fineRipples = 1.0 - smoothstep(0.12, 0.45, rippleFootprint);
        slope += uSwell * microDetail * (surfaceNoise(point * 1.25 + vec2(uTime * 0.08, -uTime * 0.06)) * 0.085 + surfaceNoise(point * 3.8 + vec2(-uTime * 0.12, uTime * 0.08)) * 0.028 * fineRipples);
        vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
        if (uFaceted > 0.5) {
          vec3 face = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
          if (face.y < 0.0) face = -face;
          normal = normalize(mix(normal, face, 0.8));
        }
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        vec3 reflection = reflect(-viewDirection, normal);
        vec3 sunDirection = normalize(vec3(-0.58, 0.46, -0.67));
        float fresnel = 0.04 + 0.45 * pow(1.0 - max(dot(normal, viewDirection), 0.0), 4.0);
        float center = 650.0 * sin((point.y - 200.0) * 0.0009) + 210.0 * sin((point.y - 200.0) * 0.0031);
        float width = 200.0 + 30.0 * sin(point.y * 0.005) + 18.0 * sin(point.y * 0.013);
        float shore = width - abs(point.x - center);
        if (shore < -0.5) discard;
        float deep = smoothstep(0.0, 55.0, shore);
        vec3 waterColor = mix(vec3(0.065, 0.48, 0.35), vec3(0.012, 0.13, 0.17), deep);
        float caustic = pow(max(0.0, sin(rippleA * 0.3 + sin(rippleB * 0.25))), 12.0) * (1.0 - deep);
        waterColor += vec3(0.1, 0.21, 0.1) * caustic;
        vec3 sky = mix(vec3(0.87, 0.76, 0.6), vec3(0.16, 0.35, 0.54), pow(max(0.0,reflection.y),0.42));
        vec2 cloudPoint = reflection.xz / max(0.18, reflection.y) * 2.4 + vec2(uTime * 0.0017, uTime * 0.0006);
        float reflectedCloud = sin(cloudPoint.x + sin(cloudPoint.y * 1.7)) * sin(cloudPoint.y * 0.8 + sin(cloudPoint.x * 1.3));
        sky = mix(sky, vec3(0.82,0.85,0.83), smoothstep(0.1,0.7,reflectedCloud) * smoothstep(0.03,0.2,reflection.y) * 0.32);
        float glint = pow(max(dot(reflection, sunDirection), 0.0), mix(180.0,65.0,smoothstep(0.1,0.8,rippleFootprint)));
        float broadGlint = pow(max(dot(reflection, sunDirection), 0.0), 16.0);
        vec3 color = mix(waterColor, sky, fresnel) + vec3(1.0, 0.86, 0.59) * (glint * 0.7 + broadGlint * 0.1);
        float crest = smoothstep(0.17, 0.29, length(slope)) * smoothstep(0.65, 1.5, height) * 0.17;
        float shoreFoam = (1.0 - smoothstep(0.0, 4.0, shore)) * (0.45 + 0.3 * sin(point.y * 0.6 + uTime * 2.0));
        vec2 delta = point - uBoat;
        float aft = dot(delta, vec2(sin(uHeading), cos(uHeading)));
        float across = dot(delta, vec2(cos(uHeading), -sin(uHeading)));
        color *= 1.0 - exp(-across * across / 2.8 - aft * aft / 14.0) * 0.22;
        float wakeEdge = exp(-pow((abs(across) - aft * 0.24) * 1.7, 2.0));
        float wakeCenter = exp(-across * across / max(1.0, aft * 0.09));
        float wake = (wakeEdge * 0.7 + wakeCenter * 0.4) * smoothstep(2.0, 6.0, aft) * exp(-max(aft, 0.0) * 0.055) * clamp(uSpeed / 25.0, 0.0, 1.0);
        float foam = clamp(crest + shoreFoam + wake * (0.7 + 0.3 * sin(rippleB)), 0.0, 0.88);
        color = mix(color, vec3(0.83, 0.95, 0.9), foam);
        float fog = smoothstep(650.0, 1120.0, distance(cameraPosition, vWorld));
        color = mix(color, vec3(0.64, 0.69, 0.65), fog);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
