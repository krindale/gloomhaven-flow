# -*- coding: utf-8 -*-
"""data/battle.js (const MON / const MAP / const TRS)를 Gloomhaven Secretariat 데이터로 다시 만든다.

사용법:
    python tools/fetch_ghs.py        # GHS 시나리오 JSON 95개(ghs_cache/)와 보물·아이템 표(ghs_meta/)를 내려받음
    python tools/build_battle_data.py  # data/battle.js 갱신

한글 몬스터 이름은 data/scenarios.js 의 S[id].mons 순서가 GHS scenario.monsters 순서와
같다는 점을 이용해 역으로 만든다. 전 시나리오에서 충돌이 없을 때만 통과한다.
"""
import json, glob, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCEN = os.path.join(ROOT, 'data', 'scenarios.js')   # 읽기: const S (한글 몬스터 이름 역산용)
OUT = os.path.join(ROOT, 'data', 'battle.js')        # 쓰기: 파일 전체를 새로 쓴다
CACHE = os.path.join(ROOT, 'tools', 'ghs_cache')
META = os.path.join(ROOT, 'tools', 'ghs_meta')

# 보물로 얻는 아이템 31종의 효과 설명. GHS label/spoiler/en.json 의 원문을 옮긴 것(공식 한글판 문구 아님).
# 보물 표에 새 아이템이 나오면 여기에 추가해야 생성이 통과한다.
ITEM_KO = {
    19: '원거리 공격 중, 공격 하나에 속박을 추가한다.',
    23: '다음 공격 피해 3번에 대해 각각 방패 1을 얻는다.',
    24: "자기 턴에 '치유 1, 자신' 행동을 한다.",
    32: '공격으로 피해를 받을 때 그 공격에 대해 방패 2를 얻는다.',
    33: '단일 대상 원거리 공격 행동을 헥스 3칸짜리 범위 공격으로 바꾼다.',
    39: '원거리 공격 중, 공격 행동 전체에 끌어당기기 2를 추가한다.',
    40: "능력 카드의 기본 윗면을 쓸 때 '공격 2' 대신 '공격 3' 행동을 한다.",
    44: '다음 공격 피해 4번에 대해 각각 방패 1을 얻는다.',
    45: '자기 턴에 소모된 소형 아이템 2개를 재충전한다. 저주를 받는다.',
    53: '근접 공격 중, 공격 하나에 저주를 추가한다.',
    69: "자기 턴에 소진된 아이템을 모두 재충전하고, '치유 3, 자신' 행동을 하고, 버린 카드를 2장까지 회수한다.",
    96: '이동 중, 이동 하나에 이동 +3과 점프를 추가한다.',
    97: "자기 턴에 4칸 이상 이동하면 '치유 1, 자신' 행동을 한다.",
    98: '험지와 위험 지형의 영향을 받지 않는다.',
    99: "위험 지형의 피해를 무시하고, 위험 지형에 들어간 턴마다 '치유 2, 자신' 행동을 한다.",
    100: "자기 턴에 '치유 2, 소환한 아군 하나 대상' 행동을 한다.",
    101: '공격 보정 덱에서 -1 카드 2장을 제거한다.',
    103: '중독과 상처에 면역이다.',
    104: '나를 대상으로 한 공격 피해 다음 5번에 대해 각각 방패 1을 얻는다.',
    107: '자기 턴에 4칸 이상 이동한 뒤, 이번 턴의 다음 근접 공격에 공격 +1을 추가한다.',
    108: '혼란을 받을 때마다 대신 강화를 얻는다.',
    110: '공격받았을 때 대지 원소가 강하면 공격자를 속박한다.',
    111: "공격받았을 때 얼음 원소가 강하면 공격자를 대상으로 '밀치기 2' 행동을 한다.",
    113: '살아있는 시체·살아있는 영혼·살아있는 뼈를 대상으로 한 근접 공격 중, 공격 하나에 공격 +5를 추가한다.',
    116: '단일 대상 근접 공격 중, 대상과 대상에 인접한 모든 적이 피해 1을 받는다.',
    122: '자기 턴에 빛 원소를 소비해 어둠 원소를 만든다.',
    124: "자기 턴에 사거리 5 안의 적 하나가 '이동 2' 행동을 하게 하고, 그 이동은 내가 조종한다.",
    130: "자기 턴에 빛·어둠 원소를 소비해 '치유 25, 자신' 행동을 한다.",
    131: '인접한 일반 적에게 공격받을 때, 그 적이 대신 사거리 안의 자기 편 하나를 공격하게 한다.',
}
SUMMON_KO = {'warrior-spirit': '전사의 영혼', 'skeleton': '해골'}
SLOT_KO = {'head': '머리', 'body': '몸', 'legs': '다리', 'onehand': '한 손', 'twohand': '양손', 'small': '소형'}

