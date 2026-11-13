"""낱장 캐릭터 PNG → 사이트용 WebP 변환기

사용법: python3 tools/add_characters.py 그림1.png 그림2.png ...
- 투명 배경 PNG를 받아 여백을 잘라내고 256px WebP로 저장합니다
- 결과는 docs/assets/units/extra-01, extra-02 ... 에 순서대로 쌓입니다(기존 번호 다음부터)
- 끝나면 tools/render_units.py를 실행해서 로스터에 반영하세요
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'assets', 'units')
EXTRAS = os.path.join(ROOT, 'tools', 'extras.manifest.json')
SIZE = 256


def main():
    files = sys.argv[1:]
    if not files:
        sys.exit('사용법: python3 tools/add_characters.py <png 파일들>')
    extras = json.load(open(EXTRAS, encoding='utf-8')) if os.path.exists(EXTRAS) else []
    for path in files:
        img = Image.open(path).convert('RGBA')
        # 거의 투명한 픽셀(알파 8 이하)은 여백으로 보고 잘라냅니다
        alpha = img.getchannel('A').point(lambda a: 255 if a > 8 else 0)
        bbox = alpha.getbbox()
        if not bbox:
            print(f'[건너뜀] 빈 이미지: {path}')
            continue
        img = img.crop(bbox)
        img.thumbnail((SIZE, SIZE), Image.LANCZOS)
        slug = f'extra-{len(extras) + 1:02d}'
        os.makedirs(os.path.join(OUT, slug), exist_ok=True)
        img.save(os.path.join(OUT, slug, 'thumb.webp'), 'WEBP', quality=86, method=6)
        # 이름은 비워 둡니다. 정해지면 extras.manifest.json의 name을 채우세요
        extras.append({'slug': slug, 'name': '', 'thumb': list(img.size), 'source': os.path.basename(path)})
        print(f'{slug} ← {os.path.basename(path)} {img.size}')
    json.dump(extras, open(EXTRAS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
