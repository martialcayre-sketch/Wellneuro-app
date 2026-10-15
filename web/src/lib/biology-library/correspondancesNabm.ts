// Signature des correspondances analyte ↔ acte NABM (M-3, F54) — PRATICIEN
// SEUL. C'est LE véhicule d'écriture de `biology_analyte_nabm`, arrêté par le
// responsable le 2026-10-15 : un écran praticien plutôt qu'une migration de
// données (qui aurait coûté une release-db à chaque lot et l'adresse du
// signataire au dépôt public).
//
// Patron de la route de décision des claims (`lib/rag/claims/revue.ts`) :
//  - la signature (`verifie_par`) est l'e-mail de session, la date
//    (`verifie_le`) est posée par le serveur — jamais reçues du client ;
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
// Ce fichier n'écrit pas la dérivation du remboursement : elle reste, une
// seule fois, dans `remboursable.ts`.
import { prisma } from '@/lib/prisma';
import { MILLESIME_LISTE_NABM, candidatsNabmPour, type SituationNabm } from './candidatsNabm';

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

async function millesimeCourant(): Promise<string | null> {
  const pointeur = await prisma.biologyCatalogVersionCourante.findUnique({
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

  return {
    ok: true,
    millesime,
    candidats,
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

/**
 * Signe ou retire la signature d'un couple (analyte, acte).
 *
 * Transitions admises, et elles seules :
 *  - signer  depuis `absente`     : la ligne naît signée ;
 *  - signer  depuis `proposition` : la ligne non signée reçoit nature et signature ;
 *  - retirer depuis `signee`      : la signature est effacée, la ligne redevient
 *                                   une proposition (aucune suppression).
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

  if (decision === 'retirer') {
    if (etatAttendu !== 'signee' || !params.verifieLeVu) {
      return { ok: false, raison: 'transition_invalide' };
    }
    const { count } = await prisma.biologyAnalyteNabm.updateMany({
      where: { analyteCode, codeActe, verifiePar: { not: null }, verifieLe: params.verifieLeVu },
      data: { verifiePar: null, verifieLe: null },
    });
    if (count === 0) return { ok: false, raison: 'etat_divergent' };
    return { ok: true, correspondance: { codeActe, etat: 'proposition', verifiePar: null, verifieLe: null } };
  }

  if (etatAttendu === 'signee') return { ok: false, raison: 'transition_invalide' };
  const nature = params.nature ?? '';
  if (!estNatureNabm(nature)) return { ok: false, raison: 'nature_requise' };

  const analyte = await prisma.biologyAnalyte.findUnique({
    where: { code: analyteCode },
    select: { actif: true },
  });
  if (!analyte) return { ok: false, raison: 'analyte_inconnu' };
  if (!analyte.actif) return { ok: false, raison: 'analyte_inactif' };

  const recherche = await chercherActeNabm(codeActe);
  if (!recherche.ok) {
    return { ok: false, raison: recherche.raison === 'millesime_absent' ? 'millesime_absent' : 'acte_introuvable' };
  }
  if (!recherche.acte) return { ok: false, raison: 'acte_introuvable' };
  if (recherche.acte.inactif) return { ok: false, raison: 'acte_inactif' };

  // La date est celle du serveur au moment de l'écriture — jamais du client.
  const verifieLe = new Date();

  if (etatAttendu === 'absente') {
    try {
      await prisma.biologyAnalyteNabm.create({
        data: { analyteCode, codeActe, nature, verifiePar: praticien, verifieLe },
        select: { id: true },
      });
    } catch (err) {
      // Le couple existe déjà (unicité analyte + acte) : l'écran était périmé.
      if ((err as { code?: string } | null)?.code === 'P2002') {
        return { ok: false, raison: 'etat_divergent' };
      }
      throw err;
    }
  } else {
    const { count } = await prisma.biologyAnalyteNabm.updateMany({
      where: { analyteCode, codeActe, verifiePar: null },
      data: { nature, verifiePar: praticien, verifieLe },
    });
    if (count === 0) return { ok: false, raison: 'etat_divergent' };
  }

  return {
    ok: true,
    correspondance: { codeActe, etat: 'signee', verifiePar: praticien, verifieLe: verifieLe.toISOString() },
  };
}
