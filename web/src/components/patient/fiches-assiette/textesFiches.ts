// Les textes de l'espace « Fiches remises par mon praticien » ([[D-251]] §8,
// lot 10). Module PUR : aucun import serveur, les écrans client l'importent.

import type { FicheRemiseServie } from '@/lib/fiches-assiette/ficheServie';

/** Nommé pour ne pas se confondre avec « Mes documents d'information » du centre TRUST (§8). */
export const TITRE_ESPACE = 'Fiches remises par mon praticien';

/** La phrase que la page de lecture doit porter, mot pour mot (§5). */
export const MENTION_IA = 'Fiche adaptée avec l’aide d’une intelligence artificielle, relue et validée par votre praticien.';

/** La mention fixée par l'arbitrage du 2026-09-28 (lots 9-10). */
export const MENTION_PLUS_ACTUELLE = 'Cette fiche ne fait plus partie de votre protocole actuel.';

export const MENTION_RETIREE = 'Votre praticien a retiré cette fiche. Son texte n’est plus affiché.';

export const MENTION_INDISPONIBLE = 'Cette fiche ne peut pas être affichée pour le moment.';

/**
 * Les mentions d'une fiche, dans l'ordre où elles se lisent. L'état d'abord
 * (retirée, indisponible), la place dans le protocole ensuite.
 *
 * `actuel` et `inconnu` ne produisent RIEN : aucune phrase ne dit au patient
 * qu'une fiche « fait partie » de son protocole (amendement du 2026-09-28, nuit).
 */
export function mentionsDeLaFiche(fiche: Pick<FicheRemiseServie, 'etat' | 'protocole'>): string[] {
  const mentions: string[] = [];
  if (fiche.etat === 'retiree') mentions.push(MENTION_RETIREE);
  if (fiche.etat === 'indisponible') mentions.push(MENTION_INDISPONIBLE);
  if (fiche.protocole === 'plus_actuel') mentions.push(MENTION_PLUS_ACTUELLE);
  return mentions;
}

/** Le titre d'une fiche : le sien quand son texte part, sinon le libellé de l'assiette. */
export function titreDeLaFiche(fiche: Pick<FicheRemiseServie, 'contenu' | 'libelle'>): string {
  return fiche.contenu?.titre ?? fiche.libelle;
}

/** « Remise le 28 septembre 2026 », ou rien si la date est illisible. */
export function dateDeRemise(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Remise le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
