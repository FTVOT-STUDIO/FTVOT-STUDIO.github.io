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
│       ├── js/{main.js, intro.js, sephirot.js, characters.js, roster.js(자동 생성)}
│       ├── sephirot/<세피라>-0.webp, -1.webp   # 세피라 캐릭터 대기/동작 프레임
│       ├── sfx/<세피라>.mp3                     # 노드 클릭 효과음
│       └── units/<캐릭터>/thumb.webp
├── tools/
│   ├── units.json            # Unity 시트에서 어떤 유닛, 어떤 프레임을 쓸지
│   ├── make_sprites.py       # Unity 스프라이트 시트 → WebP
│   ├── add_characters.py     # 낱장 캐릭터 PNG → WebP
│   └── render_units.py       # 캐릭터 풀(roster.js) 자동 생성
├── wrangler.jsonc        # Cloudflare Workers 배포 설정
├── DESIGN.md             # 디자인 결정과 이유
└── CREDITS.md            # 오픈소스, 글꼴, 상표 표기
```

## 구조: 세피로트의 나무

| 번호 | 세피라 | 섹션 id | 내용 |
|---|---|---|---|
| 1 | 케테르 | kether | 프로필 |
| 2 | 호크마 | chokmah | 스택 |
| 3 | 비나 | binah | 기록, 연표 |
| 4 | 헤세드 | chesed | 완성작 |
| 5 | 게부라 | gevurah | 공모전, 대회, 전시 |
| 6 | 티페레트 | tiferet | 대표작 |
| 7 | 네차흐 | netzach | 캐릭터 정원 |
| 8 | 호드 | hod | 게임 밖 작업 |
| 9 | 예소드 | yesod | 개발 중, 다음 목표 |
| 10 | 말쿠트 | malkuth | 연락 |

첫 접속 시 인트로가 끝나면 세피로트의 나무가 화면 가득 나타납니다(같은 탭에서는 한 번만). 나무 노드를 누르거나 스크롤하면 해당 세피라로 이동하고, 노드를 누르면 `docs/assets/sfx/<id>.mp3`가 재생되고, 세피라 캐릭터가 동작 프레임으로 바뀝니다. 효과음은 푸터 버튼으로 끌 수 있습니다.

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

## 4. 돌아다니는 캐릭터 추가 (자동화)

캐릭터 45명은 네차흐 섹션의 정원에 무작위로 흩어져 등장하고, 누르면 깡충 뜁니다.

```bash
pip install pillow
# 낱장 PNG(투명 배경)를 추가할 때
python3 tools/add_characters.py 새캐릭터1.png 새캐릭터2.png
# Unity 스프라이트 시트에서 다시 뽑을 때 (tools/units.json 수정 후)
python3 tools/make_sprites.py ~/Unity_Project/<프로젝트>/Assets/Unit
# 마지막에 항상 실행: 캐릭터 풀 갱신
python3 tools/render_units.py
```

캐릭터 이름은 `tools/units.json`(Unity 유닛)과 `tools/extras.manifest.json`(낱장 캐릭터)의 이름 값입니다. 

## 5. 수정 위치

| 바꿀 것 | 위치 |
|---|---|
| 프로젝트 | `docs/index.html`의 `.proj-years` (연도별 `<li class="proj">`, `data-tags`로 필터 분류) |
| 기록 숫자 | `docs/index.html`의 `.stats-list` |
| 이력 | `docs/index.html`의 `.timeline` |
| 악센트 색 | `docs/assets/css/main.css`의 `--pink`, `--pink-fill` |
| 스택 | `docs/index.html`의 `<dl class="sheet">` |

`data-tags` 값: `featured`(대표작), `release`(스토어 출시), `collab`(협업), `dev`(개발 중). 여러 개는 공백으로 구분합니다.
