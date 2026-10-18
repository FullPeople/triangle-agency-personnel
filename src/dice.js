(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TA_DICE=api;})(typeof window!=='undefined'?window:this,()=>{
  'use strict';
  const DURATION=1510;
  function pose(elapsed,index){
    const delay=index*55,t=Math.max(0,Math.min(1,(elapsed-delay)/1235)),ease=1-Math.pow(1-t,3);
    return{settled:t===1,x:(1-ease)*(Math.PI*5+index*.4)+.32,y:(1-ease)*(Math.PI*7+index*.7)+.48,z:(1-ease)*1.4-.08,lift:Math.sin(t*Math.PI)*-22,progress:t};
  }
  function timeline({raf,caf,now,paint,complete,reduced=false}){
    let frame=0,cancelled=false,finished=false;const start=now();
    const tick=time=>{if(cancelled||finished)return;const elapsed=reduced?DURATION:Math.max(0,time-start);paint(elapsed);if(elapsed>=DURATION){finished=true;complete();}else frame=raf(tick);};
    frame=raf(tick);return()=>{cancelled=true;caf(frame);};
  }
  const vertices=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],faces=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]];
  function rotate(v,p){let[x,y,z]=v;[y,z]=[y*Math.cos(p.x)-z*Math.sin(p.x),y*Math.sin(p.x)+z*Math.cos(p.x)];[x,z]=[x*Math.cos(p.y)+z*Math.sin(p.y),-x*Math.sin(p.y)+z*Math.cos(p.y)];return[x*Math.cos(p.z)-y*Math.sin(p.z),x*Math.sin(p.z)+y*Math.cos(p.z),z];}
  function paint(canvas,elapsed,values){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1),w=rect.width,h=rect.height;
    if(!w||!h)return;const pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const cell=w/6,scale=Math.min(25,cell*.32);
    for(let i=0;i<6;i++){
      const p=pose(elapsed,i),cx=cell*(i+.5),cy=h*.53+p.lift;
      ctx.strokeStyle='#d8d9d5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-cell*.28,h*.84);ctx.lineTo(cx+cell*.28,h*.84);ctx.stroke();
      ctx.fillStyle='#a2a29b';ctx.font='11px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),cx,h*.94);
      const points=vertices.map(v=>rotate(v,p)).map(([x,y,z])=>({x:cx+x*scale*3.4/(3.4+z),y:cy+y*scale*3.4/(3.4+z),z}));
      const ordered=faces.map((f,n)=>({f,n,z:f.reduce((sum,j)=>sum+points[j].z,0)/3})).sort((a,b)=>b.z-a.z);
      ordered.forEach(({f,n,z},rank)=>{
        ctx.beginPath();f.forEach((j,k)=>k?ctx.lineTo(points[j].x,points[j].y):ctx.moveTo(points[j].x,points[j].y));ctx.closePath();
        ctx.fillStyle=rank===3?(p.settled&&values[i]===3?'#e21c3b':'#fcfcf7'):['#e9ece5','#cbd2c8','#f2f3eb'][Math.max(0,rank)];ctx.fill();ctx.strokeStyle=rank===3?'#222b2b':'#939e96';ctx.lineWidth=1.2;ctx.stroke();
        if(rank===3){const x=f.reduce((sum,j)=>sum+points[j].x,0)/3,y=f.reduce((sum,j)=>sum+points[j].y,0)/3;ctx.fillStyle=p.settled&&values[i]===3?'#fff':'#232c2b';ctx.font=`700 ${Math.max(15,scale*.85)}px "Barlow Condensed",sans-serif`;ctx.textBaseline='middle';ctx.fillText(String(p.settled?values[i]:n+1),x,y);ctx.textBaseline='alphabetic';}
      });
      if(p.settled){ctx.strokeStyle='#e21c3b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-cell*.28,h*.84);ctx.lineTo(cx+cell*.28,h*.84);ctx.stroke();}
    }
  }
  let stop=null;
  function cancel(){stop?.();stop=null;}
  function play(canvas,{values,reduced=false,onComplete}){cancel();stop=timeline({raf:requestAnimationFrame,caf:cancelAnimationFrame,now:()=>performance.now(),paint:t=>paint(canvas,t,values),complete:()=>{stop=null;onComplete();},reduced});}
  return{DURATION,pose,timeline,play,cancel};
});
