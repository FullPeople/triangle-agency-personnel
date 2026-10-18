'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../src/onboarding.js');
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