COND = {'poison': '중독', 'wound': '상처', 'muddle': '혼란', 'immobilize': '속박', 'disarm': '무장해제', 'stun': '기절'}


def build_treasures():
    """보물 번호 1~75 -> {t: 한국어 설명, s: 해금 시나리오(있으면)}. 아이템 이름은 원문(영문) 그대로 둔다."""
    T = json.load(open(os.path.join(META, 'treasures.json'), encoding='utf-8'))
    raw_items = {it['id']: it for it in json.load(open(os.path.join(META, 'items.json'), encoding='utf-8'))}
    items = {k: v['name'] for k, v in raw_items.items()}

    def item_detail(n):
        """아이템 카드 요약: 이름·부위·가격·사용 방식·효과."""
        it = raw_items[int(n)]
        use = '소진' if it.get('spent') else '소모' if it.get('consumed') else '상시'
        d = ITEM_KO.get(it['id'])
        if it.get('summon'):
            s = it['summon']
            d = '소환: %s (체력 %s, 공격 %s, 이동 %s%s)' % (
                SUMMON_KO.get(s['name'], s['name']), s['health'], s['attack'], s['movement'],
                ', 사거리 %s' % s['range'] if s.get('range') else '')
        if not d:
            sys.exit('아이템 %s(%s) 의 한국어 설명이 ITEM_KO 에 없습니다.' % (it['id'], it['name']))
        out = {'n': '%03d %s' % (it['id'], it['name']), 'sl': SLOT_KO[it['slot']], 'u': use,
               'c': it['cost'], 'd': d}
        if it.get('minusOne'):
            out['m'] = it['minusOne']
        return out
    label = json.load(open(os.path.join(META, 'label-spoiler-en.json'), encoding='utf-8'))

    def item(n):
        n = int(n)
        return '%03d %s' % (n, items[n])

    out = []
    for i, raw in enumerate(T, 1):
        ent, parts = {}, []
        for piece in raw.split('|'):
            kind, _, val = piece.partition(':')
            if kind == 'item':
                parts.append('아이템 ' + ' + '.join(item(v) for v in val.split('+')))
                ent['i'] = [item_detail(v) for v in val.split('+')]
            elif kind == 'itemDesign':
                parts.append('아이템 도안 ' + item(val))
                ent['i'] = [item_detail(val)]
                ent['dz'] = 1
            elif kind == 'randomItemDesign':
                parts.append('무작위 아이템 도안 1장')
            elif kind == 'randomScenario':
                parts.append('무작위 사이드 시나리오 1개 해금')
            elif kind == 'scenario':
                parts.append('시나리오 %s 해금' % val)
                ent['s'] = int(val)
            elif kind == 'gold':
                parts.append('금화 %s' % val)
            elif kind == 'experience':
                parts.append('경험치 %s' % val)
            elif kind == 'battleGoal':
                parts.append('체크마크(✓) %s개' % val)
            elif kind == 'damage':
                parts.append('함정! 피해 %s' % val)
            elif kind == 'condition':
                parts.append('+ ' + '·'.join(COND.get(c, c) for c in val.split('+')))
            elif kind == 'custom':
                key = val.strip('%').split('.')[-1]
                txt = label['treasures']['gh'][key]
                if txt.startswith('Cryptogram Found'):
                    txt = '암호문 발견 (시나리오북 121쪽 참고)'
                parts.append(txt)
            else:
                sys.exit('알 수 없는 보물 형식: #%d %s' % (i, raw))
        ent['t'] = ' '.join(parts)
        out.append(ent)
    if len(out) != 75:
        sys.exit('보물이 75개가 아닙니다: %d' % len(out))
    return out


def parse_const(js, name):
    m = re.search(r'const %s=(\{.*?\});\n' % name, js, re.S)
    return json.loads(m.group(1)), m


