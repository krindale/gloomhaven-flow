// 마우스 드래그로 스크롤 이동, Shift+휠로 커서 위치 기준 확대/축소
// getZ/setZ 를 생략하면 드래그만 한다. 5px 넘게 움직인 드래그 뒤의 클릭은 무시한다
function panZoom(el,getZ,setZ,min,max){
  el.classList.add('pannable');
  let d=null, moved=false;
  el.addEventListener('pointerdown',ev=>{
    if(ev.pointerType!=='mouse'||ev.button!==0) return;
    ev.preventDefault();                                  // 기본 동작(텍스트 선택 시작)을 막는다. 클릭은 그대로 발생한다
    try{getSelection().removeAllRanges()}catch(e){}
    d={x:ev.clientX,y:ev.clientY,l:el.scrollLeft,t:el.scrollTop,id:ev.pointerId}; moved=false;
  });
  el.addEventListener('pointermove',ev=>{
    if(!d||ev.pointerId!==d.id) return;
    const dx=ev.clientX-d.x, dy=ev.clientY-d.y;
    if(!moved&&Math.hypot(dx,dy)<5) return;
    if(!moved){moved=true;el.classList.add('dragging');try{el.setPointerCapture(d.id)}catch(e){}}
    el.scrollLeft=d.l-dx; el.scrollTop=d.t-dy;
  });
  const end=()=>{if(!d)return;d=null;el.classList.remove('dragging')};
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end);
  // 드래그로 끝난 경우 노드 클릭으로 처리되지 않게 막는다
  el.addEventListener('click',ev=>{if(moved){ev.stopImmediatePropagation();ev.preventDefault();moved=false}},true);
  if(getZ) el.addEventListener('wheel',ev=>{
    if(!ev.shiftKey) return;
    ev.preventDefault();
    const dv=ev.deltaY||ev.deltaX; if(!dv) return;   // macOS 는 Shift+휠을 가로 스크롤(deltaX)로 바꿔 보낸다
    const z0=getZ(), z1=Math.min(max,Math.max(min,z0*(dv<0?1.15:1/1.15))); if(z1===z0) return;
    const r=el.getBoundingClientRect(), px=ev.clientX-r.left, py=ev.clientY-r.top;
    const fx=(el.scrollLeft+px)/el.scrollWidth, fy=(el.scrollTop+py)/el.scrollHeight;
    setZ(z1);
    el.scrollLeft=fx*el.scrollWidth-px; el.scrollTop=fy*el.scrollHeight-py;
  },{passive:false});
}
