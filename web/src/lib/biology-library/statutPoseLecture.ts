import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { StatutPose } from './statutPoseListe';

// LES STATUTS POSÉS D'UN DOSSIER, LUS POUR LA SÉRIE ([[D-322]], F58) — table
// `statuts_poses_resultats_biologiques`, en ajout seul.
//
// LE STATUT ACTIF D'UNE LIGNE est celui de son DERNIER acte, par `ordre` (la
// règle du trigger) : une pose le donne, un retrait le vide. Rien par défaut,
// rien de calculé. L'historique des poses et des retraits reste lisible
// (§2). Le statut s'attache à la ligne EXACTE (§3) : rien ne passe d'une
// ligne corrigée à sa correction, rien n'est recopié.
//
// CE MODULE NE QUALIFIE AUCUNE VALEUR, et aucun autre lecteur que la série du
// praticien ne le lit : ni portail, ni courrier, ni scoring, ni orientation,
// ni IA ([[D-322]], « Ne touche pas »).

type Client = Prisma.TransactionClient | typeof prisma;

export type ActeStatutLu = {
  id: string;
  acte: 'pose' | 'retrait';
  /** Le statut posé ; `null` pour un retrait. */
  statut: StatutPose | null;
  praticienEmail: string;
  /** Posé par la base, ISO. */
  acteLe: string;
};

export type StatutsDeLaLigne = {
  /** Le dernier acte s'il est une pose ; `null` : « sans statut posé ». */
  actif: (ActeStatutLu & { acte: 'pose'; statut: StatutPose }) | null;
  /** Tous les actes de la ligne, du plus ancien au plus récent. */
  historique: ActeStatutLu[];
};

/**
 * Regroupe des actes DÉJÀ triés par `ordre` croissant, ligne par ligne. Pure :
 * la règle « dernier acte » vit ici et nulle part ailleurs.
 */
export function regrouperActesStatut(
  actes: ReadonlyArray<ActeStatutLu & { idResultat: string }>,
): Map<string, StatutsDeLaLigne> {
  const rendu = new Map<string, StatutsDeLaLigne>();
  for (const { idResultat, ...acte } of actes) {
    const ligne = rendu.get(idResultat) ?? { actif: null, historique: [] };
    ligne.historique.push(acte);
    ligne.actif = acte.acte === 'pose' && acte.statut !== null ? { ...acte, acte: 'pose', statut: acte.statut } : null;
    rendu.set(idResultat, ligne);
  }
  return rendu;
}

/**
 * Les actes de statut du dossier, indexés par la ligne qu'ils visent. Une
 * ligne sans acte est absente : « sans statut posé ». Un échec de lecture
 * lève, il ne se replie jamais sur une table vide.
 */
export async function statutsPosesParLigne(
  client: Client,
  idPatient: string,
): Promise<Map<string, StatutsDeLaLigne>> {
  const lignes = await client.statutPoseResultatBiologique.findMany({
    where: { idPatient },
    orderBy: { ordre: 'asc' },
    select: { id: true, idResultat: true, acte: true, statut: true, praticienEmail: true, acteLe: true },
  });
  return regrouperActesStatut(
    lignes.map(l => ({
      id: l.id,
      idResultat: l.idResultat,
      // Les CHECK de la base tiennent la forme : `acte` vaut `pose` ou
      // `retrait`, une pose porte un statut de la liste, un retrait n'en porte
      // aucun.
      acte: l.acte as ActeStatutLu['acte'],
      statut: l.statut as StatutPose | null,
      praticienEmail: l.praticienEmail,
      acteLe: l.acteLe.toISOString(),
    })),
  );
}
