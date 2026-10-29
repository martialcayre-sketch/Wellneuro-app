import { prisma } from '@/lib/prisma';
import { filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { chargerTrajectoiresCabinet } from '@/lib/praticien/chargementCabinet';
import { demandesEnAttente, tetesActives, tetesDeChaine } from '@/lib/praticien/objectifNegocie';
import { synthesesCourantes } from '@/lib/praticien/syntheseComprehension';
import {
  ancreCycleCourant,
  ancrePoseeDe,
  episodePersisteRejouable,
  loadRuntimeInputs,
  rejouerChaine,
  type EntreesRuntime,
} from '@/lib/clinical-engine/rejeuEpisodeCockpit';
import { isRuntimeMilestone, proposeRuntimeEpisode } from '@/lib/clinical-engine/runtimeFromPrisma';
import { preconditionsT0PourPatient } from '@/lib/clinical-engine/preconditionsT0Prisma';
import type { PreconditionsT0 } from '@/lib/clinical-engine/preconditionsT0';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import { ancreCourante, lireAncresPersistees } from '@/lib/protocol/ancresPersistees';
import { calendrierDuProtocoleDiffuse, lireCalendriersSuivi } from '@/lib/protocol/calendriersPersistes';
import { SEUIL_COHORTE_CABINET } from '@/lib/protocol/cabinet';
import { listCheckins } from '@/lib/protocol/checkins';
import { estAncreDeCycle } from '@/lib/protocol/cycles';
import { resolveActiveApproval } from '@/lib/protocol/diffusion';
import { estFinDeCycle } from '@/lib/protocol/finDeCycle';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { resoudreJalonDu } from '@/lib/protocol/jalonDu';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { buildResumeJ21 } from '@/lib/protocol/resumeJ21';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import { resolveActiveVersion } from '@/lib/protocol/versioning';
import { ORDRE_PHASES, type IdPhaseContrat } from '@/lib/trajectoire-partagee/contrat';
import { deriverEtatRuntimePourPhases } from '@/lib/trajectoire-partagee/etatRuntimeDerive';
import {
  phaseDueDuDossier,
  statutsDesPhases,
  type EntreesStatutsPhases,
} from '@/lib/trajectoire-partagee/statutsPhases';
import type { JalonMomentum } from '@/lib/equilibre/types';

// LES COMPTES DU CABINET ([[D-385]], J3-cabinet PR 3).
//
// Deux tableaux, un dossier compté une fois dans chacun :
// - « Prochaine étape » : la phase que le fil « Prochaine étape » de la fiche
//   désigne (`phaseDueDuDossier`, règle D5), sinon « rien n'attend » ;
// - « Protocole » : sans protocole diffusé, cycle en cours, fin de cycle —
//   d'après le signal même que le portail sert (`resolveProtocoleDiffuse`,
//   `estFinDeCycle`).
//
// UN SEUL CALCUL, DEUX LECTEURS. Rien ici ne décide d'une phase : les statuts
// viennent de `statutsPhases` et de `etatRuntimeDerive`, le rejeu de
// `rejeuEpisodeCockpit`, la fin de cycle de `finDeCycle` — les modules mêmes
// que la fiche, le cockpit et le portail appellent. Ce fichier charge, élit le
// jalon comme la fiche, et compte.
//
// AUCUN ÉTAT INVENTÉ (`DC-24`). Une lecture ou un rejeu en échec rend le
// dossier « indéterminé » pour ce tableau, jamais rangé ailleurs. Et quand
// aucune phase n'est due alors qu'un statut est inconnu, « rien n'attend »
// s'affirmerait sur de l'inconnu : le dossier est « indéterminé » aussi
// (arbitrage du 2026-10-27).
//
// LE TEMPS EST UN PARAMÈTRE. `maintenant` n'est jamais lu ici : il est passé
// au jalon dû (la fiche lit son horloge au même endroit) et à la fin de cycle.
// Le rejeu s'appelle SANS `asOf` : `resoudreAsOf` refuse toute date qui n'est
// pas un repère du dossier, et le rejeu du présent est celui de la fiche.
//
// AUCUN DOSSIER NE SORT D'ICI. Le chargeur rend une ligne anonyme par dossier,
// l'agrégat ne rend que des comptes masqués : ni identifiant, ni nom, et
// aucun journal d'accès par dossier — la page compte, elle n'ouvre rien.

// ---------------------------------------------------------------------------
// Les lignes et l'agrégat.
// ---------------------------------------------------------------------------

export type EtapeCompte = IdPhaseContrat | 'rien_n_attend' | 'indetermine';
export type EtatProtocoleCompte = 'sans_protocole' | 'cycle_en_cours' | 'fin_de_cycle' | 'indetermine';

/** Un dossier, réduit à ses deux rangements. Jamais rendu par la route. */
export type LigneComptes = { etape: EtapeCompte; protocole: EtatProtocoleCompte };

export const ETAPES_COMPTEES: readonly EtapeCompte[] = [...ORDRE_PHASES, 'rien_n_attend', 'indetermine'];
export const ETATS_PROTOCOLE_COMPTES: readonly EtatProtocoleCompte[] = [
  'sans_protocole',
  'cycle_en_cours',
  'fin_de_cycle',
  'indetermine',
];

export type Compte = number | 'masqué';

export type TableauComptes<K extends string> = {
  /** Le nombre de dossiers du tableau : toujours affiché ([[D-298]] §2). */
  effectif: number;
  /** Vrai quand une ligne compte un à quatre dossiers : toute la répartition est masquée. */
  repartitionMasquee: boolean;
  /** Les lignes dans l'ordre d'affichage. */
  lignes: { cle: K; compte: Compte }[];
};

export type ComptesCabinet = {
  prochaineEtape: TableauComptes<EtapeCompte>;
  protocole: TableauComptes<EtatProtocoleCompte>;
};

/**
 * Le masquage, patron de `agregerConstatAvantT0` (arbitrage du responsable du
 * 2026-10-29) : dès qu'une ligne compte un à quatre dossiers, TOUTE la
 * répartition du tableau est masquée — zéros compris. Masquer la seule ligne
 * la laisserait se déduire de l'effectif par soustraction, et un zéro affiché
 * à côté de lignes masquées dirait lesquelles portent les dossiers. Hors de ce
 * cas, un zéro s'affiche : il ne décrit personne.
 */
function tableau<K extends string>(ordre: readonly K[], valeurs: readonly K[], seuil: number): TableauComptes<K> {
  const comptes = new Map<K, number>(ordre.map(cle => [cle, 0]));
  for (const valeur of valeurs) comptes.set(valeur, (comptes.get(valeur) ?? 0) + 1);
  const repartitionMasquee = [...comptes.values()].some(n => n > 0 && n < seuil);
  return {
    effectif: valeurs.length,
    repartitionMasquee,
    lignes: ordre.map(cle => ({ cle, compte: repartitionMasquee ? 'masqué' : (comptes.get(cle) ?? 0) })),
  };
}

/** L'agrégat PUR : le seul objet que la route rend. */
export function agregerComptesCabinet(
  lignes: readonly LigneComptes[],
  seuil: number = SEUIL_COHORTE_CABINET,
): ComptesCabinet {
  return {
    prochaineEtape: tableau(ETAPES_COMPTEES, lignes.map(l => l.etape), seuil),
    protocole: tableau(ETATS_PROTOCOLE_COMPTES, lignes.map(l => l.protocole), seuil),
  };
}

// ---------------------------------------------------------------------------
// Tableau 1 — la prochaine étape, par l'élection de la fiche.
// ---------------------------------------------------------------------------

/** Ce que le GET du cockpit sert à la fiche, réduit à ce que les phases lisent. */
export type LectureCockpit =
  | { statut: 'ready'; carte: DecisionCard }
  | { statut: 'proposal_required'; preconditions: PreconditionsT0 | undefined };

/**
 * Les lectures d'un dossier qui dépendent de la carte servie. Injectées : le
 * banc de parité les nourrit du même scénario que la fiche.
 */
export type LecteursDossier = {
  lireCockpit: (jalon: JalonMomentum) => Promise<LectureCockpit>;
  /** `approval !== null` de `GET /api/praticien/protocoles/diffusion` pour cette carte. */
  diffusionApprouvee: (idCarte: string) => Promise<boolean>;
  /** `history.length` de `GET /api/praticien/protocoles/versions` pour cette carte. */
  compterVersions: (idCarte: string) => Promise<number>;
  /** `resume.pointsRenseignes` de `GET /api/praticien/protocoles/checkins` pour cette carte. */
  compterPointsRenseignes: (idCarte: string) => Promise<number>;
};

/** Ce que les lectures groupées donnent d'un dossier. */
export type LecturesGroupees = {
  trajectoire: Trajectoire;
  correctionsEnAttente: number;
  envoisAssignes: number;
  phase3: { objectifsActifs: number; synthesePubliee: boolean; demandesCorrectionEnAttente: number };
};

/**
 * L'ÉLECTION DU JALON, transcrite de `ClinicalRuntimeSection` (l'effet de
 * resynchronisation sur le jalon dû). La fiche demande d'abord `T0` ; une fois
 * la trajectoire lue, elle se recale sur le jalon DÛ. Pour un jalon de mesure,
 * elle charge d'abord la carte d'ancre du cycle courant, et n'avance au jalon
 * que si cette carte n'est pas rejouée ou que sa diffusion est approuvée
 * ([[D-253]]). Sans cette élection, la page lirait une autre carte que la
 * fiche, et la parité casserait là.
 *
 * L'état stable de la fiche est servi : une carte `ready` du GET est toujours
 * rejouée (`rejoue: true`), donc la garde `decisionAffichee` de l'écran — qui
 * protège un geste de confirmation en cours — ne joue jamais ici.
 */
export async function electionDuJalon(
  trajectoire: Trajectoire,
  lecteurs: Pick<LecteursDossier, 'lireCockpit' | 'diffusionApprouvee'>,
  maintenant: Date,
): Promise<LectureCockpit> {
  let demande: JalonMomentum = 'T0';
  let lue = await lecteurs.lireCockpit(demande);
  const du = resoudreJalonDu(trajectoire, maintenant);
  if (du.statut !== 'du' || du.jalon === demande) return lue;
  if (!estAncreDeCycle(du.jalon)) {
    // D'abord la carte d'ancre de CE cycle : c'est sa diffusion qui compte.
    const ancre = trajectoire.cycles.at(-1)?.ancre ?? null;
    if (ancre !== null && ancre !== demande) {
      demande = ancre;
      lue = await lecteurs.lireCockpit(demande);
    }
    // `suiviRetenu` : la carte d'ancre rejouée retient le suivi tant que sa
    // diffusion n'est pas lue ET affirmée.
    if (lue.statut === 'ready' && (await lecteurs.diffusionApprouvee(lue.carte.decisionCardId)) !== true) {
      return lue;
    }
  }
  return lecteurs.lireCockpit(du.jalon);
}

/**
 * La prochaine étape d'un dossier : les entrées de la fiche, puis
 * `phaseDueDuDossier`. Le dossier est compté sous la phase due, comme la
 * fiche, même si un autre statut reste inconnu.
 */
export async function etapeDuDossier(
  lectures: LecturesGroupees,
  lecteurs: LecteursDossier,
  maintenant: Date,
): Promise<EtapeCompte> {
  const lue = await electionDuJalon(lectures.trajectoire, lecteurs, maintenant);
  const carte = lue.statut === 'ready' ? lue.carte : null;
  const idCarte = carte?.decisionCardId ?? null;
  // Versions et check-ins ne se lisent que pour une carte servie, comme sur la
  // fiche : sans elle, « 0 version » n'est pas « aucune version » (t15).
  const nombreVersions = idCarte ? await lecteurs.compterVersions(idCarte) : 0;
  const pointsRenseignes = idCarte ? await lecteurs.compterPointsRenseignes(idCarte) : 0;
  const runtime = deriverEtatRuntimePourPhases({
    chargement: false,
    erreur: null,
    carte,
    idCarteServie: idCarte,
    preconditionsProposition: lue.statut === 'proposal_required' ? lue.preconditions : null,
    versions: { luesPourLaCarte: idCarte !== null, nombre: nombreVersions },
    checkins: { lusPourLaCarte: idCarte !== null, pointsRenseignes },
    trajectoire: { statut: 'chargee', cycles: lectures.trajectoire.cycles },
  });
  const entrees: EntreesStatutsPhases = {
    // La fiche lit ici la réponse de `/api/praticien/equilibre`, qui n'est
    // indisponible que hors session, hors périmètre ou sur exception : le
    // dossier vient de la liste du praticien, et une exception rend
    // « indéterminé » plus haut.
    lecturesDeBase: 'ok',
    corrections: { etat: 'chargees', enAttente: lectures.correctionsEnAttente },
    // ÉCART ACCEPTÉ (arbitrage du 2026-10-27) : la fiche tronque la liste des
    // envois à 40 et rend alors « indéterminée » ; la page lit la liste entière.
    passations: { etat: 'chargees', assignees: lectures.envoisAssignes },
    phase3: { lu: 'lu', etat: lectures.phase3 },
    runtime,
  };
  const due = phaseDueDuDossier(entrees);
  if (due !== null) return due;
  return Object.values(statutsDesPhases(entrees)).includes('inconnu') ? 'indetermine' : 'rien_n_attend';
}

/**
 * Le NOM d'une erreur, jamais son message : une erreur de validation Prisma
 * recopie les arguments de la requête, dont l'identifiant du dossier (revue
 * CodeRabbit de #1780). Le journal dit qu'une lecture a échoué, pas sur qui.
 */
function nomErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.name : 'erreur inconnue';
}

