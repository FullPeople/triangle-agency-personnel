(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_LIVE=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const templates=new WeakMap();
  const runtimeClasses=new Set(['kinetic-frame','frame-action','frame-info','frame-major','motion-hover','motion-exit','long-name','dialog-surface','dialog-moving','motion-stage','rolling']);
  const states=new Set(['active','focused','selected','is-selected','available','debt','three','changed','failure','marked','crossed','filled','spent','locked','disabled','is-confirmed']);
  const decoration=node=>node.nodeType===1&&node.matches('.frame-skin,.nav-marker,.motion-ghost,.motion-slash,.selection-streak');
  function attributes(node){return new Map([...node.attributes].map(a=>[a.name,a.value]));}
  function styles(node){return new Map(Array.from({length:node.style?.length||0},(_,i)=>{const name=node.style.item?.(i)||node.style[i];return[name,[node.style.getPropertyValue(name),node.style.getPropertyPriority?.(name)||'']];}));}
  function record(node){return{attrs:attributes(node),styles:styles(node)};}
  function seed(node){if(node.nodeType===1){templates.set(node,record(node));for(const child of node.childNodes)if(!decoration(child))seed(child);}return node;}
  function key(node){
    if(node.nodeType!==1)return'';
    const own=node.getAttribute('data-live-key')||node.id;
    if(own)return`${node.tagName}:${own}`;
    for(const name of ['data-quality-row','data-resource-card','data-section','data-field','data-question','data-rel','data-detail','data-die','data-assessment','data-behavior','data-resource','data-qa','data-connection','data-relation-modal','data-roll-counter','data-insurance-pay','data-insurance-counter','data-catalog-focus','data-catalog-tab','data-catalog-view','data-load','data-pass','data-action','data-open'])if(node.hasAttribute(name))return`${node.tagName}:${name}:${node.getAttribute(name)}`;
    return'';
  }
  const signature=node=>(node.getAttribute('class')||'').split(/\s+/).find(name=>name&&!states.has(name)&&!runtimeClasses.has(name))||'';
  function compatible(a,b){return a.nodeType===b.nodeType&&(a.nodeType!==1||(a.tagName===b.tagName&&a.namespaceURI===b.namespaceURI&&signature(a)===signature(b)));}
  function syncAttributes(node,next){
    const previous=templates.get(node)||record(node),desired=record(next);
    for(const [name] of previous.attrs)if(!desired.attrs.has(name)&&name!=='class'&&name!=='style')node.removeAttribute(name);
    for(const [name,value] of desired.attrs)if(name!=='class'&&name!=='style'&&node.getAttribute(name)!==value)node.setAttribute(name,value);
    const classes=new Set(next.classList);for(const name of node.classList)if(runtimeClasses.has(name))classes.add(name);
    if(classes.size!==node.classList.length||[...classes].some(name=>!node.classList.contains(name)))node.setAttribute('class',[...classes].join(' '));
    for(const [name] of previous.styles)if(!desired.styles.has(name))node.style.removeProperty(name);
    for(const [name,[value,priority]] of desired.styles)if(node.style.getPropertyValue(name)!==value||(node.style.getPropertyPriority?.(name)||'')!==priority)node.style.setProperty(name,value,priority);
    templates.set(node,desired);
  }
  function patch(node,next){
    if(node.nodeType!==1){if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;return node;}
    syncAttributes(node,next);
    const old=[...node.childNodes].filter(child=>!decoration(child)),remaining=new Set(old),keyed=new Map(old.map(child=>[key(child),child]).filter(([id])=>id));
    if(old.length===1&&old[0].nodeType===1&&old[0].classList.contains('motion-layer')&&![...next.children].some(child=>child.classList.contains('motion-layer'))){const shell=next.ownerDocument.createElement('div');shell.className='motion-layer';for(const child of next.childNodes)shell.append(child.cloneNode(true));patch(old[0],shell);return node;}
    let anchor=node.firstChild;
    const skip=()=>{while(anchor&&decoration(anchor))anchor=anchor.nextSibling;};skip();
    for(const desired of next.childNodes){
      if(decoration(desired))continue;
      const id=key(desired);let current=id?keyed.get(id):remaining.has(anchor)&&!key(anchor)&&compatible(anchor,desired)?anchor:old.find(child=>remaining.has(child)&&!key(child)&&compatible(child,desired));
      if(current&&(!remaining.has(current)||current.nodeType!==desired.nodeType||(current.nodeType===1&&(current.tagName!==desired.tagName||current.namespaceURI!==desired.namespaceURI))))current=null;
      if(!current){current=seed(desired.cloneNode(true));node.insertBefore(current,anchor);}
      else{remaining.delete(current);if(current!==anchor)node.insertBefore(current,anchor);patch(current,desired);}
      anchor=current.nextSibling;skip();
    }
    for(const child of remaining)child.remove();
    if(node.tagName==='INPUT'||node.tagName==='TEXTAREA'){
      const value=next.value;
      if(node.value!==value){const start=node.selectionStart,end=node.selectionEnd,direction=node.selectionDirection;node.value=value;if(typeof start==='number'&&node.setSelectionRange)try{node.setSelectionRange(Math.min(start,value.length),Math.min(end,value.length),direction);}catch{}}
      if(node.tagName==='INPUT'&&node.checked!==next.checked)node.checked=next.checked;
    }
    return node;
  }
  return{seed,patch};
});
