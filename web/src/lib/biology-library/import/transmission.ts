import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { empreinteSha256, type TypeMimeCompteRendu } from './depot';
import {
  PLAFOND_DOCUMENTS_EN_ATTENTE,
  PLAFOND_TRANSMISSIONS_24H,
  statutTransmission,
  type StatutTransmission,
} from './transmissionStatut';

// LA TRANSMISSION DU COMPTE RENDU PAR LE PATIENT ([[D-269]], BIO-INGEST
// LOT-04), côté serveur : l'accusé exigé, les plafonds, le dépôt et la liste
// des statuts. Le dépôt n'appelle PAS l'IA (§1) : la lecture reste un geste du
// praticien, qui vérifie d'abord que le document est celui de son patient.
//
// L'ORIGINE ET L'AUTEUR SONT TENUS PAR LA BASE (§2, CHECK de la migration
// `bio_ingest_transmission_patient_v1`) : `origine = 'patient'` ⇔ aucun e-mail
// de praticien. Ce module pose les deux ensemble, jamais l'un sans l'autre.

/** Verrou consultatif des transmissions d'un dossier : les plafonds se jugent et s'écrivent sous lui. */
function cleVerrouTransmission(idPatient: string): string {
  return `bio_ingest_transmission:${idPatient}`;
}

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Le patient a-t-il pris connaissance de la version COURANTE de « L'intelligence
 * artificielle dans Wellneuro » (§6) ? Version ET hash : un accusé d'une
 * version antérieure, ou d'un texte modifié sans nouvelle version, ne vaut pas.
 */
export async function aPrisConnaissanceUsageIa(idPatient: string): Promise<boolean> {
  const courant = getDocumentCourant('usage_ia');
  const n = await prisma.trustAcknowledgement.count({
    where: {
      idPatient,
      documentKey: 'usage_ia',
      documentVersion: courant.version,
      contentHash: courant.hash,
      type: 'pris_connaissance',
    },
  });
  return n > 0;
}

export type VerdictPlafonds = { ok: true } | { ok: false; reason: 'plafond_en_attente' | 'plafond_24h' };

/**
 * Les deux plafonds de §5. « En attente ou reçu » : transmis par le patient,
 * non purgé (précision du 2026-10-07 — un document écarté l'est aussi), sans
 * ligne validée. Les 24 heures se comptent à l'horloge de la BASE, celle qui
 * date le dépôt (trigger d'insertion), jamais à celle du conteneur.
 */
