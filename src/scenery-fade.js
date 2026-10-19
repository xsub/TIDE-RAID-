import * as THREE from 'three';

export function sceneryFadeActive(preferences, mode) {
  return mode !== 'pilot' && preferences.sceneryFading === true && preferences.sceneryFadeAmount > 0;
}

export function sceneryFadeMask(preferences, mode) {
  if (mode === 'pilot' || !preferences.sceneryFading) return 0;
  return ((preferences.treeFadeAmount ?? preferences.sceneryFadeAmount) > 0 ? 1 : 0) | ((preferences.buildingFadeAmount ?? preferences.sceneryFadeAmount) > 0 ? 2 : 0);
}

export function smoothFadeValue(current, target, elapsed, rate = 12) {
  const duration = Number.isFinite(elapsed) ? Math.max(0, Math.min(0.1, elapsed)) : 0;
  return current + (target - current) * (1 - Math.exp(-rate * duration));
}

function createFadeChannel() {
  const eyes = Array.from({length: 4}, () => new THREE.Vector3());
  const boats = Array.from({length: 4}, () => new THREE.Vector3());
  const nextBoat = new THREE.Vector3();
  let initialized = false;
  const uniforms = {
    uFadeEye: {value: eyes[0]}, uFadeBoat: {value: boats[0]},
    uFadeEyes: {value: eyes}, uFadeBoats: {value: boats},
    uFadeRadius: {value: 6}, uFadeEnabled: {value: 0}, uFadeStrength: {value: 1},
  };
  const patched = new WeakSet();
  return {
    uniforms,
    update(eye, boat, enabled, beam = 3, amount = 1, elapsed = null, reset = false, speed = 1, fadeInSpeed = 1, fadeOutSpeed = 1) {
      const rateScale = Number.isFinite(speed) ? Math.max(0.25, Math.min(3, speed)) : 1;
      const restoreRate = rateScale * (Number.isFinite(fadeInSpeed) ? Math.max(0.25, Math.min(3, fadeInSpeed)) : 1);
      const hideRate = rateScale * (Number.isFinite(fadeOutSpeed) ? Math.max(0.25, Math.min(3, fadeOutSpeed)) : 1);
      nextBoat.set(boat.x, boat.y + 0.6, boat.z);
      const instant = !initialized || reset || elapsed === null;
      const strength = enabled ? (Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 1) : 0;
      const radius = Math.max(5, Math.min(14, beam * 1.5 + 2));
      for (let index = 0; index < 4; index++) {
        const blend = instant ? 1 : smoothFadeValue(0, 1, elapsed, 40 * (index < 2 ? hideRate : restoreRate) / (index + 1));
        eyes[index].lerp(eye, blend); boats[index].lerp(nextBoat, blend);
      }
      uniforms.uFadeRadius.value = instant ? radius : smoothFadeValue(uniforms.uFadeRadius.value, radius, elapsed, 12 * (radius > uniforms.uFadeRadius.value ? hideRate : restoreRate));
      uniforms.uFadeStrength.value = instant ? strength : smoothFadeValue(uniforms.uFadeStrength.value, strength, elapsed, strength > uniforms.uFadeStrength.value ? 14 * hideRate : 8 * restoreRate);
      if (strength === 0 && uniforms.uFadeStrength.value < 0.001) uniforms.uFadeStrength.value = 0;
      uniforms.uFadeEnabled.value = uniforms.uFadeStrength.value > 0 ? 1 : 0;
      initialized = true;
    },
    patch(material, masked = false) {
      if (patched.has(material)) return material;
      patched.add(material);
      const compile = material.onBeforeCompile;
      const cacheKey = material.customProgramCacheKey.bind(material);
      const previousKey = cacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        compile.call(material, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = `varying vec3 vFadeWorld; varying float vFadeMask; ${masked ? 'attribute float cameraFade;' : ''}\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vec4 fadePosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            fadePosition = instanceMatrix * fadePosition;
          #endif
          vFadeWorld = (modelMatrix * fadePosition).xyz;
          vFadeMask = ${masked ? 'cameraFade' : '1.0'};
        `);
        shader.fragmentShader = `varying vec3 vFadeWorld; varying float vFadeMask;
          uniform vec3 uFadeEyes[4]; uniform vec3 uFadeBoats[4]; uniform float uFadeRadius; uniform float uFadeEnabled; uniform float uFadeStrength;
          ${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (uFadeEnabled > 0.5 && vFadeMask > 0.5) {
            float fadeAmount = 0.0;
            for (int fadeIndex = 0; fadeIndex < 4; fadeIndex++) {
              vec3 fadeRay = uFadeBoats[fadeIndex] - uFadeEyes[fadeIndex];
              float fadeLength = max(length(fadeRay), 0.001);
              float fadeAlong = dot(vFadeWorld - uFadeEyes[fadeIndex], fadeRay) / (fadeLength * fadeLength);
              float fadeDistance = length(vFadeWorld - (uFadeEyes[fadeIndex] + clamp(fadeAlong, 0.0, 1.0) * fadeRay));
              float fadeCaps = smoothstep(0.0, 2.0, fadeAlong * fadeLength) * (1.0 - smoothstep(-2.0, 0.0, (fadeAlong - 1.0) * fadeLength));
              fadeAmount += (1.0 - smoothstep(uFadeRadius * 0.25, uFadeRadius, fadeDistance)) * fadeCaps * 0.24 * uFadeStrength;
            }
            float fadePattern = mod(dot(mod(floor(gl_FragCoord.xy), 4.0), vec2(1.0, 4.0)) * 5.0, 16.0) / 16.0;
            if (fadePattern < fadeAmount) discard;
          }
        `);
      };
      material.customProgramCacheKey = () => `${previousKey}-boat-cutaway-${masked ? 'masked' : 'tree'}-v2`;
      material.needsUpdate = true;
      return material;
    },
  };
}

export function createSceneryFade() {
  const trees = createFadeChannel(); const buildings = createFadeChannel();
  return {
    uniforms: trees.uniforms,
    buildingUniforms: buildings.uniforms,
    patch(material, masked = false) {return (masked ? buildings : trees).patch(material, masked);},
    update(eye, boat, enabled, beam = 3, amount = 1, elapsed = null, reset = false, speed = 1, fadeInSpeed = 1, fadeOutSpeed = 1, profiles = null) {
      trees.update(eye, boat, enabled, beam, profiles?.treeFadeAmount ?? amount, elapsed, reset, speed, profiles?.treeFadeInSpeed ?? fadeInSpeed, profiles?.treeFadeOutSpeed ?? fadeOutSpeed);
      buildings.update(eye, boat, enabled, beam, profiles?.buildingFadeAmount ?? amount, elapsed, reset, speed, profiles?.buildingFadeInSpeed ?? fadeInSpeed, profiles?.buildingFadeOutSpeed ?? fadeOutSpeed);
    },
  };
}
