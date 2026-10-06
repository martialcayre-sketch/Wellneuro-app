import { prisma } from '@/lib/prisma';
import { estCodeRevocation, etatLecture, type CodeRevocation } from './lectureImport';

// L'ÉCRIVAIN DES ACTES DE LECTURE ([[D-268]], BIO-PARCOURS BP-10) — le seul,
// tenu par `lecturesImportsBiologiques.guard.test.ts`.
//
// LA BASE EST LA GARDE QUI RESTE : son trigger refuse l'import d'un autre
// dossier, un autre praticien que celui du dossier, une lecture sur un import
// sans ligne validée ou qui garde une ligne à décider, une seconde lecture
// active, une révocation hors des lectures de l'import. Ce module relit les
// mêmes conditions AVANT l'écriture pour rendre au praticien une raison
// lisible, et les RELIT APRÈS un refus de la base pour nommer la course
// perdue — jamais pour la contourner.
//
// DEUX CONDITIONS POSÉES PAR LA MIGRATION, et elles tiennent ici :
//   — UNE INSTRUCTION, HORS TRANSACTION, donc en READ COMMITTED (le défaut de
//     Prisma et de PostgreSQL). Sous REPEATABLE READ, l'instantané masquerait
//     la lecture qu'un concurrent vient de commettre derrière le verrou de
//     l'import, et deux lectures actives passeraient ;
//   — JAMAIS UNE DÉCISION DE LIGNE ET UN ACTE DANS LA MÊME TRANSACTION (§2
//     sépare les deux gestes) : la montée d'un `FOR SHARE` vers un `FOR NO KEY
//     UPDATE` sur le même import, par deux transactions à la fois, finirait en
//     interblocage.
// Le banc à deux sessions (`scripts/banc-lectures-imports-deux-sessions.test.mjs`)
// éprouve les deux courses que ce choix doit gagner.

export type ActeLectureLu = {
  id: string;
  acte: 'lecture' | 'revocation';
  idLectureRevoquee: string | null;
  codeRevocation: string | null;
  praticienEmail: string;
  acteLe: string;
};

/** Les actes de lecture des imports désignés, de ce dossier, dans l'ordre. */
export async function lireActesLecture(idPatient: string, idsImports: string[]): Promise<Record<string, ActeLectureLu[]>> {
  const parImport: Record<string, ActeLectureLu[]> = {};
  if (idsImports.length === 0) return parImport;
  const actes = await prisma.lectureImportBiologique.findMany({
    where: { idPatient, idImport: { in: idsImports } },
    orderBy: { ordre: 'asc' },
    select: {
      id: true, idImport: true, acte: true, idLectureRevoquee: true, codeRevocation: true,
      praticienEmail: true, acteLe: true,
    },
  });
  for (const a of actes) {
    (parImport[a.idImport] ??= []).push({
      id: a.id,
      acte: a.acte === 'revocation' ? 'revocation' : 'lecture',
      idLectureRevoquee: a.idLectureRevoquee,
      codeRevocation: a.codeRevocation,
      praticienEmail: a.praticienEmail,
      acteLe: a.acteLe.toISOString(),
    });
  }
  return parImport;
}

export type DemandeActe =
  | { acte: 'lecture' }
  | { acte: 'revocation'; idLecture: string; code: CodeRevocation };

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Le corps reçu, ou `null` s'il ne désigne pas un acte bien formé. */
export function lireDemandeActe(corps: { acte?: unknown; idLecture?: unknown; code?: unknown }): DemandeActe | null {
  if (corps.acte === 'lecture') return { acte: 'lecture' };
  if (corps.acte === 'revocation') {
    const idLecture = typeof corps.idLecture === 'string' ? corps.idLecture.trim() : '';
    if (!ID.test(idLecture) || !estCodeRevocation(corps.code)) return null;
    return { acte: 'revocation', idLecture, code: corps.code };
  }
  return null;
}

