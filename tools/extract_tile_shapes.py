# -*- coding: utf-8 -*-
"""Gloomhaven Line of Sight Tool(gloomhaven.one) 번들에서
  1) 맵 타일 60종의 정확한 헥스 모양과 이미지 정보
  2) 시나리오별 공식 배치(타일 위치·회전, 문·통로)
를 뽑아 tools/tile_shapes.json 으로 저장한다.

이 앱은 Cephalofair 의 Creator Pack 타일 이미지를 쓰며(CC BY-NC-SA 4.0),
타일마다 [이미지, 헥스 모양 문자열, 회전별 이미지 오프셋(px), 색인, 180도 대칭 여부] 를 들고 있다.
원본 이미지 기준 헥스 외접반지름은 60px(앱은 0.75배인 45px로 그린다).

사용법:
    python tools/extract_tile_shapes.py
"""
import json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'tile_shapes.json')
SITE = 'https://gloomhaven.one/'
HEX_R = 60.0


def fetch_bundle():
    html = urllib.request.urlopen(SITE).read().decode('utf-8', 'replace')
    m = re.search(r'src="(main\.[0-9a-f]+\.js)"', html)
    if not m:
        sys.exit('번들 파일명을 찾지 못했습니다.')
    return urllib.request.urlopen(SITE + m.group(1)).read().decode('utf-8', 'replace')


def val(ch):
    """'a'->1 ... 'z'->26, 'A'->27 ..."""
    c = ord(ch)
    return c - 96 if c > 96 else c - 38


def decode_shape(sstr):
    """모양 문자열 -> [(col, row), ...] 1부터 시작하는 오프셋 좌표(홀수 열이 반 칸 아래)."""
    out, i, col, last = [], 0, 1, 0
    while i < len(sstr):
        m = re.match(r'\d+', sstr[i:])
        if m:
            col = int(m.group(0))
            i += len(m.group(0))
            last = 0
            continue
        a, b = val(sstr[i]), val(sstr[i + 1])
        if a <= last:
            col += 1
        last = b
        out += [(col, row) for row in range(a, b + 1)]
        i += 2
    return out


def decode_layout(s):
    """시나리오 배치 문자열 -> [{x, y, name, rot, color}]  (원본 d() 이식)"""
    out, f = [], 0
    while f < len(s):
        m = re.match(r'\d+', s[f:])
        if not m:
            break
        x = int(m.group(0))
        a = len(m.group(0))
        y = val(s[f + a])
        a += 1
        rot = 0
        color = None
        b = s[f + a] if f + a < len(s) else ''
        if b == 'z':
            name = 'z'; a += 1
        elif b == 'x':
            name = 'x'; a += 1
        elif b.isdigit():
            color = int(b)
            name = 'door' if color < 4 else 'corridor'
            a += 1
        else:
            name = s[f + a:f + a + 3]
            a += 3
        p = s[f + a] if f + a < len(s) else ''
        if p and not p.isdigit():
            rot = 60 * val(p)
            a += 1
        f += a
        out.append({'x': x, 'y': y, 'name': name, 'rot': rot % 360, 'color': color})
    return out


def parse_tiles(js):
    i = js.index('992:(e,t,a)=>')
    m = re.search(r'\},\d{2,4}:\(e,t,a\)=>', js[i + 20:])
    mod = js[i:i + 20 + m.start() + 1]

    imgs = dict(re.findall(r'(\w+)\s*=\s*a\.p\s*\+\s*"([^"]+)"', mod))
    shapes = dict(re.findall(r'(\w+)\s*=\s*"([a-zA-Z0-9.]+)"', mod))
    offs = {}
    for name, body in re.findall(r'(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\})', mod):
        if re.search(r'\d+\s*:\s*\{', body):
            try:
                offs[name] = json.loads(re.sub(r'(\w+)\s*:', r'"\1":', body))
            except Exception:
                pass

    reg = mod[mod.rindex('P={'):]
    reg = reg[reg.index('{'):reg.rindex('}') + 1]

    out = {}
    for name, body in re.findall(r'(\w+):\[([^\]]*)\]', reg):
        parts = [p.strip() for p in body.split(',')]
        mm = re.match(r'a\.p\+"([^"]+)"', parts[0])
        img = mm.group(1) if mm else imgs.get(parts[0])
        sstr = shapes.get(parts[1]) or (parts[1].strip('"') if parts[1].startswith('"') else None)
        if sstr is None:
            continue
        out[name] = {
            'image': img,
            'shape': sstr,
            'hexes': decode_shape(sstr.split('.')[0]),
            'offsets': offs.get(parts[2], {}),
            'sym180': len(parts) > 4 and parts[4] == '!0',
        }
    return out


def parse_layouts(js):
    i = js.index('913:(e,t,a)=>')
    m = re.search(r'\},\d{2,4}:\(e,t,a\)=>', js[i + 20:])
    mod = js[i:i + 20 + m.start() + 1] if m else js[i:i + 40000]
    out = {}
    for num, name, layout in re.findall(r'(\d+):\["([^"]*)","([^"]*)"\]', mod):
        out[int(num)] = {'name': name, 'pieces': decode_layout(layout)}
    return out


def main():
    js = fetch_bundle()
    tiles = parse_tiles(js)
    layouts = parse_layouts(js)
    mapt = [k for k in tiles if re.fullmatch(r'[A-N][1-4][ab]', k)]
    print('타일 %d종(맵 타일 %d) · 시나리오 배치 %d개' % (len(tiles), len(mapt), len(layouts)))
    ex = layouts.get(1)
    if ex:
        print('예) 1번 %s:' % ex['name'],
              [(p['name'], p['x'], p['y'], p['rot']) for p in ex['pieces']])
    json.dump({'hexRadiusPx': HEX_R, 'tiles': tiles, 'layouts': layouts},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('저장:', OUT, '%.0fKB' % (os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()
