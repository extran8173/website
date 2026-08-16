# HANDOFF — 모터리페어 웹사이트 (2026-08-16 갱신)

> 다음 세션/작업자를 위한 인계 문서. 프로젝트 기준·규칙은 [CLAUDE.md](CLAUDE.md)가 원본이고, 이 문서는 **현재 진행 상태와 미결 사항**만 담는다.
> 오래되면 믿지 말 것 — git log와 실제 코드가 항상 우선.

## 1. 지금 어디까지 왔나

라이브: **https://motorrepair.co.kr** (2026-08-16 도메인 전환 완료 — apex·www 둘 다 Worker 커스텀 도메인. `website.nomadicom.workers.dev` 도 계속 응답하나 canonical 은 커스텀 도메인을 가리킨다)
main 푸시 → Cloudflare Workers 자동 배포, 보통 1~2분. 엣지 전파 중 구버전 응답이 섞일 수 있음 — 캐시버스터로 재확인

**워드프레스 이전 — 완료 (2026-08-09):**
- 발행글 74건 전량 이전: 정비 사례 **73건**(사례 컬렉션) + **업체 소개 1건**(일반 정적 페이지 `/dongtan-import-car-specialty-motor-repair-introduction/`, 내비 "소개")
- 검증: 슬러그 전건 일치(WP 원문 보존, 한글 17건 포함) · 이미지 전건 일치(글당 선두 브랜딩 1장만 제외, 다운로드 실패 1건은 수동 복구) · 빌드 94페이지
- pending 5건·draft 2건은 이전 대상 아님. 리포 +237MB(이미지 1,441장, 1600px WebP q80)
- 이전 도구: `migration/tools/` — batches.json(67건 목록·ASCII 폴더 별칭), convert-batch.mjs(기계 변환), AUTHORING.md(저작 규칙 — 에이전트 병렬 저작에 사용), inventory.mjs(WXR 인벤토리), verify-migration.mjs(전수 대조)

**사례 목록 /cases/ — 구축 완료:**
- 브랜드 필터 7종(전체·bmw·benz·audi-vw·porsche·jaguar-lr·others), 그룹 매핑 단일 소스 `src/data/caseBrands.ts`, 건수는 컬렉션 계산
- 12건 페이지네이션(`/cases/2/` 형식), 브랜드별 고유 SEO title/desc, 2페이지 이후 페이지 번호 표기
- CaseCard: 4/3 각진 썸네일 · 브랜드·차종 · 제목 2줄 클램프 · **symptom_customer 인용 노출**(핵심) · 발행일

**위치 사실관계 — 정정 완료:**
- 실위치: 동탄 능동 스타벅스 뒤편, 동탄신도시 생활권 (행정주소만 병점동 — 법적 주소 표기는 유지)
- "병점역 인근"·"동탄에서 10~20분" 표현 전수 제거. 지역 목록 5줄(동탄 5~10분·수원 20분·용인 30분·오산 20분·평택 30분)
- 좌표 170m 보정: `business.ts` geo = 37.2136955, 127.0522204 (임베드·카카오·구글·JSON-LD 전부 이 상수 참조)
- 카카오맵 실기기 마커 확인은 사용자 몫으로 남음 (요청함, 회신 미수)

**서비스 지역 이원 구조 (2026-08-09 확정 — 통일하지 않는다):**
- A계열 `seoRegions` 동탄·화성·오산·평택 — SEO 축 (메타·areaServed·사례 태그·FAQ)
- B계열 `accessRegions` 동탄·수원·용인·오산·평택 — 체감 거리 축 (오시는길 히어로 라벨·지역 목록)
- CLAUDE.md 불변 사실에 문서화됨. 구 `serviceAreas` 상수는 제거됨

**도메인 전환 — 완료 (2026-08-16):**
- DNS 전파 완료 — 리졸버 3곳(1.1.1.1 · 8.8.8.8 · KT 168.126.63.1) 전부 Cloudflare IP 반환, 구 A 레코드 `112.175.85.158` 소멸. apex·www 둘 다 Worker 커스텀 도메인 + 프록시
- 사이트 기준 URL `workers.dev` → `motorrepair.co.kr` 전면 교체 (커밋 `5a10676`) — `astro.config.mjs` 의 `site`, `public/robots.txt` 의 `Sitemap:`
- 문서 내 구 도메인 잔존 정리 (커밋 `8979c40`) — CLAUDE.md, HANDOFF.md
  ※ 두 문서에 `workers.dev` 가 한 번씩 남아 있는 것은 **의도된 설명 문장**이다(그 주소도 계속 응답하나 canonical 은 커스텀 도메인을 가리킨다는 뜻)
- 검증: dist 94/94 (canonical·og:url·og:image), sitemap 93건 전부 새 도메인, 라이브 전건 200, og:image 고유 74개 전건 로드, 구 도메인 참조 0건
- JSON-LD `url` 은 `Astro.site` 파생이라 자동 교체됨 (AutoRepair, 정상)
- **Cloudflare 마감 설정 완료** — www → apex 301 Redirect Rule(와일드카드, Preserve query string 켬) + Always Use HTTPS.
  실측: `https://www/services/` → 301 `https://motorrepair.co.kr/services/`, 쿼리스트링(`?page=2`) 보존, `http://apex` → 301 https, apex 200.
  `http://www` 는 Always Use HTTPS → Redirect Rule 순으로 **2홉**을 거친다(정상 동작)
