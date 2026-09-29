/**
 * /llms.txt — AI 검색(ChatGPT·Claude·Perplexity 등)용 사이트 요약. 형식: llmstxt.org
 *
 * 빌드 시 자동 생성한다. public/ 에 정적 파일로 두지 않는 이유는 페이지 제목·설명과
 * 사업체 값이 원본에서 바뀌면 이 파일도 따라 바뀌어야 하기 때문이다.
 *
 * 규칙
 *  - 사업체 값은 전부 business.ts 에서 가져온다. 이 파일에 사실 정보를 새로 적지 않는다.
 *  - 지역은 seoRegions(A계열)만 쓴다. accessRegions 는 쓰지 않는다.
 *  - 평점·리뷰 수·과장 표현을 넣지 않는다.
 *  - 정적 페이지의 제목·설명은 각 페이지가 export 한 값을 import 한다 — 카피를 여기에 복사하지 않는다.
 *  - llms-full.txt(본문 전체판)는 만들지 않는다.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { business } from '../data/business.ts';

// 정적 페이지 6종의 제목·설명 — 각 페이지 frontmatter 의 export 를 그대로 가져온다.
import { title as homeTitle, description as homeDesc } from './index.astro';
import { title as servicesTitle, description as servicesDesc } from './services.astro';
import { title as casesTitle, description as casesDesc } from './cases/[...page].astro';
import { title as equipmentTitle, description as equipmentDesc } from './equipment.astro';
import { title as aboutTitle, description as aboutDesc } from './dongtan-import-car-specialty-motor-repair-introduction.astro';
import { title as locationTitle, description as locationDesc } from './location.astro';

export const prerender = true;

/**
 * 대표 정비 사례 — 주력 6개 브랜드 × 2건. 이 순서 그대로 출력한다.
 *
 * 전체 77건을 다 싣지 않는 이유: 목록이 길어질수록 AI 가 사이트의 성격을 파악하는 데
 * 드는 비용만 늘고 브랜드 커버리지는 오히려 묻힌다. 전체는 /cases/ 링크로 넘긴다.
 *
 * ⚠️ 슬러그만 적는다 — 제목은 컬렉션에서 가져오므로 글 제목을 고치면 여기도 따라 바뀐다.
 *    슬러그가 목록에 없으면 빌드를 실패시킨다(아래 참조). 조용히 빠지는 편보다 낫다.
 * 교체 방법: 아래 배열의 슬러그만 바꾼다. 새 사례를 대표로 올리려면 같은 브랜드의
 *    기존 항목과 맞바꿔 브랜드당 2건 구성을 유지한다.
 */
const FEATURED_CASE_SLUGS = [
  'bmw-640d-엔진경고등',
  'bmw-320d-engine-overheat-boost-pressure-drop',
  'benz-cls63-주행소음',
  'dongtan-mercedes-s500-trunk-actuator-repair',
  '용인-동탄-아우디-a6-에어컨-버튼-점멸-g395',
  'dongtan-audi-q5-35tdi-timingbelt-waterpump',
  'volkswagen-arteon-starter-motor-fault-repair',
  '동탄-티구안-터보금속음-가속저하-정비',
  'mini-cooper-d-engine-light-dpf-intake-repair',
  '동탄-미니쿠퍼-엔진오일-리어브레이크-냉각수-정비',
  'porsche-panamera-coolant-leak-pdk-transmission-fluid',
  '동탄-포르쉐-박스터s-981-백연-냉각수소모-헤드가스켓-정',
] as const;

/** 링크 목록 한 줄에 넣을 텍스트 정리 — 줄바꿈 제거 + 마크다운 대괄호 이스케이프. */
function oneLine(s: string): string {
  return s.replace(/\s*\r?\n\s*/g, ' ').replace(/([[\]])/g, '\\$1').trim();
}

