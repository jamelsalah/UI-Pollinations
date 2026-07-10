import { contextBridge, ipcRenderer } from 'electron';
import type { SaveImageRequest } from './shared/types';

contextBridge.exposeInMainWorld('api', {
  saveImage: (request: SaveImageRequest) => ipcRenderer.invoke('image:save', request),
});
