'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');

// Exercise browser animation fill timing without depending on wall-clock sleeps.
function harness({stable=false,canAnimate=true,finishedPromise=true,live=false}={}){
  let time=0;
  const animations=[],elements=[],hoverScopes=[];
  class Element {
    constructor(){
      this.children=[];this.style={};this.dataset={};this.clientWidth=500;this._html='';this.className='';this.open=false;
      this.classList={add:(...c)=>{this.className+=' '+c.join(' ');},remove:(...c)=>{this.className=this.className.split(' ').filter(x=>!c.includes(x)).join(' ');},contains:c=>this.className.split(' ').includes(c)};
      elements.push(this);
    }
    set innerHTML(value){this._html=value;this.children=value?[{innerHTML:value,parent:this}]:[];}
    get innerHTML(){return this._html;}
    get childElementCount(){return this.children.length;}
    get firstElementChild(){return this.children[0]||null;}
    showModal(){this.preparedBeforeOpen=this.firstElementChild?.classList.contains('dialog-opening');this.managedBeforeOpen=this.dataset.motionManaged==='true';this.open=true;}
    close(){this.open=false;}
    querySelector(selector){return selector===':scope > .motion-layer'?this.children.find(n=>n.className==='motion-layer')||null:null;}
    querySelectorAll(){return [];}
    setAttribute(){}
    append(node){node.parent=this;this.children.push(node);}
    replaceChildren(node){this.children.forEach(n=>{n.parent=null;});this.children=[];this.append(node);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
    animate(frames,options){
      const animation={element:this,frames,options,start:time,cancelled:false};
      const listeners={};animation.addEventListener=(name,fn)=>(listeners[name]??=[]).push(fn);
      if(finishedPromise)animation.finished=new Promise(resolve=>{animation.resolve=resolve;});
      else animation.resolve=()=>listeners.finish?.forEach(fn=>fn());
      animation.cancel=()=>{animation.cancelled=true;animation.resolve();};
      animations.push(animation);return animation;
    }
  }
  const document={querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){}};
  const context={window:{TA_HOVER:{refresh:scope=>hoverScopes.push(scope)},TA_COMPAT:{stable:()=>stable,canAnimate:()=>canAnimate}},document,getComputedStyle:()=>({paddingTop:'0px',paddingLeft:'0px',paddingRight:'0px'}),addEventListener(){},requestAnimationFrame(){},queueMicrotask};
  if(live)context.window.TA_LIVE={seed(){},patch:(current,next)=>{current._html=next.innerHTML;}};
  vm.runInNewContext(readFileSync(join(__dirname,'../src/motion.js'),'utf8'),context);
  const target=new Element();target.innerHTML='<p>Previous scene</p>';
  const advance=async next=>{
    time=next;
    animations.forEach(a=>{if(!a.cancelled&&time-a.start>=a.options.duration)a.resolve();});
    await Promise.resolve();await Promise.resolve();
  };
  const opacity=animation=>{
    const progress=(time-animation.start)/animation.options.duration;
    if(animation.cancelled)return 1;
    if(progress>=1)return ['both','forwards'].includes(animation.options.fill)?animation.frames.at(-1).opacity:1;
    return animation.frames[1].opacity;
  };
  const dialog=new Element(),content=new Element();dialog.dataset.arcKind='a';dialog.append(content);
  return{motion:context.window.TA_MOTION,target,animations,elements,advance,opacity,hoverScopes,dialog,content};
}

test('the red transition slash stays invisible after its shorter animation and until scene cleanup',async()=>{
  const h=harness();
  h.motion.replace(h.target,'<p>Next scene</p>',{animate:true});
  const stripe=h.animations.find(a=>a.element.className.startsWith('motion-slash'));
  await h.advance(150);
  assert.ok(h.opacity(stripe)>0,'the slash is visible while crossing the scene');
  await h.advance(600); // Slash ends at 589 ms; incoming scene ends at 620 ms.
  assert.ok(stripe.element.parent,'the element still awaits scene cleanup');
  assert.equal(h.opacity(stripe),0,'the finished slash must not return to its visible base style');
  await h.advance(625);
  assert.equal(stripe.element.parent,null);
  assert.equal(h.target.children.length,1);
});

