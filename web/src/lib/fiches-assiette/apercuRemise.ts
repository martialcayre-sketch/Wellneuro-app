// L'APERÇU DES FICHES D'ASSIETTE QU'UN CLIC « VALIDER POUR DIFFUSION »
// REMETTRAIT ([[D-251]] §7, lot 8) — module PUR : ni base, ni `crypto`, ni table
// d'assiettes. L'écran du cockpit en lit les types ; le serveur (`remise.ts`)
// lui apporte les faits lus en base et y ajoute le jeton.
//
// UNE LIGNE PAR FICHE, pas par action : une même assiette posée sur deux actions
// ne fait qu'une remise (la base annule la seconde, migration M2). Les lignes
// suivent l'ordre des actions du protocole — l'ordre que le praticien lit.
//
// CE QUI NE PART PAS SE DIT, AVEC SON MOTIF (`DC-24`) — l'aperçu du §7 montre
// les fiches qui partiront ET celles qui ne partiront pas. Un silence ferait
// lire « rien à remettre » là où une fiche attend une validation, ou ne passe
// plus ses contrôles.
//
// JAMAIS DE REPLI (amendement du 2026-09-27, point 3) : une version de
// référence qui ne passe plus les contrôles rejoués n'est pas remise, et aucune
// version plus ancienne ne part à sa place. La base le refuse aussi (trigger de
// M2) ; l'aperçu le dit AVANT le clic.

import type { ProtocolAction } from '@/lib/clinical-engine/types';

/**
 * Ce qui empêche TOUTE fiche de partir, quel que soit son état.
 * `lecture_impossible` : la lecture des fiches a échoué au cockpit — rien n'est
 * affirmé, et un clic posé sur cet aperçu est refusé.
 */
export type MotifBlocage = 'dossier_non_suivi' | 'contrat_refuse' | 'lecture_impossible';

/** Pourquoi UNE fiche ne part pas. */
export type MotifFiche =
  | MotifBlocage
  | 'sans_fiche'
  | 'action_non_ferme'
  | 'aucune_version_validee'
  | 'controles_echoues';

export type StatutLigneFiche = 'part' | 'deja_remise' | 'ne_part_pas';

export type LigneApercuFiche = {
  plateCode: string;
  libelle: string;
  /** La Fiche MY appariée ; `null` : aucune (`sans_fiche`). */
  sourceId: string | null;
  /** L'action qui porterait la remise : la première action FERME, sinon la première. */
  actionId: string;
  statut: StatutLigneFiche;
  /** La version concernée : celle qui part, déjà remise, ou qui échoue aux contrôles. */
  idVersion: string | null;
  numero: number | null;
  contenuSha256: string | null;
  /** `null` sauf pour `ne_part_pas`. */
  motif: MotifFiche | null;
  /** La phrase dite au praticien, pour chaque statut. */
  detail: string;
};

export type BlocageFiches = { motif: MotifBlocage; detail: string };

export type ApercuFichesSansJeton = {
  blocage: BlocageFiches | null;
  lignes: LigneApercuFiche[];
};

/**
 * L'aperçu tel que la route le sert. Le JETON résume ce que le praticien a vu :
 * le clic le renvoie, et le serveur refuse si l'aperçu recalculé au moment du
 * clic en diffère (arbitrage du 2026-09-28 : « refuser et remontrer »).
 */
export type ApercuFiches = ApercuFichesSansJeton & { jeton: string };

/** Ce que la base dit d'une fiche, pour ce patient. */
export type FaitsFiche = {
  /** La version de référence, ou `null` : aucune version validée. */
  reference: { id: string; numero: number; contenuSha256: string; nbAnomalies: number } | null;
  /** La remise EN COURS pour ce patient (la dernière), ou `null`. */
  enCours: { idVersion: string; numero: number } | null;
};

/** L'action d'un protocole telle que l'aperçu la lit — le strict nécessaire. */
export type ActionPourApercu = Pick<ProtocolAction, 'actionId' | 'type' | 'recommendedPlateRef' | 'interventionStatus'>;

/** Les assiettes du protocole, groupées par assiette, dans l'ordre des actions. */
export function assiettesDuProtocole(
  actions: readonly ActionPourApercu[],
): { plateCode: string; actions: ActionPourApercu[] }[] {
  const groupes = new Map<string, ActionPourApercu[]>();
  for (const action of actions) {
    if (action.type !== 'food') continue;
    const plateCode = action.recommendedPlateRef?.plateCode;
    if (!plateCode) continue;
    const groupe = groupes.get(plateCode);
    if (groupe) groupe.push(action);
    else groupes.set(plateCode, [action]);
  }
  return [...groupes].map(([plateCode, groupe]) => ({ plateCode, actions: groupe }));
}

