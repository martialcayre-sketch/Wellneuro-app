import type { MissingDataPriority } from '../clinical-engine/types';
import type { OrientationClaimRef } from './orientationRulesV1';

// ─────────────────────────────────────────────────────────────────────────────
// L'objet produit par le moteur de contradictions du LOT-01 — [[D-041]].
//
// UN OBJET, TROIS FORMES, et non trois objets voisins. Discordance, convergence
// et conflit de sources ont la même forme — des sources, une description, une
// importance, des hypothèses, une action suggérée, un état résolu ou non — et
// ne diffèrent que par la MATIÈRE confrontée : des instruments, un faisceau, le
// corpus. Trois objets auraient produit trois vocabulaires de vigilance sur le
// même écran et, à terme, trois moteurs.
//
// LE TYPE EST PROPRE AU MOTEUR — [[D-044]]. `DiscordanceFinding`
// (`clinical-engine/types.ts:199-207`) n'est PAS réutilisé : il hérite de
// `ClinicalFindingBase`, qui porte `confidence: QualitativeConfidence`, champ
// que le garde ci-dessous interdit et que `clinicalReview.ts:107` valide à
// l'exécution. Le banc de D-041 aurait échoué le premier jour. `DiscordanceFinding`
// reste en place, inchangé, et n'est pas utilisé par ce moteur ; l'injection
// cockpit convertit, c'est le coût assumé de la coexistence.
//
// ── GARDE NON NÉGOCIABLE ─────────────────────────────────────────────────────
// Cet objet ne porte AUCUN champ de certitude, de probabilité, de score ou de
// confiance, SOUS QUELQUE NOM QUE CE SOIT. Réunir convergence et discordance
// dans un objet portant une importance invite précisément à lire la convergence
// comme une certitude ; `DC-29` l'interdit. `contradictionFinding.guard.test.ts`
// assère cette absence SUR LE TYPE — la liste des clés y est épinglée, de sorte
// qu'un champ ajouté ne compile plus, quel que soit le nom qu'on lui donne.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un claim est un claim : même forme que celle de la table d'orientation, pas
 * une seconde définition qui dériverait. Le contrat de fraîcheur
 * (`prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql`) contrôle les deux
 * tables sur la même paire `(claim_id, version_claim)`.
 */
export type ContradictionClaimRef = OrientationClaimRef;

/**
 * Les trois formes. Le discriminant est explicite : un objet dont la forme se
 * déduirait des champs remplis rendrait intestable l'absence d'un champ de
 * certitude, et laisserait la forme se tromper ([[D-041]]).
 *
 * Seule `DISCORDANCE` est peuplée par le LOT-01. Les deux autres sont prévues
 * par le type et VIDES à la livraison : la structure évite d'avoir à écrire un
 * second moteur, elle n'anticipe aucune règle clinique.
 */
export type FormeContradiction = 'DISCORDANCE' | 'CONVERGENCE' | 'CONFLIT_SOURCES';

/**
 * Graduation de la seule forme `CONVERGENCE`. Elle COMPTE des sources
 * indépendantes ; elle ne mesure pas une vraisemblance. `DC-29` : la
 * convergence augmente la priorité, jamais la certitude — c'est pourquoi cette
 * graduation vit sur la forme et non sur l'objet, et pourquoi elle ne peut pas
 * servir de champ de confiance déguisé.
 */
export type GraduationConvergence =
  | 'SIGNAL'
  | 'CONVERGENCE_FAIBLE'
  | 'CONVERGENCE_MODEREE'
  | 'CONVERGENCE_FORTE';

/**
 * L'importance reprend le vocabulaire de priorité DÉJÀ EN SERVICE
 * (`MissingDataPriority`) : un seul langage de priorité pour le praticien, sur
 * un écran qui en porte déjà un. Le `null` en est exclu — une contradiction
 * sans importance déclarée ne serait pas actionnable, et `DC-24` interdit de
 * lire une absence comme un degré faible.
 *
 * C'est une PRIORITÉ, pas un degré de vérité : elle ordonne ce que le praticien
 * regarde d'abord, elle ne dit pas ce qui est vrai.
 */
