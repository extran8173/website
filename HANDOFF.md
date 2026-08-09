# HANDOFF — 모터리페어 웹사이트 (2026-08-09 기준)

> 다음 세션/작업자를 위한 인계 문서. 프로젝트 기준·규칙은 [CLAUDE.md](CLAUDE.md)가 원본이고, 이 문서는 **현재 진행 상태와 미결 사항**만 담는다.
> 오래되면 믿지 말 것 — git log와 실제 코드가 항상 우선.

## 1. 지금 어디까지 왔나

라이브: https://website.nomadicom.workers.dev (main 푸시 → Cloudflare Workers 자동 배포, 보통 1~2분)

**완성된 것 (전부 배포됨):**
- 6개 정적 페이지(메인·서비스·정비사례 목록·진단장비·오시는길·404) + 공용 컴포넌트 체계
  - `ProcessFlow.astro` — 3단계 다이어그램 (서비스·오시는길 공용)
  - `PageHero.astro` — 하위 4페이지 통일 히어로 (좌 다크 패널 full-bleed / 우 사진, WCAG AA 계측 통과)
  - `ImageSlot.astro` — 파일 드롭인 자동 전환 (src/assets/site/{IMG-0xx}.* → 자동 최적화)
  - `Figure.astro` — 사례 본문 이미지. **두 모드**: img(astro:assets) / src+width/height(public 정적)
- 홈 히어로 가독성(스크림 강화 + 텍스트 그림자 — 그림자 금지 규칙의 승인된 예외, index.astro 주석 참조)
- ISO 인증서 실물 3종(진단장비 페이지, 클릭 시 /docs/iso-*.pdf 새 탭)
- 소모품 5종 실사진 카드, 구글맵 임베드(business.ts `maps.googleEmbed`), 대기실 사진
- **워드프레스 정비사례 이전 — JAGUAR LANDROVER 카테고리 6건 완료** (아래 §2)

**이미지 자산 현황:** IMG-001~031 매핑은 `docs/기획/image_requests.csv`가 단일 소스. 미보유 잔여: IMG-002/008 고해상 세트컷, IMG-016 대표 프로필, VID-003 Picoscope 클립.

## 2. 워드프레스 이전 (진행 중 — 6/81 완료)

**타협 불가 방침:** ① WP 슬러그 한 글자도 변경 금지 ② 글은 최상위 경로(/cases/ 하위 금지) ③ /cases/는 목록 전용 ④ 슬러그 자동 생성 금지 — frontmatter `slug`만 라우팅에 사용.

**구현 구조 (검증 완료):**
- 라우트: `src/pages/[...slug].astro` — getStaticPaths가 `entry.data.slug`만 사용. **예약 경로·중복 슬러그면 빌드 실패**(가드 목록은 파일 상단 RESERVED).
- 콘텐츠: `src/content/cases/<ASCII폴더명>/index.mdx` + `images/thumb.webp`(astro:assets). 한글 슬러그 글도 폴더명은 ASCII 별칭, frontmatter slug에 디코딩된 한글 원문.
- 본문 이미지: `public/img/cases/<폴더명>/NN.webp` — 1600px WebP q80 사전 최적화(빌드 시간 무영향). Figure의 정적 src 모드로 참조(width/height 필수).
- 스키마(`src/content.config.ts`): slug 필수, mileage_km 선택(원문에 없으면 지어내지 않는다), faq 정확히 3개.

**검증된 변환 규칙** (6건 실증 — 상세 근거는 세션 기록):
- Gutenberg HTML→MDX. Elementor·숏코드 없음. 갤러리는 내부 wp:image를 순차 Figure로.
- kadence/googlemaps 블록 → "매장 위치와 문의 방법은 [오시는 길](/location/)에서…" 한 줄 대체
- 로고 스트립 이미지·"바쁜 일정에도…" 맺음말 제거(상세 템플릿이 동일 요소 렌더 — 중복 방지)
- 본문 내 FAQ 있으면 frontmatter faq로 이동, 없으면 본문에서 3개 도출
- Rank Math title/desc/focus/태그/발행일 승계 (title 없으면 본문 title 폴백)
- alt: 원본 전부 빈 값 → 문맥 기반 신규 작성(사진 실물 미대조 초안 — 발행 후 검수 여지)
- 구조화 필드(car_model·mileage·symptom 등)는 본문에서 도출. 없으면 스키마 완화가 원칙.

