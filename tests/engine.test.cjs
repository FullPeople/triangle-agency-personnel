const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const E=require('../src/engine.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/rules.js'),'utf8'),context);
const data=JSON.parse(JSON.stringify(context.window.TA_RULES));
const C=data.catalog;

test('the supplied catalog has exactly 9 fixed components per category and 27 initial abilities',()=>{
  for(const key of ['a','r','c'])assert.equal(C[key].length,9);
  assert.equal(C.a.flatMap(a=>a.abilities).length,27);
  assert.equal(new Set(C.a.flatMap(a=>a.abilities.map(x=>x.id))).size,27);
  for(const ab of C.a.flatMap(a=>a.abilities)){
    assert.ok(E.qualityId(ab.quality));
    assert.ok(ab.trigger&&ab.success&&ab.failure);
    assert.equal(ab.initially_available,true);
  }
});
test('all 72 competency answer combinations produce three pools of 3 QA, total 9',()=>{
  for(const c of C.c)for(let bits=0;bits<8;bits++){
    const answers=[0,1,2].map(i=>(bits>>i)&1);
    const qa=E.allocateQA(c.assessments,answers);
    assert.equal(Object.values(qa).reduce((a,b)=>a+b,0),9,c.name);
    assert.deepEqual(Object.values(qa).filter(x=>x>0),[3,3,3],c.name);
  }
});
test('unanswered assessments grant nothing and growth is capped at 9 per quality',()=>{
  assert.deepEqual(E.allocateQA(C.c[0].assessments,[null,null,null]),E.blankQA());
  const qa=E.allocateQA(C.c[0].assessments,[0,0,0],{presence:9});
  assert.equal(qa.presence,9);
});

test('all 27 ability labels retain their actual quality and one-based ability number',()=>{
  for(const anomaly of C.a){const a=E.createAgent();a.arc.a=anomaly.id;const origins=E.qualityOrigins(a,C);assert.equal(Object.values(origins).flatMap(o=>o.abilities).length,3);anomaly.abilities.forEach((ability,index)=>{assert.ok(origins[E.qualityId(ability.quality)].abilities.some(label=>label.number===index+1&&label.name===ability.name));});assert.equal(Object.values(origins).some(o=>o.career),false);}
});

