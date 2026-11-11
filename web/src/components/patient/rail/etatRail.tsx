'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/*
 * ÉTAT DU RAIL « MON ESPACE » ([[D-482]] §1, lot PAT-1 de la refonte Lien).
 *
 * Trois états : déplié, réduit (libellés gardés, `rail-patient-compact`) et
 * escamoté (hors de la page, du clavier et de l'arbre d'accessibilité). L'état
 * vit dans la mémoire du layout du portail, qui survit aux navigations entre
 * ses pages : rien n'est écrit sur l'appareil (Q56), et un rechargement
 * rend le rail déplié.
 */

export type EtatRail = 'deplie' | 'reduit' | 'escamote';

type ValeurEtatRail = { etat: EtatRail; changer: (etat: EtatRail) => void };

const EtatRailContexte = createContext<ValeurEtatRail | null>(null);

/** `id` du bouton « Menu » qui rouvre le rail escamoté ([[D-482]] §2). */
export const ID_BOUTON_ROUVRIR_RAIL = 'bouton-rouvrir-mon-espace';

export function FournisseurEtatRail({ children }: { children: ReactNode }) {
  const [etat, changer] = useState<EtatRail>('deplie');
  const valeur = useMemo(() => ({ etat, changer }), [etat]);
  return <EtatRailContexte.Provider value={valeur}>{children}</EtatRailContexte.Provider>;
}

/** Hors du fournisseur, le rail est déplié et ne change pas. */
export function useEtatRail(): ValeurEtatRail {
  return useContext(EtatRailContexte) ?? { etat: 'deplie', changer: () => {} };
}
