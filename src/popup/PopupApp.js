import iconUrl from '../images/icon.png';
import {
  buildCheckoutLink,
  buildCheckoutState,
  detectLocale,
  EXTENSION_UTM_SOURCE,
} from '../shared/checkout.js';

const FIREFOX_STATE_PROBE = `(() => {
  try {
    const pageWindow = window.wrappedJSObject || window;
    const value = pageWindow?.vtexjs?.checkout?.orderFormId;

    return {
      href: window.location.href,
      orderFormId: typeof value === 'string' ? value.trim() : '',
    };
  } catch (_error) {
    return {
      href: window.location.href,
      orderFormId: '',
    };
  }
})()`;

const RETRY_REFRESH_DELAY_MS = 1400;
const UTM_SOURCE_PREFERENCE_STORAGE_KEY = 'shareCheckout.includeUtmSource';

const translations = {
  en: {
    eyebrow: 'VTEX utility',
    title: 'Share checkout link',
    subtitle:
      'Open this popup on a VTEX checkout page to capture the current orderForm and copy a ready-to-send link.',
    statusReady: 'Ready',
    statusUnavailable: 'Unavailable',
    statusLoading: 'Checking',
    hostLabel: 'Store host',
    orderFormLabel: 'Order form ID',
    previewLabel: 'Checkout link preview',
    includeUtmLabel: `Include utm_source=${EXTENSION_UTM_SOURCE}`,
    primaryAction: 'Copy checkout link',
    secondaryAction: 'Copy ID',
    refreshAction: 'Refresh',
    emptyHost: 'No active page detected',
    emptyOrderForm: 'VTEX order form not detected',
    emptyPreview:
      'The generated checkout link will appear here when a valid orderForm is available.',
    unavailableMessage:
      'The current tab is not exposing a valid VTEX orderFormId. Open a VTEX checkout page and try again.',
    loadingMessage: 'Checking the current tab for VTEX checkout data.',
    successMessage: 'The checkout link is ready to be shared.',
    copiedLinkAlert: 'Checkout link copied.',
    copiedIdAlert: 'Order form ID copied.',
    creditPrefix: 'Made with ❤️ by',
    creditLinkLabel: 'Via Marte',
  },
  'pt-BR': {
    eyebrow: 'Utilitário VTEX',
    title: 'Compartilhar checkout',
    subtitle:
      'Abra este popup em uma página de checkout VTEX para capturar o orderForm atual e copiar um link pronto para envio.',
    statusReady: 'Pronto',
    statusUnavailable: 'Indisponível',
    statusLoading: 'Verificando',
    hostLabel: 'Host da loja',
    orderFormLabel: 'ID do orderForm',
    previewLabel: 'Prévia do link de checkout',
    includeUtmLabel: `Incluir utm_source=${EXTENSION_UTM_SOURCE}`,
    primaryAction: 'Copiar link do checkout',
    secondaryAction: 'Copiar ID',
    refreshAction: 'Atualizar',
    emptyHost: 'Nenhuma página ativa detectada',
    emptyOrderForm: 'OrderForm VTEX não detectado',
    emptyPreview:
      'O link de checkout gerado aparecerá aqui quando houver um orderForm válido.',
    unavailableMessage:
      'A aba atual não expõe um orderFormId VTEX válido. Abra uma página de checkout VTEX e tente novamente.',
    loadingMessage:
      'Verificando a aba atual em busca dos dados do checkout VTEX.',
    successMessage: 'O link de checkout está pronto para compartilhamento.',
    copiedLinkAlert: 'Link do checkout copiado.',
    copiedIdAlert: 'ID do orderForm copiado.',
    creditPrefix: 'Feito com ❤️ pela',
    creditLinkLabel: 'Via Marte',
  },
};

const locale = resolveLocale();
const text = translations[locale];

let autoRefreshTimerId = null;
let copySuccessMessage = '';
let includeUtmSource = loadIncludeUtmSourcePreference();
let currentState = buildCheckoutState('', '');
let isLoading = false;

const root = document.getElementById('root');

