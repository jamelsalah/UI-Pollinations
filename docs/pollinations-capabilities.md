# Capacidades da API gratuita do Pollinations

Gerado por `scripts/probe-pollinations.ts` em 2026-07-09T18:59:30.632Z.
Prompt de teste: `a red apple on a wooden table`

## Resumo e conclusões (interpretação manual)

> As tabelas abaixo são geradas pelo script; esta seção é escrita à mão a partir delas.

- **Modelo:** `/models` retornou apenas **`sana`**. Pedir `model=flux` devolveu **0 bytes**
  (imagem vazia) → **flux indisponível no anônimo**; `model=turbo` funcionou (igual ao padrão).
  → No app, usar o padrão (**sana**)/turbo; flux provavelmente exige conta.
- **Tamanho máximo:** pedidos de **1024²** e **1280²** voltaram como **768×768** (bytes idênticos)
  → o tier gratuito **limita a 768×768**. 512² funciona (512×512).
  → Oferecer tamanhos **até 768**; acima disso é capado.
- **Formato:** sempre **JPEG** (`image/jpeg`).
- **Parâmetros:** `enhance=true` e `nologo=true` deram bytes idênticos ao padrão (mesmo
  prompt/seed determinístico) → efeito não observável por bytes; `nologo` de todo modo exige
  conta para remover a marca d'água.
- **Rate limit / latência:** **nenhum 429**; porém em rajada cada imagem levou **27–46s**
  (hashes diferentes = imagens reais, não placeholder). → O limite se manifesta como
  **lentidão/enfileiramento**, não erro. **Crucial para a Fase 3:** o loop precisa de
  **timeout generoso** e espaçar bem as requisições.

## Modelos disponíveis

- `sana`

## Tamanhos

| Pedido | HTTP | Tipo | Bytes | Dimensão real |
|---|---|---|---|---|
| 512² | 200 | image/jpeg | 37160 | 512×512 |
| 768² | 200 | image/jpeg | 60094 | 768×768 |
| 1024² | 200 | image/jpeg | 60094 | 768×768 |
| 1280² | 200 | image/jpeg | 60094 | 768×768 |

## Parâmetros / qualidade

| Variação | HTTP | Tipo | Bytes |
|---|---|---|---|
| padrão (sem params) | 200 | image/jpeg | 57850 |
| model=flux | 200 | image/jpeg | 0 |
| model=turbo | 200 | image/jpeg | 57850 |
| enhance=true | 200 | image/jpeg | 57850 |
| nologo=true | 200 | image/jpeg | 57850 |

## Rate limit (requisições em rajada, sem espera)

| # | HTTP | Tempo (ms) | Bytes | Hash (12) |
|---|---|---|---|---|
| 1 | 200 | 27424 | 67042 | f982c807710a |
| 2 | 200 | 46223 | 62282 | 4f9353998e14 |
| 3 | 200 | 43965 | 50443 | c91126464b51 |
| 4 | 200 | 43637 | 60354 | 13de1e267ba2 |
| 5 | 200 | 44267 | 68771 | 92c3b88d3a97 |

> Hashes repetidos em respostas seguidas podem indicar imagem-placeholder de rate limit (issue #7207).
