// Signature des correspondances analyte ↔ acte NABM (M-3, F54) — PRATICIEN
// SEUL. C'est LE véhicule d'écriture de `biology_analyte_nabm`, arrêté par le
// responsable le 2026-10-15 : un écran praticien plutôt qu'une migration de
// données (qui aurait coûté une release-db à chaque lot et l'adresse du
// signataire au dépôt public).
//
// Patron de la route de décision des claims (`lib/rag/claims/revue.ts`) :
//  - la signature (`verifie_par`) est l'e-mail de session, la date
//    (`verifie_le`) est posée par la base (M-3c) — jamais reçues du client ;
//  - la décision est prise SUR un état vu à l'écran (`etatAttendu`). S'il a
//    bougé entre-temps (autre onglet, replay), rien n'est écrit et l'appelant
//    reçoit `etat_divergent` — jamais d'écrasement silencieux ;
//  - le retrait rend la ligne à l'état de proposition (signature effacée),
//    comme l'annulation d'un claim : il ne supprime rien.
//
// L'acte se cherche par son CODE, dans le millésime COURANT, et seulement
// ainsi : l'écran ne cherche rien par libellé. Les candidats proposés à la
// signature viennent d'une liste relue, versée au code (`candidatsNabm.ts`,
// M-3b — arbitrage du 2026-10-15, qui amende celui du 2026-10-05) ; ils
// passent par la même signature. Une signature ne se pose que sur un code qui se résout, actif,
// dans ce millésime — le contrat SQL `cb_biologie_catalogue_v1.sql` refuse
// une correspondance signée qui ne s'y résout pas.
//
// Depuis M-3c (PR 2), chaque geste s'écrit avec sa ligne de journal
// (`biology_analyte_nabm_journal`, en ajout seul) dans UNE transaction : la
// base refuse au COMMIT toute signature, tout retrait, tout constat sans elle
// (migration `20261016100000_nabm_journal_constats_v1`). Le constat signé
// « aucun acte dans la nomenclature » (`biology_analyte_nabm_constats`) se pose
// et se retire ici aussi ; signature et constat s'excluent, retrait d'abord.
// Chaque transaction prend, avant toute lecture :
//  - un verrou de partage sur `biology_catalog_versions_courantes`, que
//    l'import NABM (`prisma/importNabm.ts`, SHARE ROW EXCLUSIVE) attend et
//    fait attendre : un geste lit le millésime d'avant l'import ou d'après,
//    jamais un millésime remplacé sous lui, et le contrôle des signatures
//    orphelines de l'import voit toute signature commise PAR CE MODULE
//    (réserve R2 de M-3) — une écriture SQL hors de lui ne prend pas ce
//    verrou ; l'attente est bornée à 3 s, au-delà : `import_en_cours` ;
//  - le verrou consultatif de l'analyte (fonction de la migration, celui que
//    prennent les triggers d'exclusion), pour que les refus « constat présent »
//    et « signature présente » se lisent ici, en raisons, plutôt qu'en erreur
//    de la base.
// Les dates (signature, constat) sont posées par la base et RELUES avant
// d'être rendues : le retrait désigne la signature vue par cette date.
//
// Ce fichier n'écrit pas la dérivation du remboursement : elle reste, une
// seule fois, dans `remboursable.ts`.
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { MILLESIME_LISTE_NABM, candidatsNabmPour, type SituationNabm } from './candidatsNabm';
import { constatValable } from './remboursable';

/** Pointeur de millésime de la nomenclature (même clé que `catalogue.ts`). */
const SOURCE_NABM = 'nabm_smt_ans';

export const CODE_ACTE_RE = /^[0-9]{4}$/;
export const CODE_ANALYTE_RE = /^[A-Z0-9_]{1,64}$/;

/** Les trois natures du CHECK `biology_analyte_nabm_nature_check`. */
export const NATURES_NABM = ['isole', 'groupe_et', 'groupe_ou'] as const;
export type NatureNabm = (typeof NATURES_NABM)[number];

export function estNatureNabm(valeur: string): valeur is NatureNabm {
  return (NATURES_NABM as readonly string[]).includes(valeur);
}

/** État d'un couple (analyte, acte) tel que l'écran l'a vu. */
export const ETATS_CORRESPONDANCE = ['absente', 'proposition', 'signee'] as const;
export type EtatCorrespondance = (typeof ETATS_CORRESPONDANCE)[number];

