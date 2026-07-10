import React, { useState } from 'react';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';

type Status = 'idle' | 'loading' | 'loaded' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function PromptPanel(): React.JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  // Muda a cada clique para forçar o recarregamento do <img> mesmo com o mesmo prompt.
  const [genId, setGenId] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedPath, setSavedPath] = useState<string | null>(null);

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const url = `${POLLINATIONS_BASE}${encodeURIComponent(trimmed)}`;
    setImageUrl(url);
    setStatus('loading');
    setGenId((n) => n + 1);
    setSaveStatus('idle');
    setSavedPath(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleGenerate();
  }

  async function handleSave() {
    if (!imageUrl) return;
    setSaveStatus('saving');
    try {
      // Pega os bytes que o <img> já baixou (cache) e envia ao main para gravar.
      const response = await fetch(imageUrl);
      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      const bytes = await response.arrayBuffer();
      const result = await window.api.saveImage({ bytes, prompt, contentType });
      if (result.ok && result.filePath) {
        setSavedPath(result.filePath);
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }

  const isLoading = status === 'loading';
  const isLoaded = status === 'loaded';

  return (
    <section className="panel">
      <div className="panel__stage">
        {status === 'idle' && (
          <p className="panel__placeholder">Sua imagem aparecerá aqui.</p>
        )}
        {status === 'loading' && (
          <p className="panel__status panel__status--loading">Gerando imagem, aguarde…</p>
        )}
        {status === 'error' && (
          <p className="panel__status panel__status--error" role="alert">
            Não foi possível gerar a imagem. Tente novamente.
          </p>
        )}
        {imageUrl && (
          <img
            className="panel__image"
            key={genId}
            src={imageUrl}
            alt={prompt}
            hidden={status !== 'loaded'}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
          />
        )}
      </div>

      <div className="panel__composer">
        <div className="panel__controls">
          <input
            className="panel__input"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva a imagem que você quer gerar…"
            disabled={isLoading}
          />
          <button
            className="panel__button"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Gerando…' : 'Gerar'}
          </button>
          {isLoaded && (
            <button
              className="panel__button panel__button--secondary"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>

        {saveStatus === 'saved' && savedPath && (
          <p className="panel__feedback">Salvo em: {savedPath}</p>
        )}
        {saveStatus === 'error' && (
          <p className="panel__feedback panel__feedback--error" role="alert">
            Não foi possível salvar a imagem.
          </p>
        )}
      </div>
    </section>
  );
}
