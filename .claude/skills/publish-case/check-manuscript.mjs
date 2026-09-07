/**
 * 원고 자체 점검 — 세는 것만 한다 (설계문서 §9)
 *
 *   node .claude/skills/publish-case/check-manuscript.mjs <slug>
 *
 * `src/content/cases/<slug>/_draft.json` 을 읽어 기계적으로 검사한다.
 * **판단이 필요한 것(문체·사실 근거)은 여기서 하지 않는다** — 근거 대조표는 스킬이 만든다.
 * 이 스크립트의 존재 이유는 "지키려 노력했다"를 "세어서 확인했다"로 바꾸는 것이다.
 *
 * 종료 코드 — 0: 통과(경고는 있을 수 있음) / 1: FAIL 있음
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BANNED = [
  '말끔히', '완벽히', '완연히', '확실히', '새 차처럼', '걱정 없이',
  '최상의', '최고의', '제일', '정확한', '완전히 사라지', '되찾아진',
];

// 전용 진단기 — 주력 6개 브랜드에만 해당 (CLAUDE.md 불변 사실)
const SCANNER_NAMES = ['ISTA', 'Xentry', 'XENTRY', 'ODIS', 'VCDS', 'PIWIS', 'Picoscope'];
const SCANNER_BRANDS = ['BMW', 'MINI', '벤츠', '아우디', '폭스바겐', '포르쉐'];

// 서비스 지역 — 이 밖의 지역명은 쓰지 않는다 (CLAUDE.md)
const FORBIDDEN_REGIONS = ['충주', '제천', '원주', '음성'];

const PLATE = /\d{2,3}\s?[가-힣]\s?\d{4}/g;
const VIN = /\b[A-HJ-NPR-Z0-9]{17}\b/g;

const countNoSpace = (s) => String(s ?? '').replace(/\s/g, '').length;

/** 검사 결과 한 줄. level: pass | warn | fail */
const row = (level, label, value, note = '') => ({ level, label, value, note });

