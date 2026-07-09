# Capacidades da API gratuita do Pollinations

Gerado por `scripts/probe-pollinations.ts` em 2026-07-09T19:30:53.100Z.
Modo: **autenticado (com token)**
Prompt de teste: `a red apple on a wooden table`

## Resumo e conclusões — anônimo × autenticado (interpretação manual)

> As tabelas abaixo são geradas pelo script; esta seção é escrita à mão comparando com
> `pollinations-capabilities.md` (anônimo).

- **Velocidade é o grande ganho do token.** A rajada de 5 imagens levou **~0,5s cada**
  (469–608 ms) contra **27–46 s cada** no anônimo → **~70× mais rápido**, sem throttling.
  → Decisivo para o loop (Fase 3): com token o loop fica fluido.
- **Modelo:** ainda **só `sana`**; `model=flux` continua **0 bytes** mesmo autenticado
  → flux indisponível nesta conta/tier (provável tier pago ou endpoint diferente).
- **Tamanho:** ainda **capado em 768×768** (1536²/2048² voltam 768) → o token **não** aumentou
  o tamanho neste tier.
- **`nologo`/marca d'água:** bytes idênticos (imagem determinística) → não confirmável por
  bytes, precisa inspeção visual.
- **Conclusão para o app:** o token vale principalmente pela **latência/limite** (essencial no
  loop); **modelo e tamanho seguem iguais** ao anônimo. Por isso a opção anônimo × token
  (Fase 8) faz sentido — o token é "modo turbo" de velocidade.

## Modelos disponíveis

- `sana`

## Tamanhos

| Pedido | HTTP | Tipo | Bytes | Dimensão real |
|---|---|---|---|---|
| 512² | 200 | image/jpeg | 37160 | 512×512 |
| 768² | 200 | image/jpeg | 60094 | 768×768 |
| 1024² | 200 | image/jpeg | 60094 | 768×768 |
| 1536² | 200 | image/jpeg | 60094 | 768×768 |
| 2048² | 200 | image/jpeg | 60094 | 768×768 |

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
| 1 | 200 | 606 | 67042 | f982c807710a |
| 2 | 200 | 608 | 62282 | 4f9353998e14 |
| 3 | 200 | 505 | 50443 | c91126464b51 |
| 4 | 200 | 469 | 60354 | 13de1e267ba2 |
| 5 | 200 | 565 | 68771 | 92c3b88d3a97 |

> Hashes repetidos em respostas seguidas podem indicar imagem-placeholder de rate limit (issue #7207).
