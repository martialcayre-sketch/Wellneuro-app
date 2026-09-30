import { validateDiffusionApproval } from './diffusion';
import { ancresOrdonnees, estAncreDeCycle } from './cycles';

// LE CALENDRIER DE SUIVI D'UN CYCLE PART DE LA DIFFUSION DU PROTOCOLE ([[D-255]]).
//
// AVANT. Deux calendriers couraient sur un même cycle ([[D-151]] §2) : les
// points d'étape J7/J14/J21 depuis l'approbation de diffusion ACTIVE — si bien
// que chaque rediffusion les relançait —, les jalons J21/J42/J90 depuis la
// confirmation de l'ancre, protocole ou non. Un dossier sans protocole voyait
// donc courir un J21 qui n'avait rien à mesurer ([[D-253]]).
//
// APRÈS. Un seul jour 0 par cycle : la PREMIÈRE diffusion du protocole de ce
// cycle. Une rediffusion qui allège ou densifie ne relance rien. Seul un PIVOT
// relance : une version diffusée dont la priorité (`selectedPriorityId`)
// diffère de celle de la version qui a ouvert le calendrier courant. Le pivot
// se DÉDUIT de ce qui est enregistré ; rien n'est à saisir.
//
// L'HISTORIQUE COMPLET, PAS LA TÊTE DE CHAÎNE. `resolveActiveApproval` ne rend
// que l'approbation courante : lue seule, elle ferait d'une rediffusion un
// nouveau départ, et d'un pivot suivi d'une rediffusion un pivot invisible. Ce
// module lit TOUTES les approbations, supplantées comprises.
//
// CE MODULE EST PUR : aucun accès base. La lecture vit dans
// `calendriersPersistes.ts`, et le jour 0 se calcule ici et nulle part
// ailleurs — les consommateurs lisent la date qu'il rend, ils ne la refont pas.

/** L'épisode sur lequel la version diffusée a été construite. */
export type EpisodeDeRattachement = {
  id: string;
  milestone: string;
  cycleId: string | null;
};

/** Une ancre confirmée, telle que `lireAncresPersistees` la rend. */
export type AncreDeRattachement = {
  id: string;
  cycleId: string | null;
  milestone: string;
  confirmedAt: Date;
};

/** Une approbation de diffusion, jointe à la version qu'elle a diffusée. */
export type DiffusionHistorique = {
  approbationId: string;
  approuveLe: Date;
  creeLe: Date;
  approuvePar: string;
  confirmation: string;
  decisionCardInputHash: string;
  protocolDraftInputHash: string;
  version: {
    /** L'identifiant de la version diffusée (`protocol_drafts.id`). */
    id: string;
    inputHash: string;
    decisionCardInputHash: string;
    status: string;
    reviewedAt: Date | null;
    selectedPriorityId: string;
    episode: EpisodeDeRattachement | null;
  };
};

export type CalendrierSuivi = {
  cycleId: string;
  /** Le jour 0 : la diffusion qui a ouvert le calendrier courant. */
  jourZero: Date;
  /** La priorité de la version qui l'a ouvert. */
  prioriteId: string;
  approbationId: string;
  /** Vrai quand un pivot a relancé le calendrier après la première diffusion. */
  relance: boolean;
  /**
   * Les versions diffusées depuis le jour 0, dans l'ordre. Un point d'étape
   * rempli sous l'une d'elles appartient à ce calendrier : une rediffusion
   * qui ne relance rien ne le fait pas redemander.
   */
  versionIds: string[];
};

/**
 * La ligne est-elle une diffusion ? Mêmes invariants que l'écriture
 * (`validateDiffusionApproval`) et que la lecture patient
 * (`resolveProtocoleDiffuse`) : une approbation qui ne recoupe pas sa version
 * n'a rien diffusé, et ne date donc rien.
 */
export function estDiffusionRecevable(diffusion: DiffusionHistorique): boolean {
  return validateDiffusionApproval({
    version: diffusion.version,
    approval: {
      decisionCardInputHash: diffusion.decisionCardInputHash,
      protocolDraftInputHash: diffusion.protocolDraftInputHash,
      approvedAt: diffusion.approuveLe.toISOString(),
      approvedBy: diffusion.approuvePar,
      confirmation: diffusion.confirmation,
    },
  }).ok;
}

/**
 * Le cycle d'une diffusion.
 *
 * PAR L'ÉPISODE DE LA VERSION, d'abord : une ancre porte son propre cycle, un
 * jalon de mesure le `cycleId` stocké à sa confirmation (gate G2). C'est le
 * cas de toute version enregistrée par le cockpit.
 *
 * PAR LA DATE, en repli, pour une version sans épisode ou un épisode sans
 * `cycleId` (lignes anciennes) : le cycle du rang le plus haut parmi les
 * ancres confirmées au plus tard à la diffusion — la règle de
 * `resolveCycleId`. Sans ancre antérieure, la diffusion n'est rattachée à
 * aucun cycle plutôt qu'au premier venu.
 */
