# CLAUDE.md

글룸헤이븐 1판 시나리오 흐름도 — 정적 단일 페이지 웹앱. GitHub Pages로 배포한다.

## 1. 프로젝트 개요

- **목적**: 글룸헤이븐 1판 시나리오 95개의 해금 관계·목표·요구 조건·몬스터·보상·줄거리를 한 페이지에서 추적한다.
- **성격**: 빌드 없음, 의존성 없음, 서버 없음. `index.html` 하나가 앱 전체다.
- **스포일러**: 전체 공개가 의도된 설계다. 스포일러 가리기 기능을 임의로 넣지 않는다.
- **언어**: UI·데이터·문서 모두 한국어(`<html lang="ko">`). 영문 시나리오명은 보조 표기로만 병기한다.

## 2. 파일 구조

```
index.html              앱 전체 (CSS + 데이터 + 로직 인라인)
README.md               공개용 설명과 데이터 출처 표기
.nojekyll               GitHub Pages의 Jekyll 처리 비활성화 (삭제 금지)
CLAUDE.md               이 문서
tools/fetch_ghs.py      GHS 시나리오 JSON 1~95를 tools/ghs_cache/ 로 내려받음
tools/build_battle_data.py  index.html 의 const MON/MAP 블록을 다시 생성
tools/ghs_cache/        GHS 원본 JSON 95개 (생성 입력값, 재현용으로 커밋)
tools/fetch_layouts.py  datahaven 배치 좌표를 tools/dh_cache/ 로 내려받음
tools/build_map_layout.py   index.html 의 const LMON/OVN/LAY 블록을 다시 생성 (--bbox 필수)
tools/_emit.py          위 스크립트의 검증·인코딩 보조
tools/dh_cache/         datahaven 원본 JSON 95개
```

`tools/`는 **페이지 빌드 단계가 아니다.** 전투 준비 데이터를 다시 만들 때만 수동으로 돌린다. 배포는 여전히 `index.html`을 그대로 서빙한다.

빌드 산출물·`package.json`·번들러·프레임워크가 **없다**. 추가하지 않는다.
외부 리소스는 Google Fonts(Gowun Batang, IBM Plex Sans KR) 뿐이다. 오프라인에서도 폰트만 대체되고 정상 동작해야 한다.

## 3. index.html 내부 지도

줄 번호는 변동되므로 아래 앵커 문자열로 찾는다.

| 영역 | 앵커 | 내용 |
|---|---|---|
| 테마 토큰 | `:root{` | CSS 변수. 다크가 기본, `prefers-color-scheme` + `data-theme` 오버라이드 3중 정의 |
| 마크업 | `<header>` ~ `</main>` | 헤더(탭·검색·범례·진행도·테마), `#graph`/`#side` 뷰, `#panel` 상세 패널 |
| 시나리오 데이터 | `const S=` | id 문자열 키 → 시나리오 객체 95개 (단일 행, 약 74KB) |
| 레이아웃 데이터 | `const L=` | 메인 캠페인 그래프의 좌표·엣지 경로 (단일 행, 약 10KB) |
| 사이드 그룹 | `const SIDE=` | 사이드 시나리오 분류와 체인 배열 |
| 전투 준비 데이터 | `const MON=` / `const MAP=` | **생성물.** 손으로 고치지 말고 `tools/build_battle_data.py`로 다시 만든다 |
| 전투 준비 렌더 | `function roomsHtml(id)` | 방 카드 + 타일 이미지 + 인원수별 몬스터 |
| 헥스 배치 데이터 | `const LMON=` / `const OVN=` / `const LAY=` | **생성물.** `tools/build_map_layout.py --bbox` 로만 갱신 |
| 헥스 지도 렌더 | `function mapSvg(id,s)` / `openMap(id)` | 전체 화면 오버레이 `#mapwrap` |
| 그래프 렌더 | `function buildGraph()` | `L`로 SVG 생성. 노드 크기 `NW=190, NH=62` |
| 사이드 렌더 | `function buildSide()` | `SIDE`로 카드 목록 생성 |
| 상세 패널 | `function renderPanel(id)` | `S[id]`의 모든 필드를 섹션별로 출력 |
| 상태 갱신 | `function refresh()` | 클리어/막힘/선택/검색 상태를 클래스 토글로 반영 |
| 진행 상태 계산 | `function statuses()` | done/open/req/blocked/ext/locked 6상태 |
| 업적 집계 | `function achievements()` | 클리어한 시나리오 보상에서 업적 수를 센다 |
| 정확도 안내 | `function showInfo()` | 헤더 ⓘ 버튼. `gv:0` 목록을 실시간 집계 |
| 패널 하단 고지 | `function foot(s)` | `side`/`gv`에 따라 문구 분기 |
| 초기화 | `buildGraph();buildSide();refresh();` | 파일 최하단. 초기 줌은 폭 700px 미만이면 0.6, 아니면 0.72 |

## 4. 데이터 스키마 (`const S`)