test('career origin labels follow chosen assessment awards and exclude unanswered choices and growth',()=>{
  for(const career of C.c){for(let bits=0;bits<8;bits++){const a=E.createAgent();a.arc.c=career.id;a.answers=[0,1,2].map(i=>(bits>>i)&1);a.qaGrowth.presence=9;const initial=E.allocateQA(career.assessments,a.answers),origins=E.qualityOrigins(a,C);for(const q of E.QUALITIES)assert.equal(origins[q.id].career,initial[q.id]>0,`${career.name}: ${q.name}`);}}
  const a=E.createAgent();a.arc.c=C.c[0].id;assert.equal(Object.values(E.qualityOrigins(a,C)).some(o=>o.career),false);a.answers=[0,null,null];const choice=C.c[0].assessments[0].options[0];assert.equal(E.qualityOrigins(a,C)[E.qualityId(choice.quality)].career,true);a.arc.c=null;assert.equal(Object.values(E.qualityOrigins(a,C)).some(o=>o.career),false);
});
test('manual example: one 3 and two overload fails with seven Chaos',()=>{
  const raw=[3,1,2,4,2,4],r=E.calculateRoll(raw,raw,2);
  assert.equal(r.threes,0);assert.equal(r.chaos,7);assert.equal(r.success,false);
});
test('QA-built stable three gives zero Chaos but no natural triple reward',()=>{
  const r=E.calculateRoll([1,1,1,1,1,1],[3,3,3,1,1,1],0);
  assert.equal(r.chaos,0);assert.equal(r.triple,false);assert.equal(r.success,true);
});
test('natural triple wins before overload and permits additional threes',()=>{
  const raw=[3,3,3,1,2,4],r=E.calculateRoll(raw,raw,99999,7);
  assert.equal(r.threes,10);assert.equal(r.chaos,0);assert.equal(r.triple,true);assert.equal(r.burned,0);
});
test('all 4096 raw rolls and overload values 0-8 obey the manual calculation',()=>{
  for(let encoded=0;encoded<4096;encoded++){
    const raw=Array.from({length:6},(_,i)=>((encoded>>(i*2))&3)+1);
    const threes=raw.filter(n=>n===3).length;
    for(let overload=0;overload<=8;overload++){
      const result=E.calculateRoll(raw,raw,overload);
      const final=threes===3?3:Math.max(0,threes-overload);
      assert.equal(result.threes,final);
      assert.equal(result.chaos,threes===3||final===3?0:6-threes+overload);
      assert.equal(result.success,threes===3||final>0);
    }
  }
});
test('invalid dice are rejected and byte mapping to d4 is unbiased',()=>{
  assert.throws(()=>E.calculateRoll([1,2],[],0));
  assert.throws(()=>E.calculateRoll([1,2,3,4,1,5],[1,2,3,4,1,1],0));
  const counts=[0,0,0,0];
  for(let value=0;value<256;value++)counts[E.roll6d4(new Uint8Array(6).fill(value))[0]-1]++;
  assert.deepEqual(counts,[64,64,64,64]);
});
test('ordinary career time crosses both other tracks; MVP does not cross or spend time',()=>{
  const life=E.createAgent().life;
  assert.equal(E.markLife(life,'c'),true);
  assert.equal(life.c,1);assert.equal(life.crossed.a,1);assert.equal(life.crossed.r,1);assert.equal(life.spent,1);
  assert.equal(E.markLife(life,'c',true),true);
  assert.equal(life.c,2);assert.equal(life.crossed.a,1);assert.equal(life.crossed.r,1);assert.equal(life.spent,1);
});
test('free marks may raise total marks above 30, but no track can exceed its own cells',()=>{
  const life=E.createAgent().life;
  for(let i=0;i<30;i++)assert.equal(E.markLife(life,'c',true),true);
  assert.equal(E.markLife(life,'a',true),true);
  assert.equal(life.c+life.a+life.r,31);
  const before=JSON.stringify(life);assert.equal(E.markLife(life,'c',true),false);assert.equal(JSON.stringify(life),before);
});
test('import rejects custom ARC and never imports arbitrary initial QA maxima',()=>{
  const a=E.createAgent();a.name='Import';a.arc={a:'custom',r:'caretaker',c:'public_relations'};a.answers=[0,0,0];a.completed=true;
  a.qaMax=Object.fromEntries(E.QUALITIES.map(q=>[q.id,99]));a.qa={...a.qaMax};
  const imported=E.sanitizeAgent(a,C);assert.equal(imported.arc.a,null);assert.equal(imported.completed,false);
  assert.equal(Object.values(imported.qaMax).reduce((a,b)=>a+b,0),9);
});
test('relationship boons, pending network exclusions and native v2 fields survive import',()=>{
  const a=E.createAgent();a.relationships[0].boon='睿智';a.relationships[0].boonNext=true;a.realityMarks=3;
  a.pendingRewards=[{kind:'r',amount:1,source:'network',exclude:a.relationships[0].id}];
  const b=E.sanitizeAgent(a,C);assert.equal(b.relationships[0].boon,'睿智');assert.equal(b.relationships[0].boonNext,true);
  assert.equal(b.pendingRewards[0].exclude,a.relationships[0].id);assert.equal(b.realityMarks,3);
});
test('legacy free-form ARC is retained for backup but never used as a current component',()=>{
  const old={name:'Legacy',anomaly:'Custom Anomaly',reality:'Custom Reality',competency:'Custom Competency'};
  const a=E.migrateLegacy(old,2);assert.deepEqual(a.arc,{a:null,r:null,c:null});assert.deepEqual(a.legacy,old);assert.equal(a.name,'Legacy');
});

test('ability bonus options retain their costs in every rendered reference',()=>{
  const eyes=C.a.find(a=>a.id==='growth').abilities[2];
  for(const option of eyes.bonus.options)assert.ok(E.bonusText(eyes).includes(`${option.cost} 个 3：${option.text}`));
  for(const ability of C.a.flatMap(a=>a.abilities))assert.ok(E.bonusText(ability).includes(ability.bonus.text));
});
