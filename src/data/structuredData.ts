/**
 * 모터리페어 — 구조화 데이터(JSON-LD) 단일 소스
 *
 * 기준 문서: docs/기획/05_local_business.md §3 · 06_seo_geo_guide.md
 *
 * 설계 원칙 (2026-09-29 확정)
 * 1. 사업체 엔티티는 사이트 전체에서 @id 하나(`<site>/#business`)만 쓴다.
 *    전체 정의는 **메인 페이지에서만** 출력하고, 다른 페이지는 `{"@id": ...}` 참조로 연결한다.
 *    (이전에는 82개 페이지 전부가 @id 없는 AutoRepair 를 중복 출력해 별개 사업체로 읽힐 여지가 있었다.)
 * 2. 한 페이지의 모든 노드는 `@graph` 하나에 담는다 — <script> 를 여러 개 두지 않는다.
 * 3. 값은 전부 business.ts 에서 가져온다. 이 파일에 사실 정보를 새로 적지 않는다.
 * 4. aggregateRating·review 는 어떤 페이지에도 넣지 않는다 (실제 수집 절차가 없는 값).
 */
import { business } from './business.ts';

/** 사이트 전역 @id — 이 두 값 외의 사업체·사이트 식별자를 만들지 말 것. */
export const businessId = (site: URL) => new URL('/#business', site).href;
export const websiteId = (site: URL) => new URL('/#website', site).href;

/** 다른 페이지에서 사업체를 가리킬 때 쓰는 참조 노드. */
export const businessRef = (site: URL) => ({ '@id': businessId(site) });
export const websiteRef = (site: URL) => ({ '@id': websiteId(site) });

type Node = Record<string, unknown>;

/**
 * 사업체 전체 정의 (AutoRepair = LocalBusiness 하위). **메인 페이지 전용.**
 * @param images 사업장 외관 사진 절대 URL (호출부에서 astro:assets 로 해석해 넘긴다)
 * @param logo   로고 절대 URL
 */
export function autoRepairNode(site: URL, { images, logo }: { images: string[]; logo: string }): Node {
  // sameAs — 실재가 확인된 채널만. 구글 비즈니스 프로필은 URL 미확인 상태라 값이 들어오면 자동 포함된다.
  const sameAs = [
    business.booking.naverBlogUrl,
    business.maps.naverPlace,
    business.googleBusinessUrl,
  ].filter((u): u is string => !!u);

  return {
    '@type': 'AutoRepair',
    '@id': businessId(site),
    name: business.name,
    alternateName: [...business.alternateNames],
    url: new URL('/', site).href,
    telephone: business.phone.intl,
    image: images,
    logo,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.address.geo.lat,
      longitude: business.address.geo.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: business.hours.weekday.opens,
        closes: business.hours.weekday.closes,
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: business.hours.saturday.opens,
        closes: business.hours.saturday.closes,
      },
      // 일요일은 항목을 두지 않는다 (휴무 = 미기재)
    ],
    areaServed: [...business.seoRegions], // A계열 — SEO 키워드 축. accessRegions 는 쓰지 않는다.
    knowsAbout: business.brands.map((b) => `${b} 정비`),
    sameAs,
  };
}

/** 사이트 엔티티. **메인 페이지 전용** — 다른 페이지는 websiteRef 로 가리킨다. */
export function webSiteNode(site: URL): Node {
  return {
    '@type': 'WebSite',
    '@id': websiteId(site),
    url: new URL('/', site).href,
    name: business.name,
    inLanguage: 'ko-KR',
    publisher: businessRef(site),
  };
}

/**
 * 페이지 노드 — 전 페이지 공통.
 * 사업체 전체 정의가 메인에만 있으므로, 다른 페이지는 이 노드의 publisher 로 #business 에 연결된다.
 */
export function webPageNode(
  site: URL,
  { canonical, title, description }: { canonical: string; title: string; description: string },
): Node {
  return {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: 'ko-KR',
    isPartOf: websiteRef(site),
    publisher: businessRef(site),
  };
}

export interface Crumb {
  name: string;
  /** 사이트 루트 기준 경로 (예: '/cases/') */
  path: string;
}

/**
 * 빵부스러기. 첫 항목 '홈'은 자동으로 붙는다 — 호출부는 그 뒤만 넘긴다.
 * ⚠️ 사례 글 URL 은 루트(`/slug/`)에 있지만 경로 표시는 `/cases/` 를 거치게 한다. URL 자체는 바꾸지 않는다.
 */
export function breadcrumbNode(site: URL, trail: Crumb[]): Node {
  const items = [{ name: '홈', path: '/' }, ...trail];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: new URL(c.path, site).href,
    })),
  };
}

/** FAQ 노드. 페이지당 1개. */
export function faqNode(canonical: string, faqs: readonly { q: string; a: string }[]): Node {
  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * 정비 사례 글 노드.
 * - datePublished 는 프론트매터 `date` (작성·발행일, 예외 없음)
 * - image 는 빌드된 실제 절대 URL — 본문 Figure 방식(`src=` / `img={}`)과 무관하게
 *   thumbnail(astro image())에서 만들어지므로 77건 전부 동일 경로를 탄다.
 */
export function casePostNode(
  site: URL,
  {
    canonical,
    headline,
    description,
    datePublished,
    image,
    brand,
    carModel,
    keywords,
  }: {
    canonical: string;
    headline: string;
    description: string;
    datePublished: string;
    image: string;
    brand: string;
    carModel: string;
    keywords: string[];
  },
): Node {
  return {
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    headline,
    description,
    datePublished,
    image,
    inLanguage: 'ko-KR',
    mainEntityOfPage: canonical,
    isPartOf: websiteRef(site),
    author: businessRef(site),
    publisher: businessRef(site),
    about: {
      '@type': 'Vehicle',
      name: carModel,
      brand: { '@type': 'Brand', name: brand },
    },
    keywords,
  };
}

/** 한 페이지의 노드들을 하나의 @graph 로 묶는다. */
export function graph(nodes: Node[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
