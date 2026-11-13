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
│       └── js/{main.js, theme-init.js}
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

## 4. 수정 위치

| 바꿀 것 | 위치 |
|---|---|
| 작업 목록 | `docs/index.html`의 `<ol class="work-list">` |
| 악센트 색 | `docs/assets/css/main.css`의 `--accent` |
| 스택 | `docs/index.html`의 `<dl class="sheet">` |
