(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TA_ENGINE=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const QUALITIES=[
    ['attentiveness','专注','ATT'],['duplicity','欺瞒','DUP'],['dynamism','活力','DYN'],
    ['empathy','共情','EMP'],['initiative','主动','INI'],['persistence','坚毅','PER'],
    ['presence','气场','PRE'],['professionalism','专业','PRO'],['subtlety','诡秘','SUB']
  ].map(([id,name,code])=>({id,name,code}));
  const int=(value,min=0,max=999999)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Math.trunc(Number(value)):min));
  const qualityId=value=>QUALITIES.find(q=>q.id===value||q.name===value)?.id||null;
  const blankQA=()=>Object.fromEntries(QUALITIES.map(q=>[q.id,0]));
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`ta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function createAgent(number=1){return{
    id:uid(),number,version:2,name:'',pronouns:'',title:'',salary:'',appearance:'',primaryContactAnswer:'',contact:'',contactRelation:'',contactMethod:'',fingerprintConfirmed:false,photo:'',
    arc:{a:null,r:null,c:null},answers:[null,null,null],qa:blankQA(),qaMax:blankQA(),qaGrowth:blankQA(),
    resources:{commendations:0,demerits:0,burnout:0,chaos:0},behaviors:[false,false,false],behaviorBonus:false,
    relationships:[0,1,2].map((_,i)=>({id:uid(),name:'',playedBy:'',description:'',connection:i===0?6:3,networked:false,active:true,boon:'',boonActive:false,boonNext:false})),
    questionnaire:Array(8).fill(''),realityAnswers:['','',''],arcDetails:{},directiveChoice:null,realityMarks:0,notes:'',requisitionNotes:'',practiced:[],life:{a:0,r:0,c:0,spent:0,crossed:{a:0,r:0,c:0}},
    mission:{commendationsEarned:0,demeritsEarned:0,equipmentUsed:false,locationOverload:0,number:1},pendingRewards:[],unlocked:[],equipment:[],
    awards:{mvp:0,probation:0},activeMission:null,missionHistory:[],growthLedger:[],log:[],completed:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  };}
  function allocateQA(assessments,answers,growth={}){
    const result=blankQA();
    assessments.forEach((assessment,index)=>{
      const selected=answers[index]; if(selected!==0&&selected!==1)return;
      const choice=assessment.options?.[selected];
      const id=qualityId(typeof choice==='string'?choice:choice?.quality);
      if(!id)throw new Error('未知资质'); result[id]+=3;
    });
    for(const q of QUALITIES)result[q.id]=Math.min(9,result[q.id]+int(growth[q.id],0,9));
    return result;
  }
  function qualityOrigins(agent,catalog){
    const result=Object.fromEntries(QUALITIES.map(q=>[q.id,{abilities:[],career:false}]));
    const anomaly=catalog.a.find(e=>e.id===agent.arc.a),career=catalog.c.find(e=>e.id===agent.arc.c);
    (anomaly?.abilities||[]).forEach((ability,index)=>{const id=qualityId(ability.quality);if(id)result[id].abilities.push({number:index+1,name:ability.name});});
    (career?.assessments||[]).forEach((assessment,index)=>{const answer=agent.answers[index];if(answer!==0&&answer!==1)return;const option=assessment.options[answer],id=qualityId(typeof option==='string'?option:option?.quality);if(id)result[id].career=true;});
    return result;
  }
  function calculateRoll(raw,adjusted,burnout=0,extraThrees=0){
    if(!Array.isArray(raw)||raw.length!==6||raw.some(n=>![1,2,3,4].includes(n)))throw new Error('掷骰需要 6d4');
    if(!Array.isArray(adjusted)||adjusted.length!==6||adjusted.some(n=>![1,2,3,4].includes(n)))throw new Error('无效的骰面');
    const naturalThrees=raw.filter(n=>n===3).length;
    const triple=naturalThrees===3;
    const adjustedThrees=adjusted.filter(n=>n===3).length;
    const overload=int(burnout,0,Number.MAX_SAFE_INTEGER);
    const threes=triple?3+int(extraThrees,0,Number.MAX_SAFE_INTEGER-3):Math.max(0,adjustedThrees-overload);
    const chaos=triple||threes===3?0:6-adjustedThrees+overload;
    return{naturalThrees,adjustedThrees,threes,chaos,burned:triple?0:Math.min(overload,adjustedThrees),burnout:overload,triple,stable:triple||threes===3,success:triple||threes>0};
  }
  function roll6d4(randomBytes){
    const bytes=randomBytes||(()=>{const b=new Uint8Array(6);crypto.getRandomValues(b);return b;})();
    if(bytes.length!==6)throw new Error('随机数数量错误');
    return Array.from(bytes,n=>(n%4)+1);
  }
  function sanitizeAgent(input,catalog,number=1){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('无效档案');
    const a=createAgent(number);
    for(const key of ['name','pronouns','title','salary','appearance','primaryContactAnswer','contact','contactRelation','contactMethod','notes','requisitionNotes'])a[key]=String(input[key]||'').slice(0,key==='notes'?20000:4000);
    a.id=typeof input.id==='string'?input.id.slice(0,100):a.id;
    a.number=int(input.number,1,999999);a.completed=input.completed===true;a.fingerprintConfirmed=input.fingerprintConfirmed===true;
    for(const key of ['a','r','c'])if(catalog[key].some(entry=>entry.id===input.arc?.[key]))a.arc[key]=input.arc[key];
    a.answers=[0,1,2].map(i=>[0,1].includes(input.answers?.[i])?input.answers[i]:null);
    for(const q of QUALITIES){a.qaGrowth[q.id]=int(input.qaGrowth?.[q.id],0,9);}
    const comp=catalog.c.find(item=>item.id===a.arc.c);
    a.qaMax=comp?allocateQA(comp.assessments,a.answers,a.qaGrowth):blankQA();
    for(const q of QUALITIES)a.qa[q.id]=int(input.qa?.[q.id],0,a.qaMax[q.id]);
    for(const k of Object.keys(a.resources))a.resources[k]=int(input.resources?.[k],k==='commendations'?-999999:0,999999);
    a.behaviors=[0,1,2].map(i=>input.behaviors?.[i]===true);a.behaviorBonus=input.behaviorBonus===true;
    if(Array.isArray(input.relationships))a.relationships=input.relationships.slice(0,40).map((r,i)=>({id:typeof r.id==='string'?r.id:uid(),name:String(r.name||'').slice(0,120),playedBy:String(r.playedBy||'').slice(0,120),description:String(r.description||'').slice(0,4000),connection:int(r.connection,0,9),networked:r.networked===true,active:r.active!==false,boon:String(r.boon||'').slice(0,120),boonActive:r.boonActive===true,boonNext:r.boonNext===true}));
    while(a.relationships.length<3)a.relationships.push(createAgent().relationships[a.relationships.length]);
    a.questionnaire=Array.from({length:8},(_,i)=>String(input.questionnaire?.[i]||'').slice(0,8000));
    a.realityAnswers=Array.from({length:3},(_,i)=>String(input.realityAnswers?.[i]||'').slice(0,8000));
    if(input.arcDetails&&typeof input.arcDetails==='object')a.arcDetails=Object.fromEntries(Object.entries(input.arcDetails).slice(0,30).map(([key,value])=>[key,String(value).slice(0,2000)]));
    a.directiveChoice=[0,1].includes(input.directiveChoice)?input.directiveChoice:null;a.realityMarks=int(input.realityMarks,0,4);
    for(const k of ['commendationsEarned','demeritsEarned','locationOverload','number'])a.mission[k]=int(input.mission?.[k],k==='number'?1:0,99999);
    a.mission.equipmentUsed=input.mission?.equipmentUsed===true;
    a.pendingRewards=Array.isArray(input.pendingRewards)?input.pendingRewards.slice(0,99).filter(x=>['a','r','c','refill'].includes(x.kind)).map(x=>({kind:x.kind,source:String(x.source||'').slice(0,80),amount:int(x.amount,1,30),exclude:typeof x.exclude==='string'?x.exclude:'',missionId:String(x.missionId||'').slice(0,100),...(typeof x.upgradeId==='string'?{upgradeId:x.upgradeId.slice(0,100)}:{})})):[];
    a.practiced=Array.isArray(input.practiced)?input.practiced.filter(x=>typeof x==='string').slice(0,30):[];
    for(const k of ['a','r','c']){a.life[k]=int(input.life?.[k],0,30);a.life.crossed[k]=int(input.life?.crossed?.[k],0,30);if(a.life[k]+a.life.crossed[k]>30)a.life.crossed[k]=30-a.life[k];}
    a.life.spent=int(input.life?.spent,0,30);
    a.awards.mvp=int(input.awards?.mvp);a.awards.probation=int(input.awards?.probation);
    a.log=sanitizeLogRows(input.log,60);
    a.createdAt=typeof input.createdAt==='string'?input.createdAt:a.createdAt;
    a.updatedAt=typeof input.updatedAt==='string'?input.updatedAt:a.updatedAt;
    if(typeof input.photo==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(input.photo)&&input.photo.length<1800000)a.photo=input.photo;
    if(input.legacy&&typeof input.legacy==='object')a.legacy=input.legacy;
    if(Array.isArray(input.equipment))a.equipment=input.equipment.slice(0,30).map(x=>({id:String(x.id||uid()),name:String(x.name||'').slice(0,160),effect:String(x.effect||'').slice(0,8000)}));
    if(Array.isArray(input.unlocked))a.unlocked=input.unlocked.filter(x=>typeof x==='string').slice(0,80);
    a.growthLedger=sanitizeGrowthLedger(input.growthLedger);
    a.missionHistory=Array.isArray(input.missionHistory)?input.missionHistory.filter(x=>x&&x.finishedAt&&x.id).slice(-1000).map(sanitizeMission):[];
    a.activeMission=input.activeMission&&typeof input.activeMission==='object'?sanitizeMission(input.activeMission):null;
    if(a.activeMission&&(!a.activeMission.name||a.missionHistory.some(row=>row.id===a.activeMission.id)))a.activeMission=null;
    recoverLegacyMissions(a);
    for(const row of Array.isArray(input.growthLedger)?input.growthLedger:[])if(row?.revertedAt)removeGrowthLogs(a,row);
    a.log=a.log.filter(row=>!/^回退升级/.test(row.text));
    if(!['a','r','c'].every(k=>a.arc[k])||a.answers.some(v=>v===null)||!a.name.trim())a.completed=false;
    return a;
  }
  function migrateLegacy(file,number){
    const a=createAgent(number);
    for(const key of ['name','pronouns','title','contact'])a[key]=String(file[key]||'');
    a.questionnaire[2]=String(file.manifestation||'');a.notes=String(file.alias?`代号：${file.alias}\n`:'');
    a.legacy=file;return a;
  }
  function sanitizeLogRows(rows,limit=200){return Array.isArray(rows)?rows.slice(-limit).filter(row=>row&&typeof row==='object').map(row=>({time:String(row.time||'').slice(0,40),text:String(row.text||'').slice(0,400),...(typeof row.upgradeId==='string'&&row.upgradeId?{upgradeId:row.upgradeId.slice(0,100)}:{}),...(row.type==='growth'?{type:'growth'}:{})})):[];}
  function log(agent,text,{upgradeId=''}={}){if(!text)return;const row={time:new Date().toISOString(),text,...(upgradeId?{upgradeId,type:'growth'}:{})};agent.log.push(row);if(agent.log.length>60)agent.log.shift();if(agent.activeMission){agent.activeMission.events.push(row);if(agent.activeMission.events.length>200)agent.activeMission.events.shift();}agent.updatedAt=row.time;}
  function removeGrowthLogs(agent,entry){
    if(!entry||typeof entry.id!=='string')return;
    const names={a:'异常体',r:'现实',c:'职能'};
    const clean=rows=>{
      const removed=new Set(rows.filter(row=>row.upgradeId===entry.id));
      for(const [index,op]of(Array.isArray(entry.operations)?entry.operations:[]).entries()){
        if(!op||typeof op!=='object')continue;
        const time=Date.parse(op.time||'');if(!Number.isFinite(time))continue;
        const candidates=rows.filter(row=>!row.upgradeId&&!removed.has(row)&&Number.isFinite(Date.parse(row.time))&&Math.abs(Date.parse(row.time)-time)<=100&&(row.text===op.text||index===0&&entry.step>0&&row.text.startsWith(`投入${names[entry.kind]}时间`))).sort((a,b)=>Math.abs(Date.parse(a.time)-time)-Math.abs(Date.parse(b.time)-time));
        if(candidates.length)removed.add(candidates[0]);
      }
      return rows.filter(row=>!removed.has(row));
    };
    agent.log=clean(agent.log||[]);
    for(const mission of [agent.activeMission,...(agent.missionHistory||[])])if(mission)mission.events=clean(mission.events||[]);
  }
  function isGrowthLog(row){return row.type==='growth'||Boolean(row.upgradeId)||/^(?:回退升级|投入(?:职能|现实|异常体)时间|(?:免费标记|投入时间)\s*\/|关系成长[：:]|异常成长[：:]|广为人知[：:])/.test(row.text)||/QA 上限 \+1\s*\/\s*嘉奖 \+3/.test(row.text);}
  function legacyGrowthResidue(agent){return !(agent.growthLedger||[]).some(row=>!row.revertedAt)&&(['a','r','c','spent'].some(k=>agent.life[k]>0)||Object.values(agent.life.crossed).some(n=>n>0)||Object.values(agent.qaGrowth).some(n=>n>0)||agent.practiced.length>0||agent.unlocked.length>0||agent.pendingRewards.some(p=>!p.upgradeId&&!p.missionId));}
  function resetLegacyGrowth(agent,catalog,{clearLog=false}={}){
    if((agent.growthLedger||[]).some(row=>!row.revertedAt))return{ok:false,reason:'请先回退现有升级，再清理未留档的旧成长。'};
    recoverLegacyMissions(agent);
    const career=catalog.c.find(row=>row.id===agent.arc.c);
    agent.life={a:0,r:0,c:0,spent:0,crossed:{a:0,r:0,c:0}};agent.qaGrowth=blankQA();agent.qaMax=career?allocateQA(career.assessments,agent.answers):blankQA();
    for(const q of QUALITIES)agent.qa[q.id]=Math.min(agent.qa[q.id],agent.qaMax[q.id]);
    agent.practiced=[];agent.unlocked=[];agent.pendingRewards=[];agent.growthLedger=[];
    agent.log=clearLog?[]:agent.log.filter(row=>!isGrowthLog(row));
    for(const mission of [agent.activeMission,...(agent.missionHistory||[])])if(mission)mission.events=(mission.events||[]).filter(row=>!isGrowthLog(row));
    agent.updatedAt=new Date().toISOString();return{ok:true};
  }
  function bonusText(ability){
    const bonus=ability.bonus;if(!bonus)return'';
    const choices=bonus.choices||bonus.options;
    return [bonus.text||'',...(Array.isArray(choices)?choices.map(x=>typeof x==='string'?x:[Number.isFinite(x.cost)?`${x.cost} 个 3`:'',...Object.values(x).filter(v=>typeof v==='string')].filter(Boolean).join('：')):[])].filter(Boolean).join('\n');
  }
  function markLife(life,kind,free=false){
    if(!['a','r','c'].includes(kind))throw new Error('未知记录条');
    if(life[kind]+life.crossed[kind]>=30||(!free&&(life.spent>=30||['a','r','c'].some(k=>life[k]+life.crossed[k]>=30))))return false;
    life[kind]++;if(!free){life.spent++;for(const other of ['a','r','c'].filter(k=>k!==kind))life.crossed[other]++;}
    return true;
  }
  const copy=value=>JSON.parse(JSON.stringify(value));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function growthPath(path){
    if(!Array.isArray(path))return false;
    const [group,key,field]=path;
    if(['practiced','unlocked'].includes(group))return path.length===1;
    if(['qa','qaMax','qaGrowth'].includes(group))return path.length===2&&QUALITIES.some(q=>q.id===key);
    if(group==='resources'||group==='mission')return path.length===2&&key===(group==='resources'?'commendations':'commendationsEarned');
    if(group==='life')return path.length===2&&['a','r','c','spent'].includes(key)||path.length===3&&key==='crossed'&&['a','r','c'].includes(field);
    return group==='relationships'&&path.length===3&&typeof key==='string'&&key.length<=100&&['connection','networked','boonNext'].includes(field);
  }
  function growthValue(agent,path,value,write=false){
    let owner=agent,key=path.at(-1);
    if(path[0]==='relationships')owner=agent.relationships.find(r=>r.id===path[1]);
    else for(const part of path.slice(0,-1))owner=owner?.[part];
    if(!owner)return undefined;
    if(write)owner[key]=value;
    return owner[key];
  }
  function growthProjection(agent){
    const paths=[...['a','r','c','spent'].map(k=>['life',k]),...['a','r','c'].map(k=>['life','crossed',k]),['resources','commendations'],['mission','commendationsEarned'],['practiced'],['unlocked']];
    for(const group of ['qa','qaMax','qaGrowth'])for(const q of QUALITIES)paths.push([group,q.id]);
    for(const r of agent.relationships)for(const key of ['connection','networked','boonNext'])paths.push(['relationships',r.id,key]);
    return paths.map(path=>({path,value:copy(growthValue(agent,path))}));
  }
  function recordGrowth(agent,entry,text,apply){
    const before=growthProjection(agent);apply();
    const changes=before.map(({path,value})=>({path,before:value,after:copy(growthValue(agent,path))})).filter(x=>!same(x.before,x.after));
    entry.operations.push({text,time:new Date().toISOString(),changes});
  }
  function startGrowth(agent,kind,{free=false,source=free?'任务评优':'时间投入',missionId=''}={},tracks={}){
    const before=copy(agent.life);if(!markLife(copy(before),kind,free))return null;
    const members=networkMembers(agent);
    const entry={id:uid(),kind,step:before[kind]+1,free,source,missionId,time:new Date().toISOString(),operations:[],pendingBefore:[],revertedAt:null};
    recordGrowth(agent,entry,`${free?'免费标记':'投入时间'} / ${kind.toUpperCase()} ${entry.step}${tracks[kind]?.[entry.step]?` / ${tracks[kind][entry.step]}`:''}${kind==='r'?` / 基础 1 + 关系网 ${members.length} = ${members.length+1} 次成长`:''}`,()=>{
      markLife(agent.life,kind,free);const code=tracks[kind]?.[entry.step];if(code&&!agent.unlocked.includes(code))agent.unlocked.push(code);
    });
    (agent.growthLedger??=[]).push(entry);agent.pendingRewards.push({kind,amount:1,source,missionId,upgradeId:entry.id});
    if(kind==='r')for(const rel of members)agent.pendingRewards.push({kind:'r',amount:1,source:`关系网 / ${rel.name}`,exclude:rel.id,upgradeId:entry.id});
    return entry;
  }
  function grantGrowth(agent,pending,text,apply){
    let entry=agent.growthLedger?.find(row=>row.id===pending.upgradeId&&!row.revertedAt);
    if(!entry){entry={id:uid(),kind:pending.kind,step:0,free:true,source:pending.source||'既有收益',missionId:pending.missionId||'',time:new Date().toISOString(),operations:[],pendingBefore:[copy(pending)],revertedAt:null};(agent.growthLedger??=[]).push(entry);pending.upgradeId=entry.id;}
    recordGrowth(agent,entry,text,apply);return entry;
  }
  function rollbackGrowth(agent,id,{dryRun=false}={}){
    const latest=[...(agent.growthLedger||[])].reverse().find(row=>!row.revertedAt);
    if(!latest||latest.id!==id)return{ok:false,reason:'请从最近一条升级开始回退。'};
    const next=copy(agent),entry=next.growthLedger.find(row=>row.id===id);
    for(const operation of [...entry.operations].reverse())for(const change of [...operation.changes].reverse()){
      const {path,before,after}=change,current=growthValue(next,path);
      if(current===undefined)return{ok:false,reason:'对应的关系或资质已变更，无法直接回退。'};
      if(path.length===1){
        const added=after.filter(x=>!before.includes(x)),removed=before.filter(x=>!after.includes(x));
        if(added.some(x=>!current.includes(x))||removed.some(x=>current.includes(x)))return{ok:false,reason:'能力或阅读代码已有后续变更，请先处理后续记录。'};
        growthValue(next,path,[...current.filter(x=>!added.includes(x)),...removed],true);
      }else if(['resources','mission','qa','qaMax','qaGrowth'].includes(path[0])){
        if(path[0]==='mission'&&(next.missionHistory||[]).some(row=>Number.isFinite(Date.parse(row.finishedAt))&&Date.parse(row.finishedAt)>=Date.parse(operation.time||entry.time)))continue;
        const value=current-(after-before);
        if(path[0]!=='resources'&&value<0)return{ok:false,reason:'这笔收益已经被后续操作使用，请先恢复对应数据。'};
        growthValue(next,path,value,true);
      }else{
        if(!same(current,after))return{ok:false,reason:'时间轨或关系已有后续变更，请先恢复对应数据。'};
        growthValue(next,path,copy(before),true);
      }
    }
    next.pendingRewards=next.pendingRewards.filter(row=>row.upgradeId!==id);
    next.pendingRewards.unshift(...entry.pendingBefore.map(copy));
    for(const q of QUALITIES)next.qa[q.id]=Math.min(next.qa[q.id],next.qaMax[q.id]);
    removeGrowthLogs(next,entry);
    next.growthLedger=next.growthLedger.filter(row=>row.id!==id);
    next.updatedAt=new Date().toISOString();
    if(!dryRun)Object.assign(agent,next);
    return{ok:true};
  }
  function sanitizeGrowthLedger(rows){
    if(!Array.isArray(rows))return[];
    const value=(x,path)=>path.length===1?Array.isArray(x)&&x.length<=100&&x.every(s=>typeof s==='string'&&s.length<=160):['networked','boonNext'].includes(path[2])?typeof x==='boolean':Number.isFinite(x)&&Math.abs(x)<=999999;
    return rows.slice(-600).filter(row=>row&&!row.revertedAt&&typeof row.id==='string'&&['a','r','c','refill'].includes(row.kind)).map(row=>({
      id:row.id.slice(0,100),missionId:String(row.missionId||'').slice(0,100),kind:row.kind,step:int(row.step,0,30),free:row.free===true,source:String(row.source||'').slice(0,120),time:String(row.time||'').slice(0,40),revertedAt:null,
      pendingBefore:Array.isArray(row.pendingBefore)?row.pendingBefore.slice(0,1).filter(p=>p&&['a','r','c','refill'].includes(p.kind)).map(p=>({kind:p.kind,source:String(p.source||'').slice(0,80),amount:int(p.amount,1,30),exclude:String(p.exclude||'').slice(0,100),missionId:String(p.missionId||'').slice(0,100)})):[],
      operations:Array.isArray(row.operations)?row.operations.slice(0,100).filter(op=>op&&typeof op==='object').map(op=>({text:String(op.text||'').slice(0,400),time:String(op.time||'').slice(0,40),changes:Array.isArray(op.changes)?op.changes.filter(c=>c&&growthPath(c.path)&&value(c.before,c.path)&&value(c.after,c.path)&&typeof c.before===typeof c.after).slice(0,100).map(copy):[]})):[]
    }));
  }
  const missionNames={captured:'已捕获',neutralized:'已中和',escaped:'已逃脱',exemplaryReport:'模范报告',completeReport:'完整报告',incompleteOrInaccurateReport:'未完成报告',mvp:'任务 MVP',probation:'察看期',none:'参与者'};
  function missionSnapshot(a,shared={}){return{resources:{...a.resources,chaos:shared.chaos||0},qa:{...a.qa},connections:a.relationships.map(r=>({id:r.id,name:r.name,connection:r.connection}))};}
  function sanitizeMission(row){
    const legacy=row.legacy===true||/^legacy-mission-\d+-\d+$/.test(String(row.id||''));
    const text=(x,n=200)=>String(x??'').slice(0,n);
    const shot=s=>({resources:Object.fromEntries(['commendations','demerits','burnout','chaos'].map(k=>[k,int(s?.resources?.[k],k==='commendations'?-999999:0,999999)])),qa:Object.fromEntries(QUALITIES.map(q=>[q.id,int(s?.qa?.[q.id],0,9)])),connections:Array.isArray(s?.connections)?s.connections.slice(0,40).map(r=>({id:text(r.id,100),name:text(r.name,120),connection:int(r.connection,0,9)})):[]});
    return{id:text(row.id,100)||uid(),name:text(row.name,120),mode:row.mode==='quick'?'quick':'normal',number:int(row.number,1,99999),beganAt:text(row.beganAt,40),finishedAt:text(row.finishedAt,40),summary:text(row.summary,4000),legacy,outcome:missionNames[row.outcome]?row.outcome:null,report:missionNames[row.report]?row.report:null,award:['mvp','probation','none'].includes(row.award)?row.award:null,baseline:legacy?null:shot(row.baseline),beforeSettlement:legacy?null:shot(row.beforeSettlement),after:legacy?null:shot(row.after),earned:legacy?null:{commendations:int(row.earned?.commendations,0,999999),demerits:int(row.earned?.demerits,0,999999)},breakdown:Array.isArray(row.breakdown)?row.breakdown.slice(0,20).map(x=>({label:text(x.label,120),commendations:int(x.commendations,-999999,999999),demerits:int(x.demerits,-999999,999999)})):[],events:sanitizeLogRows(row.events)};
  }
  function recoverLegacyMissions(agent){
    for(const row of agent.log||[]){
      const match=row.text.match(/^任务\s+(\d+)\s+结算\s*\/\s*(captured|neutralized|escaped)\s*\/\s*(exemplaryReport|completeReport|incompleteOrInaccurateReport)\s*\/\s*(mvp|probation|none)\s*$/);
      if(!match||Number(match[1])<1||Number(match[1])>99999||!Number.isFinite(Date.parse(row.time)))continue;
      const number=int(match[1],1,99999);if(agent.missionHistory.some(r=>r.number===number))continue;
      agent.missionHistory.push(sanitizeMission({id:`legacy-mission-${number}-${row.time.replace(/[^0-9]/g,'')}`,name:`任务 ${String(number).padStart(2,'0')}`,number,legacy:true,mode:'normal',beganAt:'',finishedAt:row.time,outcome:match[2],report:match[3],award:match[4],events:[row]}));
      agent.mission.number=Math.max(agent.mission.number,number+1);
    }
    agent.missionHistory.sort((a,b)=>a.number-b.number);return agent.missionHistory;
  }
  function beginMission(a,shared,{name,mode='normal'}={}){
    if(a.activeMission)return{ok:false,reason:'当前任务尚未结束。'};
    const title=String(name||'').trim().slice(0,120);if(!title)return{ok:false,reason:'请填写任务名称。'};
    a.activeMission={id:uid(),name:title,mode,number:a.mission.number,beganAt:new Date().toISOString(),baseline:missionSnapshot(a,shared),events:[]};
    return{ok:true};
  }
  function settlementBonus(options,rules,behaviors=[]){
    const rows=['outcome','report'].filter(k=>rules[options[k]]).map(k=>({label:missionNames[options[k]],commendations:rules[options[k]].commendations||0,demerits:rules[options[k]].reprimands||0}));
    if(behaviors.length===3&&behaviors.every(Boolean))rows.push({label:'许可行为全部完成',commendations:3,demerits:0});
    return{breakdown:rows,commendations:rows.reduce((n,r)=>n+r.commendations,0),demerits:rows.reduce((n,r)=>n+r.demerits,0)};
  }
  function finishMission(a,shared,options,rules,tracks={}){
    if(!a.activeMission)return{ok:false,reason:'请先开始任务。'};
    if(!['none','mvp','probation'].includes(options.award))return{ok:false,reason:'请选择本次评优结果。'};
    const quick=a.activeMission.mode==='quick';
    if(!quick&&(!['captured','neutralized','escaped'].includes(options.outcome)||!['exemplaryReport','completeReport','incompleteOrInaccurateReport'].includes(options.report)))return{ok:false,reason:'请确认异常体状态和报告结果。'};
    const n=copy(a),pool={...shared},record=n.activeMission,beforeSettlement=missionSnapshot(n,pool);
    let bonus;
    if(quick){
      const deltas=options.deltas||{};
      for(const key of ['commendations','demerits','burnout']){const v=Number(deltas[key]??0);if(!Number.isSafeInteger(v)||Math.abs(v)>99999)return{ok:false,reason:'增减量需填写范围内的整数。'};const next=n.resources[key]+v;if(key!=='commendations'&&next<0)return{ok:false,reason:'申诫和额外过载不能减到零以下。'};n.resources[key]=next;}
      const chaos=Number(options.chaos??0);if(!Number.isSafeInteger(chaos)||chaos<0||chaos>999999)return{ok:false,reason:'请填写有效的结算后混沌值。'};pool.chaos=chaos;
      for(const q of QUALITIES){const v=Number(options.qa?.[q.id]??n.qaMax[q.id]);if(!Number.isInteger(v)||v<0||v>n.qaMax[q.id])return{ok:false,reason:`${q.name} QA 超出上限。`};n.qa[q.id]=v;}
      for(const rel of n.relationships){const v=Number(options.connections?.[rel.id]??0);if(!Number.isInteger(v)||v<-9||v>9||rel.connection+v<0||rel.connection+v>9)return{ok:false,reason:'关系连结需保持在 0 至 9。'};if(v){rel.connection+=v;if(rel.connection===9)rel.networked=true;if(rel.connection===0)rel.active=false;}}
      bonus={breakdown:[{label:'快捷任务录入',commendations:deltas.commendations||0,demerits:deltas.demerits||0}]};
      n.mission.commendationsEarned+=Math.max(0,Number(deltas.commendations||0));n.mission.demeritsEarned+=Math.max(0,Number(deltas.demerits||0));
    }else{
      bonus=settlementBonus(options,rules,n.behaviors);n.resources.commendations+=bonus.commendations;n.resources.demerits+=bonus.demerits;n.mission.commendationsEarned+=bonus.commendations;n.mission.demeritsEarned+=bonus.demerits;
      for(const q of QUALITIES)n.qa[q.id]=n.qaMax[q.id];pool.chaos=0;
    }
    if(options.award!=='none'){
      const kind=options.award==='mvp'?'c':'a';
      if(!startGrowth(n,kind,{free:true,missionId:record.id,source:options.award==='mvp'?'任务 MVP':'察看期'},tracks))return{ok:false,reason:`${kind==='c'?'职能':'异常体'}轨已满，无法记录免费投入。请先与 GM 确认。`};
      n.awards[options.award]++;
    }else n.pendingRewards.push({kind:'r',amount:1,source:'任务参与者',missionId:record.id});
    Object.assign(record,{finishedAt:new Date().toISOString(),summary:String(options.summary||'').slice(0,4000),outcome:quick?null:options.outcome,report:quick?null:options.report,award:options.award,beforeSettlement,after:missionSnapshot(n,pool),earned:{commendations:n.mission.commendationsEarned,demerits:n.mission.demeritsEarned},breakdown:bonus.breakdown});
    n.missionHistory.push(record);n.activeMission=null;
    n.behaviors=[false,false,false];n.behaviorBonus=false;n.mission.equipmentUsed=false;
    for(const rel of n.relationships){rel.boonActive=rel.networked||Boolean(rel.boonNext);rel.boonNext=false;}
    n.mission.number++;n.mission.commendationsEarned=0;n.mission.demeritsEarned=0;n.mission.locationOverload=0;
    Object.assign(a,n);Object.assign(shared,pool);return{ok:true,record};
  }
  function finishQuickMission(a,shared,options,rules,tracks={}){
    if(a.activeMission)return{ok:false,reason:'请先结算当前任务。'};
    const n=copy(a),pool={...shared},start=beginMission(n,pool,{name:options.name||`快捷任务 ${a.mission.number}`,mode:'quick'});if(!start.ok)return start;
    const result=finishMission(n,pool,options,rules,tracks);if(result.ok){Object.assign(a,n);Object.assign(shared,pool);}return result;
  }
  function toggleBehavior(agent,index){
    if(!Number.isInteger(index)||index<0||index>2)return null;
    const delta=agent.behaviors[index]?-1:1;agent.behaviors[index]=delta===1;
    agent.resources.commendations+=delta;agent.mission.commendationsEarned=Math.max(0,agent.mission.commendationsEarned+delta);
    return delta;
  }
  function networkMembers(agent){return agent.relationships.filter(r=>r.networked&&r.active);}
  function canToggleNetwork(rel){return Boolean(rel&&(rel.networked||rel.active&&rel.connection===9));}
  function toggleNetwork(rel){if(!canToggleNetwork(rel))return null;rel.networked=!rel.networked;return rel.networked;}
  return{QUALITIES,int,qualityId,blankQA,uid,createAgent,allocateQA,qualityOrigins,missionNames,missionSnapshot,beginMission,settlementBonus,finishMission,finishQuickMission,calculateRoll,roll6d4,sanitizeAgent,migrateLegacy,log,removeGrowthLogs,legacyGrowthResidue,resetLegacyGrowth,recoverLegacyMissions,markLife,bonusText,startGrowth,grantGrowth,rollbackGrowth,toggleBehavior,networkMembers,canToggleNetwork,toggleNetwork};
});
