/**
 * 오버레이 배치 검사 — 띠가 "있어야 할 곳에 있고, 없어야 할 곳에 없는지" 픽셀로 확인한다
 *
 *   node .claude/skills/publish-case/check-overlay.mjs <slug> --overlay=03
 *   node .claude/skills/publish-case/check-overlay.mjs <slug> --overlay=none
 *
 * 2026-08-31 규칙 변경으로 오버레이 대상이 바뀌었다.
 *   본문 정면 컷 (첫 한 장)  → 번호판 마스킹 후 오버레이 **있어야 한다**
 *   thumb.webp (t_ 원본)     → 텍스트 없이 원본 그대로. 오버레이 **없어야 한다**
 *
 * "생성했다"는 로그는 증거가 아니다. 변환·복사 단계에서 조용히 원본이 그대로 나가거나
 * 엉뚱한 파일에 얹히면 발행 후에야 발견된다. 그래서 결과 파일을 직접 읽는다.
 *
 * 종료 코드 — 0: 통과 / 1: 배치가 규칙과 다름
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BAND_RATIO = 0.16;
const DARK_MAX = 70; // 띠 내부로 인정할 채널 최대값
const SAMPLES = [0.15, 0.3, 0.5, 0.7, 0.85]; // 가로 샘플 위치(비율)

const toHex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/**
 * 이미지 하단에 오버레이 띠가 있는지 판정한다.
 *  - 띠 내부: #111113 을 90% 로 얹으므로 어떤 사진 위에서도 어두워진다
 *  - 띠 상단: 브랜드 색 4px 경계선이 띠 색과 뚜렷이 구분된다
 *  - 띠 위: 통째로 어두우면(야간 사진) 판정을 신뢰할 수 없어 별도로 표시한다
 */
export async function hasBand(file) {
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

  // 띠 안 글자(흰색)를 피하려 여러 지점을 보고 과반으로 판정한다
  const bandDark = inside.filter((p) => Math.max(...p) < DARK_MAX).length >= 3;
  const aboveDark = above.filter((p) => Math.max(...p) < DARK_MAX).length >= 4;

  // 결정적 단서는 경계선이다. 오버레이는 브랜드 색 4px 선이 폭 전체에 균일하게 깔린다.
  // 어두운 하부·엔진룸 사진은 하단이 어둡기만 할 뿐 이런 선이 없다 — 이걸로 오탐을 걷어낸다.
  const ruleRow = SAMPLES.map((r) => px(Math.round(info.width * r), bandTop + 1));
  const ruleSpread = Math.max(
    ...[0, 1, 2].map((c) => Math.max(...ruleRow.map((p) => p[c])) - Math.min(...ruleRow.map((p) => p[c])))
  );
  const ruleUniform = ruleSpread < 20;

  const bandRef = inside.find((p) => Math.max(...p) < DARK_MAX) ?? inside[0];
  const rule = ruleRow[2];
  const ruleDistinct = Math.max(...rule.map((v, i) => Math.abs(v - bandRef[i]))) > 25;

  return {
    band: bandDark && ruleUniform && ruleDistinct,
    size: `${meta.width}×${meta.height}`,
    bandColor: toHex(bandRef),
    ruleColor: toHex(rule),
    ruleSpread,
    ambiguous: aboveDark, // 사진 전체가 어두워 판정을 신뢰하기 어렵다
  };
}

export async function checkOverlayPlacement(slug, overlayNo) {
  const dir = path.resolve('src/content/cases', slug, 'images');
  const rows = [];

  // 1) thumb.webp — 오버레이가 **없어야** 한다
  const thumb = path.join(dir, 'thumb.webp');
  if (!fs.existsSync(thumb)) {
    rows.push({ ok: false, label: 'thumb.webp', detail: '파일이 없습니다' });
  } else {
    const r = await hasBand(thumb);
    rows.push({
      ok: !r.band,
      label: 'thumb.webp',
      detail: `${r.size} · ${r.band ? `띠 있음 ${r.bandColor}` : '띠 없음'}`,
      note: r.band ? '대표 이미지에는 오버레이를 넣지 않습니다 (2026-08-31 규칙)' : null,
    });
  }

  // 2) 본문 정면 컷 — 오버레이가 **있어야** 한다
  if (overlayNo === 'none') {
    rows.push({ ok: true, label: '본문 오버레이', detail: '정면 컷 없음 — 오버레이 생략', note: '결과 보고에 표시할 것' });
  } else {
    const file = path.join(dir, `${overlayNo}.webp`);
    if (!fs.existsSync(file)) {
      rows.push({ ok: false, label: `${overlayNo}.webp`, detail: '파일이 없습니다' });
    } else {
      const r = await hasBand(file);
      rows.push({
        ok: r.band,
        label: `${overlayNo}.webp`,
        detail: `${r.size} · ${r.band ? `띠 있음 ${r.ruleColor}` : '띠 없음'}`,
        note: !r.band
          ? '정면 컷에 오버레이가 합성되지 않았습니다'
          : r.ambiguous
            ? '사진 전체가 어두워 판정이 불확실합니다 — 눈으로 확인하세요'
            : null,
      });
    }
  }

  // 3) 나머지 본문 컷에는 띠가 없어야 한다 (같은 문구가 여러 장에 반복되면 안 된다)
  const others = fs
    .readdirSync(dir)
    .filter((f) => /^\d{2}\.webp$/.test(f) && f.slice(0, 2) !== overlayNo)
    .sort();
  const extra = [];
  for (const f of others) {
    const r = await hasBand(path.join(dir, f));
    if (r.band) extra.push(f);
  }
  rows.push({
    ok: extra.length === 0,
    label: '중복 오버레이',
    detail: extra.length === 0 ? `없음 (본문 ${others.length}장 확인)` : extra.join(', '),
    note: extra.length ? '오버레이는 정면 컷 한 장에만 넣습니다' : null,
  });

  return rows;
}

// ── CLI ─────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const hit = args.find((a) => a.startsWith('--overlay='));
  const overlayNo = hit ? hit.slice('--overlay='.length) : null;

  if (!slug || !overlayNo) {
    console.error('사용법: check-overlay.mjs <slug> --overlay=NN   (정면 컷이 없으면 --overlay=none)');
    process.exit(1);
  }

  const rows = await checkOverlayPlacement(slug, overlayNo);
  console.log(`[오버레이 배치 검사] ${slug}`);
  for (const r of rows) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.label.padEnd(14)} ${r.detail}`);
    if (r.note) console.log(`      → ${r.note}`);
  }
  const bad = rows.filter((r) => !r.ok).length;
  console.log('');
  console.log(bad === 0 ? '오버레이 배치 확인' : `✗ ${bad}건이 규칙과 다릅니다`);
  process.exit(bad === 0 ? 0 : 1);
}
