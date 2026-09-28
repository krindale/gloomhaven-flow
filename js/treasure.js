// 보물 상자 섹션. 내용이 스포일러라 잠가 두고 버튼(열어 보기/모두 열기)을 눌러야 보인다. 열림 상태는 저장하지 않는다
// MAP[id].r[].tr = 방별 보물 번호, TRS[번호-1] = 내용. 'G' 는 시나리오 전용 보물(내용 없음)

const LOCKICON='<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
const USE={소진:['소진형','사용하면 뒤집는다. 긴 휴식 때 회복'],소모:['소모형','사용하면 이번 시나리오 동안 다시 못 쓴다'],상시:['상시','따로 쓰지 않아도 항상 적용']};

function treasureSec(id){
  const rows=[];
  for(const r of ((MAP[id]||{}).r||[])) for(const t of (r.tr||[])) rows.push([r.n,t]);
  if(!rows.length) return '';
  const locked=rows.filter(x=>x[1]!=='G').length;
  return `<div class="sec"><div class="trh"><h3>보물 상자 ${rows.length}개</h3>`+
    (locked>1?`<button class="trbtn" data-trall>${LOCKICON}모두 열기</button>`:'')+`</div><ul class="trs">`+
    rows.map(([n,t])=>t==='G'
      ?`<li><span class="trw">방 ${n}</span><span class="trv muted">시나리오 전용 보물 — 내용은 시나리오북 특수 규칙</span></li>`
      :`<li><span class="trw">방 ${n} · #${t}</span><button class="trbtn" data-tr="${t}">${LOCKICON}열어 보기</button></li>`).join('')+
    `</ul></div>`;
}

function itemCard(it,design){
  const u=USE[it.u]||[it.u,''];
  return `<div class="tri">`+
    (design?`<div class="trdz">아이템 도안 — 상점에 추가되어 살 수 있게 됨</div>`:'')+
    `<div class="trin">${esc(it.n)}</div>`+
    `<div class="trim"><span>${esc(it.sl)}</span><span title="${u[1]}">${u[0]}</span><span>${it.c}골드</span>`+
    (it.m?`<span class="minus" title="장착하면 공격 보정 덱에 -1 카드가 들어간다">-1 카드 ${it.m}장</span>`:'')+`</div>`+
    `<div class="trid">${esc(it.d)}</div></div>`;
}

// 잠긴 버튼을 내용으로 바꾼다. 해금 링크([data-go])는 panel.js 의 위임 핸들러가 처리한다
function openTreasure(b){
  const d=TRS[+b.dataset.tr-1]; if(!d) return;
  const sp=document.createElement('span');
  sp.className='trv'+(d.t.startsWith('함정')?' trap':'');
  sp.innerHTML=d.s?'해금 '+lk(d.s):d.i?d.i.map(it=>itemCard(it,d.dz)).join(''):esc(d.t);
  b.replaceWith(sp);
}
