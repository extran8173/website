// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 정적 사이트 (Cloudflare Workers 정적 자산 배포).
// ⚠️ site 변경 시 public/robots.txt 의 Sitemap URL 도 함께 교체할 것.
// 커스텀 도메인 연결 시 이 값을 그 도메인으로 교체.
export default defineConfig({
  site: 'https://website.nomadicom.workers.dev',
  output: 'static',
  integrations: [mdx(), sitemap()],
  build: {
    format: 'directory', // 트레일링 슬래시 URL (/services/) — 기획서 URL 규칙과 일치
  },
  trailingSlash: 'always',
});
