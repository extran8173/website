# 정비 사례 파이프라인 — Astro 마감본

> 프레임워크: **Astro 5/6**(Content Layer API). 이미지 변환 스크립트(sharp) **불필요** — `astro:assets`가 빌드 때 WebP·반응형·lazy를 자동 생성한다.
> figcaption: **ON**. 시각 스타일은 디자인 MD 토큰, 캡션 카피는 모터리페어 담담체.

---

## 1. 폴더 구조

```
src/
├─ content.config.ts                 # 컬렉션 스키마(아래 §2)
├─ components/
│   └─ Figure.astro                  # 캡션 달린 최적화 이미지(아래 §3)
├─ styles/
│   └─ tokens.css                    # 디자인 MD 토큰 → CSS 변수(아래 §6, 발췌)
├─ pages/
│   └─ [...slug].astro               # 사례 상세 라우트 — 최상위 URL(아래 §4)
└─ content/
    └─ cases/
        └─ benz-e400-air-suspension-replacement-arnott/
            ├─ index.mdx             # 글(프런트매터+본문+Figure) — 발행 스킬이 생성(아래 §5)
            ├─ raw/                  # 원본 사진 드롭(작업 후 정리됨)
            └─ images/
                ├─ thumb.webp
                ├─ 01.webp … 25.webp # 원본(또는 ≤2000px 정리본). Astro가 여기서 반응형 생성
```
> 슬러그(영문)는 **폴더명**이 된다. URL은 `/cases/<폴더명>`, 메뉴 라벨은 "정비 사례"(한글)로 분리.

---

## 2. `src/content.config.ts` — 컬렉션 스키마

젬 프런트매터를 Zod로 검증한다. 필드가 비거나 형식이 틀리면 빌드가 잡아준다.

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const cases = defineCollection({
  loader: glob({ pattern: "**/index.{md,mdx}", base: "./src/content/cases" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seo_title: z.string(),
      slug: z.string().optional(),            // 미지정 시 폴더명 사용
      date: z.coerce.date(),
      focus_keyword: z.string(),
      description: z.string().max(160),
      brand: z.string(),
      car_model: z.string(),
      mileage_km: z.number(),
      symptom_customer: z.array(z.string()),  // 고객 언어 증상
      symptom_tech: z.string(),
      category: z.string(),
      diagnostic: z.array(z.string()),        // 장비 실명(ISTA/Xentry/PIWIS/누설테스트…)
      parts_used: z.array(z.string()),
      result: z.string(),
      region: z.string().default("동탄·화성·오산·평택"),
      tags: z.array(z.string()),
      thumbnail: image(),                     // 최적화 대상
      figcaption: z.boolean().default(true),
      // GEO 카드용
      summary_lead: z.string(),               // 자기완결 엔티티 1문장
      diagnosis_cause: z.string(),            // 원인 1줄
      faq: z.array(z.object({ q: z.string(), a: z.string() })).length(3),
    }),
});

export const collections = { cases };
```

---

## 3. `src/components/Figure.astro` — 캡션 달린 최적화 이미지

디자인 토큰 적용: 그림자 없음(제품 렌더 전용 그림자는 다큐 컷에 미사용), `{rounded.lg}` 18px, 캡션은 `{typography.caption}` + `{colors.ink-muted-48}`.

```astro
---
import { Image } from "astro:assets";
interface Props { img: ImageMetadata; alt: string; caption?: string; }
const { img, alt, caption } = Astro.props;
---
<figure class="case-figure">
  <Image src={img} alt={alt}
         widths={[480, 768, 1200]}
         sizes="(max-width: 980px) 100vw, 980px"
         loading="lazy" decoding="async" />
  {caption && <figcaption>{caption}</figcaption>}
</figure>

<style>
  .case-figure { margin: var(--spacing-xl) 0; }          /* 32px */
  .case-figure :global(img) {
    width: 100%; height: auto; display: block;
    border-radius: var(--rounded-lg);                    /* 18px, 그림자·보더 없음 */
  }
  .case-figure figcaption {
    margin-top: var(--spacing-xs);                       /* 8px */
    font: 400 14px/1.43 var(--font-text);                /* caption */
    letter-spacing: -0.224px;
    color: var(--ink-muted-48);                          /* #7a7a7a — 조용한 캡션 */
  }