export type ImportanceContradiction = Exclude<MissingDataPriority, null>;

/**
 * Ce qui a été confronté. Le type est discriminé parce que la matière change
 * avec la forme : des instruments pour une `DISCORDANCE`, le corpus pour un
 * `CONFLIT_SOURCES`.
 *
 * `reponseId` est OBLIGATOIRE sur une source d'instrument. Une contradiction
 * doit être explicable par les données qui l'ont produite (`DC-34`, `DC-35`) :
 * une source qui ne saurait pas nommer la passation dont elle sort ne serait
 * pas remontable. Et, renvoi du LOT-00, seules des passations `VALID` ou
 * `AMBIGUOUS` alimentent le raisonnement.
 */
export type SourceContradiction =
  | {
      type: 'instrument';
      idQuestionnaire: string;
      /** Id ou libellé du sous-score visé ; absent = score global. */
      sousScore?: string;
      reponseId: string;
      /**
       * ISO 8601 — QUAND cette passation a eu lieu ([[D-048]]). Une discordance
       * entre deux instruments ne se lit pas de la même façon selon qu'ils ont
       * été remplis le même jour ou à des mois d'intervalle, et C-STR nomme
       * elle-même cette lecture dans sa troisième hypothèse. La date était
       * disponible et n'était pas remontée.
       */
      dateReponse: string;
    }
  | {
      type: 'claim';
      claim: ContradictionClaimRef;
    };

/**
 * L'état de la contradiction. `escaladee_praticien` est une ISSUE de la
 * politique de résolution, pas son échec (`DC-55`) — un conflit de sources que
 * personne ne peut trancher automatiquement DOIT remonter, et ce n'est pas un
 * défaut du moteur.
 *
 * Réserve nommée : `DC-54` et `DC-55` restent au statut **proposition** dans la
 * constitution tant qu'aucun banc ne les fait mordre ([[D-041]], [[D-043]]).
 * Le type les prévoit ; il ne les rend pas opposables.
 */
export type ResolutionContradiction =
  | { statut: 'ouverte' }
  | { statut: 'escaladee_praticien'; motif: string }
  | { statut: 'resolue'; motif: string };

