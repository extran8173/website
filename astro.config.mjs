// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

// ── 사이트맵 lastmod ────────────────────────────────────
// 주 1회 새 글이 올라가므로 크롤러가 신규·수정 페이지를 먼저 보게 한다.
//  - 정비 사례: 프론트매터 date (실제 작업·발행일)
//  - 고정 페이지: 페이지 파일의 export const LASTMOD (없으면 생략 — 틀린 값보다 없는 편이 낫다)
//  - 목록·페이지네이션(/cases/2/, /cases/bmw/2/): lastmod 없음 — 새 글마다 바뀌어 신호가 흐려진다

/** 사례 slug → date. astro:content 를 쓸 수 없는 위치라 프론트매터를 직접 읽는다. */
function readCaseDates() {
  const base = 'src/content/cases';
  const map = new Map();
  if (!fs.existsSync(base)) return map;
  for (const dir of fs.readdirSync(base)) {
    const file = path.join(base, dir, 'index.mdx');
    if (!fs.existsSync(file)) continue;
    const fm = fs.readFileSync(file, 'utf8').split('---')[1] ?? '';
    const slug = fm.match(/^slug:\s*"?(.*?)"?\s*$/m)?.[1];
    const date = fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (slug && date) map.set(slug, date);
  }
  return map;
}

/** 고정 페이지 경로 세그먼트 → 소스 파일 */
const STATIC_PAGE_SOURCES = {
  '': 'src/pages/index.astro',
  services: 'src/pages/services.astro',
  equipment: 'src/pages/equipment.astro',
  location: 'src/pages/location.astro',
  cases: 'src/pages/cases/[...page].astro',
  'dongtan-import-car-specialty-motor-repair-introduction':
    'src/pages/dongtan-import-car-specialty-motor-repair-introduction.astro',
};

const CASE_DATES = readCaseDates();

/**
 * 고정 페이지의 최종 수정일 — 페이지 파일에 적힌 `export const LASTMOD` 를 읽는다.
 *
 * git 커밋 시각을 쓰지 않는 이유: Cloudflare Workers Builds 는 shallow clone(--depth=1)
 * 이라 이력에 커밋이 하나뿐이고, 그 커밋이 루트 커밋처럼 취급돼 모든 파일이 거기서 처음
 * 추가된 것으로 보인다. 그래서 `git log -1 -- <파일>` 이 어떤 파일을 물어도 tip 커밋을
 * 돌려주고, 고정 페이지 전부가 "마지막 배포 커밋 시각"으로 같아진다(실측 확인).
 * 파일 mtime 도 매번 새로 clone 하므로 빌드 시각이 되어 같은 문제를 낳는다.
 *
 * 값이 없으면 lastmod 를 생략한다 — 매 빌드마다 바뀌는 틀린 값보다 없는 편이 낫다.
 */
function lastModifiedOf(file) {
  try {
    const m = fs.readFileSync(file, 'utf8').match(/export const LASTMOD\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/);
    return m ? new Date(`${m[1]}T00:00:00Z`).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

// 정적 사이트 (Cloudflare Workers 정적 자산 배포).
// ⚠️ site 변경 시 public/robots.txt 의 Sitemap URL 도 함께 교체할 것.
// 커스텀 도메인 연결 시 이 값을 그 도메인으로 교체.
export default defineConfig({
  site: 'https://motorrepair.co.kr',
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        // ⚠️ undefined 를 돌려주면 URL 자체가 사이트맵에서 빠진다. lastmod 만 생략할 때는 item 을 그대로 돌려준다.
        const seg = decodeURIComponent(new URL(item.url).pathname).replace(/^\/|\/$/g, '');

        // 목록·페이지네이션 — lastmod 없이 URL 만 남긴다
        if (/^cases(\/|$)/.test(seg) && seg !== 'cases') return item;

        const caseDate = CASE_DATES.get(seg);
        if (caseDate) {
          item.lastmod = new Date(`${caseDate}T00:00:00Z`).toISOString();
          return item;
        }

        const src = STATIC_PAGE_SOURCES[seg];
        if (src) {
          const m = lastModifiedOf(src);
          if (m) item.lastmod = m;
        }
        return item;
      },
    }),
  ],
  build: {
    format: 'directory', // 트레일링 슬래시 URL (/services/) — 기획서 URL 규칙과 일치
  },
  trailingSlash: 'always',
});
