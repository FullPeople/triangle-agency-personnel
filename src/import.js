(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_IMPORT=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const MAX_BYTES=6*1024*1024;
  function parse(text,engine,catalog){
    let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('json');}
    if(!data||typeof data!=='object'||!data.agent||typeof data.agent!=='object'||Array.isArray(data.agent))throw Error('format');
    if(data.format==='triangle-agency-workbench'&&data.version===2)return engine.sanitizeAgent(data.agent,catalog,1);
    if(data.format==='triangle-agency-personnel'&&data.version===1)return engine.migrateLegacy(data.agent,1);
    throw Error('format');
  }
  async function readFile(file,engine,catalog){
    if(!file||!Number.isFinite(file.size)||file.size===0)throw Error('file');
    if(file.size>MAX_BYTES)throw Error('large');
    if(!/\.json$/i.test(file.name||''))throw Error('file');
    const text=typeof file.text==='function'?await file.text():await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('read'));reader.readAsText(file);});
    return parse(text,engine,catalog);
  }
  function isFileDrag(transfer){
    return Boolean(transfer&&(Array.from(transfer.types||[]).includes('Files')||Array.from(transfer.items||[]).some(item=>item.kind==='file')||transfer.files?.length));
  }
  function attach({document:doc,window:win,indicator,onFiles}){
    let depth=0,active=false;const listeners=[];
    const listen=(target,name,handler)=>{target.addEventListener(name,handler,true);listeners.push(()=>target.removeEventListener(name,handler,true));};
    function paint(show){
      if(show===active)return;active=show;
      if(show){const dialogs=Array.from(doc.querySelectorAll('dialog[open]'));(dialogs[dialogs.length-1]||doc.body).append(indicator);}
      indicator.classList.toggle('is-visible',show);indicator.setAttribute('aria-hidden',String(!show));doc.body.classList.toggle('is-file-drag',show);
    }
    function reset(){depth=0;paint(false);}
    listen(doc,'dragenter',event=>{if(!isFileDrag(event.dataTransfer))return;event.preventDefault();depth++;paint(true);});
    listen(doc,'dragover',event=>{if(!isFileDrag(event.dataTransfer))return;event.preventDefault();event.dataTransfer.dropEffect='copy';paint(true);});
    listen(doc,'dragleave',event=>{if(!active)return;depth=Math.max(0,depth-1);if(!depth||(!event.relatedTarget&&(event.clientX<=0||event.clientY<=0||event.clientX>=win.innerWidth||event.clientY>=win.innerHeight)))reset();});
    listen(doc,'drop',event=>{const fileDrag=isFileDrag(event.dataTransfer),files=Array.from(event.dataTransfer?.files||[]);reset();if(!fileDrag)return;event.preventDefault();if(files.length)onFiles(files);});
    listen(doc,'dragend',reset);listen(win,'blur',reset);
    listen(doc,'keydown',event=>{if(event.key==='Escape')reset();});
    listen(doc,'visibilitychange',()=>{if(doc.hidden)reset();});
    return{reset,detach(){reset();listeners.forEach(remove=>remove());}};
  }
  return{MAX_BYTES,parse,readFile,isFileDrag,attach};
});
