(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./mission-view.js'):root.TA_MISSION_VIEW);if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_DOSSIER=api;})(typeof window!=='undefined'?window:this,(MV)=>{
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const kinds=['a','r','c'],names={a:'异常体',r:'现实',c:'职能'};
  const line=(wide=false,label='')=>`<span class="dossier-write-line ${wide?'wide':''}" aria-label="${esc(label||'待填写')}" ${label?`data-label="${esc(label)}"`:''}></span>`;
  const seal='<span class="dossier-seal" aria-hidden="true"><svg viewBox="0 0 60 60"><path d="M30 5 55 48H5Z"/><circle cx="30" cy="30" r="28"/><path d="M30 15 45 41H15Z"/></svg></span>';
  const palettes={
    a:['#dcebf8','#c8def3','#a8cfe7','#b5dfe8','#b3c7e8','#e8f3fa','#98c3df'],
    r:['#f6edd9','#eee0bd','#e6ce9b','#d9ba7e','#f8efd9','#fff9eb'],
    c:['#f6dce2','#efc2cd','#e9a7b7','#fbeaf0','#dd91a6','#f2cdd6'],
    q:['#d5cddd','#dfd8e7','#e9e3ef','#f2edf6','#f9f6fc','#ffffff'],
    ink:['#e2e6e3','#cdd5d2','#bfcac5','#edf0ed','#d8dfdc','#f5f7f4']
  };
  const patternCache=Object.create(null);
  function pattern(tone='a'){
    if(patternCache[tone])return patternCache[tone];
    const colors=palettes[tone]||palettes.a,planes=Array.from({length:6},()=>new Map());
    const polygon=(points,color,band=0)=>{const group=planes[band];group.set(color,(group.get(color)||'')+`M${points.map(p=>p.join(' ')).join('L')}Z`);};
    const seed=(row,col,side=0)=>((row+11)*67+(col+13)*131+side*53)%101;
    if(tone==='r'){
      // Folded paper: broad planes with a narrow light edge at each crease.
      for(let i=0;i<6;i++){
        const tip=60+i*45;
        polygon([[440,-25],[tip+92,-25],[tip,80],[tip+92,185],[440,185]],colors[i],i);
        if(i<5)polygon([[tip+92,-25],[tip+4,80],[tip+96,185],[tip+90,185],[tip-2,80],[tip+86,-25]],'#fffaf0',i);
      }
    }else if(tone==='q'){
      // Concentric triangles retain their silhouette instead of becoming stripes.
      for(let i=0;i<6;i++)polygon([[278,-28+i*28],[102+i*23,181-i*10],[454-i*23,181-i*10]],colors[i],i);
    }else{
      const size=tone==='a'?36:tone==='c'?67:58,height=size*.866,rows=Math.ceil(160/height)+1,columns=Math.ceil(440/size)+1;
      const point=(row,col)=>{
        const jitter=tone==='a'?0:tone==='c'?(seed(row,col)%35)-17:(seed(row,col)%13)-6;
        return [Math.round(col*size+(row%2)*size/2+jitter),Math.round(row*height+(tone==='a'?0:tone==='c'?(seed(col,row)%31)-15:(seed(col,row)%11)-5))];
      };
      for(let row=-1;row<rows;row++)for(let col=0;col<columns;col++)for(let side=0;side<2;side++){
        let points=row%2===0?(side?[point(row,col+1),point(row+1,col),point(row+1,col+1)]:[point(row,col),point(row,col+1),point(row+1,col)]):(side?[point(row,col),point(row+1,col),point(row+1,col+1)]:[point(row,col),point(row,col+1),point(row+1,col+1)]);
        const cx=points.reduce((n,p)=>n+p[0],0)/3,cy=points.reduce((n,p)=>n+p[1],0)/3;
        const threshold=Math.max(0,Math.min(100,(cx-55)*.42));
        if(seed(row,col,side)>threshold)continue;
        if(tone==='c')points=points.map(([x,y])=>[Math.round(cx+(x-cx)*.86),Math.round(cy+(y-cy)*.86)]);
        polygon(points,colors[seed(row,col,side+1)%colors.length],(row+col+side+24)%6);
      }
    }
    return patternCache[tone]=`<svg class="dossier-strata strata-${tone}" viewBox="0 0 400 160" preserveAspectRatio="${tone==='q'?'xMaxYMax meet':'xMaxYMid slice'}" aria-hidden="true">${planes.map((group,i)=>`<g class="fill-plane plane-${i}">${[...group].map(([color,path])=>`<path d="${path}" fill="${color}"/>`).join('')}</g>`).join('')}</svg>`;
  }
  const block=(title,body,tone='ink',code='')=>`<section class="print-section record-section dossier-${tone}"><h2>${pattern(tone)}<span>${esc(title)}</span>${code?`<small class="mono">${esc(code)}</small>`:''}</h2>${body}</section>`;
  const rule=(label,text,blank=false)=>`<div class="print-rule dossier-rule"><span>${esc(label)}</span><div>${blank?line(true):esc(text||'—')}</div></div>`;
  const trackBoxes=(total,current,{hidden=false,label='进度'}={})=>`<span class="record-box-track" role="img" aria-label="${esc(label)}${hidden?'，待填写':`，已标记 ${current} / ${total} 格`}">${Array.from({length:total},(_,i)=>`<i class="${!hidden&&i<current?'marked':''}" aria-hidden="true"></i>`).join('')}</span>`;
  const fit=(body,extra='')=>`<div class="dossier-fit ${extra}" data-fit-region><div data-fit-content>${body}</div></div>`;
  function timeTrack(a,data,k,{hidden=false,interactive=true,columns=5,invest=false}={}){
      const cols=columns===15?15:5,rows=30/cols,edge=50/cols;
      const order=Array.from({length:rows},(_,row)=>Array.from({length:cols},(_,col)=>row*cols+(row%2?cols-col:col+1))).flat();
      const route=Array.from({length:rows},(_,row)=>row?`V${row*20+10}H${row%2?edge:100-edge}`:`M${edge} 10H${100-edge}`).join('');
      return`<section class="dossier-time-track dossier-${k}" data-time-track="${k}"><h3>${pattern(k)}<b>${k.toUpperCase()}</b><span>${names[k]}</span><small>${hidden?'—':a.life[k]} / 30</small>${invest?`<button class="life-invest" data-life="${k}">投入${names[k]} <span aria-hidden="true">↗</span></button>`:''}</h3><div class="dossier-time-route" data-route-columns="${cols}"><svg viewBox="0 0 100 ${rows*20}" preserveAspectRatio="none" aria-hidden="true"><path d="${route}" style="fill:none;stroke:${{a:'#235fb8',r:'#bd8105',c:'#d51b3e'}[k]};stroke-width:3.4px;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke"/></svg>${order.map(n=>{const code=data.tracks[k][String(n)],title=k==='c'?data.tracks.titles.find(t=>t.index===n)?.name:null;return`<button class="time-node ${!hidden&&n<=a.life[k]?'is-marked':''} ${!hidden&&n>30-a.life.crossed[k]?'is-crossed':''} ${code?'has-code':''}" ${interactive?'data-open="life"':'tabindex="-1"'} data-time-index="${n}" aria-label="${names[k]}第 ${n} 格${code?`，阅读代码 ${code}`:''}${title?`，${title}`:''}">${code?`<b>${code}</b>`:''}${title?`<em>${title}</em>`:''}</button>`;}).join('')}</div><p>${{c:'每格：QA 上限 +1 · 嘉奖 +3',r:'每格：连结 +1 · 激活加成',a:'每格：练习能力或广为人知'}[k]}</p></section>`;
  }
  function render(agent,data,engine,{hideMutable=false,blank=false,chaos=0,framed=false}={}){
    const missions=blank?[]:(agent.missionHistory||[]),missionStats=blank?{completed:0,recorded:0,missing:0}:MV.summary(agent),historyCount=Math.max(Math.ceil(missions.length/2),missionStats.completed?1:0),pageCount=3+historyCount;
    const a=agent,entry=k=>blank?null:data.catalog[k].find(x=>x.id===a.arc[k]),anomaly=entry('a'),reality=entry('r'),career=entry('c'),suppressed=blank||hideMutable;
    const value=(text,wide=false)=>blank?line(wide):esc(text||'—'),changing=text=>suppressed?line():esc(text);
    const photo=!blank&&/^data:image\/(png|jpeg|webp);base64,/.test(a.photo||'')?`<div class="dossier-photo ${/^data:image\/(png|webp)/.test(a.photo)?'has-alpha':''}"><img src="${esc(a.photo)}" alt="${esc(a.name||'特工')}的证件照"></div>`:'';
    const rating=data.play.commendationsAndReprimands.ratings.find(row=>row.reprimands===a.resources.demerits)?.name||'冷冻酸奶室权限已撤销';
    const head=(page,title)=>`<header class="print-head dossier-head ${page>1?'dossier-head-compact':''}"><div class="dossier-name"><span class="dossier-kicker mono">PERSONNEL / ${(['FIELD RECORD','WORK & LIFE','ONBOARDING'][page-1]||'MISSION HISTORY')}</span><h1>${page===1?(blank?line(true,'姓名'):esc(a.name||'未命名特工')):title}</h1><p>${page===1?`${blank?line(false,'人称代词'):value(a.pronouns)}<span>/</span>${blank?line(false,'头衔'):value(a.title||'见习生')}`:value(a.name)+'<span>/</span>'+value(a.title||'见习生')}</p></div>${page===1?photo:''}<div class="dossier-identity">${seal}<strong>三角机构</strong><span class="mono">${blank?'TA / ————':`TA / ${String(a.number).padStart(4,'0')}`}</span><small>${page===1?changing(rating):`档案 ${String(page).padStart(2,'0')} / ${String(pageCount).padStart(2,'0')}`}</small></div></header>`;
    const arc=`<div class="print-arc dossier-arc">${kinds.map(k=>`<div class="dossier-${k}">${pattern(k)}<b>${k.toUpperCase()}</b><span><small>${names[k]}</small><strong>${blank?line():esc(entry(k)?.name||'未选择')}</strong></span></div>`).join('')}</div>`;
    const resources=`<div class="print-resource-row dossier-resources">${[['嘉奖',a.resources.commendations],['申诫',a.resources.demerits],['额外过载',a.resources.burnout],['共享混沌',chaos]].map(([label,count])=>`<div><span>${label}</span><strong>${changing(count)}</strong></div>`).join('')}</div>`;
    const qualities=block('资质保证',`<div class="dossier-quality-list">${engine.QUALITIES.map(q=>{
      const max=blank?0:a.qaMax[q.id],current=blank?0:a.qa[q.id];
      const chain=`<svg class="dossier-quality-chain" viewBox="0 0 213 36" role="img" aria-label="${q.name}${suppressed?'，数值待填写':`，当前 ${current} QA，上限 ${max} QA`}">${Array.from({length:9},(_,i)=>{const x=3+i*21.5,points=i%2?`${x},33 ${x+17.5},3 ${x+35},33`:`${x},3 ${x+35},3 ${x+17.5},33`;return`<polygon points="${points}" class="${!suppressed&&i<current?'filled':!suppressed&&i<max?'spent':'empty'}" style="fill:${!suppressed&&i<current?'#d51b3e':!suppressed&&i<max?'#f4f1f8':'none'};stroke:${!suppressed&&i<current?'#d51b3e':!suppressed&&i<max?'#281640':'#cbc4d8'}"/>`;}).join('')}</svg>`;
      return`<div class="dossier-quality-row" data-dossier-quality="${q.id}"><div class="dossier-quality-maximum"><span>MAX</span><svg viewBox="0 0 72 64" aria-hidden="true"><path d="M36 2 71 63H1Z"/></svg><strong>${suppressed?'':max}</strong></div>${chain}<strong class="dossier-quality-name">${q.name}</strong></div>`;
    }).join('')}</div>`,'q','QA');
    const realityBody=blank?block('现实触发器',rule('名称','',true)+rule('触发','',true),'r','TRIGGER')+block('过载解除',rule('名称','',true)+rule('情境','',true),'r','RELIEF'):reality?block('现实触发器',`<h3>${esc(reality.trigger.name)}</h3><p>${esc(reality.trigger.text)}</p>${reality.trigger.connection_penalty?`<p class="dossier-consequence">${esc(reality.trigger.connection_penalty.relationship_selector)}失去 ${reality.trigger.connection_penalty.amount} 连结。</p>`:''}${reality.track?`<div class="dossier-track"><strong>${esc(reality.track.name)}</strong>${trackBoxes(reality.track.boxes,a.realityMarks,{hidden:suppressed,label:reality.track.name})}</div><p class="dossier-fine">${esc(reality.track.transition)}</p>`:''}`,'r','TRIGGER')+block('过载解除',`<h3>${esc(reality.release.name)}</h3><p>${esc(reality.release.text)}</p>`,'r','RELIEF'):'';
    const abilities=blank?[1,2,3].map(i=>`<section class="print-ability dossier-ability dossier-a">${pattern('a')}<header><b class="mono">0${i}</b><div><h3>${line(true)}</h3><small>使用资质 ${line()}</small></div><span class="dossier-ability-triangle" aria-hidden="true">△</span></header>${['触发','成功','追加','失败'].map(label=>rule(label,'',true)).join('')}</section>`).join(''):(anomaly?.abilities||[]).map((ability,i)=>`<section class="print-ability dossier-ability dossier-a">${pattern('a')}<header><b class="mono">0${i+1}</b><div><h3>${esc(ability.name)}</h3><small>${esc(ability.quality)}${!hideMutable&&a.practiced.includes(ability.id)?' / 熟练':''}</small></div><span class="dossier-ability-triangle" aria-hidden="true">△</span></header>${rule('触发',ability.trigger)}${rule('成功',ability.success)}${rule('追加',engine.bonusText(ability))}${rule('失败',ability.failure)}<small class="dossier-source">手册 ${ability.source.printed_page} 页</small></section>`).join('');
    const directive=blank?block('首要指令',rule('指令','',true)+rule('违例','',true),'c','DIRECTIVE'):career?block('首要指令',`<h3>${esc(career.prime_directive.text)}</h3><p>${esc(typeof career.prime_directive.violation==='object'?career.prime_directive.violation.options[a.directiveChoice]||'—':career.prime_directive.violation)}</p><small>违反时，获得 1 次申诫。</small>`,'c','DIRECTIVE'):'';
    const behaviors=blank?block('许可行为',[1,2,3].map(()=>`<p class="dossier-check"><i></i>${line(true)}</p>`).join(''),'c','SANCTIONED'):career?block('许可行为',career.sanctioned_behaviors.map((text,i)=>`<p class="dossier-check"><i>${!hideMutable&&a.behaviors[i]?'✓':''}</i><span>${esc(text)}</span><b>+1</b></p>`).join('')+'<small>三项完成后，在评优后额外 +3 嘉奖。</small>','c','SANCTIONED'):'';
    const requisition=blank?block('初始申领物',rule('名称','',true)+rule('效果','',true),'c','REQUISITION'):career?block('初始申领物',`<h3>${esc(career.initial_requisition.name)}</h3><p>${esc(career.initial_requisition.text)}</p>`,'c','REQUISITION'):'';
    const relationRows=blank?Array.from({length:9},()=>({})):a.relationships;
    const relationColumns=relationRows.length>9?3:relationRows.length>3?2:1;
    const emergencyInGrid=relationColumns===2&&relationRows.length%2===1;
    const emergency=block('紧急联系人',`<div class="dossier-emergency"><strong>${blank?line(false,'姓名'):value(a.contact)}</strong><span>${blank?line(false,'关系'):value(a.contactRelation)}</span><p>${blank?line(true,'邮箱／电话'):value(a.contactMethod,true)}</p></div>`,'ink','EMERGENCY');
    const contacts=block('人际关系',`<div class="dossier-contacts" data-columns="${relationColumns}">`+relationRows.map((rel,i)=>`<section class="print-relation dossier-contact"><header><b class="mono">${String(i+1).padStart(2,'0')}</b><h3>${value(rel.name,true)}</h3><span class="dossier-contact-player">扮演者 ${value(rel.playedBy)}</span></header><p>${value(rel.description,true)}</p><button class="dossier-relation-route" data-open="relationships" aria-label="${esc(rel.name||'关系人')}连结 ${suppressed?'待填写':rel.connection}">${Array.from({length:10},(_,n)=>`<span class="relation-node ${!suppressed&&n<=(rel.connection??-1)?'is-lit':''} ${n===9?'network-node':''}"><i>${n===0?'△':n===9?'◎':''}</i><b>${n}</b></span>`).join('')}</button><div class="dossier-boon-line"><strong>${value(rel.boon||'连结加成')}</strong><span><i>${!suppressed&&rel.boonActive?'✓':''}</i>激活</span></div>${rel.boon&&!blank?`<p class="dossier-boon">${esc(data.play.relationships.boons.find(x=>x.name===rel.boon)?.effect||'')}</p>`:''}</section>`).join('')+(emergencyInGrid?`<div class="dossier-emergency-slot">${emergency}</div>`:'')+'</div>','r','CONNECTIONS');
    const timeTracks=['c','r','a'].map(k=>timeTrack(a,data,k,{hidden:suppressed})).join('');
    const time=`<div class="dossier-time-panel"><h2>投入时间<span class="mono">30 UNITS</span></h2><div class="dossier-time-tallies"><span>MVP <b>${changing(a.awards.mvp)}</b></span><span>察看期 <b>${changing(a.awards.probation)}</b></span></div>${timeTracks}<div class="dossier-spent"><h3>普通投入 <strong>${changing(a.life.spent)} / 30</strong></h3><div>${Array.from({length:30},(_,i)=>`<i class="${!suppressed&&i<a.life.spent?'is-marked':''}"></i>`).join('')}</div><p>标记所选轨首格，划去另外两轨末格。<br>格中代码对应高墙阅读条目。</p></div></div>`;
    const answer=(title,text,tone='c',code='')=>`<section class="print-answer dossier-answer dossier-${tone}">${pattern(tone)}<h3>${code?`<b class="mono">${code}</b>`:''}<span>${esc(title)}</span></h3><p>${blank?line(true)+line(true):esc(text||'—')}</p></section>`;
    const questionnaireFields=data.questionnaireFields||data.questions.map((question,index)=>({question,index}));
    const questionAnswer=(q,index)=>answer(q.question,q.field?a[q.field]:a.questionnaire[q.index],'c',String(index+1).padStart(2,'0'));
    const numbered=questionnaireFields.map(questionAnswer),split=Math.ceil(numbered.length/2);
    const answers=numbered.slice(0,split).join(''),continuedAnswers=numbered.slice(split).join('');
    const realityQuestions=blank?Array.from({length:3},(_,i)=>answer(`现实入职问题 ${String(i+1).padStart(2,'0')}`,'','r','R'+String(i+1).padStart(2,'0'))).join(''):(reality?.onboarding_questions||[]).map((q,i)=>answer(q,a.realityAnswers[i],'r','R'+String(i+1).padStart(2,'0'))).join('');
    const details=blank?kinds.map(k=>answer(`${names[k]} / 角色细节`,'',k)).join(''):kinds.map(k=>(entry(k)?.initial_character_fields||[]).map(f=>answer(`${names[k]} / ${f.name}`,a.arcDetails[`${k}:${f.id}`],k)).join('')).join('');
    const cls=`print-sheet dossier-sheet dossier-fixed ${blank?'dossier-blank':''} ${hideMutable?'dossier-hidden-mutable':''}`;
    const foot=(n,type)=>`<footer class="print-footer"><span>TRIANGLE AGENCY / ${type}</span><span>${String(n).padStart(2,'0')} / ${String(pageCount).padStart(2,'0')}</span></footer>`;
    const sheets=[`<article class="${cls}" data-dossier-page="1">${head(1)}${arc}<div class="dossier-page-body dossier-field-grid">${fit(resources+qualities+realityBody)}${fit(abilities)}</div>${foot(1,'FIELD RECORD')}</article>`,
      `<article class="${cls}" data-dossier-page="2">${head(2,'工作／生活')}<div class="dossier-page-body dossier-life-grid">${fit(`<div class="dossier-career ${relationColumns>1?'dossier-career-compact':''}">${directive}${behaviors}${requisition}${!blank?a.equipment.map(item=>block(item.name,`<p>${esc(item.effect)}</p>`,'ink','EQUIPMENT')).join(''):''}</div>${contacts}${emergencyInGrid?'':emergency}`,'dossier-second-left')}${fit(time,'dossier-second-right')}</div>${foot(2,'WORK & LIFE')}</article>`,
      `<article class="${cls}" data-dossier-page="3">${head(3,'入职问卷')}<div class="dossier-page-body dossier-question-grid">${fit(block('入职问题',answers,'c','ONBOARDING'))}${fit(block('入职问题 · 续',continuedAnswers,'c','ONBOARDING')+block('现实入职问题',realityQuestions,'r','REALITY')+block('角色细节',details,'a','ARC DETAILS'))}</div>${foot(3,'ONBOARDING')}</article>`];
    for(let i=0;i<historyCount;i++){
      const page=i+4,entries=missions.slice(i*2,i*2+2),summary=i===0?`<p class="mission-archive-summary">${missionStats.completed} 次已完成 · ${missionStats.recorded} 份明细${missionStats.missing?` · ${missionStats.missing} 次旧任务未留存明细`:''}</p>`:'';
      sheets.push(`<article class="${cls} dossier-mission-page" data-dossier-page="${page}">${head(page,'任务档案')}<div class="dossier-page-body dossier-mission-grid">${entries.length?entries.map((r,index)=>fit(`${index===0?summary:''}<section class="dossier-mission-card"><header><b class="mono">${String(r.number).padStart(2,'0')}</b><div><h2>${esc(r.name)}</h2><time>${r.legacy?'旧版结算 / '+esc(r.finishedAt.slice(0,10)):esc(r.beganAt.slice(0,10))+' — '+esc(r.finishedAt.slice(0,10))}</time></div><span>△</span></header>${MV.details(r,a,engine,{hideMutable})}</section>`)).join(''):fit(summary+'<p class="mission-legacy-note">旧版未保存任务明细。</p>')}</div>${foot(page,'MISSION HISTORY')}</article>`);
    }
    return sheets.map(sheet=>framed?`<div class="print-page-frame">${sheet}</div>`:sheet).join('');
  }
  return{render,pattern,trackBoxes,timeTrack};
});
