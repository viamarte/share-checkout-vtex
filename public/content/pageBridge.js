(function shareCheckoutPageBridge() {
  const BRIDGE_MESSAGE_SOURCE = 'share-checkout:page';
  const BRIDGE_MESSAGE_TYPE = 'share-checkout:order-form';
  const BRIDGE_REQUEST_EVENT = 'share-checkout:collect';
  const RETRY_DELAYS_MS = [0, 250, 750, 1500, 3000];

  if (window.__shareCheckoutPageBridgeInstalled) {
    scheduleSnapshots('reconnect');
    return;
  }

  window.__shareCheckoutPageBridgeInstalled = true;

  let retryTimers = [];

  window.addEventListener(BRIDGE_REQUEST_EVENT, (event) => {
    scheduleSnapshots(event?.detail?.reason || 'manual-request');
  });

  window.addEventListener('popstate', () => {
    scheduleSnapshots('popstate');
  });

  window.addEventListener('hashchange', () => {
    scheduleSnapshots('hashchange');
  });

  window.addEventListener('pageshow', () => {
    scheduleSnapshots('pageshow');
  });

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  scheduleSnapshots('bootstrap');

  function wrapHistoryMethod(methodName) {
    const originalMethod = window.history[methodName];

    if (typeof originalMethod !== 'function') {
      return;
    }

    window.history[methodName] = function wrappedHistoryMethod(...args) {
      const result = originalMethod.apply(this, args);
      scheduleSnapshots(methodName);
      return result;
    };
  }

  function scheduleSnapshots(reason) {
    clearRetryTimers();

    for (const delay of RETRY_DELAYS_MS) {
      const timerId = window.setTimeout(() => {
        postSnapshot(reason);
      }, delay);

      retryTimers.push(timerId);
    }
  }

  function clearRetryTimers() {
    for (const timerId of retryTimers) {
      window.clearTimeout(timerId);
    }

    retryTimers = [];
  }

  function postSnapshot(reason) {
    window.postMessage(
      {
        source: BRIDGE_MESSAGE_SOURCE,
        type: BRIDGE_MESSAGE_TYPE,
        reason,
        orderFormId: readOrderFormId(),
      },
      '*',
    );
  }

  function readOrderFormId() {
    try {
      const value = window.vtexjs?.checkout?.orderFormId;
      return typeof value === 'string' ? value.trim() : '';
    } catch (_error) {
      return '';
    }
  }
})();
