import { app } from 'electron';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

// Transforma o prompt num pedaço de nome de arquivo seguro.
function slugify(text: string): string {
  const normalized = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove acentos (marcas diacríticas)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const trimmed = normalized.slice(0, 40);
  if (trimmed.length > 0) return trimmed;
  return 'imagem';
}

// Escolhe a extensão a partir do content-type.
function extensionFor(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

// Pasta base onde as imagens são salvas: ./images dentro do diretório do projeto.
export function imagesDirectory(): string {
  return path.join(app.getAppPath(), 'images');
}

// Salva os bytes de uma imagem no disco e devolve o caminho final.
export async function saveImageBytes(
  bytes: ArrayBuffer,
  prompt: string,
  seed: number,
  contentType: string,
): Promise<string> {
  const directory = imagesDirectory();
  await mkdir(directory, { recursive: true });
  const fileName = `${slugify(prompt)}-seed${seed}-${Date.now()}.${extensionFor(contentType)}`;
  const filePath = path.join(directory, fileName);
  await writeFile(filePath, Buffer.from(bytes));
  return filePath;
}
