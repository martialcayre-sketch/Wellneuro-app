'use client';

import { useCallback, useSyncExternalStore } from 'react';

/*
 * Repli du panneau de contexte du copilote (PRA-5 PR 2, P34 ; [[D-481]]
 * complément DOC-15, Q2 et Q3 ; T-15 de [[D-488]], emplacement neuf).
 *
 * État propre au copilote, aux règles de la fiche (`replisFiche.ts`,
 * PRA-3a) : il vaut pour la session — gardé d'un patient à l'autre, perdu au
 * rechargement. Rien n'est écrit sur l'appareil, et l'état ne porte aucune
 * donnée ni aucun identifiant patient.
 *
 * `contexteMasque` à `null` : aucun choix fait dans la session, la largeur
 * décide (escamoté d'office de 1 024 à 1 279 px, affiché au-delà). La règle
 * est portée par les classes de `CopiloteConsultation`, pas lue en script.
 */

let contexteMasque: boolean | null = null;
const abonnes = new Set<() => void>();

function sAbonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

function lire(): boolean | null {
  return contexteMasque;
}

function lireServeur(): boolean | null {
  return null;
}

function ecrire(valeur: boolean | null): void {
  contexteMasque = valeur;
  abonnes.forEach(rappel => rappel());
}

/** Bancs seulement : rend l'état de début de session. */
export function reinitialiserRepliContexteCopilote(): void {
  ecrire(null);
}

export function useRepliContexteCopilote() {
  const masque = useSyncExternalStore(sAbonner, lire, lireServeur);
  const poserContexteMasque = useCallback((valeur: boolean) => ecrire(valeur), []);
  return { contexteMasque: masque, poserContexteMasque };
}
