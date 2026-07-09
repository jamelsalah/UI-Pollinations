// Sonda a API pública do Pollinations para mapear o que a versão gratuita oferece
// (modelos, tamanhos, formato e comportamento de rate limit) e gera um relatório.
//
// Anônimo:     node scripts/probe-pollinations.ts
// Autenticado: node --env-file=.env scripts/probe-pollinations.ts   (usa POLLINATIONS_TOKEN)

import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const IMAGE_BASE = 'https://image.pollinations.ai';
const SAMPLE_PROMPT = 'a red apple on a wooden table';

const AUTH_TOKEN = process.env.POLLINATIONS_TOKEN ?? '';
const IS_AUTHENTICATED = AUTH_TOKEN.length > 0;

// Espaçamento entre requisições "limpas": anônimo = 1/15s (16s de margem); com token (Seed) = 1/5s (6s).
let SPACED_DELAY_MS = 16_000;
if (IS_AUTHENTICATED) {
  SPACED_DELAY_MS = 6_000;
}

// Opções de fetch com o header de autenticação, quando há token.
function requestInit(): RequestInit {
  if (!IS_AUTHENTICATED) return {};
  return { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } };
}

// Relatório separado por modo, para conseguirmos comparar anônimo × autenticado.
function reportPath(): string {
  if (IS_AUTHENTICATED) return path.join('docs', 'pollinations-capabilities-auth.md');
  return path.join('docs', 'pollinations-capabilities.md');
}

interface SizeProbe {
  requested: number;
  status: number;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

interface ParamProbe {
  label: string;
  status: number;
  contentType: string;
  bytes: number;
}

interface RateProbe {
  index: number;
  status: number;
  ms: number;
  bytes: number;
  hashStart: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Monta a URL de geração com os parâmetros dados.
function buildImageUrl(prompt: string, params: Record<string, string | number>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }
  const encodedPrompt = encodeURIComponent(prompt);
  return `${IMAGE_BASE}/prompt/${encodedPrompt}?${query.toString()}`;
}

// Lê largura/altura de um PNG ou JPEG direto dos bytes, sem dependências externas.
function readImageSize(bytes: Buffer): { width: number; height: number } | null {
  const isPng = bytes.length > 24 && bytes.toString('ascii', 1, 4) === 'PNG';
  if (isPng) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  const isJpeg = bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isJpeg) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const isSizeMarker =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSizeMarker) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      const segmentLength = bytes.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
  }

  return null;
}

async function fetchModels(): Promise<string[]> {
  const response = await fetch(`${IMAGE_BASE}/models`, requestInit());
  if (!response.ok) return [];
  const data = await response.json();
  if (Array.isArray(data)) return data.map(String);
  return [];
}

async function probeSize(size: number): Promise<SizeProbe> {
  const url = buildImageUrl(SAMPLE_PROMPT, { width: size, height: size, seed: 1 });
  const response = await fetch(url, requestInit());
  const bytes = Buffer.from(await response.arrayBuffer());
  const dimensions = readImageSize(bytes);
  return {
    requested: size,
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    bytes: bytes.length,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };
}

async function probeParam(label: string, params: Record<string, string | number>): Promise<ParamProbe> {
  const url = buildImageUrl(SAMPLE_PROMPT, params);
  const response = await fetch(url, requestInit());
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    label,
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    bytes: bytes.length,
  };
}

// Dispara várias requisições SEM espera para observar o comportamento de rate limit.
async function probeRateLimit(count: number): Promise<RateProbe[]> {
  const results: RateProbe[] = [];
  for (let index = 0; index < count; index++) {
    const url = buildImageUrl(SAMPLE_PROMPT, { seed: 1000 + index });
    const startedAt = Date.now();
    const response = await fetch(url, requestInit());
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    results.push({
      index: index + 1,
      status: response.status,
      ms: Date.now() - startedAt,
      bytes: bytes.length,
      hashStart: hash,
    });
  }
  return results;
}

