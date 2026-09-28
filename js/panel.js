// 상세 패널(#panel): 시나리오 상세, 정확도 안내, 열고 닫기
// 패널 안의 버튼은 그릴 때마다 붙이지 않고 아래 위임 핸들러 하나가 처리한다

let panelId=null;   // 패널에 그려진 시나리오 (정확도 안내일 때는 null)

// 시나리오로 이동하는 링크 버튼
function lk(id,cls=''){return `<button class="lk ${cls}" data-go="${id}"><b>${id}</b>${esc(S[id].ko)}</button>`}
const links=ids=>`<div class="links">${ids.map(x=>lk(x)).join('')}</div>`;
const MUTED=t=>`<span style="color:var(--muted)">${t}</span>`;

function foot(s){
  let t='요구 조건·몬스터·보상·해금 관계는 Gloomhaven Secretariat 오픈소스 데이터 그대로입니다. 한국어 이름은 공식 한글판 명칭이 아니라 이 페이지에서 옮긴 이름이라 실물 책과 다를 수 있습니다.';
  t+=s.gv?' 목표와 특수 규칙은 시나리오북 원문과 대조했습니다.':' 목표는 원문을 확보하지 못해 확인이 필요합니다.';
  t+=s.side?' 사이드 시나리오는 줄거리를 지어내지 않으려고 해금 경로·규칙 위주로만 짧게 적었습니다.'
          :' 줄거리는 원문을 기반으로 썼습니다.';
  return t;
}

// 헤더 ⓘ: 정확도 안내. 확인 필요(gv:0) 목록은 실시간으로 센다
function showInfo(){
  const unv=Object.keys(S).map(Number).filter(i=>!S[i].gv).sort((a,b)=>a-b);
  sel=null; panelId=null; refresh();
  $('#panel').innerHTML=`
  <div class="ph"><button class="close" aria-label="닫기">×</button>
    <div class="row"><div class="big">ⓘ</div><div><h2>정확도 안내</h2>
      <div class="sub">어디까지 믿어도 되는지</div></div></div>
    <div class="meta"><span class="tag">전체 95개</span><span class="tag">메인 51</span><span class="tag">사이드 44</span></div>
  </div>
  <div class="sec"><h3>신뢰도 높음</h3><p class="story">요구 조건, 몬스터, 보상, 해금·차단 관계는 <b>Gloomhaven Secretariat</b>의 오픈소스 데이터를 그대로 가져왔습니다.</p></div>
  <div class="sec"><h3>목표·특수 규칙</h3><p class="story">95개 전부 시나리오북 원문과 대조했습니다. 42번 이후 47개는 공개된 시나리오북 페이지 스캔(Tabletop Simulator 데이터 datahaven 에 연결된 이미지)을 읽어 목표·특수 규칙을 원문대로 고쳤습니다. 번역은 이 페이지에서 옮긴 것이라 공식 한글판 문구와 다를 수 있습니다.</p></div>
  <div class="sec"><h3>줄거리</h3><p class="story">메인 스토리는 원문을 기반으로 충실히 썼습니다. 사이드 시나리오는 스토리를 지어내지 않으려고 해금 경로와 규칙 위주로만 짧게 적었습니다.</p></div>
  <div class="sec"><h3>한국어 시나리오명</h3><p class="story">공식 한글판 명칭이 아니라 이 페이지에서 옮긴 이름입니다. 실물 책과 다를 수 있으니 영문명을 함께 확인하세요.</p></div>
  ${unv.length?`<div class="sec"><h3>확인 필요 ${unv.length}개</h3>${links(unv)}</div>`:''}
  <p class="foot">잘못된 곳을 발견하면 시나리오 번호와 함께 알려 주세요.</p>`;
  $('#panel').scrollTop=0; setPanel(true);
}

// ---------- 시나리오 상세: 섹션별 HTML ----------
// 헥스 세 칸 아이콘 (변이 위인 헥스, 배치도와 같은 방향)
const HEXICON='<svg viewBox="4 2 16 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5h4l2 3.5-2 3.5H7L5 7z"/><path d="M13 7h4l2 3.5-2 3.5h-4l-2-3.5z"/><path d="M7 10.5h4l2 3.5-2 3.5H7L5 14z"/></svg>';

// 요구 조건: 바깥 배열 = 또는(대안), 안쪽 = 그리고
function reqsHtml(s){
  if(!s.reqs.length) return MUTED('없음');
  return s.reqs.map(alt=>`<div class="req-alt">`+alt.map(r=>`<span class="${r.neg?'neg':'pos'}">${esc(r.t)}</span> <span style="color:var(--muted);font-size:12.5px">(${esc(r.s)}) ${r.neg?'미달성이어야 함':'달성'}</span>`).join('<br>')+`</div>`)
    .join('<div style="font-size:12px;color:var(--muted);padding:2px 0">또는</div>');
}

