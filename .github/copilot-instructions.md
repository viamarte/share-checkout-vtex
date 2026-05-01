# Instruções do Copilot para este repositório

## Objetivo do produto

Esta extensão de navegador existe para capturar o `orderFormId` do checkout VTEX aberto na aba atual e copiar um link de checkout pronto para compartilhamento.

## Estado atual do projeto

- A extensão tem escopo pequeno e intencional: popup no ícone da toolbar, detecção do `orderFormId` e cópia do link final.
- Não há sidebar, background script, botão flutuante ou formulários adicionais.
- A principal complexidade técnica está em ler `window.vtexjs.checkout.orderFormId` a partir de um page bridge.

## Stack e convenções principais

- Use JavaScript ESM simples, sem framework frontend neste momento.
- O empacotamento e o ambiente de desenvolvimento usam o pacote `extension`.
- O manifesto usa chaves específicas por navegador para suportar Chromium e Firefox a partir de uma única base.
- O projeto deve continuar priorizando compatibilidade cross-browser em vez de ramificações desnecessárias por navegador.
- O popup é a única interface visível da extensão.

## Arquitetura atual

- `src/manifest.json` define o popup da extensão, o content script global e o page bridge acessível pela página.
- `src/content/scripts.js` injeta o bridge, consolida o estado da aba atual e responde ao popup.
- `public/content/pageBridge.js` executa no contexto da página para ler `window.vtexjs.checkout.orderFormId`.
- `src/popup/index.html`, `src/popup/scripts.js`, `src/popup/PopupApp.js` e `src/popup/styles.css` implementam a experiência do usuário.
- `src/shared/checkout.js` centraliza a normalização do `orderFormId`, a detecção de checkout, locale e a geração do link final.

## Direção para implementações futuras

- Trate a captura do `orderFormId` e a cópia do link como a fonte de verdade do produto.
- Preserve a separação entre page bridge, content script e popup.
- Coloque leitura do estado VTEX no bridge ou no content script, nunca no popup.
- Coloque UX, copy, locale e formatação do link no popup ou em módulos compartilhados.
- Evite acoplar a lógica a seletores frágeis sem documentar claramente as dependências da UI VTEX.
- Sempre documente qualquer requisito novo de permissão no manifesto e o motivo da permissão.

## O que evitar

- Não reintroduzir texto de template genérico do Extension.js em novas features ou docs.
- Não assumir comportamento idêntico entre APIs `chrome.*` e `browser.*` sem tratar diferenças.
- Não criar uma UI injetada na página sem necessidade real do produto.
- Não tentar ler `window.vtexjs` diretamente do popup.
- Não tratar `window.vtexjs` como acessível diretamente do content script em todos os navegadores.

## Fluxo de trabalho

- Use `npm run dev` para desenvolvimento.
- Use `npm run build` para gerar o pacote padrão.
- Use `npm run build:chrome`, `npm run build:firefox` e `npm run build:edge` quando precisar de artefatos por navegador.
- Use `npm test` para validar a lógica compartilhada de checkout.
- Quando alterar comportamento de popup, locale ou formatação de link, atualize os testes de `test/checkout.test.js`.
