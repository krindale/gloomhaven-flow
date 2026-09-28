// 캠페인 지도 팝업: 원본 지도에 실물처럼 스티커를 붙인다(gloomhaven-storyline 의 스티커 그림).
// 해금된 시나리오 = 스티커, 클리어 = 체크된 스티커, 얻은 전역 업적 = 위쪽 점선 칸의 깃발 스티커. 좌표는 data/world.js
// 그림은 팝업을 처음 열 때 불러온다(지도를 안 여는 사람은 받지 않게)
let wz=.5, worldBuilt=false;
const worldOpen=()=>$('#worldwrap').classList.contains('on');
const STK='assets/stickers/';

function buildWorld(){
  const {w,h}=WMAP;
  let s=`<svg id="wsvg" viewBox="0 0 ${w} ${h}" role="img" aria-label="글룸헤이븐 캠페인 지도"><image href="${WMAP.img}" width="${w}" height="${h}"/><g id="wach"></g><g id="wstk">`;
  // 스티커 층: 스티커 안 번호 동그라미(WSTK 의 cx,cy)를 지도에 인쇄된 번호 자리(WPOS)에 겹친다
  for(const [id,[x,y]] of Object.entries(WPOS)){
    const [sw,sh,cx,cy]=WSTK[id], at=`x="${(x-cx).toFixed(1)}" y="${(y-cy).toFixed(1)}" width="${sw}" height="${sh}"`;
    s+=`<g class="wsk" data-id="${id}"><image class="u" href="${STK}s${id}.webp" ${at}/><image class="c" href="${STK}s${id}_c.webp" ${at}/></g>`;
  }
  s+='</g>';
  // 표식 층(스티커 위): 진행 가능·고르기·막힘·선택 고리. 번호 자리만 덮는다
  for(const [id,[x,y]] of Object.entries(WPOS)){
    const t=S[id];
    s+=`<g class="wm" data-id="${id}" tabindex="0" role="button" aria-label="${id}번 ${esc(t.ko)}" transform="translate(${x},${y})">
      <g class="wmi"><circle class="ha" r="22"/><circle class="sr" r="27"/><circle class="ring" r="19"/><circle class="dot" r="15"/><text class="wn">${id}</text><path class="wx" d="M-13,-13L13,13M13,-13L-13,13"/></g>
      <title>${id}. ${esc(t.ko)} (${esc(t.en)})</title></g>`;
  }
  $('#world').innerHTML=s+'</svg>';
  $('#world').querySelectorAll('.wm').forEach(g=>g.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();worldPick(+g.dataset.id)}}));
  worldBuilt=true;
}
// 표식 배율 --wk: 화면에서 클리어 원 지름이 최소 약 16px 이 되게(지도 원래 크기 이상에선 1배)
function applyWZoom(){const s=$('#wsvg');if(s){s.style.width=WMAP.w*wz+'px';s.style.height=WMAP.h*wz+'px';s.style.setProperty('--wk',Math.max(1,.55/wz).toFixed(3));s.classList.toggle('small',wz<.55)}}
const setWZoom=z=>{wz=Math.min(1.5,Math.max(.1,z));applyWZoom()};
// 팝업을 지도 크기에 딱 맞춘다: 화면에 들어가는 가장 큰 배율로 지도 전체를 보이고, 지도 칸(#world) 크기를 그 크기로 고정한다.
// 이후 +/− 로 확대하면 이 칸 안에서 스크롤한다
function fitWorld(){
  const box=$('#worldwrap .mapbox'), b=$('#world');   // box: 머리줄·지도·범례·출처를 담은 상자
  // 범례 줄은 지도 폭에 따라 줄바꿈이 달라져 높이가 바뀐다. 가장 큰 크기에서 시작해 몇 번 다시 잰다
  const set=z=>{wz=z;b.style.width=Math.floor(WMAP.w*z)+'px';b.style.height=Math.floor(WMAP.h*z)+'px'};
  const fw=wfull()?1:.96, fh=wfull()?1:.94, bd=wfull()?0:2;               // 전체화면은 여백·테두리 없이 화면 전체
  set(Math.min((innerWidth*fw-bd)/WMAP.w,innerHeight*fh/WMAP.h));
  for(let i=0;i<3;i++){
    // 머리줄·범례·출처 줄 높이. 상자가 max-height 에 걸려 잘릴 수 있어 상자 높이가 아니라 줄마다 더한다
    const chrome=[...box.children].filter(x=>!x.classList.contains('wstage')).reduce((s,x)=>s+x.offsetHeight,0);
    const aw=innerWidth*fw-bd, ah=innerHeight*fh-chrome-bd;
    set(Math.max(.05,Math.min(aw/WMAP.w,ah/WMAP.h)));
  }
  applyWZoom(); b.scrollTo(0,0);
}
addEventListener('resize',()=>{if(worldOpen())fitWorld()});

