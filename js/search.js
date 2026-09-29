// 검색: 시나리오별 색인(SIDX), 점수 매기기(searchScenarios), 흐름도 필터용 matcher, 입력창 아래 결과 목록(#sugg)
// 띄어쓰기·괄호·쌍점을 무시하고, 여러 단어는 모두 들어 있어야 하며(AND), 자음만 치면 초성으로 찾는다(ㅎㅅ → 향상).
// 보물 상자 내용은 넣지 않는다(스포일러)

const SK_RE=/[\s()·:,.\-'"‘’“”!?\/[\]]+/g;
const skNorm=s=>String(s).toLowerCase().replace(SK_RE,'');
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
// 글자 수가 원문과 같게 초성으로 바꾼다(한글 음절만 바뀜) → 찾은 위치를 원문에 그대로 표시할 수 있다
const skCho=s=>String(s).replace(/[가-힣]/g,c=>CHO[(c.charCodeAt(0)-0xAC00)/588|0]);
const isCho=t=>/^[ㄱ-ㅎ]+$/.test(t);

// 시나리오마다 [라벨, 원문, 가중치, 초성 검색 여부]. 가중치가 높을수록 위로
const SIDX={};
for(const k in S){const s=S[k], f=[];
  // p: '~로 시작' 판정용. 보상의 '전역 업적: ' 같은 앞머리는 떼고 본다
  const add=(label,text,w,cho,p)=>{if(text) f.push({label,text:String(text),w,cho:!!cho,n:skNorm(text),p:skNorm(p||text),c:cho?skNorm(skCho(text)):''})};
  add('이름',s.ko,100,1); add('영문',s.en,80);
  if(s.loc) add('지역',`${s.loc} ${LOCEN[s.loc]}`,60,1);
  add('그룹',s.grp,50,1); add('좌표',s.grid,40);
  for(const alt of s.reqs) for(const r of alt) add('요구 조건',`${r.t} (${r.s}) ${r.neg?'미달성이어야 함':'달성'}`,70,1);
  for(const x of s.rw) add('보상',x,75,1,x.replace(/^(파티|전역|잃는) 업적: /,''));
  for(const m of s.mons) add('몬스터',m.n+(m.b?' (보스)':''),60,1);
  add('목표',s.goal,40,1);
  for(const x of s.src) add('해금 경로',x,30);
  add('특수 규칙',s.note,20); add('줄거리',s.sum,15);
  const tiles=[...new Set((((MAP[k]||{}).r)||[]).map(r=>r.t).filter(Boolean))];
  if(tiles.length) add('타일',tiles.join(' '),30);
  SIDX[k]=f;
}

// 검색어 → [{id, score, hits:[{f, tok}]}] 점수 순. 번호는 완전 일치만(#14 도 됨)
let skLast={q:null,res:[]};
function searchScenarios(q){
  q=q.trim(); if(q===skLast.q) return skLast.res;
  const res=[];
  const num=q.replace(/^#/,'');
  if(/^\d+$/.test(num)){ if(S[+num]) res.push({id:+num,score:1000,hits:[]}); }
  else{
    const toks=q.split(/\s+/).map(t=>({raw:t,n:skNorm(t)})).filter(t=>t.n), whole=skNorm(q);
    if(toks.length) for(const k in S){
      let score=0, ok=true; const hits=[];
      for(const t of toks){
        let best=0;
        for(const f of SIDX[k]){
          const hit=f.n.includes(t.n)||(f.cho&&isCho(t.n)&&f.c.includes(t.n));
          if(!hit) continue;
          const w=f.w+(f.p.startsWith(t.n)?f.w/2:0);
          if(w>best) best=w;
          if(!hits.some(h=>h.f===f)) hits.push({f,tok:t});
        }
        if(!best){ok=false;break}
        score+=best;
      }
      if(!ok) continue;
      // 여러 단어가 한 칸에 이어 붙어 있으면(예: '향상의 위력') 더 위로
      if(toks.length>1&&SIDX[k].some(f=>f.n.includes(whole))) score+=80;
      res.push({id:+k,score,hits});
    }
    res.sort((a,b)=>b.score-a.score||a.id-b.id);
  }
  skLast={q,res};
  return res;
}
// refresh() 가 흐름도·사이드·지도를 흐리게/강조할 때 쓴다
function matcher(q){
  if(!q.trim()) return ()=>true;
  const ids=new Set(searchScenarios(q).map(r=>r.id));
  return id=>ids.has(+id);
}

// ---------- 결과 목록 ----------
const SK_ST={done:'클리어',open:'진행 가능',req:'조건 미충족',blocked:'막힘',ext:'이벤트·보물 해금',pick:'고르는 중',locked:'잠김'};
let skAct=-1;   // 키보드로 고른 줄
// 결과 정렬: 관련도(점수) · 시나리오 순서 · 진행(클리어 → 진행 가능 → … → 막힘) · 항목(찾은 칸으로 묶음). 이 브라우저에 기억한다
const SK_SORTS=[['rel','관련도'],['id','시나리오 순서'],['st','진행'],['field','항목']];
let skSort=(v=>SK_SORTS.some(x=>x[0]===v)?v:'rel')(store.get('gh-sort','rel'));
const SK_STORD=['done','open','pick','req','ext','locked','blocked'];
const skBest=r=>r.hits.reduce((a,x)=>!a||x.f.w>a.f.w?x:a,null);   // 가장 무게가 큰 찾은 칸
// 고른 정렬대로 [{head, rows}] 묶음을 만든다. 관련도·번호는 묶음 하나(제목 없음)
function skGroups(res,st){
  const byId=(a,b)=>a.id-b.id;
  if(skSort==='rel') return [{head:'',rows:res}];
  if(skSort==='id') return [{head:'',rows:[...res].sort(byId)}];
  const key=skSort==='st'?(r=>st[r.id]):(r=>{const b=skBest(r);return b?b.f.label:'번호'});
  const m=new Map();
  for(const r of res){const k=key(r); if(!m.has(k)) m.set(k,{k,rows:[],w:skSort==='st'?-SK_STORD.indexOf(k):(skBest(r)||{f:{w:999}}).f.w}); m.get(k).rows.push(r)}
  return [...m.values()].sort((a,b)=>b.w-a.w).map(g=>({head:skSort==='st'?SK_ST[g.k]:g.k,rows:g.rows.sort(byId)}));
}
const suggOpen=()=>!$('#sugg').hidden;
function closeSugg(){$('#sugg').hidden=true;$('#q').setAttribute('aria-expanded','false');$('#q').removeAttribute('aria-activedescendant');skAct=-1}

// 원문에서 검색어 자리를 <mark> 로 감싼다. 긴 글은 찾은 곳 앞뒤만 잘라 보인다
function skMark(text,toks,cho,cut){
  const src=text.toLowerCase(), cs=cho?skCho(text):'';
  const spans=[];
  for(const t of toks){
    const gap='[\\s()·:,.\\-\'"‘’“”!?/\\[\\]]*';
    const re=new RegExp([...t.n].map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join(gap),'g');
    for(const hay of isCho(t.n)&&cho?[cs]:[src]){let m; while((m=re.exec(hay))){spans.push([m.index,m.index+m[0].length]); if(!m[0].length)re.lastIndex++}}
  }
  spans.sort((a,b)=>a[0]-b[0]);
  let a=0, b=text.length;
  if(cut&&spans.length&&text.length>cut){a=Math.max(0,spans[0][0]-22); b=Math.min(text.length,a+cut)}
  let h=a?'…':'', p=a;
  for(const [x,y] of spans){ if(y<=p||x>=b) continue; const s=Math.max(x,p), e=Math.min(y,b); h+=esc(text.slice(p,s))+'<mark>'+esc(text.slice(s,e))+'</mark>'; p=e; }
  return h+esc(text.slice(p,b))+(b<text.length?'…':'');
}

function renderSugg(){
  const box=$('#sugg'), q=$('#q').value.trim();
  if(!q){closeSugg();return}
  const res=searchScenarios(q), st=statuses(), toks=q.split(/\s+/).map(t=>({n:skNorm(t)})).filter(t=>t.n);
  skAct=res.length?0:-1;
  let h=`<div class="sgcount">${res.length?`${res.length}개 시나리오 <span>↑↓ 이동 · Enter 열기</span>`:'찾는 시나리오가 없습니다'}</div>`;
  if(res.length>1) h+=`<div class="sgsort" role="group" aria-label="정렬">정렬${SK_SORTS.map(([k,l])=>`<button type="button" data-sort="${k}" aria-pressed="${k===skSort}">${l}</button>`).join('')}</div>`;
  if(!res.length) h+=`<div class="sgempty">번호(14), 이름, 영문명, 지역, 몬스터, 업적·보상(향상, 수중 호흡), 초성(ㅎㅅ)으로 찾을 수 있습니다.</div>`;
  let i=-1;
  for(const g of skGroups(res,st)){
  if(g.head) h+=`<div class="sggrp">${esc(g.head)} <span>${g.rows.length}</span></div>`;
  for(const r of g.rows){i++; const s=S[r.id], stt=st[r.id];
    // 이름·영문은 제목 줄에 이미 보이므로, 그 밖의 찾은 칸을 중요한 순으로 3개까지
    const extra=r.hits.filter(x=>x.f.label!=='이름'&&x.f.label!=='영문').sort((a,b)=>b.f.w-a.f.w).slice(0,3);
    const nameHit=r.hits.some(x=>x.f.label==='이름'), enHit=r.hits.some(x=>x.f.label==='영문');
    h+=`<div class="sg${i===skAct?' act':''}" role="option" id="sg-${r.id}" data-id="${r.id}" aria-selected="${i===skAct}">
      <span class="sgn st-${stt}">${r.id}</span>
      <div class="sgb"><div class="sgt"><b>${nameHit?skMark(s.ko,toks,true):esc(s.ko)}</b><small>${enHit?skMark(s.en,toks):esc(s.en)}</small></div>
      <div class="sgm"><span class="st-${stt}">${SK_ST[stt]}</span>${s.side?' · 사이드':' · 메인'}${s.loc?' · '+esc(s.loc):''}${hasBoss(r.id)?' · <span class="boss">☠ 보스</span>':''}</div>
      ${extra.map(x=>`<div class="sgh"><em>${x.f.label}</em>${skMark(x.f.text,toks,x.f.cho,90)}</div>`).join('')}</div></div>`;
  }}
  box.innerHTML=h; box.hidden=false; box.scrollTop=0;
  $('#q').setAttribute('aria-expanded','true'); skActive();
}
function skActive(){
  const rows=[...document.querySelectorAll('#sugg .sg')];
  rows.forEach((r,i)=>{r.classList.toggle('act',i===skAct);r.setAttribute('aria-selected',i===skAct)});
  const r=rows[skAct];
  if(r){$('#q').setAttribute('aria-activedescendant',r.id);r.scrollIntoView({block:'nearest'})}
}
function skPick(id){closeSugg(); if(narrow()) $('#q').blur(); goScenario(id)}

$('#q').addEventListener('input',()=>{refresh();renderSugg()});
$('#q').addEventListener('focus',()=>{if($('#q').value.trim()) renderSugg()});
$('#q').addEventListener('keydown',ev=>{
  const n=document.querySelectorAll('#sugg .sg').length;
  if(ev.isComposing) return;   // 한글 조합 중의 Enter·화살표는 무시
  if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
    if(!suggOpen()){renderSugg();ev.preventDefault();return}
    if(n){skAct=(skAct+(ev.key==='ArrowDown'?1:-1)+n)%n;skActive()}
    ev.preventDefault();
  }else if(ev.key==='Enter'){
    const r=document.querySelectorAll('#sugg .sg')[Math.max(0,skAct)];
    if(suggOpen()&&r){ev.preventDefault();skPick(+r.dataset.id)}
  }else if(ev.key==='Escape'&&suggOpen()){
    ev.preventDefault(); ev.stopPropagation(); closeSugg();   // 첫 Esc 는 목록만 닫고 검색어는 남긴다
  }
});
$('#sugg').addEventListener('mousedown',ev=>ev.preventDefault());   // 누르는 동안 입력창 포커스 유지
$('#sugg').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-sort]');
  if(b){skSort=b.dataset.sort; store.set('gh-sort',skSort); renderSugg(); return}
  const r=ev.target.closest('.sg'); if(r) skPick(+r.dataset.id);
});
document.addEventListener('pointerdown',ev=>{if(suggOpen()&&!ev.target.closest('.search')) closeSugg()});