if (root) {
  renderShell(root);
  wireEvents(root);
  refreshState({ forceLoading: true });
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

function setDataAttribute(element, name) {
  element.setAttribute(`data-${name}`, '');
  return element;
}

function renderShell(container) {
  const shell = createElement('div', 'popup_shell');
  const card = createElement('div', 'popup_card');
  const header = createElement('header', 'popup_header');
  const brand = createElement('div', 'popup_brand');
  const logo = createElement('img', 'popup_logo');
  const brandText = createElement('div');
  const eyebrow = createElement('p', 'popup_eyebrow', text.eyebrow);
  const title = createElement('h1', 'popup_title', text.title);
  const status = setDataAttribute(
    createElement('span', 'popup_status', text.statusLoading),
    'status',
  );
  const subtitle = createElement('p', 'popup_subtitle', text.subtitle);
  const success = setDataAttribute(
    createElement('section', 'popup_success'),
    'copy-success',
  );
  const footer = createElement('div', 'popup_footer');
  const message = setDataAttribute(
    createElement('p', 'popup_message', text.loadingMessage),
    'message',
  );
  const copyLinkButton = setDataAttribute(
    createElement('button', 'popup_primary_button', text.primaryAction),
    'copy-link',
  );
  const grid = createElement('section', 'popup_grid');
  const hostPanel = createElement('article', 'popup_panel');
  const hostLabel = createElement('p', 'popup_label', text.hostLabel);
  const hostValue = setDataAttribute(
    createElement('p', 'popup_value', text.emptyHost),
    'host',
  );
  const orderFormPanel = createElement('article', 'popup_panel');
  const orderFormHeader = createElement('div', 'popup_panel_header');
  const orderFormLabel = createElement('p', 'popup_label', text.orderFormLabel);
  const copyIdButton = setDataAttribute(
    createElement('button', 'popup_inline_button', text.secondaryAction),
    'copy-id',
  );
  const orderFormValue = setDataAttribute(
    createElement('p', 'popup_value popup_value_code', text.emptyOrderForm),
    'order-form',
  );
  const previewPanel = createElement(
    'section',
    'popup_panel popup_panel_preview',
  );
  const previewHeader = createElement('div', 'popup_panel_header');
  const previewLabel = createElement('p', 'popup_label', text.previewLabel);
  const refreshButton = setDataAttribute(
    createElement('button', 'popup_inline_button', text.refreshAction),
    'refresh',
  );
  const previewValue = setDataAttribute(
    createElement('p', 'popup_value popup_value_preview', text.emptyPreview),
    'link-preview',
  );
  const checkboxLabel = createElement('label', 'popup_checkbox');
  const utmCheckbox = setDataAttribute(createElement('input'), 'utm-checkbox');
  const utmText = createElement('span', '', text.includeUtmLabel);
  const credit = createElement('p', 'popup_credit');
  const creditPrefix = createElement('span', '', text.creditPrefix);
  const creditLink = createElement(
    'a',
    'popup_credit_link',
    text.creditLinkLabel,
  );

  logo.src = iconUrl;
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');

  success.hidden = true;
  success.setAttribute('aria-live', 'polite');

  copyLinkButton.type = 'button';
  copyIdButton.type = 'button';
  refreshButton.type = 'button';

  grid.setAttribute('aria-label', 'Checkout details');

  utmCheckbox.type = 'checkbox';
  utmCheckbox.checked = includeUtmSource;

  creditLink.href = 'https://github.com/viamarte/share-checkout-vtex';
  creditLink.target = '_blank';
  creditLink.rel = 'noreferrer';

  brandText.append(eyebrow, title);
  brand.append(logo, brandText);
  header.append(brand, status);
  footer.append(message, copyLinkButton);
  hostPanel.append(hostLabel, hostValue);
  orderFormHeader.append(orderFormLabel, copyIdButton);
  orderFormPanel.append(orderFormHeader, orderFormValue);
  grid.append(hostPanel, orderFormPanel);
  previewHeader.append(previewLabel, refreshButton);
  previewPanel.append(previewHeader, previewValue);
  checkboxLabel.append(utmCheckbox, utmText);
  credit.append(creditPrefix, document.createTextNode(' '), creditLink);
  card.append(
    header,
    subtitle,
    success,
    footer,
    grid,
    previewPanel,
    checkboxLabel,
    credit,
  );
  shell.append(card);
  container.replaceChildren(shell);
}

function wireEvents(container) {
  const copyLinkButton = container.querySelector('[data-copy-link]');
  const copyIdButton = container.querySelector('[data-copy-id]');
  const refreshButton = container.querySelector('[data-refresh]');
  const utmCheckbox = container.querySelector('[data-utm-checkbox]');

  copyLinkButton?.addEventListener('click', handleCopyLink);
  copyIdButton?.addEventListener('click', handleCopyOrderFormId);
  refreshButton?.addEventListener('click', () => {
    refreshState({ forceLoading: true });
  });
  utmCheckbox?.addEventListener('change', (event) => {
    includeUtmSource = event.currentTarget.checked;
    persistIncludeUtmSourcePreference(includeUtmSource);
    renderState(container);
  });
}

async function handleCopyLink() {
  if (!currentState.isAvailable) return;

  const link = buildCheckoutLink(
    currentState.href,
    currentState.orderFormId,
    includeUtmSource,
  );

  if (!link) return;

  await copyText(link);
  showCopySuccess(text.copiedLinkAlert);
}

async function handleCopyOrderFormId() {
  if (!currentState.isAvailable) return;

  await copyText(currentState.orderFormId);
  showCopySuccess(text.copiedIdAlert);
}

async function refreshState({ forceLoading }) {
  if (forceLoading) {
    isLoading = true;
    renderState(root);
  }

  currentState = await getActiveTabState();
  isLoading = false;
  renderState(root);

  if (currentState.isCheckout && !currentState.isAvailable) {
    scheduleAutoRefresh();
  }
}

function scheduleAutoRefresh() {
  window.clearTimeout(autoRefreshTimerId);
  autoRefreshTimerId = window.setTimeout(() => {
    refreshState({ forceLoading: false });
  }, RETRY_REFRESH_DELAY_MS);
}

function renderState(container) {
  if (!container) return;

  const statusElement = container.querySelector('[data-status]');
  const hostElement = container.querySelector('[data-host]');
  const orderFormElement = container.querySelector('[data-order-form]');
  const previewElement = container.querySelector('[data-link-preview]');
  const messageElement = container.querySelector('[data-message]');
  const copySuccessElement = container.querySelector('[data-copy-success]');
  const copyLinkButton = container.querySelector('[data-copy-link]');
  const copyIdButton = container.querySelector('[data-copy-id]');
  const utmCheckbox = container.querySelector('[data-utm-checkbox]');

  const hostValue = currentState.host || text.emptyHost;
  const orderFormValue = currentState.orderFormId || text.emptyOrderForm;
  const linkPreview = currentState.isAvailable
    ? buildCheckoutLink(
        currentState.href,
        currentState.orderFormId,
        includeUtmSource,
      )
    : text.emptyPreview;

  if (statusElement) {
    statusElement.textContent = isLoading
      ? text.statusLoading
      : currentState.isAvailable
        ? text.statusReady
        : text.statusUnavailable;
    statusElement.dataset.state = isLoading
      ? 'loading'
      : currentState.isAvailable
        ? 'ready'
        : 'unavailable';
  }

  if (hostElement) hostElement.textContent = hostValue;
  if (orderFormElement) orderFormElement.textContent = orderFormValue;
  if (previewElement) previewElement.textContent = linkPreview;
  if (utmCheckbox) utmCheckbox.checked = includeUtmSource;

  if (copySuccessElement) {
    copySuccessElement.textContent = copySuccessMessage;
    copySuccessElement.hidden = !copySuccessMessage;
  }

  if (messageElement) {
    messageElement.textContent = isLoading
      ? text.loadingMessage
      : currentState.isAvailable
        ? text.successMessage
        : text.unavailableMessage;
  }

  if (copyLinkButton) copyLinkButton.disabled = !currentState.isAvailable;
  if (copyIdButton) copyIdButton.disabled = !currentState.isAvailable;
}

async function getActiveTabState() {
  const activeTab = await queryActiveTab();

  if (!activeTab?.id) {
    return buildCheckoutState('', '');
  }

  try {
    return await collectTabState(activeTab);
  } catch (_error) {
    return buildCheckoutState(activeTab.url || '', '');
  }
}

async function queryActiveTab() {
  if (typeof browser !== 'undefined' && browser.tabs?.query) {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs[0] || null;
  }

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0] || null);
    });
  });
}