```js
"1": {
  id: 1,                   // 숫자. 키(문자열)와 반드시 일치
  ko: "검은 봉분",          // 한국어 시나리오명 (이 페이지용 창작 번역)
  en: "Black Barrow",      // 원문 영문명
  grid: "G-10",            // 캠페인 지도 좌표
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
- 메인 캠페인(1~51)만 `L.pos`에 좌표가 있다. `side:false`인데 좌표가 없으면 그래프에서 사라진다.

## 4-B. 전투 준비 데이터 (`const MON`, `const MAP`) — 생성물

`tools/build_battle_data.py`가 GHS 원본에서 만들어 `index.html` 안의 생성 블록 주석 사이에 써 넣는다. **직접 편집 금지.**

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
- 인원수는 `pc`(2/3/4)에 보관하고 `localStorage['gh-pc']`에 저장한다. 해당 인원수에서 0마리인 몬스터는 줄 자체를 그리지 않는다.
- 타일 이미지는 jsDelivr로 worldhaven에서 불러온다(`TILE()`). 저장소에 이미지를 복사해 넣지 않는다. 로드 실패 시 `onerror`가 타일 ID 안내 박스로 대체한다.

## 4-C. 헥스 배치 데이터 (`const LAY`) — 생성물

`tools/build_map_layout.py --bbox` 가 datahaven(Tabletop Simulator 배치 좌표)에서 만든다. **직접 편집 금지.**

```js
const LMON=["강도 경비병", ...]        // datahaven 몬스터 이름순 한국어 이름
const OVN=[["trap","가시 함정"], ...]   // 오버레이/문 종류: [분류, 한국어]
const LAY={ "1": {
  r:[{ n:1, t:"L1a",
       f:[[row, colStart, 개수], ...],      // 바닥 헥스, 행별 런렝스 (col 은 2칸 간격)
       m:[[monIdx, c, r, t2, t3, t4]],      // t*: 0 없음 1 일반 2 정예 3 보스
       s:[[c,r]],                           // 시작 헥스
       v:[[ovnIdx, c, r]] }],               // 장애물·함정·보물·통로
  d:[[ovnIdx, c, r, 방A, 방B]] }}           // 문·안개
