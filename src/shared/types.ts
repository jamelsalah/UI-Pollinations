// Tipos compartilhados entre main, preload e renderer (apenas em tempo de compilação).

export interface SaveImageRequest {
  // Bytes da imagem já baixada no renderer (garante salvar exatamente o que está na tela).
  bytes: ArrayBuffer;
  prompt: string;
  contentType: string;
}

export interface SaveImageResult {
  ok: boolean;
  filePath?: string;
  error?: string;
}

// Contrato da API que o preload expõe em window.api.
export interface WindowApi {
  saveImage: (request: SaveImageRequest) => Promise<SaveImageResult>;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
