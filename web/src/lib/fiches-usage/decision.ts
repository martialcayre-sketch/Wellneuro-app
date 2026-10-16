// L'ACTE DU RESPONSABLE SUR LE TEXTE DES FICHES D'USAGE ([[D-314]] §3, §5, §8) :
// valider ou retirer UNE rubrique d'une version (arbitrage 5), ou UN libellé du
// vocabulaire (arbitrages 3, 12).
//
// SEUL CE MODULE CRÉE UN ACTE (garde : `ecritures.guard.test.ts`). Il n'importe
// pas la voie de dépôt, et elle ne l'importe pas : « jamais le même statut,
// jamais le même chemin » (`DC-16`). Ce qu'ils partagent — le contrôle contre
// la structure — vit dans `controle.ts`.
//
// UN ACTE PORTE SUR UN ÉTAT VU À L'ÉCRAN. L'écran renvoie l'empreinte du texte
// qu'il a montré et le jeton du dernier acte qu'il a vu. Sous un verrou par
// fiche (par terme), la décision relit l'un et l'autre : s'ils ont bougé, rien
// n'est écrit — jamais d'acte posé sur un texte ou un état que personne n'a vu.
//
// VALIDER EXIGE PLUS QUE RETIRER. Valider exige la structure SIGNÉE (la
// signature de l'usage précède la validation du texte, porte 23), un texte qui
// rédige la structure du jour avec exactement ses rubriques, le contrat rejoué
// sur le JSON rangé, la relecture intégrale déclarée (D-195 §1, la base l'exige
// aussi), et aucune version (libellé) plus récente déjà validée. RETIRER NE
// CONTRÔLE RIEN, pas même le contrat : c'est le coupe-circuit, il doit rester
// un geste rapide ; il exige un motif — la base aussi.
//
// AUCUN TEXTE NE SORT D'ICI VERS UN JOURNAL ([[D-251]] §4).

import { prisma } from '@/lib/prisma';
import { ErreurContratFicheUsage, lireContenuFicheUsage } from './contrat';
import {
  CONTEXTE_DU_DEPOT,
  controlerLibelleContreStructure,
  controlerVersionContreStructure,
  rubriquesAttendues,
  type AnomalieStructure,
  type ContexteControle,
} from './controle';
import { empreinteTexte, rubriquesLues } from './empreintes';
import {
  etatDeLaVersion,
  etatDuLibelle,
  etatDuTexte,
  jetonDernierActe,
  serialiserActe,
  type ActeSerialise,
  type EtatTexte,
} from './etat';
import { structureSignee } from './ficheUsageBesoin2V1';
import { estRubriqueFicheUsage, MOTIF_MAX, type ActeFicheUsage } from './vocabulaire';

export type ContexteDecision = { controle: ContexteControle; signee: boolean };

/** La structure du dépôt, et sa signature du jour. */
export function contexteDuDepot(): ContexteDecision {
  return { controle: CONTEXTE_DU_DEPOT, signee: structureSignee() };
}

type CommunDemande = {
  acte: ActeFicheUsage;
  /** L'empreinte du texte que l'écran a montré. */
  empreinteVue: string;
  /** Le jeton du dernier acte que l'écran a vu (`ordre` en chaîne), ou `null`. */
  dernierActeVu: string | null;
  /** Déclaration de relecture intégrale — exigée pour valider, et seulement `true`. */
  relectureIntegrale?: unknown;
  motif?: string;
  /** L'e-mail de la session, jamais une valeur du corps de la requête. */
  validateur: string;
};

export type DemandeActeRubrique = CommunDemande & { idVersion: string; rubrique: string };
export type DemandeActeLibelle = CommunDemande & { idLibelle: string };

export type RaisonRefusActe =
  | 'relecture_requise'
  | 'motif_requis'
  | 'rubrique_inconnue'
  | 'introuvable'
  | 'rubrique_absente'
  | 'contenu_illisible'
  | 'empreinte_divergente'
  | 'etat_illisible'
  | 'etat_divergent'
  | 'deja_dans_cet_etat'
  | 'structure_non_signee'
  | 'version_depassee'
  | 'structure';

export type IssueActe =
  | { issue: 'posee'; acte: ActeSerialise; etat: EtatTexte }
  | { issue: 'refusee'; raison: Exclude<RaisonRefusActe, 'structure'> }
  | { issue: 'refusee'; raison: 'structure'; anomalies: AnomalieStructure[] };

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  empreinte: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

