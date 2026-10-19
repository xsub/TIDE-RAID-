import * as THREE from 'three';

export function frontField(x, z, time, wind = 0.2, angle = Math.PI / 4, enabled = true) {
  const speed = 6 + Math.max(0, Math.min(1, wind)) * 12;
  const along = x * Math.cos(angle) + z * Math.sin(angle);
  const offset = time * speed - 500;
  const center = offset + Math.round((along - offset) / 2400) * 2400;
  const distance = along - center;
  const fraction = Math.max(0, 1 - Math.abs(distance) / 300);
  return {x: x - distance * Math.cos(angle), z: z - distance * Math.sin(angle), distance, speed,
    strength: enabled ? fraction * fraction * (3 - 2 * fraction) : 0};
}

export function createWeatherFront(scene) {
  const group = new THREE.Group(); group.name = 'Moving coastal squall'; group.visible = false; scene.add(group);
  const uniforms = {uFrontTime: {value: 0}, uFrontDay: {value: 1}};
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2400, 150), new THREE.ShaderMaterial({uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vFrontUv;varying vec3 vFrontWorld;void main(){vFrontUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vFrontWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader: `varying vec2 vFrontUv;varying vec3 vFrontWorld;uniform float uFrontTime;uniform float uFrontDay;
    void main(){float bands=0.45+0.35*sin(vFrontUv.x*83.0+sin(vFrontUv.x*23.0)*2.0);float streaks=0.8+0.2*sin(vFrontUv.x*1700.0+vFrontUv.y*20.0+uFrontTime*24.0);
    float edge=pow(max(0.0,sin(vFrontUv.x*3.14159)),0.4)*(1.0-smoothstep(0.65,1.0,vFrontUv.y));float haze=exp(-distance(cameraPosition,vFrontWorld)/1500.0);
    gl_FragColor=vec4(mix(vec3(0.06,0.09,0.14),vec3(0.3,0.37,0.41),uFrontDay),bands*streaks*edge*haze*0.55);}`,
  })); curtain.position.y = 75; group.add(curtain);
  const cloudMaterial = new THREE.MeshStandardMaterial({color: 0x58636b, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false});
  cloudMaterial.onBeforeCompile = (shader) => {shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a*=pow(abs(dot(normalize(vNormal),normalize(vViewPosition))),0.7);\n#include <alphatest_fragment>');};
  cloudMaterial.customProgramCacheKey = () => 'soft-squall-cloud-v1';
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 12), cloudMaterial, 3);
  const transform = new THREE.Object3D();
  for (let index = 0; index < 3; index++) {transform.position.set((index - 1) * 720, 150 + index % 2 * 12, 0); transform.scale.set(510, 45, 140); transform.updateMatrix(); clouds.setMatrixAt(index, transform.matrix);}
  clouds.computeBoundingSphere(); group.add(clouds);
  return {update(weather, time, underwater = 0) {
    group.visible = Boolean(weather.frontEnabled && underwater < 0.01);
    if (!group.visible) return;
    uniforms.uFrontTime.value = time; uniforms.uFrontDay.value = weather.daylight;
    group.position.set(weather.frontX, 0, weather.frontZ); group.rotation.y = -weather.windAngle - Math.PI / 2;
  }};
}