export function estEtatCorrespondance(valeur: string): valeur is EtatCorrespondance {
  return (ETATS_CORRESPONDANCE as readonly string[]).includes(valeur);
}

/** Un acte du millésime courant, tel que l'écran le présente. Jamais d'euros :
 *  la source ne porte que le coefficient de la lettre-clé. */
export type ActeNabmAffiche = {
  codeActe: string;
  libelle: string;
  coefficientB: number | null;
  inactif: boolean;
  ententePrealable: boolean | null;
  acteReserve: boolean | null;
  remboursementTotal: boolean | null;
};

export type CorrespondanceAffichee = {
  codeActe: string;
  nature: string;
  etat: Exclude<EtatCorrespondance, 'absente'>;
  verifiePar: string | null;
  verifieLe: string | null;
  /** L'acte résolu dans le millésime courant ; `null` s'il ne s'y trouve pas. */
  acte: ActeNabmAffiche | null;
};

const SELECT_ACTE = {
  codeActe: true,
  libelle: true,
  coefficientB: true,
  inactif: true,
  ententePrealable: true,
  acteReserve: true,
  remboursementTotal: true,
} as const;

async function millesimeCourant(client: Prisma.TransactionClient = prisma): Promise<string | null> {
  const pointeur = await client.biologyCatalogVersionCourante.findUnique({
    where: { sourceProvenance: SOURCE_NABM },
    select: { versionSource: true },
  });
  return pointeur?.versionSource ?? null;
}

export type ChercherActeResultat =
  | { ok: true; millesime: string; acte: ActeNabmAffiche | null }
  | { ok: false; raison: 'code_invalide' | 'millesime_absent' };

/** Lit un acte par son code exact, dans le millésime courant. */
export async function chercherActeNabm(codeActe: string): Promise<ChercherActeResultat> {
  if (!CODE_ACTE_RE.test(codeActe)) return { ok: false, raison: 'code_invalide' };
  const millesime = await millesimeCourant();
  if (!millesime) return { ok: false, raison: 'millesime_absent' };
  const acte = await prisma.biologyNabmActe.findUnique({
    where: { codeActe_versionSource: { codeActe, versionSource: millesime } },
    select: SELECT_ACTE,
  });
  return { ok: true, millesime, acte };
}

/** Un candidat de la liste préparée (M-3b), résolu au millésime courant —
 *  une proposition à l'écran, jamais une ligne en base. */
export type PropositionNabmAffichee = {
  codeActe: string;
  nature: NatureNabm;
  motif: string;
  acte: ActeNabmAffiche;
};

/** La situation de l'analyte dans la liste préparée, et ses candidats encore
 *  à signer. `propositions` ne garde que les candidats présents et actifs au
 *  millésime courant, et dont le couple n'a aucune ligne en base (ni signée,
 *  ni proposition déjà listée). */
export type CandidatsNabmAffiches = {
  millesimeListe: string;
  situation: SituationNabm;
  /** Pourquoi rien n'est à signer (aucun acte, valeur calculée, regroupement). */
  motif: string | null;
  propositions: PropositionNabmAffichee[];
};

export type LireCorrespondancesResultat =
  | {
      ok: true;
      millesime: string | null;
      correspondances: CorrespondanceAffichee[];
      /** `null` : l'analyte n'est pas dans la liste préparée. */
      candidats: CandidatsNabmAffiches | null;
      /** Le constat « aucun acte » de l'analyte (M-3c), périmé compris. */
      constat: ConstatAffiche | null;
    }
  | { ok: false; raison: 'analyte_inconnu' };

/** Les correspondances d'un analyte — signées ET propositions — avec leur
 *  acte résolu au millésime courant. */
