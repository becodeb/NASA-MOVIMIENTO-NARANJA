"""Update public/admin/progress.json with the real current time (America/Argentina, -03:00).
Usage:
  python tools/progress.py --done engine level1 --doing level2 --note success "Title" "Body"
  python tools/progress.py --fix-future   # clamp any timestamp in the future to now"""
import json, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

P = Path(__file__).resolve().parent.parent / 'public' / 'admin' / 'progress.json'
AR = timezone(timedelta(hours=-3))
now = datetime.now(AR).replace(microsecond=0)
iso = now.isoformat()
d = json.loads(P.read_text(encoding='utf-8'))
args = sys.argv[1:]
mode = None
i = 0
while i < len(args):
    a = args[i]
    if a in ('--done', '--doing', '--pending'):
        mode = a[2:]
    elif a == '--note':
        level, title, body = args[i + 1:i + 4]
        d['notifications'].append({'at': iso, 'level': level, 'title': title, 'body': body})
        i += 3
    elif a == '--fix-future':
        for x in d['milestones']:
            if x.get('doneAt') and datetime.fromisoformat(x['doneAt']) > now: x['doneAt'] = iso
        for n in d['notifications']:
            if datetime.fromisoformat(n['at']) > now: n['at'] = iso
    elif mode:
        for m in d['milestones']:
            if m['id'] == a:
                m['status'] = mode
                if mode == 'done': m['doneAt'] = iso
                else: m.pop('doneAt', None)
    i += 1
d['notifications'].sort(key=lambda n: n['at'])
P.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')
print(iso, 'done:', sum(m['status'] == 'done' for m in d['milestones']), '/', len(d['milestones']))