export const GET: APIRoute = async ({ site }) => {
  // site 는 astro.config.mjs 의 단일 소스. 여기서 도메인을 다시 적지 않는다.
  const abs = (path: string) => new URL(path, site).href;

  const pages: { title: string; path: string; description: string }[] = [
    { title: homeTitle, path: '/', description: homeDesc },
    { title: servicesTitle, path: '/services/', description: servicesDesc },
    { title: casesTitle, path: '/cases/', description: casesDesc },
    { title: equipmentTitle, path: '/equipment/', description: equipmentDesc },
    { title: aboutTitle, path: '/dongtan-import-car-specialty-motor-repair-introduction/', description: aboutDesc },
    { title: locationTitle, path: '/location/', description: locationDesc },
  ];

  // 정비 사례 — 대표 12건만 싣는다. 전체는 /cases/ 링크로 넘긴다.
  // 출력 순서는 FEATURED_CASE_SLUGS 배열 순서 그대로다(날짜순 아님) — 브랜드가 고르게 보이게
  // 짠 순서이고, 배열이 곧 단일 소스라 빌드 환경에 따라 순서가 흔들릴 여지가 없다.
  // draft 개념은 이 프로젝트에 없다 — 컬렉션에 있는 글이 곧 발행된 글이다.
  const bySlug = new Map((await getCollection('cases')).map((c) => [c.data.slug, c]));
  const featured = FEATURED_CASE_SLUGS.map((slug) => {
    const entry = bySlug.get(slug);
    // 슬러그가 바뀌거나 글이 사라지면 빌드를 실패시킨다. 링크가 조용히 404 가 되는 것보다 낫다.
    if (!entry) throw new Error(`[llms.txt] 대표 사례 슬러그를 찾을 수 없습니다: "${slug}"`);
    return entry;
  });

  const lines = [
    `# ${business.name} (MOTOR REPAIR)`,
    '',
    '> 모터리페어는 경기도 화성시 동탄에서 BMW·벤츠·아우디·폭스바겐·미니·포르쉐를 정비하는 수입차 전문 정비소입니다. ISTA+·Xentry·ODIS·PIWIS 등 브랜드 전용 진단기와 Picoscope로 고장 원인을 진단하고, 작업 과정을 사진으로 기록해 공유합니다.',
    '',
    `- 상호: ${business.name} / ${business.alternateName}`,
    `- 주소: ${business.address.full}`,
    `- 전화: ${business.phone.display}`,
    `- 영업시간: ${business.hours.weekday.days} ${business.hours.weekday.opens}–${business.hours.weekday.closes}, ${business.hours.saturday.days} ${business.hours.saturday.opens}–${business.hours.saturday.closes}, 일요일 휴무`,
    `- 서비스 지역: ${business.seoRegions.join(' · ')}`,
    `- 대표 경력: ${business.careerYears}년 이상`,
    `- 인증: ${business.certifications.join(' · ')}`,
    `- 수리 후 보증(A/S): 차량 제작사 부품 기준과 동일 (${business.warranty.period} / ${business.warranty.distance})`,
    '- 가격: 작업 전 견적 안내',
    '- 예약: 전화 또는 네이버 예약',
    '',
    '## 주요 페이지',
    '',
    ...pages.map((p) => `- [${oneLine(p.title)}](${abs(p.path)}): ${oneLine(p.description)}`),
    '',
    '## 대표 정비사례',
    '',
    // URL 은 워드프레스 원본 슬러그를 그대로 쓰는 루트 경로(/slug/)다. /cases/ 하위가 아니다.
    // 설명은 붙이지 않는다 — 제목에 차종·증상·작업이 이미 들어 있다.
    ...featured.map((c) => `- [${oneLine(c.data.title)}](${abs(`/${c.data.slug}/`)})`),
    `- [전체 정비사례 목록](${abs('/cases/')}): 차종·증상·원인·수리·결과를 사진과 함께 기록한 전체 사례`,
    '',
    '## Optional',
    '',
    `- [네이버 블로그 정비 기록](${business.booking.naverBlogUrl}): 정비 작업 기록 원문`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