/**
 * Le GET du cockpit au présent, sans `asOf`, réduit à ce que les phases
 * lisent : même enchaînement que la route (ancre du cycle, proposition,
 * épisode persisté, rejeu), et le même repli — un rejeu qui jette rend la
 * proposition. Ni contradictions ni claims : les phases ne les lisent pas.
 */
async function lireCockpitAuPresent(
  idPatient: string,
  inputs: EntreesRuntime,
  jalon: JalonMomentum,
): Promise<LectureCockpit> {
  // Le GET refuse un jalon invalide (400) : la fiche passe en erreur, la page
  // compte « indéterminé ».
  if (!isRuntimeMilestone(jalon)) throw new Error('jalon invalide');
  const { ancreCycle } = await ancreCycleCourant(idPatient, jalon, null);
  const { proposal } = proposeRuntimeEpisode(inputs, jalon, ancreCycle, await ancrePoseeDe(idPatient, jalon, null));
  const episode = await episodePersisteRejouable(inputs, proposal);
  if (episode) {
    try {
      const { chaine } = await rejouerChaine(idPatient, inputs, episode);
      return { statut: 'ready', carte: chaine.decisionCard };
    } catch (erreurRejeu) {
      // Comme le GET : la proposition reprend la main — c'est ce que la fiche
      // affiche, et la parité l'exige.
      console.warn(
        '[comptes-cabinet] rejeu impossible, proposition retenue :',
        nomErreur(erreurRejeu),
      );
    }
  }
  return {
    statut: 'proposal_required',
    preconditions: estAncreDeCycle(jalon) ? await preconditionsT0PourPatient(idPatient, jalon) : undefined,
  };
}

