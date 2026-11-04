"""Shrink every embedded image in a GLB to at most MAX px (keeps format). usage: shrinkglb.py in.glb out.glb [max]"""
import io, json, struct, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
MAX = int(sys.argv[3]) if len(sys.argv) > 3 else 512
data = open(src, 'rb').read()
magic, ver, _ = struct.unpack_from('<III', data, 0)
assert magic == 0x46546C67
off = 12; js = None; bin_ = b''
while off < len(data):
    ln, typ = struct.unpack_from('<II', data, off); chunk = data[off + 8: off + 8 + ln]; off += 8 + ln
    if typ == 0x4E4F534A: js = json.loads(chunk)
    elif typ == 0x004E4942: bin_ = chunk
img_views = {}
for im in js.get('images', []):
    if 'bufferView' in im: img_views[im['bufferView']] = im.get('mimeType', 'image/png')
out = bytearray()
for i, bv in enumerate(js['bufferViews']):
    b = bin_[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    if i in img_views:
        pic = Image.open(io.BytesIO(b))
        if max(pic.size) > MAX:
            s = MAX / max(pic.size)
            pic = pic.resize((max(1, round(pic.width * s)), max(1, round(pic.height * s))), Image.LANCZOS)
            buf = io.BytesIO()
            if img_views[i] == 'image/jpeg': pic.convert('RGB').save(buf, 'JPEG', quality=88)
            else: pic.save(buf, 'PNG', optimize=True)
            b = buf.getvalue()
    while len(out) % 4: out.append(0)
    bv['byteOffset'] = len(out); bv['byteLength'] = len(b); bv.setdefault('buffer', 0)
    out += b
while len(out) % 4: out.append(0)
js['buffers'] = [{'byteLength': len(out)}]
j = json.dumps(js, separators=(',', ':')).encode()
j += b' ' * ((4 - len(j) % 4) % 4)
total = 12 + 8 + len(j) + 8 + len(out)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total))
    f.write(struct.pack('<II', len(j), 0x4E4F534A)); f.write(j)
    f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)
print(dst, round(total / 1e6, 2), 'MB')
