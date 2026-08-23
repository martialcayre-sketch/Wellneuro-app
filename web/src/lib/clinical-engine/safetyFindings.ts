import {
  REGLE_SECURITE_ANAMNESE,
  SAFETY_SIGNAL_CONDUITES,
  SAFETY_SIGNALS_METADATA,
  rangDuSignal,
  regleSecuriteValidee,
} from '@/lib/clinical/safetySignalsV1';
import {
  CONDUITE_EFFET_INDESIRABLE,
  REGLE_SECURITE_EFFET_INDESIRABLE,
  SAFETY_EI_METADATA,
  STATUTS_EI_NON_TRAITES,
  regleEffetIndesirableValidee,
} from '@/lib/clinical/safetyEffetIndesirableV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import type { ClinicalRuleRef, SafetyFinding } from './types';

// PRODUCTEUR DE CONSTATS DE SÉCURITÉ — [[D-099]], LOT-04.
//
// Le type `SafetyFinding` existait depuis la chaîne T0, son consommateur aussi
// (`decisionCard.ts` bloque dès `safetyFindings.length > 0`) : ce module est la
// pièce manquante, et la seule. Il ne crée ni le type, ni le blocage — il donne
// une ENTRÉE à un chemin déjà écrit, bancé, et resté inerte en production
// parce que `chaineC1.ts` posait `safetyFindings: 0` en dur.
//
// DÉTERMINISTE ET SANS LLM : mêmes libellés ⇒ mêmes constats, mêmes
// identifiants, même empreinte. C'est la propriété dont dépend `verifierChaineC1`
// — un producteur non déterministe ferait 409 sur une carte honnête.
//
// AUCUN POINT, DANS AUCUN SENS (`DC-23`). Ce module ne lit aucun score, n'en
// écrit aucun, et le constat qu'il produit ne porte ni gravité chiffrée, ni
// rang numérique, ni pondération. Le seul champ de la base commune qui pourrait
// s'y confondre — `confidence`, imposé par `ClinicalFindingBase` — est FIGÉ à
// une constante (voir plus bas).

/**
 * Les signaux tels que le patient les a déclarés — bruts, non filtrés.
 *
 * PAS `extraireDrapeauxAnamnese` : ce champ-là filtre contre l'énuméré courant
 * et fait DISPARAÎTRE en silence un libellé qui a dérivé (son propre commentaire
 * le dit, et le renvoie à `extraireVigilanceDeterministe`). Sur un chemin de
 * sécurité, cette disparition est un repli fail-open, exactement la classe que
 * [[D-072]] a fermée ailleurs.
 *
 * PAS `liste()` non plus, et pour deux motifs : elle borne à 50 entrées — un
 * plafond silencieux est un fail-open de plus — et elle NEUTRALISE le texte
 * pour le prompt (`<` → `‹`, sauts de ligne → « — »), ce qui transformerait un
 * libellé avant de le comparer à la cotation signée.
 *
 * Ce qui n'est pas une chaîne non vide n'est pas un signal : une entrée
 * numérique, nulle ou objet n'a pas de libellé à coter, et rien ne permet d'en
 * inventer un. Le tri et la déduplication rendent la sortie indépendante de
 * l'ordre de stockage — condition du déterminisme des empreintes.
 */
export function signauxDeclares(anamnese: unknown): string[] {
  const record = anamnese !== null && typeof anamnese === 'object' && !Array.isArray(anamnese)
    ? anamnese as Record<string, unknown>
    : {};
  const brut = record.signaux_alerte;
  if (!Array.isArray(brut)) return [];
  return [...new Set(
    brut
      .filter((valeur): valeur is string => typeof valeur === 'string')
      .map(valeur => valeur.trim())
      .filter(Boolean)
  )].sort();
}

/**
 * L'identifiant d'un constat, dérivé du libellé VERBATIM.
 *
 * Ni l'index dans la table (un réordonnancement déplacerait le sens d'un
 * identifiant déjà écrit dans des cartes émises), ni un slug (lossy, donc
 * susceptible de collision entre deux libellés voisins). L'empreinte du
 * libellé donne les trois propriétés voulues : stable tant que le libellé
 * l'est, distincte dès qu'il change — et un libellé qui change EST un autre
 * signal —, et définie même sur un libellé que la table ne connaît pas.
 */
function findingId(libelle: string): string {
  return `safety:anamnese:${sha256(libelle).slice(0, 16)}`;
}

const LIMITATION_PROVENANCE =
  'Ce constat provient de l’anamnèse déclarée, qui n’est pas une passation :'
  + ' il ne cite aucune réponse de questionnaire.';

const LIMITATION_HORS_COTATION =
  'Ce libellé n’appartient pas à la cotation signée du 2026-08-23 : faute de rang connu,'
  + ' il est traité comme un adressage plutôt qu’ignoré.';

const LIMITATION_EI_PROVENANCE =
  'Ce constat provient d’un signalement déposé au portail patient, qui n’est pas une'
  + ' passation : il ne cite aucune réponse de questionnaire.';

