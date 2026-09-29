# CLAUDE.md

글룸헤이븐 1판 시나리오 흐름도 — 정적 단일 페이지 웹앱. Cloudflare Workers(정적 에셋)로 배포한다.

## 1. 프로젝트 개요

- **목적**: 글룸헤이븐 1판 시나리오 95개의 해금 관계·목표·요구 조건·몬스터·보상·줄거리를 한 페이지에서 추적한다.
- **성격**: 빌드 없음, 의존성 없음, 서버 없음. `index.html` + `css/` `js/` `data/` 를 **일반 `<script src>`** 로 불러오는 정적 페이지다. **`index.html` 을 파일로 바로 열어도(`file://`) 동작해야 한다** — 그래서 ES 모듈(`type="module"`)·`fetch()`로 JSON 읽기를 쓰지 않는다(둘 다 `file://` 에서 막힌다).
- **스포일러**: 전체 공개가 의도된 설계다. 스포일러 가리기 기능을 임의로 넣지 않는다. **예외: 보물 상자 내용**은 사용자 요청으로 잠가 두고 버튼(열어 보기/모두 열기)을 눌러야 보인다.
- **언어**: UI·데이터·문서 모두 한국어(`<html lang="ko">`). 영문 시나리오명은 보조 표기로만 병기한다.

## 2. 파일 구조

```
index.html              마크업 + <head> 인라인 스크립트 2개(첫 페인트 전 테마 적용, 공개 주소 전용 애널리틱스) + 아래 파일을 순서대로 불러오는 태그
css/app.css             스타일 전체. 테마 토큰(:root 3중 정의)이 맨 위
data/scenarios.js       손으로 관리하는 데이터: const S(시나리오 95개) / L(흐름도 좌표·엣지) / SIDE(사이드 탭 분류)
data/battle.js          생성물: const MON / MAP / TRS  ← tools/build_battle_data.py 가 파일 전체를 새로 쓴다
data/layout.js          생성물: const LMON / MIMG / OVN / OIMG / OPARTS / TIMG / LAY  ← tools/build_map_layout.py
data/world.js           생성물: const WMAP / WPOS / WSTK / WACH (지도 크기, 인쇄 번호 자리, 시나리오 스티커 기준점, 전역 업적 칸)  ← tools/build_world_map.py
js/util.js              $, esc, smooth, narrow, store(localStorage JSON 래퍼)
js/state.js             저장값(done·choice·pc)과 상태 계산: chosen, unlocksVia, reachable, pendingPickSrc, cascadeUndo, achievements, reqState, blockedSet, statuses, STL, LOCEN, locDone, hasBoss
js/graph.js             메인 흐름도 SVG(buildGraph), 확대(zoom·applyZoom·fit)
js/side.js              사이드 카드 목록(buildSide), sizeSide
js/treasure.js          보물 상자 섹션(treasureSec·itemCard·openTreasure)
js/panel.js             상세 패널(renderPanel + 섹션 함수 reqsHtml/sourceHtml/pickBoxHtml/metaHtml), 정확도 안내(showInfo), 패널 클릭 위임, setPanel
js/dialogs.js           팝업: 하나만 해금 선택(openPick/closePick), 초기화 확인(openReset/closeReset)
js/map.js               헥스 배치도(헥스 기하 → 층별 SVG 함수 → mapSvg, mapLegend, openMap/closeMap/drawMap)
js/maptip.js            배치도 마우스 오버 툴팁(mapHover)
js/panzoom.js           드래그 이동·Shift+휠 확대(panZoom)
js/world.js             캠페인 지도 팝업(openWorld/closeWorld, buildWorld·refreshWorld, 스티커·전역 업적 스티커, 요약 카드). 처음 열 때 만든다
js/search.js            검색 색인(SIDX)·점수(searchScenarios)·matcher, 입력창 아래 결과 목록(#sugg, renderSugg/closeSugg)
js/app.js               sel·onlyOpen, select/deselect/goScenario/showView, refresh, 헤더·Esc 이벤트, 시작 호출 — 반드시 마지막
README.md               공개용 설명과 데이터 출처 표기
CLAUDE.md               이 문서
tools/fetch_ghs.py      GHS 시나리오 JSON 1~95를 tools/ghs_cache/ 로 내려받음
tools/build_battle_data.py  data/battle.js 를 다시 생성 (data/scenarios.js 의 S 를 읽음)
tools/ghs_cache/        GHS 원본 JSON 95개 (생성 입력값, 재현용으로 커밋)
tools/ghs_meta/         GHS 보물 표·아이템 목록·스포일러 라벨 (TRS 생성 입력값). ghs_cache 에 넣지 말 것 — 그 폴더의 *.json 은 전부 시나리오로 읽힌다
tools/extract_tile_shapes.py  gloomhaven.one 번들에서 타일 모양·이미지 정보와 공식 시나리오 배치를 추출
tools/fetch_tile_images.py    타일 이미지를 assets/tiles/ 로 내려받고 원본 크기 기록
tools/fetch_layouts.py        datahaven 배치 좌표를 tools/dh_cache/ 로 내려받음
tools/build_map_layout.py     data/layout.js 를 다시 생성 (data/scenarios.js 의 S 를 읽음)
tools/build_world_map.py      지도·스티커 그림을 받아 assets/map/·assets/stickers/·data/world.js 를 다시 생성. 동그라미는 허프 검출, 번호는 사람이 읽은 LABELS, 스티커 기준점 오검출은 STK_FIX
tools/world_cache/            캠페인 지도 원본 jpg + stickers/ 원본 png 218장 (gloomhaven-storyline 경유, 생성 입력값)
tools/fetch_token_images.py   몬스터 초상(GHS 썸네일)·오버레이 그림(VGB)을 assets/monsters, assets/overlays 로 받아 webp 변환
tools/_emit.py                위 스크립트의 검증·인코딩 보조
tools/tile_shapes.json        타일 60종의 헥스 모양·이미지·오프셋 + 공식 배치 95개 (생성물)
tools/dh_cache/               datahaven 원본 JSON 95개
assets/tiles/*.webp           맵 타일 이미지 62장 (Creator Pack, CC BY-NC-SA 4.0)
assets/monsters/*.webp        몬스터 초상 47장 (Creator Pack, GHS 경유). 파일명 = datahaven 몬스터 slug
assets/overlays/*.webp        장애물·함정·보물 그림 33장 (Creator Pack, VGB 경유). 꼭짓점이 위인 헥스라 90° 돌려 그린다
assets/map/gloomhaven.webp    캠페인 지도 (Cephalofair, CC BY-NC-SA 4.0, gloomhaven-storyline 경유)
assets/stickers/*.webp        시나리오 스티커 s<id>.webp(해금)·s<id>_c.webp(클리어 체크) 190장 + 전역 업적 스티커 28장(G*.webp, 0.5배로 줄여 저장). 출처 같음
assets/overlays/start.webp    시작 위치 토큰의 가운데 그림만 잘라 배경을 투명하게 만든 것 (fetch_token_images.py 가 생성). 회전하지 않고 헥스는 페이지가 그린다
```

