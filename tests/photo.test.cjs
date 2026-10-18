const test=require('node:test'),assert=require('node:assert/strict'),P=require('../src/photo.js');
test('alpha detection preserves cutouts and semitransparent pixels, while opaque images remain compact JPEG',()=>{
 const opaque=new Uint8ClampedArray([0,0,0,255,255,255,255,255]);assert.equal(P.hasAlpha(opaque),false);
 for(const alpha of [0,1,127,254])assert.equal(P.hasAlpha(new Uint8ClampedArray([255,128,64,alpha])),true);
 const canvas=alpha=>({width:1,height:1,getContext:()=>({getImageData:()=>({data:[40,60,80,alpha]})}),toDataURL:(type,quality)=>({type,quality})});
 assert.deepEqual(P.encode(canvas(255)),{type:'image/jpeg',quality:.85});assert.deepEqual(P.encode(canvas(254)),{type:'image/png',quality:undefined});
});
