const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../src/engine.js'),W=require('../src/workflow.js'),P=require('../src/dossier.js'),S=require('../src/storage.js'),{parseHTML}=require('linkedom');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/rules.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.TA_RULES));
test('all manual and sheet questions are represented without shifting any of eight existing answer slots',()=>{
 const fields=D.questionnaireFields;assert.equal(fields.length,11);assert.equal(new Set(fields.map(x=>x.id)).size,11);assert.deepEqual(fields.filter(x=>x.field).map(x=>x.field),['salary','appearance','primaryContactAnswer']);
 for(let i=0;i<8;i++){const q=fields.find(x=>x.index===i);assert.equal(q.question,D.questions[i]);}assert.equal(fields.at(-1).index,7);
});
test('legacy answers and supplemental answers survive JSON import without guessing or moving personal text',()=>{
 const a=E.createAgent();a.questionnaire=Array.from({length:8},(_,i)=>`answer-${i}`);a.questionnaire[7]='期望年薪：180,000 美元';let b=E.sanitizeAgent(JSON.parse(S.serialize(a)).agent,D.catalog);assert.deepEqual(b.questionnaire,a.questionnaire);assert.equal(b.salary,'');assert.equal(b.appearance,'');assert.equal(b.primaryContactAnswer,'');
 Object.assign(b,{salary:'实际年薪',appearance:'详细外貌',primaryContactAnswer:'朋友 / 因为彼此信任'});const c=E.sanitizeAgent(JSON.parse(S.serialize(b)).agent,D.catalog);for(const key of ['salary','appearance','primaryContactAnswer'])assert.equal(c[key],b[key]);assert.deepEqual(c.questionnaire,a.questionnaire);
});
test('the three new unanswered fields count independently and appear only in the third printable page',()=>{
 const a=E.createAgent();a.arc.c=D.catalog.c[0].id;a.questionnaire=D.questions.map(()=> 'answer');assert.equal(W.counts(a,D.catalog,D.questionnaireFields).questionnaire,3);Object.assign(a,{salary:'SALARY',appearance:'APPEARANCE',primaryContactAnswer:'PRIMARY WHY'});assert.equal(W.counts(a,D.catalog,D.questionnaireFields).questionnaire,0);
 const doc=parseHTML(P.render(a,D,E)).document;assert.equal(doc.querySelectorAll('.dossier-fixed').length,3);for(const text of ['SALARY','APPEARANCE','PRIMARY WHY']){assert.ok(doc.querySelector('[data-dossier-page="3"]').textContent.includes(text));assert.equal(doc.querySelector('[data-dossier-page="1"]').textContent.includes(text),false);}
});
test('a relationship below nine cannot be manually added to the network, but a mistaken old flag can be cleared',()=>{
 const a=E.createAgent(),rel=a.relationships[0];for(const n of [0,1,3,6,8]){rel.connection=n;assert.equal(E.canToggleNetwork(rel),false);assert.equal(E.toggleNetwork(rel),null);assert.equal(rel.networked,false);}rel.connection=9;assert.equal(E.toggleNetwork(rel),true);rel.connection=3;assert.equal(E.toggleNetwork(rel),false);assert.equal(rel.connection,3);
});
test('correcting three accidental membership flags changes reality growth from four awards to one',()=>{
 const a=E.createAgent();a.relationships.forEach(rel=>rel.networked=true);const first=E.startGrowth(a,'r',{},D.tracks);assert.equal(a.pendingRewards.length,4);assert.ok(first.operations[0].text.includes('关系网 3 = 4'));assert.equal(E.rollbackGrowth(a,first.id).ok,true);
 a.relationships.forEach(rel=>E.toggleNetwork(rel));const second=E.startGrowth(a,'r',{},D.tracks);assert.equal(a.pendingRewards.length,1);assert.equal(a.pendingRewards[0].source,'时间投入');assert.ok(second.operations[0].text.includes('关系网 0 = 1'));
});
test('a legitimate existing network member survives a later point loss and cannot grant to themselves',()=>{
 const a=E.createAgent();a.relationships[0].connection=9;E.toggleNetwork(a.relationships[0]);a.relationships[0].connection=8;E.startGrowth(a,'r',{},D.tracks);assert.equal(a.pendingRewards.length,2);assert.equal(a.pendingRewards[1].exclude,a.relationships[0].id);a.relationships[0].active=false;assert.equal(E.networkMembers(a).length,0);
});
