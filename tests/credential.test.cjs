const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../src/credential.js'),E=require('../src/engine.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/rules.js'),'utf8'),context);
const D=context.window.TA_RULES;
test('pass fields use the selected rules entries, actual pronouns and current agency rating',()=>{
  const a=E.createAgent(12);Object.assign(a,{name:'林零',pronouns:'TA',title:'高级研究员'});
  for(const kind of ['a','r','c'])a.arc[kind]=D.catalog[kind][2].id;
  a.resources.demerits=4;const pass=P.data(a,D.catalog,D.play.commendationsAndReprimands.ratings);
  assert.equal(pass.name,a.name);assert.equal(pass.pronouns,a.pronouns);assert.equal(pass.title,a.title);assert.equal(pass.number,'TA / 0012');
  assert.equal(pass.rating,D.play.commendationsAndReprimands.ratings.find(r=>r.reprimands===4).name);
  for(const entry of pass.arc)assert.equal(entry.name,D.catalog[entry.kind][2].name);
});
test('initial rank and ratings at the upper rule boundary do not invent clearance or change stored data',()=>{
  const a=E.createAgent(1),before=JSON.stringify(a);let pass=P.data(a,D.catalog,D.play.commendationsAndReprimands.ratings);
  assert.equal(pass.title,'见习生');assert.equal(pass.rating,'评级良好');assert.equal(pass.arc.every(entry=>entry.name==='未选择'),true);assert.equal(JSON.stringify(a),before);
  a.resources.demerits=100;pass=P.data(a,D.catalog,D.play.commendationsAndReprimands.ratings);assert.equal(pass.rating,'冷冻酸奶室权限已撤销');
});
