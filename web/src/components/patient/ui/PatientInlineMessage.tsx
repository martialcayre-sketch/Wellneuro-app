import type { ReactNode } from 'react';

type Tone = 'error' | 'info' | 'success';

const TONE_CLASSES: Record<Tone, string> = {
  error: 'text-status-danger bg-status-danger/10',
  info: 'text-primary bg-primary/10',
  // Texte courant, PAS le vert : #15803d sur son propre fond à 10 % donne
  // 4,39:1, sous le seuil AA de 4,5:1 pour ce corps (axe, BIO-INGEST LOT-11,
  // arbitrage du 2026-10-10). Le fond vert pâle porte seul le ton.
  success: 'text-foreground bg-status-success/10',
};

// Message inline commun du portail patient — garantit au niveau composant
// que le rouge n'est utilisé que pour une erreur réelle (tone="error"),
// conformément au principe HC-F "rouge seulement pour erreur réelle", plutôt
// que par convention de classes recopiées à chaque écran.
export function PatientInlineMessage({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <p className={`text-sm rounded-lg px-4 py-2 ${TONE_CLASSES[tone]}`} role={tone === 'error' ? 'alert' : undefined}>
      {children}
    </p>
  );
}
