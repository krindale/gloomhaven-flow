// 공용 도우미
const $=s=>document.querySelector(s);
// 데이터에서 온 문자열을 HTML 에 넣을 때는 반드시 거친다
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const smooth=()=>matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
const narrow=()=>matchMedia('(max-width:860px)').matches;

// localStorage 는 사파리 프라이빗 모드 등에서 읽기·쓰기가 던질 수 있어 항상 감싼다. 값은 JSON 으로 저장
const store={
  get(k,fallback){try{const v=localStorage.getItem(k); return v==null?fallback:JSON.parse(v)}catch(e){return fallback}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