test('a rapid reverse switch removes the earlier slash and leaves no tail artifacts',async()=>{
  const h=harness();
  h.motion.replace(h.target,'<p>Forward</p>',{animate:true,direction:1});
  const old=h.animations.find(a=>a.element.className.startsWith('motion-slash'));
  await h.advance(200);
  h.motion.replace(h.target,'<p>Back</p>',{animate:true,direction:-1});
  assert.equal(old.element.parent,null);
  const current=h.animations.filter(a=>a.element.className.startsWith('motion-slash')).at(-1);
  await h.advance(800);
  assert.equal(h.opacity(current),0);
  await h.advance(825);
  assert.equal(h.target.children.length,1);
  assert.equal(h.elements.filter(n=>n.parent&&n.className.startsWith('motion-slash')).length,0);
});

test('nested replacements can batch decoration and update only the changed subtree',()=>{
  const h=harness();h.motion.replace(h.target,'<p>New chapter</p>',{sync:false});
  assert.equal(h.hoverScopes.length,0,'a batched child replacement must not scan the document');
  h.motion.syncNavigation(h.target);assert.deepEqual(h.hoverScopes,[h.target]);
  h.motion.replace(h.target,'<p>Another chapter</p>');assert.equal(h.hoverScopes.at(-1),h.target);
});

test('modal content is prepared before showModal and the native surface never transforms',async()=>{
  const h=harness({stable:true});h.motion.reveal(h.dialog);
  assert.equal(h.dialog.managedBeforeOpen,true);assert.equal(h.dialog.preparedBeforeOpen,true);assert.equal(h.dialog.open,true);
  assert.equal(h.animations.length,1);assert.equal(h.animations[0].element,h.content);
  assert.equal(h.animations[0].frames.some(frame=>'clipPath' in frame),false);
  await h.advance(370);assert.equal(h.content.classList.contains('dialog-moving'),false);assert.equal(h.content.classList.contains('dialog-opening'),false);
});
test('closing during entry and immediately reopening cannot finish an obsolete close',async()=>{
  const h=harness({stable:true});h.motion.reveal(h.dialog);await h.advance(80);h.motion.close(h.dialog);
  assert.equal(h.content.classList.contains('dialog-moving'),false);h.motion.reveal(h.dialog);await h.advance(600);
  assert.equal(h.dialog.open,true);assert.equal(h.dialog.classList.contains('is-closing'),false);
  h.motion.close(h.dialog);await h.advance(900);assert.equal(h.dialog.open,false);
});
test('stable page changes retain movement without animating large clip paths',()=>{
  const h=harness({stable:true});h.motion.replace(h.target,'<p>Next</p>',{animate:true});
  const incoming=h.animations.find(a=>a.element.className==='motion-layer');assert.ok(incoming);
  assert.equal(incoming.frames.some(frame=>'clipPath' in frame),false);
});
test('missing Web Animations support still opens and closes readable content',()=>{
  const h=harness({stable:true,canAnimate:false});h.motion.reveal(h.dialog);assert.equal(h.dialog.open,true);
  assert.equal(h.content.classList.contains('dialog-opening'),false);assert.equal(h.animations.length,0);
  h.motion.close(h.dialog);assert.equal(h.dialog.open,false);
});
test('older animation objects without a finished promise still clean up dialog entry and exit',async()=>{
  const h=harness({stable:true,finishedPromise:false});h.motion.reveal(h.dialog);await h.advance(400);
  assert.equal(h.content.classList.contains('dialog-moving'),false);h.motion.close(h.dialog);await h.advance(700);assert.equal(h.dialog.open,false);
});
test('a value refresh during scene entry retains its layer and does not cancel the transition',async()=>{
  const h=harness({live:true});h.motion.replace(h.target,'<output>1</output>',{animate:true});
  const layer=h.target.querySelector(':scope > .motion-layer'),entry=h.animations.find(a=>a.element===layer);
  await h.advance(200);h.motion.replace(h.target,'<output>2</output>');
  assert.equal(h.target.querySelector(':scope > .motion-layer'),layer);assert.equal(entry.cancelled,false);
  assert.equal(layer.innerHTML,'<output>2</output>');assert.equal(h.animations.length,3);
  await h.advance(625);assert.equal(h.target.children.length,1);assert.equal(h.target.children[0],layer);
});
