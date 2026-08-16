# HANDOFF — 모터리페어 웹사이트 (2026-08-09 심야 갱신)

> 다음 세션/작업자를 위한 인계 문서. 프로젝트 기준·규칙은 [CLAUDE.md](CLAUDE.md)가 원본이고, 이 문서는 **현재 진행 상태와 미결 사항**만 담는다.
> 오래되면 믿지 말 것 — git log와 실제 코드가 항상 우선.

## 1. 지금 어디까지 왔나

라이브: https://website.nomadicom.workers.dev (main 푸시 → Cloudflare Workers 자동 배포, 보통 1~2분. 엣지 전파 중 구버전 응답이 섞일 수 있음 — 캐시버스터로 재확인)

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

**카피 클레임 리스크 정리 (2026-08-09 확정):**
- "사진으로 보여드립니다" 계열 약속형 13곳 → "알려드립니다/안내드립니다"로 정정. 3단계 다이어그램 화살표 라벨("승인 후") 제거
- 사례 목록·메타의 "사진과 함께 기록" 계열은 **사실 서술로 유지 확정** / 오시는길·진단장비의 "승인" 표현도 **절차 안내로 유지 확정** — 재론 금지
- 사례 73건 본문은 WP 원문 보존 원칙 — 건드리지 않는다

## 2. 미결 사항 (사용자 결정 대기)

- [ ] **motorrepair.co.kr 도메인 전환** — 진행 중(2026-08-16 기준 Cloudflare DNS 정리: A·CNAME 3건 삭제 → Worker 커스텀 도메인 연결). URL 승계는 도메인 연결이 전제라 전환 전까지 WP 유지 권장.
  전환 시 함께 고칠 곳 — **코드 2곳 + 외부 캐시 2곳**:
  1. `astro.config.mjs` 의 `site` — canonical·og:url·og:image·JSON-LD `url` 이 전부 여기서 파생된다
  2. `public/robots.txt` 의 `Sitemap:` — 정적 파일이라 빌드 변수가 안 먹는다
  3. 카카오 공유 디버거로 새 도메인 캐시 초기화 (https://developers.kakao.com/tool/debugger/sharing) — 워커스 도메인으로 캐시된 내용은 승계되지 않는다
  4. 네이버도 별도 캐시 — 블로그에 링크를 넣어 썸네일 노출 확인
- [ ] "자동-임시글동탄-랜드로버-…" 슬러그 개명+301 여부 (원문 보존 중)
- [ ] 잔여 이미지 자산: IMG-002/008 고해상 세트컷, IMG-016 대표 프로필, VID-003 Picoscope 클립 (`docs/기획/image_requests.csv`)
- [ ] **icon-512.png — 보류(2026-08-16)**. 원본 엠블럼이 150px급이라 512px 업스케일 시 화질 열화. PWA(홈 화면 추가) 용도인데 현 사이트 성격상 필요성 낮음. 매니페스트가 없어 404·콘솔 오류도 없다(참조하는 곳 자체가 없음). **고해상도 엠블럼 원본 확보 시 재진행**
- [x] ~~OG 기본 이미지 재제작~~ — 완료(2026-08-16). `public/og-default.jpg` (실사 외관 IMG-001 + 스크림 + 로고 + 2행 문안). 구 카드에 박혀 있던 약속형 카피 제거. 생성기: `scripts/gen-og-image.mjs`
- [ ] 검토 여지: 미니쿠퍼 사례 태그 "병점 정비소" 1건(법적 주소상 오류는 아님, 동탄 정체성 관점 판단 필요) · 렉서스/재규어 글의 Picoscope 언급(범용 계측기 + 원문 실작업 기록이라 유지 판단함)

## 3. 알아두면 시간 아끼는 것들

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

## 4. 참고 경로 모음

| 무엇 | 어디 |
|---|---|
| 프로젝트 규칙·불변 사실(이원 지역 구조 포함) | [CLAUDE.md](CLAUDE.md) |
| 기획서·디자인 규칙 | `docs/기획/` (충돌 시 DESIGN-motorrepair-rules 우선) |
| 사업장 상수(NAP·좌표·지역 2계열·브랜드·내비) | `src/data/business.ts` |
| 사례 브랜드 필터 그룹 | `src/data/caseBrands.ts` |
| 이미지 매핑 | `docs/기획/image_requests.csv` |
| 이전 도구·원본 자료 | `migration/` (gitignore) — tools/AUTHORING.md가 저작 규칙 |