// 해금 경로: 해금해 주는 시나리오, #37 보물, 글로 적힌 출처(이벤트·개인 퀘스트 등)
function sourceHtml(s){
  const from=[...new Set(s.from)];
  let h='';
  if(from.length) h+=links(from);
  if(s.tfrom) h+=`<div style="font-size:12.5px;color:var(--muted);margin-top:4px">#37의 보물 상자에서도 해금</div>`;
  if(s.src.length) h+=`<ul class="plain" style="margin-top:${from.length?6:0}px">${s.src.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  return h||MUTED('시작 시나리오');
}

// 하나만 해금 고르는 칸 (클리어 버튼 바로 아래)
// 출처(#13) 패널: 후보 셋 중 고르기 / 후보 패널: 출처가 고르기 대기 중이면 '이 시나리오로 고르기'
function pickBoxHtml(id){
  const s=S[id];
  if(s.choose.length){
    const ch=chosen(id), explicit=!!choice[id];
    const msg=!done.has(id)?`클리어하면 여기서 ${s.choose.join('·')} 중 하나를 골라 해금합니다.`
      :!ch?'클리어했습니다. 해금할 시나리오를 하나 고르세요. 고른 것만 열리고 나머지는 잠깁니다.'
      :explicit?'고른 시나리오만 열립니다. 다시 누르면 선택이 취소됩니다.'
      :'클리어 기록으로 자동 선택됐습니다. 실제로 고른 것이 다르면 바꾸세요.';
    return `<div class="sec pickbox"><h3>해금할 시나리오 고르기</h3><p class="pickmsg">${msg}</p>`+
      (done.has(id)?`<div class="chooser">${s.choose.map(x=>`<button data-choose="${x}" aria-pressed="${ch===x}"><b>${x}</b>${esc(S[x].ko)}</button>`).join('')}</div>`:'')+`</div>`;
  }
  const src=pendingPickSrc(id);
  if(!src) return '';
  return `<div class="sec pickbox"><h3>해금 선택</h3><p class="pickmsg">#${src} ${esc(S[src].ko)} 클리어 보상으로 ${S[src].choose.map(x=>'#'+x).join('·')} 중 하나만 열 수 있습니다.</p><div class="chooser"><button data-pickfor="${src}" data-choose="${id}" aria-pressed="false"><b>${id}</b>이 시나리오로 고르기</button></div></div>`;
}

// 제목 아래 태그 줄: 지도 좌표·지역·그룹·링크·상태·보스
function metaHtml(id){
  const s=S[id], st=statuses()[id];
  const loc=s.loc?`<span class="tag loc" title="${esc(LOCEN[s.loc])} — 이 지역에서 클리어한 시나리오 ${locDone(s.loc)}개">${esc(s.loc)} <small>${esc(LOCEN[s.loc])} · 클리어 ${locDone(s.loc)}</small></span>`:'';
  const lnk=s.links.length?` <span class="tag">링크: ${s.links.map(x=>'#'+x).join(', ')} 바로 진행 가능</span>`:'';
  const boss=hasBoss(id)?`<span class="tag" style="color:var(--blood);border-color:var(--blood)">☠ 보스 ${esc(bossNames(id).join(', '))}</span>`:'';
  return `<span class="tag">지도 ${esc(s.grid)}</span>${loc}${s.grp?`<span class="tag">${esc(s.grp)}</span>`:''}${lnk}<span class="st ${st}">${STL[st]}</span>${boss}`;
}

