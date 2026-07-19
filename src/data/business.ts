/**
 * 모터리페어 — 사업장 단일 소스 상수
 *
 * 기준 문서: docs/기획/05_local_business.md §1 (NAP 원본)
 * 규칙: NAP·영업시간·서비스지역·인증·A/S 등 "틀리면 안 되는 값"은 전부 이 파일에서만 정의하고
 *       헤더·푸터·오시는길·문의·JSON-LD가 전부 이 파일을 참조한다. (CLAUDE.md 불변 사실 정보)
 *
 * ⚠️ 확인 대기(placeholder) 값은 TODO 로 표시했다 — 실제 값 확정 시 이 파일만 고치면 전 페이지 반영.
 */

export const business = {
  // ── 상호 ──────────────────────────────────────────────
  name: '모터리페어',
  alternateName: '장용석의 내차를 부탁해 동탄신도시점',
  industry: '수입차 전문정비',

  // ── 사업자 ────────────────────────────────────────────
  businessRegistrationNumber: '289-02-02283',

  // ── 주소 (NAP) ────────────────────────────────────────
  address: {
    full: '경기도 화성시 효행로1156번길 9 (병점동 203-35)',
    street: '효행로1156번길 9',
    lotBased: '병점동 203-35',
    locality: '화성시',
    region: '경기도',
    postalCode: '18413',
    country: 'KR',
    geo: { lat: 37.2121627, lng: 127.0515001 }, // WGS84 — 오시는길 지도·JSON-LD geo (05 §3)
  },

  // ── 지도 바로가기 (오시는 길 페이지용) ────────────────
  maps: {
    naverPlace: 'https://map.naver.com/p/entry/place/1323147007',
    google: 'https://www.google.com/maps/search/?api=1&query=37.2121627,127.0515001',
    kakao: 'https://map.kakao.com/link/map/37.2121627,127.0515001',
  },

  // ── 전화 ──────────────────────────────────────────────
  phone: {
    display: '010-3203-7607',
    tel: '01032037607', // href="tel:01032037607"
    intl: '+82-10-3203-7607', // JSON-LD telephone
  },

  // ── 영업시간 ──────────────────────────────────────────
  // 원본: 월–금 08:30–18:30 · 토 08:30–15:00 · 일 휴무
  hours: {
    weekday: { days: '월–금', opens: '08:30', closes: '18:30' },
    saturday: { days: '토', opens: '08:30', closes: '15:00' },
    sunday: { days: '일', closed: true as const },
    displayLines: [
      '월–금 08:30–18:30',
      '토 08:30–15:00',
      '일요일 휴무',
    ],
  },

  // ── 예약·채널 ─────────────────────────────────────────
  booking: {
    // 네이버 플레이스(예약 기능 연동) — CTA "네이버로 예약하기" 목적지
    naverUrl: 'https://map.naver.com/p/entry/place/1323147007',
    naverBlogUrl: 'https://blog.naver.com/extran',
  },

  // ── 서비스 지역 (표기·순서 고정) ──────────────────────
  // ⚠️ 충주·제천·원주·음성 절대 금지 (CLAUDE.md 불변 사실)
  serviceAreas: ['동탄', '화성', '오산', '평택'] as const,
  serviceAreaText: '동탄·화성·오산·평택 수입차 정비',

  // ── 취급 브랜드 / 진단 장비 ───────────────────────────
  brands: ['BMW', '벤츠', '아우디', '폭스바겐', '미니', '포르쉐'] as const,
  equipment: ['ISTA+', 'Xentry', 'ODIS', 'PIWIS', 'Picoscope'] as const,

  // ── 인증 / 경력 / A/S ─────────────────────────────────
  certifications: ['ISO 9001', 'ISO 14001', 'ISO 45001'] as const, // 취득
  careerYears: 20,
  warranty: {
    // 부품 — 차량 제작사 기준 동일, 1년 / 2만km
    text: '부품 A/S: 차량 제작사 기준 동일 (1년 / 2만km)',
    period: '1년',
    distance: '2만km',
  },
} as const;

// ── 사이트 내비게이션 (5개) ────────────────────────────
// 2026-07: 문의 페이지를 오시는 길로 통합 → 메뉴에서 문의 제거.
export const navItems = [
  { label: '홈', href: '/' },
  { label: '서비스', href: '/services/' },
  { label: '정비 사례', href: '/cases/' },
  { label: '진단 장비', href: '/equipment/' },
  { label: '오시는 길', href: '/location/' },
] as const;

// ── 주 전환 CTA (문구 확정본 — 01 §3 / DESIGN-motorrepair §4) ──
export const cta = {
  callLabel: '전화로 증상 상담하기',
  callHref: `tel:${business.phone.tel}`,
  naverLabel: '네이버로 예약하기',
  naverHref: business.booking.naverUrl,
} as const;