/** Les refus qui ne demandent aucune lecture. `null` si la demande peut aller en base. */
function refusPrealable(demande: CommunDemande): { raison: 'relecture_requise' | 'motif_requis' } | null {
  if (demande.acte === 'validee' && demande.relectureIntegrale !== true) return { raison: 'relecture_requise' };
  if (demande.acte === 'retiree') {
    const motif = (demande.motif ?? '').trim();
    if (!motif || !/\S/u.test(motif) || motif.length > MOTIF_MAX) return { raison: 'motif_requis' };
  }
  return null;
}

function motifDe(demande: CommunDemande): string | null {
  return demande.acte === 'retiree' ? (demande.motif ?? '').trim() : null;
}

export async function poserActeRubrique(
  demande: DemandeActeRubrique,
  contexte: ContexteDecision = contexteDuDepot(),
): Promise<IssueActe> {
  const prealable = refusPrealable(demande);
  if (prealable) return { issue: 'refusee', raison: prealable.raison };
  const rubrique = demande.rubrique;
  if (!estRubriqueFicheUsage(rubrique)) return { issue: 'refusee', raison: 'rubrique_inconnue' };
  if (demande.acte === 'validee' && !contexte.signee) return { issue: 'refusee', raison: 'structure_non_signee' };

  return prisma.$transaction(async (tx): Promise<IssueActe> => {
    const version = await tx.ficheUsageVersion.findUnique({ where: { id: demande.idVersion }, select: { ficheId: true } });
    if (!version) return { issue: 'refusee', raison: 'introuvable' };

    // UN VERROU PAR FICHE, pris avant toute lecture d'état : deux gestes sur la
    // même fiche — deux onglets, deux rubriques, deux versions — passent l'un
    // après l'autre. Relâché au COMMIT.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_usage_actes:${version.ficheId}`}))`;

    const courante = await tx.ficheUsageVersion.findUnique({
      where: { id: demande.idVersion },
      select: {
        ficheId: true,
        numero: true,
        contenu: true,
        structureSha256: true,
        actes: { where: { rubrique: demande.rubrique }, orderBy: { ordre: 'desc' }, select: SELECTION_ACTE },
      },
    });
    if (!courante) return { issue: 'refusee', raison: 'introuvable' };

    // VALIDER : LE CONTRAT REJOUÉ sur le JSON rangé — ce qui n'a pas été écrit
    // par lui ne se relit pas comme s'il l'avait été. RETIRER : le texte brut,
    // celui dont la base calcule l'empreinte ; un contrat resserré depuis le
    // dépôt ne doit pas rendre un texte validé impossible à retirer (revue).
    let texte: string | undefined;
    let contenu: Record<string, unknown> = {};
    if (demande.acte === 'validee') {
      try {
        const lu = lireContenuFicheUsage(courante.contenu);
        contenu = lu;
        texte = lu[rubrique];
      } catch (error) {
        if (error instanceof ErreurContratFicheUsage) return { issue: 'refusee', raison: 'contenu_illisible' };
        throw error;
      }
    } else {
      const brut = courante.contenu;
      if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return { issue: 'refusee', raison: 'contenu_illisible' };
      const valeur = (brut as Record<string, unknown>)[rubrique];
      texte = typeof valeur === 'string' ? valeur : undefined;
    }
    if (texte === undefined) return { issue: 'refusee', raison: 'rubrique_absente' };
    const empreinte = empreinteTexte(texte);
    if (empreinte !== demande.empreinteVue) return { issue: 'refusee', raison: 'empreinte_divergente' };

    const etat = etatDuTexte(empreinte, courante.actes);
    if (etat.etat === 'illisible') return { issue: 'refusee', raison: 'etat_illisible' };
    if (jetonDernierActe(courante.actes) !== demande.dernierActeVu) return { issue: 'refusee', raison: 'etat_divergent' };
    if (etat.etat === demande.acte) return { issue: 'refusee', raison: 'deja_dans_cet_etat' };

    if (demande.acte === 'validee') {
      const anomalies = controlerVersionContreStructure(
        { ficheId: courante.ficheId, rubriques: Object.keys(contenu), structureSha256: courante.structureSha256 },
        contexte.controle,
      );
      if (anomalies.length > 0) return { issue: 'refusee', raison: 'structure', anomalies };

      // La version lue est la plus récente validée : valider une rubrique d'une
      // version plus ancienne qu'une version validée serait sans effet, et
      // trompeur.
      const plusRecentes = await tx.ficheUsageVersion.findMany({
        where: { ficheId: courante.ficheId, numero: { gt: courante.numero } },
        select: { contenu: true, structureSha256: true, actes: { select: { ...SELECTION_ACTE, rubrique: true } } },
      });
      const attendues = rubriquesAttendues(courante.ficheId, contexte.controle);
      const depassee = plusRecentes.some(
        v =>
          etatDeLaVersion(
            { structureSha256: v.structureSha256, rubriques: rubriquesLues(v.contenu, v.actes) },
            { empreinteStructure: contexte.controle.empreinte, rubriquesAttendues: attendues },
          ).etat === 'validee',
      );
      if (depassee) return { issue: 'refusee', raison: 'version_depassee' };
    }

    const cree = await tx.ficheUsageActe.create({
      data: {
        idVersion: demande.idVersion,
        rubrique: demande.rubrique,
        acte: demande.acte,
        // Recalculée ici, et recalculée encore par trigger : l'acte porte sur CE
        // texte-là.
        empreinte,
        validateur: demande.validateur,
        relectureIntegrale: demande.acte === 'validee',
        motif: motifDe(demande),
      },
      select: SELECTION_ACTE,
    });
    return { issue: 'posee', acte: serialiserActe(cree), etat: etatDuTexte(empreinte, [...courante.actes, cree]) };
  });
}