`tools/`는 **페이지 빌드 단계가 아니다.** 데이터를 다시 만들 때만 수동으로 돌린다. 두 생성 스크립트는 현재 캐시로 돌리면 `data/battle.js`·`data/layout.js` 를 바이트 단위로 똑같이 다시 만든다(바뀌면 입력이 바뀐 것).

빌드 산출물·`package.json`·번들러·프레임워크가 **없다**. 추가하지 않는다.
외부 리소스는 Google Fonts(Gowun Batang, IBM Plex Sans KR)와 Cloudflare Web Analytics 비콘(`static.cloudflareinsights.com`, 공개 주소에서만 로드, 토큰은 공개용) 뿐이다. 오프라인에서도 폰트만 대체되고 정상 동작해야 한다.

## 3. 코드 구조 규칙

**불러오는 순서** (`index.html` 맨 아래): `data/scenarios.js` → `data/battle.js` → `data/layout.js` → `data/world.js` → `util` → `state` → `graph` → `side` → `treasure` → `panel` → `dialogs` → `map` → `maptip` → `panzoom` → `world` → `search` → `app`.

- 모든 파일은 일반 스크립트라 최상위 `const`/`let`/`function` 이 **전역 공유**된다. 이름이 겹치면 SyntaxError 로 페이지 전체가 멈추므로 새 전역 이름은 `grep` 으로 먼저 확인한다.
- 파일을 불러오는 **그 순간 실행되는** 최상위 코드는 앞 파일의 것만 쓸 수 있다(데이터·`$`·`store` 등). 다른 파일의 함수는 이벤트 핸들러·함수 안에서만 부른다. 시작 호출(`buildGraph();buildSide();refresh();`)은 `app.js` 맨 끝에만 둔다.
- 새 파일을 만들면 `index.html` 의 태그 순서와 위 목록, §2 를 함께 고친다. 배포 워크플로는 `css js data assets` 폴더째 복사하므로 폴더 안 파일은 따로 등록할 필요 없다.
- 패널 안 버튼은 그릴 때마다 핸들러를 붙이지 않는다. `panel.js` 의 `#panel` 클릭 위임 하나가 `[data-go]`(시나리오 이동)·`.close`·`[data-tr]`/`[data-trall]`(보물)·`#openmap`·`.done-btn`·`[data-choose]` 를 처리한다. 새 버튼도 여기에 추가한다.
- Esc 는 `app.js` 의 핸들러 하나가 맨 위 팝업부터 닫는다(검색 결과 목록 → 초기화 → 하나만 해금 → 배치도 → 지도 위 시트 → 캠페인 지도).
- localStorage 는 `store.get/set`(JSON)으로만 접근한다. 예외: `gh-theme` 은 head 인라인 스크립트가 JSON 이 아닌 문자열로 읽으므로 그대로 둔다.
- 헥스 좌표 계산은 `map.js` 의 `HEX_R`·`COLW`·`ROWH`·`hexPx`·`hexCenter`·`hexPoly` 만 쓴다(툴팁도 같은 함수).

