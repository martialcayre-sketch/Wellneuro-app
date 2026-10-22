import { prisma } from '@/lib/prisma';
import { preMarquage, type MotifEcart } from './valeurLue';
import { PEREMPTION_EN_COURS_MS } from './verrou';

// LECTURE DU STAGING POUR L'ÉCRAN (BIO-INGEST LOT-02). Ne rend JAMAIS le
// contenu du document : chaque sélection est explicite, `contenu` n'y figure
// pas. Le pré-marquage est calculé ici, à la lecture, et n'écrit rien.

export type LigneLue = {
  id: string;
  rang: number;
  page: number;
  libelleLu: string;
  valeurLue: string;
  uniteLue: string | null;
  preleveLeLu: string | null;
  /** L'heure a été lue sur le compte rendu ([[D-258]]) — sinon `preleveLeLu` est un minuit de Paris. */
  heureLue: boolean;
  /**
   * Faits du laboratoire TELS QU'IMPRIMÉS ([[D-267]]) — affichés seuls,
   * attribués au laboratoire ; jamais modifiables (la base les fige).
   */
  intervalleLu: string | null;
  marquageLu: string | null;
  /** Imprimé mais trop long pour être transcrit : à lire sur le document (§10). */
  intervalleNonTranscrit: boolean;
  marquageNonTranscrit: boolean;
  /**
   * Le commentaire du laboratoire sur ce résultat, tel qu'imprimé ([[D-278]]
   * §3). Texte libre qui peut nommer un tiers : servi au seul praticien.
   */
  commentaireLu: string | null;
  commentaireNonTranscrit: boolean;
  analytePropose: string | null;
  statutMapping: string;
  statut: string;
  motifEcart: string | null;
  idResultat: string | null;
  /**
   * L'instant de la décision (validée ou écartée), posé par la base ; `null`
   * tant que la ligne est proposée (CHECK). Il date la marque « lignes
   * validées » de la carte ([[D-308]] §3).
   */
  traiteLe: string | null;
  /** Suggestion d'écart pour l'écran — jamais une décision. */
  preMarquage: MotifEcart | null;
};

export type ImportLu = {
  id: string;
  statut: string;
  motifEchec: string | null;
  modele: string;
  versionPrompt: string;
  laboratoireLu: string | null;
  /** Les commentaires du compte rendu ENTIER, tels qu'imprimés ([[D-278]] §3). */
  commentairesLus: string | null;
  commentairesNonTranscrits: boolean;
  /**
   * Le procédé de cette extraction relevait-il les commentaires ? Avant
   * `bio-extraction-v4`, aucun ne l'était : leur absence ne dit pas que le
   * laboratoire n'en avait pas imprimé.
   */
  commentairesReleves: boolean;
  lanceLe: string;
  termineLe: string | null;
  /** L'extraction courante — la seule dont les lignes se décident (arbitrage du 2026-10-02). */
  courant: boolean;
  /**
   * `en_cours` au-delà de la péremption (processus mort) — jugé par l'horloge
   * du SERVEUR, pas celle du navigateur (revue de la PR 2b, P2-3).
   */
  perime: boolean;
  lignes: LigneLue[];
};

export type CompteRenduLu = {
  id: string;
  typeMime: string;
  /** `praticien` | `patient` ([[D-269]] §2). */
  origine: string;
  /** NULL pour un document transmis par le patient ([[D-269]] §2). */
  deposePar: string | null;
  deposeLe: string;
  /** Le document a été effacé ([[D-258]]) : il ne se relit plus ; à l’échéance et à l’écart, ses lignes non validées partent avec lui ([[D-283]] §2). */
  purgeLe: string | null;
  motifPurge: string | null;
  /** L'écart d'un document transmis par le patient ([[D-269]] §3) : `illisible` | `document_non_conforme`. */
  motifEcart: string | null;
  /**
   * Une lecture est DEMANDÉE à la file ([[D-282]], G3) — en attente, en cours
   * ou en reprise. L'import n'existe qu'à la réclamation : sans ce signal,
   * l'écran ne verrait rien pendant l'attente, ni pendant une reprise dont
   * l'import est périmé mais la réservation encore vive.
   */
  lectureDemandee: boolean;
  /**
   * Le dernier masquage de l'identité, non purgé ([[D-284]] §5) — ce que la
   * lecture enverra. `null` : la lecture est bloquée. Jamais ses pages.
   */
  masquage: { poseLe: string; zonesMasquees: number; aucuneIdentite: boolean } | null;
  /**
   * La date de naissance du DOSSIER (`AAAA-MM-JJ` telle que stockée, ou
   * `null`), montrée au praticien sur l'écran de masquage pour qu'il la compare
   * au compte rendu avant de la noircir ([[D-342]] §3). Elle ne part jamais au
   * service de lecture.
   */
  dateNaissanceDossier: string | null;
  imports: ImportLu[];
};

/**
 * Les comptes rendus d'un dossier, sans leurs lignes — la liste de l'écran.
 * `dernierImport` est l'extraction COURANTE (la plus récente non échouée),
 * celle que désignent la base et `decisions.ts` (revue de la migration de
 * purge) ; à défaut, la dernière tentative échouée, pour que l'échec se voie.
 */
