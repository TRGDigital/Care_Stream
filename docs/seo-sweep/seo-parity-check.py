#!/usr/bin/env python3
"""CareStream raw-HTML SEO parity check (read-only). Fetches every sitemap URL (plus extra
paths) as raw server HTML and checks structured data against the visible text.

Usage: python3 seo-parity-check.py [BASE] [--csv INVENTORY.csv] [--strict]
Exit code 1 in --strict mode if any FAIL-level issue is found (for CI against a preview URL).
"""
import sys, re, json, csv, html, urllib.request, concurrent.futures as cf
from html.parser import HTMLParser

BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'https://www.carestreamai.com').rstrip('/')
CSV = sys.argv[sys.argv.index('--csv') + 1] if '--csv' in sys.argv else None
STRICT = '--strict' in sys.argv
UA = {'User-Agent': 'Mozilla/5.0 (seo-parity-check)'}
STALE = [r'£\s?49(?![\d.])(?!\s*(?:policy|each))', r'£\s?129(?![\d.])']  # old Starter/Professional
PLAN_PRICES = {'Starter': '85.00', 'Professional': '230.00', 'Enterprise': '385.00'}

def get(path, manual=False):
    req = urllib.request.Request(path if path.startswith('http') else BASE + path, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read().decode('utf-8', 'replace'), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, '', path
    except Exception as e:
        return 0, '', path

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.title=''; s.h1=[]; s.meta={}; s.canon=''; s.ld=[]; s.text=[]
        s._skip=0; s._in=None; s.imgs=0; s.noalt=0; s.links=[]; s._buf=''
    def handle_starttag(s, t, a):
        a = dict(a)
        if t in ('script','style','noscript'):
            s._skip += 1; s._in = (t, a.get('type',''))
            return
        if t == 'title': s._in = ('title','')
        if t == 'h1': s._in = ('h1',''); s._buf=''
        if t == 'meta' and a.get('name'): s.meta[a['name']] = a.get('content','')
        if t == 'link' and a.get('rel') == 'canonical': s.canon = a.get('href','')
        if t == 'img':
            s.imgs += 1; s.noalt += 'alt' not in a
        if t == 'a' and a.get('href'): s.links.append(a['href'])
    def handle_endtag(s, t):
        if t in ('script','style','noscript'):
            s._skip = max(0, s._skip-1); s._in=None
        elif t in ('title','h1'):
            if t=='h1': s.h1.append(s._buf.strip())
            s._in=None
    def handle_data(s, d):
        if s._skip:
            if s._in and s._in[0]=='script' and s._in[1]=='application/ld+json': s.ld.append(d)
            return
        if s._in and s._in[0]=='title': s.title += d
        if s._in and s._in[0]=='h1': s._buf += d
        s.text.append(d)

def norm(x): return re.sub(r'\s+','',html.unescape(re.sub(r'<[^>]+>',' ',x))).lower().replace('’',"'")

def flat(o):
    if isinstance(o, list):
        for i in o: yield from flat(i)
    elif isinstance(o, dict):
        yield o
        for v in o.values():
            if isinstance(v,(dict,list)): yield from flat(v)

def check(path):
    st, body, final = get(path)
    issues = []   # (level, msg)
    if st != 200: return dict(url=path, status=st, issues=[('FAIL', f'status {st}')], types=[], title='', h1='')
    p = P(); p.feed(body)
    text = norm(' '.join(p.text))
    lds=[]
    for raw in p.ld:
        try: lds.append(json.loads(raw))
        except Exception as e: issues.append(('FAIL','invalid JSON-LD: '+str(e)[:60]))
    nodes = [n for l in lds for n in flat(l)]
    types = [t for n in nodes if n.get('@context') for t in ([n['@type']] if isinstance(n.get('@type'),str) else n.get('@type',[]))]
    if len(p.h1) != 1: issues.append(('WARN', f'{len(p.h1)} h1'))
    if not p.title.strip(): issues.append(('FAIL','no title'))
    if not p.meta.get('description'): issues.append(('FAIL','no meta description'))
    robots = p.meta.get('robots','')
    if not p.canon and 'noindex' not in robots: issues.append(('WARN','no canonical'))
    elif p.canon and p.canon.rstrip('/') != (BASE+path).rstrip('/') and 'noindex' not in robots: issues.append(('WARN','canonical differs: '+p.canon))
    # FAQPage questions and answers must be visible in the HTML
    for n in nodes:
        if n.get('@type') == 'FAQPage':
            miss = [q['name'] for q in n.get('mainEntity',[]) if norm(q['name']) not in text or norm(q['acceptedAnswer']['text'])[:60] not in text]
            if miss: issues.append(('FAIL', f'FAQPage not visible ({len(miss)}/{len(n["mainEntity"])}): {miss[0][:50]}'))
        if n.get('@type') in ('Course','Product') and isinstance(n.get('offers'), dict):
            pr = n['offers'].get('price')
            if pr and '£'+pr.rstrip('0').rstrip('.') not in ' '.join(p.text).replace(',','') and '£'+pr not in ' '.join(p.text):
                issues.append(('FAIL', f'{n["@type"]} price £{pr} not in visible text'))
        if 'aggregateRating' in n: issues.append(('WARN','aggregateRating present: confirm genuine'))
        if n.get('@type') == 'Review' and norm(n.get('reviewBody',''))[:50] not in text: issues.append(('FAIL','Review text not visible'))
        if isinstance(n.get('@type'), list) and 'SoftwareApplication' in n['@type'] or n.get('@type')=='SoftwareApplication':
            for o in n.get('offers',[]) or []:
                exp = PLAN_PRICES.get(o.get('name'))
                if exp and o.get('price') != exp: issues.append(('FAIL', f'stale plan price {o.get("name")} {o.get("price")} (expected {exp})'))
    if path == '/pricing':
        for n in nodes:
            if n.get('@type')=='Offer' and n.get('name') in PLAN_PRICES and n.get('price')!=PLAN_PRICES[n['name']]:
                issues.append(('FAIL', f'pricing offer {n["name"]} {n["price"]}'))
    for pat in STALE:
        if re.search(pat, ' '.join(p.text)) and path in ('/','/pricing','/faq','/how-it-works','/trust'): issues.append(('WARN','stale price in visible text: '+pat))
    # breadcrumb targets
    return dict(url=path, status=st, title=p.title.strip(), h1=' | '.join(p.h1), types=sorted(set(types)), issues=issues,
                crumbs=[n['item'] for n in nodes if n.get('@type')=='ListItem' and 'item' in n], links=p.links, robots=robots)

def main():
    _, sm, _ = get('/sitemap.xml')
    paths = [re.sub(r'^https?://[^/]+','',u) or '/' for u in re.findall(r'<loc>([^<]+)</loc>', sm)]
    _, home, _ = get('/')
    extra = sorted({re.sub(r'[?#].*','',h) for h in re.findall(r'href="(/uses/[^"]+)"', home)})
    paths += [e for e in extra if e not in paths]
    with cf.ThreadPoolExecutor(8) as ex: res = list(ex.map(check, paths))
    # cross-page: every internal breadcrumb URL and sitemap-linked URL must be 200
    crumbs = {re.sub(r'^https?://[^/]+','',c) for r in res for c in r.get('crumbs',[])}
    for c in sorted(crumbs - set(paths)):
        s,_,_ = get(c)
        if s != 200:
            for r in res:
                if any(re.sub(r'^https?://[^/]+','',x)==c for x in r.get('crumbs',[])): r['issues'].append(('FAIL', f'breadcrumb target {c} is {s}'))
    extra_missing = [e for e in extra if e not in set(re.sub(r'^https?://[^/]+','',u) for u in re.findall(r'<loc>([^<]+)</loc>', sm))]
    if extra_missing: print(f'NOTE: {len(extra_missing)} /uses/ pages linked from every page but absent from sitemap')
    fails = sum(1 for r in res for l,_ in r['issues'] if l=='FAIL')
    from collections import Counter
    c = Counter(m.split(':')[0][:60] for r in res for l,m in r['issues'])
    for k,v in c.most_common(): print(f'{v:5d}  {k}')
    print(f'{len(res)} urls, {fails} FAIL-level issues')
    if CSV:
        with open(CSV,'w',newline='') as f:
            w=csv.writer(f); w.writerow(['url','template','title','h1','jsonld_types','issues_count','issues'])
            for r in res:
                seg=[s for s in r['url'].split('/') if s]
                tpl='home' if not seg else (seg[0]+'/*' if len(seg)>1 else 'single')
                w.writerow([r['url'],tpl,r.get('title',''),r.get('h1',''),' '.join(r.get('types',[])),len(r['issues']),' ; '.join(f'{l}:{m}' for l,m in r['issues'])])
    sys.exit(1 if STRICT and fails else 0)
main()
