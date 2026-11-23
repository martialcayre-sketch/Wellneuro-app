import type { ReactNode } from 'react';

type Tone = 'error' | 'info' | 'success' | 'consigne';

// Formes des états de la planche validée (prototypes PAT-4, PAT-5, PAT-6),
// arbitrage F3 a du 2026-11-21 (liste commune 20261121-1633-d) :
// - erreur : bloc à bord rouge de 2 px, texte rouge gras (#b91c1c, 6,3:1) ;
// - information : fond sauge, texte pétrole ;
// - succès : fond vert pâle, texte vert gras. Le texte courant qu'avait retenu
//   l'arbitrage du 2026-10-10 tenait à l'ancien vert #15803d (4,39:1) ; le
//   jeton vaut #166534, 5,99:1 sur ce fond ;
// - consigne : bord de contrôle, fond sauge, texte courant. Elle n'est pas une
//   erreur : l'appelant l'annonce poliment, dans une région `role="status"`
//   rendue en permanence (une région vivante insérée avec son contenu n'est
//   pas annoncée par tous les lecteurs d'écran).
const TONE_CLASSES: Record<Tone, string> = {
  error: 'text-base py-3.5 border-2 border-status-danger bg-surface font-semibold text-status-danger',
  info: 'text-base py-3.5 border border-muted bg-muted text-primary',
  success: 'text-base py-3.5 border border-transparent bg-status-success/10 font-semibold text-status-success',
  consigne: 'text-sm py-3 border border-control-border bg-muted text-foreground',
};

// Message inline commun du portail patient — garantit au niveau composant
// que le rouge n'est utilisé que pour une erreur réelle (tone="error"),
// conformément au principe HC-F "rouge seulement pour erreur réelle", plutôt
// que par convention de classes recopiées à chaque écran.
export function PatientInlineMessage({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <p className={`rounded px-4 ${TONE_CLASSES[tone]}`} role={tone === 'error' ? 'alert' : undefined}>
      {children}
    </p>
  );
}
