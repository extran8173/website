/**
 * 정비 사례 raw 사진 → images/NN.webp 정리 (publish-case 스킬 2단계 전용)
 *
 *   node .claude/skills/publish-case/prepare-images.mjs <slug> [--thumb=N] [--dry]
 *
 * 하는 일: EXIF 촬영시각 오름차순 정렬(= 공정 순서) → 가로 2000px 상한 → EXIF 제거 → WebP q80
 *          → src/content/cases/<slug>/images/01.webp … NN.webp + thumb.webp
 * 반응형 변환은 하지 않는다 — astro:assets 가 빌드 때 생성한다.
 *
 * 출력 말미의 MANIFEST(JSON)는 스킬이 alt·caption 을 붙일 때 쓰는 목록이다.
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const MAX_WIDTH = 2000;
const THUMB_WIDTH = 1600;
const QUALITY = 80;
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff']);

// ── EXIF DateTimeOriginal 추출 ──────────────────────────
// sharp 는 EXIF 를 원시 버퍼로만 준다. 필요한 건 태그 하나뿐이라 최소 파서를 둔다.
export function exifCaptureTime(buf) {
  if (!buf || buf.length < 8) return null;
  // "Exif\0\0" 접두어가 있으면 건너뛴다
  const base = buf.slice(0, 4).toString('latin1') === 'Exif' ? 6 : 0;
  const order = buf.slice(base, base + 2).toString('latin1');
  if (order !== 'II' && order !== 'MM') return null;
  const LE = order === 'II';
  const u16 = (o) => (LE ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (LE ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const ascii = (o, n) => buf.slice(o, o + n).toString('latin1').replace(/\0.*$/, '').trim();

  // IFD 를 훑어 원하는 태그의 값 위치를 돌려준다
  function find(ifdOffset, tags) {
    if (ifdOffset <= 0 || base + ifdOffset + 2 > buf.length) return null;
    const count = u16(base + ifdOffset);
    for (let i = 0; i < count; i++) {
      const e = base + ifdOffset + 2 + i * 12;
      if (e + 12 > buf.length) break;
      const tag = u16(e);
      if (!tags.includes(tag)) continue;
      const type = u16(e + 2);
      const n = u32(e + 4);
      const size = n * (type === 3 ? 2 : 4);
      return { valOff: size <= 4 ? e + 8 : base + u32(e + 8), n };
    }
    return null;
  }

  const ifd0 = u32(base + 4);
  // 0x8769 = Exif IFD 포인터 → 그 안의 0x9003 = DateTimeOriginal
  const ptr = find(ifd0, [0x8769]);
  if (ptr) {
    const hit = find(u32(ptr.valOff), [0x9003]);
    if (hit) return ascii(hit.valOff, hit.n);
  }
  // 폴백: IFD0 의 0x0132 = DateTime
  const dt = find(ifd0, [0x0132]);
  return dt ? ascii(dt.valOff, dt.n) : null;
}

// "2026:08:12 14:03:21" → 정렬 가능한 "2026-08-12 14:03:21"
function normalize(s) {
  const m = s && s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}` : null;
}

// ── 실행 ────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const thumbIndex = Number((args.find((a) => a.startsWith('--thumb=')) ?? '--thumb=1').split('=')[1]);
  const dryRun = args.includes('--dry');

  if (!slug) {
    console.error('사용법: node .claude/skills/publish-case/prepare-images.mjs <slug> [--thumb=N] [--dry]');
    process.exit(1);
  }

  const caseDir = path.resolve('src/content/cases', slug);
  const rawDir = path.join(caseDir, 'raw');
  const outDir = path.join(caseDir, 'images');

  if (!existsSync(rawDir)) {
    console.error(`raw 폴더가 없습니다: src/content/cases/${slug}/raw/`);
    process.exit(1);
  }

  const files = (await readdir(rawDir)).filter((f) => EXT.has(path.extname(f).toLowerCase()));
  if (files.length === 0) {
    console.error(`raw 폴더에 이미지가 없습니다: src/content/cases/${slug}/raw/`);
    process.exit(1);
  }

  // 1) 촬영시각 수집
  const entries = [];
  for (const file of files) {
    const full = path.join(rawDir, file);
    let meta;
    try {
      meta = await sharp(full).metadata();
    } catch (e) {
      console.error(`읽기 실패 — 건너뜀: ${file} (${e.message})`);
      continue;
    }
    let taken = null;
    try {
      taken = normalize(exifCaptureTime(meta.exif));
    } catch {
      taken = null;
    }
    // EXIF orientation 이 세로면 최종 가로/세로가 뒤바뀐다
    const swap = meta.orientation >= 5 && meta.orientation <= 8;
    entries.push({
      file,
      full,
      taken,
      width: swap ? meta.height : meta.width,
      height: swap ? meta.width : meta.height,
    });
  }
  if (entries.length === 0) {
    console.error('읽을 수 있는 이미지가 없습니다.');
    process.exit(1);
  }

  // 2) 정렬 — 촬영시각 오름차순, 시각 없는 것은 뒤로 파일명 순
  entries.sort((a, b) => {
    if (a.taken && b.taken) return a.taken.localeCompare(b.taken) || a.file.localeCompare(b.file);
    if (a.taken) return -1;
    if (b.taken) return 1;
    return a.file.localeCompare(b.file, 'ko', { numeric: true });
  });

  const noExif = entries.filter((e) => !e.taken).length;
  if (noExif > 0) {
    console.log(`※ EXIF 촬영시각 없음 ${noExif}/${entries.length}장 — 파일명 순으로 뒤에 배치. 공정 순서를 눈으로 확인할 것.`);
  }

  if (thumbIndex < 1 || thumbIndex > entries.length) {
    console.error(`--thumb=${thumbIndex} 범위를 벗어났습니다 (1~${entries.length}).`);
    process.exit(1);
  }

  if (!dryRun) await mkdir(outDir, { recursive: true });

  // 3) 변환 — rotate() 로 orientation 을 픽셀에 반영한 뒤 메타데이터는 버린다
  const manifest = [];
  for (const [i, e] of entries.entries()) {
    const name = `${String(i + 1).padStart(2, '0')}.webp`;
    const width = Math.min(e.width, MAX_WIDTH);
    const height = Math.round((e.height * width) / e.width);

    if (!dryRun) {
      const p = sharp(e.full).rotate();
      if (e.width > MAX_WIDTH) p.resize({ width: MAX_WIDTH });
      await p.webp({ quality: QUALITY }).toFile(path.join(outDir, name));
    }
    manifest.push({ n: i + 1, image: `images/${name}`, source: e.file, taken: e.taken, width, height });
  }

  // 4) 썸네일 — 상세 페이지가 og:image(1200×630)를 여기서 만든다
  const thumb = entries[thumbIndex - 1];
  if (thumb.width < 1200) {
    console.log(`※ 썸네일 원본 가로 ${thumb.width}px — og:image(1200×630) 생성 시 확대됩니다. 더 큰 컷 권장.`);
  }
  if (!dryRun) {
    const p = sharp(thumb.full).rotate();
    if (thumb.width > THUMB_WIDTH) p.resize({ width: THUMB_WIDTH });
    await p.webp({ quality: QUALITY }).toFile(path.join(outDir, 'thumb.webp'));
  }

  // 5) 보고
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}${manifest.length}장 정리 → src/content/cases/${slug}/images/`);
  console.log(`썸네일: ${thumb.file} → thumb.webp`);
  console.log('\nMANIFEST');
  console.log(JSON.stringify(manifest, null, 2));
}
