import { createHash } from 'node:crypto';
import type { ProtocolAction } from '@/lib/clinical-engine/types';

// LA LISTE DES COMPLÉMENTS CIBLÉS QU'UN COURRIER COUVRE — [[D-345]] §5,
// J3-12h, lot 3. Serveur seulement (`node:crypto`).
//
// LA MÊME LISTE QUE LA BASE. Le trigger de la migration
// `20261024110000_courriers_complement_remises_v1` recalcule la liste depuis le
// payload du protocole approuvé et refuse toute remise dont la liste diffère.
// Ce module la calcule par la même règle (arbitrage du responsable du
// 2026-10-23) :
//
//   <actionId>:<sha256(title)>                        sans référence catalogue
//   <actionId>:<sha256(title)>:<sha256(ingredientId)> avec référence catalogue
//
// éléments distincts, triés en ordre d'octets (`COLLATE "C"` : l'élément est
// ASCII, l'ordre des unités UTF-16 est celui des octets), empreinte = sha-256
// des éléments joints par un saut de ligne. La parité est jouée sur un vrai
// Postgres (`courrierComplement.pg.test.ts`).
//
// REFUSER EN CLAIR AVANT LA BASE. Le format d'`actionId` et le refus d'une
// `supplementCatalogRef` nulle ne vivaient que dans le trigger (fin de la
// migration, « à la charge du lot 3 ») : une exception SQL n'est pas un motif.
// Ce module les refuse avant toute insertion, avec une raison nommée.

export const CONTRAT_COMPLEMENT = 'c1-protocol-draft-v4';

const ACTION_ID = /^[A-Za-z0-9_-]+$/;

export type ListeComplements = { ok: true; elements: string[]; sha256: string };

export type RefusListe =
  | 'contrat_non_v4'
  | 'aucun_complement_cible'
  | 'identifiant_hors_format'
  | 'intitule_vide'
  | 'reference_catalogue_invalide';

export const MOTIFS_REFUS_LISTE: Record<RefusListe, string> = {
  contrat_non_v4: 'Seule une version au contrat V4 porte la nature du complément : aucun courrier possible.',
  aucun_complement_cible: 'La version ne porte aucun complément ciblé : aucun courrier n’est à préparer.',
  identifiant_hors_format:
    'Un complément ciblé porte un identifiant hors format : enregistrez de nouveau la version avant le courrier.',
  intitule_vide: 'Un complément ciblé n’a pas d’intitulé : complétez-le avant le courrier.',
  reference_catalogue_invalide:
    'Un complément ciblé porte une référence catalogue sans ingrédient : corrigez-la avant le courrier.',
};

function sha256(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

function ordreOctets(gauche: string, droite: string): number {
  return gauche < droite ? -1 : gauche > droite ? 1 : 0;
}

/** Les actions `supplement_exploration` marquées « ciblé » — celles que le trigger compte. */
export function complementsCibles(actions: readonly ProtocolAction[]): ProtocolAction[] {
  return actions.filter(action =>
    action !== null
    && typeof action === 'object'
    && action.type === 'supplement_exploration'
    && action.natureComplement === 'cible');
}

/**
 * La liste couverte, depuis les actions PERSISTÉES d'une version (jamais le
 * corps d'une requête) et son contrat. Chaque refus du trigger a ici sa raison.
 */
export function listeComplementsCibles(
  actions: readonly ProtocolAction[],
  contractVersion: string | null | undefined,
): ListeComplements | { ok: false; raison: RefusListe } {
  if (contractVersion !== CONTRAT_COMPLEMENT) return { ok: false, raison: 'contrat_non_v4' };
  const cibles = complementsCibles(actions);
  if (cibles.length === 0) return { ok: false, raison: 'aucun_complement_cible' };

  const elements = new Set<string>();
  for (const action of cibles) {
    if (typeof action.actionId !== 'string' || !ACTION_ID.test(action.actionId)) {
      return { ok: false, raison: 'identifiant_hors_format' };
    }
    if (typeof action.title !== 'string' || !/\S/.test(action.title)) {
      return { ok: false, raison: 'intitule_vide' };
    }
    // `in` et non `!== undefined` : le trigger teste la PRÉSENCE de la clé
    // (`?`), et une clé présente à `null` y est refusée.
    let element = `${action.actionId}:${sha256(action.title)}`;
    if ('supplementCatalogRef' in action && action.supplementCatalogRef !== undefined) {
      const ref = action.supplementCatalogRef as unknown;
      const ingredientId = ref !== null && typeof ref === 'object'
        ? (ref as { ingredientId?: unknown }).ingredientId
        : undefined;
      if (typeof ingredientId !== 'string' || !/\S/.test(ingredientId)) {
        return { ok: false, raison: 'reference_catalogue_invalide' };
      }
      element += `:${sha256(ingredientId)}`;
    }
    elements.add(element);
  }
  const triee = [...elements].sort(ordreOctets);
  return { ok: true, elements: triee, sha256: sha256(triee.join('\n')) };
}

/**
 * « DÉJÀ TRACÉ POUR CES COMPLÉMENTS » ([[D-345]] §4) — arbitrage du responsable
 * du 2026-10-24 : la liste est couverte si elle est CONTENUE dans la liste
 * d'UNE remise antérieure du dossier. Retirer un complément ne demande pas de
 * courrier neuf ; en ajouter un en demande un. L'union de plusieurs remises
 * est écartée : le médecin n'aurait jamais lu la liste entière.
 */
export function listeCouverte(
  elements: readonly string[],
  remises: readonly { complements: readonly string[] }[],
): boolean {
  if (elements.length === 0) return false;
  return remises.some(remise => {
    const couverts = new Set(remise.complements);
    return elements.every(element => couverts.has(element));
  });
}

/** Deux listes égales, élément par élément (elles sont triées). */
export function memeListe(gauche: readonly string[], droite: readonly string[]): boolean {
  return gauche.length === droite.length && gauche.every((element, index) => element === droite[index]);
}