| 찾을 것 | 파일 · 앵커 | 내용 |
|---|---|---|
| 테마 토큰 | `css/app.css` `:root{` | CSS 변수. 다크가 기본, `prefers-color-scheme` + `data-theme` 오버라이드 3중 정의 |
| 마크업 | `index.html` `<header>` ~ 팝업 4개 | 헤더 한 줄: 제목 · 탭 · 검색 · `.hstat`(진행도 막대·▶ 진행 가능) · `.hact`(지도·◐ 아이콘 `.hbtn`). 좁은 화면(≤860px)은 3줄 그리드. 소개·정확도 안내 `#info`(`.infobtn`, ⓘ 아이콘만)는 `#stage` 오른쪽 위, 범례는 `#stage` 왼쪽 아래 항상 펼친 `#legend`(사용자 요청으로 접기·'범례' 제목 없음. 선 종류 줄 `.edges` 는 흐름도 탭에서만). `#graph`/`#side` 뷰, `#zoomctl`, `#panel`, `#pickwrap`·`#resetwrap`·`#mapwrap`·`#worldwrap` |
| 보물 상자 | `js/treasure.js` | `MAP[id].r[].tr` 번호별로 잠긴 줄을 그리고, 버튼을 누르면 `TRS`에서 내용을 꺼내 보여준다. 열림 상태는 저장하지 않는다. `G`는 시나리오 전용 보물(내용 없음) |
| 배치도 버튼 | `js/panel.js` `id="openmap"` (`.mapbtn`, `HEXICON`) | 패널 오른쪽 위 × 옆 `.ph-act` 안의 헥스 아이콘 버튼. 제목에는 붙이지 않는다. 방별 구성 카드는 사용자 요청으로 제거했다 — **패널에 방 정보를 다시 넣지 않는다** |
| 배치도 렌더 | `js/map.js` `mapSvg(id)` | 층 순서: 타일 → 격자 → 문 → 오버레이 → 시작 헥스 → 몬스터 → 호위 대상 → 표식 → 방 라벨 → `#hxhov`. 헥스별 내용은 `mapCells`, 툴팁은 `js/maptip.js`. SVG `<title>`은 쓰지 않는다(기본 툴팁과 겹침) |
| 보스 판정 | `js/state.js` `hasBoss(id)` / `bossNames(id)` | `S[id].mons` 의 `b` 플래그. 노드에 ☠ 표시 |
| 그래프 렌더 | `js/graph.js` `buildGraph()` | `L`로 SVG 생성. 노드 크기 `NW=190, NH=62` |
| 사이드 렌더 | `js/side.js` `buildSide()` | `SIDE`로 카드 목록 생성 |
| 상세 패널 | `js/panel.js` `renderPanel(id)` | `S[id]`의 모든 필드를 섹션별로 출력. 그려진 시나리오는 `panelId` |
| 상태 갱신 | `js/app.js` `refresh()` | 클리어/막힘/선택/검색 상태를 클래스 토글로 반영. 엣지는 `refreshEdges()` |
| 검색 | `js/search.js` `SIDX` / `searchScenarios(q)` / `matcher(q)` / `renderSugg()` | 시나리오별로 [라벨·원문·가중치] 칸(이름·영문·지역·그룹·좌표·요구 조건·보상·몬스터·목표·해금 경로·특수 규칙·줄거리·타일)을 시작할 때 한 번 만든다. 띄어쓰기·괄호·쌍점 무시, 여러 단어는 AND, 자음만 치면 초성 검색(이름·지역·그룹·업적·보상·몬스터·목표만). 번호(`14`, `#14`)는 완전 일치만. 입력할 때마다 `#sugg` 목록(상태 배지·찾은 칸 라벨과 `<mark>` 강조)이 뜨고 ↑↓·Enter·클릭으로 `goScenario`. 첫 Esc 는 목록만 닫는다. 목록 위 정렬 버튼: 관련도(칸 가중치 합, 보상은 `전역 업적: ` 앞머리를 떼고 '~로 시작' 가산) · 시나리오 순서 · 진행(클리어 → 진행 가능 → … → 막힘, 상태별 제목) · 항목(가장 무게 큰 찾은 칸으로 묶음). `skGroups()`, 선택은 `gh-sort`. 보물 내용은 넣지 않는다 |
| 진행 상태 계산 | `js/state.js` `statuses()` | done/open/req/blocked/ext/pick/locked 7상태. 열림 판정은 `reachable(id)`, 고르기 대기는 `pendingPickSrc(id)` |
| 업적 집계 | `js/state.js` `achievements()` | 클리어한 시나리오 보상에서 업적 수를 센다 |
| 정확도 안내 | `js/panel.js` `showInfo()` | 흐름도·사이드 화면 오른쪽 위 ⓘ `#info`. 프로젝트 소개(무엇·할 수 있는 것·알아 둘 것·출처)가 중심이고 정확도는 맨 아래 접이식 `details.infoacc`(사용자 요청: 'i 는 프로젝트 전체 설명'). `gv:0` 목록을 실시간 집계(0개면 숨김) |
| 패널 하단 고지 | `js/panel.js` `foot(s)` | `side`/`gv`에 따라 문구 분기 |
| 드래그·Shift+휠 | `js/panzoom.js` `panZoom(` | 마우스 드래그로 스크롤 이동(5px 넘게 움직이면 뒤따르는 클릭 무시), Shift+휠로 커서 기준 확대/축소. `#graph`·캠페인 지도 `#world`·배치도 `#mapbody`에 적용, 사이드 `#side`는 드래그만(`panZoom(el)` 인자 생략 시 확대 없음). 선택 후 패널이 열리면 `revealSel()`(app.js)이 가려진 노드·카드를 보이는 곳으로 스크롤한다. macOS는 Shift+휠이 `deltaX`로 오므로 둘 다 본다 |
| 캠페인 지도 | `js/world.js` `openWorld()` | 헤더 `#worldbtn` → 팝업 `#worldwrap`. 층: 지도 그림 → 전역 업적 스티커(`#wach`) → 시나리오 스티커(`#wstk .wsk`) → 상태 고리(`.wm`). 스티커는 스티커 안 번호 동그라미(`WSTK` cx,cy)를 `WPOS`에 겹쳐 1:1 로 붙인다. 해금(open·req·해금 후 막힘)이면 스티커, 클리어면 체크된 `_c` 스티커, 잠김이면 없음. 클리어면 스티커 번호 위에 초록 원+번호(`.wm.done`)도 올린다(스티커만으로는 체크 표시가 작아 안 보인다는 사용자 피드백). 표식은 `--wk`(=max(1, .55/wz))배로 키워 전체 보기에서도 보이게 하고, 그 배율(wz<.55, `#wsvg.small`)에선 클리어가 아닌 시나리오 번호도 같은 크기의 종이색 배지(`--paper`/`--ink`)로 올린다(사용자 요청). 팝업은 `fitWorld()`가 화면에 들어가는 최대 배율로 지도 전체를 보이게 하고 상자를 지도 크기에 맞춰 줄인다(머리줄·범례 한 줄 높이를 빼고 계산, 창 크기 바뀌면 다시 맞춤). 머리줄의 `#wfull` 은 전체화면(`#worldwrap.full` + 지원하면 `documentElement.requestFullscreen()` — 팝업만 전체화면으로 하면 하나만 해금 팝업이 가려진다). 닫거나 브라우저에서 풀리면(`fullscreenchange`) 원래 크기. `.wm` 상태 클래스는 `refresh()`가 `.n`과 같은 규칙으로 토글, 선택은 패널과 같은 `sel`. 전역 업적은 `achStickers()`가 칸마다 하나를 고른다(같은 칸 경쟁은 나중에 클리어한 쪽 — `done` 의 삽입 순서, 유물은 정화가 최종이고 회수·상실은 나중에 얻은 쪽(상실 뒤 회수면 GAR2), 고대 기술·오염 종식은 횟수 스티커). 업적 스티커에 마우스를 올리면(터치는 탭) `#wtip` 에 한글·영문 이름, 얻은 시나리오, 이 업적이 필요한/있으면 막히는 시나리오를 보인다(`achTipHtml`, 영문명은 `WACH.en`). 스티커·번호를 누르면 `worldPick()`→`select()` 로 상세 패널이 **지도 위 바텀 시트**로 올라온다: 지도를 여는 동안 `body.worldon` 이고 `setPanel()` 은 `#panel.up` 만 토글(CSS `body.worldon aside#panel`). 시트 안의 클리어 체크·배치도(`#mapwrap` z 55 > 시트 52 > 지도 50)·링크가 그대로 동작하고, 링크(`goScenario`)는 지도에서 그 번호로 옮겨 간다. 시트에서 배치도를 열면 시트를 제목 줄만 남기고 접는다(`.mini`, 누르면 펼침). 옆 패널이 열려 있을 때 지도를 열면 팝업은 바로 가운데에 뜨고(살짝 커지며 나타남) 패널은 동시에 오른쪽(좁은 화면은 아래)으로 닫힌다(사용자 요청). 패널을 시트 모드(`body.worldon`)로 바꾸는 `worldonNow()` 는 그 전환이 끝난 뒤(290/230ms) 또는 그 전에 번호를 누르면 즉시. 옆 패널 ↔ 시트로 모양이 바뀌는 순간은 `noTrans()`로 애니메이션을 끈다. 지도 빈 곳·Esc 는 시트부터 내리고, 시트를 올린 채 지도를 닫으면 그 시나리오가 있는 탭으로 옮겨(`goScenario`) 원래 패널로 이어 보인다 |
| 시작 | `js/app.js` 맨 끝 | `buildGraph();buildSide();refresh();` 초기 줌은 폭 700px 미만이면 0.6, 아니면 0.72 |