- **카카오 공유 캐시 초기화 완료** — 홈·BMW 320d 사례글 각 1건 확인. 홈은 og:url·og:image 모두 새 도메인으로 카드 정상, 사례는 개별 썸네일·제목 정상(73건 구조 검증됨)

**카피 클레임 리스크 정리 (2026-08-09 확정):**
- "사진으로 보여드립니다" 계열 약속형 13곳 → "알려드립니다/안내드립니다"로 정정. 3단계 다이어그램 화살표 라벨("승인 후") 제거
- 사례 목록·메타의 "사진과 함께 기록" 계열은 **사실 서술로 유지 확정** / 오시는길·진단장비의 "승인" 표현도 **절차 안내로 유지 확정** — 재론 금지
- 사례 73건 본문은 WP 원문 보존 원칙 — 건드리지 않는다

## 2. 미결 사항 (사용자 결정 대기)

- [x] ~~motorrepair.co.kr 도메인 전환~~ — **완료(2026-08-16)**. 코드 2곳(`astro.config.mjs` `site` · `public/robots.txt` `Sitemap:`) 교체 후 라이브 전수 검증: sitemap 93 URL 전건 200, canonical·og:url·og:image 구 도메인 0건, og:image 74개 전건 로드, dist 산출물 구 도메인 0건
- [x] ~~도메인 전환 잔여 — www 301 · Always Use HTTPS · 카카오 캐시 초기화~~ **완료(2026-08-16)**. 실측 결과는 §1 참조
- [ ] **네이버 링크 카드가 구 워드프레스 메타를 표시 중** — "동탄 수입차 전문정비 모터리페어 / '정확한 진단과 신뢰의 기술'로…", 썸네일 없음.
  **네이버는 강제 캐시 초기화 수단이 없다** — 자체 재크롤링을 기다려야 하고 보통 수일~2주 걸린다. 사이트 쪽에 고칠 것은 없다(OG 태그는 이미 정상).
  네이버 서치어드바이저에 사이트 등록·수집 요청을 하면 앞당길 수 있으나, **검색엔진 등록은 후순위 결정 항목이라 별도 세션에서 진행**한다
- [ ] "자동-임시글동탄-랜드로버-…" 슬러그 개명+301 여부 (원문 보존 중)
- [ ] 잔여 이미지 자산: IMG-002/008 고해상 세트컷, IMG-016 대표 프로필, VID-003 Picoscope 클립 (`docs/기획/image_requests.csv`)
- [ ] **icon-512.png — 보류(2026-08-16)**. 원본 엠블럼이 150px급이라 512px 업스케일 시 화질 열화. PWA(홈 화면 추가) 용도인데 현 사이트 성격상 필요성 낮음. 매니페스트가 없어 404·콘솔 오류도 없다(참조하는 곳 자체가 없음). **고해상도 엠블럼 원본 확보 시 재진행**
- [x] ~~OG 기본 이미지 재제작~~ — 완료(2026-08-16). `public/og-default.jpg` (실사 외관 IMG-001 + 스크림 + 로고 + 2행 문안). 구 카드에 박혀 있던 약속형 카피 제거. 생성기: `scripts/gen-og-image.mjs`
- [ ] 검토 여지: 미니쿠퍼 사례 태그 "병점 정비소" 1건(법적 주소상 오류는 아님, 동탄 정체성 관점 판단 필요) · 렉서스/재규어 글의 Picoscope 언급(범용 계측기 + 원문 실작업 기록이라 유지 판단함)

## 3. 다음 세션 과제 — JSON-LD 구조화 데이터 보강

이번 세션에서 **착수하지 않기로 한 항목**이다(기록만). 현재 홈의 JSON-LD 는 `AutoRepair` 하나이고, `@id`·`image` 필드가 없으며 **BreadcrumbList 는 사이트 어디에도 없다**(사례글은 `FAQPage` 만 보유). 소스는 `src/layouts/BaseLayout.astro`.

**착수 전에 먼저 할 것** — 현재 `AutoRepair` 스키마의 보유 필드를 전부 출력해 확인한다: `telephone` · `address` · `geo` · `openingHoursSpecification` · `sameAs` · `priceRange` 유무.

우선순위:

1. **`@id`(`https://motorrepair.co.kr/#business`) · `image`(og-default.jpg) · `sameAs`(네이버 플레이스·네이버 블로그·유튜브)** — 엔티티 결합, GEO 효과가 가장 크다
2. **누락된 NAP·영업시간·좌표 필드** — geo 는 `37.2136955 / 127.0522204`, 영업시간은 월–금 08:30–18:30 · 토 08:30–15:00 · 일 휴무 (값의 원본은 `src/data/business.ts`)
3. **BreadcrumbList** — 사례글이 top-level path 라 URL 계층이 없어 후순위

