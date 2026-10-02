import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

// DÉPÔT D'UN COMPTE RENDU (BIO-INGEST LOT-02, [[D-256]] A2). Le document est
// conservé en base HDS, entier, figé (la base refuse tout UPDATE). Aucun nom
// de fichier n'est gardé : il porte souvent l'identité du patient.
//
// LE LOT-02 N'ACCEPTE QUE LE PDF. La base admet déjà JPEG, PNG et WebP pour
// que le LOT-03 (photo, scan) se fasse sans migration — mais une image de plus
// de ~5 Mo dépasse la limite du fournisseur, alors que la base admet 10 Mo :
// son contrôle (ou sa réduction) avant l'envoi est un travail du LOT-03, et
// l'image est refusée ici jusque-là.

/** Taille maximale d'un document : celle du CHECK de la base (arbitrage du 2026-10-01). */
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

const SIGNATURE_PDF = Buffer.from('%PDF-', 'ascii');

export type VerdictFichier =
  | { ok: true; typeMime: 'application/pdf' }
  | { ok: false; reason: 'fichier_vide' | 'fichier_trop_lourd' | 'format_non_admis'; status: number };

/**
 * Le fichier est-il un PDF admissible ? La signature `%PDF-` est lue sur les
 * octets : le type déclaré par le navigateur ne suffit pas.
 */
export function jugerFichier(octets: Buffer, typeDeclare: string): VerdictFichier {
  if (octets.length === 0) return { ok: false, reason: 'fichier_vide', status: 400 };
  if (octets.length > TAILLE_MAX_OCTETS) return { ok: false, reason: 'fichier_trop_lourd', status: 413 };
  if (typeDeclare !== 'application/pdf' || !octets.subarray(0, SIGNATURE_PDF.length).equals(SIGNATURE_PDF)) {
    return { ok: false, reason: 'format_non_admis', status: 415 };
  }
  return { ok: true, typeMime: 'application/pdf' };
}

export const MESSAGES_DEPOT: Record<string, string> = {
  fichier_absent: 'Joignez le compte rendu au format PDF.',
  longueur_requise: 'La taille de l’envoi doit être annoncée.',
  fichier_vide: 'Le fichier est vide.',
  fichier_trop_lourd: 'Le fichier dépasse 10 Mo.',
  format_non_admis: 'Seul un compte rendu PDF est accepté pour l’instant.',
  document_deja_depose: 'Ce compte rendu a déjà été déposé dans ce dossier.',
};

export function empreinteSha256(octets: Buffer): string {
  return createHash('sha256').update(octets).digest('hex');
}

export type IssueDepot =
  | { ok: true; idCompteRendu: string }
  | { ok: false; reason: 'document_deja_depose'; idCompteRendu: string | null };

/**
 * Consigne le document. Le même document déposé deux fois dans un dossier est
 * refusé par l'unicité (patient, empreinte) — et l'identifiant du premier
 * dépôt est rendu, pour que l'écran le rouvre au lieu d'en créer un second.
 */
export async function deposerCompteRendu(params: {
  idPatient: string;
  deposePar: string;
  octets: Buffer;
  typeMime: 'application/pdf';
}): Promise<IssueDepot> {
  const empreinte = empreinteSha256(params.octets);
  try {
    const cree = await prisma.compteRenduBiologique.create({
      data: {
        idPatient: params.idPatient,
        contenu: new Uint8Array(params.octets),
        typeMime: params.typeMime,
        empreinteSha256: empreinte,
        deposePar: params.deposePar,
      },
      select: { id: true },
    });
    return { ok: true, idCompteRendu: cree.id };
  } catch (err) {
    if ((err as { code?: string } | null)?.code !== 'P2002') throw err;
    const existant = await prisma.compteRenduBiologique.findUnique({
      where: { idPatient_empreinteSha256: { idPatient: params.idPatient, empreinteSha256: empreinte } },
      select: { id: true },
    });
    return { ok: false, reason: 'document_deja_depose', idCompteRendu: existant?.id ?? null };
  }
}
