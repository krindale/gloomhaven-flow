# -*- coding: utf-8 -*-
"""Gloomhaven Secretariat 의 글룸헤이븐 시나리오 JSON 1~95를 tools/ghs_cache/ 에,
보물 표·아이템 목록·스포일러 라벨을 tools/ghs_meta/ 에 내려받는다."""
import os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'ghs_cache')
URL = 'https://raw.githubusercontent.com/Lurkars/gloomhavensecretariat/main/data/gh/scenarios/%02d.json'

os.makedirs(CACHE, exist_ok=True)
for i in range(1, 96):
    dst = os.path.join(CACHE, '%02d.json' % i)
    if os.path.exists(dst):
        continue
    try:
        with urllib.request.urlopen(URL % i) as r:
            open(dst, 'wb').write(r.read())
        print('.', end='', flush=True)
    except Exception as e:
        sys.exit('\n%d 내려받기 실패: %s' % (i, e))
print('\n%d개 준비 완료 → %s' % (len(os.listdir(CACHE)), CACHE))

# 보물 내용(treasures.json), 아이템 이름(items.json), 보물 #75 문구(label/spoiler/en.json)
META = os.path.join(ROOT, 'tools', 'ghs_meta')
BASE = 'https://raw.githubusercontent.com/Lurkars/gloomhavensecretariat/main/data/gh/'
os.makedirs(META, exist_ok=True)
for src, dst in [('treasures.json', 'treasures.json'), ('items.json', 'items.json'),
                 ('label/spoiler/en.json', 'label-spoiler-en.json')]:
    path = os.path.join(META, dst)
    if os.path.exists(path):
        continue
    with urllib.request.urlopen(BASE + src) as r:
        open(path, 'wb').write(r.read())
print('메타 준비 완료 → %s' % META)
