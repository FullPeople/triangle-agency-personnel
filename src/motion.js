'use strict';
window.TA_MOTION=(()=>{
  const ease='cubic-bezier(.22,.82,.18,1)', jobs=new WeakMap(),navMemory=new Map(),navUpdates=new WeakMap(),closing=new WeakMap(),opening=new WeakMap();
  let preference=()=>true;
  const frameSelector='.editor-shell,.arc-edit-card,.panel,.credential,.resource-card,.ability-card,.read-arc-tile,.relationship-card,.qa-mini-grid>div,.roll-stat,.settlement-preview,.read-field,.play-namebar,.library-row,.choice-button,.arc-option,.quality-picker>button,.catalog-choice>button,.triple-options>button,.print-option,.reality-quick>button,.behavior-button,.primary-button,.outline-button,.dark-button,.ability-start';
  function decorate(root=document){
    root.querySelectorAll(frameSelector).forEach(frame=>{
      if(frame.closest('.motion-ghost,#print-root,.print-preview'))return;
      frame.classList.toggle('frame-major',frame.matches('.editor-shell,.panel,.arc-edit-card,.relationship-card,.play-namebar'));
      if(frame.querySelector(':scope>.frame-skin'))return;
      frame.classList.add('kinetic-frame');
      frame.classList.add(frame.matches('button')?'frame-action':'frame-info');
      if(frame.matches('.arc-option'))frame.classList.toggle('long-name',(frame.dataset.name||'').length>4);
      const skin=document.createElement('i');skin.className='frame-skin';skin.setAttribute('aria-hidden','true');
      skin.innerHTML='<i class="frame-fill"></i><i class="frame-glint"></i><i class="frame-notch"></i>';
      if(frame.matches('.editor-shell,.panel'))skin.innerHTML+='<svg class="frame-cap" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path/></svg>';
      frame.prepend(skin);
    });
  }
  const enabled=()=>preference()&&window.TA_COMPAT?.canAnimate()!==false;
  const stable=()=>window.TA_COMPAT?.stable()===true;
  function finishAnimation(animation,done){if(animation.finished?.then)animation.finished.then(done,done);else{animation.addEventListener('finish',done,{once:true});animation.addEventListener('cancel',done,{once:true});}}
  function replace(target,html,{animate=false,axis='x',direction=1,duration=620,sync=true}={}){
    const retained=target.querySelector(':scope > .motion-layer');
    if(!animate&&retained&&window.TA_LIVE){const next=document.createElement('div');next.className='motion-layer';next.innerHTML=html;window.TA_LIVE.patch(retained,next);if(sync)syncNavigation(target);return;}
    jobs.get(target)?.();
    const previous=target.querySelector(':scope > .motion-layer')||target;
    const ghost=document.createElement('div');
    if(animate&&enabled()&&target.childElementCount){
      ghost.className='motion-ghost';ghost.innerHTML=previous.innerHTML;ghost.inert=true;ghost.setAttribute('aria-hidden','true');
      const padding=getComputedStyle(target);Object.assign(ghost.style,{top:padding.paddingTop,left:padding.paddingLeft,width:`${target.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight)}px`});
      ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
      ghost.querySelectorAll('button,input,textarea,a').forEach(n=>{n.tabIndex=-1;n.removeAttribute('autofocus');});
    }
    const layer=document.createElement('div');layer.className='motion-layer';layer.innerHTML=html;
    window.TA_LIVE?.seed(layer);
    target.replaceChildren(layer);
    if(!ghost.childElementCount){if(sync)syncNavigation(target);return;}
    target.classList.add('motion-stage');target.append(ghost);
    const d=direction<0?-1:1,shift=(n)=>axis==='x'?`translate3d(${n*d}%,0,0)`:`translate3d(0,${n*d}%,0)`;
    const full='polygon(0% 0%,100% 0%,100% 100%,0% 100%)';
    const cut=axis==='x'?(d>0?'polygon(100% 0%,100% 0%,86% 100%,86% 100%)':'polygon(0% 0%,0% 0%,14% 100%,14% 100%)'):(d>0?'polygon(0% 100%,100% 86%,100% 100%,0% 100%)':'polygon(0% 0%,100% 0%,100% 14%,0% 0%)');
    const outgoing=ghost.animate([{transform:'translate3d(0,0,0)',opacity:1},{transform:shift(-12),opacity:0}],{duration:duration*.85,easing:ease,fill:'both'});
    const frames=stable()?[{transform:shift(9),opacity:.3},{transform:'translate3d(0,0,0)',opacity:1}]:[{transform:shift(15),clipPath:cut,opacity:.3},{transform:'translate3d(0,0,0)',clipPath:full,opacity:1}];
    const incoming=layer.animate(frames,{duration,easing:ease,fill:'both'});
    const slash=document.createElement('i');slash.className=`motion-slash ${axis==='y'?'vertical':''}`;slash.setAttribute('aria-hidden','true');target.append(slash);
    const stripe=slash.animate(axis==='x'?[{transform:`translateX(${-130*d}%) skewX(-16deg)`,opacity:0},{opacity:.7,offset:.22},{transform:`translateX(${550*d}%) skewX(-16deg)`,opacity:0}]:[{transform:`translateY(${-180*d}%) skewY(-7deg)`,opacity:0},{opacity:.7,offset:.22},{transform:`translateY(${650*d}%) skewY(-7deg)`,opacity:0}],{duration:duration*.95,easing:ease,fill:'both'});
    let done=false;const clean=()=>{if(done)return;done=true;ghost.remove();slash.remove();target.classList.remove('motion-stage');incoming.cancel();outgoing.cancel();stripe.cancel();jobs.delete(target);};
    jobs.set(target,clean);finishAnimation(incoming,clean);if(sync)syncNavigation(target);
  }
  function syncNavigation(scope=document,{fresh=true}={}){
    if(fresh)decorate(scope);
    scope.querySelectorAll('.print-preview').forEach(preview=>{
      const padding=getComputedStyle(preview),available=preview.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight);
      if(available>0)preview.querySelectorAll('.print-page-frame').forEach(frame=>{frame.style.zoom=String(Math.min(1,available/(210*96/25.4)));});
    });
    for(const [key,selector] of [['mode','.mode-tabs'],['edit','.section-nav'],['catalog','.catalog-tabs'],['catalog-view','.catalog-view-tabs'],['rules','.rule-tabs'],['settlement','.settlement-tabs']]){
      scope.querySelectorAll(selector).forEach(nav=>{
        const active=nav.querySelector('button.active');if(!active||!nav.clientWidth||nav.closest('.motion-ghost'))return;
        let rail=nav.querySelector(':scope>.nav-marker');const fresh=!rail;
        if(!rail){rail=document.createElement('i');rail.className='nav-marker';rail.setAttribute('aria-hidden','true');nav.prepend(rail);}
        const anchor=active.closest('.section-nav-item')||active;const next={x:anchor.offsetLeft,width:anchor.offsetWidth},revision=(navUpdates.get(nav)||0)+1;navUpdates.set(nav,revision);
        if(fresh){const old=navMemory.get(key)||next;rail.style.transition='none';rail.style.width=`${old.width}px`;rail.style.transform=`translate3d(${old.x}px,0,0)`;}
        const apply=()=>{if(navUpdates.get(nav)!==revision||nav.querySelector('button.active')!==active)return;rail.style.transition=enabled()?'':'none';rail.style.width=`${next.width}px`;rail.style.transform=`translate3d(${next.x}px,0,0)`;};
        if(fresh&&enabled())requestAnimationFrame(()=>requestAnimationFrame(apply));else apply();
        navMemory.set(key,next);
      });
    }
    if(fresh)window.TA_HOVER?.refresh(scope);
  }
  function reveal(dialog){
    closing.get(dialog)?.cancel();closing.delete(dialog);dialog.classList.remove('is-closing');
    if(dialog.open)return;
    opening.get(dialog)?.();
    dialog.dataset.motionManaged='true';
    const content=dialog.firstElementChild,animated=enabled()&&content;
    content?.classList.add('dialog-surface');
    if(animated)content.classList.add('dialog-opening','dialog-moving');
    dialog.showModal();syncNavigation(dialog,{fresh:false});if(!animated)return;
    let animation;
    const clean=()=>{if(opening.get(dialog)!==clean)return;opening.delete(dialog);content.classList.remove('dialog-opening','dialog-moving');animation?.cancel();};
    opening.set(dialog,clean);
    try{animation=content.animate([{opacity:stable()?1:.12,transform:'translate3d(5%,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:stable()?360:520,easing:ease,fill:'both'});content.classList.remove('dialog-opening');finishAnimation(animation,clean);}
    catch{clean();}
    if(!stable()&&!dialog.dataset.arcKind)stagger(dialog);
  }
  function close(dialog){
    if(!dialog?.open)return;if(closing.has(dialog))return;window.TA_SCROLL?.stop(dialog);opening.get(dialog)?.();
    if(!enabled()){dialog.close();return;}
    const content=dialog.firstElementChild||dialog;
    const animation=content.animate([{transform:'translate3d(0,0,0)',opacity:1},{transform:'translate3d(-4%,0,0)',opacity:0}],{duration:250,easing:ease,fill:'both'});
    dialog.classList.add('is-closing');closing.set(dialog,animation);finishAnimation(animation,()=>{if(closing.get(dialog)!==animation)return;closing.delete(dialog);dialog.close();dialog.classList.remove('is-closing');animation.cancel();});
  }
  function stagger(root){if(!enabled())return;Array.from(root.querySelectorAll('.modal-head,.settlement-hero,.settlement-tabs,.settlement-preview,.settlement-choice,.receipt-stamp,.receipt-row,.catalog-head,.catalog-list-area,.catalog-detail')).slice(0,12).forEach((n,i)=>n.animate([{transform:`translate3d(${i%2?-30:30}px,18px,0)`,opacity:0},{transform:'translate3d(0,0,0)',opacity:1}],{duration:460,delay:60+i*38,easing:ease,fill:'backwards'}));}
  function heading(n,direction=1){if(enabled())n.animate([{transform:`translate3d(${direction*50}px,0,0)`,clipPath:'polygon(100% 0%,100% 0%,84% 100%,84% 100%)'},{transform:'translate3d(0,0,0)',clipPath:'polygon(0% 0%,100% 0%,100% 100%,0% 100%)'}],{duration:600,easing:ease});}
  function stop(){window.TA_SCROLL?.stop();window.TA_HOVER?.stop();document.querySelectorAll('.motion-stage').forEach(n=>jobs.get(n)?.());(document.getAnimations?.()||[]).forEach(animation=>animation.cancel());syncNavigation();}

  const choiceKeys=['assessment','catalogFocus','end','triple','print','boon','rewardQuality','arcDetail','action'];
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!enabled())return;
    const key=choiceKeys.find(k=>b.dataset[k]!==undefined);if(!key||!b.matches('.choice-button,.arc-option,.print-option,.settlement-option,.triple-options button,.catalog-choice button,.quality-picker button'))return;
    const group=b.closest('.choice-grid,.catalog-grid,.print-options,.triple-options,.catalog-choice,.settlement-choice,.quality-picker');
    const old=group?.querySelector('button.active,button.focused');
    const from=(old||b).getBoundingClientRect(),value=b.dataset[key],subvalue=b.dataset.value;
    queueMicrotask(()=>{
      const current=Array.from(document.querySelectorAll('button')).find(n=>n.dataset[key]===value&&n.dataset.value===subvalue&&!n.closest('.motion-ghost'));
      if(!current)return;const to=current.getBoundingClientRect();if(!to.width||!to.height)return;
      const trace=document.createElement('i');trace.className='selection-streak';trace.setAttribute('aria-hidden','true');
      const localGroup=current.closest('.catalog-grid');
      const origin=localGroup?.getBoundingClientRect()||{left:0,top:0};
      if(localGroup)trace.classList.add('catalog-selection-underlay');
      Object.assign(trace.style,{left:`${to.left-origin.left}px`,top:`${to.top-origin.top}px`,width:`${to.width}px`,height:`${to.height}px`});
      const dialog=current.closest('dialog');(localGroup||dialog||document.body).append(trace);
      const animation=trace.animate([{transform:`translate3d(${from.left-to.left}px,${from.top-to.top}px,0) scale(${from.width/to.width},${from.height/to.height})`,opacity:.44},{opacity:.26,offset:.72},{transform:'translate3d(0,0,0) scale(1,1)',opacity:0}],{duration:430,easing:ease,fill:'both'});
      finishAnimation(animation,()=>trace.remove());current.animate([{translate:'-9px 0'},{translate:'0 0'}],{duration:440,easing:ease});
    });
  },true);
  addEventListener('resize',()=>requestAnimationFrame(()=>syncNavigation()),{passive:true});
  document.addEventListener('cancel',event=>{if(event.target.matches('dialog')){event.preventDefault();if(event.target.id==='credential-issuance'){window.TA_PASS?.stow();return;}close(event.target);}},true);
  addEventListener('beforeprint',()=>{document.querySelectorAll('.motion-ghost,.motion-slash,.selection-streak').forEach(n=>n.remove());});
  return{decorate,replace,reveal,close,syncNavigation,stagger,heading,stop,enabled,setPreference:fn=>{preference=fn;}};
})();
