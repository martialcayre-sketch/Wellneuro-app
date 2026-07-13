'use client';

import { useEffect } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Le détail est volontairement minimal côté client pour éviter les fuites.
    console.error('Erreur globale application', {
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main style={{ maxWidth: 720, margin: '48px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Une erreur est survenue</h1>
          <p style={{ lineHeight: 1.5, marginBottom: 20 }}>
            Nous rencontrons un problème technique temporaire. Réessayez dans quelques instants.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
              Référence technique: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#1f2937',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
