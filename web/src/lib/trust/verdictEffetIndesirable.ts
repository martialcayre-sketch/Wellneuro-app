import {
  type Rattachement,
  type VerdictEffetIndesirable,
  verdictCourant,
} from './pauseEffetIndesirable';

// LE VERDICT DU PRATICIEN SUR UN SIGNALEMENT RATTACHÉ — [[D-281]] §5, étape 4.
//
// MODULE PUR, LISIBLE PAR LE NAVIGATEUR : la route le joue avant d'écrire, le
// formulaire en tire ses libellés. La base tient les mêmes règles par trigger
// (migration `20261012230000_saf_ei_rattachement_verdict_v1`) ; les rejouer ici
// rend au praticien un message qu'il comprend plutôt qu'une erreur technique,
// et la base reste le dernier mot.
//
// CE QU'IL NE DÉCIDE PAS : l'effet du verdict. Il lève ou maintient la pause
// (`elementsEnPause`) ; la pause, elle, n'est servie qu'à la signature de la
// règle amendée (D-281 §6, étape 5).

export type Amenagement = 'retirer' | 'differer' | 'reduire';

/**
 * La liste fermée des aménagements (D-281 §5) : ni « reconduire » ni
 * « augmenter » — l'élément impliqué ne repart jamais à l'identique ni
 * augmenté (`DC-42`). La base porte la même liste en CHECK.
 */
export const AMENAGEMENTS: readonly Amenagement[] = ['retirer', 'differer', 'reduire'];

export const LIBELLE_AMENAGEMENT: Record<Amenagement, string> = {
  retirer: 'Retirer',
  differer: 'Différer',
  reduire: 'Réduire',
};

export const LIBELLE_VERDICT: Record<VerdictEffetIndesirable['verdict'], string> = {
  implique: 'Impliqué',
  non_implique: 'Non impliqué',
};

export type DemandeVerdict = {
  verdict?: unknown;
  elementActionId?: unknown;
  amenagement?: unknown;
  /** Le verdict que le praticien corrige : la tête de chaîne qu'il a vue, ou `null`. */
  supersedesVerdictId?: unknown;
};

export type VerdictAEcrire = {
  verdict: VerdictEffetIndesirable['verdict'];
  elementActionId: string | null;
  amenagement: Amenagement | null;
  supersedesVerdictId: string | null;
};

export type ResultatVerdict =
  | { ok: true; aEcrire: VerdictAEcrire }
  | { ok: false; status: 400 | 409; error: string };

/**
 * Valide la demande d'un praticien contre le signalement et la chaîne déjà
 * rendue.
 *
 * - `elements` : les éléments DÉSIGNABLES du programme visé (orientation et
 *   prise de sang exclues, D-281 §2), ou `null` quand ce programme ne se lit
 *   pas — aucun élément ne peut alors être désigné par le praticien.
 * - LA CORRECTION EST EXPLICITE : la demande nomme le verdict qu'elle
 *   supplante, et il doit être la tête de chaîne actuelle. Un avis rendu
 *   entre-temps par un autre onglet ou un autre praticien rend 409, plutôt que
 *   d'écraser en silence ce qu'il a tranché (la base refuserait aussi : une
 *   racine par signalement, un successeur par verdict).
 */
export function validerDemandeVerdict(input: {
  signalement: { id: string; rattachement: Rattachement; elementActionId: string | null };
  verdicts: readonly VerdictEffetIndesirable[];
  elements: readonly { actionId: string }[] | null;
  demande: DemandeVerdict;
}): ResultatVerdict {
  const { signalement, demande } = input;
  const chaine = input.verdicts.filter(v => v.reportId === signalement.id);
  const tete = verdictCourant(signalement.id, chaine);
  if (chaine.length > 0 && tete === null) {
    // Deux têtes : irreprésentable en base (index uniques). Fail-closed.
    return { ok: false, status: 409, error: 'La chaîne des avis de ce signalement est incohérente : aucun avis ne peut être ajouté.' };
  }

  const supplante = demande.supersedesVerdictId ?? null;
  if (supplante !== null && typeof supplante !== 'string') {
    return { ok: false, status: 400, error: 'Paramètres invalides.' };
  }
  if (supplante !== (tete?.id ?? null)) {
    return { ok: false, status: 409, error: 'Un avis a été rendu ou corrigé entre-temps sur ce signalement. Rechargez avant de le corriger.' };
  }

  if (demande.verdict !== 'implique' && demande.verdict !== 'non_implique') {
    return { ok: false, status: 400, error: 'Choisissez « impliqué » ou « non impliqué ».' };
  }

  if (demande.verdict === 'non_implique') {
    if (demande.elementActionId != null || demande.amenagement != null) {
      return { ok: false, status: 400, error: 'Un avis « non impliqué » ne porte ni élément ni aménagement.' };
    }
    if (tete?.verdict === 'non_implique') {
      return { ok: false, status: 400, error: 'Cet avis est déjà celui en vigueur.' };
    }
    return { ok: true, aEcrire: { verdict: 'non_implique', elementActionId: null, amenagement: null, supersedesVerdictId: supplante } };
  }

  if (!AMENAGEMENTS.includes(demande.amenagement as Amenagement)) {
    return { ok: false, status: 400, error: 'Choisissez l’aménagement : retirer, différer ou réduire.' };
  }
  const amenagement = demande.amenagement as Amenagement;

  let elementActionId: string;
  if (signalement.rattachement === 'element') {
    // L'élément impliqué est celui que le patient a désigné (trigger
    // `trust_aev_avant_insertion`) : le praticien ne le choisit pas.
    if (signalement.elementActionId === null) {
      return { ok: false, status: 409, error: 'Le signalement ne porte pas l’élément désigné.' };
    }
    if (demande.elementActionId != null && demande.elementActionId !== signalement.elementActionId) {
      return { ok: false, status: 400, error: 'L’élément impliqué est celui que le patient a désigné.' };
    }
    elementActionId = signalement.elementActionId;
  } else {
    // « Je ne sais pas » ou « un autre produit » : le praticien désigne
    // l'élément en cause (D-281 §5), parmi ceux que le patient aurait pu
    // désigner.
    if (input.elements === null) {
      return { ok: false, status: 409, error: 'Le programme visé par ce signalement ne se lit pas : aucun élément ne peut être désigné.' };
    }
    if (typeof demande.elementActionId !== 'string'
      || !input.elements.some(element => element.actionId === demande.elementActionId)) {
      return { ok: false, status: 400, error: 'Choisissez l’élément en cause dans le programme visé.' };
    }
    elementActionId = demande.elementActionId;
  }

  if (tete?.verdict === 'implique' && tete.elementActionId === elementActionId && tete.amenagement === amenagement) {
    return { ok: false, status: 400, error: 'Cet avis est déjà celui en vigueur.' };
  }

  return { ok: true, aEcrire: { verdict: 'implique', elementActionId, amenagement, supersedesVerdictId: supplante } };
}
