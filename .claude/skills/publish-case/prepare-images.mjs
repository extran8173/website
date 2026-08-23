/**
 * 정비 사례 원본 사진 → images/NN.webp 정리 (publish-case 스킬 2단계 전용)
 *
 *   node .claude/skills/publish-case/prepare-images.mjs <slug> --from="<원본폴더>" [--dry]
 *   node .claude/skills/publish-case/prepare-images.mjs <slug> --renumber=3,1,2,…  [--dry]
 *
 * 입력 파일명 규칙 — 사용자가 원본 폴더에서 접두어를 붙인다:
 *   t_*    목록 대표이미지 — thumb.webp 로만 나가고 본문 번호에서 제외. 정확히 1개.
 *   00_*   본문 첫 사진 — 정렬과 무관하게 항상 01.webp. 정확히 1개.
 *   그 외   본문 사진 — 파일명 끝 괄호 순번 `(n)` 오름차순.
 *
 * 하는 일: --from 폴더 → raw/ 복사 → 정렬 → 가로 2000px 상한 → EXIF 제거 → WebP q80
 *          → src/content/cases/<slug>/images/01.webp … NN.webp + thumb.webp
 * 반응형 변환은 하지 않는다 — astro:assets 가 빌드 때 생성한다.
 *
 * 번호는 **잠정값**이다. 원고 기준 배치가 확정된 뒤 --renumber 로 다시 매긴다
 * (본문 순서와 파일 번호가 항상 일치해야 한다).
 */
