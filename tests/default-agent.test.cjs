'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('../src/engine.js'),S=require('../src/storage.js'),A=require('../src/default-agent.js'),V=require('../src/mission-view.js');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/rules.js'),'utf8'),ctx);const D=JSON.parse(JSON.stringify(ctx.window.TA_RULES));
test('a fresh installation opens the supplied completed Laifu character with its own task history and photo',()=>{
 const files=A.initialFiles([],E,D.catalog);assert.equal(files.length,1);const a=files[0];assert.equal(a.name,'来福');assert.equal(a.completed,true);assert.match(a.photo,/^data:image\/(png|jpeg|webp);base64,/);assert.deepEqual(a.arc,{a:'absence',r:'romantic',c:'research'});assert.equal(a.missionHistory.length,2);assert.equal(a.growthLedger.length,5);assert.deepEqual(a.resources,{commendations:15,demerits:3,burnout:0,chaos:0});assert.deepEqual(V.summary(a),{recorded:2,completed:2,missing:0});
});
test('each browser receives independent mutable character data with a fresh identity',()=>{
 const first=A.create(E,D.catalog),second=A.create(E,D.catalog,7),snapshot=JSON.stringify(second);
 assert.notEqual(first.id,second.id);assert.equal(second.number,7);first.name='changed';first.relationships[0].name='changed';first.arc.a=null;first.log.push({text:'changed'});first.legacy.name='changed';assert.equal(JSON.stringify(second),snapshot);assert.equal(A.create(E,D.catalog).name,'来福');
});
test('existing files retain the same array, identities, active mission, edits and order without adding a demo',()=>{
 const a=E.createAgent(8);a.name='Existing';E.beginMission(a,{chaos:4},{name:'Active mission'});const files=[a,E.createAgent(9)],before=JSON.stringify(files);assert.equal(A.initialFiles(files,E,D.catalog),files);assert.equal(JSON.stringify(files),before);assert.equal(files.length,2);
});
test('persisted default data roundtrips without duplicate records; manual new characters remain blank',()=>{
 const a=A.create(E,D.catalog),b=E.sanitizeAgent(JSON.parse(S.serialize(a)).agent,D.catalog),files=[b];assert.equal(A.initialFiles(files,E,D.catalog),files);assert.equal(files.length,1);assert.equal(b.missionHistory.length,2);assert.equal(b.photo,a.photo);assert.deepEqual(b.questionnaire,a.questionnaire);assert.deepEqual(b.growthLedger,a.growthLedger);const blank=E.createAgent();assert.equal(blank.name,'');assert.equal(blank.missionHistory.length,0);assert.equal(blank.photo,'');
});
