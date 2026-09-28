// 헥스 배치도 팝업(#mapwrap). 데이터는 data/layout.js 의 LAY·TIMG·LMON·MIMG·OVN·OIMG·OPARTS
// 좌표계: odd-q 오프셋(홀수 열이 반 칸 아래), 헥스 외접반지름 45px. 자세한 규칙은 CLAUDE.md §4-C

const OVC={obstacle:'var(--muted)',difficult:'var(--frost)',hazard:'var(--blood)',trap:'var(--blood)',
           treasure:'var(--brass)',coin:'var(--brass)',corridor:'var(--line)',special:'var(--frost)',
           door:'var(--brass)',fog:'var(--muted)',other:'var(--muted)'};
const MCOL=[null,'var(--frost)','var(--brass)','var(--blood)'];   // 몬스터 등급색: 일반·정예·보스
const MTL=[null,'일반','정예','보스'];
let mapZoom=1, mapId=null, mapGrid=true;

// ---------- 헥스 기하 ----------
const HEX_R=45, COLW=67.5, ROWH=Math.sqrt(3)*45;
const hexPx=(x,y)=>[COLW*x, ROWH*y+((x&1)?ROWH/2:0)];                 // 헥스 좌상단
const hexCenter=(x,y)=>{const a=hexPx(x,y); return [a[0]+HEX_R, a[1]+ROWH/2]};
const hexPoly=(cx,cy,r)=>{let s='';for(let i=0;i<6;i++){const a=Math.PI/3*i;s+=(cx+r*Math.cos(a))+','+(cy+r*Math.sin(a))+' ';}return s.trim()};

// 범례 번호: 몬스터 종류가 처음 나온 순서대로 1, 2, 3…
function monIndex(e){
  const seen=new Map();
  for(const m of (e.m||[])) if(!seen.has(m[0])) seen.set(m[0],seen.size+1);
  return seen;
}

// 바닥 헥스 [방 번호, x, y] (LAY.f 는 방별 열 런렝스)
function floorHexes(e){
  const floors=[];
  for(const rn in e.f) for(const run of e.f[rn]){const [x,y0,n]=run; for(let i=0;i<n;i++) floors.push([+rn,x,y0+i]);}
  return floors;
}

// 헥스별 내용 (마우스 오버 툴팁용, maptip.js 가 읽는다)
let mapCells=null;
function collectCells(e,floors,k,NUM){
  const cells=new Map(), cell=(x,y)=>{const kk=x+','+y; if(!cells.has(kk)) cells.set(kk,{room:null,items:[]}); return cells.get(kk)};
  for(const f of floors) cell(f[1],f[2]).room=f[0];
  for(const s of (e.s||[])) cell(s[0],s[1]).items.push({k:'start'});
  for(const d of (e.d||[])) cell(d[1],d[2]).items.push({k:'door',pass:d[0]});
  for(const v of (e.v||[])) for(const q of [[v[1],v[2]],...(v[3]||[])]) cell(q[0],q[1]).items.push({k:'ov',o:v[0]});
  for(const m of (e.m||[])) if(m[3+k]) cell(m[1],m[2]).items.push({k:'mon',m,num:NUM.get(m[0])});
  for(const g of (e.g||[])) cell(g[1],g[2]).items.push({k:'fig',n:g[0]});
  for(const q of (e.k||[])) cell(q[1],q[2]).items.push({k:'mark',n:q[0]});
  return cells;
}

// 그림 범위: 바닥 헥스와 (회전한) 타일 이미지를 모두 덮는 사각형 + 여백
function mapBounds(e,floors){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const grow=(a,b,c,d)=>{if(a<x0)x0=a; if(b<y0)y0=b; if(c>x1)x1=c; if(d>y1)y1=d};
  for(const f of floors){const a=hexPx(f[1],f[2]); grow(a[0],a[1],a[0]+2*HEX_R,a[1]+ROWH);}
  for(const p of e.p){
    const t=TIMG[p[0]]; if(!t) continue;
    const w=t[1], h=t[2], rot=p[3]*Math.PI/180;
    const W=Math.abs(w*Math.cos(rot))+Math.abs(h*Math.sin(rot));
    const H=Math.abs(w*Math.sin(rot))+Math.abs(h*Math.cos(rot));
    const cx=p[1]+w/2, cy=p[2]+h/2;
    grow(cx-W/2,cy-H/2,cx+W/2,cy+H/2);
  }
  const pad=26;
  return [x0-pad,y0-pad,x1+pad,y1+pad];
}

