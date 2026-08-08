import type { BadgeVariant } from '@/components/ui/Badge';
import type { BibliothequeEntree, StatutCertificationRuntime } from '@/lib/bibliotheque';

// Libellés praticien de la vérification de scoring — D-034 (2026-08-08) puis
// D-036 (LOT-02).
//
// D-034 tranche que WellNeuro **ne revendique aucune validation
// psychométrique** : ce que le registre appelle `scoring_verifie` signifie « le
// code reproduit fidèlement la règle enregistrée » — items conformes à la
// source, moteur vérifié par le banc `certify` — et *rien* de la validité de
// construit, de la fidélité ni de l'étalonnage des seuils.
//
// La décision avait été portée dans la consigne système de synthèse
// (`synthese-v19`, gardée par `promptAlimentaire.guard.test.ts`), seule surface
// du **runtime** à revendiquer la validation. Elle nommait elle-même ce qu'elle
// laissait dû : les badges praticien affichaient « Certifié » sans porter ce
// sens. D-036 tranche le geste — **renommer le libellé** plutôt qu'ajouter une
// infobulle ou un lien, et sur **toute la famille** des libellés qui emploient
// le mot : « Non certifié » se lit tout aussi bien comme « non validé
// psychométriquement » que « Certifié » comme « validé ».
//
// POURQUOI CE MODULE EXISTE, et pas deux fonctions locales. Les deux mappers
// vivaient dans `BibliothequePanel.tsx` et `FichePatientPanel.tsx`, non
// exportés : aucun banc ne pouvait asserter ce qu'ils rendaient. Le garde de
// `certificationLibelles.guard.test.ts` porte sur les **valeurs rendues** ici,
// et c'est pour cela qu'il peut refuser le retour du mot nu sans creuser
// d'exception. Les deux littéraux d'écran qui ne passaient par aucun mapper
// (badge et prose des instruments du cabinet) sont devenus des constantes pour
// la même raison : hors de ce module, ils échapperaient au garde.
//
// CE QUI NE CHANGE PAS, et c'est délibéré : aucune valeur de donnée, aucun nom
// de champ. `statutCertification`, `StatutCertificationRuntime` et la valeur
// `'certifie'` gardent leur nom — le vocabulaire du **dossier** reste celui du
// registre. L'écart entre l'écran et le dossier est le prix assumé de D-036.

export type LibelleCertification = { label: string; variant: BadgeVariant };

/**
 * Métadonnée `certification` telle qu'elle est **relue** d'un `scores_json`.
 *
 * Volontairement plus laxiste que `ScoreCertification` de
 * `@/lib/scoring/types` (`source` et `status` y sont requis, sur des unions
 * fermées) : ce type-ci décrit une valeur venant d'une colonne JSON de la base,
 * écrite par des versions antérieures du moteur. Une passation enregistrée avant
 * l'existence de `manuel_eortc` porte ce que portait le moteur de son époque, et
 * le mapper doit lui rendre un libellé plutôt que de la refuser.
 *
 * Nom distinct à dessein : deux types homonymes de requiredness différente,
 * l'un au bord de la base et l'autre dans le moteur, se confondraient.
 */
export type CertificationLue = { source?: string; status?: string };

/**
 * Instruments du cabinet : privés, et leur scoring n'est vérifié par personne
 * d'autre que le praticien qui l'a écrit. Littéral d'écran, pas de mapper —
 * posé ici pour tomber sous le garde.
 */
export const LIBELLE_INSTRUMENT_CABINET = 'Cabinet — scoring non vérifié';

/** Prose du tiroir « Instruments du cabinet ». Même raison d'être ici. */
export const TEXTE_INSTRUMENTS_CABINET =
  'Privés à votre cabinet — leur scoring n’est pas vérifié par WellNeuro ; publication après relecture de la grille.';

/**
 * Badge de la liste du catalogue (rayon Questionnaires de la Bibliothèque).
 *
 * Un badge est rendu dans **tous** les cas, y compris `inconnu` : laisser un
 * instrument actif « sans badge » est ambigu, et c'était la raison d'être de la
 * branche par défaut avant ce déplacement.
 */
export function libelleCertificationBibliotheque(
  // `Pick` et non un type structurel à champs optionnels : dans
  // `BibliothequeEntree`, les deux champs sont **requis**, et `listeBibliotheque()`
  // les remplit toujours. Les rendre optionnels ici rendait `{}` légal et
  // l'envoyait au défaut — donc affirmait « Scoring non vérifié » d'une entrée
  // qui ne porte aucune information, là où le domaine a un état pour cela
  // (`inconnu` → « Statut inconnu »). Affaiblir le contrat était gratuit.
  entree: Pick<BibliothequeEntree, 'certifie' | 'statutCertification'>,
): LibelleCertification {
  if (entree.certifie || entree.statutCertification === 'certifie') {
    return { label: 'Scoring vérifié', variant: 'success' };
  }
  if (entree.statutCertification === 'ambigu') {
    return { label: 'Scoring ambigu', variant: 'warning' };
  }
  if (entree.statutCertification === 'a_verifier') {
    return { label: 'Scoring à vérifier', variant: 'warning' };
  }
  if (entree.statutCertification === 'non_score') {
    return { label: 'Non scoré', variant: 'neutral' };
  }
  if (entree.statutCertification === 'inconnu') {
    return { label: 'Statut inconnu', variant: 'neutral' };
  }
  return { label: 'Scoring non vérifié', variant: 'neutral' };
}

/**
 * Badge de la colonne « Qualité » du tableau « Détail des réponses » de la
 * fiche patient. Rend `null` quand la passation ne porte aucune métadonnée de
 * certification — l'appelant affiche alors « Historique ».
 *
 * Les deux libellés nomment la **source** de la règle scorée, et pas seulement
 * son état : le moteur EORTC suit le manuel officiel, là où les autres suivent
 * la grille Drive. Sans la branche `manuel_eortc`, le badge retombait sur le
 * libellé de défaut alors que le registre porte `scoring_verifie` — la fiche
 * contredisait le dossier.
 */
export function libelleCertificationPassation(
  certification: CertificationLue | null,
): LibelleCertification | null {
  if (!certification) return null;
  if (certification.source === 'drive' && certification.status === 'certifie') {
    return { label: 'Scoring vérifié (Drive)', variant: 'success' };
  }
  if (certification.source === 'drive' && certification.status === 'ambigu') {
    return { label: 'Scoring ambigu (Drive)', variant: 'warning' };
  }
  if (certification.source === 'manuel_eortc' && certification.status === 'certifie') {
    return { label: 'Scoring vérifié (manuel EORTC)', variant: 'success' };
  }
  if (certification.status === 'a_verifier') {
    return { label: 'Scoring à vérifier', variant: 'warning' };
  }
  if (certification.status === 'non_score') {
    return { label: 'Non scoré', variant: 'neutral' };
  }
  return { label: 'Scoring non vérifié', variant: 'neutral' };
}
