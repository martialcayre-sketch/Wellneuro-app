import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { refusPartage, verdictPartageMedecin } from '@/lib/trust/consentementPartage';
import { STATUTS_SYNTHESE_VALIDES, type StatutSyntheseSource } from '@/lib/documents/types';

export const RAISON_SYNTHESE_PLUS_VALIDEE = 'synthese_plus_validee';
export const MESSAGE_SYNTHESE_PLUS_VALIDEE =
  'La synthèse n’est plus validée : elle a été vidée ou rejetée entre-temps. Rien n’a été imprimé.';

// Le document pour le médecin, imprimé puis remis par le patient ([[D-307]],
// F38). Tables `documents_medecin_imprimes` et
// `telechargements_documents_medecin` (migration `documents_medecin_imprimes_v1`,
// appliquée le 2026-10-18, run release-db 39144243510).
//
// SEULS ÉCRIVAINS DES DEUX TABLES, hors l'effacement nommé du dossier : la garde
// `documentMedecinImprime.guard.test.ts` le tient.
//
// LA GARDE EST LA MÊME DES DEUX CÔTÉS, ET ELLE EST RELUE SOUS VERROU. Imprimer
// et télécharger relisent le choix « partage médecin traitant » dans la
// transaction qui écrit, sous le verrou de ligne du dossier que
// `POST /api/portail/trust/choix` prend aussi (patron de la correspondance
// médecin) : un retrait concurrent passe avant ou après, jamais entre la
// lecture et l'écriture. Refus, retrait et silence ferment l'impression
// (arbitrage du 2026-10-18 : « même règle que la correspondance médecin ») ;
// ils retirent aussi le document du portail, et un accord redonné le rend
// (arbitrage du 2026-10-18 au soir).

/**
 * `WN_DOCUMENT_MEDECIN_PATIENT` — garde la page et les routes du portail
 * « Pour votre médecin ». L'impression tracée côté praticien n'en dépend pas :
 * elle est la garde de [[D-307]] §2, servie dès la livraison.
 *
 * Fail-closed : seule la chaîne exacte « true » ouvre.
 */
export function documentMedecinPatientOuvert(
  value = process.env.WN_DOCUMENT_MEDECIN_PATIENT,
): boolean {
  return value === 'true';
}

/** Empreinte du HTML en UTF-8 — celle que le CHECK de la table recalcule. */
export function empreinteHtml(html: string): string {
  return createHash('sha256').update(html, 'utf8').digest('hex');
}

const CHOIX_PARTAGE = { finalite: true, statut: true, enregistreLe: true } as const;

export type ResultatImpression =
  | { ok: true; impression: { id: string; imprimeLe: Date } }
  | { ok: false; raison: string; message: string };

/**
 * Enregistre une impression confirmée. La base refuse d'elle-même une synthèse
 * d'un autre dossier ou non validée, et un autre praticien que celui du
 * dossier ; elle pose l'instant et l'ordre.
 */
export async function enregistrerImpression(entree: {
  idPatient: string;
  idSynthese: string;
  praticienEmail: string;
  html: string;
}): Promise<ResultatImpression> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${entree.idPatient} FOR UPDATE`;
    // Le dossier ouvert est relu SOUS LE VERROU, comme le partage : une
    // clôture concurrente passe avant ou après, jamais entre la garde
    // d'entrée de la route et l'écriture (revue CodeRabbit).
    const dossier = await tx.patient.findUnique({
      where: { idPatient: entree.idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!dossier || !accepteNouvelEnvoi(dossier)) {
      return { ok: false as const, raison: RAISON_DOSSIER_CLOS, message: MESSAGE_DOSSIER_CLOS };
    }
    // La synthèse est relue sous le même verrou : « vider » et « rejeter » le
    // prennent aussi (`api/praticien/synthese`). Vidée ou rejetée depuis la
    // composition, elle donne un refus nommé, pas l'exception du trigger
    // traduite en 500 (revue CodeRabbit de #1573).
    const synthese = await tx.syntheseIA.findUnique({
      where: { idSynthese: entree.idSynthese },
      select: { idPatient: true, statut: true },
    });
    if (
      !synthese
      || synthese.idPatient !== entree.idPatient
      || !STATUTS_SYNTHESE_VALIDES.includes(synthese.statut as StatutSyntheseSource)
    ) {
      return { ok: false as const, raison: RAISON_SYNTHESE_PLUS_VALIDEE, message: MESSAGE_SYNTHESE_PLUS_VALIDEE };
    }
    const choix = await tx.trustChoiceEvent.findMany({
      where: { idPatient: entree.idPatient, finalite: 'partage_medecin_traitant' },
      select: CHOIX_PARTAGE,
    });
    const verdict = verdictPartageMedecin(choix);
    if (verdict.bloquant) {
      const refus = refusPartage(verdict);
      return { ok: false as const, raison: refus.raison, message: refus.message };
    }
    const impression = await tx.documentMedecinImprime.create({
      data: {
        idPatient: entree.idPatient,
        idSynthese: entree.idSynthese,
        praticienEmail: entree.praticienEmail,
        html: entree.html,
        htmlSha256: empreinteHtml(entree.html),
      },
      select: { id: true, imprimeLe: true },
    });
    return { ok: true as const, impression };
  });
}

/** Ce que le portail peut dire, sans contenu : un document est-il à remettre ? */
export async function documentDisponible(idPatient: string): Promise<{ imprimeLe: Date } | null> {
  const [choix, derniere] = await Promise.all([
    prisma.trustChoiceEvent.findMany({
      where: { idPatient, finalite: 'partage_medecin_traitant' },
      select: CHOIX_PARTAGE,
    }),
    prisma.documentMedecinImprime.findFirst({
      where: { idPatient },
      orderBy: { ordre: 'desc' },
      select: { imprimeLe: true },
    }),
  ]);
  if (verdictPartageMedecin(choix).bloquant || !derniere) return null;
  return { imprimeLe: derniere.imprimeLe };
}

/**
 * Sert la dernière impression au patient et journalise le téléchargement, dans
 * la même transaction. `null` : rien à remettre (aucune impression, ou partage
 * non accordé) — le portail ne distingue pas les deux.
 */
export async function telechargerDocument(
  idPatient: string,
): Promise<{ html: string; imprimeLe: Date } | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${idPatient} FOR UPDATE`;
    const choix = await tx.trustChoiceEvent.findMany({
      where: { idPatient, finalite: 'partage_medecin_traitant' },
      select: CHOIX_PARTAGE,
    });
    if (verdictPartageMedecin(choix).bloquant) return null;
    // Sous le verrou du dossier, que l'impression prend aussi : la dernière
    // lue ici est celle que le trigger exige.
    const derniere = await tx.documentMedecinImprime.findFirst({
      where: { idPatient },
      orderBy: { ordre: 'desc' },
      select: { id: true, html: true, imprimeLe: true },
    });
    if (!derniere) return null;
    await tx.telechargementDocumentMedecin.create({
      data: { idPatient, idImpression: derniere.id },
      select: { id: true },
    });
    return { html: derniere.html, imprimeLe: derniere.imprimeLe };
  });
}