export const MESSAGES_ACTE = {
  import_introuvable: 'Cet import n’appartient pas à ce dossier.',
  import_non_valide: 'Aucune ligne de cet import n’est validée : il n’y a pas de lecture à consigner.',
  lignes_a_decider: 'Des lignes de cet import restent à décider : la lecture se consigne une fois toutes les lignes décidées.',
  lecture_deja_active: 'Une lecture est déjà consignée pour cet import.',
  lecture_introuvable: 'Cette lecture n’existe pas pour cet import.',
  lecture_deja_revoquee: 'Cette lecture est déjà révoquée.',
} as const;
export type RaisonRefusActe = keyof typeof MESSAGES_ACTE;

const STATUT_REFUS: Record<RaisonRefusActe, number> = {
  import_introuvable: 404,
  import_non_valide: 409,
  lignes_a_decider: 409,
  lecture_deja_active: 409,
  lecture_introuvable: 404,
  lecture_deja_revoquee: 409,
};

export type IssueActe =
  | { ok: true; acte: { id: string; acte: 'lecture' | 'revocation'; acteLe: string } }
  | { ok: false; reason: RaisonRefusActe; error: string; status: number };

function refus(reason: RaisonRefusActe): IssueActe {
  return { ok: false, reason, error: MESSAGES_ACTE[reason], status: STATUT_REFUS[reason] };
}

/** Ce que la base refuserait, lu sur l'état courant — `null` si l'acte passe. */
async function raisonDeRefus(idPatient: string, idImport: string, demande: DemandeActe): Promise<RaisonRefusActe | null> {
  const [imp, actes] = await Promise.all([
    prisma.importBiologique.findFirst({
      where: { id: idImport, idPatient },
      select: { lignes: { select: { statut: true } } },
    }),
    prisma.lectureImportBiologique.findMany({
      where: { idPatient, idImport },
      select: { id: true, acte: true, idLectureRevoquee: true, codeRevocation: true, praticienEmail: true, acteLe: true },
    }),
  ]);
  if (!imp) return 'import_introuvable';
  if (demande.acte === 'lecture') {
    if (!imp.lignes.some(l => l.statut === 'validee')) return 'import_non_valide';
    if (imp.lignes.some(l => l.statut === 'proposee')) return 'lignes_a_decider';
    if (etatLecture(actes).active) return 'lecture_deja_active';
    return null;
  }
  const cible = actes.find(a => a.id === demande.idLecture && a.acte === 'lecture');
  if (!cible) return 'lecture_introuvable';
  if (actes.some(a => a.acte === 'revocation' && a.idLectureRevoquee === cible.id)) return 'lecture_deja_revoquee';
  return null;
}

/**
 * Pose un acte. `praticienEmail` est celui de la SESSION, déjà reconnu comme
 * praticien du dossier par la garde de la route (`verifierAppartenancePatient`).
 * Aucune condition de suivi clôturé : l'acte se pose même sur un dossier clos
 * (précision du 2026-10-06).
 */
export async function poserActeLecture(entree: {
  idPatient: string;
  idImport: string;
  praticienEmail: string;
  demande: DemandeActe;
}): Promise<IssueActe> {
  const { idPatient, idImport, praticienEmail, demande } = entree;
  const avant = await raisonDeRefus(idPatient, idImport, demande);
  if (avant) return refus(avant);
  try {
    const cree = await prisma.lectureImportBiologique.create({
      data: demande.acte === 'lecture'
        ? { idPatient, idImport, acte: 'lecture', praticienEmail }
        : {
            idPatient, idImport, acte: 'revocation', praticienEmail,
            idLectureRevoquee: demande.idLecture, codeRevocation: demande.code,
          },
      select: { id: true, acteLe: true },
    });
    return { ok: true, acte: { id: cree.id, acte: demande.acte, acteLe: cree.acteLe.toISOString() } };
  } catch (err) {
    // UNE COURSE PERDUE se nomme sur l'état qui l'a fait perdre ; tout autre
    // refus remonte en erreur technique — jamais requalifié en succès.
    const apres = await raisonDeRefus(idPatient, idImport, demande);
    if (apres) return refus(apres);
    throw err;
  }
}
