// 화면 전체: 선택·탭 전환·검색·상태 반영(refresh)·헤더 버튼·초기화. 마지막에 불러온다

let sel=null;         // 선택한 시나리오
let onlyOpen=false;   // 헤더 '▶ 진행 가능' 필터

// ---------- 선택 ----------
function select(id,scroll){
  lastCascade=null;
  sel=id; renderPanel(id); refresh(); setPanel(true);
  if(scroll){
    const g=document.querySelector(`.view.on [data-id="${id}"]`);
    g&&g.scrollIntoView({block:'center',inline:'center',behavior:smooth()});
  }
  // 패널이 다 열린 뒤, 선택한 노드·카드가 패널에 가려졌으면 보이는 곳으로 옮긴다
  setTimeout(revealSel,narrow()?240:320);
}
function revealSel(){
  const g=sel!=null&&document.querySelector(`.view.on [data-id="${sel}"]`); if(!g) return;
  const v=g.closest('.view'), vr=v.getBoundingClientRect(), r=g.getBoundingClientRect(), pad=24;
  const p=$('#panel'), bottom=narrow()&&p.classList.contains('open')?Math.min(vr.bottom,p.getBoundingClientRect().top):vr.bottom;
  let dx=0, dy=0;
  if(r.right>vr.right-pad) dx=r.right-vr.right+pad; else if(r.left<vr.left+pad) dx=r.left-vr.left-pad;
  if(r.bottom>bottom-pad) dy=r.bottom-bottom+pad; else if(r.top<vr.top+pad) dy=r.top-vr.top-pad;
  if(dx||dy) v.scrollBy({left:dx,top:dy,behavior:smooth()});
}
// 선택 해제 + 패널 닫기
function deselect(){sel=null;refresh();setPanel(false)}
// 다른 시나리오로 이동 (필요하면 탭을 바꾸고 보이는 곳으로 스크롤)
function goScenario(id){showView(S[id].side?'side':'graph');select(id,true)}

function showView(v){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===v));
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id===v));
  document.querySelectorAll('#zoomctl .zb').forEach(b=>b.style.display=v==='graph'?'':'none');
  if(sel!=null&&(v==='side')!==!!S[sel].side) deselect();
  if(v==='side') sizeSide();
}

// ---------- 검색 ----------
// 번호(완전 일치)·이름·지역(띄어쓰기 무시)·목표·줄거리·메모·몬스터·보상·업적·보스·타일 ID. 보물 내용은 넣지 않는다(스포일러)
const HAY={};
for(const k in S){const s=S[k];
  HAY[k]=[s.ko,s.en,LOCEN[s.loc]||'',s.goal,s.sum,s.note,...s.mons.map(m=>m.n),...s.rw,...s.reqs.flat().map(r=>r.t),(hasBoss(+k)?'보스 boss':''),...(((MAP[k]||{}).r)||[]).map(r=>r.t||'')].join(' ').toLowerCase();}
function matcher(q){
  if(!q) return ()=>true;
  const nq=q.replace(/ /g,'');
  return id=>String(id)===q||(S[id].loc&&nq.length>1&&S[id].loc.replace(/ /g,'').includes(nq))||HAY[id].includes(q);
}

