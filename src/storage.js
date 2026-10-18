(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_STORAGE=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  function retain(storage,key,raw){
    if(!raw)return false;
    try{const backup=key+'.pre-v2.21';if(storage.getItem(backup)===null)storage.setItem(backup,raw);return true;}catch{return false;}
  }
  const clean=(key,value)=>key==='growthLedger'&&Array.isArray(value)?value.filter(row=>!row.revertedAt):value;
  const stringify=value=>JSON.stringify(value,clean);
  function serialize(agent){return JSON.stringify({format:'triangle-agency-workbench',version:2,exportedAt:new Date().toISOString(),agent},clean,2);}
  function persist(storage,key,raw){
    try{storage.setItem(key,raw);return true;}catch{
      try{const backup=key+'.pre-v2.21';if(storage.getItem(backup)===null)return false;storage.removeItem(backup);storage.setItem(key,raw);return true;}catch{return false;}
    }
  }
  return{retain,serialize,persist,stringify};
});
