# -*- coding: utf-8 -*-
"""배치도에 올릴 몬스터·오버레이 그림을 내려받아 webp 로 저장한다.

  몬스터   Gloomhaven Secretariat 의 몬스터 썸네일(gh-<slug>.png, 340px) -> assets/monsters/<slug>.webp (160px)
  오버레이 Virtual Gloomhaven Board 의 오버레이 그림(꼭짓점이 위인 헥스, 약 156x180) -> assets/overlays/<이름>.webp

두 저장소의 그림은 모두 Cephalofair Games 의 Creator Pack 에서 나온 것으로 CC BY-NC-SA 4.0 이다.
(https://boardgamegeek.com/thread/1733586/files-creation)
worldhaven(any2cards) 저장소의 그림은 제3자 재사용이 금지돼 있으니 쓰지 않는다.

필요한 목록은 build_map_layout.py 의 monster_slugs() 와 OVIMG 에서 가져온다.
Pillow 가 webp 를 지원해야 한다.

사용법:
    python tools/fetch_token_images.py
    python tools/build_map_layout.py
"""
import io, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_map_layout as B
from PIL import Image

GHS_URL = 'https://raw.githubusercontent.com/Lurkars/gloomhavensecretariat/main/src/assets/images/monster/thumbnail/gh-%s.png'
VGB_URL = 'https://raw.githubusercontent.com/PurpleKingdomGames/virtual-gloomhaven-board/master/VirtualGloomhavenBoard/assets/img/overlays/%s.png'
MON_PX = 160
# 시작 위치 토큰에서 가운데 그림(문으로 들어가는 화살표)만 잘라낸다. 헥스 테두리는 페이지가 직접 그린다
START_SRC, START_BOX = 'starting-location', (38, 48, 122, 130)


def get(url):
    with urllib.request.urlopen(url) as r:
        return Image.open(io.BytesIO(r.read())).convert('RGBA')


def main():
    os.makedirs(B.MONDIR, exist_ok=True)
    os.makedirs(B.OVDIR, exist_ok=True)
    miss = []
    for slug in B.monster_slugs():
        try:
            im = get(GHS_URL % slug)
        except Exception as ex:
            miss.append('몬스터 %s (%s)' % (slug, ex))
            continue
        im.resize((MON_PX, MON_PX), Image.LANCZOS).save(os.path.join(B.MONDIR, slug + '.webp'), 'WEBP', quality=82, method=6)
    parts = {f for sizes in B.OVPARTS.values() for fs in sizes.values() for f in fs}
    for name in sorted(set(B.OVIMG.values()) | parts):
        try:
            im = get(VGB_URL % name)
        except Exception as ex:
            miss.append('오버레이 %s (%s)' % (name, ex))
            continue
        im.save(os.path.join(B.OVDIR, name + '.webp'), 'WEBP', quality=82, method=6)
    try:
        g = get(VGB_URL % START_SRC).crop(START_BOX)
        out = Image.new('RGBA', g.size)
        px = []
        for r, gg, b, a in g.getdata():
            lum = (r * 299 + gg * 587 + b * 114) // 1000
            px.append((20, 20, 22, (255 - lum) * a // 255))   # 흰 바탕은 투명, 짙은 선만 남긴다
        out.putdata(px)
        out.save(os.path.join(B.OVDIR, 'start.webp'), 'WEBP', quality=90, method=6)
    except Exception as ex:
        miss.append('시작 위치 (%s)' % ex)
    print('몬스터 %d · 오버레이 %d' % (len(os.listdir(B.MONDIR)), len(os.listdir(B.OVDIR))))
    for m in miss:
        print('실패:', m)
    if miss:
        sys.exit(1)


if __name__ == '__main__':
    main()
