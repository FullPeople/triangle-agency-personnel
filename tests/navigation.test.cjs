'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness(){
 const frames=[],buttons={edit:{offsetLeft:0,offsetWidth:90,closest:()=>null},play:{offsetLeft:110,offsetWidth:90,closest:()=>null}};let active=buttons.edit,rail=null;
 const nav={clientWidth:300,closest:()=>null,querySelector:s=>s==='button.active'?active:rail,prepend:node=>rail=node};
 const scope={querySelectorAll:s=>s==='.mode-tabs'?[nav]:[]};
 const doc={querySelectorAll:scope.querySelectorAll,addEventListener(){},createElement:()=>({style:{},setAttribute(){}})};
 const ctx={window:{TA_COMPAT:{canAnimate:()=>true}},document:doc,requestAnimationFrame:fn=>frames.push(fn),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/motion.js'),'utf8'),ctx);
 return{sync:()=>ctx.window.TA_MOTION.syncNavigation(scope,{fresh:false}),select:key=>active=buttons[key],rail:()=>rail,flush(){const batch=frames.splice(0);batch.forEach(fn=>fn());}};
}
test('a delayed initial edit marker cannot override the later play selection',()=>{
 const h=harness();h.sync();h.select('play');h.sync();assert.equal(h.rail().style.transform,'translate3d(110px,0,0)');h.flush();h.flush();assert.equal(h.rail().style.transform,'translate3d(110px,0,0)');
});
test('the first marker is placed directly under the actual initial selected page',()=>{
 const h=harness();h.select('play');h.sync();assert.equal(h.rail().style.transform,'translate3d(110px,0,0)');h.flush();h.flush();assert.equal(h.rail().style.transform,'translate3d(110px,0,0)');h.select('edit');h.sync();assert.equal(h.rail().style.transform,'translate3d(0px,0,0)');
});