import sharp from 'sharp';
import { readdir, mkdir, copyFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const MAX_WIDTH = 2000;
const THUMB_WIDTH = 1600;
const QUALITY = 80;
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff']);

const THUMB_PREFIX = /^t_/i; // 목록 대표이미지
const FIRST_PREFIX = /^00_/i; // 본문 첫 사진
const EXCLUDE_PREFIX = /^x_/i; // 발행 제외 — 사용자가 원본 폴더에서 지정한다

// ── 파일명 끝 괄호 순번 ─────────────────────────────────
// `benz cls63 amg (14).jpg` → 14. 확장자를 떼고 봐야 끝(`$`)에 걸린다.
export function parenNumber(name) {
  const base = name.replace(/\.[^.]+$/, '');
  const m = base.match(/\((\d+)\)\s*$/);
  return m ? Number(m[1]) : null;
}

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

// ── 파일명 날짜 (카카오톡 경유 사진 대응) ────────────────
export function filenameCaptureTime(name) {
  // KakaoTalk_YYYYMMDD_<숫자>_<순번>
  let m = name.match(/(\d{4})(\d{2})(\d{2})[_-](\d{6,})(?:[_-](\d+))?/);
  if (m) {
    const sub = m[4].padStart(15, '0');
    const seq = (m[5] ?? '0').padStart(4, '0');
    return `${m[1]}-${m[2]}-${m[3]} ${sub}.${seq}`;
  }
  // YYYYMMDD_HHMMSS 형식
  m = name.match(/(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}${m[5]}${m[6]}`;
  return null;
}

// ── 정렬 키 종류를 폴더 단위로 결정한다 ──────────────────
// 파일마다 다른 척도(괄호 순번 vs 날짜)를 섞어 비교하면 순서가 의미를 잃는다.
// 하나라도 괄호 순번이 있으면 폴더 전체를 괄호 순번 기준으로 본다.
export function decideKeyKind(list) {
  if (list.some((e) => e.paren !== null)) return 'paren';
  if (list.some((e) => e.fromName)) return 'name';
  if (list.some((e) => e.taken)) return 'exif';
  return 'file';
}

function keyOf(e, kind) {
  if (kind === 'paren') return e.paren;
  if (kind === 'name') return e.fromName;
  if (kind === 'exif') return e.taken;
  return null;
}

export function sortByKind(list, kind) {
  const byName = (a, b) => a.file.localeCompare(b.file, 'ko', { numeric: true });
  list.sort((a, b) => {
    const av = keyOf(a, kind);
    const bv = keyOf(b, kind);
    if (av !== null && av !== undefined && bv !== null && bv !== undefined) {
      if (kind === 'paren') return av - bv || byName(a, b);
      // 날짜 문자열 — 날짜부를 먼저 비교해 시각 정밀도 차이가 순서를 뒤집지 않게 한다
      const ad = String(av).slice(0, 10);
      const bd = String(bv).slice(0, 10);
      if (ad !== bd) return ad.localeCompare(bd);
      return String(av).localeCompare(String(bv)) || byName(a, b);
    }
    if (av !== null && av !== undefined) return -1;
    if (bv !== null && bv !== undefined) return 1;
    return byName(a, b);
  });
  return list;
}

// ── 실행 ────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();

function argValue(args, name) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1).replace(/^["']|["']$/g, '') : null;
}

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const fromDir = argValue(args, '--from');
  const renumberArg = argValue(args, '--renumber');
  const dryRun = args.includes('--dry');

  if (!slug) {
    console.error('사용법: node .claude/skills/publish-case/prepare-images.mjs <slug> --from="<원본폴더>" [--dry]');
    console.error('        node .claude/skills/publish-case/prepare-images.mjs <slug> --renumber=3,1,2,… [--dry]');
    process.exit(1);
  }

  const caseDir = path.resolve('src/content/cases', slug);
  const rawDir = path.join(caseDir, 'raw');
  const outDir = path.join(caseDir, 'images');

  // ── 재번호 모드 — 배치 확정 후 본문 순서에 맞춰 다시 매긴다 ──
  if (renumberArg) {
    await renumber(outDir, renumberArg, dryRun);
    return;
  }

  // ── 0) 원본 폴더 → raw/ 복사 ──
  if (fromDir) {
    if (!existsSync(fromDir)) {
      console.error(`원본 폴더가 없습니다: ${fromDir}`);
      process.exit(1);
    }
    const src = (await readdir(fromDir)).filter((f) => EXT.has(path.extname(f).toLowerCase()));
    if (src.length === 0) {
      console.error(`원본 폴더에 이미지가 없습니다: ${fromDir}`);
      process.exit(1);
    }
    if (!dryRun) {
      await mkdir(rawDir, { recursive: true });
      for (const f of src) await copyFile(path.join(fromDir, f), path.join(rawDir, f));
    }
    console.log(`${dryRun ? '[DRY RUN] ' : ''}원본 ${src.length}장 복사 → src/content/cases/${slug}/raw/`);
  }

  if (!existsSync(rawDir)) {
    console.error(`raw 폴더가 없습니다: src/content/cases/${slug}/raw/`);
    console.error('--from="<원본폴더>" 로 원본 위치를 지정하세요.');
    process.exit(1);
  }

  const all = (await readdir(rawDir)).filter((f) => EXT.has(path.extname(f).toLowerCase()));

  // x_ 접두어는 발행 제외 — 어떤 사진을 뺄지는 사용자가 원본 폴더에서 정한다.
  // 스킬은 그 외의 사진을 전부 쓴다(선별하지 않는다).
  const excluded = all.filter((f) => EXCLUDE_PREFIX.test(f));
  const files = all.filter((f) => !EXCLUDE_PREFIX.test(f));
  if (excluded.length > 0) {
    console.log(`x_ 제외 ${excluded.length}장: ${excluded.join(', ')}`);
  }
  if (files.length === 0) {
    console.error(`raw 폴더에 쓸 이미지가 없습니다: src/content/cases/${slug}/raw/`);
    process.exit(1);
  }

  // ── 1) 접두어 검사 — 각각 정확히 1개 ──
  const thumbFiles = files.filter((f) => THUMB_PREFIX.test(f));
  const firstFiles = files.filter((f) => FIRST_PREFIX.test(f));
  if (thumbFiles.length !== 1) {
    console.error(`t_ 파일이 ${thumbFiles.length}개입니다 — 정확히 1개여야 합니다.`);
    for (const f of thumbFiles) console.error(`  ${f}`);
    process.exit(1);
  }
  // 00_ 는 선택이다 — 없으면 판독 단계에서 오버레이 컷을 자동 식별해 --renumber 로 앞에 세운다.
  if (firstFiles.length > 1) {
    console.error(`00_ 파일이 ${firstFiles.length}개입니다 — 0개(자동 식별) 또는 1개(수동 지정)여야 합니다.`);
    for (const f of firstFiles) console.error(`  ${f}`);
    process.exit(1);
  }

  // ── 2) 메타데이터 수집 ──
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
      fromName: filenameCaptureTime(file),
      paren: parenNumber(file),
      isThumb: THUMB_PREFIX.test(file),
      isFirst: FIRST_PREFIX.test(file),
      width: swap ? meta.height : meta.width,
      height: swap ? meta.width : meta.height,
    });
  }
  if (entries.length === 0) {
    console.error('읽을 수 있는 이미지가 없습니다.');
    process.exit(1);
  }

  // ── 3) 괄호 순번 결번·중복 — 접두어 파일까지 합산해 1~N 연속인지 본다 ──
  //     t_ 와 00_ 도 같은 번호 계열에서 번호를 가져가므로 빼고 세면 항상 결번이 난다.
  const parens = entries.map((e) => e.paren).filter((n) => n !== null).sort((a, b) => a - b);
  if (parens.length > 0) {
    const max = parens[parens.length - 1];
    const seen = new Set(parens);
    const missing = [];
    for (let i = 1; i <= max; i++) if (!seen.has(i)) missing.push(i);
    const dup = [...new Set(parens.filter((n, i) => i > 0 && parens[i - 1] === n))];
    if (missing.length > 0) console.log(`※ 괄호 순번 결번: ${missing.join(', ')} (1~${max} 기준) — 계속 진행합니다.`);
    if (dup.length > 0) console.log(`※ 괄호 순번 중복: ${dup.join(', ')} — 계속 진행합니다.`);
  }

  // ── 4) 본문 배열 구성 — 00_ 최상단 고정 + 나머지 정렬 ──
  const thumb = entries.find((e) => e.isThumb);
  const first = entries.find((e) => e.isFirst) ?? null;
  const rest = entries.filter((e) => !e.isThumb && !e.isFirst);
  const kind = decideKeyKind(rest);
  sortByKind(rest, kind);
  const body = first ? [first, ...rest] : rest;

  const KIND_LABEL = { paren: '파일명 괄호 순번', name: '파일명 날짜', exif: 'EXIF 촬영시각', file: '파일명' };
  console.log(`정렬 기준: ${KIND_LABEL[kind]} (폴더 단위 결정)`);
  const noKey = rest.filter((e) => keyOf(e, kind) === null || keyOf(e, kind) === undefined).length;
  if (noKey > 0) {
    console.log(`※ 정렬 키 없음 ${noKey}장 — 맨 뒤 배치. 3단계에서 순서를 바로잡을 것.`);
  }
  console.log(`대표: ${thumb.file} → thumb.webp (본문 제외)`);
  if (first) {
    console.log(`본문 첫 사진: ${first.file} → 01.webp (00_ 수동 지정)`);
  } else {
    console.log('본문 첫 사진: 미지정 — 판독 단계에서 오버레이 컷을 식별해 --renumber 로 앞에 세울 것.');
  }

  if (!dryRun) await mkdir(outDir, { recursive: true });

  // ── 5) 변환 — rotate() 로 orientation 을 픽셀에 반영한 뒤 메타데이터는 버린다 ──
  const manifest = [];
  for (const [i, e] of body.entries()) {
    const name = `${String(i + 1).padStart(2, '0')}.webp`;
    const width = Math.min(e.width, MAX_WIDTH);
    const height = Math.round((e.height * width) / e.width);

    if (!dryRun) {
      const p = sharp(e.full).rotate();
      if (e.width > MAX_WIDTH) p.resize({ width: MAX_WIDTH });
      await p.webp({ quality: QUALITY }).toFile(path.join(outDir, name));
    }
    manifest.push({
      n: i + 1,
      image: `images/${name}`,
      source: e.file,
      paren: e.paren,
      taken: e.taken,
      fromName: e.fromName,
      width,
      height,
    });
  }

  // ── 6) 썸네일 — 상세 페이지가 og:image(1200×630)를 여기서 만든다 ──
  if (thumb.width < 1200) {
    console.log(`※ 썸네일 원본 가로 ${thumb.width}px — og:image 는 업스케일하지 않으므로 원본 크기 그대로 나갑니다.`);
    console.log('  공유 카드가 큰 이미지 대신 작은 썸네일로 표시될 수 있습니다.');
  }
  if (!dryRun) {
    const p = sharp(thumb.full).rotate();
    if (thumb.width > THUMB_WIDTH) p.resize({ width: THUMB_WIDTH });
    await p.webp({ quality: QUALITY }).toFile(path.join(outDir, 'thumb.webp'));
  }

  // ── 7) 보고 ──
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}본문 ${manifest.length}장 + thumb.webp → src/content/cases/${slug}/images/`);
  console.log('번호는 잠정값입니다 — 배치 확정 후 --renumber 로 다시 매기세요.');
  console.log('\nMANIFEST');
  console.log(JSON.stringify(manifest, null, 2));
}

// ── 재번호 — `--renumber=3,1,2` 는 "새 01 = 기존 03, 새 02 = 기존 01 …" ──
async function renumber(outDir, spec, dryRun) {
  if (!existsSync(outDir)) {
    console.error(`images 폴더가 없습니다: ${outDir}`);
    process.exit(1);
  }
  const present = (await readdir(outDir))
    .filter((f) => /^\d{2}\.webp$/.test(f))
    .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  // 현재 번호에 결번이 있을 수 있다(사진을 뺀 경우). 1~N 을 가정하지 않고 실제 번호를 본다.
  const presentNums = present.map((f) => Number(f.slice(0, 2)));
  const order = spec.split(',').map((s) => Number(s.trim()));

  if (order.length !== presentNums.length || order.some((n) => !Number.isInteger(n))) {
    console.error(`--renumber 항목 수가 맞지 않습니다 — 현재 ${presentNums.length}장, 지정 ${order.length}개.`);
    console.error(`현재 번호: ${presentNums.join(', ')}`);
    process.exit(1);
  }
  const have = new Set(presentNums);
  const unknown = order.filter((n) => !have.has(n));
  if (new Set(order).size !== order.length || unknown.length > 0) {
    console.error(`--renumber 는 현재 번호를 중복 없이 한 번씩 써야 합니다.`);
    console.error(`현재 번호: ${presentNums.join(', ')}`);
    if (unknown.length > 0) console.error(`없는 번호 지정: ${unknown.join(', ')}`);
    process.exit(1);
  }
  if (order.every((n, i) => n === i + 1)) {
    console.log('순서가 이미 일치합니다 — 변경 없음.');
    return;
  }

  // 이름 충돌을 피해 임시 이름을 거친다
  const plan = order.map((oldN, i) => ({
    from: `${String(oldN).padStart(2, '0')}.webp`,
    to: `${String(i + 1).padStart(2, '0')}.webp`,
  }));
  for (const p of plan) if (p.from !== p.to) console.log(`  ${p.from} → ${p.to}`);
  if (dryRun) {
    console.log('[DRY RUN] 실제 변경 없음.');
    return;
  }
  for (const p of plan) await rename(path.join(outDir, p.from), path.join(outDir, `tmp_${p.to}`));
  for (const p of plan) await rename(path.join(outDir, `tmp_${p.to}`), path.join(outDir, p.to));
  console.log(`재번호 완료 — ${plan.filter((p) => p.from !== p.to).length}장 변경.`);
}
