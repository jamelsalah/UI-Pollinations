import React, { useEffect, useRef, useState } from 'react';
import type { SaveImageResult } from '../shared/types';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';
// Intervalo mínimo entre o INÍCIO de duas requisições (anônimo = 1/15s; 16s de margem).
const LOOP_INTERVAL_MS = 16000;
const GEN_TIMEOUT_MS = 90000; // falha se a imagem não carregar nesse tempo
const BACKOFF_MS = 30000; // espera antes de tentar de novo após falha
const MAX_RETRIES = 3; // tentativas no mesmo seed antes de desistir

type Status = 'idle' | 'loading' | 'loaded' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function buildImageUrl(promptText: string, seedValue: number): string {
  return `${POLLINATIONS_BASE}${encodeURIComponent(promptText)}?seed=${seedValue}`;
}

export function PromptPanel(): React.JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null); // seed sendo gerado (loader)
  const [displayedUrl, setDisplayedUrl] = useState<string | null>(null); // imagem visível
  const [status, setStatus] = useState<Status>('idle');
  const [seed, setSeed] = useState<number | null>(null);
  const [genId, setGenId] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retries, setRetries] = useState(0);
  const [loopNotice, setLoopNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedPath, setSavedPath] = useState<string | null>(null);

  // Controle imperativo do loop (evita closures desatualizadas nos timers).
  const loopingRef = useRef(false);
  const seedRef = useRef(0);
  const requestStartRef = useRef(0);
  const retriesRef = useRef(0);
  const nextTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const genTimeoutRef = useRef<number | null>(null);

  function clearTimers() {
    if (nextTimerRef.current !== null) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }

  function clearGenTimeout() {
    if (genTimeoutRef.current !== null) {
      clearTimeout(genTimeoutRef.current);
      genTimeoutRef.current = null;
    }
  }

  // Limpa timers ao desmontar o componente.
  useEffect(() => {
    return () => {
      clearTimers();
      clearGenTimeout();
    };
  }, []);

  // Dispara a geração de um seed específico (usado no manual e no loop).
  function generateWithSeed(seedValue: number) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    clearGenTimeout();
    seedRef.current = seedValue;
    setSeed(seedValue);
    setImageUrl(buildImageUrl(trimmed, seedValue));
    setStatus('loading');
    setGenId((n) => n + 1);
    setSaveStatus('idle');
    setSavedPath(null);
    setRetrying(false);
    setLoopNotice(null);
    requestStartRef.current = Date.now();
    genTimeoutRef.current = window.setTimeout(handleGenFailure, GEN_TIMEOUT_MS);
  }

  function handleGenerate() {
    if (!prompt.trim()) return;
    generateWithSeed(seedRef.current + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isLooping) handleGenerate();
  }

  // Baixa os bytes (do cache do <img>) e manda o main gravar no disco.
  async function persistImage(url: string, seedValue: number): Promise<SaveImageResult> {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      const bytes = await response.arrayBuffer();
      return await window.api.saveImage({ bytes, prompt, seed: seedValue, contentType });
    } catch {
      return { ok: false, error: 'Falha ao baixar a imagem' };
    }
  }

  // Contagem regressiva (só visual) até a próxima geração / retry.
  function startCountdown(ms: number) {
    let secondsLeft = Math.ceil(ms / 1000);
    setCountdown(secondsLeft);
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = window.setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        secondsLeft = 0;
        if (countdownTimerRef.current !== null) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      }
      setCountdown(secondsLeft);
    }, 1000);
  }

  // Após carregar uma imagem do loop, agenda a próxima respeitando o intervalo mínimo.
  function scheduleNext() {
    const elapsed = Date.now() - requestStartRef.current;
    let remaining = LOOP_INTERVAL_MS - elapsed;
    if (remaining < 0) remaining = 0;
    startCountdown(remaining);
    nextTimerRef.current = window.setTimeout(() => {
      generateWithSeed(seedRef.current + 1);
    }, remaining);
  }

  function startLoop() {
    if (!prompt.trim()) return;
    setSavedCount(0);
    retriesRef.current = 0;
    setRetries(0);
    setLoopNotice(null);
    loopingRef.current = true;
    setIsLooping(true);
    generateWithSeed(seedRef.current + 1);
  }

  function stopLoop() {
    loopingRef.current = false;
    setIsLooping(false);
    setRetrying(false);
    clearTimers();
    clearGenTimeout();
    setCountdown(0);
  }

  function handleToggleLoop() {
    if (loopingRef.current) {
      stopLoop();
    } else {
      startLoop();
    }
  }

  async function handleImageLoad() {
    clearGenTimeout();
    retriesRef.current = 0;
    setRetries(0);
    setRetrying(false);
    const loadedUrl = imageUrl;
    const loadedSeed = seedRef.current;
    setDisplayedUrl(loadedUrl);
    setStatus('loaded');
    if (loopingRef.current) {
      // Auto-save de cada imagem do loop.
      if (loadedUrl) {
        const result = await persistImage(loadedUrl, loadedSeed);
        if (result.ok) {
          setSavedCount((n) => n + 1);
        }
      }
      scheduleNext();
    }
  }

  // Chamada tanto pelo onError do <img> quanto pelo timeout de geração.
  function handleGenFailure() {
    clearGenTimeout();
    setStatus('error');
    if (!loopingRef.current) return;

    const attempt = retriesRef.current + 1;
    retriesRef.current = attempt;
    setRetries(attempt);

    if (attempt > MAX_RETRIES) {
      setLoopNotice(
        `Loop parado: a API falhou ${MAX_RETRIES} vezes seguidas (seed ${seedRef.current}).`,
      );
      stopLoop();
      return;
    }

    setRetrying(true);
    startCountdown(BACKOFF_MS);
    nextTimerRef.current = window.setTimeout(() => {
      generateWithSeed(seedRef.current); // tenta o MESMO seed
    }, BACKOFF_MS);
  }

  function handleImageError() {
    handleGenFailure();
  }

  async function handleSave() {
    if (!imageUrl) return;
    setSaveStatus('saving');
    const result = await persistImage(imageUrl, seedRef.current);
    if (result.ok && result.filePath) {
      setSavedPath(result.filePath);
      setSaveStatus('saved');
    } else {
      setSaveStatus('error');
    }
  }

  const isLoading = status === 'loading';
  const isLoaded = status === 'loaded';

  return (
    <section className="panel">
      <div className="panel__stage">
        {!displayedUrl && status === 'idle' && (
          <p className="panel__placeholder">Sua imagem aparecerá aqui.</p>
        )}
        {!displayedUrl && status === 'loading' && (
          <p className="panel__status panel__status--loading">Gerando imagem, aguarde…</p>
        )}
        {!displayedUrl && status === 'error' && (
          <p className="panel__status panel__status--error" role="alert">
            Não foi possível gerar a imagem.
          </p>
        )}

        {/* Imagem visível (última carregada) */}
        {displayedUrl && <img className="panel__image" src={displayedUrl} alt={prompt} />}

        {/* Loader invisível: baixa a próxima e dispara os eventos do loop */}
        {imageUrl && (
          <img
            key={genId}
            src={imageUrl}
            alt=""
            hidden
            onLoad={handleImageLoad}
            onError={handleImageError}
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
            disabled={isLoading || isLooping}
          />
          <button
            className="panel__button"
            onClick={handleGenerate}
            disabled={isLoading || isLooping || !prompt.trim()}
          >
            {isLoading && !isLooping ? 'Gerando…' : 'Gerar'}
          </button>
          <button
            className="panel__button panel__button--secondary"
            onClick={handleToggleLoop}
            disabled={!prompt.trim()}
          >
            {isLooping ? 'Parar' : 'Iniciar loop'}
          </button>
          {isLoaded && !isLooping && (
            <button
              className="panel__button panel__button--secondary"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>

        {isLooping && retrying && (
          <p className="panel__feedback panel__feedback--error" role="alert">
            Falha na seed {seed} — tentando de novo em {countdown}s (tentativa {retries}/{MAX_RETRIES})
          </p>
        )}
        {isLooping && !retrying && status === 'loading' && (
          <p className="panel__meta">Loop ativo — gerando seed {seed}… ({savedCount} salvas)</p>
        )}
        {isLooping && !retrying && status !== 'loading' && (
          <p className="panel__meta">Loop ativo — {savedCount} salvas — próxima em {countdown}s</p>
        )}
        {!isLooping && loopNotice && (
          <p className="panel__feedback panel__feedback--error" role="alert">{loopNotice}</p>
        )}
        {!isLooping && !loopNotice && isLoaded && seed !== null && (
          <p className="panel__meta">Seed: {seed}</p>
        )}
        {!isLooping && !loopNotice && status === 'error' && (
          <p className="panel__feedback panel__feedback--error" role="alert">
            Não foi possível gerar (seed {seed}).
          </p>
        )}
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