export async function lireCorrespondancesAnalyte(
  analyteCode: string,
): Promise<LireCorrespondancesResultat> {
  const analyte = await prisma.biologyAnalyte.findUnique({
    where: { code: analyteCode },
    select: {
      code: true,
      actif: true,
      correspondancesNabm: {
        select: { codeActe: true, nature: true, verifiePar: true, verifieLe: true },
        orderBy: { codeActe: 'asc' },
      },
      constatNabm: { select: { millesime: true, verifiePar: true, verifieLe: true } },
    },
  });
  if (!analyte) return { ok: false, raison: 'analyte_inconnu' };

  const millesime = await millesimeCourant();
  const liste = candidatsNabmPour(analyte.code);
  // Un candidat dont le couple a déjà une ligne (signée ou proposition) n'est
  // pas reproposé : la ligne existante porte seule son geste. Un analyte
  // inactif n'en reçoit aucun : sa signature serait refusée (`analyte_inactif`).
  const dejaEnBase = new Set(analyte.correspondancesNabm.map(c => c.codeActe));
  const aProposer =
    analyte.actif && liste && 'candidats' in liste ? liste.candidats.filter(c => !dejaEnBase.has(c.codeActe)) : [];
  const codes = [...dejaEnBase, ...aProposer.map(c => c.codeActe)];
  const actes =
    millesime && codes.length > 0
      ? await prisma.biologyNabmActe.findMany({
          where: { versionSource: millesime, codeActe: { in: codes } },
          select: SELECT_ACTE,
        })
      : [];
  const parCode = new Map(actes.map(a => [a.codeActe, a]));

  const candidats: CandidatsNabmAffiches | null = liste && {
    millesimeListe: MILLESIME_LISTE_NABM,
    situation: liste.situation,
    motif: 'motif' in liste ? liste.motif : null,
    // Absent ou inactif au millésime courant : rien à proposer.
    propositions: aProposer.flatMap(c => {
      const acte = parCode.get(c.codeActe);
      return acte && !acte.inactif ? [{ codeActe: c.codeActe, nature: c.nature, motif: c.motif, acte }] : [];
    }),
  };

  const constat = analyte.constatNabm;
  return {
    ok: true,
    millesime,
    candidats,
    constat: constat
      ? {
          millesime: constat.millesime,
          verifiePar: constat.verifiePar,
          verifieLe: constat.verifieLe.toISOString(),
          // La règle de la dérivation, lue au même endroit (`remboursable.ts`).
          perime: !constatValable(constat, millesime),
        }
      : null,
    correspondances: analyte.correspondancesNabm.map(c => ({
      codeActe: c.codeActe,
      nature: c.nature,
      etat: c.verifiePar !== null ? 'signee' : 'proposition',
      verifiePar: c.verifiePar,
      verifieLe: c.verifieLe ? c.verifieLe.toISOString() : null,
      acte: parCode.get(c.codeActe) ?? null,
    })),
  };
}

export type RaisonRefusCorrespondance =
  | 'transition_invalide'
  | 'nature_requise'
  | 'analyte_inconnu'
  | 'analyte_inactif'
  | 'millesime_absent'
  | 'acte_introuvable'
  | 'acte_inactif'
  | 'constat_present'
  | 'import_en_cours'
  | 'etat_divergent';

export type DeciderCorrespondanceResultat =
  | {
      ok: true;
      correspondance: {
        codeActe: string;
        etat: Exclude<EtatCorrespondance, 'absente'>;
        verifiePar: string | null;
        verifieLe: string | null;
      };
    }
  | { ok: false; raison: RaisonRefusCorrespondance };

/** Annule la transaction en cours et rend la raison à l'appelant : un geste
 *  qui ne trouve plus l'état vu n'écrit RIEN, pas même sa ligne de journal
 *  (sans quoi la concordance la refuserait au COMMIT, en erreur technique). */
class RefusGeste<R extends string> extends Error {
  constructor(readonly raison: R) {
    super(raison);
  }
}

/** Les deux verrous d'un geste NABM, pris avant toute lecture (en-tête).
 *  L'attente est bornée : un import NABM tient son verrou jusqu'à plusieurs
 *  minutes, et une requête restée en file occuperait sa connexion bien après
 *  l'abandon de la transaction par Prisma (5 s) — revue du lot, P2-1. */
async function verrouillerGeste(tx: Prisma.TransactionClient, analyteCode: string): Promise<void> {
  await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
  // Chaque attente épuisée dit SON verrou (revue CodeRabbit de #1496) : la
  // table des versions, c'est un import ; l'analyte, c'est un autre geste.
  await attendre(tx.$executeRaw`LOCK TABLE biology_catalog_versions_courantes IN SHARE MODE`, 'import_en_cours');
  await attendre(tx.$executeRaw`SELECT public.biology_analyte_nabm_verrouiller(${analyteCode})`, 'etat_divergent');
}

