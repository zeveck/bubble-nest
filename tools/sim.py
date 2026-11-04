# Economy sim for Bubble Nest (round 2 rules). Mirrors the design tables exactly.
# Income per maze run = frac*bites - hits*loss/2 (half of each hit re-grabbed).
# Feeders: only the tank you ARRIVE IN from a pipe refills (fast travel never does).
#   home feeder = base[world] + 2 per claimed empty tank (all worlds);
#   a claimed empty tank's own feeder = big[world] (+2 per claimed empty too).
# A run that doesn't end at a nest target ends in the best home off this maze or the
# previous one (that's where a player naturally goes).
# Frenzy: once every LADY nest in a world is built, bites eaten in that world count x2
# toward that world's hatching/growing. Empties are optional.
import sys
SKIP_EMPTIES = '--skip-empties' in sys.argv
HITMUL = float(next((a.split('=')[1] for a in sys.argv if a.startswith('--hits=')), 1))
FRAC = float(next((a.split('=')[1] for a in sys.argv if a.startswith('--frac=')), 0.6))
QUIET = '--quiet' in sys.argv
W = {  # maze, bites, [(tank, Z, N, M)]
 'cw': dict(hit=1, loss=3, base=8, big=20, mazes=[
   ('m1',50,[('lady-1',20,20,30)]),
   ('m2',62,[('empty-1',25,0,0),('lady-2',35,25,35)]),
   ('m3',70,[('lady-3',50,30,40)]),
   ('m4',76,[('lady-4',55,35,45),('empty-2',45,0,0)]),
   ('m5',84,[('lady-5',70,40,50)]),
   ('m6',92,[('lady-6',75,45,55)]),
 ]),
 'cp': dict(hit=1.5, loss=5, base=12, big=30, mazes=[
   ('m1',96,[('lady-1',85,50,60)]),
   ('m2',104,[('lady-2',95,55,65),('empty-1',80,0,0)]),
   ('m3',110,[('lady-3',110,60,70)]),
   ('m4',116,[('lady-4',120,65,75)]),
   ('m5',122,[('lady-5',130,70,80),('empty-2',110,0,0)]),
   ('m6',128,[('lady-6',145,75,85)]),
 ]),
 'nn': dict(hit=2, loss=8, base=16, big=40, mazes=[
   ('m1',130,[('lady-1',150,80,90)]),
   ('m2',138,[('lady-2',160,85,95),('empty-1',140,0,0)]),
   ('m3',144,[('lady-3',180,90,100)]),
   ('m4',150,[('lady-4',190,95,105)]),
   ('m5',156,[('lady-5',200,100,110),('empty-2',170,0,0)]),
   ('m6',162,[('lady-6',220,105,115)]),
   ('m7',168,[('lady-7',230,110,120)]),
 ]),
}
wallet=0.0; t=0; events=[]; pending=[]   # [name, world, N, M, stage, progress]
empties=0; feederBites=0.0
homes={}   # world -> list of (mazeIndex, kind)
def feeder(wk, mi):
    w=W[wk]; best=0
    for hm, kind in homes.get(wk, []):
        if hm in (mi, mi-1):
            best=max(best, (w['big'] if kind=='empty' else w['base']) + 2*empties)
    return best
def run(wk, mi, ends_home=True, tag=''):
    global wallet, t, feederBites
    w=W[wk]; b=w['mazes'][mi][1]
    inc=FRAC*b - HITMUL*w['hit']*w['loss']/2
    f=feeder(wk, mi) if ends_home else 0
    feederBites+=f; inc+=f; wallet+=inc; t+=1
    if tag: events.append((t, tag))
    ladies=[n for m in w['mazes'] for n,Z,N,M in m[2] if N]
    for p in pending:
        if p[4]=='done': continue
        frenzy = p[1]==wk and all((wk+'-'+n) in built for n in ladies)
        p[5]+=inc*(2 if frenzy else 1)
        if p[4]=='eggs' and p[5]>=p[2]: p[4]='fry'; p[5]-=p[2]; events.append((t,'hatch '+p[0]))
        if p[4]=='fry' and p[5]>=p[3]: p[4]='done'; events.append((t,'GROWN '+p[0]))
built=set()
for wk,w in W.items():
    homes[wk]=[(0,'home')]
    wallet+=w['base']                                   # arrival home feeder
    for mi,(mname,b,tanks) in enumerate(w['mazes']):
        run(wk, mi, ends_home=False, tag=f'enter {wk}-{mname}')   # first crossing
        for name,Z,N,M in tanks:
            if SKIP_EMPTIES and not N: continue
            while wallet<Z: run(wk, mi, tag=f'  farm {wk}-{mname}')
            wallet-=Z; built.add(f'{wk}-{name}')
            events.append((t,f'NEST {wk}-{name} Z={Z} wallet={wallet:.0f}'))
            if N: pending.append([f'{wk}-{name}',wk,N,M,'eggs',0.0]); homes[wk].append((mi,'lady'))
            else: empties+=1; homes[wk].append((mi,'empty'))
            run(wk, mi, ends_home=False)                # back out through the maze
    if wk=='nn':
        while any(p[4]!='done' for p in pending): run(wk, 5, tag='  grind')
last=0; mg=0; where=''; farms=0
for tt,e in events:
    if 'farm' in e or 'grind' in e: farms+=1
    if e.startswith(('NEST','hatch','GROWN','enter')):
        if tt-last>mg: mg=tt-last; where=e
        last=tt
    if not QUIET: print(tt,e)
print(f'runs {t}  max reward gap {mg} (at {where})  farm/grind runs {farms}  '
      f'feeder bites {feederBites:.0f}  final wallet {wallet:.0f}')
assert mg<=2, 'reward gap > 2 runs'
