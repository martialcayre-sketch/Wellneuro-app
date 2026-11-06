import type { ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';
import { empreinteEntreeConflit, fichesCurees } from './registreConflits';
import type { ActePosition, CauseARelire } from './vocabulaire';

// LES ÉTATS DÉRIVÉS À LA LECTURE (D-439 §2, §3, A3) : jamais écrits, recalculés
// à chaque lecture depuis les lignes en ajout seul et le registre du jour.
//
// — Une version se lit par son DERNIER ACTE au sens d'`ordre` : aucun acte =
//   brouillon, `signee`, `retiree`. Un acte hors de la liste fermée rend
//   l'état illisible : on ne décide rien sur un état qu'on ne sait pas lire.
// — Une position est EN VIGUEUR si sa version courante est signée.
// — Elle est « À RELIRE » si un de ses claims d'appui n'est plus frais au
//   corpus : remplacé, rejeté, supplanté ou ABSENT. Un claim absent n'est
//   jamais présumé frais (`DC-24`).
// — Une tête d'arbitrage est « À RELIRE » dans les cinq cas d'A3, qui en font
//   six puisque le troisième en compte deux.

export type EtatVersion = 'brouillon' | 'signee' | 'retiree' | 'illisible';

export type ActeLu = { ordre: bigint | string; acte: string };

const cle = (o: bigint | string) => BigInt(o);

/** Le dernier acte au sens d'`ordre`, jamais de `le`. */
export function dernierActe<A extends ActeLu>(actes: readonly A[]): A | null {
  let dernier: A | null = null;
  for (const a of actes) if (dernier === null || cle(a.ordre) > cle(dernier.ordre)) dernier = a;
  return dernier;
}

/** Le jeton du dernier acte vu (`ordre` en chaîne), ou `null`. */
export function jetonDernierActe(actes: readonly ActeLu[]): string | null {
  const d = dernierActe(actes);
  return d === null ? null : String(d.ordre);
}

export function etatVersion(actes: readonly ActeLu[]): EtatVersion {
  const d = dernierActe(actes);
  if (d === null) return 'brouillon';
  if (d.acte === 'signee' || d.acte === 'retiree') return d.acte;
  return 'illisible';
}

export type RefusAlternance = 'deja_signee' | 'jamais_signee' | 'deja_retiree' | 'etat_illisible';

/**
 * Les actes alternent (arbitrage du responsable du 2026-11-06, question 1) : on
 * ne signe qu'une version non signée ou retirée, on ne retire qu'une version
 * signée. Un `signee` répété, qui déplacerait la date de signature, et un
 * `retiree` sur une version jamais signée sont refusés, alors que la base les
 * accepte.
 */
export function refusAlternance(etat: EtatVersion, acte: ActePosition): RefusAlternance | null {
  if (etat === 'illisible') return 'etat_illisible';
  if (acte === 'signee') return etat === 'signee' ? 'deja_signee' : null;
  if (etat === 'brouillon') return 'jamais_signee';
  return etat === 'retiree' ? 'deja_retiree' : null;
}

/** Les claims d'appui qui ne sont pas dans l'ensemble des claims frais. */
export function appuisNonFrais(appuis: readonly string[], frais: ReadonlySet<string>): string[] {
  return appuis.filter(a => !frais.has(a));
}

export type { CauseARelire };

export type TeteArbitrageLue = {
  conflitId: string;
  ficheId: string;
  claimRetenu: string | null;
  idPositionVersion: string | null;
  conflitSha256: string | null;
};

/** Ce que la lecture sait de la version retenue par une tête. */
export type VersionRetenueLue = {
  courante: boolean;
  etat: EtatVersion;
  appuisNonFrais: readonly string[];
};

export type ContexteARelire = {
  /** L'entrée publiée du conflit, ou `null`. */
  entree: ConflitSourcesDeclare | null;
  structureSignee: boolean;
  fichesDeLaStructure: ReadonlySet<string>;
  /** `null` : la version retenue est introuvable — elle ne l'est jamais, la clé étrangère la tient. */
  versionRetenue: VersionRetenueLue | null;
  claimsFrais: ReadonlySet<string>;
};

/** Les causes qui rendent une tête « à relire » (A3). Vide = courante. */
export function causesARelire(tete: TeteArbitrageLue, ctx: ContexteARelire): CauseARelire[] {
  const causes: CauseARelire[] = [];
  if (ctx.entree === null || tete.conflitSha256 !== empreinteEntreeConflit(ctx.entree)) {
    causes.push('conflit_modifie_ou_depublie');
  }
  if (
    !ctx.structureSignee
    || !ctx.fichesDeLaStructure.has(tete.ficheId)
    || ctx.entree === null
    || !fichesCurees(ctx.entree).includes(tete.ficheId)
  ) {
    causes.push('fiche_hors_structure_ou_liste');
  }
  if (tete.idPositionVersion !== null) {
    const v = ctx.versionRetenue;
    if (v === null || !v.courante) causes.push('position_remplacee');
    if (v === null || v.etat !== 'signee') causes.push('position_retiree');
    if (v === null || v.appuisNonFrais.length > 0) causes.push('position_a_relire');
  }
  if (tete.claimRetenu !== null && !ctx.claimsFrais.has(tete.claimRetenu)) causes.push('claim_non_frais');
  return causes;
}
