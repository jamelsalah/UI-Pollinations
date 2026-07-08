import React from 'react';
import { PromptPanel } from './components/PromptPanel';

export function App(): React.JSX.Element {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">UI Pollinations</h1>
      </header>
      <PromptPanel />
    </div>
  );
}
