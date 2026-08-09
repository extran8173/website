/**
 * 모터리페어 — 사업장 단일 소스 상수
 *
 * 기준 문서: docs/기획/05_local_business.md §1 (NAP 원본)
 * 규칙: NAP·영업시간·서비스지역·인증·A/S 등 "틀리면 안 되는 값"은 전부 이 파일에서만 정의하고
 *       헤더·푸터·오시는길·문의·JSON-LD가 전부 이 파일을 참조한다. (CLAUDE.md 불변 사실 정보)
 *
 * ⚠️ 확인 대기(placeholder) 값은 TODO 로 표시했다 — 실제 값 확정 시 이 파일만 고치면 전 페이지 반영.
 */

// WGS84 좌표 — 주소 geo·지도 링크·임베드 URL이 전부 이 값 하나를 참조한다
// 2026-08-09 정정: 구 좌표(37.2121627, 127.0515001)가 실제 위치보다 남서쪽 ~170m 어긋나 있었음
const geo = { lat: 37.2136955, lng: 127.0522204 } as const;

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
    geo, // WGS84 — 오시는길 지도·JSON-LD geo (05 §3)
  },

  // ── 지도 바로가기 (오시는 길 페이지용) ────────────────
  maps: {
    naverPlace: 'https://map.naver.com/p/entry/place/1323147007',
    google: `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`,
    // 카카오 정식 포맷: /link/map/장소명,위도,경도 (장소명 URL 인코딩)
    kakao: `https://map.kakao.com/link/map/${encodeURIComponent('모터리페어')},${geo.lat},${geo.lng}`,
    // 오시는길 임베드 지도. 키 불필요하나 비공식 방식 — 차후 Google Maps Embed API(키 발급) 전환 시 이 값만 교체
    googleEmbed: `https://www.google.com/maps?q=${geo.lat},${geo.lng}&hl=ko&z=17&output=embed`,
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
    naverUrl: 'https://map.naver.com/p/entry/place/1323147007?placePath=/ticket', // 예약 탭 직행. 길찾기는 maps.naverPlace 사용
    naverBlogUrl: 'https://blog.naver.com/extran',
  },

  // ── 서비스 지역 — 이원 구조 (2026-08-09 확정: 통일하지 않는다. CLAUDE.md 불변 사실) ──
  // ⚠️ 두 계열 모두 충주·제천·원주·음성 절대 금지
  //
  // [A계열] SEO 키워드 축 — 검색엔진·AI가 읽는 정보.
  //   적용: 메타 디스크립션 · JSON-LD areaServed · 사례 글 태그 · FAQ 서비스 지역 서술
  seoRegions: ['동탄', '화성', '오산', '평택'] as const,
  seoRegionText: '동탄·화성·오산·평택 수입차 정비',
  //
  // [B계열] 고객 체감 거리 축 — 방문자가 접근성을 판단하는 정보.
  //   적용: 오시는 길 히어로 라벨 · 오시는 길 지역 목록(소요시간 병기)
  accessRegions: ['동탄', '수원', '용인', '오산', '평택'] as const,
  accessRegionLabel: '동탄 · 수원 · 용인 · 오산 · 평택',

  // ── 취급 브랜드 / 진단 장비 ───────────────────────────
  brands: ['BMW', '벤츠', '아우디', '폭스바겐', '미니', '포르쉐'] as const,
  // 전용 진단기 없이 정비하는 확장 브랜드 — 표기 시 주력 6개와 반드시 구분 (과장 방지)
  brandsExtended: ['재규어', '랜드로버', '마세라티'] as const,
  equipment: ['ISTA+', 'Xentry', 'ODIS', 'PIWIS', 'Picoscope'] as const,

  // ── 인증 / 경력 / A/S ─────────────────────────────────
  certifications: ['ISO 9001', 'ISO 14001', 'ISO 45001'] as const, // 취득
  awards: ['2026 대한민국 고객만족 신뢰도 대상 (한국기자협회)'] as const,
  careerYears: 20,
  warranty: {
    // 부품 — 차량 제작사 기준 동일, 1년 / 2만km
    text: '부품 A/S: 차량 제작사 기준 동일 (1년 / 2만km)',
    period: '1년',
    distance: '2만km',
  },
} as const;

// ── 사이트 내비게이션 (6개) ────────────────────────────
// 2026-07: 문의 페이지를 오시는 길로 통합 → 메뉴에서 문의 제거.
// 2026-08: 업체 소개 페이지(WP 슬러그 승계) 추가 → 6개.
export const navItems = [
  { label: '홈', href: '/' },
  { label: '서비스', href: '/services/' },
  { label: '정비 사례', href: '/cases/' },
  { label: '진단 장비', href: '/equipment/' },
  { label: '소개', href: '/dongtan-import-car-specialty-motor-repair-introduction/' },
  { label: '오시는 길', href: '/location/' },
] as const;

// ── 주 전환 CTA (문구 확정본 — 01 §3 / DESIGN-motorrepair §4) ──
export const cta = {
  callLabel: '전화로 증상 상담하기',
  callHref: `tel:${business.phone.tel}`,
  naverLabel: '네이버로 예약하기',
  naverHref: business.booking.naverUrl,
} as const;
