import * as THREE from 'three';

export function organicRock(segments=16,rings=10) {
  const geometry=new THREE.SphereGeometry(1,segments,rings);
  const positions=geometry.attributes.position;
  for(let index=0;index<positions.count;index++) {
    const x=positions.getX(index);const y=positions.getY(index);const z=positions.getZ(index);
    const shape=1+0.12*Math.sin(x*4.1+z*2.7)*Math.cos(y*3.4)+0.055*Math.sin(z*8.3-y*2.9);
    positions.setXYZ(index,x*shape,y*shape,z*shape);
  }
  geometry.computeVertexNormals();return geometry;
}

export function organicPine() {
  const positions=[];const indices=[];
  const segments=16;const rings=16;
  for(let ring=0;ring<=rings;ring++) {
    const fraction=ring/rings;
    const height=5+fraction*14;
    const envelope=Math.sin(Math.min(1,fraction/0.15)*Math.PI/2)*Math.pow(1-fraction,0.65);
    const tier=0.78+0.22*Math.cos(fraction*Math.PI*10);
    for(let segment=0;segment<=segments;segment++) {
      const angle=segment/segments*Math.PI*2;
      const radius=5.5*envelope*tier*(1+0.11*Math.sin(angle*5+fraction*9)+0.06*Math.sin(angle*3-fraction*4));
      positions.push(Math.cos(angle)*radius,height,Math.sin(angle)*radius);
      if(ring<rings && segment<segments) {
        const base=ring*(segments+1)+segment;
        indices.push(base,base+segments+1,base+1,base+1,base+segments+1,base+segments+2);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function sandyShore() {
  const segments=64;const radii=[0,0.4,0.7,0.86,1,1.06];const heights=[1.6,1.55,1.45,1.1,0.05,-1.4];
  const positions=[];const indices=[];
  for(let ring=0;ring<radii.length;ring++)for(let segment=0;segment<=segments;segment++) {
    const angle=segment/segments*Math.PI*2;
    positions.push(Math.cos(angle)*radii[ring],heights[ring],Math.sin(angle)*radii[ring]);
    if(ring<radii.length-1 && segment<segments) {
      const base=ring*(segments+1)+segment;
      indices.push(base,base+1,base+segments+1,base+1,base+segments+2,base+segments+1);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function naturalMaterial(options,scale=1) {
  const material=new THREE.MeshStandardMaterial({...options,flatShading:false});
  material.onBeforeCompile=(shader)=>{
    shader.vertexShader=`varying vec3 vNaturalWorld;\n${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 naturalPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        naturalPosition=instanceMatrix*naturalPosition;
      #endif
      vNaturalWorld=(modelMatrix*naturalPosition).xyz;
    `);
    shader.fragmentShader=`varying vec3 vNaturalWorld;
      float naturalHash(vec2 point){return fract(sin(dot(point,vec2(127.1,311.7)))*43758.5453);}
      float naturalNoise(vec2 point){vec2 cell=floor(point);vec2 blend=fract(point);blend=blend*blend*(3.0-2.0*blend);return mix(mix(naturalHash(cell),naturalHash(cell+vec2(1.0,0.0)),blend.x),mix(naturalHash(cell+vec2(0.0,1.0)),naturalHash(cell+vec2(1.0)),blend.x),blend.y);}
      ${shader.fragmentShader}`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 surfacePoint=(vNaturalWorld.xz+vNaturalWorld.y*vec2(0.47,0.63))*${scale.toFixed(3)};
      float surfaceVariation=naturalNoise(surfacePoint*0.28);
      float grain=naturalNoise(surfacePoint*3.0);
      float detailFade=1.0-smoothstep(0.08,0.6,max(length(dFdx(surfacePoint)),length(dFdy(surfacePoint))));
      diffuseColor.rgb*=mix(0.76,1.08,surfaceVariation)*(1.0+(grain-0.5)*0.18*detailFade);
    `);
  };
  material.customProgramCacheKey=()=>`natural-surface-${scale}`;
  return material;
}
