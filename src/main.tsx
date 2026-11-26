import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/tokens/tokens.css';
import { App } from '@/app/App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in document.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