**도구 (`migration/tools/` — gitignore 영역, 삭제 금지):**
- `convert-trial.mjs` — 글 단위 변환기. 상단 TARGETS 배열에 [WP슬러그(인코딩 원문), ASCII폴더명] 추가 후 실행 → 이미지 다운로드·최적화 + `_body.mdx`/`_converted.json` 골격 생성 → **frontmatter 도출 필드와 alt는 골격을 읽고 수동 작성** → 골격 파일 삭제
- `extract-images.mjs` — XML에서 필요한 원본 이미지 목록 추출(파생 -WxH 환원)
- `analyze-wxr.mjs` — XML 인벤토리(슬러그·RankMath·블록 구성 분석)
- 실행: 포터블 노드 `C:\Users\nomad\AppData\Local\nodejs-portable\node-v22.11.0-win-x64\node.exe`

**다음 단계 (자료 대기 중):**
1. 전체 81건 XML 수령 → analyze-wxr로 인벤토리·예약어/중복 충돌 전수 대조표
2. 이미지 수급 방식 확정: 지금까지는 원본 URL 다운로드로 성공(두 호스트 모두 살아 있음: motorrepair.co.kr, extran1.mycafe24.com). uploads 폴더를 받으면 `migration/uploads/`에.
3. 일괄 변환(convert-trial 확장) → 빌드 → 대조표 검수 → 배포

**미결 사항 (사용자 결정 대기):**
- [ ] "자동-임시글동탄-랜드로버-디스커버리스포츠-예열" 슬러그 — WP 자동임시글 접두어 포함 원문 보존 중. 색인이 미미하면 개명+301 제안해 둠
- [ ] motorrepair.co.kr 도메인 전환 시점 — **URL 승계는 도메인 연결이 전제**. 전환 전까지 WP 유지 권장
- [ ] 페이지네이션·브랜드 필터 — 81건 들어오면 필요(현재 미구현, cases/index.astro 주석 참조)

## 3. 알아두면 시간 아끼는 것들

- **배포 플로우**: 사용자가 "배포"라고 하면 커밋+푸시 → `curl` 폴링으로 라이브 반영 확인(엣지 전파 지연으로 초기 404가 나올 수 있음 — 재시도). 커밋 메시지에 큰따옴표(") 넣으면 PowerShell 인자 파싱이 깨진다.
- **dev 서버**: `.claude/launch.json` — astro-dev(4321, 다른 세션이 쓸 수 있음), astro-dev-4325(이 세션용), astro-preview(4322, dist 서빙). 포트 충돌 시 새 엔트리 추가가 빠르다.
- **한글 슬러그 URL**: Cloudflare가 소문자 퍼센트 인코딩을 대문자 정규형으로 307 → 200. RFC상 동일 URL, SEO 무해(실측 확인).
- **HMR이 꼬이면**(스타일 반영 안 됨): dev 서버 재시작이 답.
- **PowerShell 5.1**: `&&` 없음, 한글 파일 조작은 인코딩 사고 잦음 — 파일 쓰기는 Write 도구, 검색은 Grep 사용.
- **_incoming 규칙**: `src/assets/site/_incoming/`(gitignore)은 원본 보관용 — 리뷰 캡처 실명 등 개인정보 포함, 커밋 금지. `migration/`도 gitignore.
- **카피·디자인 제약**: CLAUDE.md 불변 사실(브랜드 주력6+확장3, 전용 진단기는 주력만, 지역 4곳, 그림자 금지 등) 항상 확인. 기획서 카피는 확정본 — 임의 수정 금지.
- **작업 방식(사용자 선호)**: 구조화된 스펙([대상/디자인/검증/보고])으로 지시가 옴. 스펙의 전제가 실제와 다르면(예: "세로 사진"인데 실제는 가로) 임의 대체하지 말고 판단 근거와 함께 보고. 검증은 수치로(대비율·좌표·HTTP 코드).

## 4. 참고 경로 모음

| 무엇 | 어디 |
|---|---|
| 프로젝트 규칙·불변 사실 | [CLAUDE.md](CLAUDE.md) |
| 기획서·디자인 규칙 | `docs/기획/` (충돌 시 DESIGN-motorrepair-rules 우선) |
| 사업장 상수(NAP·지도·브랜드) | `src/data/business.ts` — 전 컴포넌트가 참조 |
| 이미지 매핑 | `docs/기획/image_requests.csv` |
| 사례 파이프라인 명세 | `docs/기획/Astro_정비사례_파이프라인.md` (publish-case 스킬은 명세만 있고 실물 미생성) |
| 이전 원본 자료·도구 | `migration/` (gitignore) |
