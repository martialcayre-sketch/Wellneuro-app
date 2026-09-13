// LES PASSATIONS QUI FONDENT UN CANDIDAT DE PRIORITÉ, RENDUES LISIBLES.
//
// CE QUE CE MODULE CORRIGE. `ClinicalFindingProvenance.responseIds` est
// calculée, validée contre le snapshot (`decisionCard.ts` JETTE si un
// identifiant y est absent), hachée dans l'empreinte de la carte et envoyée au
// navigateur sur CHAQUE candidat — et rendue par aucun composant. `DC-34` exige
// pourtant que le praticien puisse ouvrir « quelles données patient » fondent
// une suggestion ; `DC-01` dit que la chaîne observation → instrument fait
// partie de ce qui la rend valide. Le maillon existait, il s'arrêtait avant
// l'écran.
//
// PAR CANDIDAT, JAMAIS PAR ARGUMENT — et la distinction n'est pas de forme. Un
// candidat porte UN `rationale` monolithique et UN jeu de `responseIds`
// DÉDUPLIQUÉ pour toute la règle : le couple {motif d'un déclencheur,
// instruments de CE déclencheur} n'existe qu'un instant dans `evaluerPriorites`
// avant d'être aplati. Découper le rationale à l'écran pour coller « les mêmes
// passations » sous chaque morceau rendrait N provenances identiques présentées
// comme distinctes — un maillon FAUX, que `DC-01` sanctionne plus lourdement
// qu'un maillon absent. Ce module rend donc une liste unique, rattachée au
// candidat entier, et l'écran le dit.
//
// AUCUN CLAIM N'EST SERVI ICI. `PRIORITY_RULES_V1[].justificationClaims` existe
// et serait tentant, mais `D-093` amendé par `D-163` l'interdit tant que le
// classement, les textes `LIMITATION_*` et l'ordre d'évaluation vivent hors du
// périmètre signé : peindre des claims VALIDE sous un candidat dont la
// sélection n'est pas signée attacherait une provenance certifiée à un acte qui
// ne l'est pas. Instrument et date sont des FAITS du relevé, pas une
// certification.
//
// IMPORTS DE TYPES UNIQUEMENT : ce module part dans le bundle du navigateur
// (composant `'use client'`). Un import de valeur depuis `lib/clinical/`
// embarquerait la table des règles entière — même leçon que
// `recoupementContradictions.ts`.

export type PassationFondatrice = {
  /** Clé de liste, jamais affichée — elle n'apprendrait rien au praticien. */
  responseId: string;
  /**
   * L'instrument tel que le relevé le nomme, ou `null` quand le relevé ne porte
   * pas cet identifiant.
   *
   * LE CAS `null` NE S'ÉLIDE PAS, et c'est la divergence assumée avec
   * `recoupementsContradictions`, qui le filtre : là-bas on calcule une
   * INTERSECTION — un identifiant sans instrument n'appartient à aucune des deux
   * listes, et l'écarter ne retire rien. Ici on rend une PROVENANCE, et taire
   * une source qu'on n'a pas su retrouver ferait passer une chaîne trouée pour
   * une chaîne complète (`DC-01` : un maillon absent invalide la sortie, il ne
   * l'affaiblit pas). Elle est donc rendue, et dite manquante.
   */
  idQuestionnaire: string | null;
  /** Horodatage ISO d'observation, ou `null` pour la même raison. */
  observeLe: string | null;
};

/**
 * Dépendances STRUCTURELLES, volontairement plus étroites que `ClinicalSnapshot`
 * et `DecisionPriorityCandidate` : déclarer ce qu'on lit dit ce qu'on consomme,
 * et les bancs nourrissent le module sans fixture géante. Même parti que
 * `recoupementsContradictions`.
 */
export function passationsDuCandidat(entree: {
  responseIds: readonly string[];
  sourceRefs: readonly { responseId: string; questionnaireId: string; observedAt: string }[];
}): PassationFondatrice[] {
  const releve = new Map(entree.sourceRefs.map((ref) => [ref.responseId, ref]));

  return [...new Set(entree.responseIds)]
    .map((responseId) => {
      const ref = releve.get(responseId);
      return {
        responseId,
        idQuestionnaire: ref?.questionnaireId ?? null,
        observeLe: ref?.observedAt ?? null,
      };
    })
    // ORDRE DÉTERMINISTE, la plus récente d'abord — deux rendus successifs de la
    // même carte doivent donner la même liste, sinon un repli ouvert saute d'une
    // ligne à l'autre. Les sources introuvables ferment la marche : elles ne
    // portent pas de date, et les intercaler suggérerait un rang qu'elles n'ont
    // pas.
    .sort((gauche, droite) => {
      if (gauche.observeLe === null && droite.observeLe === null) {
        return gauche.responseId < droite.responseId ? -1 : 1;
      }
      if (gauche.observeLe === null) return 1;
      if (droite.observeLe === null) return -1;
      if (gauche.observeLe !== droite.observeLe) {
        return gauche.observeLe < droite.observeLe ? 1 : -1;
      }
      return (gauche.idQuestionnaire ?? '') < (droite.idQuestionnaire ?? '') ? -1 : 1;
    });
}

/**
 * `JJ/MM/AAAA` dans le fuseau clinique — le format du reste du cockpit
 * (`contradictionsService.ts`). Le fuseau est RECOPIÉ plutôt qu'importé :
 * `FUSEAU_CLINIQUE` vit dans `lib/clinical/contradictionsEngine`, dont un import
 * de valeur tirerait le moteur dans le bundle client. Même arbitrage que le
 * prédicat dupliqué de `recoupementContradictions.ts`.
 */
export function dateDePassation(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).format(new Date(iso));
}
