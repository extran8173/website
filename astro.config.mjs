// @ts-check
import { defineConfig } from 'astro/config';

// 정적 사이트 (Cloudflare Pages 자동 배포). site 는 최종 도메인 확정 시 교체.
export default defineConfig({
  site: 'https://motorrepair.pages.dev',
  output: 'static',
  build: {
    format: 'directory', // 트레일링 슬래시 URL (/services/) — 기획서 URL 규칙과 일치
  },
  trailingSlash: 'always',
});
