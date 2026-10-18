(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_PHOTO=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  function hasAlpha(pixels){for(let i=3;i<pixels.length;i+=4)if(pixels[i]<255)return true;return false;}
  function encode(canvas){
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const alpha=hasAlpha(pixels);let result=alpha?canvas.toDataURL('image/png'):canvas.toDataURL('image/jpeg',.85);
    while(typeof result==='string'&&result.length>=1790000){const smaller=document.createElement('canvas');smaller.width=Math.max(1,Math.floor(canvas.width*.85));smaller.height=Math.max(1,Math.floor(canvas.height*.85));smaller.getContext('2d').drawImage(canvas,0,0,smaller.width,smaller.height);canvas=smaller;result=alpha?canvas.toDataURL('image/png'):canvas.toDataURL('image/jpeg',.85);}
    return result;
  }
  return{hasAlpha,encode};
});