```

**좌표계**: 평평한 윗면(flat-top) 헥스를 쓰는 배가(doubled) 좌표. 가로 이웃은 `(c±1, r±1)`, 세로 이웃은 `(c, r±2)`, `c+r` 은 항상 같은 패리티다. 화면 좌표는 `X = c·1.5s`, `Y = r·(√3/2)s`.

**정확한 것 / 추정인 것**
- 몬스터·장애물·함정·보물·문·시작 헥스의 좌표와 인원수별 등급: datahaven 원본 그대로. **정확하다.**
- **바닥 타일 모양은 추정이다.** 타일 한 면의 전체 헥스 목록은 어떤 공개 데이터에도 없어서, 같은 타일 면을 쓴 모든 시나리오의 점유 헥스를 평행이동으로 정렬해 합집합을 만들고 그 외접 사각형을 채운다(`--bbox`). 실제 타일 가장자리와 다를 수 있고, UI 하단에 그렇게 고지한다.
- 검증: 몬스터 스탠디 총수를 GHS와 대조해 **81/95 시나리오가 완전 일치**한다. 나머지 14개는 보스 스탠디 이름 차이(#36, #49, #58, #62, #87, #88, #95)이거나 datahaven 이 스폰 물량을 미리 깔아 둔 경우(#19, #41, #57, #69, #74, #78)다.
- 방 바닥의 연결성: 문·통로 헥스를 포함하면 94개 중 65개가 완전히 하나로 이어진다. 나머지는 바닥 추정이 짧아 생긴 틈이다.

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
| `locked` | 아직 잠김 | 나머지 |

- 업적은 클리어한 시나리오의 `rw`에서 `파티 업적: X` / `전역 업적: X`를 세고, `잃는 업적: X`로 뺀다.
- **도시·도로 이벤트나 아이템으로만 얻는 업적은 판정할 수 없다.** 그런 업적을 요구하면 `fail`이 아니라 통과로 처리한다(`GRANTABLE`에 없으면 `unknown`). 잠겨 있을 것을 열어 보여주는 쪽이 낫다는 판단이며, 반대로 바꾸지 말 것.
- `×N` 접미사(예: `오염 종식 ×3`)는 같은 업적 N회를 뜻한다.
- 헤더의 **▶ 진행 가능 N** 버튼은 `onlyOpen` 필터를 토글한다. 클리어한 시나리오에서 진행 가능한 시나리오로 가는 엣지는 `.e.next`(황동색)로 강조된다(선택 중일 때는 선택 강조가 우선).

## 6. 상태와 저장

| 키 | 값 | 비고 |
|---|---|---|
| `localStorage['gh-done']` | 클리어한 시나리오 id 배열(JSON) | `done` Set으로 로드. try/catch로 감싸 실패해도 동작 |
| `localStorage['gh-theme']` | `"light"` \| `"dark"` | `documentElement.dataset.theme`에 반영 |

- 서버 저장·계정·동기화 없음. 사파리 프라이빗 모드 등에서 읽기/쓰기가 던질 수 있으므로 **모든 접근은 try/catch를 유지한다.**
- "막힘"은 저장하지 않는다. `blockedSet()`이 `done`에서 매번 계산한다.

## 7. 작업 규칙

- **HTML 주입 시 `esc()` 필수.** 데이터에서 온 모든 문자열은 `esc()`를 거친다. 새 필드를 패널에 추가할 때도 동일.
- **단일 파일 유지.** CSS·JS를 별 파일로 쪼개지 않는다. 데이터를 외부 JSON으로 빼지 않는다(파일 열기만으로 동작해야 한다).
- **CSS 변수로만 색을 쓴다.** 하드코딩된 hex를 새로 넣지 말고 `var(--brass)` 등을 쓴다. 라이트/다크 3중 정의를 모두 갱신한다.
- **파란색 버튼을 쓰지 않는다.** 액션 강조는 `--brass`/`--moss` 계열을 쓴다.
- 데이터 일괄 수정은 Python으로 `const S=` 행을 파싱→수정→직렬화하는 방식이 안전하다:
  ```python
  import re, json
  h = open('index.html', encoding='utf-8').read()
  m = re.search(r'const S=(\{.*?\});\n', h, re.S)
  S = json.loads(m.group(1))
  # ... 수정 ...
  h = h[:m.start(1)] + json.dumps(S, ensure_ascii=False) + h[m.end(1):]
  open('index.html', 'w', encoding='utf-8').write(h)
  ```
- 커밋 전 확인: 브라우저로 `index.html`을 열어 ① 메인 탭 그래프가 어긋남 없이 그려지는지 ② 사이드 탭 ③ 노드 클릭 시 패널 ④ 검색(번호/이름/몬스터) ⑤ 클리어 체크 후 새로고침 유지 ⑥ 테마 전환 ⑦ 좁은 폭(모바일) 레이아웃.

## 8. 배포 (GitHub Pages)

- 저장소: `krindale/gloomhaven-flow`, 공개. `main` 브랜치 루트를 그대로 서빙한다.
- 공개 URL: https://krindale.github.io/gloomhaven-flow/
- 빌드 단계가 없으므로 `main`에 push하면 몇 분 안에 반영된다. Actions 워크플로를 추가할 필요가 없다.
- `.nojekyll`이 없으면 Jekyll이 개입한다. 지우지 않는다.
- 상태 확인: `gh api repos/krindale/gloomhaven-flow/pages`

## 9. 정확도 정책 (사용자 확정 사항)

페이지에 표시되는 신뢰도 구분은 아래가 기준이다. 헤더 **ⓘ 정확도** 버튼(`showInfo()`)과 README, 각 시나리오 패널 하단 `foot(s)`가 이 내용을 그대로 반영한다. 셋을 고칠 때는 함께 고친다.

| 항목 | 신뢰도 | 근거 |
|---|---|---|
| 요구 조건·몬스터·보상·해금·차단 | 높음 | Gloomhaven Secretariat 오픈소스 데이터 그대로 |
| 목표 (1~41 + 일부 사이드) | 대조 완료 | 시나리오북 원문 대조. `gv:1` |
| 목표 (42 이후 상당수, 47개) | 미확인 | 원문 미확보. `gv:0` → 패널에 "확인 필요" 배지 |
| 줄거리 (메인) | 원문 기반 | 충실히 요약 |
| 줄거리 (사이드) | 의도적 축약 | 스토리를 지어내지 않고 해금 경로·규칙만 |
| 한국어 시나리오명 | 비공식 | 공식 한글판 명칭 아님. 영문명 병기로 보완 |

- **추측으로 `gv`를 1로 올리지 않는다.** 사용자가 시나리오북 페이지 사진을 제공했을 때만 해당 `goal`/`sum`을 원문 기준으로 고치고 `gv:1`로 바꾼다.
- 사이드 시나리오의 `sum`에 없는 스토리를 창작해 넣지 않는다.
- `확인 필요` 개수는 `showInfo()`가 `gv:0`을 세어 실시간으로 표시한다. 하드코딩된 숫자를 넣지 않는다(README의 47개 표기만 수동).

## 10. 출처와 라이선스 주의

- 요구 조건·몬스터·보상·해금 관계: [Gloomhaven Secretariat](https://github.com/Lurkars/gloomhavensecretariat) (AGPL-3.0) 데이터 기반.
- 사이드 시나리오 해금 경로: [gloomhaven-storyline](https://github.com/teamducro/gloomhaven-storyline) 참고.
- 방·타일·인원수별 몬스터 구성: Gloomhaven Secretariat 시나리오 JSON (AGPL-3.0).
- 맵 타일 이미지: [any2cards/worldhaven](https://github.com/any2cards/worldhaven)에서 jsDelivr로 불러온다(복사·재배포하지 않음). 타일 아트는 Cephalofair Games 저작물이다.
- 한국어 시나리오명·줄거리는 이 페이지용 창작 요약.
- Gloomhaven은 Cephalofair Games 상표. 비공식 팬 페이지이며 README의 출처·상표 표기를 제거하지 않는다.