## 4. 데이터 스키마 (`const S`)

```js
"1": {
  id: 1,                   // 숫자. 키(문자열)와 반드시 일치
  ko: "검은 봉분",          // 한국어 시나리오명 (이 페이지용 창작 번역)
  en: "Black Barrow",      // 원문 영문명
  grid: "G-10",            // 캠페인 지도 좌표
  loc: "",                 // 캠페인 지도 지역: 글룸헤이븐|단검숲|머무는 늪|감시자 산맥|코퍼넥 산맥|안개 바다, 여섯 지역 밖이면 ""
  grp: "도입",              // 그룹 라벨. 빈 문자열 허용
  goal: "모든 적 처치",      // 목표
  gv: 1,                   // 1=원문 대조 완료, 0=패널에 "확인 필요" 배지 표시
  sum: "...",              // 줄거리 요약
  note: "...",             // 특수 규칙·메모. 없으면 섹션 자체가 숨겨짐
  mons: [{n:"살아있는 뼈", b:false}],  // n=이름, b=보스 여부
  reqs: [[{t:"첫 걸음", s:"파티", neg:false}]],
                           // 2중 배열: 외부=OR(대안), 내부=AND
                           // t=업적명, s=범주("파티"|"글로벌"...), neg=true면 "미달성이어야 함"
  rw: ["파티 업적: 첫 걸음"],  // 보상 문자열 목록
  unlocks: [2],            // 클리어 시 해금되는 시나리오
  choose: [],              // 해금 후보 중 하나만 선택 가능 (점선 엣지, frost 색)
  links: [2],              // 클리어 직후 바로 이어 진행 가능
  blocks: [],              // 클리어하면 영구히 막히는 시나리오
  src: ["개인 퀘스트 ..."],  // 텍스트로만 설명되는 해금 출처
  side: false,             // true면 사이드 탭에 표시 (52~95, 44개)
  from: [],                // 역방향 인덱스: 이 시나리오를 해금하는 시나리오들
  tfrom: true              // (#17 한정) #37 보물 상자로도 해금됨을 패널에 표기
}
```

