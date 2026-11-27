import '@/shared/config/zod';
import '@/shared/tokens/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerPreloadErrorHandler } from './app/preloadError';

registerPreloadErrorHandler();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root mount element "#root" was not found in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