/** Les lectures de la carte servie, par les requêtes mêmes de leurs routes. */
function lecteursPrisma(idPatient: string, inputs: EntreesRuntime): LecteursDossier {
  return {
    lireCockpit: jalon => lireCockpitAuPresent(idPatient, inputs, jalon),
    // `GET /api/praticien/protocoles/diffusion` : l'approbation active des
    // versions de la carte, sur l'empreinte de la version active.
    diffusionApprouvee: async idCarte => {
      const versions = await prisma.protocolDraft.findMany({
        where: { idPatient, decisionCardId: idCarte },
        select: { id: true, inputHash: true, supersedesDraftId: true, createdAt: true, decisionCardInputHash: true },
      });
      if (versions.length === 0) return false;
      const decisionCardInputHash = (resolveActiveVersion(versions) ?? versions[0]).decisionCardInputHash;
      const approbations = await prisma.protocolDiffusionApproval.findMany({
        where: { idPatient, decisionCardInputHash },
        select: { id: true, protocolDraftInputHash: true, supersedesApprovalId: true, createdAt: true },
      });
      return resolveActiveApproval(approbations) !== null;
    },
    // `GET /api/praticien/protocoles/versions` : une ligne d'historique par version.
    compterVersions: idCarte => prisma.protocolDraft.count({ where: { idPatient, decisionCardId: idCarte } }),
    // `GET /api/praticien/protocoles/checkins` : les check-ins bornés aux
    // versions du calendrier du cycle courant, à défaut à celles de la carte,
    // comptés par `buildResumeJ21` — le score du résumé n'entre pas dans le compte.
    compterPointsRenseignes: async idCarte => {
      const ancres = await lireAncresPersistees(idPatient);
      const ancre = ancreCourante(ancres);
      const calendrier = ancre
        ? (await lireCalendriersSuivi(idPatient, null, ancres)).parCycle.get(ancre.cycleId ?? ancre.id) ?? null
        : null;
      const bornes = calendrier
        ? new Set(calendrier.versionIds)
        : new Set(
            (await prisma.protocolDraft.findMany({ where: { idPatient, decisionCardId: idCarte }, select: { id: true } }))
              .map(v => v.id),
          );
      const checkins = (await listCheckins(idPatient)).filter(c => bornes.has(c.protocolDraftId));
      return buildResumeJ21({ checkins }).pointsRenseignes;
    },
  };
}

