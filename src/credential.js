(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_PASS=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function data(agent,catalog,ratings){
    const demerits=Math.max(0,Number(agent.resources?.demerits)||0);
    return {name:agent.name||'未命名特工',pronouns:agent.pronouns||'—',number:`TA / ${String(agent.number).padStart(4,'0')}`,title:agent.title||'见习生',rating:(ratings.find(row=>row.reprimands===demerits)||ratings[ratings.length-1])?.name||'评级良好',photo:agent.photo||'',arc:['a','r','c'].map(kind=>({kind,name:catalog[kind].find(entry=>entry.id===agent.arc[kind])?.name||'未选择'}))};
  }
  if(typeof document==='undefined')return{data};
  let active=null;
  const mark='<svg viewBox="0 0 60 54" aria-hidden="true"><use href="#mark"/></svg>';
  function markup(info){return `<div class="pass-environment" aria-hidden="true"><div class="pass-reticle"></div><div class="pass-orbit orbit-one"></div><div class="pass-orbit orbit-two"></div><span class="pass-cross cross-one">+</span><span class="pass-cross cross-two">+</span><div class="pass-register-lines"></div></div><div class="pass-caption"><span class="mono">PERSONNEL / ${escape(info.number)}</span><h2>特工通行证</h2></div><div class="pass-flight"><div class="pass-wire" aria-hidden="true"></div><div class="pass-card-tilt"><div class="pass-card-side pass-card-back">${mark}<span class="mono">TRIANGLE AGENCY</span></div><div class="pass-card-side pass-card-front"><div class="pass-card-grid" aria-hidden="true"></div><div class="pass-card-wedge" aria-hidden="true"></div><div class="pass-card-head"><div>${mark}<strong>三角机构</strong></div><span class="mono">FIELD AGENT</span></div><div class="pass-card-person"><div class="pass-card-name"><h3>${escape(info.name)}</h3><span>${escape(info.pronouns)}<i></i>${escape(info.title)}</span></div><div class="pass-card-photo ${/^data:image\/(png|webp)/.test(info.photo)?'has-alpha':''}">${info.photo?`<img src="${escape(info.photo)}" alt="特工照片">`:mark}</div></div><div class="pass-card-arc">${info.arc.map(entry=>`<div class="pass-arc-${entry.kind}"><b class="mono">${entry.kind.toUpperCase()}</b><span>${escape(entry.name)}</span></div>`).join('')}</div><div class="pass-card-foot"><span class="mono">${escape(info.number)}</span><strong>${escape(info.rating)}</strong><i class="pass-barcode" aria-hidden="true"></i></div><i class="pass-lamination" aria-hidden="true"></i></div><i class="pass-card-edge" aria-hidden="true"></i></div><div class="pass-scan" aria-hidden="true"></div></div><button class="pass-stow-prompt" aria-label="将特工通行证收纳进档案库">点击收纳 <span>↗</span></button>`;}
  function dispose(session,notify=false){
    if(active!==session)return;
    clearTimeout(session.timer);cancelAnimationFrame(session.frame);session.animation?.cancel();
    if(session.dialog.open)session.dialog.close();session.dialog.remove();active=null;
    if(session.target?.isConnected){session.target.classList.add('pass-received');session.target.focus({preventScroll:true});setTimeout(()=>session.target?.classList.remove('pass-received'),900);}
    else session.previousFocus?.focus?.({preventScroll:true});
    if(notify)session.onStore?.();
  }
  function stow(){
    const session=active;if(!session||session.phase==='stowing')return;
    session.phase='stowing';session.dialog.dataset.phase='stowing';clearTimeout(session.timer);
    if(!session.motion()){dispose(session,true);return;}
    const card=session.dialog.querySelector('.pass-flight'),from=card.getBoundingClientRect(),target=session.target?.getBoundingClientRect();
    const dx=target?target.x+target.width/2-(from.x+from.width/2):0,dy=target?target.y+target.height/2-(from.y+from.height/2):-innerHeight/2;
    session.animation=card.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(-50%,-50%) translate3d(${dx*.25}px,${dy*.12}px,0) scale(.91) rotate(-7deg)`,opacity:1,offset:.28},{transform:`translate(-50%,-50%) translate3d(${dx}px,${dy}px,0) scale(.035) rotate(16deg)`,opacity:.15}],{duration:820,easing:'cubic-bezier(.7,0,.25,1)',fill:'forwards'});
    session.animation.finished.then(()=>dispose(session,true),()=>{if(active===session)dispose(session,true);});
  }
  function present(info,{target,motion=()=>true,onStore}={}){
    if(active)dispose(active);
    const dialog=document.createElement('dialog');dialog.id='credential-issuance';dialog.className='credential-issuance';dialog.dataset.motionManaged='true';dialog.setAttribute('aria-label','特工通行证');dialog.innerHTML=markup(info);document.body.append(dialog);
    const session={dialog,target,onStore,motion,previousFocus:document.activeElement,phase:motion()?'generating':'ready',timer:0,frame:0};active=session;dialog.dataset.phase=session.phase;
    dialog.showModal();dialog.querySelector('.pass-stow-prompt').focus({preventScroll:true});
    const prompt=dialog.querySelector('.pass-stow-prompt');prompt.setAttribute('aria-disabled',String(session.phase!=='ready'));
    if(motion())session.timer=setTimeout(()=>{if(active!==session||session.phase!=='generating')return;session.phase='ready';dialog.dataset.phase='ready';prompt.setAttribute('aria-disabled','false');},1950);
    dialog.addEventListener('click',()=>{if(session.phase==='ready')stow();});
    dialog.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target===dialog){event.preventDefault();if(session.phase==='ready')stow();}});
    dialog.addEventListener('pointermove',event=>{if(session.phase!=='ready'||event.pointerType==='touch'||!motion())return;cancelAnimationFrame(session.frame);session.frame=requestAnimationFrame(()=>{dialog.style.setProperty('--pass-rx',`${-5-(event.clientY/innerHeight-.5)*8}deg`);dialog.style.setProperty('--pass-ry',`${-10+(event.clientX/innerWidth-.5)*16}deg`);});});
    dialog.addEventListener('pointerleave',()=>{dialog.style.removeProperty('--pass-rx');dialog.style.removeProperty('--pass-ry');});
    dialog.addEventListener('close',()=>{if(active===session)dispose(session);});
    return dialog;
  }
  return{data,present,stow};
});
