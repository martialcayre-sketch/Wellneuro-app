/**
 * Note du praticien telle que l'espace patient peut l'afficher (D/52).
 *
 * Jusqu'au 2026-10-23, une assignation créée sans note recevait un libellé
 * par défaut — « Pack <nom> » (pack choisi par le praticien, pack de base du
 * portail) ou « Envoi groupé — bibliothèque » (sélection) —, que l'espace
 * patient affichait sous « Note de votre praticien ». Les écrivains
 * enregistrent désormais null ; les lignes déjà écrites restent en base, et
 * ce filtre les retire à la lecture, sans écriture.
 *
 * Une vraie note commençant par « Pack » est retirée elle aussi : aucune au
 * 2026-10-23 (lecture de production en agrégats), risque accepté par le
 * responsable.
 */
const NOTE_ENVOI_GROUPE_PAR_DEFAUT = 'Envoi groupé — bibliothèque';
const PREFIXE_NOTE_PACK_PAR_DEFAUT = 'Pack ';

export function notePraticienAffichable(notes: string | null | undefined): string | null {
  const note = notes?.trim();
  if (!note) return null;
  if (note === NOTE_ENVOI_GROUPE_PAR_DEFAUT) return null;
  if (note.startsWith(PREFIXE_NOTE_PACK_PAR_DEFAUT)) return null;
  return notes ?? null;
}
