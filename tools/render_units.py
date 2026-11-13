"""캐릭터 목록 → docs/assets/js/roster.js 자동 생성

사용법: python3 tools/render_units.py
- tools/units.manifest.json (make_sprites.py 결과)
- tools/extras.manifest.json (add_characters.py 결과)
두 목록을 합쳐 사이트를 돌아다니는 캐릭터 풀을 만듭니다.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'assets', 'js', 'roster.js')


def load(name):
    path = os.path.join(ROOT, 'tools', name)
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else []


def main():
    roster = [
        {'slug': u['slug'], 'name': u.get('name', ''), 'w': u['thumb'][0], 'h': u['thumb'][1]}
        for u in load('units.manifest.json') + load('extras.manifest.json')
    ]
    body = json.dumps(roster, ensure_ascii=False, separators=(',', ':'))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// 자동 생성 파일입니다. 직접 고치지 말고 tools/render_units.py를 실행하세요.\n')
        f.write(f'export const ROSTER = {body};\n')
    print(f'캐릭터 {len(roster)}명 → {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
