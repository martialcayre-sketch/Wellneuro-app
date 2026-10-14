import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { annulationParLigne } from './filCorrection';
import type { MotifAnnulation } from './annulationMotifs';

// LES ANNULATIONS D'UN DOSSIER, LUES POUR LES CALCULS ET POUR LA FICHE
// ([[D-294]], BP-09) — table `annulations_resultats_biologiques`, en ajout
// seul.
//
// UNE ANNULATION EST ACTIVE tant qu'aucune révocation ne la vise. Un fil est
// annulé dès qu'UNE de ses lignes en porte une active (§3) : la lecture rend
// donc les annulations actives indexées par la ligne qui les porte, et
// `annulationParLigne` (pure) étend la marque au fil entier, avec la même
// racine que la base.
//
// CE MODULE NE QUALIFIE AUCUNE VALEUR : une annulation dit qu'une saisie est
// fausse, jamais qu'une valeur est anormale (`DC-19`/`DC-20` inchangés).

type Client = Prisma.TransactionClient | typeof prisma;

export type AnnulationActive = {
  id: string;
  /** La ligne qui porte l'annulation — la tête du fil au moment du geste. */
  idResultat: string;
  motif: MotifAnnulation;
  praticienEmail: string;
  /** Posé par la base, ISO. */
  acteLe: string;
};

/**
 * Les annulations ACTIVES du dossier, indexées par la ligne qui les porte.
 * `idsResultats` borne la lecture aux lignes déjà lues ; absent, tout le
 * dossier. Une table vide dit « aucune annulation » : un échec de lecture
 * lève, il ne se replie jamais sur une table vide.
 */
export async function annulationsActives(
  client: Client,
  idPatient: string,
  idsResultats?: readonly string[],
): Promise<Map<string, AnnulationActive>> {
  if (idsResultats && idsResultats.length === 0) return new Map();
  const lignes = await client.annulationResultatBiologique.findMany({
    where: {
      idPatient,
      acte: 'annulation',
      revocations: { none: {} },
      ...(idsResultats ? { idResultat: { in: [...idsResultats] } } : {}),
    },
    select: { id: true, idResultat: true, motifAnnulation: true, praticienEmail: true, acteLe: true },
  });
  const rendu = new Map<string, AnnulationActive>();
  for (const l of lignes) {
    rendu.set(l.idResultat, {
      id: l.id,
      idResultat: l.idResultat,
      // Le CHECK de la base tient la liste fermée : une annulation porte
      // toujours un motif de la liste.
      motif: l.motifAnnulation as MotifAnnulation,
      praticienEmail: l.praticienEmail,
      acteLe: l.acteLe.toISOString(),
    });
  }
  return rendu;
}

/** La clé d'une mesure courante : analyte et horodatage de prélèvement. */
export function cleMesure(analyteCode: string, preleveLe: Date): string {
  return `${analyteCode}|${preleveLe.toISOString()}`;
}

/**
 * Les clés (analyte, prélèvement) du dossier qui portent déjà une mesure
 * COURANTE — une racine (`supersedes_resultat_id` nul) dont le fil n'est pas
 * annulé. C'est la règle du trigger `resultats_biologiques_unicite_mesure`
 * ([[D-294]] §3), qui fait foi : ce préflight ne sert qu'à nommer le refus
 * ligne par ligne avant la transaction. Un fil annulé LIBÈRE sa place.
 */
export async function clesOccupees(
  client: Client,
  idPatient: string,
  cles: ReadonlyArray<{ analyteCode: string; preleveLe: Date }>,
): Promise<Set<string>> {
  if (cles.length === 0) return new Set();
  // Le fil ENTIER de chaque clé, corrections comprises : une annulation peut
  // être portée par une correction, et la racine se lit en remontant.
  const lignes = await client.resultatBiologique.findMany({
    where: { idPatient, OR: cles.map(c => ({ analyteCode: c.analyteCode, preleveLe: c.preleveLe })) },
    select: { id: true, analyteCode: true, preleveLe: true, supersedesResultatId: true, saisiLe: true },
  });
  const maillons = lignes.map(l => ({
    id: l.id,
    supersedesResultatId: l.supersedesResultatId,
    saisiLe: l.saisiLe.toISOString(),
  }));
  const actives = await annulationsActives(client, idPatient, lignes.map(l => l.id));
  const annulees = annulationParLigne(maillons, actives);
  const occupees = new Set<string>();
  for (const l of lignes) {
    if (l.supersedesResultatId === null && !annulees.has(l.id)) {
      occupees.add(cleMesure(l.analyteCode, l.preleveLe));
    }
  }
  return occupees;
}

/**
 * Prend, dans la transaction, les verrous de la garde en base — le dossier,
 * puis la clé (analyte, prélèvement) du résultat visé — par la fonction même
 * que prennent les triggers (`resultats_biologiques_verrouiller_cle`). Les
 * lectures qui suivent voient alors les saisies et les actes concurrents
 * commis : le refus de la route est celui que la base rendrait, avec son
 * message. La clé est relue sur la ligne en SQL, jamais repassée par le
 * client — aucune conversion de fuseau ne peut décaler le verrou.
 *
 * Rend `false` si le résultat n'appartient pas au dossier (rien n'est pris).
 */
export async function verrouillerCleDuResultat(
  tx: Prisma.TransactionClient,
  idPatient: string,
  idResultat: string,
): Promise<boolean> {
  const n = await tx.$executeRaw`
    SELECT public.resultats_biologiques_verrouiller_cle(r.id_patient, r.analyte_code, r.preleve_le)
      FROM public.resultats_biologiques r
     WHERE r.id = ${idResultat} AND r.id_patient = ${idPatient}`;
  return n > 0;
}
