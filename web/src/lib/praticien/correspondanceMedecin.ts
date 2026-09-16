// Correspondance médecin (C3 LOT-06, V1 = transcription praticien) — domaine
// PUR, aucune dépendance Prisma.
//
// Le médecin n'accède à rien et l'application n'envoie rien : le praticien
// consigne un envoi fait par ses canaux habituels (sens « sortant ») et
// transcrit une réponse reçue (sens « entrant »).
//
// MINIMISATION (données d'un tiers) : le médecin n'est désigné que par un
// libellé libre — le refus d'un `@` dans ce libellé est une garde
// structurelle, pas une politique : la promesse « aucune adresse e-mail
// médecin » ne doit pas dépendre de la discipline de saisie. Best-effort
// assumé : rien n'empêche un RPPS numérique tapé à la main ; la vraie
// garantie reste l'absence de champ dédié.
//
// DEUX DATES, jamais confondues (patron SP-TT) : `echangeLe` est une donnée
// portée par l'appelant — la date de l'échange réel, facultative — tandis que
// la date de consignation n'apparaît NULLE PART dans ce qu'on prépare pour la
// base : c'est `@default(now())` qui la pose. Une consignation ne peut
// structurellement pas être antidatée.

export const SENS_CORRESPONDANCE = ['sortant', 'entrant'] as const;
export type SensCorrespondance = (typeof SENS_CORRESPONDANCE)[number];

/**
 * LE SENS SE LIT ICI, ET NULLE PART AILLEURS.
 *
 * La colonne `sens` n'a aucun CHECK en base (migration
 * `20260722170000_c3_fil_correspondance_medecin_v1` : `"sens" TEXT NOT NULL`).
 * Chacun des deux écrans s'était donc écrit son propre repli — et ils
 * repliaient EN SENS INVERSE : l'accueil rendait « Envoi consigné » là où la
 * fiche rendait « Réponse transcrite », pour la même ligne, sous un extrait de
 * son texte. Une colonne non contrainte produisait deux affirmations
 * incompatibles sur le même dossier.
 *
 * LE TROISIÈME REPLI N'EN EST PAS UN. Départager les deux écrans reviendrait à
 * choisir laquelle des deux affirmations fausses garder : une valeur hors
 * vocabulaire n'est pas un envoi, et pas davantage une réponse — elle est une
 * donnée qu'on ne sait pas lire. Le patron du dépôt pour ce cas est écrit
 * ([[DC-24]], et `sans_ancrage` qui n'est pas `perimee`) : on ne fait pas
 * porter à la donnée un jugement qu'elle ne soutient pas. `libelleSens` rend
 * donc un libellé VRAI DES DEUX SENS, et le contrat expose `null`.
 */
export const LIBELLES_SENS: Record<SensCorrespondance, string> = {
  sortant: 'Envoi consigné',
  entrant: 'Réponse transcrite',
};

/** Libellé neutre : vrai quel que soit le sens, donc sûr quand il est illisible. */
export const LIBELLE_SENS_INDETERMINE = 'Échange consigné';

/**
 * Le seul lecteur de `sens` du produit. Prend la valeur telle qu'elle sort de
 * la base — `string`, `null`, ou n'importe quoi — et ne rend jamais une
 * affirmation de direction qu'elle ne porte pas.
 */
export function libelleSens(valeur: unknown): string {
  return estSens(valeur) ? LIBELLES_SENS[valeur] : LIBELLE_SENS_INDETERMINE;
}

/** Normalise pour le CONTRAT : le sens lu, ou `null` s'il est hors vocabulaire. */
export function sensExpose(valeur: unknown): SensCorrespondance | null {
  return estSens(valeur) ? valeur : null;
}

/**
 * Une ligne ANCRÉE n'a pas été remise : elle a été GÉNÉRÉE.
 *
 * Les deux colonnes d'ancrage ([[D-073]]) ne se posent que par un générateur
 * serveur — le courrier biologie aujourd'hui. Cette ligne-là est écrite au
 * moment où le papier est produit, avant toute remise : la donner pour un
 * « Envoi consigné » affirme un geste que personne n'a fait, et c'est le faux
 * positif que le fil sert depuis l'ouverture du courrier biologie.
 *
 * L'inverse n'est pas vrai et n'est pas supposé : une ligne SANS ancre n'est
 * pas pour autant remise à la main — elle est seulement une ligne dont
 * l'origine ne se lit pas, et `libelleSens` la rend comme avant.
 */
export const LIBELLE_ORIGINE_GENEREE = 'Courrier préparé';

/**
 * Les verdicts d'ancrage qui ATTESTENT une ancre — la route compose son
 * `VerdictAncrage` d'eux et de `sans_ancrage`, cette liste est donc la source
 * unique et ne peut pas dériver.
 *
 * L'énumération est délibérée, et c'est l'inverse de `!== 'sans_ancrage'` :
 * un verdict que le domaine ne connaît pas — absent d'une charge ancienne,
 * futur, illisible — n'atteste RIEN. La ligne retombe alors sur son sens,
 * c'est-à-dire sur ce qui était affiché avant, plutôt que de gagner une
 * origine que personne n'a servie ([[DC-24]]).
 */
