import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export function createCinema(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.12, 0.55, 1.8);
  composer.addPass(bloom);
  const grade = new ShaderPass({uniforms: {tDiffuse: {value: null}},
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){
        vec3 color = texture2D(tDiffuse,vUv).rgb;
        float luminance = dot(color,vec3(0.2126,0.7152,0.0722));
        color = mix(vec3(luminance),color,1.07);
        color *= mix(vec3(0.96,1.005,1.025),vec3(1.025,1.01,0.98),smoothstep(0.05,1.0,luminance));
        vec2 corner = (vUv - 0.5) * 1.1;
        color *= 1.0 - dot(corner,corner) * 0.14;
        gl_FragColor=vec4(max(color,0.0),1.0);
      }`,
  });
  composer.addPass(grade); composer.addPass(new OutputPass());
  return {
    render(enabled) {if (enabled) composer.render(); else renderer.render(scene, camera);},
    resize(width, height) {composer.setSize(width, height);},
  };
}