export async function poserActeLibelle(
  demande: DemandeActeLibelle,
  contexte: ContexteDecision = contexteDuDepot(),
): Promise<IssueActe> {
  const prealable = refusPrealable(demande);
  if (prealable) return { issue: 'refusee', raison: prealable.raison };
  if (demande.acte === 'validee' && !contexte.signee) return { issue: 'refusee', raison: 'structure_non_signee' };

  return prisma.$transaction(async (tx): Promise<IssueActe> => {
    const libelle = await tx.ficheUsageLibelle.findUnique({ where: { id: demande.idLibelle }, select: { termeId: true } });
    if (!libelle) return { issue: 'refusee', raison: 'introuvable' };

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_usage_libelles_actes:${libelle.termeId}`}))`;

    const courant = await tx.ficheUsageLibelle.findUnique({
      where: { id: demande.idLibelle },
      select: {
        termeId: true,
        nature: true,
        numero: true,
        libelleSha256: true,
        structureSha256: true,
        actes: { orderBy: { ordre: 'desc' }, select: SELECTION_ACTE },
      },
    });
    if (!courant) return { issue: 'refusee', raison: 'introuvable' };
    if (courant.libelleSha256 !== demande.empreinteVue) return { issue: 'refusee', raison: 'empreinte_divergente' };

    const etat = etatDuTexte(courant.libelleSha256, courant.actes);
    if (etat.etat === 'illisible') return { issue: 'refusee', raison: 'etat_illisible' };
    if (jetonDernierActe(courant.actes) !== demande.dernierActeVu) return { issue: 'refusee', raison: 'etat_divergent' };
    if (etat.etat === demande.acte) return { issue: 'refusee', raison: 'deja_dans_cet_etat' };

    if (demande.acte === 'validee') {
      const anomalies = controlerLibelleContreStructure(courant, contexte.controle);
      if (anomalies.length > 0) return { issue: 'refusee', raison: 'structure', anomalies };

      const plusRecents = await tx.ficheUsageLibelle.findMany({
        where: { termeId: courant.termeId, numero: { gt: courant.numero } },
        select: { libelleSha256: true, structureSha256: true, actes: { select: SELECTION_ACTE } },
      });
      const depasse = plusRecents.some(
        l =>
          etatDuLibelle(l, l.actes, { empreinteStructure: contexte.controle.empreinte, termeDeclare: true }).etat === 'validee',
      );
      if (depasse) return { issue: 'refusee', raison: 'version_depassee' };
    }

    const cree = await tx.ficheUsageLibelleActe.create({
      data: {
        idLibelle: demande.idLibelle,
        acte: demande.acte,
        empreinte: courant.libelleSha256,
        validateur: demande.validateur,
        relectureIntegrale: demande.acte === 'validee',
        motif: motifDe(demande),
      },
      select: SELECTION_ACTE,
    });
    return { issue: 'posee', acte: serialiserActe(cree), etat: etatDuTexte(courant.libelleSha256, [...courant.actes, cree]) };
  });
}
