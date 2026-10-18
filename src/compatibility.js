(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_COMPAT=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  function profile({userAgent='',width=1280,coarse=false,animations=true}={}){
    const embedded=/MicroMessenger|\bQQ\/|MQQBrowser|UCBrowser|Quark|baiduboxapp/i.test(userAgent);
    const mobile=coarse||width<=650||/Android|iPhone|iPad|iPod/i.test(userAgent);
    const chromium=/Chrome\/|Chromium\/|Edg\//i.test(userAgent);
    return {embedded,mobile,stable:embedded||mobile||!chromium||!animations};
  }
  if(typeof document==='undefined')return{profile};
  const canAnimate=()=>typeof Element!=='undefined'&&typeof Element.prototype.animate==='function';
  let current,viewportFrame=0;
  function update(){
    viewportFrame=0;current=profile({userAgent:navigator.userAgent,width:innerWidth,coarse:matchMedia('(pointer:coarse)').matches,animations:canAnimate()});
    document.documentElement.classList.toggle('stable-rendering',current.stable);
    document.documentElement.classList.toggle('embedded-browser',current.embedded);
    const height=Math.round(window.visualViewport?.height||innerHeight);
    document.documentElement.style.setProperty('--ta-viewport-height',`${height}px`);
  }
  function schedule(){if(!viewportFrame)viewportFrame=requestAnimationFrame(update);}
  update();addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  const dialogsChanged=()=>document.body.classList.toggle('modal-open',Boolean(document.querySelector('dialog[open]')));
  new MutationObserver(dialogsChanged).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});dialogsChanged();
  return{profile,canAnimate,stable:()=>current.stable};
});
