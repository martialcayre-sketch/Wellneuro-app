import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';

// DÉPÔT D'UN COMPTE RENDU (BIO-INGEST LOT-02, [[D-256]] A2). Le document est
// conservé en base HDS, entier, figé (la base refuse tout UPDATE). Aucun nom
// de fichier n'est gardé : il porte souvent l'identité du patient.
//
// PHOTO OU SCAN (LOT-03) : JPEG, PNG et WebP, déjà admis par le CHECK de la
// base. Une image est RÉENCODÉE avant d'être consignée : ses métadonnées
// (EXIF — dont la position GPS d'une photo de téléphone) ne sont ni gardées ni
// envoyées au fournisseur ; l'orientation est appliquée aux pixels avant. Le
// fournisseur refuse une image de plus de 5 Mo une fois encodée en base64, ou
// de plus de 8 000 pixels de côté : le contrôle porte sur l'image nettoyée.

/** Taille maximale d'un document reçu : celle du CHECK de la base (arbitrage du 2026-10-01). */
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

/** Taille maximale d'une image nettoyée : 5 Mio en base64 chez le fournisseur, soit 3,75 Mio d'octets. */
export const TAILLE_MAX_IMAGE_OCTETS = (5 * 1024 * 1024 * 3) / 4;

/** Côté maximal d'une image, en pixels (limite du fournisseur). */
export const COTE_MAX_IMAGE_PX = 8000;

/** Plafond de décodage, technique : le carré de ce côté. */
const PIXELS_MAX_IMAGE = COTE_MAX_IMAGE_PX * COTE_MAX_IMAGE_PX;

export type TypeMimeCompteRendu = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
export type TypeMimeImage = Exclude<TypeMimeCompteRendu, 'application/pdf'>;

export const TYPES_MIME_COMPTE_RENDU: readonly TypeMimeCompteRendu[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function estTypeCompteRendu(typeMime: string): typeMime is TypeMimeCompteRendu {
  return (TYPES_MIME_COMPTE_RENDU as readonly string[]).includes(typeMime);
}

/** Le type lu sur les premiers octets — jamais celui que déclare le navigateur. */
function typeParSignature(octets: Buffer): TypeMimeCompteRendu | null {
  const debut = (signature: number[], decalage = 0) =>
    octets.length >= decalage + signature.length && signature.every((o, i) => octets[decalage + i] === o);
  if (debut([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (debut([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (debut([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (debut([0x52, 0x49, 0x46, 0x46]) && debut([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'; // RIFF….WEBP
  return null;
}

export type VerdictFichier =
  | { ok: true; typeMime: TypeMimeCompteRendu }
  | { ok: false; reason: 'fichier_vide' | 'fichier_trop_lourd' | 'format_non_admis'; status: number };

/**
 * Le fichier est-il admissible ? Sa signature est lue sur les octets, et elle
 * doit concorder avec le type déclaré : le type déclaré seul ne suffit pas.
 */
export function jugerFichier(octets: Buffer, typeDeclare: string): VerdictFichier {
  if (octets.length === 0) return { ok: false, reason: 'fichier_vide', status: 400 };
  if (octets.length > TAILLE_MAX_OCTETS) return { ok: false, reason: 'fichier_trop_lourd', status: 413 };
  const typeLu = typeParSignature(octets);
  if (typeLu === null || typeLu !== typeDeclare) return { ok: false, reason: 'format_non_admis', status: 415 };
  return { ok: true, typeMime: typeLu };
}

export type ImagePreparee =
  | { ok: true; octets: Buffer }
  | { ok: false; reason: 'image_illisible' | 'image_trop_grande' | 'image_trop_lourde'; status: number };

/**
 * Réencode l'image dans son format : orientation appliquée, métadonnées
 * retirées (sharp n'en recopie aucune sans demande expresse). Le même fichier
 * donne les mêmes octets, ce qui garde l'unicité (patient, empreinte).
 */
export async function preparerImage(octets: Buffer, typeMime: TypeMimeImage): Promise<ImagePreparee> {
  // Les dimensions se lisent dans l'en-tête, AVANT tout décodage : une image
  // géante est refusée sans être décompressée en mémoire (revue).
  try {
    const { width, height } = await sharp(octets, { limitInputPixels: PIXELS_MAX_IMAGE }).metadata();
    if (!width || !height) return { ok: false, reason: 'image_illisible', status: 415 };
    if (width > COTE_MAX_IMAGE_PX || height > COTE_MAX_IMAGE_PX) {
      return { ok: false, reason: 'image_trop_grande', status: 413 };
    }
  } catch {
    return { ok: false, reason: 'image_illisible', status: 415 };
  }
  let sortie: Buffer;
  try {
    const image = sharp(octets, { limitInputPixels: PIXELS_MAX_IMAGE }).rotate();
    const encodee =
      typeMime === 'image/jpeg' ? image.jpeg({ quality: 85 })
        : typeMime === 'image/png' ? image.png()
          : image.webp({ quality: 85 });
    sortie = await encodee.toBuffer();
  } catch {
    return { ok: false, reason: 'image_illisible', status: 415 };
  }
  if (sortie.length > TAILLE_MAX_IMAGE_OCTETS) return { ok: false, reason: 'image_trop_lourde', status: 413 };
  return { ok: true, octets: sortie };
}

export const MESSAGES_DEPOT: Record<string, string> = {
  fichier_absent: 'Joignez le compte rendu : PDF, ou photo JPEG, PNG ou WebP.',
  longueur_requise: 'La taille de l’envoi doit être annoncée.',
  fichier_vide: 'Le fichier est vide.',
  fichier_trop_lourd: 'Le fichier dépasse 10 Mo.',
  format_non_admis: 'Formats acceptés : PDF, JPEG, PNG ou WebP.',
  image_illisible: 'L’image n’a pas pu être lue.',
  image_trop_grande: 'L’image dépasse 8 000 pixels de côté.',
  image_trop_lourde: 'L’image dépasse 3,75 Mo une fois préparée : reprenez-la en résolution moindre.',
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
  typeMime: TypeMimeCompteRendu;
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