export const VERDICTS_ANCRES = ['concordante', 'perimee', 'reference_inconnue'] as const;
export type VerdictAncre = (typeof VERDICTS_ANCRES)[number];

/** `true` seulement si le verdict servi atteste une ancre. */
export function estAncree(verdict: unknown): boolean {
  return VERDICTS_ANCRES.some((connu) => connu === verdict);
}

/**
 * Le libellé d'une ligne du fil : l'origine prime sur le sens quand elle se
 * lit. L'origine se lit dans le VERDICT servi par la route — jamais dans un
 * SHA recomparé à l'écran.
 */
export function libelleLigne(valeur: unknown, verdictAncrage: unknown): string {
  // Une réponse TRANSCRITE reste une réponse transcrite, ancre ou pas : aucun
  // générateur n'écrit `entrant` aujourd'hui, et si l'un s'y mettait, « Courrier
  // préparé » retournerait le sens de l'échange. Le sens lu gagne.
  if (estAncree(verdictAncrage) && sensExpose(valeur) !== 'entrant') {
    return LIBELLE_ORIGINE_GENEREE;
  }
  return libelleSens(valeur);
}

/** Une lettre transcrite dépasse une note de relecture (4000) ; au-delà de
 *  8000, ce n'est plus une transcription mais une archive à tenir ailleurs. */
export const LONGUEUR_MAX_TEXTE = 8000;
export const LONGUEUR_MAX_MEDECIN_LIBELLE = 200;

export type RefusCorrespondance =
  | 'sens_invalide'
  | 'medecin_libelle_vide'
  | 'medecin_libelle_email'
  | 'medecin_libelle_trop_long'
  | 'texte_vide'
  | 'texte_trop_long'
  | 'date_echange_invalide'
  | 'date_echange_future';

/**
 * Ce qui part en base. AUCUNE date de consignation : c'est délibéré et c'est
 * l'invariant du lot. Voir `correspondanceMedecin.test.ts`.
 */
export type DonneesCorrespondance = {
  idPatient: string;
  praticienEmail: string;
  sens: SensCorrespondance;
  medecinLibelle: string;
  texte: string;
  idSynthese: string | null;
  echangeLe: Date | null;
};

export type PreparationCorrespondance =
  | { ok: true; donnees: DonneesCorrespondance }
  | { ok: false; raison: RefusCorrespondance };

export function estSens(valeur: unknown): valeur is SensCorrespondance {
  return (
    typeof valeur === 'string' && (SENS_CORRESPONDANCE as readonly string[]).includes(valeur)
  );
}

/** Valide une consignation et prépare ses données d'écriture. */
export function preparerCorrespondance(entree: {
  idPatient: string;
  praticienEmail: string;
  sens: unknown;
  medecinLibelle: unknown;
  texte: unknown;
  idSynthese?: unknown;
  echangeLe?: unknown;
}): PreparationCorrespondance {
  if (!estSens(entree.sens)) return { ok: false, raison: 'sens_invalide' };

  const medecinLibelle = typeof entree.medecinLibelle === 'string' ? entree.medecinLibelle.trim() : '';
  if (medecinLibelle.length === 0) return { ok: false, raison: 'medecin_libelle_vide' };
  if (medecinLibelle.includes('@')) return { ok: false, raison: 'medecin_libelle_email' };
  if (medecinLibelle.length > LONGUEUR_MAX_MEDECIN_LIBELLE) {
    return { ok: false, raison: 'medecin_libelle_trop_long' };
  }

  const texte = typeof entree.texte === 'string' ? entree.texte.trim() : '';
  if (texte.length === 0) return { ok: false, raison: 'texte_vide' };
  if (texte.length > LONGUEUR_MAX_TEXTE) return { ok: false, raison: 'texte_trop_long' };

  let echangeLe: Date | null = null;
  if (entree.echangeLe !== undefined && entree.echangeLe !== null && entree.echangeLe !== '') {
    if (typeof entree.echangeLe !== 'string') return { ok: false, raison: 'date_echange_invalide' };
    const date = new Date(entree.echangeLe);
    if (!Number.isFinite(date.getTime())) return { ok: false, raison: 'date_echange_invalide' };
    if (date.getTime() > Date.now()) return { ok: false, raison: 'date_echange_future' };
    echangeLe = date;
  }

  const idSynthese =
    typeof entree.idSynthese === 'string' && entree.idSynthese.trim().length > 0
      ? entree.idSynthese.trim()
      : null;

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      praticienEmail: entree.praticienEmail,
      sens: entree.sens,
      medecinLibelle,
      texte,
      idSynthese,
      echangeLe,
    },
  };
}
