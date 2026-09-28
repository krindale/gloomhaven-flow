# 글룸헤이븐 1판 시나리오 흐름도

95개 시나리오의 해금 관계, 목표, 요구 조건, 몬스터, 보상, 줄거리를 한 페이지에서 보는 인터랙티브 흐름도입니다. 스포일러가 전부 포함되어 있습니다.

- **메인 캠페인** 탭: 1~51번 흐름도 / **사이드** 탭: 52~95번 목록 — 합쳐서 95개 전부
- 클리어 체크는 브라우저 localStorage에 저장 (서버 저장·계정 없음)
- 클리어하면 **지금 진행할 수 있는 시나리오**가 황동색 ▶ 표시로 켜지고, 잠긴 것은 흐려집니다. 헤더의 **▶ 진행 가능 N**을 누르면 그것만 볼 수 있습니다
- 헤더의 **ⓘ 정확도** 버튼에 어디까지 믿어도 되는지 정리해 두었습니다
- **🗺 헥스 배치도** (패널 제목 옆 버튼): 실제 맵 타일 이미지로 그린 시나리오 지도 위에 몬스터·장애물·함정·보물·문·시작 헥스를 헥스 단위로 표시합니다. 2/3/4인 전환, 헥스에 마우스를 올리면 그 칸의 정보가 나옵니다 (94개 시나리오, 팝업)
- 각 시나리오의 **보물 상자**: 방별 보물 번호가 잠긴 채로 나오고, **열어 보기**를 눌러야 내용(아이템·금화·함정·해금 시나리오 등)이 보입니다
- 보스가 나오는 시나리오는 흐름도에 **☠** 로 표시됩니다 (24개)

## 배치도의 정확도

타일 종류·위치·회전은 [Gloomhaven Line of Sight Tool](https://gloomhaven.one/)이 들고 있는 **공식 시나리오 배치**를 그대로 씁니다. 95개 전 시나리오에서 타일끼리 헥스가 한 칸도 겹치지 않는 것을 확인했습니다.

몬스터·장애물·보물의 헥스 위치와 인원수별 일반/정예 구분은 Tabletop Simulator 배치 데이터([datahaven](https://github.com/Sebaestschjin/datahaven))에서 가져와 공식 격자에 맞췄고, 요소 3431개 중 3390개(98.8%)가 타일 위에 정확히 떨어집니다. 대칭에 가까운 시나리오에서 배치가 뒤집혀 있던 문제(31개)를 시나리오북 페이지와 대조해 바로잡았고, #34는 원본 좌표 데이터가 없어 시나리오북을 보고 직접 옮겨 넣었고, #35·#36은 공식 타일 배치가 시나리오북과 달라 안내 문구를 함께 보여 줍니다. 몬스터 스탠디 총수를 Gloomhaven Secretariat 데이터와 대조하면 95개 중 81개가 완전히 일치하고, 나머지는 보스 스탠디 이름 차이이거나 스폰 물량을 미리 깔아 둔 경우입니다.

#55(안개 덤불)는 공식 배치에 맵 타일이 없어 지도가 없습니다.

## 정확도

- **요구 조건·몬스터·보상·해금·차단 관계**: Gloomhaven Secretariat 오픈소스 데이터를 그대로 사용해 신뢰도가 높습니다.
- **목표·특수 규칙**: 95개 전부 시나리오북 원문과 대조했습니다. 42번 이후 47개는 datahaven 에 연결된 시나리오북 페이지 스캔을 읽어 원문대로 고쳤습니다(33개의 목표가 바뀜). 번역은 이 페이지에서 옮긴 것이라 공식 한글판 문구와는 다를 수 있습니다.
- **줄거리**: 메인 스토리는 원문 기반으로 작성. 사이드 시나리오는 스토리를 지어내지 않으려고 해금 경로·규칙 위주로만 짧게 적었습니다.
- **시나리오 지역**(단검숲·코퍼넥 산맥 등, 개인 퀘스트용): gloomhaven-storyline 과 gloomhaven-online 데이터가 95개 전부 일치하는 값을 썼습니다. 여섯 지역 밖(도시 외곽·다른 차원 등) 시나리오 20개는 지역을 표시하지 않습니다. 지역 한글 이름도 이 페이지에서 옮긴 것이라 영문을 함께 적었습니다.
- **한국어 시나리오명**: 공식 한글판 명칭이 아니라 이 페이지에서 옮긴 이름이라 실물 책과 다를 수 있습니다.

## 데이터 출처
- 요구 조건·몬스터·보상·해금 관계: [Gloomhaven Secretariat](https://github.com/Lurkars/gloomhavensecretariat) 데이터 (AGPL-3.0)
- 보물 상자 내용·아이템 이름: Gloomhaven Secretariat `treasures.json`·`items.json` (AGPL-3.0)
- 사이드 시나리오 해금 경로 참고: [gloomhaven-storyline](https://github.com/teamducro/gloomhaven-storyline)
- 시나리오 지역: [gloomhaven-storyline](https://github.com/teamducro/gloomhaven-storyline) `scenarios.json` 의 `region_ids`, [gloomhaven-online](https://github.com/carherco/gloomhaven-online) 과 대조
- 헥스 단위 몬스터·장애물 좌표: [Sebaestschjin/datahaven](https://github.com/Sebaestschjin/datahaven)
- 배치도의 맵 타일 이미지와 공식 시나리오 배치: Cephalofair Games [Creator Pack](https://boardgamegeek.com/thread/1733586/files-creation) (CC BY-NC-SA 4.0), [Gloomhaven Line of Sight Tool](https://gloomhaven.one/) 경유
- 배치도의 몬스터 초상: Creator Pack (CC BY-NC-SA 4.0), [Gloomhaven Secretariat](https://github.com/Lurkars/gloomhavensecretariat) 경유
- 배치도의 장애물·함정·보물 그림: Creator Pack (CC BY-NC-SA 4.0), [Virtual Gloomhaven Board](https://github.com/PurpleKingdomGames/virtual-gloomhaven-board) 경유
- 한국어 시나리오명·줄거리 요약은 이 페이지용으로 새로 작성

Gloomhaven은 Cephalofair Games의 상표입니다. 비공식 팬 제작 페이지입니다.
