/**
 * /rss.xml — 정비 사례 피드 (RSS 2.0)
 *
 * 주 1회 새 사례가 올라오는 사이트라 피드를 둔다. 피드는 검색엔진·AI 크롤러·구독 도구가
 * 신규 글을 발견하는 표준 경로이고, sitemap 과 달리 "무엇이 새로 나왔는지"를 본문 요약과 함께
 * 전달한다. llms.txt(사이트 전체 요약)와 짝이 되는 자산이다.
 *
 * @astrojs/rss 패키지를 쓰지 않는 이유: 의존성을 하나 늘릴 만큼의 일이 아니다.
 * 이 파일이 하는 일은 XML 이스케이프와 RFC-822 날짜 변환 둘뿐이다.
 *
 * 규칙
 *  - 사업체 값은 business.ts 에서만 가져온다.
 *  - URL 은 astro.config.mjs 의 site 에서 파생한다. 도메인을 여기 적지 않는다.
 *  - 최신 20건만 싣는다(피드 관례). 전체 목록은 sitemap 과 llms.txt 가 맡는다.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { business } from '../data/business.ts';

export const prerender = true;

/** 피드에 싣는 최신 글 수. 전체를 싣지 않는 이유는 피드가 '변경 알림'이지 아카이브가 아니기 때문이다. */
const FEED_ITEM_COUNT = 20;

/** XML 특수문자 이스케이프. 제목·설명에 &, <, 따옴표가 실제로 들어 있다(예: "타이밍벨트 & 워터펌프"). */
function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC-822 (RSS pubDate 규격). toUTCString() 이 그대로 규격에 맞는다. */
const rfc822 = (d: Date) => d.toUTCString();

export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(path, site).href;

  // 정렬: date 내림차순 + slug 코드유닛 오름차순.
  // ⚠️ localeCompare 금지 — 로케일 의존이라 한글/ASCII 슬러그 선후가 로컬과 CI 에서 갈린다.
  //    date 가 같은 글이 여럿 있어(실측 10개 날짜에 2~3건씩) tiebreaker 없이는 빌드마다 순서가 바뀐다.
  const bySlug = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const items = (await getCollection('cases'))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || bySlug(a.data.slug, b.data.slug))
    .slice(0, FEED_ITEM_COUNT);

  // lastBuildDate 에 빌드 시각을 넣지 않는다 — 내용이 그대로여도 매 빌드 값이 바뀌어
  // 구독자에게 갱신된 것처럼 보인다. 가장 최근 글의 발행일을 쓴다.
  const latest = items[0]?.data.date ?? new Date(0);

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(`${business.name} 정비 사례`)}</title>`,
    `    <link>${abs('/cases/')}</link>`,
    `    <description>${xml(
      `${business.seoRegions.join('·')} 수입차 전문 정비소 ${business.name}의 정비 기록. 차종·증상·원인·수리 과정과 결과를 사진과 함께 남깁니다.`,
    )}</description>`,
    '    <language>ko</language>',
    `    <lastBuildDate>${rfc822(latest)}</lastBuildDate>`,
    `    <atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml" />`,
    ...items.flatMap((c) => [
      '    <item>',
      `      <title>${xml(c.data.title)}</title>`,
      `      <link>${abs(`/${c.data.slug}/`)}</link>`,
      // guid 는 URL 을 그대로 쓴다. 슬러그는 워드프레스 원본을 보존하므로 바뀌지 않는다.
      `      <guid isPermaLink="true">${abs(`/${c.data.slug}/`)}</guid>`,
      `      <pubDate>${rfc822(c.data.date)}</pubDate>`,
      `      <description>${xml(c.data.description)}</description>`,
      `      <category>${xml(c.data.brand)}</category>`,
      '    </item>',
    ]),
    '  </channel>',
    '</rss>',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
