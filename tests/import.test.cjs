'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const I=require('../src/import.js'),E=require('../src/engine.js'),S=require('../src/storage.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/rules.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.TA_RULES));
const fixture=fs.readFileSync(path.join(__dirname,'session-review.json'),'utf8');
const file=(name,text=fixture)=>({name,size:Buffer.byteLength(text),text:async()=>text});

test('file import preserves persona, photo, resources, relationships and existing source data',async()=>{
  const raw=JSON.parse(fixture),before=JSON.stringify(raw),a=await I.readFile(file('档案.JSON'),E,D.catalog),b=E.sanitizeAgent(raw.agent,D.catalog,1);
  assert.deepEqual(a,b);assert.equal(JSON.stringify(raw),before);assert.equal(a.name,raw.agent.name);assert.equal(a.photo,raw.agent.photo);assert.deepEqual(a.resources,b.resources);assert.deepEqual(a.relationships,b.relationships);
});
test('modern mission details and growth ledger survive the shared import path',async()=>{
  const a=E.createAgent();for(const k of ['a','r','c'])a.arc[k]=D.catalog[k][0].id;
  E.finishQuickMission(a,{chaos:3},{name:'导入回归',commendations:2,award:'none'},D.play.commendationsAndReprimands.missionSettlement,D.tracks);
  const entry=E.startGrowth(a,'c',{},D.tracks);E.log(a,'投入职能时间',{upgradeId:entry.id});
  const restored=await I.readFile(file('角色.json',S.serialize(a)),E,D.catalog);
  assert.deepEqual(restored.missionHistory,a.missionHistory.map(row=>({...row,legacy:false})));assert.deepEqual(restored.growthLedger,a.growthLedger);assert.deepEqual(restored.log,a.log);
});
test('UTF-8 BOM and the previous personnel export remain supported',async()=>{
  assert.equal(I.parse('\uFEFF'+fixture,E,D.catalog).name,JSON.parse(fixture).agent.name);
  const legacy={format:'triangle-agency-personnel',version:1,agent:{name:'旧版档案'}};
  assert.equal((await I.readFile(file('旧版.json',JSON.stringify(legacy)),E,D.catalog)).name,'旧版档案');
});
test('unrelated JSON, malformed agent objects, empty and oversized files are rejected before mutation',async()=>{
  for(const text of ['{','null','[]','{}','{"format":"triangle-agency-workbench","version":2}','{"format":"triangle-agency-workbench","version":2,"agent":[]}','{"format":"other","version":2,"agent":{}}'])await assert.rejects(I.readFile(file('invalid.json',text),E,D.catalog));
  await assert.rejects(I.readFile(file('photo.png'),E,D.catalog),/file/);
  await assert.rejects(I.readFile(file('empty.json',''),E,D.catalog),/file/);
  let read=false;await assert.rejects(I.readFile({name:'large.json',size:I.MAX_BYTES+1,text:async()=>{read=true;return fixture;}},E,D.catalog),/large/);assert.equal(read,false);
});
test('older WebViews can read through FileReader when File.text is unavailable',async()=>{
  const old=global.FileReader;global.FileReader=class{readAsText(){this.result=fixture;this.onload();}};
  try{assert.equal((await I.readFile({name:'角色.json',size:10},E,D.catalog)).name,JSON.parse(fixture).agent.name);}finally{global.FileReader=old;}
});

