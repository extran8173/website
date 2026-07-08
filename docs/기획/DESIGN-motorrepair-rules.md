# 디자인 적용규칙 — 모터리페어 (DESIGN-apple.md 보충 문서)

> 이 문서는 `DESIGN-apple.md`(원본 디자인 시스템)를 **수정하지 않고 그 위에 얹는 적용 레이어**다.
> 규칙: 여기에 적힌 항목만 원본과 다르게 적용하고, 적히지 않은 모든 것은 원본을 그대로 따른다.
> Claude Code는 두 문서를 함께 읽는다 — 충돌 시 이 문서가 우선한다.

---

## 1. 한글 폰트 스택 (필수 — 원본의 치명적 공백)

원본의 SF Pro / Inter에는 **한글 글리프가 없다.** 그대로 빌드하면 한글이 브라우저 기본 폰트로 렌더링되어 디자인이 깨진다. 아래로 교체한다.

```css
--font-display: "SF Pro Display", -apple-system, BlinkMacSystemFont,
                "Pretendard Variable", Pretendard, "Inter", system-ui, sans-serif;
--font-text:    "SF Pro Text",    -apple-system, BlinkMacSystemFont,
                "Pretendard Variable", Pretendard, "Inter", system-ui, sans-serif;
```

- **Pretendard Variable**을 self-host(woff2, `font-display: swap`)한다. Apple 산세리프의 한글 대응으로 설계된 폰트라 원본 시스템의 인상을 그대로 잇는다.
- Apple 기기에서는 SF Pro(라틴·숫자) + Apple SD Gothic Neo 계열이 자연 적용되고, 그 외 기기에서 Pretendard가 한글·라틴을 모두 담당한다.

**한글 자간 규칙:** 원본의 네거티브 자간(-0.28 ~ -0.374px)은 라틴 기준이다. 한글 본문에는 과도하므로 아래로 조정한다.
- 디스플레이(28px 이상 헤드라인): `letter-spacing: -0.02em` (Apple tight 인상 유지)
- 본문(17px): `letter-spacing: -0.01em`
- 캡션(14px 이하): `letter-spacing: 0`
- 숫자·영문 전용 요소(전화번호, 장비명 ISTA+·Xentry 등)는 원본 자간 값을 그대로 써도 된다.

## 2. 레이아웃 이원화 (페이지 성격별 분리)

원본은 제품 카탈로그(한 화면에 하나, 저밀도) 문법이다. 페이지 성격에 따라 둘로 나눈다.

**A. 타일 리듬 페이지 — 메인 · 서비스 · 진단 장비 · 오시는 길**
- 원본 그대로: 풀블리드 타일(light ↔ parchment ↔ dark 교차), 색 전환이 곧 구분선, 섹션 패딩 `{spacing.section}`(80px, 모바일 48px).
- 다크 타일(`surface-tile-1~3`)은 진단 장비 섹션처럼 "장비·기술" 무드에 우선 배정한다.

**B. 리딩 컬럼 페이지 — 정비 사례 본문(`/cases/{slug}/`)**
- 타일 리듬 금지. 단일 리딩 컬럼(최대 폭 **980px**, 원본의 text-heavy 컨테이너 값)에 본문 + Figure가 흐르는 롱폼 포토에세이 레이아웃.
- Figure/figcaption 상세 규격은 `Astro_정비사례_파이프라인.md`를 따른다(18px 라운드, 그림자 없음, caption 토큰).
- 사례 목록 페이지(`/cases/`)는 원본의 `store-utility-card` 문법(1px hairline · 18px 라운드 · 24px 패딩)을 사례 카드로 차용한다.

## 3. 사진 처리 규칙 (제품 렌더 → 정비 다큐멘터리)

- 원본의 유일한 그림자(`rgba(0,0,0,0.22) 3px 5px 30px`)는 **투명 배경 제품 렌더 전용**이다. 우리 사진은 전부 현장 다큐멘터리 컷이므로 **그림자를 일절 쓰지 않는다.**
- 본문 인라인 사진: 직사각 + `{rounded.lg}`(18px), 보더 없음.
- 히어로·풀블리드 사진: 원본 규칙대로 라운드 없음(0px), edge-to-edge.
- 어두운 사진 위 텍스트는 `{colors.on-dark}` + 필요 시 반투명 스크림(black 0~40% 단색, 그라디언트 장식 금지 원칙 유지)으로 명도 대비를 확보한다.

## 4. 모터리페어 고유 컴포넌트 (원본에 없음 — 토큰 조합으로 신규 정의)

**`cta-call`** — 전화 상담 버튼 (주 전환 ①)
- `button-primary` 규격 그대로(Action Blue 필 pill) + 좌측 전화 아이콘. `href="tel:01032037607"`.
- 히어로에서는 `button-store-hero` 규격(18px/300, 14×28px 패딩)으로 확대 사용.
- 문구: "전화로 증상 상담하기"

