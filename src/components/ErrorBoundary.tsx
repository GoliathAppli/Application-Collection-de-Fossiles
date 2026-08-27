import React, { Component, ErrorInfo, ReactNode } from 'react';
import { safeStorage } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0a1024',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#131e3d',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ color: '#D4AF37', fontSize: '24px', marginBottom: '16px', fontWeight: 'bold' }}>
              Une erreur inattendue est survenue
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
              L'application a rencontré un problème d'affichage. Vos données restent conservées en sécurité.
            </p>
            {this.state.error && (
              <pre style={{
                backgroundColor: '#070b18',
                color: '#f87171',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                marginBottom: '24px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#D4AF37',
                  color: '#060B1A',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Recharger l'application
              </button>
              <button
                onClick={() => {
                  safeStorage.clear();
                  window.location.reload();
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#cbd5e1',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  cursor: 'pointer'
                }}
              >
                Réinitialiser le cache d'affichage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