/** Une attente de verrou épuisée devient le refus nommé ; le reste remonte. */
async function attendre(requete: Promise<unknown>, siEpuisee: 'import_en_cours' | 'etat_divergent') {
  try {
    await requete;
  } catch (err) {
    if (estAttenteEpuisee(err)) throw new RefusGeste(siEpuisee);
    throw err;
  }
}

/** L'attente d'un verrou a dépassé `lock_timeout` (SQLSTATE 55P03). */
function estAttenteEpuisee(err: unknown): boolean {
  // L'erreur de Prisma, celle de l'adaptateur, celle du pilote `pg`.
  const cause = (e: unknown) => (e as { cause?: unknown } | null)?.cause;
  return [err, cause(err), cause(cause(err))].some(e => {
    const { code, message } = (e ?? {}) as { code?: unknown; message?: unknown };
    return code === '55P03' || (typeof message === 'string' && (message.includes('55P03') || message.includes('lock timeout')));
  });
}

/** Exécute un geste dans sa transaction ; un `RefusGeste` l'annule et devient
 *  un refus. Une attente épuisée APRÈS les deux verrous (ligne tenue par un
 *  autre écrivain) devient `etat_divergent` ; toute autre erreur remonte
 *  (erreur technique). READ COMMITTED explicite : la fonction de verrou de la
 *  migration refuse tout autre niveau (revue du lot, P2-2). */
