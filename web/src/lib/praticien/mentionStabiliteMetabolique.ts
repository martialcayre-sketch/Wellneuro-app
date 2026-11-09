// LE POIDS ÉGAL DE LA STABILITÉ MÉTABOLIQUE — [[D-333]] §3, J1-cockpit-a ;
// motivé par [[D-463]].
//
// La stabilité métabolique est la moyenne simple des sources présentes parmi
// Q_INF_01 et Q_INF_02 (`lib/equilibre/objetsCliniques.ts`). Le responsable a
// motivé ce poids égal (`DC-21`) par le motif de [[D-403]] §1, déclaré sans
// source ([[D-463]] §1) : la tolérance « Non motivé, décision due » de D-333
// §3 a pris fin ([[D-463]] §3). Le cockpit affiche le chiffre avec le libellé
// validé mot pour mot, et nomme toujours la source présente et celle qui
// manque — jamais « deux instruments » quand une seule est là.
//
// CE MODULE N'IMPORTE RIEN, et c'est une propriété : `FichePatientPanel.tsx`
// est `'use client'`. Importer la liste des sources depuis `objetsCliniques.ts`
// tirerait le moteur de score dans le bundle client ; la route envoie donc la
// présence par source, et ce module ne fait que nommer.

/** Servie à côté de la valeur : la nature du motif du poids égal, libellé
 *  validé mot pour mot par le responsable ([[D-463]] §3). */
export const MENTION_POIDS_EGAL_MOTIVE = 'Poids égal : motif déclaré, sans source (D-463)';

/** Champ absent de la réponse (ancien conteneur pendant un déploiement) :
 *  une liste inconnue ne se présente jamais comme une liste vide. */
export const MENTION_SOURCES_INDISPONIBLES = 'Sources indisponibles';

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
