// 메인 캠페인 흐름도 (SVG). 좌표·엣지 경로는 data/scenarios.js 의 L
const NW=190,NH=62;   // 노드 크기
let zoom=1;

function buildGraph(){
  const pad=40,W=L.w+pad*2,H=L.h+pad*2;
  let h=`<svg id="svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="메인 캠페인 시나리오 흐름도"><defs>`;
  for(const [k,c] of [['u','var(--edge)'],['c','var(--frost)'],['t','var(--muted)'],['in','var(--brass)'],['out','var(--moss)']])
    h+=`<marker id="ar-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" style="fill:${c}"/></marker>`;
  h+=`</defs><g transform="translate(${pad},${pad})">`;
  for(const e of L.edges){
    const p=e.p; let d=`M${p[0][0]},${p[0][1]}`;
    let i=1; for(;i+2<p.length;i+=3) d+=` C${p[i][0]},${p[i][1]} ${p[i+1][0]},${p[i+1][1]} ${p[i+2][0]},${p[i+2][1]}`;
    for(;i<p.length;i++) d+=` L${p[i][0]},${p[i][1]}`;
    h+=`<path class="e ${e.t}" data-a="${e.a}" data-b="${e.b}" d="${d}" marker-end="url(#ar-${e.t})"/>`;
  }
  for(const [id,[x,y]] of Object.entries(L.pos)){
    const s=S[id]; const X=x-NW/2,Y=y-NH/2;
    h+=`<g class="n" data-id="${id}" tabindex="0" role="button" aria-label="${id}번 ${esc(s.ko)}" transform="translate(${X},${Y})">
      <rect class="body" width="${NW}" height="${NH}" rx="10"/>
      <circle cx="27" cy="${NH/2}" r="18"/><text class="num" x="27" y="${NH/2}">${id}</text>
      <text class="nm" x="52" y="${s.loc?22:27}">${esc(s.ko)}</text>
      <text class="en" x="52" y="${s.loc?37:44}">${esc(s.en)}</text>`+
      (s.loc?`<text class="loc" x="52" y="52">${esc(s.loc)}</text>`:'')+`
      <text class="go" x="${NW-12}" y="${NH/2+5}" text-anchor="end" style="fill:var(--brass);font:700 13px var(--sans)">▶</text>
      <text class="pk" x="${NW-10}" y="${NH/2+5}" text-anchor="end">고르기</text>`+
      (hasBoss(id)?`<text class="boss" x="${NW-11}" y="17" text-anchor="end">☠</text><title>보스: ${esc(bossNames(id).join(', '))}</title>`:'')+
      `</g>`;
  }
  h+=`</g></svg>`;
  $('#graph').innerHTML=h;
  $('#graph').querySelectorAll('.n').forEach(g=>{
    g.addEventListener('click',()=>{const id=+g.dataset.id; select(id);
      if(g.classList.contains('pick')){const src=pendingPickSrc(id); if(src) openPick(src);}});
    g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select(+g.dataset.id)}});
  });
}
function applyZoom(){const s=$('#svg');s.style.width=(s.viewBox.baseVal.width*zoom)+'px';s.style.height=(s.viewBox.baseVal.height*zoom)+'px'}
function fit(){const s=$('#svg'),g=$('#graph');zoom=g.clientWidth<700?.6:Math.min(1,Math.max(.3,(g.clientWidth-10)/s.viewBox.baseVal.width));applyZoom()}
$('#zin').onclick=()=>{zoom=Math.min(2,zoom*1.2);applyZoom()};
$('#zout').onclick=()=>{zoom=Math.max(.25,zoom/1.2);applyZoom()};
$('#zfit').onclick=fit;
