// Note de relecture (SP-TT LOT-02, gate G3) — domaine PUR, aucune dépendance Prisma.
//
// Une note de relecture est une **écriture faite depuis une lecture passée**.
// Elle croise donc frontalement le refus du POST cockpit, qui rejette toute
// écriture dès qu'un `asOf` est présent. La bonne résolution n'est pas
// d'assouplir ce garde-fou — il protège la confirmation d'épisode, qui ne doit
// jamais partir d'un état périmé — mais de recevoir l'instant relu **dans le
// corps de la requête, comme une donnée de la note**, sur une route dédiée.
//
// On n'écrit pas *dans* le passé, on écrit *aujourd'hui, à propos* du passé.
//
// Conséquence dans les types ci-dessous : `instantRelu` est une donnée portée
// par l'appelant, tandis que la date d'écriture n'apparaît **nulle part** dans
// ce qu'on prépare pour la base — c'est `@default(now())` qui la pose. Une note
// ne peut structurellement pas être antidatée.

import { resoudreAsOf, type Repere } from './lectureAsOf';

/** Au-delà, ce n'est plus une note de relecture mais un compte rendu. */
export const LONGUEUR_MAX_NOTE = 4000;

export type RefusNote =
  | 'texte_vide'
  | 'texte_trop_long'
  | 'instant_invalide'
  | 'instant_hors_reperes';

/**
 * Ce qui part en base. Aucune date d'écriture : c'est délibéré et c'est
 * l'invariant du gate. Voir `relectureNote.test.ts`.
 */
export type DonneesNote = {
  idPatient: string;
  praticienEmail: string;
  instantRelu: Date;
  texte: string;
  supersedesNoteId: string | null;
};

export type PreparationNote =
  | { ok: true; donnees: DonneesNote }
  | { ok: false; raison: RefusNote };

/**
 * Valide une note et prépare ses données d'écriture.
 *
 * L'instant relu est validé par `resoudreAsOf`, **la même règle que la
 * lecture** : une note ne peut commenter que ce qui est relisible. Une date
 * arbitraire serait autant un moyen de sonder l'historique par tâtonnement ici
 * qu'elle l'était au GET.
 */
export function preparerNote(entree: {
  idPatient: string;
  praticienEmail: string;
  texte: string;
  instantRelu: string | null | undefined;
  reperes: Repere[];
  supersedesNoteId?: string | null;
}): PreparationNote {
  const texte = entree.texte.trim();
  if (texte.length === 0) return { ok: false, raison: 'texte_vide' };
  if (texte.length > LONGUEUR_MAX_NOTE) return { ok: false, raison: 'texte_trop_long' };

  const resolution = resoudreAsOf(entree.instantRelu, entree.reperes);
  // Un instant absent vaut « présent » pour la lecture ; pour une note, c'est
  // un appel malformé — la note doit dire de QUEL état passé elle parle.
  if (resolution.mode === 'present') return { ok: false, raison: 'instant_invalide' };
  if (resolution.mode === 'refus') {
    return { ok: false, raison: resolution.raison === 'invalide' ? 'instant_invalide' : 'instant_hors_reperes' };
  }

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      praticienEmail: entree.praticienEmail,
      instantRelu: resolution.date,
      texte,
      supersedesNoteId: entree.supersedesNoteId ?? null,
    },
  };
}

export type LigneNote = {
  id: string;
  supersedesNoteId: string | null;
  creeLe: Date;
};

/**
 * Notes actives = têtes de chaîne (aucune autre ne les supplante), de la plus
 * récente à la plus ancienne. Les lignes supplantées ne sont pas supprimées :
 * elles sortent de cette liste, pas de la base — `chaineDeNote` les relit.
 */
export function notesActives<T extends LigneNote>(lignes: T[]): T[] {
  const supplantees = new Set(
    lignes.map((ligne) => ligne.supersedesNoteId).filter((id): id is string => id !== null),
  );
  return lignes
    .filter((ligne) => !supplantees.has(ligne.id))
    .sort((gauche, droite) => {
      const delta = droite.creeLe.getTime() - gauche.creeLe.getTime();
      if (delta !== 0) return delta;
      return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
    });
}

/**
 * Chaîne complète d'une note, de la version demandée vers ses versions
 * antérieures. C'est ce qui donne son sens à « append-only » : corriger n'efface
 * rien, la version précédente reste lisible.
 */
export function chaineDeNote<T extends LigneNote>(lignes: T[], id: string): T[] {
  const parId = new Map(lignes.map((ligne) => [ligne.id, ligne]));
  const chaine: T[] = [];
  const vues = new Set<string>();
  let courant = parId.get(id);
  while (courant && !vues.has(courant.id)) {
    vues.add(courant.id);
    chaine.push(courant);
    courant = courant.supersedesNoteId ? parId.get(courant.supersedesNoteId) : undefined;
  }
  return chaine;
}
