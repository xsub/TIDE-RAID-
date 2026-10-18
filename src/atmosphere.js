import * as THREE from 'three';
import {weatherState} from './weather.js';

export const SUN_DIRECTION = new THREE.Vector3(-0.58, 0.46, -0.67).normalize();

export function createAtmosphere(scene, renderer) {
  const uniforms = {uTime: {value: 0}, uSun: {value: SUN_DIRECTION.clone()}, uDay: {value: 1}, uCloud: {value: 0.15}, uWind: {value: new THREE.Vector2(0.0017, 0.0006)}};
  const material = new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: `varying vec3 vDirection; void main() {vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);}`,
    fragmentShader: `
      varying vec3 vDirection; uniform float uTime; uniform vec3 uSun; uniform float uDay; uniform float uCloud; uniform vec2 uWind;
      float hash(vec2 point) {return fract(sin(dot(point, vec2(127.1,311.7))) * 43758.5453);}
      float noise(vec2 point) {
        vec2 cell = floor(point); vec2 blend = fract(point); blend = blend * blend * (3.0 - 2.0 * blend);
        return mix(mix(hash(cell), hash(cell + vec2(1.0,0.0)), blend.x), mix(hash(cell + vec2(0.0,1.0)), hash(cell + 1.0), blend.x), blend.y);
      }
      void main() {
        vec3 direction = normalize(vDirection);
        float altitude = max(0.0, direction.y);
        vec3 sky = mix(vec3(0.67,0.75,0.79), vec3(0.16,0.35,0.54), pow(altitude, 0.42));
        float sun = max(0.0, dot(direction, uSun));
        sky += vec3(1.0,0.64,0.3) * pow(sun, 18.0) * 0.24;
        sky += vec3(4.0,3.2,2.1) * smoothstep(0.99965,0.9999,sun);
        vec2 point = direction.xz / max(0.12, altitude) * 2.4 + uTime * uWind;
        float cloud = noise(point) * 0.57 + noise(point * 2.1) * 0.28 + noise(point * 4.3) * 0.15;
        cloud = smoothstep(0.65-uCloud*0.4,0.85-uCloud*0.32,cloud) * smoothstep(0.03,0.19,altitude);
        sky = mix(sky, mix(vec3(0.65,0.69,0.72),vec3(1.0,0.92,0.8), pow(sun, 4.0)), cloud * 0.78);
        if (direction.y < 0.0) sky = mix(vec3(0.42,0.51,0.45), sky, exp(direction.y * 8.0));
        sky *= 1.0-uCloud*0.25;
        vec3 nightSky = mix(vec3(0.035,0.055,0.095),vec3(0.004,0.012,0.035),altitude);
        float stars = step(0.998,hash(floor(direction.xz/max(0.1,altitude)*350.0)))*smoothstep(0.1,0.4,altitude)*(1.0-uCloud);
        sky = mix(nightSky+vec3(stars*0.65),sky,uDay);
        gl_FragColor = vec4(sky,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), material);
  sky.frustumCulled = false; sky.renderOrder = -100;
  const environmentScene = new THREE.Scene();
  environmentScene.add(sky.clone());
  const generator = new THREE.PMREMGenerator(renderer);
  scene.environment = generator.fromScene(environmentScene, 0.04, 0.1, 2000).texture;
  generator.dispose();
  scene.add(sky);
  scene.fog = new THREE.Fog(0x9eafb5, 600, 1120);
  const dayFog = new THREE.Color(0x9eafb5); const nightFog = new THREE.Color(0x081321); const submergedFog = new THREE.Color(0x064b59);
  return {update(time, camera, weather = weatherState(), underwater = 0) {
    uniforms.uTime.value = time; sky.position.copy(camera.position);
    uniforms.uDay.value = weather.daylight; uniforms.uCloud.value = weather.cloud;
    uniforms.uSun.value.set(-0.58, Math.max(0.05, weather.elevation), -0.67).normalize();
    uniforms.uWind.value.set(Math.cos(weather.windAngle), Math.sin(weather.windAngle)).multiplyScalar(0.0005 + weather.wind * 0.008);
    scene.environmentIntensity = 0.14 + weather.daylight * (0.86 - weather.cloud * 0.3);
    scene.fog.color.copy(nightFog).lerp(dayFog, weather.daylight);
    scene.fog.near = weather.rain ? 180 : 600; scene.fog.far = weather.rain ? 750 : 1120;
    sky.visible = underwater < 0.5;
    scene.background = underwater >= 0.5 ? submergedFog : null;
    scene.fog.color.lerp(submergedFog, underwater);
    scene.fog.near += (0.5 - scene.fog.near) * underwater;
    scene.fog.far += (20 - scene.fog.far) * underwater;
    scene.environmentIntensity *= 1 - underwater * 0.7;
  }};
}
