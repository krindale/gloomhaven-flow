# -*- coding: utf-8 -*-
"""헥스 배치 원본을 tools/dh_cache/ 에 내려받는다 (Sebaestschjin/datahaven)."""
import os, sys, json, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'dh_cache')
API = 'https://api.github.com/repos/Sebaestschjin/datahaven/contents/data/scenario/Gloomhaven'

os.makedirs(CACHE, exist_ok=True)
with urllib.request.urlopen(API) as r:
    listing = json.load(r)
for item in listing:
    num = item['name'].split(' - ')[0].strip()
    if not num.isdigit():
        continue
    dst = os.path.join(CACHE, num + '.json')
    if os.path.exists(dst):
        continue
    with urllib.request.urlopen(item['download_url']) as rr:
        open(dst, 'wb').write(rr.read())
    print('.', end='', flush=True)
print('\n%d개 준비 완료 → %s' % (len(os.listdir(CACHE)), CACHE))