// 지도를 열면 팝업은 바로 가운데에 뜨고, 열려 있던 옆 패널(좁은 화면은 아래 시트)은 동시에 원래 방향으로 닫힌다.
// 패널을 지도용 바텀 시트(body.worldon)로 바꾸는 건 그 닫힘 전환이 끝난 뒤에 한다(바로 바꾸면 아래로 미끄러져 사라진다)
let worldonTimer=null;
function worldonNow(){   // 지도 위 시트 모드로 바꾼다. 내린 채로 시작, 모양이 바뀌는 순간은 애니메이션 없이
  clearTimeout(worldonTimer); worldonTimer=null;
  if(document.body.classList.contains('worldon')) return;
  noTrans($('#panel'),()=>{document.body.classList.add('worldon');$('#panel').classList.remove('up','mini')});
}
function openWorld(){
  if(worldOpen()) return;
  const p=$('#panel'), shown=narrow()?p.classList.contains('open'):!p.classList.contains('off');
  const first=!worldBuilt;
  if(first) buildWorld();
  $('#worldwrap').classList.add('on');
  if(shown&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    setPanel(false);
    worldonTimer=setTimeout(worldonNow,narrow()?230:290);   // 패널 전환 시간(.22s/.28s) 뒤
  } else worldonNow();
  refresh();
  fitWorld();
  $('#worldclose').focus();
}
// fn 으로 바꾸는 클래스가 애니메이션 없이 바로 적용되게 한다
function noTrans(el,fn){el.classList.add('notrans');fn();void el.offsetWidth;requestAnimationFrame(()=>el.classList.remove('notrans'))}
function closeWorld(){
  clearTimeout(worldonTimer); worldonTimer=null;
  hideAchTip(); setWFull(false);
  const up=$('#panel').classList.contains('up');   // 시트로 보던 시나리오는 닫은 뒤 원래 패널로 이어 보여 준다
  noTrans($('#panel'),()=>{document.body.classList.remove('worldon');$('#panel').classList.remove('up','mini')});
  $('#worldwrap').classList.remove('on');
  setPanel(up&&sel!=null);
  $('#worldbtn').focus();
}

// 전체화면: 팝업이 화면을 꽉 채운다(.full). 브라우저가 지원하면 문서 전체를 전체화면으로 바꾼다 —
// 팝업만 전체화면으로 하면 그 밖의 '하나만 해금' 선택 팝업이 가려지기 때문. 지원하지 않는 곳(아이폰 등)은 창 안에서만 꽉 채운다
const wfull=()=>$('#worldwrap').classList.contains('full');
const WFULL_ICON={on:'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',off:'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'};
function setWFull(on){
  if(on===wfull()) return;
  $('#worldwrap').classList.toggle('full',on);
  const b=$('#wfull'); b.setAttribute('aria-pressed',on); b.title=on?'전체화면 끝내기':'전체화면';
  b.querySelector('path').setAttribute('d',on?WFULL_ICON.on:WFULL_ICON.off);
  const el=document.documentElement;
  if(on&&document.fullscreenEnabled&&!document.fullscreenElement) el.requestFullscreen().catch(()=>{});
  if(!on&&document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  fitWorld();
}
// 브라우저 Esc 등으로 전체화면이 풀리면 팝업도 원래 크기로
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement) setWFull(false)});

// 스티커나 번호를 누르면 상세 패널이 지도 위로 아래에서 올라온다(body.worldon 일 때 #panel 은 바텀 시트, setPanel 참고).
// 패널의 클리어 체크·배치도·다른 시나리오 링크가 그대로 동작하고, 링크를 누르면 지도에서 그 번호로 옮겨 간다
function worldPick(id){
  worldonNow();
  select(id);
  const g=document.querySelector(`#world .wm[data-id="${id}"]`);
  if(g){
    g.scrollIntoView({block:'nearest',inline:'nearest',behavior:smooth()});
    if(g.classList.contains('pick')){const src=pendingPickSrc(id); if(src) openPick(src);}
  }
}

// 전역 업적 칸마다 붙일 스티커 하나. 같은 칸을 두고 갈리는 업적(도시 통치·목소리 등)은 나중 시나리오에서 얻은 쪽,
// 유물은 정화 > (잃었다가 되찾음) > 회수 > 상실, 고대 기술·오염 종식은 얻은 횟수만큼의 스티커(GAT3 등)
function achStickers(){
  const cnt=achievements(), last={};
  [...done].sort((a,b)=>a-b).forEach(id=>S[id].rw.forEach(x=>{
    const m=ACH_RE.exec(x); if(m&&m[1]==='전역'&&WACH.ko[m[2]]) last[WACH.ko[m[2]]]=id;}));
  const has=a=>Object.entries(WACH.ko).some(([ko,id])=>id===a&&(cnt.get('전역|'+ko)||0)>0);
  const n=a=>{const ko=Object.keys(WACH.ko).find(k=>WACH.ko[k]===a);return cnt.get('전역|'+ko)||0};
  return WACH.slots.map(([cx,ids])=>{
    let pick=null;
    if(ids[0]==='GAR') pick=has('GAC')?'GAC':has('GAR')&&has('GAL')?'GAR2':has('GAR')?'GAR':has('GAL')?'GAL':null;
    else if(ids.length>2&&ids[1]===ids[0]+'2'){const c=Math.min(ids.length,n(ids[0])); pick=c?ids[0]+(c>1?c:''):null}
    else pick=ids.filter(has).sort((a,b)=>(last[a]||0)-(last[b]||0)).pop()||null;
    return pick&&[cx,pick];
  }).filter(Boolean);
}
const ACH_NAME=id=>{const b=id.replace(/\d$/,'');return Object.keys(WACH.ko).find(k=>WACH.ko[k]===(b==='GAR'&&id==='GAR2'?'GAR':b))||id};

