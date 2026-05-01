import {
  BRIDGE_MESSAGE_SOURCE,
  BRIDGE_MESSAGE_TYPE,
  BRIDGE_REQUEST_EVENT,
  buildCheckoutState,
  normalizeOrderFormId,
} from '../shared/checkout.js';

const BRIDGE_RESPONSE_TIMEOUT_MS = 1200;
const BRIDGE_SCRIPT_SELECTOR = 'script[data-share-checkout-bridge="true"]';
const PAGE_BRIDGE_PATH = 'content/pageBridge.js';

let bridgeInjected = false;
let latestState = buildCheckoutState(window.location.href, '');
let pendingRequests = [];

setupRuntimeMessaging();
setupPageBridge();

function setupRuntimeMessaging() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'getOrderFormState') {
      return undefined;
    }

    requestLatestState(message.reason || 'popup-open')
      .then((state) => sendResponse({ state }))
      .catch(() => sendResponse({ state: fallbackState() }));

    return true;
  });
}

function setupPageBridge() {
  window.addEventListener('message', handleBridgeMessage);
  injectBridgeScript();
  requestLatestState('content-bootstrap').catch(() => {
    latestState = fallbackState();
  });
}

function handleBridgeMessage(event) {
  if (event.source !== window) return;

  const data = event.data;

  if (
    !data ||
    data.source !== BRIDGE_MESSAGE_SOURCE ||
    data.type !== BRIDGE_MESSAGE_TYPE
  ) {
    return;
  }

  latestState = buildCheckoutState(window.location.href, data.orderFormId);
  settlePendingRequests(latestState);
}

function injectBridgeScript() {
  if (bridgeInjected || document.querySelector(BRIDGE_SCRIPT_SELECTOR)) {
    bridgeInjected = true;
    return;
  }

  const script = document.createElement('script');
  script.src = resolvePageBridgeUrl();
  script.dataset.shareCheckoutBridge = 'true';
  script.async = false;
  script.onload = () => {
    bridgeInjected = true;
    script.remove();
  };
  script.onerror = () => {
    bridgeInjected = false;
    script.remove();
  };

  const target = document.head || document.documentElement;

  if (!target) return;

  target.appendChild(script);
}

function resolvePageBridgeUrl() {
  if (typeof browser !== 'undefined' && browser.runtime?.getURL) {
    return browser.runtime.getURL(PAGE_BRIDGE_PATH);
  }

  if (chrome.runtime?.getURL) {
    return chrome.runtime.getURL(PAGE_BRIDGE_PATH);
  }

  return PAGE_BRIDGE_PATH;
}

function requestLatestState(reason) {
  if (!bridgeInjected) {
    latestState = fallbackState();
    return Promise.resolve(latestState);
  }

  return new Promise((resolve) => {
    const pendingRequest = {
      resolve,
      timeoutId: window.setTimeout(() => {
        pendingRequests = pendingRequests.filter(
          (request) => request !== pendingRequest,
        );
        resolve(fallbackState());
      }, BRIDGE_RESPONSE_TIMEOUT_MS),
    };

    pendingRequests.push(pendingRequest);
    dispatchBridgeRequest(reason);
  });
}

function dispatchBridgeRequest(reason) {
  window.dispatchEvent(
    new CustomEvent(BRIDGE_REQUEST_EVENT, {
      detail: { reason },
    }),
  );
}

function settlePendingRequests(state) {
  const shouldResolve = state.isAvailable || !state.isCheckout;

  if (!shouldResolve) {
    return;
  }

  const pending = pendingRequests;
  pendingRequests = [];

  for (const request of pending) {
    window.clearTimeout(request.timeoutId);
    request.resolve(state);
  }
}

function fallbackState() {
  return buildCheckoutState(window.location.href, readDirectOrderFormId());
}

function readDirectOrderFormId() {
  try {
    const pageWindow = window.wrappedJSObject || window;

    return normalizeOrderFormId(pageWindow?.vtexjs?.checkout?.orderFormId);
  } catch (_error) {
    return '';
  }
}
