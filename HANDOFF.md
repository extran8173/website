# HANDOFF — 모터리페어 웹사이트 (2026-08-31 갱신)

> 다음 세션/작업자를 위한 인계 문서. 프로젝트 기준·규칙은 [CLAUDE.md](CLAUDE.md)가 원본이고, 이 문서는 **현재 진행 상태와 미결 사항**만 담는다.
> 오래되면 믿지 말 것 — git log와 실제 코드가 항상 우선.

## 1. 지금 어디까지 왔나

라이브: **https://motorrepair.co.kr** (2026-08-16 도메인 전환 완료 — apex·www 둘 다 Worker 커스텀 도메인. `website.nomadicom.workers.dev` 도 계속 응답하나 canonical 은 커스텀 도메인을 가리킨다)
main 푸시 → Cloudflare Workers 자동 배포, 보통 1~2분. 엣지 전파 중 구버전 응답이 섞일 수 있음 — 캐시버스터로 재확인

**정비 사례 76건** (워드프레스 이전 73건 + 신규 발행 3건). 빌드 97페이지.

### 주간 발행 파이프라인 — 스킬 2개로 완성 (2026-08-30~31)

정지점은 **원고 검수 하나**뿐이다. 승인 후에는 커밋까지 멈추지 않고, 캡션·배치는 사후 보고한다.

```
「원2」 + 원고.txt
  → write-case    변환 → 판독 → 원고 2세트(네이버·Astro) → 자체 점검 → ◆ 정지
  → 승인
  → publish-case  배치 → renumber → 마스킹·오버레이 → 「리」·「홈」 → MDX → 빌드 → 커밋
```

| 구성요소 | 위치 |
|---|---|
| 원고 작성 지침(314줄) · 문체예시 10편 | `docs/원고작성/` — **"무엇을 쓸지"의 단일 소스.** 스킬은 절차만 담고 이 문서를 가리킨다 |
| 원고 생성 스킬 | `.claude/skills/write-case/SKILL.md` |
| 발행 스킬 | `.claude/skills/publish-case/SKILL.md` |
| 이미지 정리 | `publish-case/prepare-images.mjs` — `--from` 복사·괄호 순번 정렬·`--renumber` |
| 텍스트 오버레이·번호판 마스킹 | `publish-case/overlay.mjs` — `--mask` 모드 별도 |
| 네이버 업로드용 「리」 | `publish-case/naver-images.mjs` |
| 원고 기계 검사 | `publish-case/check-manuscript.mjs` |
| 오버레이 배치 검사 | `publish-case/check-overlay.mjs` |
| 브랜드 정본·별칭·영문 토큰 | `src/data/brands.json` — 사이트(`caseBrands.ts`)와 발행 도구가 같은 파일을 읽는다 |
| Pretendard 정적 OTF 3종 + OFL | `assets/fonts/` — **dist 에 복사되지 않는다**(웹 미배포) |

**확정된 입력 규약** — 사용자는 「원2」에 사진을 넣고 접두어만 붙인다.

```
t_   목록 썸네일·공유 카드용 대표 이미지 (정확히 1개, 텍스트 오버레이 없음)
x_   발행 제외
없음  본문 사진 — 파일명 끝 괄호 순번 오름차순
```

**오버레이 대상 (2026-08-31 변경)** — 본문 **정면 컷 첫 한 장**에 얹는다. `t_` 가 아니다.
정면 컷 판정 하나로 번호판 마스킹과 오버레이가 함께 결정된다. 정면 컷이 없으면 만들지 않고 보고에 표시한다.

**근거 대조표** — 기계 검사가 못 잡는 유일한 위험이 "원고에 없는 사실을 지어내는 것"이다. 본문의 기술적 주장마다 출처(`원고.txt <항목>` 또는 `사진 NN`)를 `evidence` 에 적고 표로 낸다. 지어낸 문장은 정의상 출처가 없어 반드시 `⚠` 로 걸린다.

### SEO·계측 정비 (2026-08-30)

- **GTM `GTM-57TMPLH`** — `BaseLayout.astro` 한 곳. head 최상단 + body 직후 noscript. Astro 가 번들링하지 않도록 `is:inline` + `set:html` 로 원문 보존 (**`is:inline` 을 빼면 조용히 동작을 멈춘다**)
- **사이트맵 `lastmod`** — 사례는 프론트매터 `date`, 고정 페이지는 각 페이지의 `export const LASTMOD` 상수, 목록·페이지네이션은 생략
- **robots.txt 교체** — 전면 허용은 그대로이되 검색엔진·AI 크롤러 18그룹을 개별 등록. SEO 분석 도구 차단은 주석으로만
- **og:image 무크롭·무확대** — 원본 비율 유지, 가로만 1200 상한. **크롭하면 대표 이미지 하단 16% 오버레이 띠가 잘려나간다.** 메타는 실측값(전 76건 실물과 일치 확인)
- **워드프레스 auto-draft 슬러그 정리** — `자동-임시글동탄-…` → `dongtan-discovery-sport-glow-plug-ac-compressor`, `public/_redirects` 에 301(한글 원문·퍼센트인코딩 두 형태 × 트레일링 슬래시 유무)