export async function jugerPlafonds(idPatient: string, client: Client = prisma): Promise<VerdictPlafonds> {
  const enAttente = await client.compteRenduBiologique.count({
    where: {
      idPatient,
      origine: 'patient',
      purgeLe: null,
      imports: { none: { lignes: { some: { statut: 'validee' } } } },
    },
  });
  if (enAttente >= PLAFOND_DOCUMENTS_EN_ATTENTE) return { ok: false, reason: 'plafond_en_attente' };
  const [{ n }] = await client.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM comptes_rendus_biologiques
    WHERE id_patient = ${idPatient}
      AND origine = 'patient'
      AND depose_le > (clock_timestamp() AT TIME ZONE 'UTC') - interval '24 hours'`;
  if (n >= PLAFOND_TRANSMISSIONS_24H) return { ok: false, reason: 'plafond_24h' };
  return { ok: true };
}

export type IssueTransmission =
  | { ok: true }
  | {
      ok: false;
      reason: 'plafond_en_attente' | 'plafond_24h' | 'document_deja_transmis' | 'document_deja_ecarte' | typeof RAISON_DOSSIER_CLOS;
    };

/**
 * Consigne le document transmis. Les plafonds sont JUGÉS DE NOUVEAU sous le
 * verrou du dossier : la route les a lus avant le corps, mais deux envois
 * simultanés passeraient tous deux ce premier contrôle.
 *
 * Le DOSSIER OUVERT aussi, et verrouillé en partage jusqu'au COMMIT : la route
 * l'a jugé avant le téléversement du corps, et la clôture du suivi ne prend pas
 * le verrou consultatif. Une clôture concurrente attend la fin du dépôt au lieu
 * de laisser entrer un document dans un dossier qu'elle vient de clore
 * (contre-revue adverse de campagne, C2 ; patron `lireDossierVerrouille` de la
 * diffusion des fiches).
 *
 * Un document déjà présent dans le dossier — déposé par le patient OU par le
 * praticien, l'unicité (patient, empreinte) ne distingue pas — est refusé sans
 * identifiant rendu : le patient n'a rien à rouvrir. Si c'est un document qu'IL
 * a transmis et que le praticien a écarté, l'empreinte restée le refuse aussi :
 * « figure déjà dans votre dossier » serait faux, il a été supprimé (revue
 * `wn-reviewer`, P2). La recherche ne vise que ses propres transmissions —
 * rien n'est dit d'un dépôt du praticien.
 */
export async function deposerTransmission(params: {
  idPatient: string;
  octets: Buffer;
  typeMime: TypeMimeCompteRendu;
}): Promise<IssueTransmission> {
  const { idPatient } = params;
  const empreinte = empreinteSha256(params.octets);
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouTransmission(idPatient)}))`;
      const [dossier] = await tx.$queryRaw<{ actif: boolean; suivi_cloture_le: Date | null }[]>`
        SELECT actif, suivi_cloture_le FROM patients WHERE id_patient = ${idPatient} FOR SHARE`;
      if (!dossier || !accepteNouvelEnvoi({ actif: dossier.actif, suiviClotureLe: dossier.suivi_cloture_le })) {
        return { ok: false as const, reason: RAISON_DOSSIER_CLOS };
      }
      const plafonds = await jugerPlafonds(idPatient, tx);
      if (!plafonds.ok) return plafonds;
      await tx.compteRenduBiologique.create({
        data: {
          idPatient,
          contenu: new Uint8Array(params.octets),
          typeMime: params.typeMime,
          empreinteSha256: empreinte,
          origine: 'patient',
          deposePar: null,
        },
        select: { id: true },
      });
      return { ok: true as const };
    }, { timeout: 20_000 });
  } catch (err) {
    if ((err as { code?: string } | null)?.code !== 'P2002') throw err;
    const ecarte = await prisma.compteRenduBiologique.count({
      where: { idPatient, empreinteSha256: empreinte, origine: 'patient', motifEcart: { not: null } },
    });
    return { ok: false, reason: ecarte > 0 ? 'document_deja_ecarte' : 'document_deja_transmis' };
  }
}

export type DocumentTransmisLu = { deposeLe: string; statut: StatutTransmission };

/**
 * Les documents que le patient a transmis, du plus récent au plus ancien, avec
 * leur date et leur statut — RIEN d'autre (§4) : ni valeur, ni libellé lu, ni
 * marquage, ni identifiant. Les documents déposés par le praticien n'y sont pas.
 */
export async function listerTransmissions(idPatient: string): Promise<DocumentTransmisLu[]> {
  const documents = await prisma.compteRenduBiologique.findMany({
    where: { idPatient, origine: 'patient' },
    orderBy: { deposeLe: 'desc' },
    select: {
      deposeLe: true,
      purgeLe: true,
      motifEcart: true,
      imports: {
        select: { lignes: { where: { statut: 'validee' }, select: { id: true }, take: 1 } },
      },
    },
  });
  return documents.map(d => ({
    deposeLe: d.deposeLe.toISOString(),
    statut: statutTransmission({
      motifEcart: d.motifEcart,
      purge: d.purgeLe !== null,
      aUneLigneValidee: d.imports.some(i => i.lignes.length > 0),
      aUneLecture: d.imports.length > 0,
    }),
  }));
}
