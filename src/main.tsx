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
  } catch (err: any) {
    console.error('Fatal initialization error:', err);
    try {
      const fallback = document.createElement('div');
      fallback.style.cssText = 'min-height:100vh;background:#060B1A;color:#f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;text-align:center;';
      fallback.innerHTML = `
        <div style="max-width:500px;background:#101A36;border:1px solid #D4AF37;border-radius:16px;padding:32px;">
          <h2 style="color:#D4AF37;font-size:22px;margin-bottom:12px;">Ma Collection de Fossiles</h2>
          <p style="color:#cbd5e1;font-size:14px;margin-bottom:16px;">Initialisation de l'application...</p>
          <button onclick="window.location.reload()" style="background:#D4AF37;color:#060B1A;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;">Recharger la page</button>
        </div>
      `;
      if (document.body) {
        document.body.appendChild(fallback);
      } else {
        document.documentElement.appendChild(fallback);
      }
    } catch (_) {}
  }
}

if (document.getElementById('root')) {
  initRoot();
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRoot);
} else {
  initRoot();
}

