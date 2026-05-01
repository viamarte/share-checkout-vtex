import assert from 'node:assert/strict';

import {
  buildCheckoutLink,
  buildCheckoutState,
  detectLocale,
  EXTENSION_UTM_SOURCE,
  normalizeOrderFormId,
} from '../src/shared/checkout.js';

function runTest(name, callback) {
  callback();
  console.log(`ok - ${name}`);
}

runTest('buildCheckoutState marks a valid checkout tab as available', () => {
  const state = buildCheckoutState(
    'https://store.example.com/checkout#/cart',
    '  abc-123  ',
  );

  assert.equal(state.isCheckout, true);
  assert.equal(state.isAvailable, true);
  assert.equal(state.orderFormId, 'abc-123');
  assert.equal(state.host, 'store.example.com');
  assert.equal(state.hash, '#/cart');
});

runTest(
  'buildCheckoutState clears the order form when the page is not checkout',
  () => {
    const state = buildCheckoutState(
      'https://store.example.com/account',
      'abc-123',
    );

    assert.equal(state.isCheckout, false);
    assert.equal(state.isAvailable, false);
    assert.equal(state.orderFormId, '');
  },
);

runTest(
  'buildCheckoutLink normalizes the URL and removes duplicate params',
  () => {
    const link = buildCheckoutLink(
      'https://store.example.com/checkout/cart?utm_source=old-source&coupon=VIP&orderFormId=old-id#payment',
      'fresh-id',
      true,
    );

    assert.equal(
      link,
      `https://store.example.com/checkout?orderFormId=fresh-id&utm_source=${EXTENSION_UTM_SOURCE}&coupon=VIP#payment`,
    );
  },
);

runTest(
  'buildCheckoutLink can omit the UTM source while preserving other params',
  () => {
    const link = buildCheckoutLink(
      'http://store.example.com/checkout?region=br&seller=1',
      'fresh-id',
      false,
    );

    assert.equal(
      link,
      'http://store.example.com/checkout?orderFormId=fresh-id&region=br&seller=1',
    );
  },
);

runTest(
  'detectLocale supports brazilian portuguese and english fallback',
  () => {
    assert.equal(detectLocale('pt-BR'), 'pt-BR');
    assert.equal(detectLocale('pt-PT'), 'pt-BR');
    assert.equal(detectLocale('en-US'), 'en');
  },
);

runTest('normalizeOrderFormId trims only valid strings', () => {
  assert.equal(normalizeOrderFormId('  id-1  '), 'id-1');
  assert.equal(normalizeOrderFormId(null), '');
  assert.equal(normalizeOrderFormId(undefined), '');
});
