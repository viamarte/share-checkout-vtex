import iconUrl from '../images/icon.png';
import {
  buildCheckoutLink,
  buildCheckoutState,
  detectLocale,
  EXTENSION_UTM_SOURCE,
} from '../shared/checkout.js';

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

function renderShell(container) {
  container.innerHTML = `
    <div class="popup_shell">
      <div class="popup_card">
        <header class="popup_header">
          <div class="popup_brand">
            <img class="popup_logo" src="${iconUrl}" alt="" aria-hidden="true" />
            <div>
              <p class="popup_eyebrow">${text.eyebrow}</p>
              <h1 class="popup_title">${text.title}</h1>
            </div>
          </div>
          <span class="popup_status" data-status>${text.statusLoading}</span>
        </header>

        <p class="popup_subtitle">${text.subtitle}</p>

        <section class="popup_success" data-copy-success hidden aria-live="polite"></section>

        <div class="popup_footer">
          <p class="popup_message" data-message>${text.loadingMessage}</p>
          <button type="button" class="popup_primary_button" data-copy-link>
            ${text.primaryAction}
          </button>
        </div>

        <section class="popup_grid" aria-label="Checkout details">
          <article class="popup_panel">
            <p class="popup_label">${text.hostLabel}</p>
            <p class="popup_value" data-host>${text.emptyHost}</p>
          </article>

          <article class="popup_panel">
            <div class="popup_panel_header">
              <p class="popup_label">${text.orderFormLabel}</p>
              <button type="button" class="popup_inline_button" data-copy-id>
                ${text.secondaryAction}
              </button>
            </div>
            <p class="popup_value popup_value_code" data-order-form>
              ${text.emptyOrderForm}
            </p>
          </article>
        </section>

        <section class="popup_panel popup_panel_preview">
          <div class="popup_panel_header">
            <p class="popup_label">${text.previewLabel}</p>
            <button type="button" class="popup_inline_button" data-refresh>
              ${text.refreshAction}
            </button>
          </div>
          <p class="popup_value popup_value_preview" data-link-preview>
            ${text.emptyPreview}
          </p>
        </section>

        <label class="popup_checkbox">
          <input type="checkbox" data-utm-checkbox ${includeUtmSource ? 'checked' : ''} />
          <span>${text.includeUtmLabel}</span>
        </label>

        <p class="popup_credit">
          <span>${text.creditPrefix}</span>
          <a
            class="popup_credit_link"
            href="https://github.com/viamarte/share-checkout-vtex"
            target="_blank"
            rel="noreferrer"
          >
            ${text.creditLinkLabel}
          </a>
        </p>
      </div>
    </div>
  `;
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
    const response = await sendTabMessage(activeTab.id, {
      type: 'getOrderFormState',
      reason: 'popup-open',
    });

    if (response?.state) {
      return response.state;
    }
  } catch (_error) {
    return buildCheckoutState(activeTab.url || '', '');
  }

  return buildCheckoutState(activeTab.url || '', '');
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

async function sendTabMessage(tabId, message) {
  if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
    return browser.tabs.sendMessage(tabId, message);
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
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