export function cycleDeLaDiffusion(
  diffusion: Pick<DiffusionHistorique, 'approuveLe'> & { version: Pick<DiffusionHistorique['version'], 'episode'> },
  ancres: readonly AncreDeRattachement[],
): string | null {
  const { episode } = diffusion.version;
  if (episode) {
    if (estAncreDeCycle(episode.milestone)) return episode.cycleId ?? episode.id;
    if (episode.cycleId !== null) return episode.cycleId;
  }
  const instant = diffusion.approuveLe.getTime();
  const anterieures = ancresOrdonnees(ancres.filter((ancre) => ancre.confirmedAt.getTime() <= instant));
  const ancre = anterieures.at(-1);
  return ancre ? ancre.cycleId ?? ancre.id : null;
}

// Ordre chronologique total : la date d'approbation, puis la date d'écriture,
// puis l'identifiant — deux lectures d'un même historique rendent le même jour 0.
function chronologique(gauche: DiffusionHistorique, droite: DiffusionHistorique): number {
  const delta = gauche.approuveLe.getTime() - droite.approuveLe.getTime();
  if (delta !== 0) return delta;
  const ecriture = gauche.creeLe.getTime() - droite.creeLe.getTime();
  if (ecriture !== 0) return ecriture;
  return gauche.approbationId < droite.approbationId ? -1 : gauche.approbationId > droite.approbationId ? 1 : 0;
}

/**
 * Le calendrier d'UN cycle, à partir de ses diffusions recevables.
 *
 * La première diffusion l'ouvre. Chaque diffusion suivante dont la priorité
 * diffère de celle qui a ouvert le calendrier COURANT le relance ; les autres
 * ne changent rien. Un retour à la priorité d'origine après un pivot est donc
 * lui-même un pivot.
 */
export function calendrierDuCycle(
  cycleId: string,
  diffusions: readonly DiffusionHistorique[],
): CalendrierSuivi | null {
  const triees = [...diffusions].sort(chronologique);
  const premiere = triees[0];
  if (!premiere) return null;
  let ouvrante = premiere;
  for (const diffusion of triees.slice(1)) {
    if (diffusion.version.selectedPriorityId !== ouvrante.version.selectedPriorityId) ouvrante = diffusion;
  }
  return {
    cycleId,
    jourZero: ouvrante.approuveLe,
    prioriteId: ouvrante.version.selectedPriorityId,
    approbationId: ouvrante.approbationId,
    relance: ouvrante !== premiere,
    versionIds: [...new Set(triees.slice(triees.indexOf(ouvrante)).map((diffusion) => diffusion.version.id))],
  };
}

/**
 * Les calendriers de tous les cycles d'un dossier.
 *
 * Un cycle sans diffusion recevable n'a PAS de calendrier : aucun jalon de
 * suivi n'y court ([[D-253]], généralisé par [[D-255]]).
 *
 * `nonRattachees` nomme les diffusions recevables qu'aucun cycle n'a pu
 * recevoir. Elles ne datent rien, et le dire vaut mieux que les perdre en
 * silence (`DC-30`).
 */
export function calendriersParCycle(
  diffusions: readonly DiffusionHistorique[],
  ancres: readonly AncreDeRattachement[],
): {
  parCycle: Map<string, CalendrierSuivi>;
  /** Le cycle de chaque diffusion recevable et rattachée, par approbation. */
  cycleParDiffusion: Map<string, string>;
  nonRattachees: string[];
} {
  const groupes = new Map<string, DiffusionHistorique[]>();
  const cycleParDiffusion = new Map<string, string>();
  const nonRattachees: string[] = [];
  for (const diffusion of diffusions) {
    if (!estDiffusionRecevable(diffusion)) continue;
    const cycleId = cycleDeLaDiffusion(diffusion, ancres);
    if (cycleId === null) {
      nonRattachees.push(diffusion.approbationId);
      continue;
    }
    cycleParDiffusion.set(diffusion.approbationId, cycleId);
    const groupe = groupes.get(cycleId);
    if (groupe) groupe.push(diffusion);
    else groupes.set(cycleId, [diffusion]);
  }
  const parCycle = new Map<string, CalendrierSuivi>();
  for (const [cycleId, groupe] of groupes) {
    const calendrier = calendrierDuCycle(cycleId, groupe);
    if (calendrier) parCycle.set(cycleId, calendrier);
  }
  return { parCycle, cycleParDiffusion, nonRattachees };
}

/** Le jour 0 de chaque cycle, par `cycleId` — ce que lit `construireTrajectoire`. */
export function joursZeroParCycle(parCycle: ReadonlyMap<string, CalendrierSuivi>): Map<string, Date> {
  return new Map([...parCycle].map(([cycleId, calendrier]) => [cycleId, calendrier.jourZero]));
}
