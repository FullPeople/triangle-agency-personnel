(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_HOVER=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  function coordinate(value,size){return (String(value).replace(/calc\(|\)|\s/g,'').match(/[+-]?(?:\d*\.)?\d+(?:%|px)?/g)||[]).reduce((sum,term)=>sum+parseFloat(term)*(term.endsWith('%')?size/100:1),0);}
  function polygon(value,width,height){if(!String(value).startsWith('polygon('))return [];return value.slice(8,-1).split(',').map(point=>{const terms=point.match(/calc\([^)]*\)|[+-]?(?:\d*\.)?\d+(?:%|px)?/g)||[];return[coordinate(terms[0],width),coordinate(terms[1],height)];});}
  if(typeof document==='undefined')return{coordinate,polygon};
  const roots='.kinetic-frame,.field,.counter button,.icon-button,.prompt-card,.questionnaire-item,.mode-tabs button,.section-nav button,.catalog-tabs button,.catalog-view-tabs button,.rule-tabs button,.settlement-tabs button';
  const names=new Set(['plate-morph','plate-sweep','edge-travel','number-pulse','index-wobble','letter-drift','control-rock','field-scan','tab-drift','ribbon-morph','glyph-roam']);
  const values=['transform','translate','rotate','scale','opacity','clipPath','backgroundColor','color','width','filter'];
  const states=new WeakMap(),active=new Set();let ticking=false,keyboard=false;
  const enabled=()=>window.TA_MOTION?.enabled()!==false;
  function owner(animation){const n=animation.effect?.target,name=animation.animationName;if(!n)return null;
    if(['plate-morph','plate-sweep','edge-travel'].includes(name))return n.closest('.kinetic-frame');
    if(name==='index-wobble')return n.closest('.ability-card,.prompt-card,.questionnaire-item');
    if(name==='number-pulse')return n.closest('.resource-card');
    if(name==='letter-drift')return n.closest('.read-arc-tile');
    if(name==='field-scan')return n.closest('.field');
    if(['ribbon-morph','glyph-roam'].includes(name))return n.closest('.arc-option');
    return n.matches(roots)?n:null;
  }
  function loops(root){return (root.getAnimations?.({subtree:true})||[]).filter(a=>a.effect&&names.has(a.animationName)&&owner(a)===root);}
  function snapshot(n,pseudo){const style=getComputedStyle(n,pseudo||null);return Object.fromEntries(values.map(key=>[key,style[key]]));}
  function cap(root,state){const skin=root.querySelector(':scope>.frame-skin'),svg=skin?.querySelector(':scope>.frame-cap');if(!svg)return;
    const width=skin.clientWidth,height=skin.clientHeight,points=polygon(getComputedStyle(skin).clipPath,width,height);if(points.length<2)return;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);const path=svg.firstElementChild,[a,b]=points;
    path.setAttribute('d',`M${a[0]},${a[1]} L${b[0]},${b[1]}`);
    let length=74;
    if(state?.returns?.length){const p=Math.max(0,Math.min(1,(state.returns[0].animation.currentTime||0)/420));length=state.capLength+(74-state.capLength)*p;}
    else if(state?.engaged){const t=(performance.now()-state.started)/4800;length=74+22*(1-Math.cos(t*Math.PI*2))/2;state.capLength=length;}
    path.style.strokeDasharray=`${length} ${Math.max(100,width*2)}`;
  }
  function tick(){ticking=false;for(const root of active){const state=states.get(root);if(!root.isConnected){if(state)state.token++;state?.returns?.forEach(x=>x.animation.cancel());active.delete(root);continue;}cap(root,state);if(!state.engaged&&!state.returns?.length)active.delete(root);}if(active.size){ticking=true;requestAnimationFrame(tick);}}
  function wake(root){active.add(root);if(!ticking){ticking=true;requestAnimationFrame(tick);}}
  function endReturn(root,state,token){if(state.token!==token)return;const records=state.returns||[];records.forEach(x=>x.node.classList.remove('motion-exit'));
    if(state.engaged){root.classList.add('motion-hover');const resumed=loops(root);for(const a of resumed){const old=state.saved.find(x=>x.name===a.animationName&&x.node===a.effect.target&&x.pseudo===(a.effect.pseudoElement||''));if(old)a.currentTime=old.time;}state.started=performance.now()-(state.saved.find(x=>x.name==='plate-morph')?.time||0);}
    records.forEach(x=>x.animation.cancel());state.returns=[];root.dataset.hoverState=state.engaged?'active':'rest';cap(root,state);wake(root);
  }
  function enter(root){if(!enabled())return;let state=states.get(root);if(!state){state={engaged:false,returns:[],saved:[],started:performance.now(),capLength:74,token:0};states.set(root,state);}if(state.engaged)return;
    state.engaged=true;root.classList.add('motion-hover');
    if(state.returns.length){root.dataset.hoverState='entering';state.returns.forEach(x=>{if(x.animation.playbackRate>0)x.animation.reverse();});}
    else{state.started=performance.now();root.dataset.hoverState='active';}
    wake(root);
  }
  function leave(root){const state=states.get(root);if(!state?.engaged)return;state.engaged=false;
    if(state.returns.length){root.classList.remove('motion-hover');root.dataset.hoverState='returning';state.returns.forEach(x=>{x.animation.updatePlaybackRate(Math.abs(x.animation.playbackRate)||1);x.animation.play();});return;}
    const animations=loops(root),groups=[];state.saved=animations.map(a=>({name:a.animationName,node:a.effect.target,pseudo:a.effect.pseudoElement||'',time:a.currentTime||0}));
    for(const a of animations){const node=a.effect.target,pseudo=a.effect.pseudoElement||'';if(!groups.some(g=>g.node===node&&g.pseudo===pseudo))groups.push({node,pseudo,from:snapshot(node,pseudo)});}
    root.classList.remove('motion-hover');groups.forEach(g=>g.node.classList.add('motion-exit'));
    state.returns=groups.map(g=>{const to=snapshot(g.node,g.pseudo),options={duration:420,easing:'cubic-bezier(.22,.82,.18,1)',fill:'both'};if(g.pseudo)options.pseudoElement=g.pseudo;return{...g,animation:g.node.animate([g.from,to],options)};});
    root.dataset.hoverState=state.returns.length?'returning':'rest';const token=++state.token;Promise.allSettled(state.returns.map(x=>x.animation.finished)).then(()=>endReturn(root,state,token));wake(root);
  }
  function sync(root){if(root.matches(':hover')||(keyboard&&root.matches(':focus-within')))enter(root);else leave(root);}
  function refresh(scope=document,{resize=false}={}){scope.querySelectorAll(roots).forEach(root=>{if(root.closest('.motion-ghost,#print-root,.print-preview,.export-stage'))return;const fresh=!root.dataset.hoverBound;if(fresh){root.dataset.hoverBound='true';root.addEventListener('pointerenter',()=>enter(root));root.addEventListener('pointerleave',()=>{if(!keyboard||!root.matches(':focus-within'))leave(root);});root.addEventListener('focusin',()=>{if(keyboard)enter(root);});root.addEventListener('focusout',()=>queueMicrotask(()=>sync(root)));}if(fresh||resize)cap(root,states.get(root));if(fresh&&root.matches(':hover'))enter(root);});}
  function stop(){for(const root of active){const state=states.get(root);if(state){state.token++;state.returns.forEach(x=>{x.animation.cancel();x.node.classList.remove('motion-exit');});state.returns=[];state.engaged=false;}root.classList.remove('motion-hover');root.dataset.hoverState='rest';cap(root,state);}active.clear();}
  document.addEventListener('keydown',e=>{if(e.key==='Tab'){keyboard=true;document.body.classList.add('keyboard-nav');}},true);
  document.addEventListener('pointerdown',()=>{keyboard=false;document.body.classList.remove('keyboard-nav');for(const root of active)if(!root.matches(':hover'))leave(root);},true);
  addEventListener('resize',()=>refresh(document,{resize:true}));
  return{refresh,stop,coordinate,polygon};
});
