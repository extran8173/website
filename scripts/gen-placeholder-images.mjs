// 파이프라인 검증용 placeholder 이미지 생성기.
// ⚠️ 실제 정비 사진이 아니다 — 빌드 검증 목적의 단색 라벨 이미지. publish-case 로 실제 .webp 교체 예정.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../src/content/cases/benz-e400-air-suspension/images');
mkdirSync(outDir, { recursive: true });

const W = 1200;
const H = 800;

function labelSvg(text) {
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${W}" height="${H}" fill="#2a2a2c"/>
       <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="12 10"/>
       <text x="50%" y="46%" fill="#f5f5f7" font-family="sans-serif" font-size="52" font-weight="700" text-anchor="middle">SAMPLE · 파이프라인 검증용</text>
       <text x="50%" y="56%" fill="#9a9a9f" font-family="sans-serif" font-size="30" text-anchor="middle">${text}</text>
       <text x="50%" y="64%" fill="#9a9a9f" font-family="sans-serif" font-size="26" text-anchor="middle">실제 정비 사진으로 교체 예정</text>
     </svg>`
  );
}

const targets = [
  { file: 'thumb.webp', label: '벤츠 E400 · 대표 썸네일' },
  { file: '01.webp', label: '벤츠 E400 · 전하체 처짐' },
  { file: '02.webp', label: '벤츠 E400 · 누설테스트' },
];

for (const t of targets) {
  await sharp(labelSvg(t.label)).webp({ quality: 80 }).toFile(resolve(outDir, t.file));
  console.log('wrote', t.file);
}
console.log('done');