/**
 * Un signalement d'effet indésirable, tel que la chaîne C1 le reçoit.
 *
 * NI LES SYMPTÔMES NI LE LIBELLÉ DU PRODUIT N'Y FIGURENT, et c'est une garde,
 * pas un oubli. Ce type traverse `construireSafetyFindings`, dont la sortie
 * entre dans la `rationale` d'un constat, puis dans l'empreinte de la carte de
 * décision, puis dans le corps d'une réponse HTTP. Les mots que le patient a
 * écrits sur ses symptômes n'ont rien à faire sur ce trajet ; le praticien les
 * lit sur la surface des signalements, à leur place.
 */
export type EffetIndesirableRuntime = {
  id: string;
  /** Le protocole que le patient a DÉSIGNÉ, ou `null` — jamais déduit. */
  protocolDraftId: string | null;
  /** `recu` | `en_cours` | `traite` | `clos`, tel que la base le porte. */
  statutTraitement: string;
};

/**
 * Les constats produits par le SECOND producteur ([[D-101]], `DC-42`).
 *
 * TROIS SORTIES, ET AUCUNE N'EST « NE RIEN FAIRE EN SILENCE » :
 *
 *   1. Signalement RATTACHÉ à un protocole et non traité ⇒ un constat. Il
 *      inhibe, exactement comme un signal d'anamnèse de rang `adressage`.
 *   2. Signalement non traité SANS rattachement ⇒ aucun constat, et une
 *      LIMITATION qui le dit. Le patient n'a désigné aucun protocole ; en
 *      deviner un serait la déduction que le lot interdit, et se taire ferait
 *      disparaître un signalement ouvert de la vue du praticien (`DC-35`).
 *   3. Table non signée ⇒ aucun constat, et la règle jointe en `candidate` :
 *      `buildClinicalReview` en tire seul la limitation « Règle candidate
 *      inactive ». Ce cas est celui de la LIVRAISON.
 *
 * L'IDENTIFIANT DU SIGNALEMENT EST CITÉ, ET RIEN D'AUTRE. Il permet au
 * praticien de retrouver la ligne ; il ne transporte aucun contenu clinique.
 */
function construireFindingsEffetIndesirable(effetsIndesirables: EffetIndesirableRuntime[]): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
  limitations: string[];
} {
  const regle = regleEffetIndesirableValidee();
  if (!regle) {
    // Aucune limitation propre : la revue produit déjà « Règle candidate
    // inactive : SAF-EI-01. » depuis le `lifecycle`, et l'écrire une seconde
    // fois dirait deux fois la même chose au praticien.
    return {
      findings: [],
      rules: [{
        ruleId: REGLE_SECURITE_EFFET_INDESIRABLE,
        version: SAFETY_EI_METADATA.version,
        lifecycle: 'candidate',
      }],
      limitations: [],
    };
  }

  const ouverts = effetsIndesirables.filter(
    signalement => (STATUTS_EI_NON_TRAITES as readonly string[]).includes(signalement.statutTraitement),
  );
  // Tri par identifiant : l'ordre de la base n'est pas stable, et deux ordres
  // produiraient deux empreintes de carte pour un même dossier — donc un 409
  // sur une carte honnête.
  const rattaches = ouverts
    .filter(signalement => signalement.protocolDraftId !== null)
    .sort((gauche, droite) => (gauche.id < droite.id ? -1 : gauche.id > droite.id ? 1 : 0));
  const sansRattachement = ouverts.length - rattaches.length;

  return {
    findings: rattaches.map(signalement => ({
      findingId: `safety:effet-indesirable:${signalement.id}`,
      kind: 'safety' as const,
      disposition: 'requires_practitioner_review' as const,
      // FIGÉ, pour le motif exact du premier producteur : faire varier
      // `confidence` avec la sévérité déclarée en ferait une gravité chiffrée.
      confidence: 'à_documenter' as const,
      rationale: `${CONDUITE_EFFET_INDESIRABLE} Signalement : ${signalement.id}.`,
      ruleId: regle.ruleId,
      // VIDE ET VALIDE : le snapshot est bâti sur les passations, et un
      // signalement de portail n'en est pas une.
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitations: [LIMITATION_EI_PROVENANCE],
    })),
    rules: [regle],
    limitations: sansRattachement > 0
      ? [
        `${sansRattachement} signalement(s) d’effet indésirable non traité(s) ne sont rattachés à aucun`
        + ' protocole : le patient n’en a désigné aucun, et la machine n’en déduit pas.'
        + ' Ils n’interrompent donc rien et restent à examiner sur la surface des signalements.',
      ]
      : [],
  };
}

