// 사례 브랜드 필터 그룹 — /cases/ 하위 필터 경로의 단일 소스.
// key = URL 세그먼트(/cases/<key>/), brands = frontmatter brand 정본 목록.
// 건수는 하드코딩하지 않는다 — 각 사용처에서 컬렉션으로 계산.
import type { CollectionEntry } from 'astro:content';

// ── brand 정본 ↔ 별칭 ────────────────────────────────────
// 원고의 brand 표기가 흔들려도(공백·대소문자·영문/한글) 정본으로 접는다.
// 표기가 어긋났다고 빌드를 깨거나 필터에서 누락시키지 않는다.
// 키가 정본, 값이 별칭 목록. 정본 자신은 별칭에 다시 적지 않는다.
export const BRAND_ALIASES: Record<string, string[]> = {
  BMW: ['비엠더블유', '비엠', 'bmw'],
  MINI: ['미니', 'mini', 'Mini', 'BMW미니', 'BMW MINI'],
  벤츠: ['benz', 'Benz', 'mercedes', 'Mercedes', '메르세데스', '메르세데스벤츠', '메르세데스-벤츠'],
  아우디: ['audi', 'Audi'],
  폭스바겐: ['vw', 'VW', 'volkswagen', 'Volkswagen', '폭스바겐(VW)', '바겐'],
  포르쉐: ['porsche', 'Porsche', '포르셰'],
  재규어: ['jaguar', 'Jaguar'],
  랜드로버: ['landrover', 'Land Rover', 'land rover', '랜드로바', '레인지로버'],
};

/** 비교용 정규화 — 공백·가운뎃점·하이픈 제거 + 소문자. */
function normKey(s: string): string {
  return s.replace(/[\s·\-_]/g, '').toLowerCase();
}

const CANON_BY_KEY = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
  CANON_BY_KEY.set(normKey(canonical), canonical);
  for (const a of aliases) CANON_BY_KEY.set(normKey(a), canonical);
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
