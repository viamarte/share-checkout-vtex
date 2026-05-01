export const BRIDGE_MESSAGE_SOURCE = 'share-checkout:page';
export const BRIDGE_MESSAGE_TYPE = 'share-checkout:order-form';
export const BRIDGE_REQUEST_EVENT = 'share-checkout:collect';
export const EXTENSION_UTM_SOURCE = 'share-checkout';

export function normalizeOrderFormId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isCheckoutUrl(href) {
  return typeof href === 'string' && href.includes('/checkout');
}

export function parseUrlSnapshot(href) {
  if (typeof href !== 'string' || href.length === 0) {
    return {
      href: '',
      protocol: '',
      host: '',
      pathname: '',
      search: '',
      hash: '',
    };
  }

  try {
    const url = new URL(href);

    return {
      href: url.href,
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
  } catch (_error) {
    return {
      href,
      protocol: '',
      host: '',
      pathname: '',
      search: '',
      hash: '',
    };
  }
}

export function buildCheckoutState(href, orderFormId) {
  const urlSnapshot = parseUrlSnapshot(href);
  const normalizedOrderFormId = normalizeOrderFormId(orderFormId);
  const checkout = isCheckoutUrl(urlSnapshot.href);
  const available = checkout && normalizedOrderFormId.length > 0;

  return {
    ...urlSnapshot,
    isCheckout: checkout,
    isAvailable: available,
    orderFormId: available ? normalizedOrderFormId : '',
    updatedAt: Date.now(),
  };
}

export function buildCheckoutLink(href, orderFormId, includeUtmSource) {
  const normalizedOrderFormId = normalizeOrderFormId(orderFormId);

  if (!normalizedOrderFormId) return '';

  const currentUrl = new URL(href);
  const targetUrl = new URL(
    '/checkout',
    `${currentUrl.protocol}//${currentUrl.host}`,
  );
  const params = new URLSearchParams();

  params.set('orderFormId', normalizedOrderFormId);

  if (includeUtmSource) {
    params.set('utm_source', EXTENSION_UTM_SOURCE);
  }

  for (const [key, value] of currentUrl.searchParams.entries()) {
    const normalizedKey = key.toLowerCase();

    if (normalizedKey === 'orderformid' || normalizedKey === 'utm_source') {
      continue;
    }

    params.append(key, value);
  }

  const serializedParams = params.toString();
  targetUrl.search = serializedParams.length > 0 ? `?${serializedParams}` : '';
  targetUrl.hash = currentUrl.hash;

  return targetUrl.toString();
}

export function detectLocale(language) {
  return /^pt(?:-|$)/i.test(language || '') ? 'pt-BR' : 'en';
}
