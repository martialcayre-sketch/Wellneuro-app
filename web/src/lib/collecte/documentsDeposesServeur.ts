import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { empreinteSha256, type TypeMimeCompteRendu } from '@/lib/biology-library/publie';
import {
  categorieCourante,
  PLAFOND_DEPOTS_24H,
  PLAFOND_DOCUMENTS_NON_CONSULTES,
  type CategorieDocument,
  type MotifRetraitDocument,
} from './documentsDeposes';

// LA COLLECTE DOCUMENTAIRE, CÔTÉ SERVEUR ([[D-330]] §4, J3-collecte). Ce module
// est le SEUL écrivain des deux tables hors de l'effacement nommé — le banc
// `documentsDeposes.guard.test.ts` le nomme, geste par geste.
//
// CE QUE LA BASE TIENT DÉJÀ (migration `documents_deposes_patient_v1`) : types,
// taille, empreinte, catégorie de la liste, doublon d'un document non retiré,
// les deux seules transitions (première consultation, retrait) par le seul
// praticien du dossier, les instants. Ce module ajoute ce qui revient au code,
// et les prescriptions de la relecture (§4) :
//  — les PLAFONDS se comptent sous le verrou du dossier que prend le dépôt
//    (`hashtext('documents_deposes:' || id_patient)`), sinon deux dépôts
//    simultanés les franchissent ;
//  — le dépôt s'écrit en READ COMMITTED (la base le refuse autrement) ;
//  — une LISTE ne charge jamais le document : `select` sans `contenu`. Seule
//    `consulterDocument` le lit, document par document ;
//  — la consultation est une écriture CONDITIONNELLE (seulement si aucune n'est
//    posée) : une seconde ouverture ne réécrit rien et n'échoue pas ;
//  — le message d'une contrainte refusée recopie la ligne (dossier, auteur,
//    début du document) : il ne remonte jamais tel quel. Les routes ne
//    journalisent que classe et code (`classeEtCode`).

type Client = Prisma.TransactionClient | typeof prisma;

/** Le verrou du dossier que prend le trigger d'insertion — même texte, même hash. */
function cleVerrouDepot(idPatient: string): string {
  return `documents_deposes:${idPatient}`;
}

export type VerdictPlafondsDepot = { ok: true } | { ok: false; reason: 'plafond_non_consultes' | 'plafond_24h' };

/**
 * Les deux plafonds de [[D-330]] §2. « Non consulté » : ni ouvert par le
 * praticien, ni retiré. Les 24 heures se comptent à l'horloge de la BASE, celle
 * qui date le dépôt (trigger), jamais à celle du conteneur ; un document retiré
 * y compte encore — il a été déposé.
 */
export async function jugerPlafondsDepot(idPatient: string, client: Client = prisma): Promise<VerdictPlafondsDepot> {
  const nonConsultes = await client.documentDeposePatient.count({
    where: { idPatient, consulteLe: null, retireLe: null },
  });
  if (nonConsultes >= PLAFOND_DOCUMENTS_NON_CONSULTES) return { ok: false, reason: 'plafond_non_consultes' };
  const [{ n }] = await client.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM documents_deposes_patient
    WHERE id_patient = ${idPatient}
      AND depose_le > (clock_timestamp() AT TIME ZONE 'UTC') - interval '24 hours'`;
  if (n >= PLAFOND_DEPOTS_24H) return { ok: false, reason: 'plafond_24h' };
  return { ok: true };
}

export type IssueDepotDocument =
  | { ok: true }
  | {
      ok: false;
      reason: 'plafond_non_consultes' | 'plafond_24h' | 'document_deja_depose' | typeof RAISON_DOSSIER_CLOS;
    };

/**
 * Consigne le document déposé par le patient. La route a jugé dossier, âge et
 * plafonds AVANT de lire le corps ; tout se rejuge ici, sous verrou :
 *  1. le dossier `FOR SHARE` jusqu'au COMMIT — une clôture concurrente attend
 *     la fin du dépôt au lieu de laisser entrer un document dans un dossier
 *     qu'elle vient de clore (patron de `deposerTransmission`) ;
 *  2. le verrou consultatif du dossier, dans l'ordre du trigger (dossier, puis
 *     verrou) — le trigger le reprend, sans attente, dans la même transaction ;
 *  3. les plafonds, puis le doublon, lus sous ce verrou : en READ COMMITTED,
 *     chaque lecture voit les dépôts commis pendant l'attente. Le trigger
 *     refuserait de toute façon le doublon ; le lire ici rend « déjà déposé »
 *     sans passer par le message d'une exception.
 */
export async function deposerDocument(params: {
  idPatient: string;
  octets: Buffer;
  typeMime: TypeMimeCompteRendu;
  categorie: CategorieDocument;
}): Promise<IssueDepotDocument> {
  const { idPatient } = params;
  const empreinte = empreinteSha256(params.octets);
  return prisma.$transaction(
    async tx => {
      const [dossier] = await tx.$queryRaw<{ actif: boolean; suivi_cloture_le: Date | null }[]>`
        SELECT actif, suivi_cloture_le FROM patients WHERE id_patient = ${idPatient} FOR SHARE`;
      if (!dossier || !accepteNouvelEnvoi({ actif: dossier.actif, suiviClotureLe: dossier.suivi_cloture_le })) {
        return { ok: false as const, reason: RAISON_DOSSIER_CLOS };
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouDepot(idPatient)}))`;
      const plafonds = await jugerPlafondsDepot(idPatient, tx);
      if (!plafonds.ok) return plafonds;
      const doublon = await tx.documentDeposePatient.count({
        where: { idPatient, empreinteSha256: empreinte, retireLe: null },
      });
      if (doublon > 0) return { ok: false as const, reason: 'document_deja_depose' as const };
      await tx.documentDeposePatient.create({
        data: {
          idPatient,
          contenu: new Uint8Array(params.octets),
          typeMime: params.typeMime,
          empreinteSha256: empreinte,
          categorieProposee: params.categorie,
        },
        select: { id: true },
      });
      return { ok: true as const };
    },
    { isolationLevel: 'ReadCommitted', timeout: 20_000 },
  );
}

