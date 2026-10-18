const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../src/engine.js'),S=require('../src/storage.js'),Dice=require('../src/dice.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/rules.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.TA_RULES));
function agent(){const a=E.createAgent();a.name='离线留档';for(const k of ['a','r','c'])a.arc[k]=D.catalog[k][0].id;a.answers=[0,0,0];a.qaMax=E.allocateQA(D.catalog.c[0].assessments,a.answers);a.qa={...a.qaMax};a.completed=true;return a;}
function career(a,id='attentiveness'){const p=a.pendingRewards[0];E.grantGrowth(a,p,'QA +1 / commendations +3',()=>{a.qaGrowth[id]++;a.qaMax[id]++;a.resources.commendations+=3;a.mission.commendationsEarned+=3;a.pendingRewards.shift();});}

test('ordinary upgrades record their time, unlock and specific award across JSON and reload; rollback keeps unrelated edits',()=>{
 let a=agent();const entry=E.startGrowth(a,'c',{},D.tracks),baseline=E.createAgent().life;career(a);a.name='后续改名';a.contact='新联系人';a.resources.commendations+=7;
 const json=JSON.parse(S.serialize(a));a=E.sanitizeAgent(json.agent,D.catalog);assert.equal(a.growthLedger.length,1);assert.equal(a.growthLedger[0].operations.length,2);assert.equal(a.qaGrowth.attentiveness,1);
 assert.equal(E.rollbackGrowth(a,entry.id).ok,true);assert.deepEqual(a.life,baseline);assert.equal(a.qaGrowth.attentiveness,0);assert.equal(a.resources.commendations,7);assert.equal(a.name,'后续改名');assert.equal(a.contact,'新联系人');assert.equal(a.pendingRewards.length,0);assert.equal(a.growthLedger.length,0);
});
test('pending relationship-network awards belong to one upgrade and disappear together on rollback',()=>{
 const a=agent();a.relationships[0].networked=true;const baseline=structuredClone(a.relationships),entry=E.startGrowth(a,'r',{},D.tracks);assert.equal(a.pendingRewards.length,2);const p=a.pendingRewards[0];E.grantGrowth(a,p,'target relation',()=>{a.relationships[1].connection++;a.relationships[1].boonNext=true;a.pendingRewards.shift();});
 const restored=E.sanitizeAgent(JSON.parse(S.serialize(a)).agent,D.catalog);assert.equal(restored.pendingRewards[0].upgradeId,entry.id);assert.equal(E.rollbackGrowth(restored,entry.id).ok,true);assert.deepEqual(restored.relationships,baseline);assert.equal(restored.pendingRewards.length,0);assert.equal(restored.life.r,0);assert.equal(restored.unlocked.includes(D.tracks.r[1]),false);
});
test('later conflicting relationship changes block rollback atomically without losing the ledger',()=>{
 const a=agent(),entry=E.startGrowth(a,'r',{},D.tracks),p=a.pendingRewards[0];E.grantGrowth(a,p,'relation +1',()=>{a.relationships[0].connection++;a.pendingRewards.shift();});a.relationships[0].connection--;const before=JSON.stringify(a);assert.equal(E.rollbackGrowth(a,entry.id).ok,false);assert.equal(JSON.stringify(a),before);
});
test('only the latest active upgrade can roll back and a free mark refunds no ordinary time',()=>{
 const a=agent(),first=E.startGrowth(a,'c',{},D.tracks),second=E.startGrowth(a,'a',{free:true},D.tracks);assert.equal(E.rollbackGrowth(a,first.id).ok,false);assert.equal(E.rollbackGrowth(a,second.id,{dryRun:true}).ok,true);assert.equal(a.life.a,1);assert.equal(E.rollbackGrowth(a,second.id).ok,true);assert.equal(a.life.spent,1);assert.equal(a.life.c,1);assert.equal(a.life.a,0);assert.equal(a.life.crossed.a,1);
});
test('practice, public knowledge and reading codes reverse in order after persisted reload',()=>{
 let a=agent();const ab=D.catalog.a[0].abilities[0],entry=E.startGrowth(a,'a',{},D.tracks),p=a.pendingRewards[0];E.grantGrowth(a,p,'practice',()=>{a.practiced.push(ab.id);a.pendingRewards.shift();});a=E.sanitizeAgent(a,D.catalog);assert.equal(E.rollbackGrowth(a,entry.id).ok,true);assert.equal(a.practiced.includes(ab.id),false);
 a.practiced=[ab.id];const second=E.startGrowth(a,'a',{},D.tracks),q=a.pendingRewards[0];E.grantGrowth(a,q,'public answer / X1',()=>{a.practiced=[];a.unlocked.push('X1');a.pendingRewards.shift();});assert.equal(E.rollbackGrowth(a,second.id).ok,true);assert.deepEqual(a.practiced,[ab.id]);assert.equal(a.unlocked.includes('X1'),false);
});
test('old pending awards gain a reversible record without inventing a previous time allocation',()=>{
 const a=agent();a.life.c=4;a.pendingRewards=[{kind:'c',amount:1,source:'old award'}];career(a);const entry=a.growthLedger[0];assert.equal(entry.step,0);assert.equal(E.rollbackGrowth(a,entry.id).ok,true);assert.equal(a.life.c,4);assert.equal(a.pendingRewards.length,1);assert.equal(a.pendingRewards[0].source,'old award');
});
test('malformed imported journal paths cannot write arbitrary properties or introduce nonnumeric grants',()=>{
 const a=agent(),entry=E.startGrowth(a,'c',{},D.tracks);entry.operations.push({text:'invalid',changes:[{path:['__proto__','polluted'],before:0,after:1},{path:['qaMax','attentiveness'],before:[],after:['bad']}]});const b=E.sanitizeAgent(a,D.catalog);assert.equal(b.growthLedger[0].operations[1].changes.length,0);assert.equal({}.polluted,undefined);
});
test('behavior check/uncheck returns awards and mission counters exactly; repeated cycles grant nothing extra',()=>{
 const a=agent();a.resources.commendations=5;for(let i=0;i<10;i++){assert.equal(E.toggleBehavior(a,1),1);assert.equal(a.resources.commendations,6);assert.equal(a.behaviors[1],true);assert.equal(E.toggleBehavior(a,1),-1);assert.equal(a.resources.commendations,5);assert.equal(a.behaviors[1],false);}assert.equal(a.mission.commendationsEarned,0);assert.equal(E.toggleBehavior(a,8),null);
});
test('upgrade backup never replaces original storage or a retained copy, and storage errors do not interrupt loading',()=>{
 const values=new Map([['main','original']]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};assert.equal(S.retain(storage,'main','original'),true);assert.equal(S.retain(storage,'main','newer'),true);assert.equal(values.get('main'),'original');assert.equal(values.get('main.pre-v2.21'),'original');assert.equal(S.retain({getItem:()=>null,setItem:()=>{throw Error('quota');}},'main','safe'),false);
});
test('full JSON export retains optional photo, all nine relations and ledger regardless of print flags',()=>{
 const a=agent();a.photo='data:image/png;base64,dGVzdA==';a.relationships=Array.from({length:9},(_,i)=>({...a.relationships[0],id:String(i),name:'关系'+i}));E.startGrowth(a,'a',{},D.tracks);const b=JSON.parse(S.serialize(a));assert.equal(b.format,'triangle-agency-workbench');assert.equal(b.version,2);assert.equal(b.agent.photo,a.photo);assert.equal(b.agent.relationships.length,9);assert.deepEqual(b.agent.growthLedger,a.growthLedger);
});
test('an automatic backup yields space to the current card if quota is reached; primary data is never removed',()=>{
 const values=new Map([['main','previous'],['main.pre-v2.21','original']]),removed=[];const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(k==='main'&&values.has('main.pre-v2.21'))throw Error('quota');values.set(k,v);},removeItem:k=>{removed.push(k);values.delete(k);}};
 assert.equal(S.persist(storage,'main','current'),true);assert.equal(values.get('main'),'current');assert.deepEqual(removed,['main.pre-v2.21']);
 const blocked={getItem:k=>values.get(k)??null,setItem:()=>{throw Error('quota');},removeItem:k=>assert.notEqual(k,'main')};assert.equal(S.persist(blocked,'main','newer'),false);assert.equal(values.get('main'),'current');
});
function clock(reduced=false){let t=0,next=1,complete=0,paint=[],tasks=new Map();const cancel=Dice.timeline({raf:fn=>{const id=next++;tasks.set(id,fn);return id;},caf:id=>tasks.delete(id),now:()=>t,paint:time=>paint.push(time),complete:()=>complete++,reduced});return{cancel,step(time){t=time;const run=[...tasks.values()];tasks.clear();run.forEach(fn=>fn(t));},get complete(){return complete;},get paint(){return paint;}};}
test('dice reveal happens once after all six staggered dice settle, never before motion',()=>{
 const c=clock();c.step(0);c.step(600);assert.equal(c.complete,0);assert.equal(Dice.pose(600,5).settled,false);c.step(Dice.DURATION-1);assert.equal(c.complete,0);c.step(Dice.DURATION);assert.equal(c.complete,1);c.step(9999);assert.equal(c.complete,1);for(let i=0;i<6;i++)assert.equal(Dice.pose(Dice.DURATION,i).settled,true);
});
test('closing a roll cancels its pending result; reduced motion completes without flashing frames',()=>{
 const c=clock();c.step(300);c.cancel();c.step(9999);assert.equal(c.complete,0);const reduced=clock(true);reduced.step(0);assert.equal(reduced.complete,1);assert.deepEqual(reduced.paint,[Dice.DURATION]);
});
