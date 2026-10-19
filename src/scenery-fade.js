import * as THREE from 'three';

export function createSceneryFade() {
  const uniforms = {
    uFadeEye: {value: new THREE.Vector3()}, uFadeBoat: {value: new THREE.Vector3()},
    uFadeRadius: {value: 6}, uFadeEnabled: {value: 0},
  };
  const patched = new WeakSet();
  return {
    uniforms,
    update(eye, boat, enabled, beam = 3) {
      uniforms.uFadeEye.value.copy(eye);
      uniforms.uFadeBoat.value.set(boat.x, boat.y + 0.6, boat.z);
      uniforms.uFadeRadius.value = Math.max(5, Math.min(14, beam * 1.5 + 2));
      uniforms.uFadeEnabled.value = enabled ? 1 : 0;
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
          uniform vec3 uFadeEye; uniform vec3 uFadeBoat; uniform float uFadeRadius; uniform float uFadeEnabled;
          ${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (uFadeEnabled > 0.5 && vFadeMask > 0.5) {
            vec3 fadeRay = uFadeBoat - uFadeEye;
            float fadeAlong = dot(vFadeWorld - uFadeEye, fadeRay) / max(dot(fadeRay, fadeRay), 0.001);
            float fadeDistance = length(vFadeWorld - (uFadeEye + clamp(fadeAlong, 0.0, 1.0) * fadeRay));
            float fadeAmount = (1.0 - smoothstep(uFadeRadius * 0.35, uFadeRadius, fadeDistance)) * step(0.0, fadeAlong) * step(fadeAlong, 1.0) * 0.96;
            float fadePattern = mod(dot(mod(floor(gl_FragCoord.xy), 4.0), vec2(1.0, 4.0)) * 5.0, 16.0) / 16.0;
            if (fadePattern < fadeAmount) discard;
          }
        `);
      };
      material.customProgramCacheKey = () => `${previousKey}-boat-cutaway-${masked ? 'masked' : 'tree'}-v1`;
      material.needsUpdate = true;
      return material;
    },
  };
}