// ---------------------------------------------------------------------------
// Tableau 2 — le protocole, par le signal du portail.
// ---------------------------------------------------------------------------

/**
 * Transcrit de `GET /api/portail/protocole` jusqu'au calcul de `finDeCycle` :
 * pas d'approbation active, ou une approbation orpheline ⇒ sans protocole
 * diffusé ; un payload qui ne se recoupe pas fait échouer la route du
 * portail ⇒ « indéterminé » par l'appelant.
 */
async function etatProtocole(idPatient: string, maintenant: Date): Promise<EtatProtocoleCompte> {
  const diffuse = await resolveProtocoleDiffuse(idPatient);
  if (!diffuse) return 'sans_protocole';
  const ligne = await prisma.protocolDraft.findUnique({
    where: { id: diffuse.protocolDraftId },
    select: { payload: true, inputHash: true },
  });
  if (!ligne) return 'sans_protocole';
  reconstructProtocolDraft(ligne.payload, ligne.inputHash);
  const { jourZero } = await calendrierDuProtocoleDiffuse(idPatient, diffuse);
  return estFinDeCycle(jourZero, maintenant) ? 'fin_de_cycle' : 'cycle_en_cours';
}

// ---------------------------------------------------------------------------
// Le chargeur.
// ---------------------------------------------------------------------------

