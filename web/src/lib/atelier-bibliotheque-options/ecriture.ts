// L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS — LES DEUX ÉCRITURES ([[D-480]] §3,
// BP-17 PR 5). SEUL CE MODULE INSÈRE dans `bibliotheque_options_textes` et
// `bibliotheque_options_textes_actes` (garde : `ecritures.guard.test.ts`).
// Rien ne s'y réécrit : la base refuse UPDATE, DELETE et TRUNCATE ; une
// correction est une version NEUVE, un retrait un acte NEUF.
//
// VERSER : le texte d'UNE rubrique d'UNE option que la structure du jour
// déclare, sur l'empreinte de cette structure. VALIDER ou RETIRER : un acte du
// responsable sur la DERNIÈRE version d'un couple option × rubrique.
//
// LE VERROU : celui des triggers, pris d'abord par la transaction (espace 480,
// clé `bo|<option>|<rubrique>`) — le trigger le reprend. Une version et un acte
// concurrents sur le même couple passent l'un après l'autre. READ COMMITTED,
// NOMMÉ : les triggers refusent REPEATABLE READ et SERIALIZABLE ; chaque
// lecture faite après le verrou voit ce que le précédent détenteur a commis.
//
// L'ÉCRAN VOIT, LA ROUTE VÉRIFIE CE QU'IL A VU : la dernière version vue (une
// version), l'empreinte du texte et le jeton du dernier acte vus (un acte). Si
// l'un d'eux a bougé, rien n'est écrit (409).
//
// VALIDER EXIGE PLUS QUE RETIRER (patron de `fiches-usage/decision.ts`).
// Valider exige la structure SIGNÉE (`etatBibliotheque === 'signee'`), l'option
// déclarée, un texte qui accompagne la structure du jour, la relecture
// intégrale déclarée (D-195 §1 ; la base l'exige aussi). RETIRER NE CONTRÔLE
// RIEN de la structure : c'est le coupe-circuit ; il exige un motif — la base
// aussi.
//
// AUCUN TEXTE NE SORT D'ICI VERS UN JOURNAL ([[D-251]] §4). L'auteur et le
// validateur sont l'e-mail de la session ; aucun code ne les lit pour décider.

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { empreinteTexte } from '@/lib/fiches-usage/empreintes';
import { jetonDernierActe, serialiserActe, type ActeSerialise } from '@/lib/fiches-usage/etat';
import { etatDeLaRubrique, type EtatRubriqueOption } from './etat';
import { contexteDuDepot, type ContexteAtelier, type RubriqueOption } from './structure';

export type ActeOption = 'validee' | 'retiree';

const OPTIONS_TX = { isolationLevel: 'ReadCommitted' } as const;
type Tx = Prisma.TransactionClient;