export type DepotLu = {
  /** ISO 8601 — l'instant du dépôt, posé par la base. */
  deposeLe: string;
  /** La catégorie que le patient a proposée — la sienne, pas la correction du praticien. */
  categorie: string;
  /** ISO 8601, ou `null` : le document a été retiré (motif non dit au patient). */
  retireLe: string | null;
};

/**
 * Les documents que le patient a déposés, du plus récent au plus ancien : date,
 * catégorie proposée, retrait — RIEN d'autre. Ni le document, ni sa consultation
 * par le praticien, ni le motif d'un retrait.
 */
export async function listerDepotsPatient(idPatient: string): Promise<DepotLu[]> {
  const documents = await prisma.documentDeposePatient.findMany({
    where: { idPatient },
    orderBy: [{ deposeLe: 'desc' }, { id: 'asc' }],
    select: { deposeLe: true, categorieProposee: true, retireLe: true },
  });
  return documents.map(d => ({
    deposeLe: d.deposeLe.toISOString(),
    categorie: d.categorieProposee,
    retireLe: d.retireLe ? d.retireLe.toISOString() : null,
  }));
}

export type ClassementLu = { categorie: string; classeLe: string };

export type DocumentDeposeLu = {
  id: string;
  typeMime: string;
  categorieProposee: string;
  categorieCourante: string;
  /** Chaque correction du praticien, datée, la plus ancienne en tête. */
  classements: ClassementLu[];
  deposeLe: string;
  /** Première ouverture par le praticien, ou `null`. */
  consulteLe: string | null;
  retireLe: string | null;
  motifRetrait: string | null;
};