// ---------- 층별 SVG ----------
// 타일 이미지 (공식 배치 그대로)
function tilesSvg(e){
  let g='';
  for(const p of e.p){
    const t=TIMG[p[0]]; if(!t) continue;
    const ix=p[1], iy=p[2], w=t[1], h=t[2], rot=p[3];
    g+=`<image href="assets/tiles/${t[0]}" x="${ix}" y="${iy}" width="${w}" height="${h}"`+
       (rot?` transform="rotate(${rot} ${ix+w/2} ${iy+h/2})"`:'')+
       ` style="image-rendering:auto"></image>`;
  }
  return g;
}

// 여러 헥스 장애물: 조각 그림(꼭짓점이 위 기준 2칸=[왼,오], 3칸=[왼위,오위,아래])을 칸을 잇는 방향으로 돌려 맞붙인다
const ang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
const near=(x,y)=>Math.abs(((x-y)%360+540)%360-180)<8;
const piece=(f,c,deg)=>`<image href="assets/overlays/${f}.webp" x="${c[0]-ROWH/2}" y="${c[1]-HEX_R}" width="${ROWH}" height="${2*HEX_R}" transform="rotate(${deg} ${c[0]} ${c[1]})"/>`;
function multiHexSvg(v){
  const hs=[[v[1],v[2]],...v[3]], cs=hs.map(q=>hexCenter(q[0],q[1])), set=(OPARTS[v[0]]||{})[hs.length];
  if(!set) return '';
  if(hs.length===2){const d=ang(cs[0],cs[1]); return piece(set[0],cs[0],d)+piece(set[1],cs[1],d);}
  for(const [l,r,b] of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
    const d=ang(cs[l],cs[r]);
    if(near(ang(cs[l],cs[b]),d+60)) return piece(set[0],cs[l],d)+piece(set[1],cs[r],d)+piece(set[2],cs[b],d);
  }
  return '';
}
// 한 칸 오버레이: 그림(OIMG)이 있으면 그림, 없으면 색 도형
function overlayHexSvg(oi,x,y){
  const o=OVN[oi], col=OVC[o[0]]||'var(--muted)', c=hexCenter(x,y), im=OIMG[oi];
  if(im&&o[0]==='coin'){const r=HEX_R*0.62;
    return `<image href="assets/overlays/${im}.webp" x="${c[0]-r}" y="${c[1]-r}" width="${2*r}" height="${2*r}"></image>`;}
  if(im){
    // 원본은 꼭짓점이 위인 헥스라 90도 돌려 변이 위인 격자에 맞춘다 (높이 = 헥스 지름)
    const w=ROWH, h=2*HEX_R;
    return `<image href="assets/overlays/${im}.webp" x="${c[0]-w/2}" y="${c[1]-h/2}" width="${w}" height="${h}" transform="rotate(90 ${c[0]} ${c[1]})"></image>`;}
  if(o[0]==='coin'||o[0]==='treasure')
    return `<circle class="ov" cx="${c[0]}" cy="${c[1]}" r="${HEX_R*0.34}" style="fill:${col}"></circle>`;
  return `<polygon class="ov" points="${hexPoly(c[0],c[1],HEX_R*0.8)}" style="fill:${col};opacity:${o[0]==='obstacle'?0.8:0.45}"></polygon>`;
}
function overlaysSvg(e){
  let g='';
  for(const v of (e.v||[])){
    if(v[3]){const m=multiHexSvg(v); if(m){g+=m;continue;}}
    for(const q of [[v[1],v[2]],...(v[3]||[])]) g+=overlayHexSvg(v[0],q[0],q[1]);   // 조각 그림이 없으면 칸마다 1칸 그림
  }
  return g;
}

// 몬스터: 초상이 있으면 원형 초상 + 등급색 테두리 + 번호 뱃지, 없으면 등급색 원 + 번호
function monstersSvg(e,k,NUM){
  let g='';
  for(const m of (e.m||[])){
    const t=m[3+k]; if(!t) continue;
    const c=hexCenter(m[1],m[2]), im=MIMG[m[0]];
    if(im){
      const r=HEX_R*0.7, bx=c[0]+r*0.72, by=c[1]+r*0.72;
      g+=`<g><circle cx="${c[0]}" cy="${c[1]}" r="${r}" style="fill:var(--panel2)"/>`+
         `<image href="assets/monsters/${im}.webp" x="${c[0]-r}" y="${c[1]-r}" width="${2*r}" height="${2*r}" clip-path="url(#mclip)"/>`+
         `<circle class="mring" cx="${c[0]}" cy="${c[1]}" r="${r}" style="stroke:${MCOL[t]}"/>`+
         `<circle cx="${bx}" cy="${by}" r="12" style="fill:${MCOL[t]};stroke:#0b0e0f;stroke-width:2"/>`+
         `<text class="mlab" x="${bx}" y="${by}" style="font-size:12px">${NUM.get(m[0])}</text>`;
    } else
    g+=`<g><circle cx="${c[0]}" cy="${c[1]}" r="${HEX_R*0.62}" style="fill:${MCOL[t]};stroke:#0b0e0f;stroke-width:2.5"/>`+
       `<text class="mlab" x="${c[0]}" y="${c[1]}">${NUM.get(m[0])}</text>`;
    g+=`</g>`;
  }
  return g;
}

