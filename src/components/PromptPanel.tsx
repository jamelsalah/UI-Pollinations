import React, { useState } from 'react';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';

export function PromptPanel(): React.JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    // Monta a URL pública do Pollinations a partir do prompt.
    const url = `${POLLINATIONS_BASE}${encodeURIComponent(trimmed)}`;
    setImageUrl(url);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleGenerate();
  }

  return (
    <section>
      <div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Descreva a imagem que você quer gerar…"
        />
        <button onClick={handleGenerate} disabled={!prompt.trim()}>
          Gerar
        </button>
      </div>

      {imageUrl && (
        <div>
          <img src={imageUrl} alt={prompt} />
        </div>
      )}
    </section>
  );
}
