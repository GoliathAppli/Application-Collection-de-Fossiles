import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function initRoot() {
  try {
    let rootElement = document.getElementById('root');
    if (!rootElement) {
      rootElement = document.createElement('div');
      rootElement.id = 'root';
      if (document.body) {
        document.body.appendChild(rootElement);
      } else {
        document.documentElement.appendChild(rootElement);
      }
    }

    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('Fatal initialization error:', err);
  }
}

if (document.getElementById('root')) {
  initRoot();
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRoot);
} else {
  initRoot();
}