**불변식**
- `from`은 다른 시나리오의 `unlocks`/`choose`에서 파생된 역방향 인덱스다. `unlocks`를 고치면 대상의 `from`도 같이 고친다.
- `blocks`는 `blockedSet()`이 "막힘" 상태를 계산하는 근거다. 상호 배타 관계는 양쪽에 모두 넣는다.
- `loc` 은 개인 퀘스트(숲 탈환·복수·인류의 몰락·원소 표본)가 지역별 클리어 수를 세기 때문에 넣었다. 출처는 gloomhaven-storyline `region_ids` 와 carherco/gloomhaven-online `location` 이 95개 전부 일치한 값(BGG 목록은 #55·#56 을 코퍼넥으로 적었지만 좌표·퀘스트상 단검숲). 한글 지역명은 창작 번역이라 패널에 영문(`LOCEN`)을 병기한다. 패널 태그에 그 지역 클리어 수(`locDone`)를 보이고, 검색은 지역명 띄어쓰기를 무시한다.
- 메인 캠페인(1~51)만 `L.pos`에 좌표가 있다. `side:false`인데 좌표가 없으면 그래프에서 사라진다.

## 4-B. 전투 준비 데이터 (`const MON`, `const MAP`) — 생성물

`tools/build_battle_data.py`가 GHS 원본에서 만들어 `data/battle.js` 전체를 새로 쓴다. **직접 편집 금지.**

```js
const MON=["강도 궁수", ...]          // 58종. 인덱스로 참조
const MAP={ "1": {
  r:[{ n:1,                          // 방 번호
       t:"L1a",                      // 맵 타일 ID. 없으면 "타일 지정 없음"으로 표시
       s:1,                          // 시작 방
       to:[2],                       // 이어지는 방
       tr:[7],                       // 보물 번호
       ob:[1],                       // 이 방의 목표물 (o 배열의 1-based 인덱스)
       mk:"1",                       // 방 마커
       m:[{ m:12,                    // MON 인덱스
            c:[[2,1],[6,0],[4,2]],   // [2인,3인,4인] 각각 [일반, 정예] 수
            b:1 }] }],               // 보스
  o:[{ n:"Hail", e:1, h:"4+(2xL)", mk:"a" }] }}  // 목표물/호위 대상
```

- `MAP`에는 94개 시나리오가 들어간다. **#55는 GHS에 방 정보가 없어 빠져 있다** (UI가 안내 문구로 처리).
- 한글 몬스터 이름은 GHS `monsters` 배열 순서와 `S[id].mons` 순서가 같다는 성질로 역산한다. 생성 스크립트가 95개 시나리오 전체에서 충돌을 검사하고, 하나라도 어긋나면 중단한다. **`S[].mons`의 순서를 임의로 바꾸면 이름 매핑이 깨진다.**
- 인원수는 `pc`(2/3/4)에 보관하고 `localStorage['gh-pc']`에 저장한다. 배치도 팝업의 2/3/4인 선택이 이것을 바꾼다.
- `MAP`은 패널에 방 카드로 그리지 않는다. 검색(타일 ID)과 보물 상자 섹션(`tr`)에만 쓰인다.
- `const TRS=[{t:"아이템 032 Tower Shield", i:[{n,sl,u,c,d,m}]}, ..., {t:"시나리오 17 해금", s:17}]` — 보물 1~75 (인덱스 = 번호-1). 아이템이면 `i`에 이름(원문 영문)·부위·사용 방식(소진/소모/상시)·가격·효과 설명·-1 카드 수, 도안이면 `dz:1`. 효과 설명은 `build_battle_data.py`의 `ITEM_KO`(GHS 영문 라벨을 옮긴 것, 공식 한글판 문구 아님)와 소환수 능력치에서 만든다. 보물 표에 새 아이템이 생기면 `ITEM_KO`에 추가해야 생성이 통과한다. **보물 내용은 검색 대상에 넣지 않는다**(스포일러).
- **클래스 이름 `e` 를 새로 쓰지 말 것.** `refresh()` 가 흐름도 엣지를 `#graph .e` 로 훑는다. 예전에 몬스터 정예 칩이 `.cnt.e` 였다가 `.e.fade`(opacity .15)에 걸려 거의 안 보였다. 지금은 `.cnt.elite` 다.

## 4-C. 헥스 배치도 데이터 (`const TIMG`, `const LAY`) — 생성물

`tools/build_map_layout.py` 가 `data/layout.js` 전체를 새로 쓴다. **직접 편집 금지.**

배치의 바탕은 [Gloomhaven Line of Sight Tool](https://gloomhaven.one/) 번들에 들어 있는 **공식 시나리오 배치 95개**다. 타일 이름·격자 위치·회전이 그대로라 타일이 정확히 맞물린다(95개 전 시나리오에서 타일 간 헥스 겹침 0건). 그 위에 datahaven 의 몬스터·장애물·보물 좌표를 얹는다.

```js
const TIMG={ "L1a":["W7XdxFp.webp",572,422], ... }      // 타일 이미지 파일과 원본 크기
const LAY={ "1": {
  p:[["L1a", imgX, imgY, 회전, 방번호], ...],            // 타일 이미지 배치 (px)
  f:{ "1":[[col,rowStart,개수], ...] },                  // 방별 바닥 헥스 (열별 런렝스)
  m:[[monIdx, hx, hy, t2,t3,t4]],                        // 몬스터: 0 없음 1 일반 2 정예 3 보스
  v:[[ovnIdx, hx, hy, [[x2,y2],...]?]],                 // 장애물·함정·보물. 4번째 값 = 여러 헥스 장애물의 나머지 칸(한 항목 = 장애물 1개)
  s:[[hx,hy]],                                           // 시작 헥스
  d:[[통로여부, hx, hy, 회전, 색]],                        // 문·통로
  k:[["a", hx, hy]],                                     // 시나리오 표식 글자 (datahaven Scenario Aid Token·오버레이 tokens)
  g:[["헤일", hx, hy]],                                   // 호위 대상·아군·목표물 (datahaven figures, FIGURE_KO)
  n:"안내 문구" }}                                        // MAP_WARN / 데이터 없음 안내
const MIMG=["ancient-artillery", ...]  // LMON 과 같은 순서. assets/monsters/<값>.webp, 빈 문자열이면 색 원
const OIMG=["trap-spike", ...]         // OVN 과 같은 순서. assets/overlays/<값>.webp, 빈 문자열이면 색 헥스
```

- 오버레이 한국어 이름 → 그림 대응은 `build_map_layout.py`의 `OVIMG`. 통로는 재질이 한 종류로 묶여 있어 그림 없이 둔다.
- 여러 헥스짜리 장애물(탁자·바위·나무 등)은 datahaven 좌표 한 칸에 첫 조각 그림만 올린다.

**좌표계**: LOS 앱과 같은 **odd-q 오프셋**(홀수 열이 반 칸 아래). 픽셀은 헥스 외접반지름 45px 기준으로 열 간격 67.5, 행 간격 √3·45, 홀수 열은 행의 절반만큼 내려간다. 헥스 좌상단 = `(67.5·x, √3·45·y + (x 홀수 ? √3·45/2 : 0))`, 중심은 거기서 `(+45, +√3·45/2)`.

**타일 이미지 배치**: 타일 요소 원점에서 `(-38, -16)` 만큼 옮긴 자리가 이미지 좌상단이고, 회전별 보정값이 있으면 그 값(원본 60px 기준이라 0.75배)이 축을 덮어쓴다. 이미지는 자기 중심을 기준으로 회전한다. 이 규칙은 LOS 앱의 CSS·레지스트리를 그대로 옮긴 것이다.

**정확도**
- 타일 종류·위치·회전: 공식 배치 그대로. **정확하다.**
- 몬스터·장애물·보물의 헥스: datahaven 좌표를 시나리오마다 (거울·60도 회전·평행이동)으로 공식 격자에 맞춘 것. **요소 3431개 중 3390개(98.8%)가 공식 바닥 안에 떨어진다.**
  - **거울은 항상 1(`MIRROR`)** 이다. 예전엔 바닥 적중 동점일 때 거울 0을 골라 대칭 배치 31곳이 뒤집혀 있었다(#33 등). 시나리오북 페이지와 대조해 확인함.
  - 회전·이동은 `tile_fit()`(TTS 타일 위치 ↔ 공식 타일 중심)이 1순위로 정하고(90곳), 요소의 바닥 적중으로 ±2칸 다듬는다. 타일 정보가 안 맞으면 요소 적중 + 자기 방 타일 적중으로 고른다.
  - 전체 정렬 뒤 방 요소(몬스터·장애물·시작 헥스)가 바닥 밖으로 벗어난 방만 `align_room()`으로 자기 타일에 다시 맞춘다(5곳). 같은 방 표식이 바닥 밖으로 밀려나는 재정렬은 거부한다 — #33 복도는 시작 헥스 2칸이 원래 타일 사이 통로 칸 위다. 모양이 같은 타일(A1~A4)은 두 데이터의 이름이 엇갈리므로 '바닥 안'이면 건드리지 않는다.
  - 여러 헥스 오버레이(책장·탁자·석관·통나무·벽·2칸 바위·어둠의 구덩이·선반 = 2칸, 나무·3칸 바위 = 3칸, `MULTI`)는 datahaven 이 기준 헥스 하나만 주므로 TTS 회전값으로 나머지 칸을 만든다. 방향 규칙 270°/-1, 삼각형 +1 은 24가지 후보 중 추가 칸 193개가 바닥 안 188·겹침 10 으로 가장 잘 맞은 값. 그림은 `OPARTS`(VGB 조각 그림: 2칸 [왼,오], 3칸 [왼위,오위,아래])를 칸을 잇는 방향으로 돌려 맞붙인다. 조각이 없으면 칸마다 1칸 그림.
  - datahaven 좌표는 `{x,y,z}`와 `[x,y,z]` 두 형식이 섞여 있다(133개). `_xyz()`로 둘 다 읽는다. 예전엔 목록 형식을 조용히 버려 #67 압력판 등이 빠졌다.
  - TTS 판 아래 높이(y≈1.65)의 몬스터 21개는 '처음부터 놓이지 않는' 것(나중 등장·등장 지점 대기)이라 뺀다(`SPAWN_Y`). 좌표도 반 칸 어긋나 있다. 보스는 y≈1.82.
  - 배치도 한글 몬스터 이름(`LMON`)은 slug 별로 가장 많이 쓰인 이름. #67 은 stone-golem 모형을 보스 '신비한 골렘'으로 부른다.
  - 전 시나리오(#2~95)를 시나리오북 페이지와 대조 완료(2026-09-28). 4인 기준이라 2·3인 전용 몬스터는 안 보이는 게 맞다.
  - `MANUAL`: datahaven 에 좌표가 없는 시나리오를 시나리오북 페이지에서 직접 옮긴 배치(#34). LAY 정규화 좌표로 적고, 드레이크 인원수별 구성은 모형 띠 색(왼쪽 위 2인·오른쪽 위 3인·아래 4인)에서 읽어 GHS 4인 합계와 대조했다.
  - `TF_OVERRIDE`: 시나리오북과 직접 대조해 정한 변환(#36). `MAP_WARN`/`LAY[id].n`: 배치도에 띄우는 안내(#35·#36 공식 타일 배치가 시나리오북과 다름, #34 datahaven 요소 없음 → 타일만).
  - 확인용 시나리오북 페이지 이미지: `tools/dh_cache/<id>.json` 의 `scenarioPages[].image` (Steam CDN. `http://cloud-3.steamusercontent.com` 은 403 이라 `https://steamusercontent-a.akamaihd.net` 으로 바꿔 받는다). #1 만 없다.
- 몬스터 스탠디 총수는 GHS 와 대조해 95개 중 81개가 완전 일치(나머지는 보스 스탠디 이름 차이나 스폰 물량 차이).
- **#55는 공식 배치에 맵 타일이 없어 지도가 없다**(UI가 버튼을 숨긴다).

## 5. 레이아웃 데이터 (`const L`)

```js
{ w: 2965, h: 797,                      // SVG 논리 크기 (렌더 시 pad=40 추가)
  pos: { "1": [68.5, 339.5], ... },      // 노드 중심 좌표 51개
  edges: [ { a:1, b:2, t:"u", p:[[x,y],...] } ] }  // 67개
```

- `t`: `"u"` 일반 해금(실선), `"c"` 셋 중 하나만 선택(점선), `"t"` 보물로 해금(도트).
- `p`는 미리 계산된 폴리라인 좌표다. **생성 스크립트가 저장소에 없다.** 좌표는 손으로 유지된다.
- 따라서 노드를 추가/이동하려면 `L.pos`, 관련 `L.edges[].p`, 필요하면 `L.w/h`를 함께 갱신해야 한다. 엣지 경로를 갱신하지 않으면 선이 노드와 어긋난다.
- 엣지의 화살표 마커는 `refresh()`가 선택 상태에 따라 `#ar-in`/`#ar-out`/`#ar-u|c|t`로 교체한다.

## 5-B. 진행 상태 (`statuses()`)

| 상태 | 뜻 | 판정 |
|---|---|---|
| `done` | 클리어함 | `done` Set |
| `open` | 지금 진행 가능 | 해금됨(#1이거나 `from` 중 하나가 클리어, 또는 `tfrom`+#37) & 미클리어 & 안 막힘 & 업적 조건 통과 |
| `req` | 업적 조건 미충족 | 해금은 됐지만 `reqs` 판정이 `fail` |
| `blocked` | 선택으로 막힘 | `blockedSet()` |
| `ext` | 이벤트·보물로 해금 | `from`이 없고 `src` 설명만 있는 경우(주로 사이드) |
| `pick` | 하나만 해금 선택 대기 | 출처가 `choose`(#13 → 15·17·20)이고 출처는 클리어했지만 아직 고르지 않음 |
| `locked` | 아직 잠김 | 나머지 |

- 업적은 클리어한 시나리오의 `rw`에서 `파티 업적: X` / `전역 업적: X`를 세고, `잃는 업적: X`로 뺀다.
- **도시·도로 이벤트나 아이템으로만 얻는 업적은 판정할 수 없다.** 그런 업적을 요구하면 `fail`이 아니라 통과로 처리한다(`GRANTABLE`에 없으면 `unknown`). 잠겨 있을 것을 열어 보여주는 쪽이 낫다는 판단이며, 반대로 바꾸지 말 것.
- `×N` 접미사(예: `오염 종식 ×3`)는 같은 업적 N회를 뜻한다.
- 헤더의 **▶ 진행 가능 N** 버튼은 `onlyOpen` 필터를 토글한다. 클리어한 시나리오에서 진행 가능한 시나리오로 가는 엣지는 `.e.next`(황동색)로 강조된다(선택 중일 때는 선택 강조가 우선).

## 6. 상태와 저장

| 키 | 값 | 비고 |
|---|---|---|
| `localStorage['gh-done']` | 클리어한 시나리오 id 배열(JSON) | `done` Set으로 로드. try/catch로 감싸 실패해도 동작 |
| `localStorage['gh-choice']` | `{"13": 17}` | '하나만 해금'에서 고른 시나리오. try/catch |
| `localStorage['gh-sort']` | `"rel"` \| `"id"` \| `"st"` \| `"field"` | 검색 결과 목록 정렬. 없으면 관련도 |
| `localStorage['gh-theme']` | `"light"` \| `"dark"` | `documentElement.dataset.theme`에 반영. **저장값이 없으면 시스템 설정과 무관하게 다크**(head 의 인라인 스크립트가 첫 페인트 전에 적용) |

- 서버 저장·계정·동기화 없음. 사파리 프라이빗 모드 등에서 읽기/쓰기가 던질 수 있으므로 **모든 접근은 try/catch를 유지한다.**
- **상세 패널은 저장하지 않는다.** 닫힌 채 시작 → 노드/카드를 누르면 열림 → 빈 곳 클릭(`deselect()`)·× 버튼·다른 탭으로 전환하면 닫힘(헤더의 수동 토글 ▤ 버튼과 빈 패널 안내문은 2026-09-29 헤더 정리 때 없앴다). 넓은 화면은 `.off`(슬라이드), 좁은 화면은 바텀시트 `.open`.
- 사이드 탭은 넓은 화면에서 `#side>*` 폭을 `--sidew`(패널 닫힌 기준, `sizeSide()`)로 고정해 패널이 열려도 카드 배치가 바뀌지 않는다. 가려진 부분은 가로 스크롤.
- 선택 중에도 진행 흐름 엣지(`.e.next`)는 `.e.fade.next`(opacity .45)로 흐리게 남긴다.
- **하나만 해금**(`S[id].choose`, GHS `chooseLocation` — 1판에서는 #13 뿐): #13 패널에서 고른 값을 `localStorage['gh-choice']` = `{"13":17}` 로 저장. 고를 수 있는 후보는 흐름도에서 `.n.pick`(청록 채움·두꺼운 테두리·깜빡임·'고르기' 표시)과 `.e.pickable` 선으로 강조하고, 후보 패널에서도 '이 시나리오로 고르기'로 바로 고른다. #13 을 클리어 체크하면 선택 팝업(`openPick(src,true)`)이 뜨고 **하나를 골라야 클리어가 확정**된다(취소·Esc 는 클리어하지 않음). #13 클리어를 해제하면 `choice[13]` 도 지워 다시 클리어할 때 새로 고른다. #13 패널의 고르는 칸(`pickBox`)은 클리어 버튼 바로 아래. 클리어 해제 시 `cascadeUndo()`가 더 이상 열릴 수 없는 뒤쪽 시나리오의 클리어도 연쇄 해제한다(글로 적힌 다른 해금 경로가 있는 시나리오는 제외). 고르지 않았어도 후보 중 하나를 클리어했으면 그것을 고른 것으로 보되, 다른 경로로 열렸을 수 있어 언제든 바꿀 수 있다. 고르지 않은 후보는 다른 경로(#39→15, #37 보물→17, #7→20)가 없으면 잠김. 고르지 않은 쪽 점선 엣지는 `.e.nopick`.
- 다른 갈림길(서로 막힘 11곳, '미달성이어야 함' 조건 13곳)은 `blocks`·`reqs` 로 처리된다.
- **초기화**(`#reset`, 오른쪽 아래 `#zoomctl` 의 +/−/맞춤 아래)는 `done`·`choice`를 모두 비운다. 사이드 탭에서는 확대 버튼(`.zb`)만 숨고 초기화는 남는다. 누르면 사이트 팝업(`#resetwrap`, `.pickdlg` 모양)으로 지울 개수를 보여 주고 확인받는다. 기본 포커스는 취소, Esc 로 닫힘. 브라우저 `confirm()`은 쓰지 않는다. 버튼 글자를 바꾸는 2단계 방식은 사용자가 거부했다. 지울 것이 없으면 `refresh()` 가 버튼을 `disabled` 로 만든다(흐리게).
- "막힘"은 저장하지 않는다. `blockedSet()`이 `done`에서 매번 계산한다.

## 7. 작업 규칙

- **HTML 주입 시 `esc()` 필수.** 데이터에서 온 모든 문자열은 `esc()`를 거친다. 새 필드를 패널에 추가할 때도 동일.
- **`file://` 로 열어도 동작해야 한다.** 파일은 `css/`·`js/`·`data/` 로 나뉘어 있지만(§2·§3) 모두 일반 `<script src>`·`<link>` 로 불러온다. ES 모듈, `fetch()` 로 JSON 읽기, 번들러를 쓰지 않는다. 데이터는 `.json` 이 아니라 `const X=...;` 를 담은 `.js` 로 둔다.
- **한 파일은 한 가지 일.** 새 기능은 맞는 `js/*.js` 에 넣고, 파일이 여러 역할을 하게 되면 나눈다(§3 규칙대로 순서 등록).
- **CSS 변수로만 색을 쓴다.** 하드코딩된 hex를 새로 넣지 말고 `var(--brass)` 등을 쓴다. 라이트/다크 3중 정의를 모두 갱신한다.
- **파란색 버튼을 쓰지 않는다.** 액션 강조는 `--brass`/`--moss` 계열을 쓴다.
- 데이터 일괄 수정은 Python으로 `data/scenarios.js` 의 `const S=` 행을 파싱→수정→직렬화하는 방식이 안전하다:
  ```python
  import re, json
  h = open('data/scenarios.js', encoding='utf-8').read()
  m = re.search(r'const S=(\{.*?\});\n', h, re.S)
  S = json.loads(m.group(1))
  # ... 수정 ...
  h = h[:m.start(1)] + json.dumps(S, ensure_ascii=False) + h[m.end(1):]
  open('data/scenarios.js', 'w', encoding='utf-8', newline='
').write(h)
  ```
- 커밋 전 확인: 브라우저로 `index.html`을 열어(파일로 직접 한 번, 로컬 서버로 한 번) ① 메인 탭 그래프가 어긋남 없이 그려지는지 ② 사이드 탭 ③ 노드 클릭 시 패널 ④ 검색(번호/이름/지역/몬스터) ⑤ 클리어 체크 후 새로고침 유지 ⑥ 테마 전환 ⑦ 좁은 폭(모바일) 레이아웃 ⑧ 배치도·보물·초기화 팝업. 콘솔에 에러가 없어야 한다(전역 이름 충돌은 페이지 전체를 멈춘다).
- 구조를 바꾸는 리팩터링은 헤드리스 크롬으로 바꾸기 전·후의 렌더 결과(흐름도·사이드·여러 패널·배치도 innerHTML, 클릭 조작 뒤 상태)를 떠서 비교한다. 2026-09-28 파일 분리 때 이 방법으로 원본과 완전히 같음을 확인했다.

## 8. 배포 (Cloudflare Workers)

`main`에 push하면 Cloudflare 에 자동 배포된다. **push 는 사용자가 지시할 때만 한다.**
GitHub Pages 는 2026-09-28 사용자 요청으로 껐다(`.nojekyll` 도 삭제). 다시 켜지 않는다.

- URL: https://gloomhaven-flow.krindale.workers.dev — carnegie-setup-helper 와 같은 구성
- `.github/workflows/deploy-cloudflare.yml`: `index.html` + `css/ js/ data/ assets/` 만 `dist/` 로 복사 → `wrangler deploy`(4.135.0 고정). 페이지 빌드가 아니라 복사일 뿐이다. `dist/`·`.wrangler/` 는 gitignore.
- `wrangler.jsonc`: `assets.directory = ./dist`. 저장소 루트를 올리면 `tools/`·`.git` 까지 올라가므로 바꾸지 않는다.
- 저장소 시크릿 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`(`gh secret list -R krindale/gloomhaven-flow`). 토큰은 사용자가 직접 등록한다. `!` 로 `gh secret set` 을 실행하면 입력 창이 없어 빈 값이 들어가니 별도 터미널에서 넣게 한다.
- 로컬 점검: `mkdir dist && cp index.html dist/ && cp -r css js data assets dist/ && npx -y wrangler@4.135.0 deploy --dry-run` (파일 약 180개가 정상). 끝나면 `dist/` 삭제.
- 상태 확인: `gh run list -R krindale/gloomhaven-flow --workflow deploy-cloudflare.yml`

## 9. 정확도 정책 (사용자 확정 사항)

페이지에 표시되는 신뢰도 구분은 아래가 기준이다. 화면 오른쪽 위 **ⓘ** 버튼(`showInfo()`, 프로젝트 소개 맨 아래 접이식 정확도 칸)과 README, 각 시나리오 패널 하단 `foot(s)`가 이 내용을 그대로 반영한다. 셋을 고칠 때는 함께 고친다.

| 항목 | 신뢰도 | 근거 |
|---|---|---|
| 요구 조건·몬스터·보상·해금·차단 | 높음 | Gloomhaven Secretariat 오픈소스 데이터 그대로 |
| 목표·특수 규칙 (95개 전부) | 대조 완료 | 시나리오북 원문 대조. `gv:1`. 42번 이후 47개는 2026-09-28 datahaven 시나리오북 페이지 스캔으로 대조(33개 목표 수정, `note` 는 원문 특수 규칙으로 교체) |
| 줄거리 (메인) | 원문 기반 | 충실히 요약 |
| 줄거리 (사이드) | 의도적 축약 | 스토리를 지어내지 않고 해금 경로·규칙만 |
| 한국어 시나리오명 | 비공식 | 공식 한글판 명칭 아님. 영문명 병기로 보완 |

- **추측으로 `gv`를 1로 올리지 않는다.** 시나리오북 원문(사용자 제공 사진, 또는 `tools/dh_cache/<id>.json` 의 `scenarioPages` 스캔 — 사용자가 2026-09-28 이 출처 사용을 지시)을 읽었을 때만 `goal`/`sum`/`note`를 원문 기준으로 고치고 `gv:1`로 바꾼다.
- 사이드 시나리오의 `sum`에 없는 스토리를 창작해 넣지 않는다.
- `확인 필요` 개수는 `showInfo()`가 `gv:0`을 세어 실시간으로 표시하고, 0개면 섹션을 숨긴다. 하드코딩된 숫자를 넣지 않는다.

## 10. 출처와 라이선스 주의

- 요구 조건·몬스터·보상·해금 관계: [Gloomhaven Secretariat](https://github.com/Lurkars/gloomhavensecretariat) (AGPL-3.0) 데이터 기반.
- 사이드 시나리오 해금 경로: [gloomhaven-storyline](https://github.com/teamducro/gloomhaven-storyline) 참고.
- 방·타일·인원수별 몬스터 구성: Gloomhaven Secretariat 시나리오 JSON (AGPL-3.0).
- 보물 상자 내용·아이템 이름: Gloomhaven Secretariat `treasures.json`·`items.json` (AGPL-3.0).
- **배치도의 타일 이미지(`assets/tiles/`)와 공식 시나리오 배치**: Cephalofair Games 의 [Creator Pack](https://boardgamegeek.com/thread/1733586/files-creation) 자산으로 **CC BY-NC-SA 4.0**이다. [Gloomhaven Line of Sight Tool](https://gloomhaven.one/)이 쓰는 것과 같은 파일이며, 비영리 팬 페이지에서 출처·라이선스를 밝히고 쓴다. **출처 표기를 지우지 말 것.**
- 헥스 단위 몬스터·장애물 좌표: [Sebaestschjin/datahaven](https://github.com/Sebaestschjin/datahaven).
- **캠페인 지도 그림(`assets/map/`)**: Cephalofair Games 원본(CC BY-NC-SA 4.0 로 보고 사용). Creator Pack 에서 원본을 찾지 못해 [gloomhaven-storyline](https://github.com/teamducro/gloomhaven-storyline)(README 에 CC BY-NC-SA 4.0 명시) 저장소 파일을 받았다(2026-09-29 사용자 결정). 시나리오·전역 업적 스티커 그림(`assets/stickers/`)도 storyline 저장소의 것(같은 라이선스)이다(2026-09-29 사용자 요청: '스토리라인에 다 있는 스티커를 써라'). 팝업의 '출처·라이선스'와 README 출처 표기를 지우지 말 것. 시나리오 좌표는 storyline 것을 쓰지 않고 그림에서 직접 찾았다.
- 배치도 몬스터 초상·오버레이 그림: 역시 Creator Pack(CC BY-NC-SA 4.0). 몬스터는 [GHS](https://github.com/Lurkars/gloomhavensecretariat) 썸네일, 오버레이는 [Virtual Gloomhaven Board](https://github.com/PurpleKingdomGames/virtual-gloomhaven-board) 경유. **[worldhaven](https://github.com/any2cards/worldhaven) 그림은 제3자 재사용 금지라 쓰지 않는다.**
- 한국어 시나리오명·줄거리는 이 페이지용 창작 요약.
- Gloomhaven은 Cephalofair Games 상표. 비공식 팬 페이지이며 README의 출처·상표 표기를 제거하지 않는다.
