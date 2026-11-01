import type { Prisma } from '@/generated/prisma';
import { sanitizeAuditError } from '@/lib/anthropic';
import type { StatutCorrespondancePatient, TypeCorrespondancePatient } from '@/lib/correspondance/patient';

// RÉSERVER UNE LIGNE AVANT D'ENVOYER — [[D-398]] §1 (Q3) et §3, [[D-399]].
//
// LE TROU QUE CE MODULE FERME. Les routes lisaient le journal (cadence,
// doublon), puis envoyaient, puis traçaient. Deux clics simultanés lisaient
// donc tous deux un journal vide, et deux e-mails partaient. Ici, la lecture et
// l'écriture de la ligne se font sous un VERROU PAR DOSSIER, tenu jusqu'au
// commit d'une transaction courte (patron de `reserverAnnonce`, [[D-317]]) :
// la seconde requête attend la première, puis lit sa ligne. L'e-mail part
// APRÈS le commit — jamais dans la transaction, un e-mail ne se reprend pas.
//
// SANS MIGRATION. Aucune colonne ne dit « en cours » : la ligne réservée naît
// `Non_envoye` sous une MARQUE (`erreur_courte`), que le solde efface. Une
// ligne restée marquée (processus arrêté entre l'envoi et le solde) compte
// comme partie : c'est le sens prudent — un rappel retenu se rattrape, un
// rappel doublé non.
//
// CE QUI COMPTE COMME ENVOI ([[D-399]]) : un e-mail parti (`Envoye`), ou en
// partance (marqué). Ne comptent PAS : `Erreur` (rien n'est parti), le
// `Non_envoye` d'une messagerie absente, ni un refus de garde — sans quoi un
// échec bloquerait le geste qui le répare, et chaque refus repousserait la
// fenêtre.

/** Marque d'une ligne réservée dont l'envoi n'est pas soldé. Jamais affichée. */
export const MARQUE_ENVOI_EN_COURS = 'réservé : envoi en cours';

/** Les lignes du journal qui valent un e-mail parti, ou en partance. */
export const FILTRE_ENVOIS_PARTIS = {
  OR: [
    { statut: 'Envoye' },
    { statut: 'Non_envoye', erreurCourte: MARQUE_ENVOI_EN_COURS },
  ],
} satisfies Prisma.CorrespondancePatientWhereInput;

/** Fenêtre de la garde ([[D-398]] §3) — chiffre technique, pas clinique. */
export const FENETRE_GARDE_ENVOI_MS = 60 * 60 * 1000;

/** Les deux e-mails sous garde, et le motif de leur refus. */
export const MOTIFS_GARDE_ENVOI = {
  acces_portail: 'garde : un e-mail d’accès par heure',
  objectif_propose: 'garde : un e-mail d’objectif par heure',
} as const satisfies Partial<Record<TypeCorrespondancePatient, string>>;

export type TypeSousGarde = keyof typeof MOTIFS_GARDE_ENVOI;

type ClientReservation = Pick<Prisma.TransactionClient, 'correspondancePatient' | '$executeRaw'>;

// Client chargé une seule fois pour tout le module (patron de
// `alerteSecuritePraticien`) : deux appels concurrents ne se disputent pas
// l'import.
let clientPrismaCharge: Promise<typeof import('@/lib/prisma')['prisma']> | undefined;
function clientPrisma() {
  clientPrismaCharge ??= import('@/lib/prisma').then(m => m.prisma);
  return clientPrismaCharge;
}

/**
 * Le verrou du dossier pour une sorte d'e-mail, tenu jusqu'au commit. La clé
 * nomme la sorte : un rappel de questionnaire n'attend pas un bilan.
 */
export async function verrouillerEnvois(client: ClientReservation, cle: string): Promise<void> {
  await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`envoi_patient:${cle}`}))`;
}

/** Les champs d'une ligne réservée : `Non_envoye`, sous la marque. */
export function donneesReservation(entree: {
  idPatient: string;
  type: TypeCorrespondancePatient;
  objet: string;
  referenceType?: string;
  referenceId?: string;
}) {
  return {
    idPatient: entree.idPatient,
    canal: 'email',
    sens: 'sortant',
    type: entree.type,
    objet: entree.objet.slice(0, 200),
    statut: 'Non_envoye',
    erreurCourte: MARQUE_ENVOI_EN_COURS,
    referenceType: entree.referenceType,
    referenceId: entree.referenceId,
  };
}

/**
 * Solde une réservation : son statut, et la marque effacée. Une mise à jour
 * perdue laisse la ligne marquée — elle compte alors comme partie, sens
 * prudent (voir l'en-tête).
 */
export async function solderReservation(
  id: string,
  statut: StatutCorrespondancePatient,
  erreur?: unknown,
): Promise<void> {
  try {
    await (await clientPrisma()).correspondancePatient.update({
      where: { id },
      data: {
        statut,
        erreurCourte: statut === 'Erreur' && erreur ? sanitizeAuditError(erreur).slice(0, 200) : null,
      },
    });
  } catch {
    // Registre best-effort : la ligne reste marquée.
  }
}

/**
 * LA GARDE D'UNE HEURE ([[D-398]] §3) : un second e-mail d'accès, ou
 * d'objectif, vers le même dossier dans l'heure est refusé. Le refus est
 * ÉCRIT (`Non_envoye`, sous son motif) et n'est jamais rejoué, comme le
 * plafond d'annonce de [[D-317]].
 *
 * Elle LÈVE si la base ne répond pas : rien ne part sans réservation, et
 * l'appelant rend l'échec comme un échec d'envoi.
 */
export async function reserverSousGarde(
  entree: { idPatient: string; type: TypeSousGarde; objet: string },
  maintenant: Date = new Date(),
  /** Rétablissement d'accès confirmé ([[D-404]]) : la fenêtre ne remonte pas
   *  avant lui. Les liens des e-mails antérieurs sont morts (révocation,
   *  [[D-128]]) ; ceux partis depuis comptent, et un double clic reste refusé. */
  depuis?: Date,
): Promise<{ id: string; refusee: boolean }> {
  const prisma = await clientPrisma();
  const debutFenetre = Math.max(maintenant.getTime() - FENETRE_GARDE_ENVOI_MS, depuis?.getTime() ?? 0);
  return prisma.$transaction(async tx => {
    await verrouillerEnvois(tx, `${entree.type}:${entree.idPatient}`);
    const recents = await tx.correspondancePatient.count({
      where: {
        idPatient: entree.idPatient,
        type: entree.type,
        enregistreLe: { gte: new Date(debutFenetre) },
        ...FILTRE_ENVOIS_PARTIS,
      },
    });
    const refusee = recents > 0;
    const { id } = await tx.correspondancePatient.create({
      data: refusee
        ? { ...donneesReservation(entree), erreurCourte: MOTIFS_GARDE_ENVOI[entree.type] }
        : donneesReservation(entree),
      select: { id: true },
    });
    return { id, refusee };
  });
}
