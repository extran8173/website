import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 정비 사례 컬렉션 — 스키마 원본: docs/기획/Astro_정비사례_파이프라인.md §2
// 프런트매터를 Zod 로 검증한다. 필드 누락·형식 오류는 빌드가 잡는다.
const cases = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/cases' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seo_title: z.string(),
      // URL 슬러그 — 필수. 워드프레스 이전 글은 원본 슬러그를 한 글자도 바꾸지 않고 넣는다 (자동 생성 금지).
      // 한글 슬러그는 디코딩된 원문을 넣는다 (렌더 시 동일하게 퍼센트 인코딩됨).
      slug: z.string(),
      date: z.coerce.date(),
      focus_keyword: z.string(),
      description: z.string().max(160),
      brand: z.string(),
      car_model: z.string(),
      mileage_km: z.number(),
      symptom_customer: z.array(z.string()), // 고객 언어 증상
      symptom_tech: z.string(),
      category: z.string(),
      diagnostic: z.array(z.string()), // 장비 실명
      parts_used: z.array(z.string()),
      result: z.string(),
      region: z.string().default('동탄·화성·오산·평택'),
      tags: z.array(z.string()),
      thumbnail: image(), // astro:assets 최적화 대상
      figcaption: z.boolean().default(true),
      // GEO 카드용
      summary_lead: z.string(), // 자기완결 엔티티 1문장
      diagnosis_cause: z.string(), // 원인 1줄
      faq: z.array(z.object({ q: z.string(), a: z.string() })).length(3),
    }),
});

export const collections = { cases };