// 방 라벨: 방마다 가장 위(같으면 왼쪽) 헥스 위에 '방 N · 타일'
function roomLabelsSvg(e,floors){
  let g='';
  const byroom={};
  for(const f of floors){(byroom[f[0]]=byroom[f[0]]||[]).push(f);}
  for(const rn in byroom){
    if(rn==='0') continue;
    let top=byroom[rn][0];
    for(const f of byroom[rn]){const a=hexPx(f[1],f[2]), b=hexPx(top[1],top[2]); if(a[1]<b[1]||(a[1]===b[1]&&a[0]<b[0])) top=f;}
    const c=hexCenter(top[1],top[2]);
    const tile=(e.p.find(x=>x[4]===+rn)||[])[0]||'';
    const txt=`방 ${rn}${tile?' · '+tile:''}`, w=txt.length*8+14;
    g+=`<g><rect class="rbadge" x="${c[0]-w/2}" y="${c[1]-ROWH/2-24}" width="${w}" height="20" rx="10"/>`+
       `<text class="rbtxt" x="${c[0]}" y="${c[1]-ROWH/2-14}" text-anchor="middle">${esc(txt)}</text></g>`;
  }
  return g;
}

function mapSvg(id){
  const e=LAY[id]; if(!e) return '';
  const NUM=monIndex(e), k=pc-2, floors=floorHexes(e);
  mapCells={cells:collectCells(e,floors,k,NUM),id};
  const [x0,y0,x1,y1]=mapBounds(e,floors);

  let g=tilesSvg(e);
  // 헥스 격자 (옅게)
  if(mapGrid) for(const f of floors){const c=hexCenter(f[1],f[2]); g+=`<polygon class="hxg" points="${hexPoly(c[0],c[1],HEX_R*0.99)}"/>`;}
  // 문·통로
  for(const d of (e.d||[])){const c=hexCenter(d[1],d[2]);
    g+=`<polygon class="hxd" points="${hexPoly(c[0],c[1],HEX_R*0.9)}" transform="rotate(${d[3]} ${c[0]} ${c[1]})"></polygon>`;}
  g+=overlaysSvg(e);
  // 시작 헥스 — 통로 오버레이보다 위에 그려 흐려지지 않게 한다
  // 공식 시작 위치 토큰처럼: 밝은 헥스 + 녹색 테두리 + 문으로 들어가는 화살표 (그림은 회전하지 않음)
  for(const s of (e.s||[])){const c=hexCenter(s[0],s[1]), iw=HEX_R*0.95, ih=iw*82/84;
    g+=`<polygon class="hxs" points="${hexPoly(c[0],c[1],HEX_R*0.86)}"/>`+
       `<image href="assets/overlays/start.webp" x="${c[0]-iw/2}" y="${c[1]-ih/2}" width="${iw}" height="${ih}"/>`;}
  g+=monstersSvg(e,k,NUM);
  // 호위 대상·아군 (datahaven figures)
  for(const f of (e.g||[])){const c=hexCenter(f[1],f[2]), r=HEX_R*0.6;
    g+=`<g><circle class="fig" cx="${c[0]}" cy="${c[1]}" r="${r}"/><text class="figt" x="${c[0]}" y="${c[1]}">${esc(f[0].slice(0,2))}</text></g>`;}
  // 시나리오 표식 글자(a·b·1…) — 헥스 위쪽에 작은 뱃지로 (같은 칸의 몬스터·장애물을 가리지 않게)
  for(const q of (e.k||[])){const c=hexCenter(q[1],q[2]), bx=c[0]-HEX_R*0.45, by=c[1]-ROWH*0.3;
    g+=`<g><circle class="mk" cx="${bx}" cy="${by}" r="11"/><text class="mkt" x="${bx}" y="${by}">${esc(q[0])}</text></g>`;}
  g+=roomLabelsSvg(e,floors);
  // 마우스가 올라간 헥스 강조 (위치는 maptip.js 가 옮긴다)
  g+=`<polygon id="hxhov" class="hxhov" points=""/>`;
  const W=x1-x0, H=y1-y0;
  return `<svg width="${W*mapZoom}" height="${H*mapZoom}" viewBox="${x0} ${y0} ${W} ${H}" role="img" aria-label="헥스 배치도">`+
    `<defs><clipPath id="mclip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>${g}</svg>`;
}

