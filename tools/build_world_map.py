"""캠페인 지도 팝업 데이터를 만든다.

1. 지도 그림과 스티커 그림(시나리오 95개 × 미클리어/클리어, 전역 업적)을 gloomhaven-storyline
   저장소에서 받아 tools/world_cache/ 에 둔다(없을 때만). 그림은 Cephalofair Games 의 것
   (CC BY-NC-SA 4.0)이고 storyline 을 거쳐 가져온다.
2. assets/map/gloomhaven.webp, assets/stickers/*.webp 로 다시 인코딩한다.
3. 지도에 인쇄된 시나리오 번호 동그라미를 허프 원 검출로 찾고, 각 동그라미의 번호는
   사람이 확대 이미지로 읽은 값(LABELS)으로 붙인다. 시나리오 grid 값만으로는 한 칸에
   동그라미가 여러 개라 자동 배정이 틀린다(2026-09-29 확인).
4. 시나리오 스티커 안의 번호 동그라미도 같은 방법으로 찾는다(스티커는 지도와 1:1 배율).
   잘못 잡힌 6개는 STK_FIX 로 고쳤다. 스티커의 동그라미를 지도의 동그라미에 겹치면 제자리다.
5. data/world.js (const WMAP, WPOS, WSTK, WACH) 를 새로 쓴다.

필요: opencv-python, numpy, pillow
"""
import json, os, urllib.request
import cv2, numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'world_cache')
BASE = 'https://raw.githubusercontent.com/teamducro/gloomhaven-storyline/HEAD/resources/img/'
OUT_IMG = os.path.join(ROOT, 'assets', 'map', 'gloomhaven.webp')
OUT_STK = os.path.join(ROOT, 'assets', 'stickers')
OUT_JS = os.path.join(ROOT, 'data', 'world.js')

# 검출한 동그라미를 (행 띠 60px, x) 순으로 정렬했을 때 각각에 인쇄된 번호. '-' 는 동그라미가 아닌 오검출
LABELS = ("31 34 46 35 36 51 77 - 25 33 39 78 60 15 92 11 12 50 24 16 14 7 83 23 89 8 - 42 10 21 "
          "52 18 26 88 - 54 57 81 5 84 - 86 91 43 27 58 48 29 28 4 69 53 40 41 59 44 - 6 94 95 37 - "
          "1 2 75 66 38 3 56 55 20 47 72 74 87 - 70 - 90 - 79 64 17 67 22 80 71 32 9 76 65 - 19 45 85 "
          "82 93 63 73 49 61 30 13 68 62").split()

# 스티커 안 번호 동그라미 중심(px)을 자동 검출이 틀린 것만 확대 확인해서 적음.
# #12·#36 은 짝(#11·#35)과 같은 스티커라 동그라미가 두 개 있다 — 자기 번호 쪽을 고른다
STK_FIX = {5: (78.4, 19.9), 10: (68.1, 19.4), 12: (88.1, 41.6), 36: (82.1, 90.1), 57: (126.9, 63.6), 67: (34.6, 40.1)}

# 지도 위쪽 'Global Achievements' 점선 칸 15개. 가로 중심(px)은 점선 세로줄을 검출해 쟀고,
# 칸마다 들어갈 스티커는 점선 모양과 storyline achievements.json 의 x 순서로 정했다.
# 한 칸에 여러 업적이 올 수 있으면(도시 통치·유물·목소리) 스티커 id 를 모두 적는다
ACH_SLOTS = [
    (367, ['GTDS', 'GTDA']), (483, ['GTVF', 'GTVS']), (596, ['GCRE', 'GCRM', 'GCRD']),
    (720, ['GAR', 'GAR2', 'GAL', 'GAC']), (852, ['GTMF']), (986, ['GTDI']), (1107, ['GTED']),
    (1234, ['GTPE']), (1356, ['GWB']), (1475, ['GTRN']), (1594, ['GEOI']),
    (1734, ['GEOC', 'GEOC2', 'GEOC3']), (1864, ['GEOG']), (1992, ['GAT', 'GAT2', 'GAT3', 'GAT4', 'GAT5']), (2125, ['GAOO']),
]
ACH_SCALE = .5
# 이 페이지의 한글 업적 이름(data/scenarios.js 보상 문자열) → 스티커 id
ACH_KO = {'드레이크를 죽이다': 'GTDS', '목소리를 풀어주다': 'GTVF', '목소리를 잠재우다': 'GTVS',
          '도시 통치: 상인': 'GCRE', '도시 통치: 군부': 'GCRM', '도시 통치: 악마': 'GCRD',
          '유물: 회수': 'GAR', '유물: 상실': 'GAL', '유물: 정화': 'GAC', '상인 도주': 'GTMF', '망자 침입': 'GTDI',
          '어둠의 가장자리': 'GTED', '향상의 위력': 'GTPE', '수중 호흡': 'GWB', '균열 무력화': 'GTRN',
          '침입의 결말': 'GEOI', '오염 종식': 'GEOC', '암영의 최후': 'GEOG', '고대 기술': 'GAT', '조직 섬멸': 'GAOO'}

