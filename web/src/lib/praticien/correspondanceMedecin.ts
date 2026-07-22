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

function estSens(valeur: unknown): valeur is SensCorrespondance {
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