def load_ghs():
    D = {}
    for f in sorted(glob.glob(os.path.join(CACHE, '*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        D[int(d['index'])] = d
    if sorted(D) != list(range(1, 96)):
        sys.exit('GHS 캐시가 1~95를 다 담고 있지 않습니다. tools/fetch_ghs.py 를 먼저 실행하세요.')
    return D


def build_monster_names(D, S):
    """slug -> 한글 이름. 충돌이 하나라도 있으면 중단."""
    m2k = collections.defaultdict(collections.Counter)
    for i, d in D.items():
        gh, ko = d.get('monsters', []), [m['n'] for m in S[str(i)]['mons']]
        if len(gh) != len(ko):
            sys.exit('시나리오 %d: GHS 몬스터 %d개 vs 페이지 %d개 — 순서 가정이 깨졌습니다.'
                     % (i, len(gh), len(ko)))
        for a, b in zip(gh, ko):
            m2k[a][b] += 1
    bad = {k: dict(v) for k, v in m2k.items() if len(v) > 1}
    if bad:
        sys.exit('한글 이름이 엇갈리는 몬스터가 있습니다: %s' % json.dumps(bad, ensure_ascii=False))
    return {k: v.most_common(1)[0][0] for k, v in m2k.items()}


def counts(entry):
    """[[n2,e2],[n3,e3],[n4,e4]] — 인원수별 일반/정예 1 또는 0."""
    out = []
    for p in ('player2', 'player3', 'player4'):
        t = entry.get(p, entry.get('type'))
        out.append([1 if t == 'normal' else 0, 1 if t in ('elite', 'boss') else 0])
    return out


def build_map(D, names):
    order = sorted(names)               # MON 배열 순서 = slug 정렬 순서
    idx = {s: i for i, s in enumerate(order)}
    MAP = {}
    for i, d in D.items():
        rooms = []
        for r in d.get('rooms', []):
            room = {'n': r['roomNumber']}
            if 'ref' in r:        room['t'] = r['ref']
            if r.get('initial'):  room['s'] = 1
            if r.get('rooms'):    room['to'] = r['rooms']
            if r.get('treasures'):room['tr'] = r['treasures']
            if r.get('objectives'): room['ob'] = r['objectives']
            if 'marker' in r:     room['mk'] = str(r['marker'])
            # 같은 몬스터의 여러 스탠디를 한 줄로 합친다
            agg = collections.OrderedDict()
            for e in r.get('monster', []):
                slug = e['name']
                cur = agg.setdefault(slug, {'m': idx[slug], 'c': [[0, 0], [0, 0], [0, 0]],
                                            'b': 1 if e.get('type') == 'boss' else 0})
                if e.get('type') == 'boss':
                    cur['b'] = 1
                for k, (n, el) in enumerate(counts(e)):
                    cur['c'][k][0] += n
                    cur['c'][k][1] += el
            mons = []
            for slug, v in agg.items():
                m = {'m': v['m'], 'c': v['c']}
                if v['b']:
                    m['b'] = 1
                mons.append(m)
            if mons:
                room['m'] = mons
            rooms.append(room)
        ent = {}
        if rooms:
            ent['r'] = rooms
        objs = []
        for o in d.get('objectives', []):
            ob = {'n': o.get('name', '')}
            if o.get('escort'):  ob['e'] = 1
            if o.get('health'):  ob['h'] = str(o['health'])
            if o.get('marker'):  ob['mk'] = str(o['marker'])
            objs.append(ob)
        if objs:
            ent['o'] = objs
        if ent:
            MAP[str(i)] = ent
    return order, MAP


def main():
    S, _ = parse_const(open(SCEN, encoding='utf-8').read(), 'S')
    D = load_ghs()
    names = build_monster_names(D, S)
    order, MAP = build_map(D, names)
    MON = [names[s] for s in order]
    # slug 의 ":+N" 접미사는 레벨 보정이라 이름 뒤에 표기한다
    MON = [n + (' (레벨 %s)' % s.split(':')[1] if ':' in s else '')
           for n, s in zip(MON, order)]

    TRS = build_treasures()
    blob = ('// 생성물 — 직접 고치지 말 것. python tools/build_battle_data.py 로 다시 만든다.\n'
            'const MON=%s;\nconst MAP=%s;\nconst TRS=%s;\n'
            % (json.dumps(MON, ensure_ascii=False, separators=(',', ':')),
               json.dumps(MAP, ensure_ascii=False, separators=(',', ':')),
               json.dumps(TRS, ensure_ascii=False, separators=(',', ':'))))
    open(OUT, 'w', encoding='utf-8', newline='\n').write(blob)
    print('MON %d개, MAP %d개 시나리오, blob %.1fKB' % (len(MON), len(MAP), len(blob) / 1024))


if __name__ == '__main__':
    main()
