// 기본 OG 이미지 생성기 (1200×630) — public/og-default.jpg
//
//   node scripts/gen-og-image.mjs
//
// 실사 외관(IMG-001: 간판·정비 베이 3칸·실제 차량) 위에 하단 스크림을 얹고
// 로고와 2행 문안을 올린다. 문안에 상호가 없으므로 로고 병기는 필수다.
//
// 2026-08-16 개편: 구 버전은 단색 워드마크 카드였고, 이미지 안에
//   "원인을 진단하고, 과정을 사진으로 보여드립니다" 라는 약속형 카피가 박혀 있었다.
//   그 카피는 72ed4ac 에서 사이트 전역 제거된 것이라 이미지도 함께 교체했다.
// 포맷도 png → jpg: 사진 카드라 PNG 는 1.2MB 로 과하고, 카카오톡·네이버 호환도 jpeg 가 안전하다.
//   ⚠️ 파일명을 바꾸면 BaseLayout 의 ogImage 기본값과 [...slug].astro 의 RESERVED 도 같이 고칠 것.
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../public/og-default.jpg');
const photo = resolve(__dirname, '../src/assets/site/IMG-001.jpg');
const logoFile = resolve(__dirname, '../src/assets/logo-horizontal.png');

const W = 1200;
const H = 630;

// 1400×1050 원본에서 1.905:1 크롭(1400×735). 위쪽 150px 부터 잡아야 간판부터 베이 바닥까지 담긴다
const bg = await sharp(photo)
  .extract({ left: 0, top: 150, width: 1400, height: 735 })
  .resize(W, H)
  .modulate({ brightness: 1.2, saturation: 1.06 }) // 흐린 날 촬영 — 카톡 축소 표시를 고려해 올린다
  .toBuffer();

// 하단에서 올라오는 스크림 — 간판은 살리고 텍스트 영역만 어둡게
const scrim = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="#000" stop-opacity="0.88"/>
      <stop offset="42%"  stop-color="#000" stop-opacity="0.72"/>
      <stop offset="72%"  stop-color="#000" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
</svg>`);

// 한글은 Noto Sans KR 로 렌더한다(librsvg 는 시스템 폰트를 쓴다 — Pretendard 는 woff2 라 사용 불가).
// 카카오톡 썸네일은 축소 표시되므로 1행을 크게 잡는다.
const text = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="72" y="474" font-family="Noto Sans KR" font-size="78" font-weight="700"
        fill="#ffffff" letter-spacing="-2">동탄 수입차 전문 정비</text>
  <text x="72" y="542" font-family="Noto Sans KR" font-size="36" font-weight="400"
        fill="#d8d8dc" letter-spacing="-0.5">BMW · 벤츠 · 아우디 · 포르쉐</text>
</svg>`);

const logo = await sharp(logoFile).resize({ height: 58 }).toBuffer();

await sharp(bg)
  .composite([
    { input: scrim, top: 0, left: 0 },
    { input: logo, top: 300, left: 72 },
    { input: text, top: 0, left: 0 },
  ])
  .jpeg({ quality: 86, chromaSubsampling: '4:4:4' })
  .toFile(out);

const { width, height } = await sharp(out).metadata();
console.log(`wrote ${out} — ${width}x${height}, ${statSync(out).size.toLocaleString()} B`);
