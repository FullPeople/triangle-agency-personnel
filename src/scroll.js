(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_SCROLL=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function createAxis(position=0){let value=position,target=position,edge=0;return{
    reset(next){value=target=next;edge=0;},
    push(delta,max){const next=target+delta;target=clamp(next,0,max);edge=clamp(edge+(next-target)*.18,-30,30);},
    step(ms,max){target=clamp(target,0,max);value=clamp(target+(value-target)*Math.exp(-Math.min(ms,64)/62),0,max);edge*=Math.exp(-Math.min(ms,64)/105);if(Math.abs(value-target)<.15)value=target;if(Math.abs(edge)<.1)edge=0;return{position:value,edge,active:value!==target||edge!==0};},
    get target(){return target;}
  };}
  if(typeof document==='undefined')return{createAxis,clamp};
  const sessions=new Map();let raf=0,last=0,touch=null;
  const enabled=()=>window.TA_MOTION?.enabled()!==false;
  const root=()=>document.scrollingElement;
  function owner(node,axis='y'){for(let n=node?.nodeType===1?node:node?.parentElement;n;n=n.parentElement){if(n===document.body||n===document.documentElement)return root();const style=getComputedStyle(n),overflow=axis==='y'?style.overflowY:style.overflowX,max=axis==='y'?n.scrollHeight-n.clientHeight:n.scrollWidth-n.clientWidth;if(/auto|scroll/.test(overflow)&&max>1)return n;if(n.matches('dialog'))return null;}return root();}
  const max=(node,axis)=>Math.max(0,axis==='y'?node.scrollHeight-node.clientHeight:node.scrollWidth-node.clientWidth);
  function visual(node){return node===root()?document.querySelector('main'):node.querySelector(':scope > .catalog-pane,:scope > .motion-layer,:scope > .sheet-body')||node;}
  function clear(session){session.visual.style.removeProperty('translate');session.node.removeAttribute('data-scroll-state');sessions.delete(session.node);}
  function stop(node){for(const session of sessions.values())if(!node||session.node===node||node.contains?.(session.node))clear(session);if(!sessions.size){cancelAnimationFrame(raf);raf=0;}}
  function sessionFor(node){let session=sessions.get(node);if(!session){session={node,x:createAxis(node.scrollLeft),y:createAxis(node.scrollTop),visual:visual(node)};sessions.set(node,session);}return session;}
  function paint(session,x,y){session.node.scrollTo({left:x.position,top:y.position,behavior:'instant'});session.visual.style.translate=`${-x.edge}px ${-y.edge}px`;session.node.dataset.scrollState=x.edge||y.edge?'elastic':'inertia';}
  function frame(now){raf=0;const dt=last?now-last:16.7;last=now;for(const session of sessions.values()){if(!session.node.isConnected||!enabled()||document.hidden){clear(session);continue;}const x=session.x.step(dt,max(session.node,'x')),y=session.y.step(dt,max(session.node,'y'));paint(session,x,y);if(!x.active&&!y.active)clear(session);}if(sessions.size)raf=requestAnimationFrame(frame);else last=0;}
  function wake(){if(!raf){last=0;raf=requestAnimationFrame(frame);}}
  document.addEventListener('wheel',event=>{if(!enabled()||event.ctrlKey||event.defaultPrevented)return;const axis=Math.abs(event.deltaX)>Math.abs(event.deltaY)?'x':'y',node=owner(event.target,axis);if(!node||max(node,axis)<1)return;window.TA_CATALOG?.cancel();const unit=event.deltaMode===1?18:event.deltaMode===2?(axis==='y'?node.clientHeight:node.clientWidth)*.85:1;const delta=clamp((axis==='y'?event.deltaY:event.deltaX)*unit,-700,700);if(!delta)return;event.preventDefault();const session=sessionFor(node);session[axis].push(delta,max(node,axis));wake();},{passive:false});
  document.addEventListener('pointerdown',event=>{stop();if(event.pointerType==='touch'&&event.isPrimary){const node=owner(event.target);if(node)touch={node,y:event.clientY};}},{passive:true,capture:true});
  document.addEventListener('pointermove',event=>{if(!touch||event.pointerType!=='touch'||!enabled())return;const delta=touch.y-event.clientY;touch.y=event.clientY;const node=touch.node;if((node.scrollTop<=0&&delta<0)||(node.scrollTop>=max(node,'y')-1&&delta>0)){window.TA_CATALOG?.cancel();const session=sessionFor(node);session.y.reset(node.scrollTop);session.y.push(delta*1.3,max(node,'y'));wake();}},{passive:true});
  const release=()=>{touch=null;};document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});
  document.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ','Escape','Tab'].includes(event.key))stop();},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('blur',()=>stop());addEventListener('beforeprint',()=>stop());
  return{createAxis,clamp,stop};
});
