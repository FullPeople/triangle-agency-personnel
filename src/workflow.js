(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_WORKFLOW=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const empty=value=>!String(value??'').trim();
  function entries(agent,catalog,questions=[]){
    const rows={identity:[],arc:[],qa:[],relations:[],questionnaire:[]};
    const add=(section,key,missing)=>rows[section].push({key,missing:Boolean(missing)});
    for(const key of ['name','pronouns','contact','contactRelation','contactMethod'])add('identity',key,empty(agent[key]));
    add('identity','fingerprint',agent.fingerprintConfirmed!==true);
    for(const kind of ['a','r','c']){
      const entry=catalog[kind].find(e=>e.id===agent.arc[kind]);add('arc',`arc:${kind}`,!entry);
      for(const f of entry?.initial_character_fields||[])add('arc',`detail:${kind}:${f.id}`,empty(agent.arcDetails[`${kind}:${f.id}`]));
      if(kind==='c'&&typeof entry?.prime_directive?.violation==='object')add('arc','directive',agent.directiveChoice===null);
    }
    for(let i=0;i<3;i++){add('arc',`assessment:${i}`,![0,1].includes(agent.answers[i]));add('qa',`assessment:${i}`,![0,1].includes(agent.answers[i]));}
    add('qa','arc:a',!agent.arc.a);
    add('relations','arc:r',!agent.arc.r);
    agent.relationships.slice(0,3).forEach((rel,i)=>{for(const key of ['name','playedBy','description'])add('relations',`relation:${i}:${key}`,empty(rel[key]));});
    const reality=catalog.r.find(e=>e.id===agent.arc.r);
    (reality?.onboarding_questions||[]).forEach((_,i)=>add('relations',`reality:${i}`,empty(agent.realityAnswers[i])));
    add('questionnaire','arc:c',!agent.arc.c);
    questions.forEach((q,i)=>{const descriptor=typeof q==='string'?{index:i}:q;add('questionnaire',descriptor.field?`field:${descriptor.field}`:`question:${descriptor.index}`,empty(descriptor.field?agent[descriptor.field]:agent.questionnaire[descriptor.index]));});
    return rows;
  }
  function counts(agent,catalog,questions){return Object.fromEntries(Object.entries(entries(agent,catalog,questions)).map(([key,items])=>[key,items.filter(x=>x.missing).length]));}
  function progress(agent,catalog,questions){const unique=new Map(Object.values(entries(agent,catalog,questions)).flat().map(row=>[row.key,row]));return Math.round([...unique.values()].filter(row=>!row.missing).length/Math.max(1,unique.size)*100);}
  function arcCounts(agent,catalog){const result={a:0,r:0,c:0};for(const row of entries(agent,catalog).arc){if(!row.missing)continue;const kind=row.key.startsWith('arc:')||row.key.startsWith('detail:')?row.key.split(':')[1]:'c';result[kind]++;}return result;}
  return{entries,counts,progress,arcCounts};
});
