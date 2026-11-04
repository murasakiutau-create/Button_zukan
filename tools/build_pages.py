#!/usr/bin/env python3
"""Generate index.html, buttons/NNN/index.html, sitemap.xml and robots.txt
from data/buttons.json.  Run from the repo root:  python3 tools/build_pages.py
The 3D code lives in assets/zukan.js (shared) and buttons/NNN/model.js (per button);
this script only writes the HTML around them."""
import json, html, datetime, pathlib, hashlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((ROOT / 'data' / 'buttons.json').read_text(encoding='utf-8'))
SITE = D['site']; BTN = D['buttons']
BASE = SITE['url'].rstrip('/') + '/'
THREE = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js'
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@500;700'
         '&family=Zen+Kaku+Gothic+New:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap">')
e = html.escape


def head(title, desc, url, image, rel, jsonld):
    return f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(SITE['title'])}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary">
<link rel="icon" href="{rel}assets/favicon.svg" type="image/svg+xml">
{FONTS}
<link rel="stylesheet" href="{rel}assets/zukan.css?v={ver(ROOT / 'assets' / 'zukan.css')}">
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>
</head>
'''


def index_page():
    items = []
    for b in BTN:
        items.append(f'''    <li><a class="card" href="buttons/{b['no']}/">
      <div class="well"><img src="buttons/{b['no']}/thumb.png?v={ver(ROOT / 'buttons' / b['no'] / 'thumb.png')}" width="512" height="512" alt="{e(b['name'])}のボタン" loading="lazy"></div>
      <div class="cap"><span class="no">No. {b['no']}</span><span class="name">{e(b['name'])}</span><span class="sub">{e(b['front'])}</span></div>
    </a></li>''')
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": SITE['title'], "description": SITE['description'], "url": BASE,
          "hasPart": [{"@type": "CreativeWork", "name": f"No.{b['no']} {b['name']}", "url": f"{BASE}buttons/{b['no']}/"} for b in BTN]}
    return head(SITE['title'], SITE['description'], BASE, f"{BASE}buttons/{BTN[0]['no']}/thumb.png", '', ld) + f'''<body>
<div class="wrap">
  <header class="intro">
    <div class="eyebrow">Button specimens · {len(BTN)}</div>
    <h1>{e(SITE['title'])}</h1>
    <p class="lead">{e(SITE['description'])}</p>
  </header>
  <main>
  <ul class="drawer">
{chr(10).join(items)}
  </ul>
  </main>
  <footer>表と裏の模様は、実物のボタンを撮った写真から切り抜いて貼っています。厚みや足の形は写真を見ながら合わせたもので、だいたいの形です。</footer>
</div>
</body>
</html>
'''


def ver(*paths):
    h = hashlib.sha1()
    for p in paths:
        for f in sorted(pathlib.Path(p).glob('*')) if pathlib.Path(p).is_dir() else [pathlib.Path(p)]:
            if f.is_file() and f.name not in ('index.html',): h.update(f.read_bytes())
    return h.hexdigest()[:10]


def button_page(i, b):
    url = f"{BASE}buttons/{b['no']}/"
    title = f"No.{b['no']} {b['name']} | {SITE['title']}"
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": SITE['title'], "item": BASE},
        {"@type": "ListItem", "position": 2, "name": f"No.{b['no']} {b['name']}", "item": url}]}
    prev = BTN[i - 1] if i > 0 else None
    nxt = BTN[i + 1] if i + 1 < len(BTN) else None
    pager = (f'<a href="../{prev["no"]}/">← No.{prev["no"]} {e(prev["name"])}</a>' if prev else '<span></span>') + \
            (f'<a href="../{nxt["no"]}/">No.{nxt["no"]} {e(nxt["name"])} →</a>' if nxt else '<span></span>')
    return head(title, b['description'], url, f"{url}thumb.png", '../../', ld) + f'''<body>
<div class="wrap">
  <nav class="sitebar" aria-label="パンくず">
    <ol class="crumbs"><li><a href="../../">{e(SITE['title'])}</a></li><li>No.{b['no']}</li></ol>
  </nav>
  <main class="detail">
    <div class="stage"><div class="loading">読みこみ中…</div><canvas id="cv" aria-label="{e(b['name'])}のボタンの3D表示"></canvas><span class="hint">ドラッグで回転</span></div>
    <div class="info">
      <span class="no">No. {b['no']}</span>
      <h1>{e(b['name'])}</h1>
      <p class="highlight">{e(b['highlight'])}</p>
      <dl>
        <dt>表</dt><dd>{e(b['front'])}</dd>
        <dt>裏</dt><dd>{e(b['back'])}</dd>
      </dl>
      <div class="views" data-for="v">
        <button type="button" id="v-front" data-view="front" aria-pressed="false">表</button>
        <button type="button" id="v-back" data-view="back" aria-pressed="false">裏</button>
        <button type="button" id="v-side" data-view="side" aria-pressed="false">横</button>
      </div>
    </div>
  </main>
  <nav class="pager" aria-label="ほかのボタン">{pager}</nav>
  <footer>表と裏の模様は、実物のボタンを撮った写真から切り抜いて貼っています。厚みや足の形は写真を見ながら合わせたもので、だいたいの形です。</footer>
</div>
<script src="{THREE}"></script>
<script>window.ASSET_V = "{ver(ROOT / 'buttons' / b['no'])}";</script>
<script src="../../assets/zukan.js?v={ver(ROOT / 'assets' / 'zukan.js')}"></script>
<script src="model.js?v={ver(ROOT / 'buttons' / b['no'])}"></script>
</body>
</html>
'''


def main():
    (ROOT / 'index.html').write_text(index_page(), encoding='utf-8')
    for i, b in enumerate(BTN):
        (ROOT / 'buttons' / b['no'] / 'index.html').write_text(button_page(i, b), encoding='utf-8')
    today = datetime.date.today().isoformat()
    urls = [BASE] + [f"{BASE}buttons/{b['no']}/" for b in BTN]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
         ''.join(f'  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n'
    (ROOT / 'sitemap.xml').write_text(sm, encoding='utf-8')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n', encoding='utf-8')
    print(f'wrote index + {len(BTN)} button pages')


if __name__ == '__main__':
    main()
