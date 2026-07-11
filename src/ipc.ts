import { ipcMain } from 'electron';
import type { SaveImageRequest, SaveImageResult } from './shared/types';
import { saveImageBytes } from './imageStore';

// Registra os handlers de IPC do processo principal.
export function registerIpcHandlers(): void {
  ipcMain.handle(
    'image:save',
    async (_event, request: SaveImageRequest): Promise<SaveImageResult> => {
      try {
        const filePath = await saveImageBytes(
          request.bytes,
          request.prompt,
          request.seed,
          request.contentType,
        );
        return { ok: true, filePath };
      } catch (error) {
        let message = 'Erro desconhecido ao salvar';
        if (error instanceof Error) {
          message = error.message;
        }
        return { ok: false, error: message };
      }
    },
  );
}