async function geste<T, R extends string>(
  corps: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T | { ok: false; raison: R | 'import_en_cours' | 'etat_divergent' }> {
  try {
    return await prisma.$transaction(corps, { isolationLevel: 'ReadCommitted' });
  } catch (err) {
    if (err instanceof RefusGeste) return { ok: false, raison: err.raison as R };
    if (estAttenteEpuisee(err)) return { ok: false, raison: 'etat_divergent' };
    throw err;
  }
}

/**
 * Signe ou retire la signature d'un couple (analyte, acte).
 *
 * Transitions admises, et elles seules :
 *  - signer  depuis `absente`     : la ligne naît signée ;
 *  - signer  depuis `proposition` : la ligne non signée reçoit nature et signature ;
 *  - retirer depuis `signee`      : la signature est effacée, la ligne redevient
 *                                   une proposition (aucune suppression).
 *
 * Chaque geste écrit sa ligne de journal dans la même transaction ; le retrait
 * y recopie la signature qu'il efface. Une signature est refusée tant que
 * l'analyte porte un constat « aucun acte » (`constat_present`).
 *
 * Le retrait désigne la signature VUE par sa date (`verifieLeVu`) : « signée »
 * seul laisserait un onglet périmé effacer une signature posée depuis — retrait
 * puis nouvelle signature ailleurs (revue du lot, A2).
 */
export async function deciderCorrespondance(params: {
  analyteCode: string;
  codeActe: string;
  decision: 'signer' | 'retirer';
  etatAttendu: EtatCorrespondance;
  nature?: string;
  /** Retrait seulement : la date de la signature telle que l'écran l'a vue. */
  verifieLeVu?: Date;
  praticien: string;
}): Promise<DeciderCorrespondanceResultat> {
  const { analyteCode, codeActe, decision, etatAttendu, praticien } = params;
  type Refus = RaisonRefusCorrespondance;

  if (decision === 'retirer') {
    const verifieLeVu = params.verifieLeVu;
    if (etatAttendu !== 'signee' || !verifieLeVu) {
      return { ok: false, raison: 'transition_invalide' };
    }
    return geste<DeciderCorrespondanceResultat, Refus>(async tx => {
      await verrouillerGeste(tx, analyteCode);
      const vue = { analyteCode, codeActe, verifiePar: { not: null }, verifieLe: verifieLeVu };
      const ligne = await tx.biologyAnalyteNabm.findFirst({
        where: vue,
        select: { nature: true, verifiePar: true, verifieLe: true },
      });
      if (!ligne?.verifiePar || !ligne.verifieLe) throw new RefusGeste<Refus>('etat_divergent');
      await tx.biologyAnalyteNabmJournal.create({
        data: {
          analyteCode,
          acte: 'retrait_signature',
          codeActe,
          nature: ligne.nature,
          praticienEmail: praticien,
          effacePar: ligne.verifiePar,
          effaceLe: ligne.verifieLe,
        },
        select: { id: true },
      });
      const { count } = await tx.biologyAnalyteNabm.updateMany({
        where: vue,
        data: { verifiePar: null, verifieLe: null },
      });
      if (count !== 1) throw new RefusGeste<Refus>('etat_divergent');
      return { ok: true, correspondance: { codeActe, etat: 'proposition', verifiePar: null, verifieLe: null } };
    });
  }

  if (etatAttendu === 'signee') return { ok: false, raison: 'transition_invalide' };
  const nature = params.nature ?? '';
  if (!estNatureNabm(nature)) return { ok: false, raison: 'nature_requise' };

  return geste<DeciderCorrespondanceResultat, Refus>(async tx => {
    await verrouillerGeste(tx, analyteCode);

    const analyte = await tx.biologyAnalyte.findUnique({
      where: { code: analyteCode },
      select: { actif: true, constatNabm: { select: { id: true } } },
    });
    if (!analyte) throw new RefusGeste<Refus>('analyte_inconnu');
    if (!analyte.actif) throw new RefusGeste<Refus>('analyte_inactif');
    if (analyte.constatNabm) throw new RefusGeste<Refus>('constat_present');

    const millesime = await millesimeCourant(tx);
    if (!millesime) throw new RefusGeste<Refus>('millesime_absent');
    const acte = await tx.biologyNabmActe.findUnique({
      where: { codeActe_versionSource: { codeActe, versionSource: millesime } },
      select: { inactif: true },
    });
    if (!acte) throw new RefusGeste<Refus>('acte_introuvable');
    if (acte.inactif) throw new RefusGeste<Refus>('acte_inactif');

    // L'état vu se vérifie AVANT la ligne de journal : un refus n'écrit rien.
    const existante = await tx.biologyAnalyteNabm.findUnique({
      where: { analyteCode_codeActe: { analyteCode, codeActe } },
      select: { verifiePar: true },
    });
    const conforme =
      etatAttendu === 'absente' ? existante === null : existante !== null && existante.verifiePar === null;
    if (!conforme) throw new RefusGeste<Refus>('etat_divergent');

    await tx.biologyAnalyteNabmJournal.create({
      data: { analyteCode, acte: 'signature', codeActe, nature, millesime, praticienEmail: praticien },
      select: { id: true },
    });

    // La date est posée par la base (trigger) ; celle-ci ne sert qu'à
    // satisfaire le CHECK de M-3 (signée ⇒ datée) et ne s'écrit pas.
    const provisoire = new Date();
    if (etatAttendu === 'absente') {
      await tx.biologyAnalyteNabm.create({
        data: { analyteCode, codeActe, nature, verifiePar: praticien, verifieLe: provisoire },
        select: { id: true },
      });
    } else {
      const { count } = await tx.biologyAnalyteNabm.updateMany({
        where: { analyteCode, codeActe, verifiePar: null },
        data: { nature, verifiePar: praticien, verifieLe: provisoire },
      });
      if (count !== 1) throw new RefusGeste<Refus>('etat_divergent');
    }

    const signee = await tx.biologyAnalyteNabm.findUniqueOrThrow({
      where: { analyteCode_codeActe: { analyteCode, codeActe } },
      select: { verifiePar: true, verifieLe: true },
    });
    return {
      ok: true,
      correspondance: {
        codeActe,
        etat: 'signee',
        verifiePar: signee.verifiePar,
        verifieLe: signee.verifieLe ? signee.verifieLe.toISOString() : null,
      },
    };
  });
}

// ── Le constat signé « aucun acte dans la nomenclature » (M-3c) ────────────

export type RaisonRefusConstat =
  | 'constat_non_permis'
  | 'analyte_inconnu'
  | 'analyte_inactif'
  | 'millesime_absent'
  | 'signature_presente'
  | 'import_en_cours'
  | 'etat_divergent';

export type ConstatAffiche = {
  millesime: string;
  verifiePar: string;
  verifieLe: string;
  /** Posé sur un autre millésime que le courant : il ne vaut plus, l'analyte
   *  est « non évalué » jusqu'à un nouveau constat (arbitrage du 2026-10-16). */
  perime: boolean;
};

export type DeciderConstatResultat =
  | { ok: true; constat: ConstatAffiche | null }
  | { ok: false; raison: RaisonRefusConstat };

/**
 * Pose ou retire le constat signé « aucun acte dans la nomenclature ».
 *
 *  - constater : seulement pour un analyte que la liste préparée range
 *    `aucun_acte` (`candidatsNabm.ts`) ; sur le millésime VU à l'écran, qui
 *    doit être le courant ; refusé si l'analyte porte une correspondance
 *    signée (`signature_presente`) ou déjà un constat ;
 *  - retirer : le constat VU, désigné par sa date (`verifieLeVu`), même périmé.
 *
 * Chaque geste écrit sa ligne de journal dans la même transaction ; le retrait
 * y recopie le constat qu'il efface. Signataire = e-mail de session, date
 * posée par la base et relue.
 */
export async function deciderConstat(params: {
  analyteCode: string;
  decision: 'constater' | 'retirer';
  /** Constat seulement : le millésime affiché à l'écran. */
  millesimeVu?: string;
  /** Retrait seulement : la date du constat affiché. */
  verifieLeVu?: Date;
  praticien: string;
}): Promise<DeciderConstatResultat> {
  const { analyteCode, decision, praticien } = params;
  type Refus = RaisonRefusConstat;

  if (decision === 'retirer') {
    const verifieLeVu = params.verifieLeVu;
    if (!verifieLeVu) return { ok: false, raison: 'etat_divergent' };
    return geste<DeciderConstatResultat, Refus>(async tx => {
      await verrouillerGeste(tx, analyteCode);
      const vu = { analyteCode, verifieLe: verifieLeVu };
      const constat = await tx.biologyAnalyteNabmConstat.findFirst({
        where: vu,
        select: { millesime: true, verifiePar: true, verifieLe: true },
      });
      if (!constat) throw new RefusGeste<Refus>('etat_divergent');
      await tx.biologyAnalyteNabmJournal.create({
        data: {
          analyteCode,
          acte: 'retrait_constat',
          millesime: constat.millesime,
          praticienEmail: praticien,
          effacePar: constat.verifiePar,
          effaceLe: constat.verifieLe,
        },
        select: { id: true },
      });
      const { count } = await tx.biologyAnalyteNabmConstat.deleteMany({ where: vu });
      if (count !== 1) throw new RefusGeste<Refus>('etat_divergent');
      return { ok: true, constat: null };
    });
  }

  const millesimeVu = params.millesimeVu ?? '';
  if (!millesimeVu) return { ok: false, raison: 'etat_divergent' };
  // Le constat ne se pose que là où la liste relue n'a trouvé aucun acte : un
  // analyte à candidat se signe, un calculé ou un regroupement ne se cote pas.
  if (candidatsNabmPour(analyteCode)?.situation !== 'aucun_acte') {
    return { ok: false, raison: 'constat_non_permis' };
  }

  return geste<DeciderConstatResultat, Refus>(async tx => {
    await verrouillerGeste(tx, analyteCode);

    const analyte = await tx.biologyAnalyte.findUnique({
      where: { code: analyteCode },
      select: {
        actif: true,
        constatNabm: { select: { id: true } },
        correspondancesNabm: { where: { verifiePar: { not: null } }, select: { id: true }, take: 1 },
      },
    });
    if (!analyte) throw new RefusGeste<Refus>('analyte_inconnu');
    if (!analyte.actif) throw new RefusGeste<Refus>('analyte_inactif');
    if (analyte.correspondancesNabm.length > 0) throw new RefusGeste<Refus>('signature_presente');
    if (analyte.constatNabm) throw new RefusGeste<Refus>('etat_divergent');

    const millesime = await millesimeCourant(tx);
    if (!millesime) throw new RefusGeste<Refus>('millesime_absent');
    // L'écran a vu un autre millésime : il constaterait sur une version qu'il
    // n'a pas lue.
    if (millesime !== millesimeVu) throw new RefusGeste<Refus>('etat_divergent');

    await tx.biologyAnalyteNabmJournal.create({
      data: { analyteCode, acte: 'constat_aucun_acte', millesime, praticienEmail: praticien },
      select: { id: true },
    });
    await tx.biologyAnalyteNabmConstat.create({
      data: { analyteCode, millesime, verifiePar: praticien },
      select: { id: true },
    });
    // La date est posée par la base : la relire avant de la rendre.
    const pose = await tx.biologyAnalyteNabmConstat.findUniqueOrThrow({
      where: { analyteCode },
      select: { millesime: true, verifiePar: true, verifieLe: true },
    });
    return {
      ok: true,
      constat: {
        millesime: pose.millesime,
        verifiePar: pose.verifiePar,
        verifieLe: pose.verifieLe.toISOString(),
        perime: false,
      },
    };
  });
}
