---
applyTo: "src/**/*.js,src/**/*.json,extension.config.js,test/**/*.js"
description: "Use when working on the VTEX checkout browser extension runtime, popup UI, content script bridge, manifest, or extension test coverage."
---

# Contexto da extensão

Este repositório implementa uma extensão cross-browser para capturar o `orderFormId` em páginas de checkout VTEX e copiar um link de checkout pronto para compartilhamento. O produto entregue é propositalmente enxuto e gira em torno do popup da extensão.

## Regras de arquitetura

- Preserve uma única base de código para Chromium e Firefox sempre que isso for viável.
- Centralize diferenças entre navegadores em pontos pequenos e explícitos.
- Prefira manter leitura do estado VTEX no page bridge e no content script.
- Prefira manter experiência do usuário, locale e copy do link no popup.
- Não adicione background script ou UI injetada na página sem justificativa técnica clara.

## Regras de implementação

- Ao adicionar comportamento VTEX, documente quais páginas, seletores, eventos ou estruturas da plataforma foram assumidos.
- Se uma nova permissão for necessária, atualize o manifesto e a documentação juntos.
- Quando precisar ler `window.vtexjs.checkout.orderFormId`, use um bridge no contexto da página. Não assuma acesso direto do content script a objetos definidos pelo site.
- Se houver mensagens entre popup e content script, use tipos de mensagem estáveis e nomeados de forma semântica.
- Evite depender de placeholders do starter ou de qualquer superfície de sidebar que não faz mais parte do produto.

## Regras de teste

- Testes devem validar o comportamento da extensão, não apenas a presença de arquivos.
- Cubra pelo menos a formatação do link, a normalização do `orderFormId` e o suporte a locale `en` e `pt-BR`.
- Se alterar o contrato entre popup e content script, atualize os testes e documente a mudança no README.
