import { prisma } from '@/lib/prisma';
import {
  ancreRecevable,
  ancreSuivante,
  ancresOrdonnees,
  estAncreDeCycle,
  estJalonMomentum,
} from './cycles';

// LES ANCRES DÉJÀ POSÉES D'UN DOSSIER, LUES EN BASE (`D-113`).
//
// Cinq routes lisaient « l'ancre du cycle » par `where: { milestone: 'T0' }`,
// puis `orderBy: { confirmedAt: 'desc' }`. Les deux moitiés de cette requête
// sont devenues fausses le jour où la série des ancres s'est ouverte : le
// filtre ignore `T1`, et le tri par date départage ce que le RANG identifie.
//
// LE FILTRE SQL EST LARGE, LE FILTRE DE FORME EST EN MÉMOIRE. `startsWith: 'T'`
// ramène aussi ce qui n'est pas une ancre (`TA`, `T01`, `T` seul) — la colonne
// `milestone` ne porte AUCUN CHECK en base, dette nommée par `D-113`. C'est
// `estAncreDeCycle` qui tranche, avec la même règle que partout ailleurs ; un
// `LIKE` plus malin en SQL serait une deuxième définition de « ancre ».

export type AncrePersistee = {
  id: string;
  cycleId: string | null;
  confirmedAt: Date;
  milestone: string;
};

/**
 * Les ancres confirmées d'un dossier, ORDONNÉES PAR RANG.
 *
 * `avantOuA` borne la lecture à une date — le mode `asOf` du cockpit : une
 * ancre confirmée APRÈS la date lue ne doit pas fuir dans une lecture du passé.
 */
export async function lireAncresPersistees(
  idPatient: string,
  avantOuA?: Date | null,
): Promise<AncrePersistee[]> {
  const lignes = await prisma.assessmentEpisode.findMany({
    where: {
      idPatient,
      milestone: { startsWith: 'T' },
      ...(avantOuA ? { confirmedAt: { lte: avantOuA } } : {}),
    },
    // `ancresOrdonnees` trie par RANG, et un tri stable conserve alors l'ordre
    // d'arrivée entre lignes de MÊME rang. Sans `orderBy`, cet ordre est celui
    // que PostgreSQL veut bien rendre : `ancreCourante` — donc l'ancre de toute
    // fenêtre de jalon — deviendrait non déterministe le jour où un dossier
    // porte deux lignes d'un même rang. La colonne n'a ni CHECK ni unicité
    // (dette nommée par `D-113`) : rien n'interdit ce doublon en base.
    orderBy: { confirmedAt: 'asc' },
    select: { id: true, cycleId: true, confirmedAt: true, milestone: true },
  });
  return ancresOrdonnees(lignes.filter((ligne) => estAncreDeCycle(ligne.milestone)));
}

/**
 * L'ancre du cycle COURANT — celle du rang le plus haut, ou `null` si le
 * dossier n'en porte aucune. C'est elle qui ancre les fenêtres de jalon, et
 * plus jamais « la plus récemment confirmée ».
 */
export function ancreCourante(ancres: readonly AncrePersistee[]): AncrePersistee | null {
  return ancres.at(-1) ?? null;
}

/**
 * GARDE D'ÉCRITURE DES DEUX POINTS DE PERSISTANCE (`D-113`).
 *
 * DEUX REFUS, ET ILS NE DISENT PAS LA MÊME CHOSE.
 *
 * 1. LA FORME. `milestone` arrive du NAVIGATEUR et finit dans une colonne
 *    `String` SANS CHECK (dette nommée par `D-113`) : `TA`, `T01` ou `J7` s'y
 *    écriraient sans un mot, et toute lecture les ignorerait ensuite en
 *    silence — l'épisode existerait en base et nulle part à l'écran.
 * 2. LE RANG. Une ancre bien formée n'est pas pour autant celle que ce dossier
 *    attend : seules l'ancre DÉJÀ POSÉE (re-confirmation, que l'`upsert` traite
 *    en idempotent) et celle qui suit immédiatement le rang le plus haut sont
 *    recevables. Un `T7` sur un dossier qui n'a que `T0` laisserait six rangs à
 *    jamais vides, et `ancreSuivante` proposerait ensuite `T8` : le trou ne se
 *    referme pas, il se propage.
 *
 * Écrite ici et non seulement dans le cockpit, pour le motif que `D-052` a déjà
 * établi sur les préconditions : le POST du cockpit n'écrit rien, ce sont ces
 * deux routes qui gardent la base.
 */
export function refusAncreNonRecevable(
  milestone: string,
  ancres: readonly AncrePersistee[],
): string | null {
  if (!estJalonMomentum(milestone)) {
    return `Jalon inconnu : « ${milestone} ». Un épisode porte une ancre de cycle (T0, T1, …) ou un jalon de mesure (J21, J42, J90).`;
  }
  if (!estAncreDeCycle(milestone)) return null;
  const posees = ancres.map((ancre) => ancre.milestone);
  if (ancreRecevable(milestone, posees)) return null;
  return `Ancre de cycle non recevable : « ${milestone} ». Ce dossier attend « ${ancreSuivante(posees)} », ou la re-confirmation d’une ancre déjà posée.`;
}