export async function listerComptesRendus(idPatient: string) {
  const comptesRendus = await prisma.compteRenduBiologique.findMany({
    where: { idPatient },
    orderBy: { deposeLe: 'desc' },
    select: {
      id: true,
      typeMime: true,
      origine: true,
      deposePar: true,
      deposeLe: true,
      purgeLe: true,
      motifEcart: true,
      imports: { orderBy: { lanceLe: 'desc' }, select: { id: true, statut: true } },
    },
  });
  return comptesRendus.map(c => ({
    id: c.id,
    typeMime: c.typeMime,
    origine: c.origine,
    deposePar: c.deposePar,
    deposeLe: c.deposeLe.toISOString(),
    purgeLe: c.purgeLe?.toISOString() ?? null,
    motifEcart: c.motifEcart,
    dernierImport: c.imports.find(i => i.statut !== 'echec') ?? c.imports[0] ?? null,
  }));
}

/**
 * Les commentaires ne sont relevés que depuis `bio-extraction-v4` ([[D-278]]
 * §3). Une version illisible est jugée NON relevante : dire « non relevés » à
 * tort coûte une relecture du document, dire « aucun » à tort en fait perdre un.
 */
export function procedeReleveCommentaires(versionPrompt: string): boolean {
  const v = /^bio-extraction-v(\d+)$/.exec(versionPrompt);
  return v !== null && Number(v[1]) >= 4;
}

/** Un compte rendu, ses extractions et leurs lignes, avec le pré-marquage. `null` s'il n'est pas de ce dossier. */
export async function lireCompteRendu(
  idPatient: string,
  idCompteRendu: string,
  maintenant: Date = new Date(),
): Promise<CompteRenduLu | null> {
  const c = await prisma.compteRenduBiologique.findFirst({
    where: { id: idCompteRendu, idPatient },
    select: {
      id: true,
      typeMime: true,
      origine: true,
      deposePar: true,
      deposeLe: true,
      purgeLe: true,
      motifPurge: true,
      motifEcart: true,
      travaux: { where: { statut: { in: ['en_attente', 'en_cours'] } }, select: { id: true }, take: 1 },
      patient: { select: { dateNaissance: true } },
      // Le résumé seul : les pages (jusqu'à 20 Mio) ne se chargent qu'à la lecture.
      masquages: {
        where: { purgeLe: null },
        orderBy: [{ poseLe: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { poseLe: true, zonesMasquees: true, aucuneIdentite: true },
      },
      imports: {
        orderBy: { lanceLe: 'desc' },
        select: {
          id: true, statut: true, motifEchec: true, modele: true, versionPrompt: true,
          laboratoireLu: true, commentairesLus: true, commentairesNonTranscrits: true,
          lanceLe: true, termineLe: true,
          lignes: {
            orderBy: { rang: 'asc' },
            select: {
              id: true, rang: true, page: true, libelleLu: true, valeurLue: true, uniteLue: true,
              preleveLeLu: true, heureLue: true, intervalleLu: true, marquageLu: true,
              intervalleNonTranscrit: true, marquageNonTranscrit: true,
              commentaireLu: true, commentaireNonTranscrit: true,
              analytePropose: true, statutMapping: true, statut: true,
              motifEcart: true, idResultat: true, traiteLe: true,
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  const codes = [...new Set(c.imports.flatMap(i => i.lignes.flatMap(l => (l.analytePropose ? [l.analytePropose] : []))))];
  const analytes = codes.length === 0 ? [] : await prisma.biologyAnalyte.findMany({
    where: { code: { in: codes } },
    select: { code: true, unite: true },
  });
  const uniteParCode = new Map(analytes.map(a => [a.code, a]));
  // Triés du plus récent au plus ancien : la courante est la première qui n'a pas échoué.
  const idCourant = c.imports.find(i => i.statut !== 'echec')?.id ?? null;

  return {
    id: c.id,
    typeMime: c.typeMime,
    origine: c.origine,
    deposePar: c.deposePar,
    deposeLe: c.deposeLe.toISOString(),
    purgeLe: c.purgeLe?.toISOString() ?? null,
    motifPurge: c.motifPurge,
    motifEcart: c.motifEcart,
    lectureDemandee: c.travaux.length > 0,
    masquage: c.masquages[0]
      ? {
        poseLe: c.masquages[0].poseLe.toISOString(),
        zonesMasquees: c.masquages[0].zonesMasquees,
        aucuneIdentite: c.masquages[0].aucuneIdentite,
      }
      : null,
    dateNaissanceDossier: c.patient.dateNaissance,
    imports: c.imports.map(i => ({
      id: i.id,
      statut: i.statut,
      motifEchec: i.motifEchec,
      modele: i.modele,
      versionPrompt: i.versionPrompt,
      laboratoireLu: i.laboratoireLu,
      commentairesLus: i.commentairesLus,
      commentairesNonTranscrits: i.commentairesNonTranscrits,
      commentairesReleves: procedeReleveCommentaires(i.versionPrompt),
      lanceLe: i.lanceLe.toISOString(),
      termineLe: i.termineLe?.toISOString() ?? null,
      courant: i.id === idCourant,
      perime: i.statut === 'en_cours' && i.lanceLe.getTime() < maintenant.getTime() - PEREMPTION_EN_COURS_MS,
      lignes: i.lignes.map(l => ({
        ...l,
        preleveLeLu: l.preleveLeLu?.toISOString() ?? null,
        traiteLe: l.traiteLe?.toISOString() ?? null,
        preMarquage: preMarquage(l, l.analytePropose ? uniteParCode.get(l.analytePropose) ?? null : null),
      })),
    })),
  };
}
