// 사례 브랜드 필터 그룹 — /cases/ 하위 필터 경로의 단일 소스.
// key = URL 세그먼트(/cases/<key>/), brands = frontmatter brand 정본 목록.
// 건수는 하드코딩하지 않는다 — 각 사용처에서 컬렉션으로 계산.
import type { CollectionEntry } from 'astro:content';

// ── brand 정본 ↔ 별칭 ↔ 영문 토큰 ─────────────────────────
// 표기가 흔들려도(공백·대소문자·영문/한글) 정본으로 접는다. 어긋났다고 빌드를 깨거나
// 필터에서 누락시키지 않는다.
//
// 실제 데이터는 src/data/brands.json 에 있다 — 발행 도구(.mjs)가 .ts 를 import 할 수 없어
// 양쪽이 같은 JSON 을 읽는다. 브랜드를 추가·수정할 때는 그 파일만 고친다.
import brandsData from './brands.json';

export interface BrandIdentity {
  canonical: string; // frontmatter brand 정본
  en: string; // 이미지 오버레이 1행 영문 대문자
  slugToken: string; // 슬러그 <브랜드영문> 자리
  aliases: string[];
}

export const BRAND_IDENTITY: BrandIdentity[] = brandsData.brands;

/** 비교용 정규화 — 공백·가운뎃점·하이픈 제거 + 소문자. */
function normKey(s: string): string {
  return s.replace(/[\s·\-_]/g, '').toLowerCase();
}

const CANON_BY_KEY = new Map<string, string>();
const IDENTITY_BY_CANON = new Map<string, BrandIdentity>();
for (const b of BRAND_IDENTITY) {
  IDENTITY_BY_CANON.set(b.canonical, b);
  CANON_BY_KEY.set(normKey(b.canonical), b.canonical);
  CANON_BY_KEY.set(normKey(b.en), b.canonical);
  CANON_BY_KEY.set(normKey(b.slugToken), b.canonical);
  for (const a of b.aliases) CANON_BY_KEY.set(normKey(a), b.canonical);
}

/** 정본 브랜드의 영문·슬러그 토큰. 표에 없는 브랜드는 undefined. */
export function brandIdentity(raw: string): BrandIdentity | undefined {
  return IDENTITY_BY_CANON.get(canonicalBrand(raw));
}

/**
 * frontmatter brand 값을 정본으로 교정한다.
 * 별칭에 없는 브랜드(피아트·캐딜락 등 확장 브랜드)는 원문을 그대로 돌려준다 — '기타' 그룹으로 간다.
 */
export function canonicalBrand(raw: string): string {
  return CANON_BY_KEY.get(normKey(raw)) ?? raw.trim();
}

export interface BrandGroup {
  key: string;
  label: string; // 필터 라벨 (건수는 렌더 시 덧붙임)
  brands: string[]; // 이 그룹에 속하는 brand 정본 목록 (others는 빈 배열 — 나머지 전부)
  seoName: string; // SEO 타이틀·설명용 명칭
}

export const BRAND_GROUPS: BrandGroup[] = [
  { key: 'bmw', label: 'BMW·MINI', brands: ['BMW', 'MINI'], seoName: 'BMW·MINI' },
  { key: 'benz', label: '벤츠', brands: ['벤츠'], seoName: '벤츠' },
  { key: 'audi-vw', label: '아우디·폭스바겐', brands: ['아우디', '폭스바겐'], seoName: '아우디·폭스바겐' },
  { key: 'porsche', label: '포르쉐', brands: ['포르쉐'], seoName: '포르쉐' },
  { key: 'jaguar-lr', label: '재규어·랜드로버', brands: ['재규어', '랜드로버'], seoName: '재규어·랜드로버' },
  { key: 'others', label: '기타', brands: [], seoName: '기타 수입차' },
];

const MAPPED = new Set(BRAND_GROUPS.flatMap((g) => g.brands));

/** 그룹 key로 사례를 필터링한다. 'others'는 매핑되지 않은 나머지 전 브랜드. */
export function filterByGroup(cases: CollectionEntry<'cases'>[], key: string): CollectionEntry<'cases'>[] {
  const group = BRAND_GROUPS.find((g) => g.key === key);
  if (!group) return [];
  if (group.key === 'others') return cases.filter((c) => !MAPPED.has(canonicalBrand(c.data.brand)));
  return cases.filter((c) => group.brands.includes(canonicalBrand(c.data.brand)));
}
