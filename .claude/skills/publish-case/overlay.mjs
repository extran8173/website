/**
 * 대표 이미지 오버레이 생성 — 설계문서 §7-2
 *
 *   node .claude/skills/publish-case/overlay.mjs \
 *     --src="<t_ 원본>" --out="<출력.jpg>" --brand="벤츠" \
 *     --line1="BENZ CLS63 AMG" --line2="주행소음 · 등속조인트 교환" \
 *     [--width=1600] [--plate=0.42,0.86,0.20,0.07] [--quality=92]
 *
 * 텍스트는 **글리프를 SVG 패스로 변환**해 합성한다. sharp 에는 텍스트 API 가 없고,
 * SVG 경유 렌더링은 OS 에 설치된 폰트만 쓴다 — 실측 결과 지정한 폰트가 없으면
 * 오류 없이 조용히 다른 폰트로 대체됐다. 패스 변환은 그 실패 자체를 없앤다.
 *
 * --plate 는 번호판을 덮을 사각형이며 이미지 대비 비율(0~1)로 준다. 자동 탐지는 하지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import opentype from 'opentype.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(HERE, '../../../assets/fonts');

// 정적 인스턴스가 필요하다. Variable 폰트 한 개로는 opentype.js 가 굵기를 나눠 쓰지 못해
// 세 줄이 모두 같은 굵기로 나온다.
const FONT_FILES = {
  bold: ['Pretendard-Bold.otf', 'Pretendard-Bold.ttf'],
  semibold: ['Pretendard-SemiBold.otf', 'Pretendard-SemiBold.ttf'],
  medium: ['Pretendard-Medium.otf', 'Pretendard-Medium.ttf'],
};

// 이미지 내부 색이다 — 사이트 UI 색(단일 블루 #0066cc)과 무관하다.
// 설계문서 §7-3. 목록에서의 구분력을 브랜드 공식색보다 우선한 값.
const BRAND_COLORS = {
  BMW: '#007AC9',
  MINI: '#E30613',
  벤츠: '#E8EAED',
  아우디: '#FF6B35',
  폭스바겐: '#00B4A6',
  포르쉐: '#C8A159',
  재규어: '#4A8F74',
  랜드로버: '#4A8F74',
};
const BRAND_COLOR_FALLBACK = '#8C9096';

const BAND_RATIO = 0.16; // 띠 높이 = 이미지 높이의 16%
const BAND_FILL = '#111113';
const BAND_OPACITY = 0.9;
const RULE_HEIGHT = 4; // 상단 경계선 (기준 폭 1200 기준)
const PLATE_FILL = '#1A1A1C';
const PLATE_RADIUS = 6;
const BASE_WIDTH = 1200; // 아래 px 수치들의 기준 폭. 실제 폭에 비례해 스케일한다.

function loadFont(kind) {
  for (const name of FONT_FILES[kind]) {
    const p = path.join(FONT_DIR, name);
    // opentype.js 2.x — loadSync 는 deprecated. 버퍼를 직접 파싱한다.
    if (fs.existsSync(p)) return opentype.parse(fs.readFileSync(p).buffer);
  }
  const tried = FONT_FILES[kind].map((n) => path.join('assets/fonts', n)).join(' 또는 ');
  throw new Error(
    `폰트를 찾을 수 없습니다: ${tried}\n` +
      `  Pretendard 정적 인스턴스(Bold·SemiBold·Medium)를 assets/fonts/ 에 넣어주세요.\n` +
      `  Variable 폰트 한 개로는 굵기가 구분되지 않습니다.`
  );
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 글자를 SVG 패스로. 폰트에 없는 글자는 .notdef 가 되므로 미리 걸러 보고한다. */
function textPath(font, text, x, y, size, fill) {
  const missing = [...text].filter((ch) => ch.trim() && font.charToGlyphIndex(ch) === 0);
  const d = font.getPath(text, x, y, size).toPathData(2);
  return { svg: `<path d="${d}" fill="${fill}"/>`, missing };
}