async function collectTabState(activeTab) {
  const fallbackHref = activeTab.url || '';
  const snapshot = await executeStateProbe(activeTab.id);

  return buildCheckoutState(
    snapshot?.href || fallbackHref,
    snapshot?.orderFormId || '',
  );
}

async function executeStateProbe(tabId) {
  if (typeof browser !== 'undefined' && browser.tabs?.executeScript) {
    const results = await browser.tabs.executeScript(tabId, {
      code: FIREFOX_STATE_PROBE,
    });

    return results?.[0] || null;
  }

  if (chrome.scripting?.executeScript) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: readChromeTabState,
    });

    return results?.[0]?.result || null;
  }

  return null;
}

function readChromeTabState() {
  try {
    const value = window.vtexjs?.checkout?.orderFormId;

    return {
      href: window.location.href,
      orderFormId: typeof value === 'string' ? value.trim() : '',
    };
  } catch (_error) {
    return {
      href: window.location.href,
      orderFormId: '',
    };
  }
}

async function copyText(textToCopy) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(textToCopy);
  }

  const textarea = document.createElement('textarea');
  textarea.value = textToCopy;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function showCopySuccess(message) {
  copySuccessMessage = message;
  renderState(root);
}

function loadIncludeUtmSourcePreference() {
  try {
    const savedPreference = window.localStorage.getItem(
      UTM_SOURCE_PREFERENCE_STORAGE_KEY,
    );

    if (savedPreference === null) {
      return true;
    }

    return savedPreference === 'true';
  } catch (_error) {
    return true;
  }
}

function persistIncludeUtmSourcePreference(value) {
  try {
    window.localStorage.setItem(
      UTM_SOURCE_PREFERENCE_STORAGE_KEY,
      String(value),
    );
  } catch (_error) {
    // Ignore storage failures and keep the current in-memory choice.
  }
}

function resolveLocale() {
  try {
    if (typeof browser !== 'undefined' && browser.i18n?.getUILanguage) {
      return detectLocale(browser.i18n.getUILanguage());
    }

    if (chrome.i18n?.getUILanguage) {
      return detectLocale(chrome.i18n.getUILanguage());
    }
  } catch (_error) {
    return detectLocale(navigator.language);
  }

  return detectLocale(navigator.language);
}