function mapLegend(id){
  const e=LAY[id], k=pc-2, NUM=monIndex(e);
  const mc=new Map(), ov=new Map();
  for(const m of (e.m||[])){const t=m[3+k]; if(!t)continue; const key=m[0]+'|'+LMON[m[0]]+'|'+t; mc.set(key,(mc.get(key)||0)+1);}
  for(const v of (e.v||[])) ov.set(v[0],(ov.get(v[0])||0)+1);   // 여러 헥스 장애물도 한 항목 = 1개
  let h='';
  for(const ent of [...mc].sort((a,b)=>b[1]-a[1])){
    const [mi,nm,t]=ent[0].split('|');
    const im=MIMG[+mi];
    h+=`<span>${im?`<img class="lgimg" src="assets/monsters/${im}.webp" alt="">`:''}<i style="background:${MCOL[t]};color:#0b0e0f;font:700 11px var(--sans);text-align:center;line-height:17px">${NUM.get(+mi)}</i>${esc(nm)} ${MTL[t]} ×${ent[1]}</span>`;
  }
  for(const ent of [...ov].sort((a,b)=>b[1]-a[1])){
    const o=OVN[ent[0]];
    const im=OIMG[ent[0]];
    h+=`<span>${im?`<img class="lgov" src="assets/overlays/${im}.webp" alt="">`:`<b style="background:${OVC[o[0]]||'var(--muted)'};opacity:.85"></b>`}${esc(o[1])} ×${ent[1]}</span>`;
  }
  const fc=new Map(); for(const f of (e.g||[])) fc.set(f[0],(fc.get(f[0])||0)+1);
  for(const [n,c] of fc) h+=`<span><i style="background:var(--moss)"></i>${esc(n)} ×${c}</span>`;
  if((e.k||[]).length) h+=`<span><i style="background:var(--blood);color:var(--panel);font:700 10px var(--sans);text-align:center;line-height:17px">a</i>시나리오 표식</span>`;
  if((e.s||[]).length) h+=`<span><img class="lgov" src="assets/overlays/start.webp" alt="" style="transform:none;background:var(--node);border:2px solid var(--moss);border-radius:4px;padding:2px">시작 헥스 ${e.s.length}</span>`;
  return h;
}

// ---------- 열기·닫기·다시 그리기 ----------
function setMapZoom(z){
  mapZoom=z;
  const svg=$('#mapbody svg'); if(!svg) return;
  const vb=svg.viewBox.baseVal;
  svg.setAttribute('width',vb.width*z); svg.setAttribute('height',vb.height*z);
}
function fitMap(){
  const b=$('#mapbody'), svg=b.querySelector('svg');
  if(!svg) return;
  const vb=svg.viewBox.baseVal;
  setMapZoom(Math.max(.2,Math.min(1.4,Math.min((b.clientWidth-32)/vb.width,(b.clientHeight-32)/vb.height))));
}

function drawMap(fit){
  if(mapId==null) return;
  $('#mapbody').innerHTML=mapSvg(mapId);
  if(fit) fitMap();
  $('#maplg').innerHTML=mapLegend(mapId);
  const w=LAY[mapId].n; $('#mapwarn').hidden=!w; $('#mapwarn').textContent=w?'⚠ '+w:'';
  $('#mappc').innerHTML=[2,3,4].map(n=>`<button data-mpc="${n}" aria-pressed="${n===pc}">${n}인</button>`).join('');
}

function openMap(id){
  if(!LAY[id]) return;
  mapId=id; mapZoom=1;
  $('#mapttl').textContent=`${id}. ${S[id].ko}`;
  $('#mapsub').textContent=`${S[id].en} · 헥스 배치도`;
  $('#mapwrap').classList.add('on');
  drawMap(true);
}
function closeMap(){$('#mapwrap').classList.remove('on'); $('#maptip').classList.remove('on'); mapId=null}

$('#mappc').onclick=ev=>{const b=ev.target.closest('[data-mpc]'); if(!b) return; pc=+b.dataset.mpc; store.set('gh-pc',pc); drawMap();};
$('#mapclose').onclick=closeMap;
$('#mapwrap').onclick=ev=>{if(ev.target===$('#mapwrap')) closeMap()};   // 배치도는 바깥을 눌러도 닫힌다
$('#mapgrid').onclick=()=>{mapGrid=!mapGrid;$('#mapgrid').setAttribute('aria-pressed',mapGrid);drawMap()};
$('#mapzin').onclick=()=>{mapZoom=Math.min(3,mapZoom*1.25); drawMap()};
$('#mapzout').onclick=()=>{mapZoom=Math.max(.35,mapZoom/1.25); drawMap()};
