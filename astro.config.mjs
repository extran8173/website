// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// ── 사이트맵 lastmod ────────────────────────────────────
// 주 1회 새 글이 올라가므로 크롤러가 신규·수정 페이지를 먼저 보게 한다.
//  - 정비 사례: 프론트매터 date (실제 작업·발행일)
//  - 고정 페이지: 소스 파일의 git 커밋 시각 (읽을 수 없으면 생략 — 틀린 값보다 없는 편이 낫다)
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
 * 고정 페이지의 최종 수정 시각 — git 커밋 시각만 쓴다.
 *
 * 파일 mtime 으로 폴백하지 않는다. Cloudflare Workers Builds 는 매번 새로 clone 하므로
 * mtime 이 곧 빌드 시각이 되고, 그러면 빌드할 때마다 lastmod 가 갱신돼 "언제 실제로
 * 바뀌었나" 신호가 사라진다. 크롤러가 "이 페이지는 늘 바뀐다"고 학습하면 lastmod 자체를
 * 무시하게 되므로, 틀린 값을 넣느니 비우는 편이 낫다(목록 페이지와 같은 취급).
 *
 * shallow clone(--depth=1) 이면 이력을 못 읽어 undefined 가 되고 lastmod 가 생략된다.
 * 고정 페이지에도 값을 넣고 싶으면 빌드 명령을 `git fetch --unshallow || true; npm run build`
 * 로 바꾼다. 정비 사례는 프론트매터 date 를 쓰므로 이 문제와 무관하다.
 */
function lastModifiedOf(file) {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return iso ? new Date(iso).toISOString() : undefined;
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