/**
 * Les constats de sécurité d'un dossier, et les règles à joindre à la revue.
 *
 * TROIS CAS, ET AUCUN N'EST « NE RIEN FAIRE EN SILENCE » :
 *
 *   1. Libellé coté `adressage` ⇒ un constat. Il inhibe : `evaluerAbstention`
 *      passe en `required`, la table des priorités se tait, la carte est
 *      bloquée et aucun protocole n'est diffusable.
 *   2. Libellé coté `vigilance` ⇒ AUCUN constat, et c'est l'arbitrage
 *      [[D-099]] lui-même, pas un oubli. Le signal continue de remonter au
 *      praticien par `extraireVigilanceDeterministe`, inchangé.
 *   3. Libellé inconnu de la cotation ⇒ un constat, comme au cas 1
 *      (fail-closed). Un signal présent dont on ne sait pas le rang est un
 *      silence sur le rang, jamais une permission (`DC-13`, `DC-24`). Ce cas
 *      est VIDE en production au 2026-08-23 — les neuf dossiers porteurs ne
 *      portent que des libellés exacts de l'énuméré —, et il existe pour le
 *      jour où un libellé d'`anamnese.ts` sera réécrit sans que la cotation
 *      suive.
 *
 * TABLE NON SIGNÉE : aucun constat n'est produit, et la règle est jointe à la
 * revue en `candidate` — `buildClinicalReview` en tire alors, tout seul, la
 * limitation « Règle candidate inactive : SAF-ANAM-01. », servie au praticien.
 * L'inhibition tombe donc avec la signature, ce qui est le sens INVERSE des
 * autres verrous du dépôt ; c'est dit ici, gardé par `safetyFindings.guard.test.ts`,
 * et l'état non signé rend le CI rouge avant d'atteindre la production.
 */
export function construireSafetyFindings(
  signauxAlerte: string[],
  /**
   * Les signalements d'effet indésirable du dossier ([[D-101]], LOT-05).
   *
   * DÉFAUT `[]`, ET C'EST LE SEUL DE CE MODULE — il ne dit pas « aucun
   * signalement » mais « ce chemin ne lit pas les signalements ». La distinction
   * tient parce que le seul appelant qui les fournit est celui qui les a
   * réellement interrogés : quand `interruptionEffetIndesirableActive()` est
   * faux, aucune requête n'est émise et le second producteur reste muet, ce que
   * `limitationsEffetIndesirable` ne compense pas non plus — il n'y a rien à
   * dire d'une lecture qui n'a pas eu lieu et dont le dispositif entier est
   * éteint. Un défaut sur `signauxAlerte`, lui, resterait interdit : ce
   * chemin-là est allumé.
   */
  effetsIndesirables: EffetIndesirableRuntime[] = [],
): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
  /** Ce que le second producteur n'a pas pu conclure, dit plutôt que tu. */
  limitations: string[];
} {
  const securiteEI = construireFindingsEffetIndesirable(effetsIndesirables);
  const regle = regleSecuriteValidee();
  if (!regle) {
    return {
      findings: securiteEI.findings,
      rules: [
        {
          ruleId: REGLE_SECURITE_ANAMNESE,
          version: SAFETY_SIGNALS_METADATA.version,
          lifecycle: 'candidate',
        },
        ...securiteEI.rules,
      ],
      limitations: securiteEI.limitations,
    };
  }

  const findings: SafetyFinding[] = [];
  for (const libelle of signauxAlerte) {
    const rang = rangDuSignal(libelle);
    if (rang === 'vigilance') continue;
    findings.push({
      findingId: findingId(libelle),
      kind: 'safety',
      disposition: 'requires_practitioner_review',
      // FIGÉ, ET LE FIGEMENT EST LA GARDE. `confidence` est imposé par
      // `ClinicalFindingBase`, partagé avec les manques et les discordances :
      // il ne peut pas être retiré du seul objet de sécurité sans toucher les
      // deux autres. Le faire VARIER — avec le rang, le domaine, le nombre de
      // signaux — en ferait une mesure de gravité déguisée, c'est-à-dire
      // exactement ce que `DC-23` interdit. « à_documenter » dit la seule
      // chose vraie : le signal est déclaré par le patient, il n'est pas
      // vérifié, et c'est au praticien de le documenter.
      confidence: 'à_documenter',
      rationale: `${SAFETY_SIGNAL_CONDUITES.adressage} Signal déclaré : « ${libelle} ».`,
      ruleId: regle.ruleId,
      // VIDE, ET VALIDE. `validateProvenance` exige que toute source citée
      // existe dans le snapshot ; l'anamnèse n'y figure pas — le snapshot est
      // bâti sur les passations. Citer une réponse serait donc faux, et en
      // fabriquer une ferait jeter la revue. L'origine est dite dans les
      // limitations, où elle est lisible par le praticien.
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitations: rang === null
        ? [LIMITATION_PROVENANCE, LIMITATION_HORS_COTATION]
        : [LIMITATION_PROVENANCE],
    });
  }
  return {
    findings: [...findings, ...securiteEI.findings],
    rules: [regle, ...securiteEI.rules],
    limitations: securiteEI.limitations,
  };
}
