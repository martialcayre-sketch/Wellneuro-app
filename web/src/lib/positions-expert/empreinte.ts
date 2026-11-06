import { createHash } from 'node:crypto';
import { RUBRIQUES_POSITION, type ContenuPosition } from './vocabulaire';

// L'EMPREINTE DU CONTENU D'UNE POSITION — la formule de
// `positions_expert_empreinte_contenu(jsonb)` (migration `positions_expert_v1`) :
// SHA-256 hex de la concaténation des SHA-256 hex des quatre rubriques, dans
// l'ordre fixe, chacune en UTF-8. Elle ne dépend pas de la mise en forme de
// `jsonb::text`. Le banc sur base réelle (`positionsExpert.pg.test.ts`) la
// compare à la fonction SQL, sur des textes piégés.
//
// SERVEUR SEULEMENT (`node:crypto`) : un composant client reçoit l'empreinte
// calculée par la lecture, il ne la calcule pas.

const sha = (texte: string) => createHash('sha256').update(texte, 'utf8').digest('hex');

export function empreinteContenuPosition(contenu: ContenuPosition): string {
  return sha(RUBRIQUES_POSITION.map(r => sha(contenu[r])).join(''));
}

/** `null` si le contenu relu de la base n'a pas ses quatre rubriques en texte. */
export function empreinteContenuBrut(brut: unknown): string | null {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return null;
  const objet = brut as Record<string, unknown>;
  if (!RUBRIQUES_POSITION.every(r => typeof objet[r] === 'string')) return null;
  return empreinteContenuPosition(objet as ContenuPosition);
}
