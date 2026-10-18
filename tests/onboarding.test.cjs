'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../src/onboarding.js');
test('the commendation aside and apology are consecutive separate dialogue steps',()=>{
 const index=T.STEPS.findIndex(step=>step.id==='aside');
 assert.match(T.STEPS[index].text,/嘉奖/);assert.doesNotMatch(T.STEPS[index].text,/走神/);
 assert.equal(T.STEPS[index+1].text,'噢，不好意思，我走神了。');
});
test('the guide follows a moving target after opening and stops tracking on finish',async()=>{
 const {parseHTML}=require('linkedom');const {document}=parseHTML('<html><body><button id="target"></button><div id="tour"></div></body></html>');
 const pending=new Map();let serial=0,x=280;const target=document.querySelector('#target'),root=document.querySelector('#tour');
 target.getBoundingClientRect=()=>({left:x,top:20,right:x+34,bottom:54,width:34,height:34});
 const win={innerWidth:390,innerHeight:844,requestAnimationFrame:fn=>{pending.set(++serial,fn);return serial;},cancelAnimationFrame:id=>pending.delete(id),addEventListener(){},MutationObserver:class{observe(){}}};
 const guide=T.mount({document,window:win,root,resolveTarget:name=>name==='library'?target:null});guide.start();await Promise.resolve();
 while(root.dataset.step!=='library'){root.querySelector('.tour-next').click();await Promise.resolve();}
 assert.equal(root.querySelector('.tour-focus').style.left,'273px');assert.equal(pending.size,1);
 x=215;const [id,tick]=pending.entries().next().value;pending.delete(id);tick();
 assert.equal(root.querySelector('.tour-focus').style.left,'208px');assert.equal(pending.size,1);
 guide.finish();assert.equal(pending.size,0);assert.equal(root.hidden,true);
});
test('the tutorial cannot pass the archive prompt until the real archive action is acknowledged',()=>{
 const s=T.createSession();s.start();while(s.current().id!=='library')assert.equal(s.next(),true);const at=s.index();assert.equal(s.canNext(),false);assert.equal(s.next(),false);assert.equal(s.index(),at);s.acknowledge('export');assert.equal(s.canNext(),false);s.acknowledge('library');assert.equal(s.canNext(),true);assert.equal(s.next(),true);assert.equal(s.current().id,'create');
});
test('backtracking retains a fulfilled step; a replay starts a new gate and can be skipped cleanly',()=>{
 const s=T.createSession();s.start();while(s.current().id!=='library')s.next();s.acknowledge('library');s.next();s.back();assert.equal(s.canNext(),true);s.start();while(s.current().id!=='library')s.next();assert.equal(s.canNext(),false);s.stop();assert.equal(s.active(),false);assert.equal(s.next(),false);
});
test('the final line completes exactly once and the supplied local-storage and export guidance is present',()=>{
 const s=T.createSession();s.start();while(s.index()<T.STEPS.length-1){s.acknowledge(s.current().id);s.next();}assert.equal(s.active(),true);assert.equal(s.next(),true);assert.equal(s.active(),false);assert.equal(s.next(),false);assert.ok(T.STEPS.some(x=>x.text.includes('本地浏览器')));assert.ok(T.STEPS.some(x=>x.text.includes('JSON')));assert.ok(T.STEPS.some(x=>x.target==='settings'));
});
test('the four blockers leave the requested control clickable without covering it',()=>{
 const r={left:300,top:20,right:340,bottom:55},areas=T.veil(r,390,844),inside={x:320,y:35};
 assert.equal(areas.length,4);for(const b of areas){assert.ok(b.width>=0&&b.height>=0);assert.equal(inside.x>=b.left&&inside.x<b.left+b.width&&inside.y>=b.top&&inside.y<b.top+b.height,false);}assert.deepEqual(T.veil(null,390,844),[{left:0,top:0,width:390,height:844}]);
});
test('offscreen targets cannot generate negative blocker geometry on compact viewports',()=>{
 for(const rect of [{left:-80,right:-10,top:-30,bottom:-10},{left:400,right:500,top:900,bottom:960}])for(const b of T.veil(rect,320,640)){assert.ok(b.left>=0&&b.left<=320);assert.ok(b.top>=0&&b.top<=640);assert.ok(b.width>=0&&b.height>=0);}
});
