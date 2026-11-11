'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

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
    // SANS CETTE LIGNE, CET ÉCRAN S'AFFICHE POUR UNE PERSONNE SUIVIE SANS QUE
    // PERSONNE NE L'APPRENNE. Le `digest` proposé en référence n'est posé que
    // par le rendu SERVEUR : une erreur survenue dans le navigateur — le cas
    // dominant, la plupart des pages du portail étant clientes — n'en porte
    // pas, donc la ligne « Référence » ne s'affiche même pas. C'était un
    // maillon manquant de la boucle de support, pas un maillon faible
    // (`docs/claude/OBSERVABILITE_PRODUCTION.md`).
    //
    // Inerte sans DSN, et nettoyé par `beforeSend` quand il y en a un.
    Sentry.captureException(error);
  }, [error]);

  // Cet écran remplace le layout racine : il s'affiche sans les variables CSS
  // de globals.css. Ses couleurs sont donc les valeurs Lien en clair (A5-R3,
  // [[D-481]]), tenues à la main : encre #233B42 sur crème #F7F1E7 (10,5:1),
  // texte secondaire #52676C (5,3:1), bouton pétrole #205B63 sous un libellé
  // ivoire #FFFCF7 (7,5:1).
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: '100vh', background: '#F7F1E7', color: '#233B42' }}>
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 28, marginBottom: 12, fontFamily: 'Georgia, serif' }}>Une erreur est survenue</h1>
          <p style={{ lineHeight: 1.5, marginBottom: 20 }}>
            Nous rencontrons un problème technique temporaire. Réessayez dans quelques instants.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 14, color: '#52676C', marginBottom: 20 }}>
              Référence technique: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#205B63',
              color: '#FFFCF7',
              border: 0,
              borderRadius: 18,
              minHeight: 48,
              padding: '10px 16px',
              fontSize: 16,
              fontWeight: 600,
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