</style>
```

---

## 4. `src/pages/[...slug].astro` — 사례 상세(읽기 컬럼)

사례 본문은 타일 리듬이 아니라 **단일 리딩 컬럼(~980px)**. 상단에 "한눈에 보기" GEO 카드 + 본문(Figure 포함) + FAQ + FAQPage JSON-LD.

> **구현 확정본은 코드다** (2026-08-09 URL 방침 확정 반영). 아래 코드는 설계 의도를 보이는 초안이고, 실제와 다음이 다르다:
> - URL 은 **최상위** `/<slug>/` — `/cases/` 하위가 아니다. `/cases/` 는 목록·브랜드 필터 전용
> - 라우팅은 프론트매터 `slug` 값만 쓴다 (폴더명·제목 기반 자동 생성 금지). `slug` 는 필수 필드
> - 상세 페이지가 제목·요약 카드·FAQ·전환 CTA·맺음말까지 렌더한다 — 본문 mdx 에 같은 것을 넣지 않는다
> - 예약 경로 가드(`RESERVED`)가 기존 정적 페이지·자산과의 충돌을 빌드에서 잡는다

```astro
---
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const cases = await getCollection("cases");
  return cases.map((entry) => ({
    params: { id: entry.data.slug ?? entry.id.replace(/\/index$/, "") },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const d = entry.data;
const { Content } = await render(entry);
const faqLd = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: d.faq.map((f) => ({
    "@type": "Question", name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};
---
<html lang="ko">
<head>
  <title>{d.seo_title}</title>
  <meta name="description" content={d.description} />
  <set:html><script type="application/ld+json">{JSON.stringify(faqLd)}</script></set:html>
</head>
<body>
  <article class="case">
    <h1>{d.title}</h1>

    <aside class="case-summary">           <!-- 한눈에 보기 (GEO 추출 레이어) -->
      <p class="lead">{d.summary_lead}</p>
      <dl>
        <div><dt>차종</dt><dd>{d.car_model} / {d.mileage_km.toLocaleString()}km</dd></div>
        <div><dt>증상</dt><dd>{d.symptom_customer.join(" · ")}</dd></div>
        <div><dt>진단</dt><dd>{d.diagnostic.join(" · ")}</dd></div>
        <div><dt>원인</dt><dd>{d.diagnosis_cause}</dd></div>
        <div><dt>수리</dt><dd>{d.parts_used.join(" · ")}</dd></div>
        <div><dt>결과</dt><dd>{d.result}</dd></div>
      </dl>
    </aside>

    <div class="case-body"><Content /></div>

    <section class="case-faq">
      <h2>FAQ</h2>
      {d.faq.map((f) => (<div><h3>{f.q}</h3><p>{f.a}</p></div>))}
    </section>

    <p class="case-outro">바쁜 일정에도 찾아주셔서 고맙습니다. 언제나 안전운전입니다. 모터 리페어</p>
  </article>
</body>
</html>

<style>
  .case { max-width: 980px; margin: 0 auto; padding: 0 var(--spacing-md); }
  .case h1 { font: 600 40px/1.10 var(--font-display); letter-spacing: -0.374px; color: var(--ink); }
  .case-body { font: 400 17px/1.47 var(--font-text); letter-spacing: -0.374px; color: var(--body); }
  .case-summary { background: var(--canvas-parchment); border-radius: var(--rounded-lg);
                  padding: var(--spacing-lg); margin: var(--spacing-xl) 0; }
  .case-summary .lead { font: 600 21px/1.19 var(--font-text); letter-spacing: -0.231px; }
  .case-summary dl div { display: flex; gap: var(--spacing-sm); padding: 4px 0; }
  .case-summary dt { min-width: 56px; color: var(--ink-muted-48); }
  .case-outro { color: var(--ink-muted-48); margin-top: var(--spacing-xxl); }
</style>
```

---

## 5. 샘플 `index.mdx` — 발행 스킬이 만들어내는 결과물 형태

```mdx
---
title: "벤츠 E400 4matic 전하체 처짐·차고제어 불량 에어쇼바 누설 점검 정비"
seo_title: "벤츠 E400 에어쇼바 교환 | 밸브블록 누설 점검 | 동탄 수입차 정비"
date: 2026-06-14
focus_keyword: "벤츠 E400 에어쇼바 교환"
description: "벤츠 E400 4matic 전하체 처짐·차고제어 불량으로 입고, 누설테스트로 앞쪽 에어쇼바 누설을 확진하고 arnott로 교환한 기록."
brand: "벤츠"
car_model: "벤츠 E400 4matic"
mileage_km: 94000
symptom_customer: ["뒤가 주저앉아요", "차고가 안 올라와요", "계기판에 차고 경고가 떠요"]
symptom_tech: "전하체 처짐, 차고제어 불량"
category: "에어 서스펜션(에어매틱)"
diagnostic: ["누설테스트(전용 리크 검출)"]
parts_used: ["arnott 에어 서스펜션(앞 좌우)"]
result: "차고보정·주행테스트 후 정상 레벨링·감쇄력 검증, 정상 출고"
region: "동탄·화성·오산·평택"
figcaption: true
summary_lead: "모터리페어는 경기 화성 동탄의 수입차 전문 정비소로, 벤츠 E400 4matic(주행 94,000km)의 전하체 처짐을 누설테스트로 진단해 앞쪽 에어쇼바 누설을 확인하고 arnott로 교환했습니다."
diagnosis_cause: "앞쪽 에어쇼바 누설 — 밸브블록은 정상"
tags: [벤츠 E400, 에어쇼바 교환, arnott 서스펜션, 차고제어 불량, 동탄 수입차 정비]
thumbnail: ./images/thumb.webp
faq:
  - q: "계기판에 차고 제어 경고가 뜨는데 밸브블록 문제일 수도 있나요?"
    a: "네. 에어쇼바 고무 주머니 손상 외에도 공기를 분배하는 밸브블록 누설로 같은 증상이 납니다. 누설테스트로 발원지를 가립니다."
  - q: "누설테스트는 어떻게 진행하나요?"
    a: "에어 라인에 압력을 형성한 뒤 전용 리크 검출제와 계측 장비로 새는 지점을 추적합니다. 이 차량은 앞쪽에서 누설이 확인됐습니다."
  - q: "arnott로 바꿔도 차고 조절 기능이 그대로 되나요?"
    a: "네. 순정 제어 신호와 1:1 호환이라 차고 보정 후 컴포트·스포츠 등 기존 기능이 정상 작동합니다."
---
import Figure from "../../../components/Figure.astro";
import img01 from "./images/01.webp";
import img02 from "./images/02.webp";
/* …발행 스킬이 사용된 이미지 수만큼 import 자동 생성… */

안녕하세요? 동탄 수입차 전문정비 모터 리페어입니다. (…젬 웹사이트 세트 본문…)

<Figure img={img01} alt="동탄 수입차 정비 벤츠 E400 전하체 처짐" caption="입고된 차량의 전하체가 내려앉은 상태를 먼저 확인하게 되죠." />

(…본문 계속…)

<Figure img={img02} alt="동탄 벤츠 에어 서스펜션 누설테스트" caption="에어 라인에 압력을 걸어 누설 지점을 추적하게 됩니다." />
```

---

## 6. `src/styles/tokens.css` — 디자인 MD 토큰 → CSS 변수 (사례 파트가 쓰는 발췌)

```css
:root {
  /* color */
  --ink: #1d1d1f; --body: #1d1d1f;
  --ink-muted-48: #7a7a7a;
  --canvas: #ffffff; --canvas-parchment: #f5f5f7;
  --primary: #0066cc; --primary-on-dark: #2997ff;
  /* type */
  --font-display: "SF Pro Display", system-ui, -apple-system, "Inter", sans-serif;
  --font-text:    "SF Pro Text",    system-ui, -apple-system, "Inter", sans-serif;
  /* radius */
  --rounded-sm: 8px; --rounded-lg: 18px; --rounded-pill: 9999px;
  /* spacing */
  --spacing-xs: 8px; --spacing-sm: 12px; --spacing-md: 17px;
  --spacing-lg: 24px; --spacing-xl: 32px; --spacing-xxl: 48px; --spacing-section: 80px;
}
```
> 전체 토큰(타일·버튼·내비 등)은 디자인 MD 그대로 이 파일에 채운다. 위는 사례 페이지가 참조하는 최소분.

---

## 7. Astro용 발행 스킬

**실물: `.claude/skills/publish-case/`** (2026-08-16 구축). 절차·규칙의 단일 소스는 그 `SKILL.md` 이고, 이 문서는 스킬 내용을 복사해 두지 않는다 — 두 벌이 되면 어긋난다.

- `SKILL.md` — 7단계 절차(입력 확인 → 이미지 정리 → 사진 판독 → index.mdx → captions.md → 빌드 검증 → 보고)
- `prepare-images.mjs` — raw 사진을 EXIF 촬영시각 순으로 `images/NN.webp` + `thumb.webp` 로 정리(가로 2000px 상한 · EXIF 제거 · WebP q80). 반응형 변환은 astro:assets 가 빌드 때 한다

---

## 8. 주간 발행 플로우 (명령 한 번)

```
1) 젬에서 "웹사이트 세트" 출력
2) src/content/cases/{영문슬러그}/raw/ 에 원본 사진 전부 드롭 (순서·HEIC·용량 무관)
   같은 폴더에 젬 본문 붙여 임시 저장
3) Claude Code: "이 정비 사례 발행 준비해줘" → publish-case 스킬
4) 스킬이 이미지 정리·alt/caption·index.mdx 배치·captions.md까지 완료
5) captions.md 훑고 어색한 캡션만 수정
6) git commit & push → Cloudflare Pages가 빌드(이때 WebP·반응형 자동 생성) → 배포
```

손으로 칠 일: alt/caption 25장 → **검토 시 몇 줄 손보기**가 전부.

---

## 9. 확정 완료 (구 "남은 확정")

- **URL 경로** — 사례는 **최상위** `/<영문슬러그>/` (2026-08-09 확정). 워드프레스 원본 슬러그를 그대로 승계하기 위한 방침이고, 신규 글도 같은 규칙을 따른다. `/cases/` 는 목록·브랜드 필터 전용. 메뉴 라벨은 "정비 사례".
- **목록 페이지 카드** — 구축 완료. 썸네일(4/3 각진) · 브랜드·차종 · 제목 2줄 클램프 · `symptom_customer` 인용 · 발행일. 브랜드 필터 7종 + 12건 페이지네이션(`src/components/CasesListPage.astro`, `src/data/caseBrands.ts`).
