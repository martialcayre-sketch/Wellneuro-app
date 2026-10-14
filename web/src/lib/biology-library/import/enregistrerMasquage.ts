import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { estTypeCompteRendu, preparerImage } from './depot';
import { OUVERTS } from './lectureDemandee';
import { declarationValide, PAGES_MAX, TOTAL_MAX_OCTETS } from './masquage';
import { cleVerrouCompteRendu, DELAI_TRANSACTION_LIGNES_MS, PEREMPTION_EN_COURS_MS } from './verrou';

// ENREGISTRER LE MASQUAGE DE L'IDENTITÉ ([[D-284]] §5, lot (j)).
//
// Le navigateur du praticien a rendu chaque page du compte rendu, y a brûlé
// les zones noircies et envoie une image JPEG par page. Le serveur ne la croit
// pas sur parole : signature JPEG, dimensions et poids jugés, puis RÉENCODAGE
// (`preparerImage`) — aucune métadonnée de l'image reçue ne survit. Le nombre
// de pages est rapproché de celui du document quand il se lit.
//
// La base rejuge tout (`bio_ingest_masquage_identite_v1`) : document non
// purgé, aucune lecture ouverte, déclaration recevable, bornes. Les refus sont
// dits ici d'abord, sous le verrou du compte rendu — une 500 opaque sinon.

export type IssueMasquage =
  | { ok: true; idMasquage: string }
  | {
    ok: false;
    reason:
      | 'compte_rendu_introuvable'
      | 'document_purge'
      | 'lecture_demandee'
      | 'extraction_en_cours'
      | 'ligne_validee'
      | 'declaration_invalide'
      | 'pages_absentes'
      | 'trop_de_pages'
      | 'pages_incompletes'
      | 'pages_trop_lourdes'
      | 'page_non_jpeg'
      | 'page_illisible'
      | 'page_trop_grande'
      | 'page_trop_lourde';
    status: number;
  };

const SIGNATURE_JPEG = [0xff, 0xd8, 0xff];

function estJpeg(octets: Buffer): boolean {
  return octets.length >= SIGNATURE_JPEG.length && SIGNATURE_JPEG.every((o, i) => octets[i] === o);
}

/** Les pages du document d'origine : 1 pour une image ; `null` si le PDF ne se lit pas ici. */
export async function pagesDuDocument(contenu: Buffer, typeMime: string): Promise<number | null> {
  if (typeMime !== 'application/pdf') return 1;
  try {
    const pdf = await PDFDocument.load(contenu, { ignoreEncryption: true, updateMetadata: false });
    return pdf.getPageCount();
  } catch {
    // Le navigateur l'a rendu (pdf.js) : une lecture plus stricte qui échoue ici
    // ne doit pas interdire de masquer. Le nombre reste borné par la base.
    return null;
  }
}

/** Juge et réencode les pages reçues, dans l'ordre. */
export async function preparerPages(
  recues: Buffer[],
): Promise<{ ok: true; pages: Buffer[] } | Extract<IssueMasquage, { ok: false }>> {
  if (recues.length === 0) return { ok: false, reason: 'pages_absentes', status: 400 };
  if (recues.length > PAGES_MAX) return { ok: false, reason: 'trop_de_pages', status: 413 };
  const pages: Buffer[] = [];
  let total = 0;
  for (const octets of recues) {
    if (!estJpeg(octets)) return { ok: false, reason: 'page_non_jpeg', status: 415 };
    const image = await preparerImage(octets, 'image/jpeg');
    if (!image.ok) {
      const reason = image.reason === 'image_trop_grande' ? 'page_trop_grande'
        : image.reason === 'image_trop_lourde' ? 'page_trop_lourde'
          : 'page_illisible';
      return { ok: false, reason, status: image.status };
    }
    total += image.octets.length;
    if (total > TOTAL_MAX_OCTETS) return { ok: false, reason: 'pages_trop_lourdes', status: 413 };
    pages.push(image.octets);
  }
  return { ok: true, pages };
}

export async function enregistrerMasquage(params: {
  idPatient: string;
  idCompteRendu: string;
  posePar: string;
  pages: Buffer[];
  zonesMasquees: number;
  aucuneIdentite: boolean;
}): Promise<IssueMasquage> {
  const { idPatient, idCompteRendu, posePar, zonesMasquees, aucuneIdentite } = params;
  if (!declarationValide(zonesMasquees, aucuneIdentite)) {
    return { ok: false, reason: 'declaration_invalide', status: 400 };
  }
  const preparees = await preparerPages(params.pages);
  if (!preparees.ok) return preparees;

  return prisma.$transaction(async (tx): Promise<IssueMasquage> => {
    // Le verrou que prennent la demande de lecture, sa réclamation et la
    // décision : un masquage et une lecture ne se croisent pas.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
    const compteRendu = await tx.compteRenduBiologique.findFirst({
      where: { id: idCompteRendu, idPatient },
      select: { typeMime: true, purgeLe: true, contenu: true },
    });
    if (!compteRendu || !estTypeCompteRendu(compteRendu.typeMime)) {
      return { ok: false, reason: 'compte_rendu_introuvable', status: 404 };
    }
    if (compteRendu.purgeLe || !compteRendu.contenu) return { ok: false, reason: 'document_purge', status: 409 };
    const ouverts = await tx.travailExtractionBiologique.count({
      where: { idCompteRendu, idPatient, statut: { in: OUVERTS } },
    });
    if (ouverts > 0) return { ok: false, reason: 'lecture_demandee', status: 409 };
    // Un import `en_cours` FRAIS : une lecture court. Un import PÉRIMÉ (processus
    // mort, sans travail ouvert) se clôt `delai_depasse` ici, comme à
    // l'ouverture d'une lecture — sinon la base refuserait le masquage, et la
    // lecture, faute de masquage, ne le clôrait jamais. Fraîcheur jugée à
    // l'horloge de la BASE, celle qui a écrit `lance_le`.
    const enCours = await tx.$queryRaw<{ id: string; frais: boolean }[]>`
      SELECT id, lance_le >= (clock_timestamp() AT TIME ZONE 'UTC') - ${`${PEREMPTION_EN_COURS_MS} milliseconds`}::interval AS frais
        FROM imports_biologiques
       WHERE id_compte_rendu = ${idCompteRendu} AND id_patient = ${idPatient} AND statut = 'en_cours'`;
    if (enCours.some(i => i.frais)) return { ok: false, reason: 'extraction_en_cours', status: 409 };
    for (const perime of enCours) {
      await tx.importBiologique.update({
        where: { id: perime.id },
        data: { statut: 'echec', motifEchec: 'delai_depasse' },
      });
    }
    const validees = await tx.ligneBiologiqueCandidate.count({
      where: { idPatient, statut: 'validee', import: { idCompteRendu } },
    });
    if (validees > 0) return { ok: false, reason: 'ligne_validee', status: 409 };
    const attendues = await pagesDuDocument(Buffer.from(compteRendu.contenu), compteRendu.typeMime);
    if (attendues !== null && attendues !== preparees.pages.length) {
      return { ok: false, reason: attendues > PAGES_MAX ? 'trop_de_pages' : 'pages_incompletes', status: 400 };
    }
    const cree = await tx.masquageCompteRendu.create({
      data: {
        idPatient,
        idCompteRendu,
        pages: preparees.pages.map(p => new Uint8Array(p)),
        nombrePages: preparees.pages.length,
        zonesMasquees,
        aucuneIdentite,
        posePar,
      },
      select: { id: true },
    });
    return { ok: true, idMasquage: cree.id };
  }, { timeout: DELAI_TRANSACTION_LIGNES_MS });
}
