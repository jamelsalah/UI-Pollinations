import React from 'react';
import { PromptPanel } from './components/PromptPanel';

export function App(): React.JSX.Element {
  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">UI Pollinations</h1>
        <p className="app__subtitle">Gere imagens a partir de um prompt</p>
      </header>
      <PromptPanel />
    </main>
  );
}