function renderPanel(id){
  const s=S[id], isDone=done.has(id);
  panelId=id;
  const opens=s.unlocks.length?links(s.unlocks):'';
  const choose=s.choose.length?`<div style="font-size:12.5px;color:var(--frost);margin-bottom:6px">셋 중 하나만 해금</div>${links(s.choose)}`:'';
  const blocks=s.blocks.length?`<div class="sec"><h3>클리어하면 막히는 시나리오</h3><div class="links">${s.blocks.map(x=>lk(x,'block')).join('')}</div></div>`:'';
  const cascade=lastCascade&&lastCascade.id===id&&lastCascade.list.length?`<div class="cascade">함께 클리어 해제됨(이 시나리오를 거쳐야 열리는 시나리오): ${lastCascade.list.map(x=>'#'+x).join(', ')}</div>`:'';
  $('#panel').innerHTML=`
  <div class="ph has-act"><div class="ph-act">${LAY[id]?`<button class="mapbtn" id="openmap" title="헥스 배치도 열기">${HEXICON}배치도</button>`:''}<button class="close" aria-label="닫기">×</button></div>
    <div class="row"><div class="big">${id}</div><div>
      <h2>${esc(s.ko)}</h2><div class="sub">${esc(s.en)}</div></div></div>
    <div class="meta">${metaHtml(id)}</div>
    <button class="done-btn" aria-pressed="${isDone}">${isDone?'클리어함 ✓':'클리어 체크'}</button>
    ${cascade}
  </div>
  ${pickBoxHtml(id)}
  <div class="sec"><h3>목표</h3><div class="goal">${esc(s.goal)}${s.gv?'':'<span class="unv" title="원문과 대조하지 못한 항목">확인 필요</span>'}</div></div>
  <div class="sec"><h3>줄거리</h3><p class="story">${esc(s.sum)}</p></div>
  ${s.note?`<div class="sec"><h3>특수 규칙·메모</h3><p class="note">${esc(s.note)}</p></div>`:''}
  <div class="sec"><h3>요구 조건</h3>${reqsHtml(s)}</div>
  <div class="sec"><h3>등장 몬스터</h3><div class="mons">${s.mons.length?s.mons.map(m=>`<span class="mon ${m.b?'boss':''}">${esc(m.n)}${m.b?' (보스)':''}</span>`).join(''):MUTED('없음')}</div></div>
  <div class="sec"><h3>보상</h3>${s.rw.length?`<ul class="plain">${s.rw.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:MUTED('별도 보상 없음')}</div>
  ${treasureSec(id)}
  <div class="sec"><h3>해금 경로</h3>${sourceHtml(s)}</div>
  ${(opens||choose)?`<div class="sec"><h3>클리어하면 열리는 시나리오</h3>${opens}${choose}</div>`:''}
  ${blocks}
  <p class="foot">${foot(s)}</p>`;
  $('#panel').scrollTop=0;
}

// ---------- 패널 동작 ----------
function toggleDone(id){
  // #13 처럼 '하나만 해금'이 있으면 팝업에서 골라야 클리어가 확정된다(취소하면 클리어되지 않음)
  if(!done.has(id)&&S[id].choose.length){openPick(id,true); return;}
  if(done.has(id)){
    done.delete(id);
    if(S[id].choose.length){delete choice[id]; saveChoice();}   // 클리어를 해제하면 선택도 지워서 다시 클리어할 때 새로 고르게
    lastCascade={id,list:cascadeUndo()};
  } else {done.add(id); lastCascade=null;}
  save(); refresh(); renderPanel(id);
}

// 하나만 해금: 같은 버튼을 다시 누르면 선택 취소. 선택을 바꿔 열 수 없게 된 시나리오의 클리어도 연쇄 해제
function toggleChoice(id,b){
  const src=b.dataset.pickfor?+b.dataset.pickfor:id;   // 후보 쪽 패널에서 누르면 출처(#13)의 선택으로 저장
  const x=+b.dataset.choose; if(choice[src]===x) delete choice[src]; else choice[src]=x;
  const list=cascadeUndo(); lastCascade=list.length&&src===id?{id,list}:null;
  saveChoice(); save(); refresh(); renderPanel(id);
}

$('#panel').addEventListener('click',ev=>{
  const at=q=>ev.target.closest(q);
  let b;
  if((b=at('[data-tr]'))) return openTreasure(b);
  if((b=at('[data-trall]'))){$('#panel').querySelectorAll('[data-tr]').forEach(openTreasure); b.remove(); return;}
  if((b=at('[data-go]'))) return goScenario(+b.dataset.go);
  if(at('.close')) return setPanel(false);
  if(panelId==null) return;
  if(at('#openmap')) return openMap(panelId);
  if(at('.done-btn')) return toggleDone(panelId);
  if((b=at('[data-choose]'))) return toggleChoice(panelId,b);
});

// 패널 켜기/끄기. 닫힌 채로 시작하고, 시나리오를 고르면 열리고 빈 곳을 누르면 닫힌다.
// 좁은 화면은 바텀시트(.open), 넓은 화면은 .off 로 옆으로 밀어낸다
let panelOn=false;
function setPanel(on){
  const p=$('#panel');
  panelOn=on;
  if(narrow()){p.classList.toggle('open',on);p.classList.remove('off')}
  else p.classList.toggle('off',!on);
  $('#ptog').setAttribute('aria-pressed',on);
}
$('#ptog').onclick=()=>setPanel(!panelOn);
