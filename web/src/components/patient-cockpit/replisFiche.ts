'use client';

import { useCallback, useSyncExternalStore } from 'react';

/*
 * Replis de la fiche-trajectoire (PRA-3a, [[D-486]] §3, T-14 et T-15 de
 * [[D-488]] ; prototype de l'étape 3 validé le 2026-11-12, Q2).
 *
 * Deux replis, chacun par sa commande : le rail des sept phases et le panneau
 * de contexte (« Instruments »). Ils vivent AU-DESSUS de la clé du dossier
 * (`FichePatientPanel` est remonté par dossier, [[D-072]] §4) : gardés d'un
 * dossier à l'autre pendant la session, perdus au rechargement. Rien n'est
 * écrit sur l'appareil — ni ici, ni ailleurs — et l'état ne porte aucune
 * donnée ni aucun identifiant patient.
 *
 * `contexteMasque` à `null` : aucun choix fait dans la session, la largeur
 * décide (escamoté d'office de 1 024 à 1 279 px, affiché au-delà). La règle
 * est portée par les classes de `FichePatientPanel`, pas lue en script.
 */

export type ReplisFiche = {
  phasesMasquees: boolean;
  contexteMasque: boolean | null;
};

const INITIAL: ReplisFiche = { phasesMasquees: false, contexteMasque: null };

let etat: ReplisFiche = INITIAL;
const abonnes = new Set<() => void>();

function sAbonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

function lire(): ReplisFiche {
  return etat;
}

function lireServeur(): ReplisFiche {
  return INITIAL;
}

function ecrire(maj: Partial<ReplisFiche>): void {
  etat = { ...etat, ...maj };
  abonnes.forEach(rappel => rappel());
}

/** Bancs seulement : rend l'état de début de session. */
export function reinitialiserReplisFiche(): void {
  etat = INITIAL;
  abonnes.forEach(rappel => rappel());
}

export function useReplisFiche() {
  const replis = useSyncExternalStore(sAbonner, lire, lireServeur);
  const poserPhasesMasquees = useCallback((phasesMasquees: boolean) => ecrire({ phasesMasquees }), []);
  const poserContexteMasque = useCallback((contexteMasque: boolean) => ecrire({ contexteMasque }), []);
  return { ...replis, poserPhasesMasquees, poserContexteMasque };
}
