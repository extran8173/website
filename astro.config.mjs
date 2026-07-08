// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 정적 사이트 (Cloudflare Pages 자동 배포). site 는 최종 도메인 확정 시 교체.
// ⚠️ site 변경 시 public/robots.txt 의 Sitemap URL 도 함께 교체할 것.
export default defineConfig({
  site: 'https://motorrepair.pages.dev',
  output: 'static',
  integrations: [mdx(), sitemap()],
  build: {
    format: 'directory', // 트레일링 슬래시 URL (/services/) — 기획서 URL 규칙과 일치
  },
  trailingSlash: 'always',
});
