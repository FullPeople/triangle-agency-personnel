const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../src/engine.js'),P=require('../src/dossier.js'),S=require('../src/storage.js'),{parseHTML}=require('linkedom');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/rules.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.TA_RULES)),rules=D.play.commendationsAndReprimands.missionSettlement;
function fixture(){const a=E.createAgent();a.name='测试特工';for(const k of ['a','r','c'])a.arc[k]=D.catalog[k][0].id;a.answers=[0,0,0];a.qaMax=E.allocateQA(D.catalog.c[0].assessments,a.answers);a.qa={...a.qaMax};a.resources.commendations=10;a.resources.burnout=2;return a;}
function begin(a,pool={chaos:7}){assert.equal(E.beginMission(a,pool,{name:'夜间回收'}).ok,true);return pool;}
test('settlement assumes no outcome or report; only explicitly selected rule rewards are included',()=>{
 assert.equal(E.settlementBonus({outcome:null,report:null},rules,[false,false,false]).commendations,0);
 assert.equal(E.settlementBonus({outcome:'neutralized',report:'completeReport'},rules).commendations,3);
 assert.equal(E.settlementBonus({outcome:'captured',report:'completeReport'},rules).commendations,6);
 assert.equal(E.settlementBonus({outcome:'captured',report:'exemplaryReport'},rules,[true,true,true]).commendations,12);
 const a=fixture(),pool=begin(a),before=JSON.stringify(a);assert.equal(E.finishMission(a,pool,{award:'none'},rules,D.tracks).ok,false);assert.equal(JSON.stringify(a),before);assert.equal(pool.chaos,7);
});
test('MVP and probation light a free cell on edited or incomplete personnel records, without spending or crossing other tracks',()=>{
 for(const [award,kind] of [['mvp','c'],['probation','a']]){const a=fixture();a.completed=false;a.life.spent=4;a.life.crossed={a:1,r:2,c:3};const pool=begin(a),beforeCross={...a.life.crossed};const result=E.finishMission(a,pool,{outcome:'neutralized',report:'incompleteOrInaccurateReport',award},rules,D.tracks);assert.equal(result.ok,true);assert.equal(a.life[kind],1);assert.equal(a.life.spent,4);assert.deepEqual(a.life.crossed,beforeCross);assert.equal(a.pendingRewards[0].kind,kind);assert.equal(a.growthLedger[0].missionId,result.record.id);const reload=E.sanitizeAgent(JSON.parse(S.serialize(a)).agent,D.catalog);assert.equal(reload.life[kind],1);assert.equal(reload.pendingRewards[0].missionId,result.record.id);assert.equal(reload.missionHistory[0].id,result.record.id);assert.equal(reload.awards[award],1);}
});
test('participant reward grants one relationship increase, without an R time mark or network multiplier',()=>{
 const a=fixture();a.relationships.forEach(r=>r.networked=true);const pool=begin(a);E.finishMission(a,pool,{outcome:'neutralized',report:'incompleteOrInaccurateReport',award:'none'},rules,D.tracks);assert.equal(a.pendingRewards.length,1);assert.equal(a.life.r,0);assert.equal(a.pendingRewards[0].kind,'r');assert.equal(a.pendingRewards[0].amount,1);
});
test('a full award track stops settlement atomically; double settlement cannot grant awards twice',()=>{
 const a=fixture(),pool=begin(a);a.life.c=30;const before=JSON.stringify(a);const options={outcome:'captured',report:'completeReport',award:'mvp'};assert.equal(E.finishMission(a,pool,options,rules,D.tracks).ok,false);assert.equal(JSON.stringify(a),before);assert.equal(pool.chaos,7);a.life.c=29;assert.equal(E.finishMission(a,pool,options,rules,D.tracks).ok,true);const after=JSON.stringify(a);assert.equal(E.finishMission(a,pool,options,rules,D.tracks).ok,false);assert.equal(JSON.stringify(a),after);
});
test('quick settlement records entered deltas exactly, restores chosen QA and chaos, and returns to an inactive task state',()=>{
 const a=fixture(),pool={chaos:9},rel=a.relationships[0];a.qa=E.blankQA();const result=E.finishQuickMission(a,pool,{name:'快速测试',deltas:{commendations:5,demerits:2,burnout:-1},chaos:4,award:'mvp',connections:{[rel.id]:1},summary:'回收完毕'},rules,D.tracks);assert.equal(result.ok,true);assert.equal(a.resources.commendations,15);assert.equal(a.resources.demerits,2);assert.equal(a.resources.burnout,1);assert.equal(pool.chaos,4);assert.equal(a.activeMission,null);assert.equal(a.mission.number,2);assert.equal(a.life.c,1);assert.equal(a.life.spent,0);assert.equal(a.relationships[0].connection,7);assert.equal(a.missionHistory[0].summary,'回收完毕');assert.deepEqual(a.qa,a.qaMax);assert.equal(a.missionHistory[0].after.resources.commendations,15);
});
test('bad quick inputs cannot partly mutate resources, active task, relationship or awards',()=>{
 const a=fixture(),pool={chaos:8},before=JSON.stringify(a);for(const deltas of [{commendations:3,demerits:-1},{burnout:1.2}]){assert.equal(E.finishQuickMission(a,pool,{deltas,award:'probation'},rules,D.tracks).ok,false);assert.equal(JSON.stringify(a),before);assert.equal(pool.chaos,8);}
});
test('active tasks and full mission histories survive reload without duplicating photos or losing old questionnaire data',()=>{
 let a=fixture();a.questionnaire[0]='旧答案';a.photo='data:image/png;base64,AAAA';const pool=begin(a);E.log(a,'消耗 1 QA');let b=E.sanitizeAgent(JSON.parse(S.serialize(a)).agent,D.catalog);assert.equal(b.activeMission.name,'夜间回收');assert.equal(b.activeMission.events[0].text,'消耗 1 QA');E.finishMission(b,pool,{outcome:'neutralized',report:'incompleteOrInaccurateReport',award:'none'},rules,D.tracks);const raw=S.serialize(b),c=E.sanitizeAgent(JSON.parse(raw).agent,D.catalog);assert.equal(c.questionnaire[0],'旧答案');assert.equal(c.missionHistory.length,1);assert.equal(c.photo,a.photo);assert.equal(raw.split(a.photo).length-1,1);
});
test('rolled back growth is removed immediately and never persisted, including retired records from older exports',()=>{
 const a=fixture(),entry=E.startGrowth(a,'c',{},D.tracks);assert.equal(E.rollbackGrowth(a,entry.id).ok,true);assert.equal(a.growthLedger.length,0);const legacy={...entry,revertedAt:new Date().toISOString()};a.growthLedger.push(legacy);assert.equal(JSON.parse(S.serialize(a)).agent.growthLedger.length,0);assert.equal(JSON.parse(S.stringify({files:[a]})).files[0].growthLedger.length,0);assert.equal(E.sanitizeAgent(a,D.catalog).growthLedger.length,0);
});
test('allocated mission growth remains linked to the completed task; rollback removes both its award and printable detail',()=>{
 const a=fixture(),pool=begin(a);E.finishMission(a,pool,{outcome:'neutralized',report:'incompleteOrInaccurateReport',award:'mvp'},rules,D.tracks);const pending=a.pendingRewards[0],id=pending.upgradeId;
 E.grantGrowth(a,pending,'专注 QA 上限 +1 / 嘉奖 +3',()=>{a.qaGrowth.attentiveness++;a.qaMax.attentiveness++;a.resources.commendations+=3;a.pendingRewards.shift();});
 let reload=E.sanitizeAgent(JSON.parse(S.serialize(a)).agent,D.catalog);assert.equal(reload.growthLedger[0].missionId,reload.missionHistory[0].id);assert.ok(P.render(reload,D,E).includes('专注 QA 上限 +1 / 嘉奖 +3'));assert.equal(E.rollbackGrowth(reload,id).ok,true);assert.equal(reload.resources.commendations,10);assert.equal(reload.qaGrowth.attentiveness,0);assert.equal(reload.life.c,0);assert.equal(reload.growthLedger.length,0);assert.equal(P.render(reload,D,E).includes('专注 QA 上限 +1 / 嘉奖 +3'),false);
});
test('questionnaire reading order is continuous 01–11 and keeps each question paired with its original answer',()=>{
 const a=fixture();a.questionnaire=D.questions.map((_,i)=>`ANSWER_${i}`);Object.assign(a,{salary:'SALARY',appearance:'APPEARANCE',primaryContactAnswer:'PRIMARY'});const doc=parseHTML(P.render(a,D,E)).document,page=doc.querySelector('[data-dossier-page="3"]'),items=[...page.querySelectorAll('.dossier-answer.dossier-c')];assert.deepEqual(items.map(x=>x.querySelector('h3>b').textContent),Array.from({length:11},(_,i)=>String(i+1).padStart(2,'0')));items.forEach((item,i)=>assert.equal(item.querySelector('p').textContent,D.questionnaireFields[i].field?a[D.questionnaireFields[i].field]:a.questionnaire[D.questionnaireFields[i].index]));assert.deepEqual([...page.querySelectorAll('.dossier-answer.dossier-r h3>b')].map(x=>x.textContent),['R01','R02','R03']);
});
test('mission pages begin at four only after settlement, have correct totals and do not contaminate blank cards',()=>{
 const a=fixture(),pool={chaos:0};assert.equal(parseHTML(P.render(a,D,E)).document.querySelectorAll('.dossier-fixed').length,3);
 for(let i=0;i<3;i++)E.finishQuickMission(a,pool,{name:'任务'+i,award:'none',deltas:{commendations:i}},rules,D.tracks);
 const doc=parseHTML(P.render(a,D,E)).document;assert.equal(doc.querySelectorAll('.dossier-fixed').length,5);assert.ok(doc.querySelector('[data-dossier-page="4"]').textContent.includes('任务0'));assert.ok(doc.querySelector('[data-dossier-page="5"]').textContent.includes('任务2'));for(const foot of doc.querySelectorAll('.print-footer'))assert.ok(foot.textContent.endsWith('/ 05'));
 assert.equal(parseHTML(P.render(a,D,E,{blank:true})).document.querySelectorAll('.dossier-fixed').length,3);
 const hidden=parseHTML(P.render(a,D,E,{hideMutable:true})).document;assert.ok([...hidden.querySelectorAll('.mission-balances strong')].every(x=>x.textContent==='—'));
});
test('work/life route reuses all official codes and titles with six-row snake placement, no printed empty numbering',()=>{
 const a=fixture();a.life.c=2;a.life.crossed.c=1;const doc=parseHTML(P.timeTrack(a,D,'c',{interactive:false})).document,cells=[...doc.querySelectorAll('.time-node')];assert.equal(cells.length,30);assert.deepEqual(cells.slice(5,10).map(x=>Number(x.dataset.timeIndex)),[10,9,8,7,6]);assert.equal(doc.querySelectorAll('.is-marked').length,2);assert.equal(doc.querySelectorAll('.is-crossed').length,1);assert.equal(cells[0].textContent,'');for(const t of D.tracks.titles.filter(t=>t.index>0&&t.index<=30))assert.ok(doc.querySelector('.dossier-time-track').textContent.includes(t.name));
});

