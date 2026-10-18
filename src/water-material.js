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
      void main() {
        float height; vec2 slope;
        tideWave(vWorld.xz, uTime, uSwell, height, slope);
        vec2 point = vWorld.xz;
        float warp = sin(point.x * 0.19 + sin(point.y * 0.13)) * 1.8;
        float rippleA = dot(point, vec2(1.7, 0.8)) + warp - uTime * 3.3;
        float rippleB = dot(point, vec2(-0.9, 2.2)) + sin(point.y * 0.23) * 1.2 - uTime * 4.1;
        float rippleC = dot(point, vec2(4.1, 1.6)) + warp * 0.8 - uTime * 5.8;
        float microDetail = 1.0 - smoothstep(80.0, 350.0, distance(cameraPosition, vWorld));
        slope += uSwell * microDetail * (vec2(1.7, 0.8) * cos(rippleA) * 0.045 + vec2(-0.9, 2.2) * cos(rippleB) * 0.03 + vec2(4.1, 1.6) * cos(rippleC) * 0.012);
        vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
        if (uFaceted > 0.5) {
          vec3 face = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
          if (face.y < 0.0) face = -face;
          normal = normalize(mix(normal, face, 0.8));
        }
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        vec3 reflection = reflect(-viewDirection, normal);
        vec3 sunDirection = normalize(vec3(-0.6, 0.8, -0.3));
        float fresnel = 0.04 + 0.45 * pow(1.0 - max(dot(normal, viewDirection), 0.0), 4.0);
        float center = 650.0 * sin((point.y - 200.0) * 0.0009) + 210.0 * sin((point.y - 200.0) * 0.0031);
        float width = 200.0 + 30.0 * sin(point.y * 0.005) + 18.0 * sin(point.y * 0.013);
        float shore = width - abs(point.x - center);
        if (shore < -0.5) discard;
        float deep = smoothstep(0.0, 55.0, shore);
        vec3 waterColor = mix(vec3(0.10, 0.61, 0.49), vec3(0.012, 0.19, 0.24), deep);
        float caustic = pow(max(0.0, sin(rippleA * 0.3 + sin(rippleB * 0.25))), 12.0) * (1.0 - deep);
        waterColor += vec3(0.1, 0.21, 0.1) * caustic;
        vec3 sky = mix(vec3(0.7, 0.82, 0.78), vec3(0.16, 0.4, 0.57), smoothstep(0.0, 1.0, reflection.y));
        float glint = pow(max(dot(reflection, sunDirection), 0.0), 180.0);
        float broadGlint = pow(max(dot(reflection, sunDirection), 0.0), 16.0);
        vec3 color = mix(waterColor, sky, fresnel) + vec3(1.0, 0.86, 0.59) * (glint * 0.7 + broadGlint * 0.1);
        float crest = smoothstep(0.14, 0.24, length(slope)) * smoothstep(0.5, 1.2, height) * 0.4;
        float shoreFoam = (1.0 - smoothstep(0.0, 4.0, shore)) * (0.45 + 0.3 * sin(point.y * 0.6 + uTime * 2.0));
        vec2 delta = point - uBoat;
        float aft = dot(delta, vec2(sin(uHeading), cos(uHeading)));
        float across = dot(delta, vec2(cos(uHeading), -sin(uHeading)));
        float wakeEdge = exp(-pow((abs(across) - aft * 0.24) * 1.7, 2.0));
        float wakeCenter = exp(-across * across / max(1.0, aft * 0.09));
        float wake = (wakeEdge * 0.7 + wakeCenter * 0.4) * smoothstep(2.0, 6.0, aft) * exp(-max(aft, 0.0) * 0.055) * clamp(uSpeed / 25.0, 0.0, 1.0);
        float foam = clamp(crest + shoreFoam + wake * (0.7 + 0.3 * sin(rippleB)), 0.0, 0.88);
        color = mix(color, vec3(0.83, 0.95, 0.9), foam);
        float fog = smoothstep(650.0, 1120.0, distance(cameraPosition, vWorld));
        color = mix(color, vec3(0.54, 0.72, 0.76), fog);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