/** Une action FERME (`D-056`) : statut `active`. Seules celles-là remettent une fiche (§7). */
function estFerme(action: ActionPourApercu): boolean {
  return action.interventionStatus === 'active';
}

export const TEXTE_BLOCAGE: Record<MotifBlocage, string> = {
  dossier_non_suivi: 'Le dossier n’est pas en suivi : aucune fiche ne part.',
  contrat_refuse: 'Le protocole ne peut pas être servi au patient : aucune fiche ne part.',
  lecture_impossible:
    'Les fiches d’assiette n’ont pas pu être lues : rien n’est affirmé sur leur remise. Rechargez avant de valider.',
};

/**
 * L'aperçu, fiche par fiche, à partir des faits lus en base.
 *
 * `faits` est indexé par `sourceId`. Une fiche sans entrée est lue « aucune
 * version validée, jamais remise » — le serveur les apporte toutes ; un fait
 * manquant ne doit jamais faire partir une fiche.
 */
export function planifierApercuFiches(entrees: {
  actions: readonly ActionPourApercu[];
  blocage: BlocageFiches | null;
  faits: ReadonlyMap<string, FaitsFiche>;
  ficheDe: (plateCode: string) => string | null;
  libelleDe: (plateCode: string) => string;
}): ApercuFichesSansJeton {
  const lignes = assiettesDuProtocole(entrees.actions).map(({ plateCode, actions }): LigneApercuFiche => {
    const ferme = actions.find(estFerme);
    const sourceId = entrees.ficheDe(plateCode);
    const faits = sourceId ? entrees.faits.get(sourceId) : undefined;
    const reference = faits?.reference ?? null;
    const commun = {
      plateCode,
      libelle: entrees.libelleDe(plateCode),
      sourceId,
      actionId: (ferme ?? actions[0]).actionId,
    };
    const nePartPas = (motif: MotifFiche, detail: string, version = reference): LigneApercuFiche => ({
      ...commun,
      statut: 'ne_part_pas',
      idVersion: version?.id ?? null,
      numero: version?.numero ?? null,
      contenuSha256: version?.contenuSha256 ?? null,
      motif,
      detail,
    });

    if (entrees.blocage) return nePartPas(entrees.blocage.motif, entrees.blocage.detail, null);
    if (!sourceId) return nePartPas('sans_fiche', 'Aucune fiche n’est appariée à cette assiette.', null);
    if (!ferme) {
      return nePartPas(
        'action_non_ferme',
        'L’action qui porte cette assiette n’est pas ferme : sa fiche ne part pas.',
        null,
      );
    }
    if (!reference) {
      return nePartPas(
        'aucune_version_validee',
        'Aucune version validée : validez la fiche au rayon « Fiches conseils » de la Bibliothèque.',
        null,
      );
    }
    if (reference.nbAnomalies > 0) {
      return nePartPas(
        'controles_echoues',
        `La version ${reference.numero}, version de référence, ne passe plus les contrôles : `
          + 'elle ne part pas, et aucune version plus ancienne ne part à sa place.',
      );
    }
    const base = {
      ...commun,
      idVersion: reference.id,
      numero: reference.numero,
      contenuSha256: reference.contenuSha256,
      motif: null,
    };
    const enCours = faits?.enCours ?? null;
    if (enCours?.idVersion === reference.id) {
      return { ...base, statut: 'deja_remise', detail: `Déjà remise (version ${reference.numero}) : rien ne change.` };
    }
    return {
      ...base,
      statut: 'part',
      detail: enCours
        ? `Partira : version ${reference.numero}, qui remplace la version ${enCours.numero} remise.`
        : `Partira : version ${reference.numero}.`,
    };
  });
  return { blocage: entrees.blocage, lignes };
}

/**
 * Ce que le jeton résume : ce qui décide de la remise, et rien de ce qui n'est
 * que formulation. Changer une phrase ne périme pas un aperçu ; changer une
 * version, un statut ou une action, si.
 */
export function empreinteDeLApercu(apercu: ApercuFichesSansJeton, protocolDraftInputHash: string): unknown {
  return {
    protocolDraftInputHash,
    blocage: apercu.blocage?.motif ?? null,
    lignes: apercu.lignes.map(l => ({
      plateCode: l.plateCode,
      sourceId: l.sourceId,
      actionId: l.actionId,
      statut: l.statut,
      idVersion: l.idVersion,
      contenuSha256: l.contenuSha256,
      motif: l.motif,
    })),
  };
}

/**
 * Des fiches partiraient au clic. L'écran s'en sert pour dire qu'un nouveau
 * clic sur un protocole déjà validé les remettrait ; le bouton, lui, est offert
 * dès qu'une version relue existe.
 */
export function fichesARemettre(apercu: ApercuFichesSansJeton | null | undefined): boolean {
  return apercu?.lignes.some(l => l.statut === 'part') ?? false;
}
