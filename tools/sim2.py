# Round-2 checks: (1) bite targets vs lattice capacity, (2) economy sensitivity sweep.
# capacity = max corridor cells with no 2x2 open block = (H-1)/2*(W-2) + (H-3)/2*(W-1)/2
import subprocess, sys
M = [('cw-m1',15,9,50),('cw-m2',15,11,62),('cw-m3',17,11,70),('cw-m4',19,11,76),
     ('cw-m5',21,11,84),('cw-m6',19,13,92),
     ('cp-m1',21,13,96),('cp-m2',21,13,104),('cp-m3',23,13,110),('cp-m4',23,13,116),
     ('cp-m5',25,13,122),('cp-m6',25,13,128),
     ('nn-m1',23,15,130),('nn-m2',23,15,138),('nn-m3',25,15,144),('nn-m4',25,15,150),
     ('nn-m5',27,15,156),('nn-m6',27,15,162),('nn-m7',27,15,168)]
cap = lambda W,H: (H-1)//2*(W-2) + (H-3)//2*((W-1)//2)
ok = True
for n,W,H,b in M:
    c = cap(W,H); r = b/c
    flag = '' if 0.55 <= r <= 0.70 else '  <-- OUT OF 55-70%'
    ok &= not flag
    print(f'{n} {W}x{H} bites {b} capacity {c} = {r:.0%}{flag}')
assert ok, 'bite targets outside 55-70% of capacity'
for args in ([], ['--skip-empties'], ['--hits=2'], ['--frac=0.5'], ['--frac=0.5','--hits=2']):
    out = subprocess.run([sys.executable, 'sim.py', '--quiet', *args], capture_output=True, text=True)
    print(' '.join(args) or 'default', '->', (out.stdout.strip() or out.stderr.strip().splitlines()[-1]))
