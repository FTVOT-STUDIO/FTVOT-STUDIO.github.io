"""units.manifest.json → index.html의 유닛 도감/선택 칸 HTML 자동 생성

사용법: python3 tools/render_units.py
make_sprites.py를 다시 돌린 뒤 실행하면 index.html의
<!-- UNITS:START --> ~ <!-- UNITS:END -->, <!-- PICKER:START --> ~ <!-- PICKER:END --> 사이만 교체합니다.
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'docs', 'index.html')
BIG = 4      # 앞에서부터 몇 명을 2x2로 크게 보여줄지
PICKS = 6    # 히어로 선택 칸 개수


def unit_li(i, u):
    name = html.escape(u['name'])
    tw, th = u['thumb']
    big = ' is-big' if i < BIG else ''
    # 큰 칸은 상세 이미지를, 작은 칸은 썸네일을 씁니다
    src = f"./assets/units/{u['slug']}/{'0' if i < BIG else 'thumb'}.webp"
    w, h = (u['frames'][0] if i < BIG else (tw, th))
    frames = json.dumps(u['frames'], separators=(',', ':'))
    return (
        (f'<li class="is-big">' if big else '<li>') + f'<button type="button" class="unit{big}" data-unit="{u["slug"]}" data-name="{name}" data-frames=\'{frames}\' aria-haspopup="dialog">'
        f'<img src="{src}" width="{w}" height="{h}" alt="" loading="lazy" decoding="async">'
        f'<span class="unit-name">{name}</span>'
        f'<span class="unit-frames mono" aria-hidden="true">{len(u["frames"])}F</span>'
        f'</button></li>'
    )


def pick_btn(i, u):
    name = html.escape(u['name'])
    tw, th = u['thumb']
    fw, fh = u['frames'][0]
    pressed = 'true' if i == 0 else 'false'
    return (
        f'<button type="button" class="pick" aria-pressed="{pressed}" aria-label="{name}" '
        f'data-src="./assets/units/{u["slug"]}/0.webp" data-w="{fw}" data-h="{fh}" data-name="{name}" data-index="{i + 1}">'
        f'<img src="./assets/units/{u["slug"]}/thumb.webp" width="{tw}" height="{th}" alt="" decoding="async"></button>'
    )


def replace(text, marker, body):
    pattern = re.compile(rf'(<!-- {marker}:START -->)(.*?)(<!-- {marker}:END -->)', re.S)
    if not pattern.search(text):
        raise SystemExit(f'index.html에 {marker} 마커가 없습니다')
    return pattern.sub(lambda m: f'{m.group(1)}\n{body}\n{m.group(3)}', text)


def main():
    units = json.load(open(os.path.join(ROOT, 'tools', 'units.manifest.json'), encoding='utf-8'))
    text = open(INDEX, encoding='utf-8').read()
    text = replace(text, 'UNITS', '\n'.join(unit_li(i, u) for i, u in enumerate(units)))
    text = replace(text, 'PICKER', '\n'.join(pick_btn(i, u) for i, u in enumerate(units[:PICKS])))
    # 유닛 수가 바뀌면 제목 옆 숫자와 무대 카운터도 맞춥니다
    text = re.sub(r'(유닛 도감<span class="mono">)\d+', rf'\g<1>{len(units)}', text)
    text = re.sub(r'UNIT 01 / \d+', f'UNIT 01 / {len(units)}', text)
    open(INDEX, 'w', encoding='utf-8').write(text)
    print(f'유닛 {len(units)}명, 선택 칸 {min(PICKS, len(units))}개 반영')


if __name__ == '__main__':
    main()