test('compact life tracks retain all 30 cells, codes, titles and states over a two-row return route',()=>{
 const a=fixture();a.life={a:12,r:16,c:5,spent:18,crossed:{a:6,r:4,c:9}};
 for(const k of ['c','r','a']){
  const doc=parseHTML(P.timeTrack(a,D,k,{columns:15,interactive:false,invest:true})).document,cells=[...doc.querySelectorAll('.time-node')];
  assert.deepEqual(cells.map(n=>Number(n.dataset.timeIndex)),[...Array.from({length:15},(_,i)=>i+1),...Array.from({length:15},(_,i)=>30-i)]);
  assert.deepEqual(cells.filter(n=>n.classList.contains('is-marked')).map(n=>Number(n.dataset.timeIndex)).sort((x,y)=>x-y),Array.from({length:a.life[k]},(_,i)=>i+1));
  assert.equal(cells.filter(n=>n.classList.contains('is-crossed')).length,a.life.crossed[k]);
  for(const n of cells){const index=Number(n.dataset.timeIndex),code=D.tracks[k][String(index)];assert.equal(n.querySelector('b')?.textContent||'',code||'');if(!code&&k!=='c')assert.equal(n.textContent,'');}
  if(k==='c')for(const t of D.tracks.titles.filter(t=>t.index>0&&t.index<=30))assert.ok(doc.querySelector(`[data-time-index="${t.index}"]`).textContent.includes(t.name));
  assert.equal(doc.querySelector('.dossier-time-route>svg').getAttribute('viewBox'),'0 0 100 40');assert.equal(doc.querySelectorAll('[data-life]').length,1);assert.equal(doc.querySelector('[data-life]').dataset.life,k);
 }
});
