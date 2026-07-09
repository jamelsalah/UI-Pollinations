# Capacidades da API gratuita do Pollinations

Gerado por `scripts/probe-pollinations.ts` em 2026-07-09T19:30:53.100Z.
Modo: **autenticado (com token)**
Prompt de teste: `a red apple on a wooden table`

## Resumo e conclusões — anônimo × autenticado (interpretação manual)

> ⚠️ **Correção:** a tabela de rate limit abaixo usou os **mesmos seeds do teste anônimo**,
> então as respostas vieram do **cache** (~0,4s) e **não** refletem geração real. Testes
> posteriores com **seeds novos** revelaram a verdade (registrada aqui).

- **O token NÃO acelera a geração (neste tier).** Com **seeds novos**, gerar levou **~15–45s**
  tanto autenticado (header `Authorization`) quanto anônimo. Os ~0,5s do relatório eram **cache**.
- **Cache (descoberta útil):** o Pollinations cacheia por **prompt + seed**; re-pedir a mesma
  combinação volta em **~0,4s**. (Foi isso que mascarou o teste autenticado.)
- **Token só no header:** passar `?token=` na URL **não** autentica; só funciona via
  `Authorization: Bearer`. Como `<img src>` não manda header, usar token exige gerar a imagem
  no **processo main**.
- **Modelo:** só `sana`; `model=flux` = 0 bytes mesmo logado.
- **Tamanho:** capado em **768×768** (1536²/2048² voltam 768).
- **Conclusão:** neste tier o token traz **pouco benefício observável** (rate limit de submissão
  1/5s vs 1/15s; sem ganho de velocidade, modelo ou tamanho). O benefício mais provável seria
  remover a marca d'água (`nologo`), o que exige inspeção visual para confirmar.

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