# 스티커에 적힌 영문 이름(storyline achievements.json 의 name). 마우스 오버 설명에 한글과 함께 보인다
ACH_EN = {'GTDS': 'The Drake Slain', 'GTDA': 'The Drake Aided', 'GTVF': 'The Voice Freed', 'GTVS': 'The Voice Silenced',
          'GCRE': 'City Rule: Economic', 'GCRM': 'City Rule: Militaristic', 'GCRD': 'City Rule: Demonic',
          'GAR': 'The Artifact: Recovered', 'GAR2': 'The Artifact: Recovered', 'GAL': 'The Artifact: Lost', 'GAC': 'The Artifact: Cleansed',
          'GTMF': 'The Merchant Flees', 'GTDI': 'The Dead Invade', 'GTED': 'The Edge of Darkness', 'GTPE': 'The Power of Enhancement',
          'GWB': 'Water-Breathing', 'GTRN': 'The Rift Neutralized', 'GEOI': 'End of the Invasion', 'GEOC': 'End of Corruption',
          'GEOG': 'End of Gloom', 'GAT': 'Ancient Technology', 'GAOO': 'Annihilation of the Order'}


def fetch(rel, name):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        urllib.request.urlretrieve(BASE + rel, p)
    return p


def imread(p):
    return cv2.imdecode(np.fromfile(p, np.uint8), cv2.IMREAD_COLOR)   # cv2.imread 는 한글 경로를 못 연다


def map_circles(path):
    g = cv2.medianBlur(cv2.cvtColor(imread(path), cv2.COLOR_BGR2GRAY), 3)
    c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1, minDist=18, param1=120, param2=22, minRadius=9, maxRadius=16)[0]
    c = sorted((x for x in c.tolist() if 9 <= x[2] <= 14.5), key=lambda x: (x[1] // 60, x[0]))
    if len(c) != len(LABELS):
        raise SystemExit(f'동그라미 {len(c)}개 ≠ 라벨 {len(LABELS)}개 — 입력 그림이 바뀌었으면 LABELS 를 다시 읽어야 한다')
    pos = {}
    for lab, (x, y, _) in zip(LABELS, c):
        if lab == '-':
            continue
        if lab in pos:
            raise SystemExit(f'번호 {lab} 중복')
        pos[lab] = [round(x, 1), round(y, 1)]
    miss = [i for i in range(1, 96) if str(i) not in pos]
    if miss:
        raise SystemExit(f'빠진 시나리오: {miss}')
    return {k: pos[k] for k in sorted(pos, key=int)}


def sticker_circle(i, im):
    if i in STK_FIX:
        return STK_FIX[i]
    bg = Image.new('RGBA', im.size, 'white')
    bg.alpha_composite(im)
    g = cv2.medianBlur(cv2.cvtColor(np.asarray(bg.convert('RGB')), cv2.COLOR_RGB2GRAY), 3)
    c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1, minDist=8, param1=120, param2=16, minRadius=9, maxRadius=16)
    if c is None:
        raise SystemExit(f'스티커 {i} 에서 번호 동그라미를 못 찾음 — STK_FIX 에 적어야 한다')
    x, y, _ = c[0][0]
    return round(float(x), 1), round(float(y), 1)


def main():
    src = fetch('maps/gh/highres.jpg', 'gh_highres.jpg')
    im = Image.open(src).convert('RGB')
    os.makedirs(os.path.dirname(OUT_IMG), exist_ok=True)
    im.save(OUT_IMG, quality=75, method=6)
    pos = map_circles(src)

    os.makedirs(OUT_STK, exist_ok=True)
    stk = {}
    for i in range(1, 96):
        for suf in ('', '_c'):
            s = Image.open(fetch(f'scenarios/gh/{i}{suf}.png', f'stickers/s{i}{suf}.png')).convert('RGBA')
            s.save(os.path.join(OUT_STK, f's{i}{suf}.webp'), quality=85, method=6)
            if not suf:
                cx, cy = sticker_circle(i, s)
                stk[str(i)] = [s.width, s.height, cx, cy]
    ach = []
    for cx, ids in ACH_SLOTS:
        for a in ids:
            s = Image.open(fetch(f'achievements/{a}.png', f'stickers/{a}.png')).convert('RGBA')
            s = s.resize((round(s.width * ACH_SCALE), round(s.height * ACH_SCALE)), Image.LANCZOS)
            s.save(os.path.join(OUT_STK, f'{a}.webp'), quality=85, method=6)
        ach.append([cx, ids])
    sizes = {a: list(Image.open(os.path.join(OUT_STK, f'{a}.webp')).size) for _, ids in ACH_SLOTS for a in ids}

    w, h = im.size
    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// 생성물: tools/build_world_map.py 가 파일 전체를 새로 쓴다. 직접 편집 금지\n')
        f.write('// WMAP: 캠페인 지도 그림 크기(px). WPOS: 시나리오 id → 지도에 인쇄된 번호 동그라미 중심(px)\n')
        f.write('// WSTK: 시나리오 스티커 [폭, 높이, 스티커 안 번호 동그라미 중심 x, y] — 이 점을 WPOS 에 겹쳐 붙인다\n')
        f.write('// WACH: 전역 업적 칸 {slots:[[가로 중심, [스티커 id…]]], size:{id:[폭,높이]}, ko:{한글 업적명: id}, en:{id: 영문명}}\n')
        f.write(f'const WMAP={j({"w": w, "h": h, "img": "assets/map/gloomhaven.webp"})};\n')
        f.write(f'const WPOS={j(pos)};\n')
        f.write(f'const WSTK={j(stk)};\n')
        f.write(f'const WACH={j({"slots": ach, "size": sizes, "ko": ACH_KO, "en": ACH_EN})};\n')
    total = sum(os.path.getsize(os.path.join(OUT_STK, x)) for x in os.listdir(OUT_STK))
    print('ok', len(pos), 'map', os.path.getsize(OUT_IMG), 'stickers', len(os.listdir(OUT_STK)), total, 'bytes')


if __name__ == '__main__':
    main()
