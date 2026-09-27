# -*- coding: utf-8 -*-
"""build_map_layout.py 의 생성·검증 단계. (본체에서 import 해서 쓴다)"""
import json, collections, re, os, sys


def norm_slug(name):
    return re.sub(r'[^a-z0-9]+', '-', str(name).lower()).strip('-')


def ghs_counts(gd):
    """GHS 기준 (방번호, 슬러그) -> [ (일반,정예) x 2,3,4인 ]"""
    out = collections.defaultdict(lambda: [[0, 0], [0, 0], [0, 0]])
    for r in gd.get('rooms', []):
        for e in r.get('monster', []):
            slug = e['name'].split(':')[0]
            for k, p in enumerate(('player2', 'player3', 'player4')):
                t = e.get(p, e.get('type'))
                if t == 'normal':
                    out[(r['roomNumber'], slug)][k][0] += 1
                elif t in ('elite', 'boss'):
                    out[(r['roomNumber'], slug)][k][1] += 1
    return out


def dh_counts(d, room_items):
    out = collections.defaultdict(lambda: [[0, 0], [0, 0], [0, 0]])
    for ri, room in enumerate(d.get('rooms', []), 1):
        for kind, name, p, extra in room_items(room):
            if kind != 'monster':
                continue
            for k, pl in enumerate(('2', '3', '4')):
                v = (extra or {}).get(pl)
                if v == 1:
                    out[(ri, norm_slug(name))][k][0] += 1
                elif v == 2:
                    out[(ri, norm_slug(name))][k][1] += 1
    return out


def cross_check(D, G, room_items):
    """datahaven 배치와 GHS 수량이 맞는지 시나리오별로 비교."""
    ok = bad = 0
    detail = []
    for i, d in sorted(D.items()):
        gd = G.get(i)
        if not gd:
            continue
        a, b = dh_counts(d, room_items), ghs_counts(gd)
        keys = set(a) | set(b)
        diff = [(k, a.get(k), b.get(k)) for k in keys if a.get(k) != b.get(k)]
        if diff:
            bad += 1
            detail.append((i, len(diff), diff[:2]))
        else:
            ok += 1
    return ok, bad, detail


def rle(hexes):
    """행별 런렝스 [r, c시작, 개수] (c 는 2칸 간격)"""
    byrow = collections.defaultdict(list)
    for c, r in hexes:
        byrow[r].append(c)
    out = []
    for r in sorted(byrow):
        cols = sorted(byrow[r])
        start = prev = cols[0]
        n = 1
        for c in cols[1:]:
            if c == prev + 2:
                n += 1
            else:
                out.append([r, start, n])
                start, n = c, 1
            prev = c
        out.append([r, start, n])
    return out


def cross_check_totals(D, G, room_items):
    """보스 표기 차이를 무시하고 스탠디 총 수만 비교한다."""
    def tots(dd):
        out = collections.defaultdict(lambda: [0, 0, 0])
        for k, v in dd.items():
            for i in range(3):
                out[k[1]][i] += v[i][0] + v[i][1]
        return dict(out)
    ok = bad = 0
    detail = []
    for i, d in sorted(D.items()):
        gd = G.get(i)
        if not gd:
            continue
        a, b = tots(dh_counts(d, room_items)), tots(ghs_counts(gd))
        diff = {k: (a.get(k), b.get(k)) for k in set(a) | set(b) if a.get(k) != b.get(k)}
        if diff:
            bad += 1
            detail.append((i, diff))
        else:
            ok += 1
    return ok, bad, detail
