# FTVOT_STUDIO 사이트

빌드 없는 정적 사이트입니다. `docs/` 폴더 하나를 GitHub Pages와 Cloudflare Workers가 같이 씁니다.

```
ftvot-site/
├── docs/                 # 배포되는 사이트 전체
│   ├── index.html
│   ├── 404.html
│   ├── favicon.svg
│   ├── _headers          # Cloudflare 전용 보안 헤더 (GitHub Pages는 무시)
│   ├── .nojekyll         # GitHub Pages의 Jekyll 처리 끄기
│   └── assets/
│       ├── css/main.css
│       ├── js/{main.js, theme-init.js}
│       └── units/<유닛>/{thumb.webp, 0.webp, 1.webp ...}
├── tools/
│   ├── units.json            # 어떤 유닛, 어떤 프레임을 쓸지
│   ├── make_sprites.py       # Unity 스프라이트 시트 → WebP
│   └── render_units.py       # index.html의 도감/선택 칸 자동 생성
├── wrangler.jsonc        # Cloudflare Workers 배포 설정
├── DESIGN.md             # 디자인 결정과 이유
└── CREDITS.md            # 오픈소스, 글꼴, 상표 표기
```

## 1. GitHub Pages 배포

```bash
cd ftvot-site
git init && git branch -M main
git add . && git commit -m "init: FTVOT_STUDIO 사이트"
git remote add origin https://github.com/FTVOT-STUDIO/FTVOT-STUDIO.github.io.git
git push -u origin main
```

저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, Branch를 `main` / `/docs`로 지정합니다. 1~2분 뒤 `https://ftvot-studio.github.io`에서 열립니다.

> 404 페이지는 루트 기준 경로(`/assets/...`)를 씁니다. 저장소 이름이 `FTVOT-STUDIO.github.io`가 아니면(예: 프로젝트 사이트) 404 페이지 스타일이 깨집니다.

## 2. Cloudflare Workers로 이전 (도메인 구매 후)

```bash
npx wrangler login
npx wrangler deploy
```

배포 후 Cloudflare 대시보드 **Workers & Pages → ftvot-site → Settings → Domains & Routes → Add → Custom domain**에서 구매한 도메인을 연결합니다. 같은 Cloudflare 계정에서 산 도메인이면 DNS 레코드는 자동으로 만들어집니다.

이전이 끝나면 GitHub Pages는 꺼도 되고, 백업용으로 둬도 됩니다.

## 3. 로컬 미리보기

```bash
cd docs && python3 -m http.server 8080
# http://localhost:8080
```

## 4. 유닛 추가/교체 (자동화)

Unity 프로젝트의 `Unit` 폴더(.png와 .png.meta)를 그대로 씁니다. 슬라이스 좌표는 .meta에서 읽습니다.

```bash
pip install pillow
# 1) tools/units.json에 ["slug", "표시 이름", ["프레임이름", ...]] 한 줄 추가
# 2) WebP 생성 (8K 시트가 있어서 몇 분 걸립니다)
python3 tools/make_sprites.py ~/Unity_Project/<프로젝트>/Assets/Unit
# 3) index.html에 반영
python3 tools/render_units.py
```

프레임 이름은 Unity Sprite Editor에서 붙인 이름입니다(예: `Saya_Field_0`). 앞의 4명이 도감에서 크게, 앞의 6명이 히어로 선택 칸에 나옵니다.

## 5. 수정 위치

| 바꿀 것 | 위치 |
|---|---|
| 프로젝트 | `docs/index.html`의 `.proj-years` (연도별 `<li class="proj">`, `data-tags`로 필터 분류) |
| 기록 숫자 | `docs/index.html`의 `.stats-list` |
| 이력 | `docs/index.html`의 `.timeline` |
| 악센트 색 | `docs/assets/css/main.css`의 `--pink`, `--pink-fill` |
| 스택 | `docs/index.html`의 `<dl class="sheet">` |

`data-tags` 값: `featured`(대표작), `release`(스토어 출시), `collab`(협업), `dev`(개발 중). 여러 개는 공백으로 구분합니다.
