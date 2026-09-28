// LA REMISE DES FICHES D'ASSIETTE AU CLIC « VALIDER POUR DIFFUSION » ([[D-251]]
// §7, lot 8) — la lecture des faits en base, le jeton de l'aperçu, et l'écriture
// des remises. Le calcul de l'aperçu lui-même est PUR (`apercuRemise.ts`).
//
// SEUL ENDROIT DU DÉPÔT QUI CRÉE UNE REMISE (garde `remises.guard.test.ts`). La
// base refuse en outre, à l'insertion, toute version qui n'est pas la version
// de référence de sa fiche, toute empreinte étrangère, toute action qui ne porte
// pas l'assiette, et annule sans erreur une remise identique à la remise en
// cours (trigger de M2).
//
// LE MÊME VERROU QUE LA DÉCISION. Au clic, les faits sont relus SOUS le verrou
// par fiche de `decision.ts` (`fiches_assiette_actes:` + la fiche), pris dans
// l'ordre STABLE des fiches : une validation ou un retrait concurrents passent
// avant ou après, jamais entre la lecture et l'écriture, et deux clics croisés
// ne s'interbloquent pas. Le trigger reprend ce verrou ; une session qui le
// détient déjà le reprend sans attendre.
//
// AUCUN TEXTE DE FICHE NE SORT D'ICI : identifiants, numéros, empreintes.

import type { Prisma } from '@/generated/prisma';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import {
  empreinteDeLApercu,
  estFerme,
  planifierApercuFiches,
  type ActionPourApercu,
  type ApercuFiches,
  type BlocageFiches,
  type FaitsFiche,
} from './apercuRemise';
import { ficheSourceDeLAssiette } from './appariement';
import { controlerVersion } from './controle';
import { derniereVersionValidee, etatDeLaVersion } from './etat';

type Client = Pick<
  Prisma.TransactionClient,
  '$queryRaw' | '$executeRaw' | 'ficheAssietteVersion' | 'ficheAssietteRemise'
>;

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  contenuSha256: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

function libelleDe(plateCode: string): string {
  return getRecommendedPlate(plateCode)?.label ?? plateCode;
}

/**
 * Les faits de chaque fiche citée, pour ce patient : sa version de référence,
 * rejouée par les contrôles (§6 : « rejouée au moment de servir »), et sa
 * remise en cours.
 */
async function lireFaits(
  client: Client,
  idPatient: string,
  sourceIds: readonly string[],
  verrouiller: boolean,
): Promise<Map<string, FaitsFiche>> {
  const fiches = [...new Set(sourceIds)].sort();
  if (verrouiller) {
    for (const fiche of fiches) {
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_assiette_actes:${fiche}`}))`;
    }
  }
  const faits = new Map<string, FaitsFiche>();
  if (fiches.length === 0) return faits;

  // Les versions SANS leur texte : seule la référence est contrôlée, et c'est
  // elle seule dont le contenu et la source sont chargés, plus bas (constat de
  // revue du lot 8 — une source porte jusqu'à `TEXTE_SOURCE_MAX` caractères).
  const [versions, remises] = await Promise.all([
    client.ficheAssietteVersion.findMany({
      where: { sourceId: { in: fiches } },
      select: {
        id: true,
        sourceId: true,
        plateCode: true,
        numero: true,
        contenuSha256: true,
        actes: { orderBy: { ordre: 'desc' }, take: 1, select: SELECTION_ACTE },
      },
    }),
    client.ficheAssietteRemise.findMany({
      where: { idPatient, version: { sourceId: { in: fiches } } },
      orderBy: { ordre: 'desc' },
      select: { idVersion: true, version: { select: { sourceId: true, numero: true } } },
    }),
  ]);

  for (const fiche of fiches) {
    const candidates = versions
      .filter(v => v.sourceId === fiche)
      .map(v => ({ ...v, etat: etatDeLaVersion(v, v.actes) }));
    const reference = derniereVersionValidee(candidates);
    let referenceControlee: FaitsFiche['reference'] = null;
    if (reference) {
      const textes = await client.ficheAssietteVersion.findUnique({
        where: { id: reference.id },
        select: { contenu: true, texteSource: true },
      });
      // Une version lue à l'instant et introuvable ne se remet pas : elle se
      // contrôle comme un contenu illisible, donc en échec.
      const controle = await controlerVersion(
        { ...reference, contenu: textes?.contenu ?? null, texteSource: textes?.texteSource ?? '' },
        client,
      );
      referenceControlee = {
        id: reference.id,
        numero: reference.numero,
        contenuSha256: reference.contenuSha256,
        nbAnomalies: controle.anomalies.length,
      };
    }
    // La DERNIÈRE remise de cette fiche, par `ordre` : la remise en cours.
    const enCours = remises.find(r => r.version.sourceId === fiche) ?? null;
    faits.set(fiche, {
      reference: referenceControlee,
      enCours: enCours ? { idVersion: enCours.idVersion, numero: enCours.version.numero } : null,
    });
  }
  return faits;
}