type ContradictionFindingBase = {
  id: string;
  /**
   * Praticien seul, comme toute vigilance de ce genre : une contradiction entre
   * instruments n'est pas une information à servir au patient.
   */
  audience: 'praticien_seul';
  /** Ce qui a été confronté. Jamais vide : sans sources, rien n'est explicable. */
  sources: SourceContradiction[];
  /**
   * Formulation NEUTRE de ce qui est constaté, sans causalité affirmée
   * (`DC-27`). Le déterministe produit cette phrase ; le LLM la restitue et ne
   * la crée jamais ([[D-003]], `DC-02`).
   */
  description: string;
  importance: ImportanceContradiction;
  /**
   * Ce que la contradiction pourrait signifier, au pluriel et au conditionnel.
   * Une hypothèse n'est ni un diagnostic ni une orientation — `DC-31`, `DC-32`
   * en font trois objets distincts, et le diagnostic reste hors périmètre.
   */
  hypotheses: string[];
  /** Le geste proposé au praticien — typiquement une clarification en entretien. */
  actionSuggeree: string;
  resolution: ResolutionContradiction;
  /**
   * Claims à l'appui. Jamais vide : une contradiction sans claim ne serait pas
   * traçable jusqu'à sa source (`DC-01`, `DC-26`), et le contrat de fraîcheur
   * ne saurait pas quoi contrôler.
   */
  justificationClaims: ContradictionClaimRef[];
  /** La règle de la table versionnée qui a produit ce constat. */
  regleId: string;
  /**
   * Ce que ce constat NE dit pas : population non couverte, instrument isolé,
   * donnée manquante. `DC-14`, `DC-25`, `DC-28` — une conclusion se réduit, elle
   * ne s'invente pas.
   */
  limitations: string[];
  /**
   * Nombre de jours entre la passation la plus ancienne et la plus récente
   * parmi les sources d'instrument ([[D-048]]).
   *
   * CE N'EST PAS UN DEGRÉ DE VÉRITÉ, et le garde non négociable de [[D-041]]
   * en dépend : deux passations rapprochées ne rendent pas la contradiction
   * plus certaine, ni deux passations éloignées plus douteuse. C'est un FAIT
   * SUR LES DONNÉES, rendu au praticien pour qu'il puisse trancher lui-même
   * l'hypothèse temporelle que la règle formule. Aucun tri, aucun seuil, aucun
   * branchement ne le lit — un banc l'épingle.
   *
   * `null` signifie « moins de deux sources d'instrument, écart NON APPLICABLE
   * » — jamais zéro. `DC-24` : une donnée absente n'est ni zéro ni normale, et
   * `0` dirait à tort « les deux passations sont du même jour ».
   *
   * [[D-048]] a écarté d'en faire un seuil : aucune source publiée ne donne de
   * durée de validité croisée entre deux instruments (`DC-19`), et taire une
   * discordance parce qu'elle serait ancienne heurte `DC-30`.
   */
  ecartJoursEntreSources: number | null;
  /**
   * Reprise de `recoupementJustifie` de la règle, quand elle en porte une.
   *
   * Ce texte existait dans la table et n'était lu par personne ([[D-048]]) : il
   * devient ce que le praticien lit lorsque ce constat et une règle
   * d'orientation s'affichent ensemble pour le même patient — ce que le
   * commentaire du champ d'origine exige déjà, « deux sorties simultanées à
   * l'écran doivent être défendables » (`DC-37`).
   */
  recoupementJustifie?: string;
};

/**
 * L'objet unique du moteur de contradictions.
 *
 * Aucun champ de certitude, de probabilité, de score ou de confiance n'y figure
 * — et la liste des clés est épinglée par un banc, de sorte qu'aucun ne puisse
 * y entrer sous un autre nom.
 */
export type ContradictionFinding =
  | (ContradictionFindingBase & { forme: 'DISCORDANCE' })
  | (ContradictionFindingBase & { forme: 'CONVERGENCE'; graduation: GraduationConvergence })
  | (ContradictionFindingBase & { forme: 'CONFLIT_SOURCES' });

/**
 * Une contradiction est-elle OUVERTE, au sens où elle interdit une extinction
 * et mérite d'atteindre la synthèse praticien ?
 *
 * PRÉDICAT UNIQUE, et c'est tout son intérêt. Il vivait en clair dans
 * `orientationEngine` ([[D-055]]) ; le LOT-09 l'a d'abord PARAPHRASÉ pour la
 * synthèse, en omettant l'exclusion des convergences — la revue l'a trouvé
 * avant la signature de la table. Deux écritures d'un même critère divergent au
 * premier changement de l'une, et personne ne le voit tant que la forme
 * concernée n'est pas peuplée. Il n'y en a donc plus qu'une.
 *
 * `CONVERGENCE` est exclue : un accord de sources n'est pas une contradiction
 * (motif d'origine, [[D-055]] M8). `DISCORDANCE` et `CONFLIT_SOURCES` disent
 * toutes deux qu'une incohérence est ouverte. L'escalade praticien reste
 * ouverte — c'est une ISSUE de la politique de résolution, pas son échec
 * (`DC-55`).
 */
export function contradictionEstOuverte(constat: ContradictionFinding): boolean {
  return constat.forme !== 'CONVERGENCE' && constat.resolution.statut !== 'resolue';
}