function refreshWorld(st){
  if(!worldBuilt) return;
  document.querySelectorAll('#wstk .wsk').forEach(g=>{const id=+g.dataset.id, s=st[id];
    g.classList.toggle('on',s==='done'||s==='open'||s==='req'||(s==='blocked'&&reachable(id)));
    g.classList.toggle('done',s==='done');
    g.classList.toggle('blocked',s==='blocked');
    g.classList.toggle('dim',$(`#world .wm[data-id="${id}"]`).classList.contains('dim'));});
  const got=achStickers();
  $('#wach').innerHTML=got.map(([cx,a])=>{const [sw,sh]=WACH.size[a];
    return `<image data-a="${a}" href="${STK}${a}.webp" x="${cx-sw/2}" y="8" width="${sw}" height="${sh}"/>`}).join('');
  const n=k=>Object.values(st).filter(x=>x===k).length;
  $('#worldsub').textContent=`클리어 ${n('done')} · 진행 가능 ${n('open')} · 전역 업적 ${got.length}`;
}

// 전역 업적 스티커 설명(마우스 오버·탭): 한글·영문 이름, 얻은 시나리오, 이 업적이 필요한/있으면 막히는 시나리오
function achTipHtml(a){
  const ko=ACH_NAME(a), n=/\d$/.test(a)&&a!=='GAR2'?+a.slice(-1):1;
  const lst=ids=>ids.length?ids.map(i=>`<b>${i}</b> ${esc(S[i].ko)}`).join(', '):'';
  const from=[...done].sort((x,y)=>x-y).filter(i=>S[i].rw.includes('전역 업적: '+ko));
  const need=[],block=[];
  for(const k in S) for(const alt of S[k].reqs) for(const r of alt)
    if(r.s==='전역'&&r.t.replace(/\s*×\d+$/,'')===ko){(r.neg?block:need).includes(+k)||(r.neg?block:need).push(+k)}
  return `<div class="th">전역 업적</div><div class="tn">${esc(ko)}${n>1?` ×${n}`:''}${a==='GAR2'?' (잃었다가 되찾음)':''}</div>
    <div class="ts">${esc(WACH.en[a]||WACH.en[a.replace(/\d$/,'')]||'')}</div>
    ${from.length?`<div class="tr">얻은 곳: ${lst(from)}</div>`:''}
    ${need.length?`<div class="tr">필요한 시나리오: ${lst(need)}</div>`:''}
    ${block.length?`<div class="tr neg">있으면 못 하는 시나리오: ${lst(block)}</div>`:''}`;
}
function showAchTip(a,x,y){
  const t=$('#wtip'); t.innerHTML=achTipHtml(a); t.classList.add('on');
  const r=t.getBoundingClientRect();
  t.style.left=Math.min(x+14,innerWidth-r.width-8)+'px';
  t.style.top=Math.min(y+14,innerHeight-r.height-8)+'px';
}
const hideAchTip=()=>$('#wtip').classList.remove('on');
$('#world').addEventListener('pointermove',ev=>{
  if(ev.pointerType!=='mouse') return;
  const a=ev.target.closest('#wach [data-a]');
  a?showAchTip(a.dataset.a,ev.clientX,ev.clientY):hideAchTip();
});
$('#world').addEventListener('pointerleave',hideAchTip);

$('#worldbtn').onclick=openWorld;
$('#worldclose').onclick=closeWorld;
$('#wzin').onclick=()=>setWZoom(wz*1.2);
$('#wzout').onclick=()=>setWZoom(wz/1.2);
$('#wzfit').onclick=fitWorld;
$('#wfull').onclick=()=>setWFull(!wfull());
$('#worldwrap').addEventListener('click',ev=>{
  const t=ev.target;
  if(t===ev.currentTarget){closeWorld();return}                       // 바깥 어두운 곳
  const ach=t.closest('#wach [data-a]');
  if(ach){showAchTip(ach.dataset.a,ev.clientX,ev.clientY);return}     // 터치 화면은 탭으로 설명을 연다
  hideAchTip();
  const hit=t.closest('#world [data-id]');
  if(hit){worldPick(+hit.dataset.id);return}
  if(t.closest('#world')) deselect();   // 지도 빈 곳: 시트를 내린다
});
