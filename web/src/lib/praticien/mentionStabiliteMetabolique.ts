// LA TOLÉRANCE NOMMÉE DE LA STABILITÉ MÉTABOLIQUE — [[D-333]] §3, J1-cockpit-a.
//
// La stabilité métabolique est la moyenne simple des sources présentes parmi
// Q_INF_01 et Q_INF_02 (`lib/equilibre/objetsCliniques.ts`). Aucune décision ne
// motive ce poids égal (`DC-21`) : le responsable la motivera de sa main, avec
// source (porte 4). D'ici là, et seulement d'ici là, le cockpit affiche le
// chiffre avec « Non motivé, décision due », et nomme la source présente et
// celle qui manque — jamais « deux instruments » quand une seule est là.
//
// La mention se retire à la levée de la porte 4, pas avant.
//
// CE MODULE N'IMPORTE RIEN, et c'est une propriété : `FichePatientPanel.tsx`
// est `'use client'`. Importer la liste des sources depuis `objetsCliniques.ts`
// tirerait le moteur de score dans le bundle client ; la route envoie donc la
// présence par source, et ce module ne fait que nommer.

/** Servie à côté de la valeur, tant que le poids égal n'est pas motivé. */
export const MENTION_POIDS_NON_MOTIVE = 'Non motivé, décision due';

/** Noms courts des deux sources, avec leur code (arbitrage du 2026-10-23). */
export const NOMS_SOURCES_STABILITE: Record<string, string> = {
  Q_INF_01: 'Hyperexcitabilité SIIN (Q_INF_01)',
  Q_INF_02: 'Magnésium / spasmophilie SIIN (Q_INF_02)',
};

export type PresenceSourceStabilite = { idQuestionnaire: string; presente: boolean };

function nommer(idQuestionnaire: string): string {
  return NOMS_SOURCES_STABILITE[idQuestionnaire] ?? idQuestionnaire;
}

/**
 * Ce sur quoi la valeur est établie. `null` sans aucune source présente : la
 * tuile dit alors « Non mesuré », et il n'y a pas de valeur à qualifier.
 */
export function mentionSourcesStabilite(sources: PresenceSourceStabilite[]): string | null {
  const presentes = sources.filter(s => s.presente).map(s => nommer(s.idQuestionnaire));
  const manquantes = sources.filter(s => !s.presente).map(s => nommer(s.idQuestionnaire));
  if (presentes.length === 0) return null;
  if (manquantes.length === 0) {
    if (presentes.length === 1) return `Sur ${presentes[0]} seule`;
    return `Moyenne à poids égal : ${presentes.slice(0, -1).join(', ')} et ${presentes[presentes.length - 1]}`;
  }
  return `Sur ${presentes.join(', ')} seule${presentes.length > 1 ? 's' : ''} ; manque ${manquantes.join(', ')}`;
}