function harness(){
  class Node{constructor(){this.listeners={};this.parent=null;this.classes=new Set();this.attrs={};this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),contains:name=>this.classes.has(name)};}addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}removeEventListener(name,fn){this.listeners[name]=this.listeners[name].filter(x=>x!==fn);}emit(name,event={}){event.defaultPrevented=false;event.preventDefault=()=>event.defaultPrevented=true;for(const fn of this.listeners[name]||[])fn(event);return event;}setAttribute(name,value){this.attrs[name]=value;}append(node){node.parent=this;}}
  const doc=new Node(),win=new Node(),indicator=new Node(),calls=[],dialogs=[];doc.body=new Node();doc.querySelectorAll=()=>dialogs;win.innerWidth=1280;win.innerHeight=900;
  const api=I.attach({document:doc,window:win,indicator,onFiles:files=>calls.push(files)}),transfer={types:['Files'],files:[],dropEffect:'none'};
  return{doc,win,indicator,calls,dialogs,api,transfer,emit(name,extra={}){return doc.emit(name,{dataTransfer:transfer,clientX:100,clientY:100,...extra});},shown:()=>indicator.classes.has('is-visible')};
}
test('external file dragging reveals a copy target and drop delivers every file exactly once',()=>{
  const h=harness();assert.equal(h.emit('dragenter').defaultPrevented,true);assert.equal(h.shown(),true);assert.equal(h.indicator.attrs['aria-hidden'],'false');
  assert.equal(h.emit('dragover').defaultPrevented,true);assert.equal(h.transfer.dropEffect,'copy');const files=[file('one.json'),file('two.json')];h.transfer.files=files;
  assert.equal(h.emit('drop').defaultPrevented,true);assert.deepEqual(h.calls,[files]);assert.equal(h.shown(),false);assert.equal(h.doc.body.classes.has('is-file-drag'),false);
});
test('dragging text, links or internal controls never activates file import or suppresses their defaults',()=>{
  const h=harness(),dataTransfer={types:['text/plain','text/uri-list'],items:[{kind:'string'}],files:[]};
  for(const name of ['dragenter','dragover','drop'])assert.equal(h.emit(name,{dataTransfer}).defaultPrevented,false);
  assert.equal(h.shown(),false);assert.equal(h.calls.length,0);
});
test('nested dragenter/dragleave events keep the indicator steady until the page is left',()=>{
  const h=harness();h.emit('dragenter');h.emit('dragenter');h.emit('dragleave',{relatedTarget:{}});assert.equal(h.shown(),true);h.emit('dragleave',{relatedTarget:{}});assert.equal(h.shown(),false);
  h.emit('dragenter');h.emit('dragenter');h.emit('dragleave',{clientX:0,relatedTarget:null});assert.equal(h.shown(),false);
});
test('Escape, cancelled drags, window blur and hiding the document clear the target without importing',()=>{
  for(const reason of ['escape','dragend','blur','hidden']){const h=harness();h.emit('dragenter');if(reason==='escape')h.doc.emit('keydown',{key:'Escape'});if(reason==='dragend')h.doc.emit('dragend');if(reason==='blur')h.win.emit('blur');if(reason==='hidden'){h.doc.hidden=true;h.doc.emit('visibilitychange');}assert.equal(h.shown(),false,reason);assert.equal(h.calls.length,0,reason);}
});
test('an open archive modal hosts the drop indicator above its backdrop',()=>{
  const h=harness(),dialog={append:node=>node.parent=dialog};h.dialogs.push(dialog);h.emit('dragover');assert.equal(h.indicator.parent,dialog);h.api.reset();h.dialogs.length=0;h.emit('dragenter');assert.equal(h.indicator.parent,h.doc.body);
});
test('empty file drops cannot import anything; file items also work before browser exposes the file list',()=>{
  const h=harness();h.emit('dragover',{dataTransfer:{types:[],items:[{kind:'file'}],files:[]}});assert.equal(h.shown(),true);h.emit('drop');assert.equal(h.calls.length,0);assert.equal(h.shown(),false);
});
test('detaching the controller removes all drag interception and presentation state',()=>{
  const h=harness();h.emit('dragenter');h.api.detach();assert.equal(h.shown(),false);assert.equal(h.emit('dragenter').defaultPrevented,false);h.transfer.files=[file('one.json')];h.emit('drop');assert.equal(h.calls.length,0);
});
