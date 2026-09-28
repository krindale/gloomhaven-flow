// 사이드 시나리오 탭 (카드 목록). 분류는 data/scenarios.js 의 SIDE
function buildSide(){
  let h='';
  for(const [t,p,chains] of SIDE){
    h+=`<section class="sgroup"><h2>${t}</h2><p>${p}</p><div class="cards">`;
    for(const ch of chains){
      h+=`<div class="chain">`+ch.map((id,i)=>(i?'<span class="arr">→</span>':'')+
        `<button class="card" data-id="${id}"><span class="badge">${id}</span><span class="t"><b>${esc(S[id].ko)}${hasBoss(id)?'<span class="bossmark" title="보스 등장">☠</span>':''}</b><small>${esc(S[id].en)}${S[id].loc?` · ${esc(S[id].loc)}`:''}</small></span></button>`).join('')+`</div>`;
    }
    h+=`</div></section>`;
  }
  h+=`<p class="foot" style="padding:0">어떤 이벤트 카드인지 등 세부 해금 경로는 각 카드를 눌러 확인하세요.</p>`;
  $('#side').innerHTML=h;
  $('#side').querySelectorAll('.card').forEach(b=>b.addEventListener('click',()=>select(+b.dataset.id)));
}
// 넓은 화면에서 카드 폭을 패널이 닫힌 기준으로 고정해, 패널이 열려도 카드 배치가 바뀌지 않게 한다
function sizeSide(){const s=$('#side');if(!s.offsetWidth)return;s.style.setProperty('--sidew',($('main').clientWidth-40-(s.offsetWidth-s.clientWidth))+'px')}
addEventListener('resize',sizeSide);
