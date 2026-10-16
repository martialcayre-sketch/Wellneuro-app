import { createHash } from 'node:crypto';

// LES EMPREINTES DES TEXTES ([[D-314]] §3) — côté serveur seulement.
//
// L'empreinte d'une rubrique ou d'un libellé est le SHA-256 de son texte en
// UTF-8, en hexadécimal minuscule : exactement ce que la base recalcule
// (`encode(sha256(convert_to(texte, 'UTF8')), 'hex')`, migration
// `20261016090000_fiches_usage_v1`). Les deux calculs doivent coïncider au
// caractère près : un acte dont l'empreinte diffère est refusé par trigger.
//
// Séparé d'`etat.ts` : `node:crypto` casse un composant client.

export function empreinteTexte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/**
 * Les rubriques d'une version rangée en base, chacune avec l'empreinte de son
 * texte et ses actes — de quoi juger son état (`etatDeLaVersion`). Une valeur
 * qui n'est pas un texte — la base l'interdit par trigger — prend l'empreinte
 * du texte vide : elle ne peut jamais paraître validée, et la décision refuse
 * d'y poser un acte (`contenu_illisible`).
 */
export function rubriquesLues<A extends { rubrique: string }>(contenu: unknown, actes: readonly A[]) {
  const objet = typeof contenu === 'object' && contenu !== null && !Array.isArray(contenu) ? (contenu as Record<string, unknown>) : {};
  return Object.entries(objet).map(([rubrique, texte]) => ({
    rubrique,
    empreinte: empreinteTexte(typeof texte === 'string' ? texte : ''),
    actes: actes.filter(a => a.rubrique === rubrique),
  }));
}