export function checkDraft(draft) {
  const out = [];
  const n = draft.naver ?? {};
  const a = draft.astro ?? {};
  const fm = a.frontmatter ?? {};
  const allText = [n.body, a.body, JSON.stringify(fm)].filter(Boolean).join('\n');

  // ── 세면 되는 것 ──
  const naverLen = countNoSpace(n.body);
  out.push(
    naverLen >= 1500 && naverLen <= 2000
      ? row('pass', '네이버 본문', `${naverLen.toLocaleString()}자 (공백 제외)`, '1,500~2,000')
      : row('fail', '네이버 본문', `${naverLen.toLocaleString()}자 (공백 제외)`, `1,500~2,000 범위 밖 — ${naverLen < 1500 ? '늘려야' : '줄여야'} 합니다`)
  );

  const desc = fm.description ?? '';
  out.push(
    desc.length <= 160
      ? row('pass', 'description', `${desc.length}자`, '160 이하')
      : row('fail', 'description', `${desc.length}자`, '160자 초과 — 스키마가 빌드를 막습니다')
  );

  for (const [label, faq] of [['FAQ (네이버)', n.faq], ['FAQ (Astro)', fm.faq]]) {
    const c = Array.isArray(faq) ? faq.length : 0;
    out.push(c === 3 ? row('pass', label, `${c}개`) : row('fail', label, `${c}개`, '정확히 3개여야 합니다'));
  }

  const nTags = Array.isArray(n.tags) ? n.tags.length : 0;
  out.push(nTags === 30 ? row('pass', '태그 (네이버)', `${nTags}개`) : row('fail', '태그 (네이버)', `${nTags}개`, '30개여야 합니다'));

  const aTags = Array.isArray(fm.tags) ? fm.tags.length : 0;
  out.push(
    aTags >= 8 && aTags <= 10
      ? row('pass', '태그 (Astro)', `${aTags}개`, '8~10')
      : row('warn', '태그 (Astro)', `${aTags}개`, '8~10 권장')
  );

  // ── 금지어 — 경고만. 오탐이 잦아 기계적으로 막으면 경고 자체를 무시하게 된다 ──
  const hits = BANNED.filter((w) => allText.includes(w));
  out.push(hits.length === 0 ? row('pass', '금지어', '없음') : row('warn', '금지어', hits.join(', '), '문맥을 보고 판단하세요'));

  // ── 차량번호·VIN — 텍스트에는 절대 쓰지 않는다 ──
  const plates = [...new Set(allText.match(PLATE) ?? [])];
  const vins = [...new Set(allText.match(VIN) ?? [])];
  out.push(
    plates.length === 0 && vins.length === 0
      ? row('pass', '차량번호·VIN', '없음')
      : row('fail', '차량번호·VIN', [...plates, ...vins].join(', '), '텍스트에서 제거해야 합니다')
  );

  // ── 진단기 표기 ──
  const scannerInAstroBody = SCANNER_NAMES.filter((s) => (a.body ?? '').includes(s));
  out.push(
    scannerInAstroBody.length === 0
      ? row('pass', '진단기 표기 (Astro 본문)', '실명 없음', '본문은 "시스템 진단기"')
      : row('warn', '진단기 표기 (Astro 본문)', scannerInAstroBody.join(', '), '본문에는 실명 대신 "시스템 진단기"')
  );
  const scannerInNaver = SCANNER_NAMES.filter((s) => (n.body ?? '').includes(s));
  out.push(
    scannerInNaver.length === 0
      ? row('pass', '진단기 표기 (네이버)', '실명 없음', '네이버는 "스캐너 시스템"')
      : row('warn', '진단기 표기 (네이버)', scannerInNaver.join(', '), '네이버 본문은 "스캐너 시스템"')
  );

  // 확장 브랜드에 전용 진단기를 붙이면 과장이다
  const brand = fm.brand ?? draft.brand ?? '';
  const usedScanner = SCANNER_NAMES.filter((s) => allText.includes(s));
  if (usedScanner.length > 0 && !SCANNER_BRANDS.includes(brand)) {
    out.push(row('fail', '전용 진단기 / 브랜드', `${brand} + ${usedScanner.join(', ')}`, '전용 진단기는 주력 6개 브랜드에만 해당합니다'));
  } else {
    out.push(row('pass', '전용 진단기 / 브랜드', brand || '(미지정)'));
  }

  // ── 지역 ──
  const badRegions = FORBIDDEN_REGIONS.filter((r) => allText.includes(r));
  out.push(
    badRegions.length === 0
      ? row('pass', '지역 표기', '동탄·화성·오산·평택')
      : row('fail', '지역 표기', badRegions.join(', '), '서비스 지역 밖입니다')
  );

  // ── 부품 출처 표기 — 본문 근거가 있을 때만 남긴다 ──
  const parts = Array.isArray(fm.parts_used) ? fm.parts_used : [];
  const SRC_TAG = /\((순정|정품|OEM|OE|리빌트|재생|애프터[^)]*|제조사[^)]*)\)/;
  const tagged = parts.filter((p) => SRC_TAG.test(p));
  const grounded = /순정|정품|애프터|OEM|\bOE\b|리빌트|재생품|제조사 파츠/.test(a.body ?? '');
  if (tagged.length === 0) {
    out.push(row('pass', '부품 출처 표기', '없음'));
  } else if (grounded) {
    out.push(row('pass', '부품 출처 표기', `${tagged.length}건`, '본문에 근거 있음 — 유지'));
  } else {
    out.push(row('fail', '부품 출처 표기', tagged.join(', '), '본문에 언급이 없습니다 — 괄호를 떼세요'));
  }

  // ── 근거 대조표 집계 (표 자체는 스킬이 만든다) ──
  const ev = Array.isArray(draft.evidence) ? draft.evidence : [];
  if (ev.length > 0) {
    const unsourced = ev.filter((e) => !e.source);
    out.push(
      unsourced.length === 0
        ? row('pass', '근거 대조', `주장 ${ev.length}건 전부 출처 있음`)
        : row('warn', '근거 대조', `출처 없음 ${unsourced.length}건`, unsourced.map((e) => `"${e.claim}"`).join(' / '))
    );
  } else {
    out.push(row('warn', '근거 대조', '미작성', 'evidence 배열이 비어 있습니다'));
  }

  return out;
}

export function formatReport(rows) {
  const mark = { pass: '✓', warn: '⚠', fail: '✗' };
  const w = Math.max(...rows.map((r) => [...r.label].length));
  const lines = ['[자체 점검]'];
  for (const r of rows) {
    const pad = ' '.repeat(Math.max(0, w - [...r.label].length));
    lines.push(`  ${mark[r.level]} ${r.label}${pad}  ${r.value}${r.note ? `   ${r.note}` : ''}`);
  }
  const fails = rows.filter((r) => r.level === 'fail');
  const warns = rows.filter((r) => r.level === 'warn');
  lines.push('');
  lines.push(fails.length === 0 ? `통과 — 경고 ${warns.length}건` : `FAIL ${fails.length}건 — 고쳐서 다시 검사하세요`);
  return lines.join('\n');
}

// ── CLI ─────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('사용법: check-manuscript.mjs <slug>');
    process.exit(1);
  }
  const file = path.resolve('src/content/cases', slug, '_draft.json');
  if (!fs.existsSync(file)) {
    console.error(`_draft.json 이 없습니다: ${file}`);
    process.exit(1);
  }
  const rows = checkDraft(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(formatReport(rows));
  process.exit(rows.some((r) => r.level === 'fail') ? 1 : 0);
}