function roundedRect(x, y, w, h, r, fill) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/>`;
}

export async function renderOverlay({
  src,
  out,
  brand,
  line1,
  line2,
  width = 1600,
  quality = 92,
  plate = null,
}) {
  const base = sharp(src).rotate();
  const meta = await base.metadata();
  const swap = meta.orientation >= 5 && meta.orientation <= 8;
  const srcW = swap ? meta.height : meta.width;
  const srcH = swap ? meta.width : meta.height;

  const W = Math.min(width, srcW); // 업스케일 금지
  const H = Math.round((srcH * W) / srcW);
  const k = W / BASE_WIDTH; // 기준 폭 대비 스케일

  const bandH = Math.round(H * BAND_RATIO);
  const bandTop = H - bandH;
  const marginX = Math.round(50 * k);
  const rule = Math.max(2, Math.round(RULE_HEIGHT * k));

  const fonts = { bold: loadFont('bold'), semibold: loadFont('semibold'), medium: loadFont('medium') };
  const size1 = 44 * k;
  const size2 = 30 * k;
  const sizeMark = 25 * k;

  const t1 = textPath(fonts.bold, String(line1).toUpperCase(), marginX, bandTop + bandH * 0.52, size1, '#FFFFFF');
  const t2 = textPath(fonts.medium, line2, marginX, bandTop + bandH * 0.85, size2, '#C4C6CA');

  const markText = 'MOTOR REPAIR';
  const markW = fonts.semibold.getAdvanceWidth(markText, sizeMark);
  const tm = textPath(fonts.semibold, markText, W - marginX - markW, bandTop + bandH * 0.62, sizeMark, '#787A80');

  const color = BRAND_COLORS[brand] ?? BRAND_COLOR_FALLBACK;

  const plateRect = plate
    ? roundedRect(
        Math.round(plate.x * W),
        Math.round(plate.y * H),
        Math.round(plate.w * W),
        Math.round(plate.h * H),
        Math.round(PLATE_RADIUS * k),
        PLATE_FILL
      )
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
${plateRect}
<rect x="0" y="${bandTop}" width="${W}" height="${bandH}" fill="${BAND_FILL}" fill-opacity="${BAND_OPACITY}"/>
<rect x="0" y="${bandTop}" width="${W}" height="${rule}" fill="${color}"/>
${t1.svg}
${t2.svg}
${tm.svg}
</svg>`;

  await base
    .resize({ width: W })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality })
    .toFile(out);

  const missing = [...new Set([...t1.missing, ...t2.missing, ...tm.missing])];
  return { width: W, height: H, bandH, color, missing, plateMasked: !!plate };
}

// ── CLI ─────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const val = (n) => {
    const hit = args.find((a) => a.startsWith(`${n}=`));
    return hit ? hit.slice(n.length + 1).replace(/^["']|["']$/g, '') : null;
  };
  const src = val('--src');
  const out = val('--out');
  if (!src || !out) {
    console.error('사용법: overlay.mjs --src=<원본> --out=<출력.jpg> --brand=<정본> --line1=<영문> --line2=<설명> [--width=1600] [--plate=x,y,w,h]');
    process.exit(1);
  }
  const p = val('--plate');
  const plate = p ? (([x, y, w, h]) => ({ x: +x, y: +y, w: +w, h: +h }))(p.split(',')) : null;

  const r = await renderOverlay({
    src,
    out,
    brand: val('--brand') ?? '',
    line1: val('--line1') ?? '',
    line2: val('--line2') ?? '',
    width: Number(val('--width') ?? 1600),
    quality: Number(val('--quality') ?? 92),
    plate,
  });
  console.log(`오버레이 생성 → ${out}`);
  console.log(`  ${r.width}×${r.height} · 띠 ${r.bandH}px · 브랜드 색 ${r.color}${r.plateMasked ? ' · 번호판 마스킹 적용' : ''}`);
  if (r.missing.length) console.log(`  ※ 폰트에 없는 글자: ${r.missing.join(' ')} — 빈 칸으로 나갑니다`);
}
