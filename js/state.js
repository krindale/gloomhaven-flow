// 진행 상태: 저장값(클리어·하나만 해금 선택·인원수)과 시나리오 상태 계산

// 저장값이 깨져 있어도(배열·객체가 아님) 페이지가 멈추지 않게 모양을 확인한다
let done=new Set((v=>Array.isArray(v)?v:[])(store.get('gh-done',[])));
const save=()=>store.set('gh-done',[...done]);
// '셋 중 하나만 해금'(S[id].choose, 1판은 #13 → 15·17·20)에서 고른 시나리오. {출처 id: 고른 id}
let choice=(v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{})(store.get('gh-choice',{}));
const saveChoice=()=>store.set('gh-choice',choice);
// 배치도 인원수(2~4)
let pc=4; {const v=+store.get('gh-pc',4); if(v>=2&&v<=4) pc=v;}

// 고른 것. 따로 고르지 않았어도 후보 중 하나를 클리어했으면 그것을 고른 것으로 본다
function chosen(src){const c=S[src].choose; if(choice[src]&&c.includes(+choice[src])) return +choice[src]; return c.find(x=>done.has(x))||null;}
// src 클리어로 id 가 열리는가. 출처가 '하나만 해금'이면 고른 것만 열린다
const unlocksVia=(src,id)=>done.has(src)&&(!S[src].choose.includes(id)||chosen(src)===id);
// 해금 출처(또는 #37 보물)로 열려 있는가
const reachable=id=>S[id].from.some(x=>unlocksVia(x,id))||(S[id].tfrom&&done.has(37));
// 출처는 클리어했지만 아직 하나를 고르지 않아 id 가 후보로 대기 중이면 그 출처
const pendingPickSrc=id=>S[id].from.find(x=>done.has(x)&&S[x].choose.includes(id)&&chosen(x)===null);

// 클리어를 해제했을 때 더 이상 열릴 수 없게 된 뒤쪽 시나리오의 클리어도 함께 해제한다(연쇄).
// 해금 출처(하나만 해금은 고른 것만)·#37 보물 경로가 모두 사라진 경우만 해제하고,
// 이벤트·개인 퀘스트 등 글로 적힌 다른 경로(src)가 있거나 출처가 없는 시나리오(#1 등)는 건드리지 않는다.
let lastCascade=null;   // {id, list}: 패널에 '함께 클리어 해제됨'을 보여 줄 기록
function cascadeUndo(){
  const removed=[];
  for(let again=true;again;){
    again=false;
    for(const d of [...done]){
      const s=S[d];
      if(d===1||s.src.length||(!s.from.length&&!s.tfrom)) continue;
      if(!reachable(d)){done.delete(d);removed.push(d);again=true;}
    }
  }
  return removed.sort((a,b)=>a-b);
}

// 업적: 클리어한 시나리오의 보상 문자열에서 센다
const ACH_RE=/^(파티|전역) 업적: (.+)$/;
const GRANTABLE=new Set();   // 시나리오 보상으로 얻을 수 있는 업적. 여기 없는 업적(이벤트·아이템 출처)은 판정하지 않는다
for(const s of Object.values(S)) for(const x of s.rw){const m=ACH_RE.exec(x); if(m) GRANTABLE.add(m[1]+'|'+m[2]);}

function achievements(){
  const a=new Map(), add=(k,n)=>a.set(k,(a.get(k)||0)+n);
  done.forEach(id=>{ for(const x of S[id].rw){
    const m=ACH_RE.exec(x); if(m){add(m[1]+'|'+m[2],1); continue}
    const l=/^잃는 업적: (.+)$/.exec(x);
    if(l) for(const sc of ['파티','전역']){const k=sc+'|'+l[1]; if(a.has(k))a.set(k,Math.max(0,a.get(k)-1));}
  }});
  return a;
}

// 업적 조건 판정: ok(충족) | unknown(이벤트·아이템 출처라 판정 불가) | fail(미충족)
function reqState(id,ach){
  const s=S[id]; if(!s.reqs.length) return 'ok';
  let best='fail';
  for(const alt of s.reqs){
    let st='ok';
    for(const r of alt){
      const mm=/^(.*?)\s*×(\d+)$/.exec(r.t), name=mm?mm[1]:r.t, need=mm?+mm[2]:1;
      const key=r.s+'|'+name, have=ach.get(key)||0;
      if(r.neg){ if(have>=need){st='fail';break} }
      else if(have>=need){}
      else if(!GRANTABLE.has(key)){ st='unknown'; }
      else { st='fail'; break }
    }
    if(st==='ok') return 'ok';
    if(st==='unknown') best='unknown';
  }
  return best;
}

function blockedSet(){const b=new Set();done.forEach(id=>(S[id].blocks||[]).forEach(x=>{if(!done.has(x))b.add(x)}));return b;}

// done | open(진행 가능) | req(업적 조건 미충족) | blocked(선택으로 막힘) | pick(하나만 해금 고르는 중) | ext(이벤트·보물로 해금) | locked
function statuses(){
  const blk=blockedSet(), ach=achievements(), st={};
  for(const k in S){
    const id=+k, s=S[k];
    if(done.has(id)){st[id]='done'; continue}
    if(blk.has(id)){st[id]='blocked'; continue}
    if(id!==1&&!reachable(id)){
      st[id]=pendingPickSrc(id)?'pick':(!s.from.length&&s.src.length)?'ext':'locked'; continue }
    st[id]=reqState(id,ach)==='fail'?'req':'open';
  }
  return st;
}
const STL={done:'클리어함',open:'지금 진행 가능',req:'업적 조건 미충족',blocked:'현재 선택으로 막힘',ext:'이벤트·보물로 해금',locked:'아직 잠김',pick:'해금할 하나를 고르는 중'};

const bossNames=id=>S[id].mons.filter(m=>m.b).map(m=>m.n);
const hasBoss=id=>S[id].mons.some(m=>m.b);
// 캠페인 지도의 지역 (개인 퀘스트 '숲 탈환'·'복수'·'인류의 몰락'·'원소 표본'이 지역별 클리어 수를 센다)
const LOCEN={'글룸헤이븐':'Gloomhaven','단검숲':'Dagger Forest','머무는 늪':'Lingering Swamp','감시자 산맥':'Watcher Mountains','코퍼넥 산맥':'Copperneck Mountains','안개 바다':'Misty Sea'};
const locDone=loc=>Object.values(S).filter(s=>s.loc===loc&&done.has(s.id)).length;