/** La liste du dossier, côté praticien — sans jamais charger un document. */
export async function listerDocumentsPraticien(idPatient: string): Promise<DocumentDeposeLu[]> {
  const documents = await prisma.documentDeposePatient.findMany({
    where: { idPatient },
    orderBy: [{ deposeLe: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      typeMime: true,
      categorieProposee: true,
      deposeLe: true,
      consulteLe: true,
      retireLe: true,
      motifRetrait: true,
      classements: { orderBy: { ordre: 'asc' }, select: { categorie: true, classeLe: true } },
    },
  });
  return documents.map(d => ({
    id: d.id,
    typeMime: d.typeMime,
    categorieProposee: d.categorieProposee,
    categorieCourante: categorieCourante(d.categorieProposee, d.classements),
    classements: d.classements.map(c => ({ categorie: c.categorie, classeLe: c.classeLe.toISOString() })),
    deposeLe: d.deposeLe.toISOString(),
    consulteLe: d.consulteLe ? d.consulteLe.toISOString() : null,
    retireLe: d.retireLe ? d.retireLe.toISOString() : null,
    motifRetrait: d.motifRetrait,
  }));
}

export type IssueConsultation =
  | { ok: true; contenu: Uint8Array; typeMime: string }
  | { ok: false; reason: 'document_introuvable' | 'document_retire' };

/**
 * Ouvre un document pour le praticien du dossier. La PREMIÈRE ouverture est
 * tracée AVANT que le document ne soit servi, par une écriture conditionnelle :
 * `consulte_par` encore vide, document non retiré. Une ouverture suivante — ou
 * deux ouvertures simultanées, dont la seconde relit la ligne après le verrou —
 * ne correspond à rien et n'écrit rien ([[D-330]] §2 : seule la première est
 * tracée ; le journal d'accès trace déjà l'ouverture du dossier). Si la trace
 * échoue, rien n'est servi.
 */
export async function consulterDocument(
  idPatient: string,
  idDocument: string,
  praticienEmail: string,
): Promise<IssueConsultation> {
  await prisma.documentDeposePatient.updateMany({
    where: { id: idDocument, idPatient, consultePar: null, retireLe: null },
    data: { consultePar: praticienEmail },
  });
  const document = await prisma.documentDeposePatient.findFirst({
    where: { id: idDocument, idPatient },
    select: { contenu: true, typeMime: true },
  });
  if (!document) return { ok: false, reason: 'document_introuvable' };
  if (document.contenu === null) return { ok: false, reason: 'document_retire' };
  return { ok: true, contenu: document.contenu, typeMime: document.typeMime };
}

export type IssueClassement =
  | { ok: true; modifie: boolean }
  | { ok: false; reason: 'document_introuvable' | 'document_retire' };

/**
 * Corrige la catégorie d'un document : une ligne de classement de plus, datée
 * par la base. La catégorie déjà courante ne fait pas de ligne — une
 * correction qui ne change rien n'est pas une correction.
 *
 * LIMITE ACCEPTÉE : la lecture n'est pas verrouillée. Deux corrections
 * simultanées vers la même catégorie (deux onglets) écrivent deux lignes
 * identiques ; la catégorie courante reste juste, l'historique porte un
 * doublon daté. Le trigger sérialise les deux écritures, il ne les fusionne pas.
 */
export async function classerDocument(params: {
  idPatient: string;
  idDocument: string;
  categorie: CategorieDocument;
  praticienEmail: string;
}): Promise<IssueClassement> {
  const { idPatient, idDocument } = params;
  const document = await prisma.documentDeposePatient.findFirst({
    where: { id: idDocument, idPatient },
    select: {
      retireLe: true,
      categorieProposee: true,
      classements: { orderBy: { ordre: 'asc' }, select: { categorie: true } },
    },
  });
  if (!document) return { ok: false, reason: 'document_introuvable' };
  if (document.retireLe) return { ok: false, reason: 'document_retire' };
  if (categorieCourante(document.categorieProposee, document.classements) === params.categorie) {
    return { ok: true, modifie: false };
  }
  try {
    await prisma.classementDocumentDepose.create({
      data: { idPatient, idDocument, categorie: params.categorie, classePar: params.praticienEmail },
      select: { id: true },
    });
  } catch (err) {
    // Un retrait commis entre la lecture et l'écriture : la base refuse le
    // classement. On le dit par l'état relu, jamais par le message refusé.
    const relu = await prisma.documentDeposePatient.findFirst({
      where: { id: idDocument, idPatient },
      select: { retireLe: true },
    });
    if (relu?.retireLe) return { ok: false, reason: 'document_retire' };
    throw err;
  }
  return { ok: true, modifie: true };
}

export type IssueRetrait = { ok: true } | { ok: false; reason: 'document_introuvable' | 'document_deja_retire' };

/**
 * Retire un document : le contenu est effacé de la base, la ligne reste avec
 * ses dates, son auteur et son motif ([[D-330]] §2). Écriture conditionnelle :
 * un retrait concurrent, commis pendant l'attente du verrou de ligne, fait
 * relire la ligne et ne correspond plus.
 */
export async function retirerDocument(params: {
  idPatient: string;
  idDocument: string;
  motif: MotifRetraitDocument;
  praticienEmail: string;
}): Promise<IssueRetrait> {
  const { idPatient, idDocument } = params;
  const { count } = await prisma.documentDeposePatient.updateMany({
    where: { id: idDocument, idPatient, retireLe: null },
    data: { contenu: null, retirePar: params.praticienEmail, motifRetrait: params.motif },
  });
  if (count === 1) return { ok: true };
  const existe = await prisma.documentDeposePatient.count({ where: { id: idDocument, idPatient } });
  return { ok: false, reason: existe > 0 ? 'document_deja_retire' : 'document_introuvable' };
}
