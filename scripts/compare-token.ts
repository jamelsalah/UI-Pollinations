// Compara anônimo × autenticado de forma controlada (seeds novos, sem cache) para decidir
// se o token traz vantagem real. Requer POLLINATIONS_TOKEN no ambiente.
//   node --env-file=.env scripts/compare-token.ts
//
// Antes de medir, faz um "health check": se a API não devolver imagem (ex.: erro 530/1033
// do Cloudflare), aborta — assim não medimos tempo de erro achando que é geração.

import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const IMAGE_BASE = 'https://image.pollinations.ai';
const PROMPT = 'a lighthouse on a rocky coast at sunset';
const TOKEN = process.env.POLLINATIONS_TOKEN ?? '';
const RUN_BASE = Date.now() % 1_000_000;
const REPORT_PATH = path.join('docs', 'token-comparison.md');

interface Sample {
  seed: number;
  status: number;
  ms: number;
  bytes: number;
  hash: string;
  isImage: boolean;
}

function buildUrl(seed: number): string {
  const prompt = encodeURIComponent(PROMPT);
  return `${IMAGE_BASE}/prompt/${prompt}?seed=${seed}`;
}

// Uma resposta só conta como imagem de verdade se for 200, content-type de imagem e não minúscula.
function isImageResponse(status: number, contentType: string, bytes: number): boolean {
  return status === 200 && contentType.includes('image') && bytes > 1000;
}

// Faz uma requisição de geração; usa o header de token quando authenticated=true.
async function requestImage(seed: number, authenticated: boolean): Promise<Sample> {
  let init: RequestInit = {};
  if (authenticated) {
    init = { headers: { Authorization: `Bearer ${TOKEN}` } };
  }
  const startedAt = Date.now();
  const response = await fetch(buildUrl(seed), init);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  return {
    seed,
    status: response.status,
    ms: Date.now() - startedAt,
    bytes: buffer.length,
    hash,
    isImage: isImageResponse(response.status, contentType, buffer.length),
  };
}

// Confere se a API está no ar e devolvendo imagem antes de rodar a bateria de testes.
async function checkApiUp(): Promise<{ up: boolean; detail: string }> {
  const response = await fetch(buildUrl(RUN_BASE + 999));
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 200 && contentType.includes('image')) {
    return { up: true, detail: 'ok' };
  }
  const text = (await response.text()).slice(0, 80).replace(/\s+/g, ' ');
  return { up: false, detail: `HTTP ${response.status} | ${contentType} | ${text}` };
}

// Teste sequencial: uma requisição por vez (mede latência de geração pura).
async function runSequential(authenticated: boolean, seedStart: number, count: number): Promise<Sample[]> {
  const samples: Sample[] = [];
  for (let index = 0; index < count; index++) {
    samples.push(await requestImage(seedStart + index, authenticated));
  }
  return samples;
}

// Teste concorrente: dispara todas ao mesmo tempo (mede throughput / rate limit de submissão).
async function runConcurrent(
  authenticated: boolean,
  seedStart: number,
  count: number,
): Promise<{ samples: Sample[]; totalMs: number }> {
  const seeds: number[] = [];
  for (let index = 0; index < count; index++) {
    seeds.push(seedStart + index);
  }
  const startedAt = Date.now();
  const samples = await Promise.all(seeds.map((seed) => requestImage(seed, authenticated)));
  return { samples, totalMs: Date.now() - startedAt };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// Mediana considerando só as respostas que realmente são imagens.
function medianOfImages(samples: Sample[]): number {
  const valid = samples.filter((item) => item.isImage).map((item) => item.ms);
  return median(valid);
}

function sampleTable(samples: Sample[]): string[] {
  const lines: string[] = [];
  lines.push('| seed | HTTP | imagem? | ms | bytes | hash |');
  lines.push('|---|---|---|---|---|---|');
  for (const item of samples) {
    let ok = 'não';
    if (item.isImage) {
      ok = 'sim';
    }
    lines.push(`| ${item.seed} | ${item.status} | ${ok} | ${item.ms} | ${item.bytes} | ${item.hash} |`);
  }
  return lines;
}

async function main(): Promise<void> {
  if (TOKEN.length === 0) {
    console.error('Defina POLLINATIONS_TOKEN (ex.: node --env-file=.env ...).');
    process.exit(1);
  }

  console.log('Health check da API...');
  const health = await checkApiUp();
  if (!health.up) {
    console.error(`API indisponível — abortando. Detalhe: ${health.detail}`);
    process.exit(2);
  }

  console.log('Teste A — sequencial anônimo...');
  const seqAnon = await runSequential(false, RUN_BASE + 0, 4);
  console.log('Teste A — sequencial autenticado...');
  const seqAuth = await runSequential(true, RUN_BASE + 100, 4);

  console.log('Teste B — concorrente anônimo...');
  const conAnon = await runConcurrent(false, RUN_BASE + 200, 5);
  console.log('Teste B — concorrente autenticado...');
  const conAuth = await runConcurrent(true, RUN_BASE + 300, 5);

  const lines: string[] = [];
  lines.push('# Token vale a pena? Comparação controlada (seeds novos, sem cache)');
  lines.push('');
  lines.push(`Gerado em ${new Date().toISOString()}. Prompt: \`${PROMPT}\`.`);
  lines.push('');
  lines.push('## Conclusão objetiva (só respostas que são imagens)');
  lines.push('');
  lines.push(`- Latência sequencial mediana — **anônimo: ${medianOfImages(seqAnon)} ms**, **autenticado: ${medianOfImages(seqAuth)} ms**.`);
  lines.push(`- Concorrência (${conAnon.samples.length} em paralelo) — **anônimo: ${conAnon.totalMs} ms total**, **autenticado: ${conAuth.totalMs} ms total**.`);
  lines.push('');
  lines.push('## Teste A — sequencial anônimo');
  lines.push(...sampleTable(seqAnon));
  lines.push('');
  lines.push('## Teste A — sequencial autenticado');
  lines.push(...sampleTable(seqAuth));
  lines.push('');
  lines.push(`## Teste B — concorrente anônimo (total ${conAnon.totalMs} ms)`);
  lines.push(...sampleTable(conAnon.samples));
  lines.push('');
  lines.push(`## Teste B — concorrente autenticado (total ${conAuth.totalMs} ms)`);
  lines.push(...sampleTable(conAuth.samples));
  lines.push('');

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`Relatório salvo em ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error('Falha:', error);
  process.exit(1);
});
