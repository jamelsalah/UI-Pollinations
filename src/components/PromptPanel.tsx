import React, { useState } from 'react';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

export function PromptPanel(): React.JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  // Muda a cada clique para forçar o recarregamento do <img> mesmo com o mesmo prompt.
  const [genId, setGenId] = useState(0);

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const url = `${POLLINATIONS_BASE}${encodeURIComponent(trimmed)}`;
    setImageUrl(url);
    setStatus('loading');
    setGenId((n) => n + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleGenerate();
  }

  const isLoading = status === 'loading';

  return (
    <section className="panel">
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
      </div>

      {status === 'loading' && (
        <p className="panel__status panel__status--loading">Gerando imagem, aguarde…</p>
      )}
      {status === 'error' && (
        <p className="panel__status panel__status--error" role="alert">
          Não foi possível gerar a imagem. Tente novamente.
        </p>
      )}

      {imageUrl && (
        <div className="panel__result" hidden={status !== 'loaded'}>
          <img
            className="panel__image"
            key={genId}
            src={imageUrl}
            alt={prompt}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
          />
        </div>
      )}
    </section>
  );
}