> **금지: `aggregateRating` 추가 금지.** 자체 사이트에서 자기 사업체 평점을 마크업하는 것은 Google 의 self-serving review 정책 위반이라 수동 조치 대상이 될 수 있다. 화면 텍스트 표기("네이버 리뷰 15건 · 구글 평점 ★4.7", `src/pages/index.astro`)는 **그대로 둔다** — 마크업만 금지다.

## 4. 알아두면 시간 아끼는 것들

- **배포 플로우**: "배포" 지시 → 커밋+푸시 → 라이브 폴링. **한글 문자열 검증은 WebClient + UTF8 인코딩 명시**(Invoke-WebRequest .Content는 한글 매칭 불가). `$home`은 PowerShell 예약 변수 — 쓰지 말 것. 커밋 메시지 큰따옴표는 파싱 사고 — 히어스트링(`@'...'@`) 사용
- **부분 문자열 오탐 주의**: "수원·서울·인천" 검사가 FAQ의 "용인·수원·서울·인천"에 걸리는 식 — 요소 단위로 검증할 것
- **dev 서버**: `.claude/launch.json` — astro-dev(4321)·astro-dev-4325·astro-preview(4322). **HMR 꼬이면(스타일 미반영) 서버 재시작이 답**. 브라우저 패널 숨김 상태에선 lazy 이미지가 안 실리고 스크린샷 불가 — computed style·fetch 계측으로 검증
- **PowerShell 5.1**: `&&` 없음. 파일 쓰기는 Write 도구, 검색은 Grep
- **예약 경로 가드**: `src/pages/[...slug].astro` RESERVED에 소개 페이지 슬러그 포함 — 새 정적 최상위 페이지를 만들면 여기에 추가할 것
- **주간 발행**: `.claude/skills/publish-case/` 구축 완료(2026-08-16) — SKILL.md 7단계 + prepare-images.mjs(EXIF 촬영시각 정렬·2000px·WebP). 절차의 단일 소스는 SKILL.md이고 파이프라인 문서는 포인터만 둔다. 신규 발행 글은 astro:assets 경로(img 모드), 이전 글은 public 정적(src 모드) — Figure가 두 모드 지원. img 모드는 임시 사례로 빌드 검증함(95페이지 확인 후 제거)
- **로고·파비콘**: `src/components/Logo.astro`가 유일한 로고 사용처(헤더 32/28px·푸터 38/34px). 파비콘 ico는 16·32 단순화본(NOW·REPAIR 제거) + 48 원본
- **OG 기본 이미지는 손으로 만든 파일이 아니라 스크립트 산출물이다** — `scripts/gen-og-image.mjs` 가 `public/og-default.jpg` 를 생성한다(실사 외관 IMG-001 크롭 + 하단 스크림 + 로고 + 2행 문안, 1200×630 jpeg).
  - **문안·사진·밝기를 바꾸려면 이 스크립트를 고치고 `node scripts/gen-og-image.mjs` 로 재생성한다.** 이미지 파일만 교체하면 다음에 스크립트를 돌리는 순간 되돌아간다 — 실제로 구 스크립트에 폐기된 약속형 카피("과정을 사진으로 보여드립니다")가 남아 있어 되살아날 뻔했다(2026-08-16 교체)
  - 파일명을 바꾸면 `BaseLayout.astro` 의 `ogImage` 기본값과 `[...slug].astro` 의 RESERVED 도 함께 고칠 것
  - 한글은 시스템 폰트 **Noto Sans KR** 로 렌더된다(Pretendard 는 woff2 라 librsvg 가 못 쓴다)
  - 사례 상세는 각 글 thumbnail 에서 개별 생성(`[...slug].astro`). **포맷은 jpeg 고정** — 카카오톡·네이버는 WebP 썸네일 렌더가 불안정하다
- **`migration/`·`_incoming/`은 gitignore** — 삭제 금지, 커밋 금지(개인정보 포함 가능)
- **작업 방식(사용자 선호)**: 구조화 스펙([대상/수정/검증/보고])으로 지시가 옴. 전제가 실제와 다르면 임의 대체 말고 근거와 함께 보고. 검증은 수치로. 미확인 값은 넣지 말고 보고(수원 20분 사례). 애매한 건 보류 목록으로

## 5. 참고 경로 모음

| 무엇 | 어디 |
|---|---|
| 프로젝트 규칙·불변 사실(이원 지역 구조 포함) | [CLAUDE.md](CLAUDE.md) |
| 기획서·디자인 규칙 | `docs/기획/` (충돌 시 DESIGN-motorrepair-rules 우선) |
| 사업장 상수(NAP·좌표·지역 2계열·브랜드·내비) | `src/data/business.ts` |
| 사례 브랜드 필터 그룹 | `src/data/caseBrands.ts` |
| 이미지 매핑 | `docs/기획/image_requests.csv` |
| 이전 도구·원본 자료 | `migration/` (gitignore) — tools/AUTHORING.md가 저작 규칙 |