/**
 * L'aperçu des fiches qu'un clic remettrait, avec son jeton.
 *
 * `verrouiller` : au CLIC, dans la transaction qui écrira ; jamais à la simple
 * lecture du cockpit, qui n'écrit rien et ne doit rien retenir.
 */
export async function apercuFichesDuProtocole(
  client: Client,
  entrees: {
    idPatient: string;
    protocolDraftInputHash: string;
    actions: readonly ActionPourApercu[];
    blocage: BlocageFiches | null;
  },
  options: { verrouiller: boolean },
): Promise<ApercuFiches> {
  // Seules les fiches qu'une action FERME porte sont lues et verrouillées : une
  // fiche portée par une action suspendue ne part pas, quoi qu'en dise la base
  // (revue Copilot de #1245).
  const sourceIds = entrees.actions
    .filter(estFerme)
    .map(a => (a.type === 'food' && a.recommendedPlateRef ? ficheSourceDeLAssiette(a.recommendedPlateRef.plateCode) : null))
    .filter((s): s is string => s !== null);
  // Sous un blocage, aucune fiche ne part : rien à lire, rien à verrouiller.
  const faits = entrees.blocage
    ? new Map<string, FaitsFiche>()
    : await lireFaits(client, entrees.idPatient, sourceIds, options.verrouiller);
  const apercu = planifierApercuFiches({
    actions: entrees.actions,
    blocage: entrees.blocage,
    faits,
    ficheDe: ficheSourceDeLAssiette,
    libelleDe,
  });
  return { ...apercu, jeton: canonicalSha256(empreinteDeLApercu(apercu, entrees.protocolDraftInputHash)) };
}

/**
 * Écrit les remises de l'aperçu, rattachées à l'approbation du clic. Rend le
 * nombre de fiches remises.
 *
 * `createMany` et non `create` : la base ANNULE sans erreur une remise
 * identique à la remise en cours, et un `create` qui attend sa ligne en retour
 * échouerait (constat de revue de M2). L'aperçu, relu sous le verrou, n'en
 * contient pas : un compte qui diffère dit que la base a jugé autrement que
 * lui, et la transaction est annulée plutôt que de rendre un nombre faux.
 */
export async function remettreFiches(
  client: Client,
  apercu: ApercuFiches,
  entrees: { idPatient: string; idApprobation: string },
): Promise<number> {
  const aRemettre = apercu.lignes
    .filter(l => l.statut === 'part' && l.sourceId !== null && l.idVersion !== null && l.contenuSha256 !== null)
    // L'ordre des fiches, celui des verrous : le trigger les reprend dans cet ordre.
    .sort((a, b) => (a.sourceId! < b.sourceId! ? -1 : a.sourceId! > b.sourceId! ? 1 : 0))
    .map(l => ({
      idPatient: entrees.idPatient,
      idApprobation: entrees.idApprobation,
      actionId: l.actionId,
      idVersion: l.idVersion!,
      contenuSha256: l.contenuSha256!,
    }));
  if (aRemettre.length === 0) return 0;
  const { count } = await client.ficheAssietteRemise.createMany({ data: aRemettre });
  if (count !== aRemettre.length) {
    throw new Error(`remise des fiches : ${count} ligne(s) écrite(s) pour ${aRemettre.length} attendue(s).`);
  }
  return count;
}