// ---------- 상태 반영 ----------
const NODE_ST=['done','open','req','blocked','locked','pick'], CARD_ST=['done','open','req','locked','pick'];
function refresh(){
  const q=$('#q').value.trim().toLowerCase(), st=statuses(), match=matcher(q);
  const openIds=new Set(Object.keys(st).filter(k=>st[k]==='open').map(Number));
  const hidden=id=>(!!q&&!match(id))||(onlyOpen&&!openIds.has(id));
  document.querySelectorAll('.n').forEach(g=>{const id=+g.dataset.id;
    for(const c of NODE_ST) g.classList.toggle(c,st[id]===c);
    g.classList.toggle('sel',id===sel);
    g.classList.toggle('dim',hidden(id));
    g.classList.toggle('hit',!!q&&match(id));});
  document.querySelectorAll('.card').forEach(c=>{const id=+c.dataset.id;
    for(const cl of CARD_ST) c.classList.toggle(cl,st[id]===cl);
    c.classList.toggle('sel',id===sel);
    c.classList.toggle('dim',hidden(id)||st[id]==='blocked')});
  refreshEdges(openIds);
  $('#prog').innerHTML=`클리어 <strong>${done.size}</strong> / ${Object.keys(S).length} <span class="lbl" style="opacity:.7">(메인 51 + 사이드 44)</span>`;
  const ob=$('#openonly');
  ob.textContent=`▶ 진행 가능 ${openIds.size}`;
  ob.setAttribute('aria-pressed',onlyOpen);
  $('#reset').disabled=!done.size&&!Object.keys(choice).length;   // 지울 것이 없으면 초기화 비활성
}
// 흐름도 엣지: 선택 시 들어오는/나가는 선 강조, 진행 흐름(.next), 하나만 해금에서 고르지 않은 쪽(.nopick)
function refreshEdges(openIds){
  document.querySelectorAll('#graph .e').forEach(e=>{const a=+e.dataset.a,b=+e.dataset.b;
    const kind=e.classList.contains('c')?'c':e.classList.contains('t')?'t':'u';
    e.classList.remove('in','out','fade','next');
    e.classList.toggle('nopick',kind==='c'&&done.has(a)&&chosen(a)!==null&&chosen(a)!==b);
    e.classList.toggle('pickable',kind==='c'&&done.has(a)&&chosen(a)===null&&!sel);
    if(done.has(a)&&openIds.has(b)&&a!==sel&&b!==sel) e.classList.add('next');
    let mk=kind;
    if(sel){ if(b===sel){e.classList.add('in');mk='in'} else if(a===sel){e.classList.add('out');mk='out'} else e.classList.add('fade'); }
    e.setAttribute('marker-end',`url(#ar-${mk})`);
  });
}

// ---------- 이벤트 ----------
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showView(b.dataset.v));
$('#q').addEventListener('input',()=>{refresh();const q=$('#q').value.trim();if(/^\d+$/.test(q)&&S[+q]) goScenario(+q)});
// 흐름도·사이드 목록의 빈 곳을 누르면 선택 해제 + 패널 닫기 (드래그 뒤의 클릭은 panZoom 이 막는다)
$('#graph').addEventListener('click',ev=>{if(!ev.target.closest('.n'))deselect()});
$('#side').addEventListener('click',ev=>{if(!ev.target.closest('.card'))deselect()});
$('#openonly').onclick=()=>{onlyOpen=!onlyOpen;refresh()};
$('#info').onclick=showInfo;
$('#theme').onclick=()=>{
  const r=document.documentElement;
  const cur=r.dataset.theme||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  r.dataset.theme=cur==='light'?'dark':'light';
  try{localStorage.setItem('gh-theme',r.dataset.theme)}catch(e){}   // head 의 인라인 스크립트가 JSON 이 아닌 문자열로 읽는다
};
// Esc: 맨 위 팝업부터 닫는다
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Escape') return;
  if($('#resetwrap').classList.contains('on')) closeReset();
  else if($('#pickwrap').classList.contains('on')) closePick();
  else if(mapId!=null) closeMap();
});
panZoom($('#graph'),()=>zoom,z=>{zoom=z;applyZoom()},.25,2);
panZoom($('#side'));   // 사이드 목록은 확대 없이 드래그 이동만
panZoom($('#mapbody'),()=>mapZoom,setMapZoom,.35,3);

// ---------- 시작 ----------
buildGraph();buildSide();refresh();requestAnimationFrame(()=>{zoom=$('#graph').clientWidth<700?.6:.72;applyZoom()});
