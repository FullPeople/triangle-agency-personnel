const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),E=require('../src/engine.js'),P=require('../src/dossier.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/rules.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.TA_RULES));
function fixture(){const a=E.createAgent(7);for(const k of ['a','r','c'])a.arc[k]=D.catalog[k][0].id;Object.assign(a,{name:'林零 PRIVATE',pronouns:'TA',contact:'人事部 CONTACT',contactRelation:'同事',contactMethod:'agent@example.invalid',notes:'笔记 SECRET'});a.resources={commendations:291,demerits:4,burnout:11};a.qaMax.attentiveness=9;a.qa.attentiveness=7;a.relationships[0].name='关系人 CONTACT';a.relationships[0].connection=8;return a;}
function render(a,options={}){const html=P.render(a,D,E,options);return{html,document:parseHTML('<html><body>'+html+'</body></html>').document};}
test('three fixed pages separate identity, work and life, and questions with trailing quality labels',()=>{
 const {html,document}=render(fixture(),{full:false});assert.equal(document.querySelectorAll('article.print-sheet').length,3);assert.equal(document.querySelectorAll('.dossier-arc>div').length,3);assert.equal(document.querySelectorAll('.dossier-quality-row').length,9);const row=document.querySelector('.dossier-quality-row');assert.equal(row.lastElementChild.className,'dossier-quality-name');assert.equal(row.querySelector('svg.dossier-quality-chain').querySelectorAll('polygon').length,9);assert.ok(html.includes('关系人 CONTACT'));assert.ok(html.includes('人事部 CONTACT'));assert.equal(html.includes('掷骰速查'),false);
});
test('hiding mutable data leaves printable fields and rule text while removing numeric balances and QA fills',()=>{
 const a=fixture(),normal=render(a),hidden=render(a,{hideMutable:true});assert.ok(normal.document.querySelector('.dossier-resources').textContent.includes('291'));assert.equal(hidden.document.querySelector('.dossier-resources').textContent.includes('291'),false);assert.equal(hidden.document.querySelectorAll('.dossier-quality-chain .filled,.dossier-quality-chain .spent').length,0);assert.ok([...hidden.document.querySelectorAll('.dossier-quality-maximum strong')].every(el=>el.textContent===''));assert.ok(hidden.document.querySelector('.dossier-time-tallies .dossier-write-line'));assert.ok(hidden.html.includes('人事部 CONTACT'));assert.ok(hidden.html.includes('林零 PRIVATE'));assert.ok(hidden.html.includes(D.catalog.a[0].abilities[0].trigger));
});
test('blank cards contain writing space and generic ability/contact fields without copying personal or selected ARC data',()=>{
 const a=fixture(),before=JSON.stringify(a),{html,document}=render(a,{blank:true});assert.equal(document.querySelectorAll('article.print-sheet').length,3);for(const value of ['林零 PRIVATE','人事部 CONTACT','笔记 SECRET','agent@example.invalid',D.catalog.a[0].name])assert.equal(html.includes(value),false);assert.equal(document.querySelectorAll('.dossier-ability').length,3);assert.equal(document.querySelectorAll('.dossier-contact').length,9);assert.ok(document.querySelectorAll('.dossier-write-line').length>50);assert.equal(document.querySelectorAll('.dossier-quality-chain .filled').length,0);assert.ok([...document.querySelectorAll('.print-answer')].some(el=>el.textContent.includes('角色细节')));assert.equal(JSON.stringify(a),before);
});
test('print settings never mutate the character and disabling them restores the original populated sheet',()=>{
 const a=fixture(),before=JSON.stringify(a),normal=render(a).html;render(a,{blank:true,hideMutable:true});assert.equal(JSON.stringify(a),before);assert.equal(render(a).html,normal);
});
test('free text stays escaped in archive and print templates',()=>{
 const a=fixture();a.name='<img src=x onerror=alert(1)>';a.relationships[0].description='<script>bad()</script>';const {document,html}=render(a);assert.equal(document.querySelectorAll('script,img').length,0);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));
});
test('official routes preserve every code, snake order and mutable marks in the right column of page two',()=>{
 const a=fixture();a.life={a:3,r:4,c:5,spent:12,crossed:{a:9,r:8,c:7}};
 const {document}=render(a),page=document.querySelector('[data-dossier-page="2"]');
 assert.ok(page.querySelector('.dossier-second-left .dossier-contact'));assert.ok(page.querySelector('.dossier-second-left .dossier-emergency'));
 assert.equal(document.querySelector('[data-dossier-page="1"]').textContent.includes('紧急联系人'),false);
 assert.equal(page.querySelectorAll('.time-node').length,90);assert.equal(page.querySelectorAll('.relation-node').length,30);
 assert.equal(page.querySelectorAll('.time-node>small').length,0);assert.ok([...page.querySelectorAll('.time-node:not(.has-code)')].every(n=>n.textContent.trim()===''));assert.ok(page.querySelector('[data-time-index="3"] em').textContent.includes('专员'));
 for(const k of ['a','r','c']){const track=page.querySelector(`[data-time-track="${k}"]`);assert.equal(track.querySelectorAll('.is-marked').length,a.life[k]);assert.equal(track.querySelectorAll('.is-crossed').length,a.life.crossed[k]);
 assert.deepEqual([...track.querySelectorAll('.time-node')].slice(0,10).map(n=>Number(n.dataset.timeIndex)),[1,2,3,4,5,10,9,8,7,6]);
 for(const [n,code] of Object.entries(D.tracks[k]))assert.equal(track.querySelector(`[data-time-index="${n}"] b`).textContent,code);
 }
 const hidden=render(a,{hideMutable:true}).document;assert.equal(hidden.querySelectorAll('.is-marked,.is-crossed,.is-lit').length,0);
});
test('archives show a safe alpha-capable photo once; salary and appearance belong to questionnaire page and blank cards never leak photos',()=>{
 const a=fixture();a.photo='data:image/png;base64,dGVzdA==';a.salary='SALARY';a.appearance='APPEARANCE';
 const {document,html}=render(a);assert.equal(document.querySelectorAll('img').length,1);assert.ok(document.querySelector('.dossier-photo.has-alpha img'));assert.equal(html.includes('笔记 SECRET'),false);for(const x of ['SALARY','APPEARANCE']){assert.equal(document.querySelector('[data-dossier-page="1"]').textContent.includes(x),false);assert.ok(document.querySelector('[data-dossier-page="3"]').textContent.includes(x));}
 assert.equal(render(a,{blank:true}).document.querySelectorAll('img').length,0);a.photo='javascript:bad()';assert.equal(render(a).document.querySelectorAll('img').length,0);
});
test('nine relationships retain every person, route, description and boon within the second page',()=>{
 const a=fixture();a.relationships=Array.from({length:9},(_,i)=>({id:`r${i}`,name:`关系人${i+1}`,playedBy:`玩家${i+1}`,description:`共同经历${i+1}`,connection:i,active:true,networked:i===8,boon:'充满活力',boonActive:i===2}));
 const {document}=render(a),page=document.querySelector('[data-dossier-page="2"]');assert.equal(page.querySelector('.dossier-contacts').dataset.columns,'2');assert.equal(page.querySelectorAll('.dossier-contact').length,9);assert.equal(page.querySelectorAll('.relation-node').length,90);
 for(let i=1;i<=9;i++)assert.ok(page.textContent.includes(`关系人${i}`)&&page.textContent.includes(`共同经历${i}`));
 const framed=render(a,{framed:true}).document;assert.equal(framed.querySelectorAll('.print-page-frame>.dossier-fixed').length,3);
});
test('reality progress is a four-box record and mutable-data hiding clears only its marks',()=>{
 const a=fixture();a.arc.r=D.catalog.r.find(r=>r.track?.boxes===4).id;a.realityMarks=2;
 const normal=render(a).document.querySelector('.dossier-track .record-box-track');assert.equal(normal.children.length,4);assert.equal(normal.querySelectorAll('.marked').length,2);assert.equal(normal.textContent,'');
 const hidden=render(a,{hideMutable:true}).document.querySelector('.dossier-track .record-box-track');assert.equal(hidden.children.length,4);assert.equal(hidden.querySelectorAll('.marked').length,0);
});
