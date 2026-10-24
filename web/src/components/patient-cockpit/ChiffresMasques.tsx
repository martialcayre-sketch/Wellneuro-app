'use client';

import { createContext, useContext, type ReactNode } from 'react';

// LE MODE CONSULTATION EST UN ÉCRAN PARTAGÉ AVEC LE PATIENT ([[D-354]] §1) :
// il tombe sous la règle du portail, donc sans chiffre. La fiche pose ce
// contexte quand le mode est actif ; chaque composant qui rend un pourcentage
// des 12 besoins, l'indice global, le momentum, un score de questionnaire ou
// une valeur biologique le lit et rend la mention à la place de la valeur.
//
// UN CONTEXTE ET NON UNE PROP : plusieurs de ces composants lisent eux-mêmes
// leurs données, sous le runtime clinique ou sous un tiroir, à plusieurs
// étages de la fiche. Hors de la fiche, la valeur par défaut est `false` : rien
// ne change pour un écran qui ne connaît pas le mode.
const ChiffresMasquesContext = createContext(false);

/** Servie à la place d'une valeur masquée — distincte de « Non mesuré » : la
 *  valeur existe, elle n'est pas montrée sur un écran partagé (§3). */
export const MENTION_MASQUE_CONSULTATION = 'masqué en mode consultation';

export function ChiffresMasquesProvider({ masques, children }: { masques: boolean; children: ReactNode }) {
  return <ChiffresMasquesContext.Provider value={masques}>{children}</ChiffresMasquesContext.Provider>;
}

export function useChiffresMasques(): boolean {
  return useContext(ChiffresMasquesContext);
}

/** La mention, avec un marqueur que les bancs E2E comptent. */
export function ValeurMasquee({ className = '' }: { className?: string }) {
  return (
    <span data-chiffre-masque="" className={`text-xs italic text-muted-foreground ${className}`}>
      {MENTION_MASQUE_CONSULTATION}
    </span>
  );
}