**`cta-naver`** — 네이버 예약 버튼 (주 전환 ②)
- `button-secondary-pill`(고스트 필) 규격. **네이버 그린을 쓰지 않는다** — 단일 액센트 원칙(Action Blue 유일)을 지킨다. 새 창 열림.
- 문구: "네이버로 예약하기"
- 두 CTA가 나란히 설 때: cta-call(채움) + cta-naver(고스트) — 원본의 "Buy / Learn more" 페어 문법과 동일.

**`fab-contact`** — 모바일 플로팅 CTA
- 우측 하단 고정, `button-icon-circular` 규격(44×44px, 반투명 칩 + backdrop-blur)을 기반으로 한 FAB.
- 탭하면 전화·네이버 예약 2개 버튼이 세로로 펼쳐진다(버튼 간격 8px 이상).
- 데스크톱(1024px 이상)에서는 숨긴다 — 헤더 CTA가 대신한다.

**`trust-badge-row`** — 신뢰 배지 줄 (경력 20년 · ISO 9001·14001·45001 · A/S 1년/2만km)
- `configurator-option-chip` 문법 차용: pill 형태 + hairline 보더 + `{typography.caption}`. 아이콘 최소화, 텍스트가 주인공.
- 히어로 직하단과 문의 페이지에 배치. 수치는 텍스트로(GEO 원칙).

**`review-card`** — 후기 카드
- `store-utility-card` 규격(hairline · 18px · 24px 패딩). 상단 별점 텍스트(★4.7) + 본문 인용(`{typography.body}`) + 하단 출처(`{typography.caption}`, ink-muted-48).
- 그림자 금지 원칙 유지.

**`sticky-case-cta`** — 정비 사례 글 하단 고정 전환 바
- 원본 `floating-sticky-bar` 문법 차용: parchment 80% + backdrop-blur, 높이 64px.
- 좌측: "비슷한 증상이신가요?" (`{typography.body}`) / 우측: `cta-call`.
- 사례 본문 스크롤 50% 지점부터 노출.

## 5. 내비게이션 적용

- **global-nav(검은 바)는 쓰지 않는다.** 원본의 2단 내비(글로벌+서브)는 단일 사이트엔 과하다. `sub-nav-frosted` 하나만 쓴다: parchment 80% + blur, 높이 52px 기준.
  - 좌: 가로형 로고 / 중: 메뉴 6개(`{typography.button-utility}`) / 우: `cta-call`(pill) + 전화번호 텍스트.
  - 모바일(834px 이하): 로고 + 전화 아이콘 + 햄버거. 원본 collapse 규칙 준수.
- **푸터**: 원본 footer 규격(parchment · dense-link 2.41 행간)에 법정 표기를 얹는다 — 상호, 사업자등록번호 289-02-02283, 주소, 영업시간, 전화(tel: 링크), 네이버 예약 링크, ISO 인증 표기, 서비스 지역 텍스트("동탄·화성·오산·평택 수입차 정비").

## 6. 모바일 원칙 병합 (기획 규칙 vs 원본 — 충돌 정리)

| 항목 | 기획 규칙 | 원본 | 적용 |
|---|---|---|---|
| 본문 크기 | 최소 16px | 17px | **17px** (원본이 기획 최소치를 상회 — 원본 따름) |
| 터치 타깃 | 44px 이상 | 44px 최소 | 동일 — 44px |
| 모바일 단 수 | 1단 | 640px 이하 1-col | 동일 |
| 본문 행간 | 1.6 이상 | 1.47 | **1.47 유지** — 원본의 편집 리듬이 브랜드 핵심이고 17px에서 가독 충분. 단 한글 장문 사례 본문만 1.6으로 상향 |
| 폼 입력 폰트 | 16px 이상(줌 방지) | search-input 17px | 동일 |
| 좌우 여백 | 최소 16px | — (미정의) | 기획 규칙 적용: 모바일 최소 16px, 태블릿 이상 24px |

## 7. 금지 사항 (원본 Don't + 모터리페어 추가)

원본의 Don't 전부 유지(두 번째 액센트 금지 · 카드/버튼 그림자 금지 · 장식 그라디언트 금지 · weight 500 금지 · 타일 라운드 금지 등)하고, 아래를 추가한다.

- 네이버 예약 버튼에 네이버 그린 사용 금지 — 액센트는 Action Blue 하나다.
- 다큐멘터리 사진에 제품 그림자 적용 금지.
- 스톡 사진을 사업장·작업·인물 자리에 사용 금지 (기획 이미지 규칙과 동일).
- 한글 본문에 원본 라틴 자간 값(-0.374px) 그대로 적용 금지 — §1 조정값을 따른다.

---

**리포지토리 배치:** 이 파일과 `DESIGN-apple.md`를 함께 `docs/기획/`에 둔다. CLAUDE.md에 "디자인은 DESIGN-apple.md를 기준으로 하되 디자인 적용규칙 문서가 우선한다"를 명시한다.
