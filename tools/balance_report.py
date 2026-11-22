import json,collections,sys
R=[r for r in json.load(open(sys.argv[1])) if r['over']]
n=len(R)*4; tot=collections.Counter()
for r in R:
  for p in r['players']:
    for k,v in (p['mon'] or {}).items(): tot[k]+=v
print(len(R),'games; bankrupt',sum(p['bankrupt'] for r in R for p in r['players']),'/',n)
for k,v in sorted(tot.items(),key=lambda x:-x[1]): print(f'{k:12s} {v/n:+8.0f}')
for rd in [5,10,15,20,25,29]:
  vals=[m for r in R if len(r['mh'])>rd for m in r['mh'][rd]]
  print('round',rd+1,'avg',sum(vals)//len(vals),'<200: %d%%'%(100*sum(v<200 for v in vals)/len(vals)))
ev=collections.Counter()
for r in R:
  for p in r['players']:
    for k,v in p['ev'].items(): ev[k]+=v
print({k:round(v/n,2) for k,v in ev.items()})