/**
 * Combien de dossiers rejoués à la fois. Constante TECHNIQUE (`DC-20`) : elle
 * borne la pression sur le pool Prisma, elle ne décide de rien.
 */
const DOSSIERS_EN_PARALLELE = 4;

/** Les envois et les demandes de correction, comme les compte la fiche. */
export function resumerAssignations(
  assignations: readonly { statut: string; statutReponses: string | null }[],
): { correctionsEnAttente: number; envoisAssignes: number } {
  return {
    correctionsEnAttente: assignations.filter(a => a.statutReponses === 'modification_demandee').length,
    // `rendues + enAttente`, les annulées exclues (`FichePatientPanel`, `envois`).
    envoisAssignes: assignations.filter(a => a.statut === 'Complété' || a.statut === 'En attente').length,
  };
}

function parPatient<T extends { idPatient: string }>(lignes: readonly T[]): Map<string, T[]> {
  const carte = new Map<string, T[]>();
  for (const ligne of lignes) {
    const liste = carte.get(ligne.idPatient) ?? [];
    liste.push(ligne);
    carte.set(ligne.idPatient, liste);
  }
  return carte;
}

async function enParallele<T, R>(elements: readonly T[], limite: number, tache: (element: T) => Promise<R>): Promise<R[]> {
  const resultats = new Array<R>(elements.length);
  let suivant = 0;
  const ouvrier = async () => {
    while (suivant < elements.length) {
      const index = suivant++;
      resultats[index] = await tache(elements[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, elements.length) }, ouvrier));
  return resultats;
}

