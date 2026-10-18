'use strict';
window.TA_LAYOUT=(()=>{
  let host,board,observer,frame;
  function fit(){
    const next=document.querySelector('.operations-viewport');
    if(next!==host){observer?.disconnect();host=next;board=host?.querySelector('.operations-board');if(!host)return;if(typeof ResizeObserver==='function'){observer=new ResizeObserver(schedule);observer.observe(host);observer.observe(board);}}
    if(!host||!board)return;
    const width=host.clientWidth;if(!width)return;
    const base=Math.max(800,width),scale=Math.min(1,width/base);
    for(const [name,value] of [['--operations-width',`${base}px`],['--operations-scale',String(scale)]])if(board.style.getPropertyValue(name)!==value)board.style.setProperty(name,value);
    host.dataset.scaled=String(scale<1);
    if(!window.CSS?.supports('zoom','1')){board.style.transform=`scale(${scale})`;host.style.height=`${board.scrollHeight*scale}px`;}
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}
  addEventListener('resize',schedule,{passive:true});
  return{fit};
})();
