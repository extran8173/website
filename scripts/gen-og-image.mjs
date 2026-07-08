// 기본 OG 이미지 생성기 (1200×630) — 브랜드 워드마크 카드.
// ⚠️ 사업장/작업 사진이 아니라 로고·문구로 구성된 디자인 자산(og:image 기본값).
//    페이지별 실제 사진 확보 시 해당 페이지는 그 사진을 og:image 로 지정 가능.
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../public/og-default.png');

const svg = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1d1d1f"/>
  <rect x="80" y="300" width="64" height="6" fill="#0066cc"/>
  <text x="80" y="250" fill="#ffffff" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="84" font-weight="700" letter-spacing="2">MOTOR REPAIR</text>
  <text x="80" y="360" fill="#f5f5f7" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="44" font-weight="600">동탄 수입차 전문 정비</text>
  <text x="80" y="424" fill="#cccccc" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="30" font-weight="400">원인을 진단하고, 과정을 사진으로 보여드립니다.</text>
  <text x="80" y="540" fill="#8a8a8f" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="26" font-weight="400">BMW · 벤츠 · 아우디 · 폭스바겐 · 미니 · 포르쉐</text>
</svg>`);

await sharp(svg).png().toFile(out);
console.log('wrote', out);
