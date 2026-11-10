// LE BLOC DES RÈGLES D'ORIENTATION NON ÉVALUÉES — ligne t61 de la file A,
// [[D-471]], suite de [[D-433]] §3.
//
// Une règle dont un déclencheur lit une passation hors de la fenêtre de son
// instrument n'est ni déclenchée ni écartée : elle ne recommande rien. Le cockpit
// le dit (« Règles non évaluées : passation trop ancienne ») ; le modèle, lui,
// n'en savait rien, et l'absence du bloc d'orientation lui faisait lire « aucune
// recommandation produite » là où le moteur n'avait pas pu trancher (`DC-24`).
//
// LA LISTE VIENT DU MOTEUR, ET DE LUI SEUL. Le bloc lit `reglesNonEvaluees` tel que
// `evaluerOrientationPourPatient` le sert, jamais l'âge des passations : une
// passation hors fenêtre ne rend pas toutes ses règles non évaluées, car un autre
// déclencheur frais et non atteint en écarte certaines
// (`evaluerDeclencheursDeRegle`). Recalculer ici depuis les dates dirait au modèle
// plus que ce que le moteur a constaté.
//
// CE QUI N'EN SORT PAS : l'identifiant des règles et leur nombre. Le modèle n'en a
// pas l'usage, et la consigne lui fait dire « certaines règles ». Les identifiants
// restent dans la trace (`donneesEntree`), qui ne part pas au modèle.
//
// MÊME REGROUPEMENT QUE LE COCKPIT (`OrientationPanel`) : une ligne par
// passation, dans l'ordre de première apparition, c'est-à-dire l'ordre de la table.

import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import type { PassationPerimee } from '@/lib/clinical/orientationEngine';
import type { ResultatOrientation } from '@/lib/clinical/orientationService';

export const TITRE_BLOC_REGLES_NON_EVALUEES = "## Règles d'orientation non évaluées";

/** Le jour d'une date ISO, sous la forme des passations transmises au modèle. */
function jour(dateIso: string): string {
  return new Date(dateIso).toISOString().split('T')[0];
}

function lignePassation(passation: PassationPerimee): string {
  const titre = CATALOGUE_DEFINITIONS[passation.idQuestionnaire]?.titre;
  const instrument = titre ? `${passation.idQuestionnaire} — ${titre}` : passation.idQuestionnaire;
  const fenetre = passation.fenetreJours === null
    ? 'fenêtre de fraîcheur inconnue'
    : `au-delà de sa fenêtre de ${passation.fenetreJours} jours`;
  return `${instrument}, passation du ${jour(passation.dateReponse)} : ${fenetre}.`;
}

/**
 * Les passations en cause, une fois chacune, dans l'ordre de la table.
 *
 * DÉFENSIF SUR LA FORME, comme `ecarteesDe` dans `generation.ts` : le bloc est lu
 * hors du `try` de l'appel au service, et un élément malformé ne doit pas faire
 * perdre une synthèse déjà payée. Il est ignoré.
 */
export function passationsNonEvaluees(orientation: ResultatOrientation | null): PassationPerimee[] {
  if (orientation?.actif !== true) return [];
  const brut: unknown = orientation.reglesNonEvaluees;
  if (!Array.isArray(brut)) return [];
  const parInstrument = new Map<string, PassationPerimee>();
  for (const regle of brut as unknown[]) {
    const passations: unknown = (regle as { passations?: unknown } | null)?.passations;
    if (!Array.isArray(passations)) continue;
    for (const p of passations as unknown[]) {
      const passation = p as Partial<PassationPerimee> | null;
      if (
        typeof passation?.idQuestionnaire !== 'string'
        || typeof passation.dateReponse !== 'string'
        || Number.isNaN(Date.parse(passation.dateReponse))
        || !(passation.fenetreJours === null || typeof passation.fenetreJours === 'number')
      ) continue;
      if (!parInstrument.has(passation.idQuestionnaire)) {
        parInstrument.set(passation.idQuestionnaire, {
          idQuestionnaire: passation.idQuestionnaire,
          dateReponse: passation.dateReponse,
          fenetreJours: passation.fenetreJours,
        });
      }
    }
  }
  return [...parInstrument.values()];
}

/** Les identifiants des règles non évaluées, pour la trace seulement. */
export function reglesNonEvalueesIds(orientation: ResultatOrientation | null): string[] {
  if (orientation?.actif !== true || !Array.isArray(orientation.reglesNonEvaluees)) return [];
  return orientation.reglesNonEvaluees
    .map(regle => (regle as { regleId?: unknown } | null)?.regleId)
    .filter((id): id is string => typeof id === 'string');
}

/**
 * Le bloc, ou une chaîne vide quand l'orientation est inactive ou qu'aucune règle
 * n'est restée non évaluée. Il part MÊME QUAND AUCUNE RECOMMANDATION NE SORT :
 * c'est là qu'il compte le plus, comme au cockpit.
 */
export function construireBlocReglesNonEvaluees(orientation: ResultatOrientation | null): string {
  const passations = passationsNonEvaluees(orientation);
  if (passations.length === 0 || orientation?.actif !== true) return '';
  return [
    TITRE_BLOC_REGLES_NON_EVALUEES,
    `Version: ${orientation.version}`,
    '',
    ...passations.map(lignePassation),
  ].join('\n');
}