### 이전 세션 성과 (요약)

- **워드프레스 이전 완료(2026-08-09)** — 발행글 74건 전량(사례 73 + 업체 소개 1). 슬러그·이미지 전건 검증. 도구는 `migration/tools/`(gitignore)
- **사례 목록 `/cases/`** — 브랜드 필터 7종, 12건 페이지네이션, CaseCard 에 `symptom_customer` 인용 노출
- **위치 사실관계 정정** — 실위치 동탄 능동. 좌표 170m 보정(`business.ts` geo)
- **서비스 지역 이원 구조** — `seoRegions`(SEO 축) / `accessRegions`(체감 거리 축). 통일하지 않는다
- **도메인 전환 완료(2026-08-16)** — www→apex 301, Always Use HTTPS, 카카오 공유 캐시 초기화까지
- **카피 클레임 정리(2026-08-09)** — 약속형 13곳 정정. 사례 본문은 WP 원문 보존(건드리지 않는다)

## 2. 미결 사항

- [ ] **`bmw-740ld-차고주저앉음` 은 구 오버레이 규칙 산출물** — `thumb.webp` 에 텍스트 띠가 있고 본문 정면 컷에는 없다. 재발행하지 않기로 확정했으나, 목록에서 이 한 건만 결이 다르다. 정리하려면 `t_` 원본을 그대로 `thumb.webp` 로 다시 만들면 된다
- [ ] **네이버 링크 카드가 구 워드프레스 메타를 표시 중** — 네이버는 강제 캐시 초기화 수단이 없다. 사이트 쪽에 고칠 것은 없다(OG 태그 정상). 서치어드바이저 등록으로 앞당길 수 있으나 **검색엔진 등록은 별도 세션 과제**
- [ ] 잔여 이미지 자산: IMG-002/008 고해상 세트컷, IMG-016 대표 프로필, VID-003 Picoscope 클립 (`docs/기획/image_requests.csv`)
- [ ] **icon-512.png — 보류(2026-08-16)**. 원본 엠블럼이 150px급이라 업스케일 시 열화. 매니페스트가 없어 404·콘솔 오류도 없다. 고해상도 원본 확보 시 재진행
- [ ] 검토 여지: 미니쿠퍼 사례 태그 "병점 정비소" 1건 · 렉서스/재규어 글의 Picoscope 언급(범용 계측기 + 원문 실작업 기록이라 유지 판단함)
- [x] ~~"자동-임시글…" 슬러그 개명+301~~ — **완료(2026-08-30)**. 초안이 아니라 본문 7,623자·이미지 18장의 정상 발행 글이어서 삭제하지 않고 슬러그만 교체했다
- [x] ~~OG 기본 이미지 재제작~~ — 완료(2026-08-16). `scripts/gen-og-image.mjs` 산출물

## 3. 다음 세션 과제 — JSON-LD 구조화 데이터 보강

착수하지 않기로 한 항목이다(기록만). 현재 홈의 JSON-LD 는 `AutoRepair` 하나이고 `@id`·`image` 가 없으며 **BreadcrumbList 는 어디에도 없다**(사례글은 `FAQPage` 만). 소스는 `src/layouts/BaseLayout.astro`.

**착수 전에** 현재 `AutoRepair` 스키마의 보유 필드를 전부 출력해 확인한다: `telephone`·`address`·`geo`·`openingHoursSpecification`·`sameAs`·`priceRange` 유무.

1. **`@id`(`https://motorrepair.co.kr/#business`) · `image` · `sameAs`(네이버 플레이스·블로그·유튜브)** — 엔티티 결합, GEO 효과가 가장 크다
2. **누락된 NAP·영업시간·좌표 필드** — 값의 원본은 `src/data/business.ts`
3. **BreadcrumbList** — 사례글이 top-level path 라 URL 계층이 없어 후순위

> **금지: `aggregateRating` 추가 금지.** 자체 사이트에서 자기 평점을 마크업하는 것은 Google self-serving review 정책 위반이다. 화면 텍스트 표기는 그대로 둔다 — 마크업만 금지.

## 4. 알아두면 시간 아끼는 것들

### 이 환경에서 반복해서 걸린 함정

