/**
 * 대표 이미지 오버레이 검사 — 띠가 실제로 합성됐는지 픽셀로 확인한다
 *
 *   node .claude/skills/publish-case/check-overlay.mjs <slug> [--brand=BMW]
 *
 * "오버레이를 생성했다"는 로그는 증거가 아니다. 변환·복사 단계에서 조용히 원본이
 * 그대로 나가면 발행 후에야 발견된다(2026-08-31 실제로 의심 사례 발생).
 * 그래서 결과 파일 `images/thumb.webp` 를 직접 읽어 아래를 확인한다.
 *
 *   1. 하단 16% 가 어두운 띠다 — #111113 을 90% 로 얹으므로 어떤 사진 위에서도 어두워진다
 *   2. 띠 위쪽은 어둡지 않다 — 야간 사진이 통째로 어두운 경우를 오탐하지 않기 위해
 *   3. 띠 최상단에 브랜드 색 경계선이 있다 — 띠 색과 뚜렷이 구분되어야 한다
 *
 * 종료 코드 — 0: 통과 / 1: 오버레이 없음(또는 확인 실패)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BAND_RATIO = 0.16;
const DARK_MAX = 70; // 띠 내부로 인정할 채널 최대값
const SAMPLES = [0.15, 0.3, 0.5, 0.7, 0.85]; // 가로 샘플 위치(비율)

const toHex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

export async function checkOverlay(slug) {
  const file = path.resolve('src/content/cases', slug, 'images/thumb.webp');
  if (!fs.existsSync(file)) return { ok: false, reason: `thumb.webp 가 없습니다: ${file}` };

  const buf = fs.readFileSync(file);
  const meta = await sharp(buf).metadata();
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const bandTop = Math.round(info.height * (1 - BAND_RATIO));
  const insideY = bandTop + Math.round(info.height * BAND_RATIO * 0.55);
  const aboveY = Math.max(0, bandTop - Math.round(info.height * 0.06));

  const inside = SAMPLES.map((r) => px(Math.round(info.width * r), insideY));
  const above = SAMPLES.map((r) => px(Math.round(info.width * r), aboveY));

  // 1) 띠 내부가 어두운가 — 글자를 피하려 여러 지점을 보고 과반이 어두우면 인정한다
  const darkCount = inside.filter((p) => Math.max(...p) < DARK_MAX).length;
  const bandDark = darkCount >= 3;

  // 2) 띠 위가 통째로 어둡지는 않은가 (야간 사진 오탐 방지)
  const aboveDark = above.filter((p) => Math.max(...p) < DARK_MAX).length >= 4;

  // 3) 띠 최상단 경계선이 띠 색과 구분되는가
  const rule = px(Math.round(info.width * 0.5), bandTop + 1);
  const bandRef = inside.find((p) => Math.max(...p) < DARK_MAX) ?? inside[0];
  const ruleDiff = Math.max(...rule.map((v, i) => Math.abs(v - bandRef[i])));
  const hasRule = ruleDiff > 25;

  const ok = bandDark && hasRule && !aboveDark;
  return {
    ok,
    size: `${meta.width}×${meta.height}`,
    bandHeight: Math.round(info.height * BAND_RATIO),
    bandDark,
    aboveDark,
    hasRule,
    ruleColor: toHex(rule),
    bandColor: toHex(bandRef),
    reason: ok
      ? null
      : !bandDark
        ? '하단 16% 가 어둡지 않습니다 — 오버레이가 합성되지 않았을 수 있습니다'
        : aboveDark
          ? '이미지 전체가 어두워 띠를 구분할 수 없습니다 — 눈으로 확인하세요'
          : '띠 상단 브랜드 색 경계선을 찾지 못했습니다',
  };
}

// ── CLI ─────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('사용법: check-overlay.mjs <slug>');
    process.exit(1);
  }
  const r = await checkOverlay(slug);
  if (r.reason && !r.size) {
    console.error(`✗ ${r.reason}`);
    process.exit(1);
  }
  console.log(`[대표 이미지 오버레이 검사] ${slug}`);
  console.log(`  thumb.webp   ${r.size} · 띠 ${r.bandHeight}px`);
  console.log(`  ${r.bandDark ? '✓' : '✗'} 하단 띠      ${r.bandColor}`);
  console.log(`  ${r.hasRule ? '✓' : '✗'} 브랜드 경계선 ${r.ruleColor}`);
  console.log(`  ${!r.aboveDark ? '✓' : '⚠'} 띠 위 사진   ${r.aboveDark ? '전체가 어두움 — 눈으로 확인' : '정상'}`);
  console.log('');
  console.log(r.ok ? '오버레이 합성 확인' : `✗ ${r.reason}`);
  process.exit(r.ok ? 0 : 1);
}
