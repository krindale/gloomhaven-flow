// 팝업: '하나만 해금' 선택(#pickwrap), 진행 초기화 확인(#resetwrap)
// 배경 클릭으로는 닫지 않는다(연달아 누른 클릭에 팝업이 바로 사라졌다). 버튼·Esc(app.js)로만 닫는다

// ---------- 하나만 해금 선택 ----------
let pickAt=0;
// clearing=true: #13 을 클리어 체크하는 중. 하나를 골라야 클리어가 확정되고, 취소하면 클리어되지 않는다
let pickClearing=false;
function openPick(src,clearing){
  pickAt=Date.now(); pickClearing=!!clearing; const s=S[src], ch=chosen(src);
  $('#pickttl').textContent=`#${src} ${s.ko} — 해금할 시나리오를 하나 고르세요`;
  $('#pickclose').textContent=clearing?'취소 (클리어하지 않음)':'나중에 고르기';
  $('#pickmsg').textContent=`${s.choose.map(x=>'#'+x).join('·')} 중 하나만 열 수 있습니다. 고른 것만 진행 가능이 되고 나머지는 잠깁니다(다른 해금 경로가 있으면 그쪽으로는 열릴 수 있음).`;
  $('#pickopts').innerHTML=s.choose.map(x=>`<button class="pickopt" data-opt="${x}" aria-pressed="${ch===x}"><span class="big">${x}</span><span><b>${esc(S[x].ko)}</b><small>${esc(S[x].en)}</small><span class="gl">목표: ${esc(S[x].goal)}</span></span></button>`).join('');
  $('#pickopts').querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{
    if(Date.now()-pickAt<400) return;   // 연달아 누른 클릭이 뜨자마자 항목을 고르지 않게
    if(pickClearing){done.add(src); lastCascade=null;}
    choice[src]=+b.dataset.opt; cascadeUndo(); saveChoice(); save(); closePick(); refresh();
    if(sel!=null) renderPanel(sel);
  });
  $('#pickwrap').classList.add('on');
  $('.pickdlg').focus();   // 첫 항목에 포커스를 주면 Enter/Space 가 그대로 선택으로 이어진다
}
function closePick(){$('#pickwrap').classList.remove('on'); pickClearing=false;}
$('#pickclose').onclick=closePick;

// ---------- 진행 초기화 (확인 팝업에서 한 번 더 눌러야 지운다) ----------
function openReset(){
  $('#resetmsg').textContent=`클리어한 시나리오 ${done.size}개`+(Object.keys(choice).length?`와 '하나만 해금' 선택을`:'를')+` 모두 지웁니다. 되돌릴 수 없습니다.`;
  $('#resetwrap').classList.add('on'); $('#resetno').focus();
}
function closeReset(){$('#resetwrap').classList.remove('on')}
$('#reset').onclick=openReset;
$('#resetno').onclick=closeReset;
$('#resetok').onclick=()=>{closeReset(); done.clear(); choice={}; save(); saveChoice(); onlyOpen=false; refresh(); if(sel) renderPanel(sel);};