- **sharp 는 경로로 연 파일에 다시 쓰지 못한다** — `unable to open for write`. 버퍼로 읽고 임시 파일을 거쳐 교체한다(`overlay.mjs` `maskPlate`)
- **Git Bash 가 한글을 CP949 로 바꿔 넘긴다** — 한글 URL 을 curl 로 시험할 땐 UTF-8 퍼센트 인코딩 형태를 직접 쓴다. 한글 폴더명 `unzip`·`mv` 도 깨지므로 **PowerShell 을 쓴다**
- **`@astrojs/sitemap` 의 `serialize` 에서 `undefined` 를 돌려주면 URL 자체가 사이트맵에서 빠진다** — lastmod 만 생략할 때는 item 을 그대로 돌려준다
- **Cloudflare Workers Builds 는 shallow clone(`--depth=1`)** — `git log -1 -- <파일>` 이 어떤 파일을 물어도 tip 커밋을 돌려준다("이력을 못 읽어 빈 값"이 아니다). 그래서 고정 페이지 lastmod 는 `export const LASTMOD` 상수로 적는다
- **libvips 는 리사이즈 높이를 round-half-to-even 으로 정한다** — `Math.round` 로는 1px 어긋난다(`[...slug].astro` 의 `rint`)
- **sharp 에는 텍스트 API 가 없다** — SVG 경유 렌더링은 OS 설치 폰트만 쓰고, 없으면 **오류 없이 조용히** 대체 폰트로 그린다. 그래서 오버레이는 opentype.js 로 글리프를 SVG 패스로 변환한다. Pretendard 는 **정적 인스턴스 3종**이 필요하다(Variable 하나로는 굵기가 안 나뉜다)
- **`is:inline` 없는 `<script>` 는 Astro 가 번들링한다** — GTM 스니펫이 조용히 무력화된다

### 작업 방식

- **배포 플로우**: "배포" 지시 → 커밋+푸시 → 라이브 폴링. 한글 문자열 검증은 WebClient + UTF8 인코딩 명시. `$home` 은 PowerShell 예약 변수. 커밋 메시지는 히어독/히어스트링
- **묻지 말고 끝까지 진행한다** — 판단이 필요하면 정하고 결과에 표시만 남긴다. 멈추는 건 물리적으로 불가능할 때(파일 누락·빌드 실패)와 원고 검수뿐
- **예외: 기존 사례에 영향을 주는 수정은 적용 전에 알린다** — 공용 코드(`src/layouts/`·`src/pages/[...slug].astro`·`src/components/Figure.astro`·`src/data/`). **영향 범위를 실측해 함께 보고한다**
- **부분 문자열 오탐 주의** — "수원·서울·인천" 검사가 FAQ 문구에 걸리는 식. 요소 단위로 검증할 것
- **dev 서버**: `.claude/launch.json` — astro-dev(4321)·astro-dev-4325·astro-preview(4322). HMR 꼬이면 재시작이 답
- **PowerShell 5.1**: `&&` 없음. 파일 쓰기는 Write 도구, 검색은 Grep
- **예약 경로 가드**: `src/pages/[...slug].astro` RESERVED — 새 정적 최상위 페이지를 만들면 여기에 추가
- **`migration/`·`_incoming/`·`src/content/cases/*/raw/`·`*/_draft.json` 은 gitignore**

### 자산 생성 스크립트

- **OG 기본 이미지는 손으로 만든 파일이 아니다** — `scripts/gen-og-image.mjs` 산출물. 문안·사진을 바꾸려면 스크립트를 고치고 재생성한다. 이미지만 교체하면 다음 실행에서 되돌아간다. 한글은 시스템 폰트 Noto Sans KR 로 렌더된다
- **사례 상세 og:image 는 각 글 thumbnail 에서 개별 생성** — 포맷 **jpeg 고정**(카카오톡·네이버는 WebP 썸네일 렌더가 불안정)
- **로고**: `src/components/Logo.astro` 가 유일한 사용처

## 5. 참고 경로 모음

| 무엇 | 어디 |
|---|---|
| 프로젝트 규칙·불변 사실(이원 지역 구조 포함) | [CLAUDE.md](CLAUDE.md) |
| 기획서·디자인 규칙 | `docs/기획/` (충돌 시 DESIGN-motorrepair-rules 우선) |
| **원고 작성 지침·문체예시** | `docs/원고작성/` — 원고 내용 규칙의 단일 소스 |
| 발행 스킬 2종 | `.claude/skills/write-case/` · `.claude/skills/publish-case/` |
| 사업장 상수(NAP·좌표·지역 2계열·브랜드·내비) | `src/data/business.ts` |
| 브랜드 정본·별칭·영문 토큰 | `src/data/brands.json` (사이트 래퍼는 `caseBrands.ts`) |
| 오버레이 폰트 | `assets/fonts/` (웹 미배포) |
| 이미지 매핑 | `docs/기획/image_requests.csv` |
| 이전 도구·원본 자료 | `migration/` (gitignore) |