function buildReport(
  models: string[],
  sizes: SizeProbe[],
  params: ParamProbe[],
  rate: RateProbe[],
): string {
  let mode = 'anônimo';
  if (IS_AUTHENTICATED) {
    mode = 'autenticado (com token)';
  }

  const lines: string[] = [];
  lines.push('# Capacidades da API gratuita do Pollinations');
  lines.push('');
  lines.push(`Gerado por \`scripts/probe-pollinations.ts\` em ${new Date().toISOString()}.`);
  lines.push(`Modo: **${mode}**`);
  lines.push(`Prompt de teste: \`${SAMPLE_PROMPT}\``);
  lines.push('');

  lines.push('## Modelos disponíveis');
  lines.push('');
  if (models.length === 0) {
    lines.push('_Não foi possível obter a lista de modelos._');
  } else {
    for (const model of models) lines.push(`- \`${model}\``);
  }
  lines.push('');

  lines.push('## Tamanhos');
  lines.push('');
  lines.push('| Pedido | HTTP | Tipo | Bytes | Dimensão real |');
  lines.push('|---|---|---|---|---|');
  for (const item of sizes) {
    let realSize = '—';
    if (item.width && item.height) {
      realSize = `${item.width}×${item.height}`;
    }
    lines.push(`| ${item.requested}² | ${item.status} | ${item.contentType} | ${item.bytes} | ${realSize} |`);
  }
  lines.push('');

  lines.push('## Parâmetros / qualidade');
  lines.push('');
  lines.push('| Variação | HTTP | Tipo | Bytes |');
  lines.push('|---|---|---|---|');
  for (const item of params) {
    lines.push(`| ${item.label} | ${item.status} | ${item.contentType} | ${item.bytes} |`);
  }
  lines.push('');

  lines.push('## Rate limit (requisições em rajada, sem espera)');
  lines.push('');
  lines.push('| # | HTTP | Tempo (ms) | Bytes | Hash (12) |');
  lines.push('|---|---|---|---|---|');
  for (const item of rate) {
    lines.push(`| ${item.index} | ${item.status} | ${item.ms} | ${item.bytes} | ${item.hashStart} |`);
  }
  lines.push('');
  lines.push('> Hashes repetidos em respostas seguidas podem indicar imagem-placeholder de rate limit (issue #7207).');
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  let mode = 'anônimo';
  if (IS_AUTHENTICATED) {
    mode = 'autenticado';
  }
  console.log(`Modo: ${mode}`);

  console.log('1/4 Modelos...');
  const models = await fetchModels();

  console.log('2/4 Tamanhos (espaçado para respeitar o rate limit)...');
  const sizes: SizeProbe[] = [];
  for (const size of [512, 768, 1024, 1536, 2048]) {
    sizes.push(await probeSize(size));
    await sleep(SPACED_DELAY_MS);
  }

  console.log('3/4 Parâmetros (espaçado)...');
  const params: ParamProbe[] = [];
  const paramCases: Array<{ label: string; params: Record<string, string | number> }> = [
    { label: 'padrão (sem params)', params: {} },
    { label: 'model=flux', params: { model: 'flux' } },
    { label: 'model=turbo', params: { model: 'turbo' } },
    { label: 'enhance=true', params: { enhance: 'true' } },
    { label: 'nologo=true', params: { nologo: 'true' } },
  ];
  for (const paramCase of paramCases) {
    params.push(await probeParam(paramCase.label, paramCase.params));
    await sleep(SPACED_DELAY_MS);
  }

  console.log('4/4 Rate limit (rajada, sem espera)...');
  const rate = await probeRateLimit(5);

  const report = buildReport(models, sizes, params, rate);
  const outputPath = reportPath();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report, 'utf8');
  console.log(`Relatório salvo em ${outputPath}`);
}

main().catch((error) => {
  console.error('Falha na sondagem:', error);
  process.exit(1);
});
