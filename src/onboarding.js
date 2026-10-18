(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_TOUR=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const STEPS=[
    {id:'welcome',label:'建立通讯',text:'欢迎你，特工。简单介绍一下，我是机构研发部门的来福。\n这是我为特工们打造的个人档案登记网站，你可以在这里填写自己的基础档案。'},
    {id:'aside',label:'研发部门',aside:'（说起来，我这也算重复造轮子了吧。我应该获得一个嘉奖。）',text:'噢，不好意思，我走神了。'},
    {id:'scope',label:'使用范围',text:'具体来说，大部分基础内容都可以在这里填写。至于专业知识，还请询问你的部门经理。'},
    {id:'sample',label:'参考档案',text:'首次使用时展示的是我的个人档案。你可以查阅我是如何填写的，也可以直接上手，建立自己的档案。'},
    {id:'library',label:'打开档案库',target:'library',required:true,text:'看到右上角的文件夹了吗？\n请打开它，我们从这里开始建立你的档案。'},
    {id:'create',label:'创建你的档案',target:'create',text:'在档案库中点击“新建档案”，就能填写你的内容。每份档案独立保存。\n你的填写内容只存储在本地浏览器，不会上传机构的服务器。'},
    {id:'export',label:'保存与携带',target:'export',text:'在这里可以打印标准 A4 卡，保存 PDF 或高清 A4 图片，也能导出 JSON 数据。\n换浏览器或换设备时，记得带上导出的 JSON 档案。'},
    {id:'settings',label:'随时再联系',target:'settings',text:'设置里有开源地址、动效开关和新手教程。\n如果想再次听我介绍，点击“新手教程”就可以了。'},
    {id:'farewell',label:'通讯结束',text:'那么，希望你的任务顺利，特工。'}
  ];
  function createSession(){let index=0,active=false;const passed=new Set();return{start(){index=0;active=true;passed.clear();},current:()=>STEPS[index],index:()=>index,active:()=>active,canNext:()=>!STEPS[index].required||passed.has(STEPS[index].id),acknowledge(id){if(active&&STEPS[index].id===id)passed.add(id);},next(){if(!active||!this.canNext())return false;if(index===STEPS.length-1){active=false;return true;}index++;return true;},back(){if(active&&index>0)index--;},stop(){active=false;}};}
  function veil(rect,width,height){if(!rect)return[{left:0,top:0,width,height}];const x=Math.min(width,Math.max(0,rect.left-7)),y=Math.min(height,Math.max(0,rect.top-7)),right=Math.max(x,Math.min(width,rect.right+7)),bottom=Math.max(y,Math.min(height,rect.bottom+7));return[{left:0,top:0,width,height:y},{left:0,top:bottom,width,height:Math.max(0,height-bottom)},{left:0,top:y,width:x,height:bottom-y},{left:right,top:y,width:Math.max(0,width-right),height:bottom-y}];}
  function mount({document:doc,window:win,root,avatar,prepare=()=>{},resolveTarget=()=>null,onFinish=()=>{}}){
    const session=createSession();let revision=0,busy=false,frame=0,previousFocus=null;
    root.innerHTML='<div class="tour-shade" aria-hidden="true">'+Array.from({length:4},()=>'<i></i>').join('')+'</div><div class="tour-focus" aria-hidden="true"><b>↘</b><span></span></div><section class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-speaker"><div class="tour-portrait"><img alt="来福的头像"><span class="tour-avatar-orbit" aria-hidden="true"></span><span class="mono">R&D / 03</span></div><div class="tour-speech"><header><span class="tour-online" aria-hidden="true"></span><strong id="tour-speaker">来福</strong><small>研发部门</small><span class="mono tour-counter"></span></header><div class="tour-chapter mono"></div><div class="tour-copy" aria-live="polite"><p class="tour-aside"></p><p class="tour-text"></p></div><footer><button class="tour-skip" type="button">稍后</button><button class="tour-back" type="button" aria-label="上一句">←</button><button class="tour-next" type="button">继续 →</button></footer></div></section>';
    const image=root.querySelector('.tour-portrait img');image.src=avatar||'';image.hidden=!avatar;
    const nodes={counter:root.querySelector('.tour-counter'),chapter:root.querySelector('.tour-chapter'),aside:root.querySelector('.tour-aside'),text:root.querySelector('.tour-text'),next:root.querySelector('.tour-next'),back:root.querySelector('.tour-back'),focus:root.querySelector('.tour-focus'),card:root.querySelector('.tour-card')};
    function refresh(){
      frame=0;if(!session.active()||busy)return;
      const step=session.current(),dialogs=Array.from(doc.querySelectorAll('dialog[open]:not(.is-closing)')),host=dialogs[dialogs.length-1]||doc.body;
      if(root.parentElement!==host)host.append(root);
      const target=resolveTarget(step.target),r=target?.getBoundingClientRect();const rect=r&&r.width>0&&r.height>0?r:null;
      const areas=veil(rect,win.innerWidth,win.innerHeight);root.querySelectorAll('.tour-shade>i').forEach((node,i)=>{const area=areas[i];node.hidden=!area;if(area)Object.assign(node.style,Object.fromEntries(Object.entries(area).map(([k,v])=>[k,v+'px'])));});
      nodes.focus.hidden=!rect;
      if(rect){Object.assign(nodes.focus.style,{left:rect.left-7+'px',top:rect.top-7+'px',width:rect.width+14+'px',height:rect.height+14+'px'});nodes.focus.querySelector('span').textContent=step.id==='library'?'打开档案库':step.label;}
      root.dataset.position=rect&&rect.top>win.innerHeight*.55?'top':'bottom';
    }
    function schedule(){if(!frame)frame=win.requestAnimationFrame(refresh);}
    async function paint(){
      const token=++revision;busy=true;nodes.next.disabled=true;nodes.card.setAttribute('aria-busy','true');
      const step=session.current();await prepare(step);if(token!==revision||!session.active())return;
      nodes.counter.textContent=String(session.index()+1).padStart(2,'0')+' / '+String(STEPS.length).padStart(2,'0');nodes.chapter.textContent=step.label;nodes.aside.textContent=step.aside||'';nodes.aside.hidden=!step.aside;nodes.text.textContent=step.text;nodes.back.disabled=session.index()===0;nodes.next.disabled=!session.canNext();nodes.next.textContent=step.required&&!session.canNext()?'请先打开文件夹':session.index()===STEPS.length-1?'结束通讯 ✓':'继续 →';
      root.dataset.step=step.id;nodes.card.removeAttribute('aria-busy');resolveTarget(step.target)?.scrollIntoView?.({block:'nearest',behavior:'auto'});busy=false;refresh();
      nodes.card.classList.remove('tour-speaking');void nodes.card.offsetWidth;nodes.card.classList.add('tour-speaking');
      (step.required?resolveTarget(step.target):nodes.next)?.focus?.({preventScroll:true});
    }
    function finish(){if(!session.active())return;revision++;session.stop();root.hidden=true;doc.body.classList.remove('tutorial-open');onFinish();previousFocus?.focus?.({preventScroll:true});}
    function next(){if(busy||!session.canNext())return;if(session.index()===STEPS.length-1){finish();return;}session.next();paint();}
    root.querySelector('.tour-skip').addEventListener('click',finish);nodes.next.addEventListener('click',next);nodes.back.addEventListener('click',()=>{if(!busy){session.back();paint();}});
    root.addEventListener('click',event=>event.stopPropagation());
    doc.addEventListener('click',event=>{if(!session.active()||busy||root.contains(event.target))return;const step=session.current();if(step.id==='library'&&event.target.closest('[data-open="library"]')&&doc.querySelector('#sheet[open] .library-row')){session.acknowledge('library');next();}else schedule();});
    doc.addEventListener('keydown',event=>{if(!session.active())return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish();}else if(event.key==='Tab'){const target=resolveTarget(session.current().target);const allowed=[target,...root.querySelectorAll('button:not(:disabled)')].filter(Boolean);const current=allowed.indexOf(doc.activeElement),nextIndex=(current+(event.shiftKey?-1:1)+allowed.length)%allowed.length;event.preventDefault();allowed[nextIndex]?.focus();}},true);
    win.addEventListener('resize',schedule,{passive:true});doc.addEventListener('scroll',schedule,{capture:true,passive:true});
    const observer=new win.MutationObserver(schedule);observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open']});
    return{start(){previousFocus=doc.activeElement;session.start();root.hidden=false;doc.body.classList.add('tutorial-open');paint();},refresh:schedule,finish,active:()=>session.active()};
  }
  return{STEPS,createSession,veil,mount};
});
