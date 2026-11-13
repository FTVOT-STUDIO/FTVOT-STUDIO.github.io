"""Unity 스프라이트 시트 → 사이트용 WebP 변환기

사용법: python3 tools/make_sprites.py <Unity의 Unit 폴더 경로>
- .png.meta에 저장된 슬라이스 좌표(좌하단 원점)로 프레임을 자릅니다
- 투명 여백을 잘라내고 256px WebP(thumb.webp)를 만듭니다. 사이트를 돌아다니는 캐릭터 그림으로 씁니다
- 각 유닛의 첫 프레임(보통 Idle)을 씁니다. 프레임 선택은 tools/units.json에서 정합니다
"""
import json, os, re, sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # 8K 시트도 열 수 있게
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'assets', 'units')
THUMB = 256
RECT = re.compile(r'name: (.+)\n\s+rect:\n\s+serializedVersion: 2\n\s+x: (\S+)\n\s+y: (\S+)\n\s+width: (\S+)\n\s+height: (\S+)')


def load_frames(src):
    """모든 시트에서 {프레임이름: 잘라낸 이미지}를 만듭니다."""
    frames = {}
    for f in sorted(os.listdir(src)):
        meta_path = os.path.join(src, f + '.meta')
        if not f.endswith('.png') or not os.path.exists(meta_path):
            continue
        meta = open(meta_path, encoding='utf-8').read()
        sheet = Image.open(os.path.join(src, f)).convert('RGBA')
        _, height = sheet.size
        for name, x, y, w, h in RECT.findall(meta):
            x, y, w, h = (int(float(v)) for v in (x, y, w, h))
            crop = sheet.crop((x, height - y - h, x + w, height - y))
            bbox = crop.getbbox()
            if bbox:
                frames[re.sub(r'[^A-Za-z0-9_]+', '_', name.strip())] = crop.crop(bbox)
    return frames


def save(img, path, size):
    copy = img.copy()
    copy.thumbnail((size, size), Image.LANCZOS)
    copy.save(path, 'WEBP', quality=86, method=6)
    return copy.size


def main():
    if len(sys.argv) != 2:
        sys.exit('사용법: python3 tools/make_sprites.py <Unit 폴더>')
    units = json.load(open(os.path.join(ROOT, 'tools', 'units.json'), encoding='utf-8'))
    frames = load_frames(sys.argv[1])
    manifest = []
    for slug, label, names in units:
        missing = [n for n in names if n not in frames]
        if missing:
            print(f'[건너뜀] {slug}: 프레임 없음 {missing}')
            continue
        os.makedirs(os.path.join(OUT, slug), exist_ok=True)
        tw, th = save(frames[names[0]], os.path.join(OUT, slug, 'thumb.webp'), THUMB)
        manifest.append({'slug': slug, 'name': label, 'thumb': [tw, th]})
    json.dump(manifest, open(os.path.join(ROOT, 'tools', 'units.manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(manifest)}명 변환 완료 → {OUT}')


if __name__ == '__main__':
    main()
