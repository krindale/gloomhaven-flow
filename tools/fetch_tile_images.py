# -*- coding: utf-8 -*-
"""맵 타일 이미지를 assets/tiles/ 로 내려받고 원본 크기를 tile_shapes.json 에 기록한다.

이미지는 Cephalofair Games 의 Creator Pack 에서 나온 것으로 CC BY-NC-SA 4.0 이다.
(https://boardgamegeek.com/thread/1733586/files-creation)
비영리 팬 페이지에서 출처와 라이선스를 밝히고 쓴다.
"""
import json, os, struct, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHAPES = os.path.join(ROOT, 'tools', 'tile_shapes.json')
DEST = os.path.join(ROOT, 'assets', 'tiles')
BASE = 'https://gloomhaven.one/'


def webp_size(path):
    """webp 파일의 가로·세로를 읽는다 (VP8 / VP8L / VP8X)."""
    with open(path, 'rb') as f:
        head = f.read(40)
    if head[:4] != b'RIFF' or head[8:12] != b'WEBP':
        raise ValueError('webp 가 아님: %s' % path)
    fmt = head[12:16]
    if fmt == b'VP8 ':
        w, h = struct.unpack('<HH', head[26:30])
        return w & 0x3FFF, h & 0x3FFF
    if fmt == b'VP8L':
        b = struct.unpack('<I', head[21:25])[0]
        return (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
    if fmt == b'VP8X':
        w = int.from_bytes(head[24:27], 'little') + 1
        h = int.from_bytes(head[27:30], 'little') + 1
        return w, h
    raise ValueError('알 수 없는 webp 형식: %s' % fmt)


def main():
    data = json.load(open(SHAPES, encoding='utf-8'))
    os.makedirs(DEST, exist_ok=True)
    n = 0
    for name, t in data['tiles'].items():
        img = t.get('image')
        if not img:
            continue
        dst = os.path.join(DEST, img)
        if not os.path.exists(dst):
            with urllib.request.urlopen(BASE + img) as r:
                open(dst, 'wb').write(r.read())
            n += 1
        t['size'] = list(webp_size(dst))
    json.dump(data, open(SHAPES, 'w', encoding='utf-8'), ensure_ascii=False)
    total = sum(os.path.getsize(os.path.join(DEST, f)) for f in os.listdir(DEST))
    print('새로 받은 파일 %d개, 전체 %d개 %.1fMB' % (n, len(os.listdir(DEST)), total / 1024 / 1024))
    for k in list(data['tiles'])[:3]:
        print('  ', k, data['tiles'][k].get('image'), data['tiles'][k].get('size'))


if __name__ == '__main__':
    main()