async function verrouCouple(tx: Tx, optionId: string, rubrique: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(480, hashtext(${`bo|${optionId}|${rubrique}`}))`;
}

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  empreinte: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

/** La dernière version d'un couple : le plus grand `numero`. */
function derniereVersion(tx: Tx, optionId: string, rubrique: string) {
  return tx.bibliothequeOptionTexte.findFirst({
    where: { optionId, rubrique },
    orderBy: { numero: 'desc' },
    select: {
      id: true,
      numero: true,
      texteSha256: true,
      structureSha256: true,
      actes: { orderBy: { ordre: 'desc' }, select: SELECTION_ACTE },
    },
  });
}

const optionDeclaree = (contexte: ContexteAtelier, optionId: string) => contexte.options.some(o => o.id === optionId);

// ─── Verser une version ──────────────────────────────────────────────────────

export type DemandeVersion = {
  optionId: string;
  rubrique: RubriqueOption;
  /** Gardé tel quel, jamais rogné : l'empreinte porte sur le caractère. */
  texte: string;
  /** L'identifiant de la dernière version que l'écran a vue, ou `null` s'il n'en a vu aucune. */
  derniereVersionVue: string | null;
  /** L'e-mail de la session, jamais une valeur du corps. */
  auteur: string;
};

export const RAISONS_REFUS_VERSION = ['option_hors_structure', 'etat_divergent', 'texte_inchange'] as const;
export type RaisonRefusVersion = (typeof RAISONS_REFUS_VERSION)[number];

export type IssueVersion =
  | { issue: 'versee'; version: { id: string; optionId: string; rubrique: string; numero: number } }
  | { issue: 'refusee'; raison: RaisonRefusVersion };

export async function verserTexte(demande: DemandeVersion, contexte: ContexteAtelier = contexteDuDepot()): Promise<IssueVersion> {
  // La base ne sait pas que l'option existe à la structure : c'est à la route
  // (migration, « l'identifiant d'option »). Une option retirée de la
  // structure ne reçoit plus de texte.
  if (!optionDeclaree(contexte, demande.optionId)) return { issue: 'refusee', raison: 'option_hors_structure' };

  return prisma.$transaction(async (tx): Promise<IssueVersion> => {
    await verrouCouple(tx, demande.optionId, demande.rubrique);
    const derniere = await derniereVersion(tx, demande.optionId, demande.rubrique);
    if ((derniere?.id ?? null) !== demande.derniereVersionVue) return { issue: 'refusee', raison: 'etat_divergent' };

    const texteSha256 = empreinteTexte(demande.texte);
    // Même texte sur la même structure : rien de neuf à verser. Le même texte
    // sur la structure du jour, pour une version « à relire », reste admis.
    if (derniere && derniere.texteSha256 === texteSha256 && derniere.structureSha256 === contexte.empreinteStructure) {
      return { issue: 'refusee', raison: 'texte_inchange' };
    }

    const creee = await tx.bibliothequeOptionTexte.create({
      data: {
        optionId: demande.optionId,
        rubrique: demande.rubrique,
        numero: (derniere?.numero ?? 0) + 1,
        texte: demande.texte,
        // Recalculée par la base (CHECK) : les deux calculs coïncident.
        texteSha256,
        structureSha256: contexte.empreinteStructure,
        auteur: demande.auteur,
      },
      select: { id: true, optionId: true, rubrique: true, numero: true },
    });
    return { issue: 'versee', version: creee };
  }, OPTIONS_TX);
}

// ─── Poser un acte ───────────────────────────────────────────────────────────

export type DemandeActe = {
  idTexte: string;
  acte: ActeOption;
  /** L'empreinte du texte que l'écran a montré. */
  empreinteVue: string;
  /** Le jeton du dernier acte que l'écran a vu (`ordre` en chaîne), ou `null`. */
  dernierActeVu: string | null;
  /** Déclaration de relecture intégrale — exigée pour valider, et seulement `true`. */
  relectureIntegrale?: unknown;
  /** Rogné et borné par la route ; `null` s'il manque. */
  motif: string | null;
  /** L'e-mail de la session, jamais une valeur du corps. */
  validateur: string;
};

export const RAISONS_REFUS_ACTE = [
  'relecture_requise',
  'motif_requis',
  'introuvable',
  'version_depassee',
  'empreinte_divergente',
  'etat_illisible',
  'etat_divergent',
  'deja_dans_cet_etat',
  'structure_non_signee',
  'structure_a_relire',
  'option_hors_structure',
  'texte_a_relire',
] as const;
export type RaisonRefusActe = (typeof RAISONS_REFUS_ACTE)[number];

export type IssueActe =
  | { issue: 'posee'; acte: ActeSerialise; etat: EtatRubriqueOption }
  | { issue: 'refusee'; raison: RaisonRefusActe };

export async function poserActeTexte(demande: DemandeActe, contexte: ContexteAtelier = contexteDuDepot()): Promise<IssueActe> {
  if (demande.acte === 'validee' && demande.relectureIntegrale !== true) return { issue: 'refusee', raison: 'relecture_requise' };
  if (demande.acte === 'retiree' && demande.motif === null) return { issue: 'refusee', raison: 'motif_requis' };
  // La signature de la structure précède la validation du texte (porte 23,
  // patron des fiches d'usage). Saisir et retirer restent ouverts.
  // Une structure « à relire » (fiches d'usage re-signées depuis) est nommée
  // pour ce qu'elle est (DC-24).
  if (demande.acte === 'validee' && contexte.etatStructure === 'a_relire') return { issue: 'refusee', raison: 'structure_a_relire' };
  if (demande.acte === 'validee' && contexte.etatStructure !== 'signee') return { issue: 'refusee', raison: 'structure_non_signee' };

  return prisma.$transaction(async (tx): Promise<IssueActe> => {
    const cible = await tx.bibliothequeOptionTexte.findUnique({
      where: { id: demande.idTexte },
      select: { optionId: true, rubrique: true },
    });
    if (!cible) return { issue: 'refusee', raison: 'introuvable' };

    await verrouCouple(tx, cible.optionId, cible.rubrique);
    // Relue SOUS le verrou : la dernière version du couple, seule à recevoir un acte.
    const derniere = await derniereVersion(tx, cible.optionId, cible.rubrique);
    if (!derniere || derniere.id !== demande.idTexte) return { issue: 'refusee', raison: 'version_depassee' };
    if (derniere.texteSha256 !== demande.empreinteVue) return { issue: 'refusee', raison: 'empreinte_divergente' };

    const declaree = optionDeclaree(contexte, cible.optionId);
    const etat = etatDeLaRubrique(derniere, { empreinteStructure: contexte.empreinteStructure, optionDeclaree: declaree });
    if (etat.etat === 'illisible') return { issue: 'refusee', raison: 'etat_illisible' };
    if (jetonDernierActe(derniere.actes) !== demande.dernierActeVu) return { issue: 'refusee', raison: 'etat_divergent' };

    if (demande.acte === 'validee') {
      if (!declaree) return { issue: 'refusee', raison: 'option_hors_structure' };
      if (etat.etat === 'a_relire') return { issue: 'refusee', raison: 'texte_a_relire' };
      if (etat.etat === 'validee') return { issue: 'refusee', raison: 'deja_dans_cet_etat' };
    } else {
      // L'état des SEULS actes : un texte « à relire » ou hors structure déjà
      // retiré n'a pas à l'être deux fois.
      const dernierActe = derniere.actes[0] ?? null;
      if (dernierActe?.acte === 'retiree') return { issue: 'refusee', raison: 'deja_dans_cet_etat' };
    }

    const cree = await tx.bibliothequeOptionTexteActe.create({
      data: {
        idTexte: demande.idTexte,
        acte: demande.acte,
        // Recopiée du texte, et vérifiée égale par trigger : l'acte porte sur CE texte-là.
        empreinte: derniere.texteSha256,
        validateur: demande.validateur,
        relectureIntegrale: demande.acte === 'validee',
        motif: demande.acte === 'retiree' ? demande.motif : null,
      },
      select: SELECTION_ACTE,
    });
    return {
      issue: 'posee',
      acte: serialiserActe(cree),
      etat: etatDeLaRubrique(
        { ...derniere, actes: [cree, ...derniere.actes] },
        { empreinteStructure: contexte.empreinteStructure, optionDeclaree: declaree },
      ),
    };
  }, OPTIONS_TX);
}
