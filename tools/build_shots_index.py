#!/usr/bin/env python3
"""生成 shots_index.json：为每条武器记录缩略图（_s.jpg）与额外图片（皮肤等）。
网页据此选择卡片缩略图与详情图集；数据或 shots/ 更新后重新运行即可。"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
weapons = json.load(open('weapons.json', encoding='utf-8'))['weapons']
files = set(os.listdir('shots'))
out = {}
for w in weapons:
    p = w.get('截图文件') or ''
    name = os.path.basename(p)
    if not name:
        continue
    stem, ext = os.path.splitext(name)
    thumb = stem + '_s' + ext
    extras = sorted(f for f in files
                    if f.startswith(stem + '_') and f != thumb and not f.endswith('_s.jpg')
                    and f != name)
    extras = [f for f in extras if f.startswith(stem + '_皮肤')] + [f for f in extras if not f.startswith(stem + '_皮肤')]
    ent = {}
    if thumb in files:
        ent['t'] = 'shots/' + thumb
    if extras:
        ent['x'] = ['shots/' + f for f in extras]
    if ent:
        out[p] = ent
json.dump(out, open('shots_index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'entries;', sum(1 for v in out.values() if 't' in v), 'thumbs;', sum(1 for v in out.values() if 'x' in v), 'with extras')
