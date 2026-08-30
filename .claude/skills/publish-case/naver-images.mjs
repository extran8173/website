/**
 * 「리」 폴더 생성 — 네이버 블로그 업로드용 이미지 (설계문서 §7-4)
 *
 *   node .claude/skills/publish-case/naver-images.mjs <slug> \
 *     --to="<정비폴더>/리" --model="벤츠 CLS63 AMG" [--overlay="<오버레이.jpg>"]
 *
 * src/content/cases/<slug>/images/ 의 확정 번호를 그대로 따라간다.
 * **「홈」과 순서가 같아야 한다** — 그래서 원본을 다시 정렬하지 않고 이미 번호가 매겨진
 * webp 를 읽어 JPG 로 변환한다. 정렬을 두 번 하면 두 폴더가 어긋날 수 있다.
 *
 *   00_<차종>.jpg   ← 대표 컷 오버레이 (--overlay 로 준 파일). 맨 앞에 두어 바로 찾게 한다
 *   01_<차종>.jpg   ← 본문 01.webp
 *   02_<차종>.jpg ~
 *
 * 형식 JPG · 가로 1200px(네이버 본문 영역) · 업스케일 금지.
 */
import sharp from 'sharp';
import { readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NAVER_WIDTH = 1200;
const QUALITY = 90;

/** 파일명에 쓸 수 없는 문자를 정리한다. 한글·공백은 그대로 둔다(네이버 업로드에 문제없다). */
function safeName(s) {
  return String(s)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildNaverImages({ slug, to, model, overlay = null, clean = true }) {
  const imagesDir = path.resolve('src/content/cases', slug, 'images');
  if (!existsSync(imagesDir)) throw new Error(`images 폴더가 없습니다: ${imagesDir}`);

  const numbered = (await readdir(imagesDir))
    .filter((f) => /^\d{2}\.webp$/.test(f))
    .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  if (numbered.length === 0) throw new Error(`번호 이미지가 없습니다: ${imagesDir}`);

  // 결번이 있으면 「홈」과 「리」의 순서 대응이 깨진다 — 조용히 넘기지 않는다.
  const nums = numbered.map((f) => Number(f.slice(0, 2)));
  const gaps = [];
  for (let i = 1; i <= nums[nums.length - 1]; i++) if (!nums.includes(i)) gaps.push(i);

  if (clean && existsSync(to)) await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });

  const name = safeName(model);
  const written = [];

  if (overlay) {
    if (!existsSync(overlay)) throw new Error(`오버레이 파일이 없습니다: ${overlay}`);
    const out = path.join(to, `00_${name}.jpg`);
    const m = await sharp(overlay).metadata();
    const p = sharp(overlay);
    if (m.width > NAVER_WIDTH) p.resize({ width: NAVER_WIDTH });
    await p.jpeg({ quality: QUALITY }).toFile(out);
    written.push({ n: 0, file: path.basename(out), from: path.basename(overlay), width: Math.min(m.width, NAVER_WIDTH) });
  }

  for (const f of numbered) {
    const src = path.join(imagesDir, f);
    const m = await sharp(src).metadata();
    const out = path.join(to, `${f.slice(0, 2)}_${name}.jpg`);
    const p = sharp(src);
    if (m.width > NAVER_WIDTH) p.resize({ width: NAVER_WIDTH }); // 업스케일 금지
    await p.jpeg({ quality: QUALITY }).toFile(out);
    written.push({ n: Number(f.slice(0, 2)), file: path.basename(out), from: f, width: Math.min(m.width, NAVER_WIDTH) });
  }

  return { written, gaps, bodyCount: numbered.length };
}

// ── CLI ─────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const val = (n) => {
    const hit = args.find((a) => a.startsWith(`${n}=`));
    return hit ? hit.slice(n.length + 1).replace(/^["']|["']$/g, '') : null;
  };
  const to = val('--to');
  const model = val('--model');
  if (!slug || !to || !model) {
    console.error('사용법: naver-images.mjs <slug> --to="<정비폴더>/리" --model="<차종>" [--overlay="<오버레이.jpg>"]');
    process.exit(1);
  }

  const r = await buildNaverImages({ slug, to, model, overlay: val('--overlay') });
  console.log(`「리」 ${r.written.length}장 생성 → ${to}`);
  console.log(`  본문 ${r.bodyCount}장${r.written.some((w) => w.n === 0) ? ' + 대표 오버레이 1장' : ''} · 가로 ${NAVER_WIDTH}px JPG q${QUALITY}`);
  if (r.gaps.length) {
    console.log(`  ※ 「홈」 번호에 결번 ${r.gaps.join(', ')} — 「리」와 순서 대응을 확인할 것`);
  }
  for (const w of r.written) console.log(`    ${w.file}  ←  ${w.from}  (${w.width}px)`);
}
