/**
 * /llms.txt — AI 검색(ChatGPT·Claude·Perplexity 등)용 사이트 요약. 형식: llmstxt.org
 *
 * 빌드 시 자동 생성한다. public/ 에 정적 파일로 두지 않는 이유는 주 1회 올라오는
 * 정비 사례가 손을 대지 않아도 목록에 반영되어야 하기 때문이다.
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

  // 정비 사례 — 최신순 단일 목록. 브랜드로 나누지 않는다(제목에 차종이 들어 있다).
  // draft 개념은 이 프로젝트에 없다 — 컬렉션에 있는 글이 곧 발행된 글이다.
  // 나중에 draft 를 도입하면 content.config.ts 스키마와 함께 여기에도 필터를 넣을 것.
  // 정렬은 date 내림차순 + slug 오름차순. slug 를 tiebreaker 로 두는 이유는 date 가 같은 글이
  // 여럿 있고(실측 10개 날짜에 중복), getCollection 의 반환 순서가 빌드 환경마다 달라
  // 그것만으로는 같은 소스에서 매번 다른 파일이 나오기 때문이다.
  const cases = (await getCollection('cases')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.data.slug.localeCompare(b.data.slug),
  );

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
    '## 정비사례',
    '',
    // URL 은 워드프레스 원본 슬러그를 그대로 쓰는 루트 경로(/slug/)다. /cases/ 하위가 아니다.
    ...cases.map((c) => `- [${oneLine(c.data.title)}](${abs(`/${c.data.slug}/`)}): ${oneLine(c.data.description)}`),
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
