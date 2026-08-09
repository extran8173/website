// 사례 브랜드 필터 그룹 — /cases/ 하위 필터 경로의 단일 소스.
// key = URL 세그먼트(/cases/<key>/), brands = frontmatter brand 값 매핑.
// 건수는 하드코딩하지 않는다 — 각 사용처에서 컬렉션으로 계산.
import type { CollectionEntry } from 'astro:content';

export interface BrandGroup {
  key: string;
  label: string; // 필터 라벨 (건수는 렌더 시 덧붙임)
  brands: string[]; // frontmatter brand 값 목록 (others는 빈 배열 — 나머지 전부)
  seoName: string; // SEO 타이틀·설명용 명칭
}

export const BRAND_GROUPS: BrandGroup[] = [
  { key: 'bmw', label: 'BMW · MINI', brands: ['BMW', '미니'], seoName: 'BMW·MINI' },
  { key: 'benz', label: '벤츠', brands: ['벤츠'], seoName: '벤츠' },
  { key: 'audi-vw', label: '아우디 · 폭스바겐', brands: ['아우디', '폭스바겐'], seoName: '아우디·폭스바겐' },
  { key: 'porsche', label: '포르쉐', brands: ['포르쉐'], seoName: '포르쉐' },
  { key: 'jaguar-lr', label: '재규어 · 랜드로버', brands: ['재규어', '랜드로버'], seoName: '재규어·랜드로버' },
  { key: 'others', label: '기타', brands: [], seoName: '기타 수입차' },
];

const MAPPED = new Set(BRAND_GROUPS.flatMap((g) => g.brands));

/** 그룹 key로 사례를 필터링한다. 'others'는 매핑되지 않은 나머지 전 브랜드. */
export function filterByGroup(cases: CollectionEntry<'cases'>[], key: string): CollectionEntry<'cases'>[] {
  const group = BRAND_GROUPS.find((g) => g.key === key);
  if (!group) return [];
  if (group.key === 'others') return cases.filter((c) => !MAPPED.has(c.data.brand));
  return cases.filter((c) => group.brands.includes(c.data.brand));
}
