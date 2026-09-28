// 배치도 헥스 툴팁: 마우스 위치의 헥스를 찾아 #maptip 에 내용을, #hxhov 로 강조를 그린다
// SVG <title> 은 쓰지 않는다(브라우저 기본 툴팁과 겹친다). 헥스별 내용은 map.js 의 mapCells
const OVCAT={obstacle:['장애물','들어갈 수 없음 (점프·비행으로 넘을 수 있음)'],difficult:['험지','들어갈 때 이동 2 소모'],
  hazard:['위험 지형','들어가면 피해를 입음'],trap:['함정','들어가면 발동한 뒤 제거'],treasure:['보물','시나리오북의 보물 번호 확인'],
  coin:['돈','루팅으로 획득'],corridor:['통로','방과 방을 잇는 칸'],special:['특수 지형','시나리오 특수 규칙 참고'],
  door:['문',''],fog:['안개',''],other:['기타','']};
function tipItem(it){
  if(it.k==='mon'){
    const m=it.m, t=m[3+pc-2], im=MIMG[m[0]];
    const per=[2,3,4].map((n,i)=>`${n}인 ${m[3+i]?MTL[m[3+i]]:'없음'}`).join(' · ');
    return `<div class="ti">${im?`<img class="mon" src="assets/monsters/${im}.webp" alt="" style="border-color:${MCOL[t]}">`:''}<div>`+
      `<div class="tn">${esc(LMON[m[0]]||'')} <span style="color:${MCOL[t]}">${MTL[t]}</span></div>`+
      `<div class="ts">범례 번호 ${it.num} · ${per}</div></div></div>`;
  }
  if(it.k==='ov'){
    const o=OVN[it.o], im=OIMG[it.o], c=OVCAT[o[0]]||OVCAT.other;
    return `<div class="ti">${im?`<img class="ov" src="assets/overlays/${im}.webp" alt="">`:''}<div>`+
      `<div class="tn">${esc(o[1])}</div><div class="ts">${c[0]}${c[1]?' · '+c[1]:''}</div></div></div>`;
  }
  if(it.k==='fig') return `<div class="ti"><div><div class="tn" style="color:var(--moss)">${esc(it.n)}</div><div class="ts">호위 대상·아군·목표물 — 특수 규칙 참고</div></div></div>`;
  if(it.k==='mark') return `<div class="ti"><div><div class="tn" style="color:var(--blood)">표식 ${esc(it.n)}</div><div class="ts">시나리오북 특수 규칙에서 이 글자를 찾으세요</div></div></div>`;
  if(it.k==='start') return `<div class="ti"><div><div class="tn" style="color:var(--moss)">시작 헥스</div><div class="ts">시나리오 시작 시 캐릭터를 둘 수 있는 칸</div></div></div>`;
  if(it.k==='door') return `<div class="ti"><div><div class="tn" style="color:var(--brass)">${it.pass?'통로':'문'}</div><div class="ts">${it.pass?'방과 방을 잇는 칸':'열면 다음 방이 공개됨'}</div></div></div>`;
  return '';
}
function mapHover(ev){
  const tip=$('#maptip'), svg=$('#mapbody svg'), hov=$('#hxhov');
  const hide=()=>{tip.classList.remove('on'); if(hov) hov.setAttribute('points','')};
  if(!svg||!mapCells||$('#mapbody').classList.contains('dragging')) return hide();
  const pt=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const cells=mapCells.cells, R=HEX_R;
  // 가장 가까운 헥스 중심 찾기 (odd-q)
  let best=null, bd=1e9;
  const cx0=Math.floor((pt.x-R)/COLW);
  for(let x=cx0-1;x<=cx0+2;x++){
    const off=(x&1)?ROWH/2:0, ry=Math.round((pt.y-off-ROWH/2)/ROWH);
    for(let y=ry-1;y<=ry+1;y++){
      const cx=COLW*x+R, cy=ROWH*y+off+ROWH/2, d=(pt.x-cx)**2+(pt.y-cy)**2;
      if(d<bd){bd=d;best=[x,y,cx,cy];}
    }
  }
  const c=best&&cells.get(best[0]+','+best[1]);
  if(!c||bd>R*R) return hide();
  hov.setAttribute('points',hexPoly(best[2],best[3],R*.96));
  const e=LAY[mapCells.id], tile=c.room!=null?((e.p.find(p=>p[4]===c.room)||[])[0]||''):'';
  const head=c.room!=null&&c.room!==0?`방 ${c.room}${tile?' · 타일 '+esc(tile):''}`:'방 밖';
  // 위에 놓인 것부터: 몬스터 > 호위 대상 > 오버레이 > 표식 > 문 > 시작
  const ord={mon:0,fig:1,ov:2,mark:3,door:4,start:5};
  const items=[...c.items].sort((a,b)=>ord[a.k]-ord[b.k]).map(tipItem).join('');
  tip.innerHTML=`<div class="th">${head}</div>`+(items||'<div class="ts">빈 칸</div>');
  tip.classList.add('on');
  const r=tip.getBoundingClientRect();
  let lx=ev.clientX+16, ly=ev.clientY+16;
  if(lx+r.width>innerWidth-8) lx=ev.clientX-r.width-16;
  if(ly+r.height>innerHeight-8) ly=ev.clientY-r.height-16;
  tip.style.left=Math.max(8,lx)+'px'; tip.style.top=Math.max(8,ly)+'px';
}
$('#mapbody').addEventListener('pointermove',mapHover);
$('#mapbody').addEventListener('pointerleave',()=>{$('#maptip').classList.remove('on');const h=$('#hxhov');h&&h.setAttribute('points','')});
$('#mapbody').addEventListener('scroll',()=>$('#maptip').classList.remove('on'));
