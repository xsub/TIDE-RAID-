import * as THREE from 'three';
const cache=new Map();
const fract=(value)=>value-Math.floor(value);
function noise(x,y,frequency) {
  const cellX=Math.floor(x*frequency);const cellY=Math.floor(y*frequency);
  let blendX=fract(x*frequency);let blendY=fract(y*frequency);
  blendX=blendX*blendX*(3-2*blendX);blendY=blendY*blendY*(3-2*blendY);
  const hash=(horizontal,vertical)=>fract(Math.sin(((horizontal+frequency)%frequency)*127.1+((vertical+frequency)%frequency)*311.7)*43758.5453);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(cellX,cellY),hash(cellX+1,cellY),blendX),THREE.MathUtils.lerp(hash(cellX,cellY+1),hash(cellX+1,cellY+1),blendX),blendY);
}
function texture(data,size,color=false) {
  const result=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  result.wrapS=result.wrapT=THREE.RepeatWrapping;
  result.magFilter=THREE.LinearFilter;result.minFilter=THREE.LinearMipmapLinearFilter;
  result.generateMipmaps=true;result.colorSpace=color ? THREE.SRGBColorSpace : THREE.NoColorSpace;result.needsUpdate=true;
  return result;
}
export function surfaceTextures(kind) {
  const key=`surface-${kind}`;if(cache.has(key))return cache.get(key);
  const size=256;const albedo=new Uint8Array(size*size*4);const detail=new Uint8Array(size*size*4);
  const palette=({rock:[155,151,139],sand:[203,188,153],grass:[123,137,90],bark:[148,127,101]})[kind];
  for(let row=0;row<size;row++)for(let column=0;column<size;column++) {
    const x=column/size;const y=row/size;
    const large=noise(x,y,4);const medium=noise(x,y,16);const fine=noise(x,y,64);
    const grain=fract(Math.sin(column*12.9898+row*78.233)*43758.5453);
    let height=large*0.45+medium*0.35+fine*0.2;
    if(kind==='bark')height=0.5+0.3*Math.sin((x*16+noise(x,y,8)*0.3)*Math.PI*2)+fine*0.2;
    if(kind==='rock')height=height*0.8+Math.abs(medium-0.5)*0.4;
    const shade=0.66+height*0.52+(grain-0.5)*0.11;
    const offset=(row*size+column)*4;
    for(let channel=0;channel<3;channel++)albedo[offset+channel]=Math.round(Math.min(255,palette[channel]*shade));
    albedo[offset+3]=255;
    detail[offset]=Math.round(THREE.MathUtils.clamp(height,0,1)*255);
    detail[offset+1]=Math.round((kind==='rock' ? 0.65+fine*0.3 : 0.85+fine*0.15)*255);
    detail[offset+2]=0;detail[offset+3]=255;
  }
  const result={map:texture(albedo,size,true),detail:texture(detail,size)};
  cache.set(key,result);return result;
}

export function foliageTexture(pine=false) {
  const key=pine ? 'needles' : 'leaves';if(cache.has(key))return cache.get(key);
  const size=128;const data=new Uint8Array(size*size*4);
  const leaves=Array.from({length:pine ? 70 : 32},(unused,index)=>{
    const fraction=(index+1)/(pine ? 71 : 33);const side=index%2 ? -1 : 1;
    return {x:0.5+side*(0.08+0.2*Math.sin(fraction*Math.PI)),y:0.08+fraction*0.8,rx:pine ? 0.12 : 0.11,ry:pine ? 0.028 : 0.065,angle:side*(pine ? -0.5 : 0.65),shade:fract(Math.sin(index*73.1)*437.5)};
  });
  for(let row=0;row<size;row++)for(let column=0;column<size;column++) {
    const x=column/(size-1);const y=row/(size-1);let alpha=0;let shade=0.4;
    if(Math.abs(x-0.5)<0.012 && y>0.04 && y<0.96)alpha=1;
    for(const leaf of leaves) {
      const dx=x-leaf.x;const dy=y-leaf.y;
      const lateral=(dx*Math.cos(leaf.angle)-dy*Math.sin(leaf.angle))/leaf.rx;
      const vertical=(dx*Math.sin(leaf.angle)+dy*Math.cos(leaf.angle))/leaf.ry;
      const radius=lateral*lateral+vertical*vertical;
      if(radius<1){alpha=Math.max(alpha,Math.min(1,(1-radius)*12));shade=0.55+leaf.shade*0.4-Math.abs(vertical)*0.18;}
    }
    const offset=(row*size+column)*4;
    data[offset]=Math.round((pine ? 110 : 130)*shade);data[offset+1]=Math.round((pine ? 145 : 160)*shade);data[offset+2]=Math.round((pine ? 95 : 88)*shade);data[offset+3]=Math.round(alpha*255);
  }
  const result=texture(data,size,true);cache.set(key,result);return result;
}

export function foliageCrown(pine=false) {
  const positions=[];const coordinates=[];const indices=[];const clusters=pine ? 84 : 88;
  for(let index=0;index<clusters;index++) {
    const angle=index*2.399963;
    const fraction=(index+0.5)/clusters;
    const fullness=0.3+0.7*fract(Math.sin(index*17.3)*437.5);
    const radius=(pine ? 4.6*Math.pow(1-fraction,0.7) : 4.4*Math.sqrt(1-(fraction*2-1)**2))*fullness;
    const centerX=Math.cos(angle)*radius;const centerZ=Math.sin(angle)*radius;
    const centerY=pine ? 5.5+fraction*12.5 : 6.5+fraction*8;
    const width=pine ? 4.2*(1-fraction*0.65) : 3.6;
    const height=pine ? 3.3 : 3.4;
    for(const [side,up] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      positions.push(centerX+Math.cos(angle)*side*width/2+Math.sin(angle)*up*height*0.12,centerY+up*height/2,centerZ+Math.sin(angle)*side*width/2-Math.cos(angle)*up*height*0.12);
      coordinates.push((side+1)/2,(up+1)/2);
    }
    const base=index*4;indices.push(base,base+1,base+2,base+1,base+3,base+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(coordinates,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
