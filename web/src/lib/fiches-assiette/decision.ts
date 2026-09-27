// L'ACTE DU RESPONSABLE SUR UNE VERSION DE FICHE D'ASSIETTE ([[D-251]] §5 à
// §7, lot 6) : la valider, ou la retirer.
//
// SEUL CE MODULE CRÉE UN ACTE (garde : `catalogue.guard.test.ts`). Il n'importe
// pas la voie de dépôt, et elle ne l'importe pas : « jamais le même statut,
// jamais le même chemin » (`DC-16`). Ce qu'ils partagent — les contrôles — vit
// dans `controle.ts`.
//
// UN ACTE PORTE SUR UN ÉTAT VU À L'ÉCRAN. L'écran renvoie l'empreinte du
// contenu qu'il a montré et le jeton du dernier acte qu'il a vu (`ordre`). Sous
// un verrou par fiche, la décision relit l'un et l'autre : s'ils ont bougé
// (autre onglet, rejeu), rien n'est écrit — jamais d'acte posé sur un texte ou
// un état que personne n'a vu.
//
// VALIDER REJOUE TOUT (§6, « contrôlée à la validation ») : le contrat sur le
// JSON rangé, l'empreinte, l'appariement, les claims VALIDE et `controlerFiche`
// avec les réserves de sécurité du moment. La relecture intégrale est déclarée
// (D-195 §1) — la base l'exige aussi, par CHECK.
//
// RETIRER NE CONTRÔLE RIEN : c'est le coupe-circuit de la lecture (§7), il doit
// rester un geste rapide. Il exige un motif — la base aussi.
//
// AUCUN TEXTE NE SORT D'ICI VERS UN JOURNAL ([[D-251]] §4).

import { prisma } from '@/lib/prisma';
import { controlerVersion, type AnomalieVersion } from './controle';
import {
  etatDeLaVersion,
  jetonDernierActe,
  serialiserActe,
  type ActeFiche,
  type ActeSerialise,
  type EtatVersion,
} from './etat';

/**
 * CHIFFRE TECHNIQUE, PAS UN SEUIL (`DC-20`) : la longueur d'un motif de
 * retrait, contre un dépôt démesuré. Un motif tient en quelques phrases.
 */
export const MOTIF_MAX = 2_000;

export type DemandeActe = {
  idVersion: string;
  acte: ActeFiche;
  /** L'empreinte du contenu que l'écran a montré. */
  contenuSha256Vu: string;
  /** Le jeton du dernier acte que l'écran a vu (`ordre` en chaîne), ou `null`. */
  dernierActeVu: string | null;
  /** Déclaration de relecture intégrale — exigée pour valider, et seulement `true`. */
  relectureIntegrale?: unknown;
  motif?: string;
  /** L'e-mail de la session, jamais une valeur du corps de la requête. */
  validateur: string;
};

export type RaisonRefusActe =
  | 'relecture_requise'
  | 'motif_requis'
  | 'version_introuvable'
  | 'empreinte_divergente'
  | 'etat_illisible'
  | 'etat_divergent'
  | 'deja_dans_cet_etat'
  | 'version_depassee'
  | 'controle';

export type IssueActe =
  | { issue: 'posee'; acte: ActeSerialise; etat: EtatVersion }
  | { issue: 'refusee'; raison: Exclude<RaisonRefusActe, 'controle'> }
  | { issue: 'refusee'; raison: 'controle'; anomalies: AnomalieVersion[] };

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  contenuSha256: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

export async function poserActeFiche(demande: DemandeActe): Promise<IssueActe> {
  // Les refus qui ne demandent aucune lecture, d'abord.
  if (demande.acte === 'validee' && demande.relectureIntegrale !== true) {
    return { issue: 'refusee', raison: 'relecture_requise' };
  }
  const motif = demande.acte === 'retiree' ? (demande.motif ?? '').trim() : null;
  if (demande.acte === 'retiree' && (!motif || !/\S/u.test(motif) || motif.length > MOTIF_MAX)) {
    return { issue: 'refusee', raison: 'motif_requis' };
  }

  return prisma.$transaction(async (tx): Promise<IssueActe> => {
    const version = await tx.ficheAssietteVersion.findUnique({
      where: { id: demande.idVersion },
      select: { sourceId: true },
    });
    if (!version) return { issue: 'refusee', raison: 'version_introuvable' };

    // UN VERROU PAR FICHE, pris avant toute lecture d'état : deux gestes sur la
    // même fiche — deux onglets, ou la validation de deux versions — passent
    // l'un après l'autre. Relâché au COMMIT.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_assiette_actes:${version.sourceId}`}))`;

    const courante = await tx.ficheAssietteVersion.findUnique({
      where: { id: demande.idVersion },
      select: {
        sourceId: true,
        plateCode: true,
        numero: true,
        contenu: true,
        contenuSha256: true,
        texteSource: true,
        actes: { orderBy: { ordre: 'desc' }, select: SELECTION_ACTE },
      },
    });
    if (!courante) return { issue: 'refusee', raison: 'version_introuvable' };
    if (courante.contenuSha256 !== demande.contenuSha256Vu) return { issue: 'refusee', raison: 'empreinte_divergente' };

    const etat = etatDeLaVersion(courante, courante.actes);
    if (etat.etat === 'illisible') return { issue: 'refusee', raison: 'etat_illisible' };
    if (jetonDernierActe(courante.actes) !== demande.dernierActeVu) return { issue: 'refusee', raison: 'etat_divergent' };
    if (etat.etat === demande.acte) return { issue: 'refusee', raison: 'deja_dans_cet_etat' };

    if (demande.acte === 'validee') {
      // La version servie est la plus récente validée : valider une version plus
      // ancienne qu'une version validée serait un geste sans effet, et trompeur.
      const plusRecentes = await tx.ficheAssietteVersion.findMany({
        where: { sourceId: courante.sourceId, numero: { gt: courante.numero } },
        select: { contenuSha256: true, actes: { orderBy: { ordre: 'desc' }, take: 1, select: SELECTION_ACTE } },
      });
      if (plusRecentes.some(v => etatDeLaVersion(v, v.actes).etat === 'validee')) {
        return { issue: 'refusee', raison: 'version_depassee' };
      }
      const controle = await controlerVersion(courante, tx);
      if (controle.anomalies.length > 0) return { issue: 'refusee', raison: 'controle', anomalies: controle.anomalies };
    }

    const cree = await tx.ficheAssietteActe.create({
      data: {
        idVersion: demande.idVersion,
        acte: demande.acte,
        // Recopiée de la version, et revérifiée égale par trigger : l'acte porte
        // sur CE texte-là.
        contenuSha256: courante.contenuSha256,
        validateur: demande.validateur,
        relectureIntegrale: demande.acte === 'validee',
        motif,
      },
      select: SELECTION_ACTE,
    });
    return { issue: 'posee', acte: serialiserActe(cree), etat: etatDeLaVersion(courante, [...courante.actes, cree]) };
  });
}
