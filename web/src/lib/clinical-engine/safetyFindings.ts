import {
  REGLE_SECURITE_ANAMNESE,
  SAFETY_SIGNAL_CONDUITES,
  SAFETY_SIGNALS_METADATA,
  rangDuSignal,
  regleSecuriteValidee,
} from '@/lib/clinical/safetySignalsV1';
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
export function construireSafetyFindings(signauxAlerte: string[]): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
} {
  const regle = regleSecuriteValidee();
  if (!regle) {
    return {
      findings: [],
      rules: [{
        ruleId: REGLE_SECURITE_ANAMNESE,
        version: SAFETY_SIGNALS_METADATA.version,
        lifecycle: 'candidate',
      }],
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
  return { findings, rules: [regle] };
}