/**
 * Une ligne par dossier du praticien — TOUS ses dossiers, désactivés compris,
 * la population de la page Trajectoires (arbitrage du 2026-10-27).
 */
export async function compterCabinet(emailPraticien: string, maintenant: Date): Promise<LigneComptes[]> {
  const debut = performance.now();
  // Patients, épisodes, réponses et jours zéro : le chargeur de Trajectoires.
  const dossiers = await chargerTrajectoiresCabinet(emailPraticien);
  if (dossiers.length === 0) return [];
  const ids = dossiers.map(d => d.idPatient);

  const [assignations, objectifs, fins, syntheses, demandes] = await Promise.all([
    prisma.assignation.findMany({
      where: { idPatient: { in: ids }, patient: filtrePatientsDuPraticien(emailPraticien) },
      select: { idPatient: true, statut: true, statutReponses: true },
    }),
    // Les quatre lectures de `GET /api/praticien/objectifs/etat-phase`, mêmes `select`.
    prisma.objectifNegocie.findMany({
      where: { idPatient: { in: ids } },
      select: { idPatient: true, id: true, supersedesObjectifId: true, creeLe: true },
    }),
    prisma.finObjectif.findMany({
      where: { idPatient: { in: ids } },
      select: {
        idPatient: true,
        id: true,
        racineObjectifId: true,
        motif: true,
        voix: true,
        consigneePar: true,
        sens: true,
        creeLe: true,
      },
    }),
    prisma.syntheseComprehension.findMany({
      where: { idPatient: { in: ids } },
      select: { idPatient: true, id: true, publieeLe: true, supersedesSyntheseId: true, creeLe: true },
    }),
    prisma.demandeCorrectionObjectif.findMany({
      where: { idPatient: { in: ids } },
      select: { idPatient: true, id: true, idObjectif: true, creeLe: true },
    }),
  ]);
  const assignationsPar = parPatient(assignations);
  const objectifsPar = parPatient(objectifs);
  const finsPar = parPatient(fins);
  const synthesesPar = parPatient(syntheses);
  const demandesPar = parPatient(demandes);

  const lignes = await enParallele(dossiers, DOSSIERS_EN_PARALLELE, async (dossier): Promise<LigneComptes> => {
    const idPatient = dossier.idPatient;
    let etape: EtapeCompte;
    try {
      const inputs = await loadRuntimeInputs(idPatient, emailPraticien);
      if (!inputs || 'refus' in inputs) throw new Error('dossier illisible');
      const tetes = tetesDeChaine(objectifsPar.get(idPatient) ?? [], finsPar.get(idPatient) ?? []);
      etape = await etapeDuDossier(
        {
          trajectoire: dossier.trajectoire,
          ...resumerAssignations(assignationsPar.get(idPatient) ?? []),
          phase3: {
            objectifsActifs: tetesActives(tetes).length,
            synthesePubliee: synthesesCourantes(synthesesPar.get(idPatient) ?? []).some(s => s.publieeLe !== null),
            demandesCorrectionEnAttente: demandesEnAttente(
              (demandesPar.get(idPatient) ?? []).map(d => ({ ...d, texte: null })),
              tetes,
            ).length,
          },
        },
        lecteursPrisma(idPatient, inputs),
        maintenant,
      );
    } catch (erreur) {
      // « Indéterminé » sur l'écran, et la cause dans le journal : sans cette
      // ligne, une panne se lirait « indéterminé » partout, sans trace. Le
      // NOM de l'erreur seul (`nomErreur`).
      console.warn('[comptes-cabinet] étape indéterminée :', nomErreur(erreur));
      etape = 'indetermine';
    }
    let protocole: EtatProtocoleCompte;
    try {
      protocole = await etatProtocole(idPatient, maintenant);
    } catch (erreur) {
      console.warn('[comptes-cabinet] protocole indéterminé :', nomErreur(erreur));
      protocole = 'indetermine';
    }
    return { etape, protocole };
  });

  // LE COÛT SE MESURE ([[D-385]], plan §7) : aucune optimisation avant la
  // mesure. Un compte et une durée, jamais un dossier.
  console.info(`[comptes-cabinet] ${lignes.length} dossiers comptés en ${Math.round(performance.now() - debut)} ms`);
  return lignes;
}
