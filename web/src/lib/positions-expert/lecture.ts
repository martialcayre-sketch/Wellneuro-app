// LA LECTURE DE L'ATELIER DES POSITIONS D'EXPERT (D-439 §2, §3, A2, A3) :
// positions, versions, actes, arbitrages par couple, et leurs états dérivés.
// Rien n'est écrit ici, et aucun texte ne part au journal ([[D-251]] §4).
//
// La surface est PRIVÉE AU PRATICIEN : ni portail, ni courrier, ni scoring, ni
// orientation, ni recherche corpus, ni IA ne lisent ce module (D-439, « Ne
// touche pas »). Aucune fiche n'y est choisie d'après un dossier patient.

import { prisma } from '@/lib/prisma';
import { empreinteContenuBrut } from './empreinte';
import {
  appuisNonFrais,
  causesARelire,
  etatVersion,
  jetonDernierActe,
  type EtatVersion,
} from './etat';
import { contexteDuDepot, type ContexteEcriture } from './ecriture';
import { claimsDuConflit, conflitPublie, fichesCurees } from './registreConflits';
import { contenuAdmis, type CauseARelire, type ContenuPosition } from './vocabulaire';

export type ActeLuSerialise = { ordre: string; acte: string; auteur: string; motif: string | null; le: string };

export type VersionLue = {
  id: string;
  positionId: string;
  version: string;
  dossier: string;
  ficheId: string | null;
  /** `null` : le contenu relu n'a pas ses quatre rubriques — aucun acte ne s'y pose. */
  contenu: ContenuPosition | null;
  claimsAppui: string[];
  auteur: string;
  creeLe: string;
  courante: boolean;
  etat: EtatVersion;
  /** L'empreinte que l'écran renvoie avec un acte. */
  empreinte: string | null;
  /** Le jeton du dernier acte, que l'écran renvoie avec un acte. */
  jeton: string | null;
  actes: ActeLuSerialise[];
  /** Les claims d'appui qui ne sont plus frais au corpus (absents compris). */
  appuisNonFrais: string[];
};

export type PositionLue = {
  positionId: string;
  dossier: string;
  courante: VersionLue;
  /** Toutes les versions, de la plus récente à la plus ancienne. */
  versions: VersionLue[];
  enVigueur: boolean;
  aRelire: boolean;
};

export type ArbitrageLu = {
  id: string;
  ordre: string;
  acte: string;
  idArbitrageRemplace: string | null;
  claimRetenu: string | null;
  idPositionVersion: string | null;
  /** `WN-PE-NNNN@vN.M` de la position retenue. */
  positionRetenue: string | null;
  motif: string;
  auteur: string;
  le: string;
};

export type CoupleLu = {
  conflitId: string;
  ficheId: string;
  /** La pose en vigueur du couple, ou `null` (non arbitré). */
  tete: ArbitrageLu | null;
  /** Vide : la tête est courante. Sinon, elle s'affiche « à relire », jamais comme courante. */
  causesARelire: CauseARelire[];
  /** Toutes les lignes du couple, de la plus récente à la plus ancienne. */
  historique: ArbitrageLu[];
};

export type ConflitLu = { id: string; objet: string; claims: [string, string]; fichesCurees: string[] };

export type AtelierPositions = {
  positions: PositionLue[];
  couples: CoupleLu[];
  /** Les conflits publiés du registre, avec leur liste curée de fiches (vide tant que la re-signature ne l'a pas posée). */
  conflits: ConflitLu[];
  structure: { signee: boolean; fiches: string[] };
};

const iso = (d: Date) => d.toISOString();

export async function lireAtelierPositions(ctx: ContexteEcriture = contexteDuDepot()): Promise<AtelierPositions> {
  const [versions, arbitrages] = await Promise.all([
    prisma.positionExpertVersion.findMany({
      orderBy: [{ positionId: 'asc' }, { creeLe: 'desc' }],
      select: {
        id: true,
        positionId: true,
        version: true,
        dossier: true,
        ficheId: true,
        contenu: true,
        claimsAppui: true,
        idVersionRevisee: true,
        auteur: true,
        creeLe: true,
        actes: { orderBy: { ordre: 'asc' }, select: { ordre: true, acte: true, auteur: true, motif: true, le: true } },
      },
    }),
    prisma.arbitrageConflitSource.findMany({
      orderBy: { ordre: 'desc' },
      select: {
        id: true,
        ordre: true,
        conflitId: true,
        ficheId: true,
        acte: true,
        idArbitrageRemplace: true,
        claimRetenu: true,
        idPositionVersion: true,
        conflitSha256: true,
        motif: true,
        auteur: true,
        le: true,
      },
    }),
  ]);

  const refs = [
    ...versions.flatMap(v => v.claimsAppui),
    ...arbitrages.flatMap(a => (a.claimRetenu ? [a.claimRetenu] : [])),
  ];
  const frais = await ctx.lireFraicheur(refs);

  const revisees = new Set(versions.flatMap(v => (v.idVersionRevisee ? [v.idVersionRevisee] : [])));
  const lues = new Map<string, VersionLue>();
  for (const v of versions) {
    lues.set(v.id, {
      id: v.id,
      positionId: v.positionId,
      version: v.version,
      dossier: v.dossier,
      ficheId: v.ficheId,
      contenu: contenuAdmis(v.contenu),
      claimsAppui: v.claimsAppui,
      auteur: v.auteur,
      creeLe: iso(v.creeLe),
      courante: !revisees.has(v.id),
      etat: etatVersion(v.actes),
      empreinte: empreinteContenuBrut(v.contenu),
      jeton: jetonDernierActe(v.actes),
      actes: v.actes.map(a => ({ ordre: String(a.ordre), acte: a.acte, auteur: a.auteur, motif: a.motif, le: iso(a.le) })),
      appuisNonFrais: appuisNonFrais(v.claimsAppui, frais),
    });
  }

  const parPosition = new Map<string, VersionLue[]>();
  for (const v of lues.values()) parPosition.set(v.positionId, [...(parPosition.get(v.positionId) ?? []), v]);
  const positions: PositionLue[] = [];
  for (const [positionId, liste] of parPosition) {
    const courante = liste.find(v => v.courante);
    if (!courante) continue; // Jamais : la chaîne de révision a toujours une fin.
    positions.push({
      positionId,
      dossier: courante.dossier,
      courante,
      versions: liste,
      enVigueur: courante.etat === 'signee',
      aRelire: courante.appuisNonFrais.length > 0,
    });
  }

  const remplaces = new Set(arbitrages.flatMap(a => (a.idArbitrageRemplace ? [a.idArbitrageRemplace] : [])));
  const parCouple = new Map<string, typeof arbitrages>();
  for (const a of arbitrages) {
    const cle = `${a.conflitId}|${a.ficheId}`;
    parCouple.set(cle, [...(parCouple.get(cle) ?? []), a]);
  }
  const serialiser = (a: (typeof arbitrages)[number]): ArbitrageLu => {
    const retenue = a.idPositionVersion ? lues.get(a.idPositionVersion) : undefined;
    return {
      id: a.id,
      ordre: String(a.ordre),
      acte: a.acte,
      idArbitrageRemplace: a.idArbitrageRemplace,
      claimRetenu: a.claimRetenu,
      idPositionVersion: a.idPositionVersion,
      positionRetenue: retenue ? `${retenue.positionId}@${retenue.version}` : null,
      motif: a.motif,
      auteur: a.auteur,
      le: iso(a.le),
    };
  };
  const couples: CoupleLu[] = [];
  for (const liste of parCouple.values()) {
    const tete = liste.find(a => a.acte === 'pose' && !remplaces.has(a.id)) ?? null;
    const retenue = tete?.idPositionVersion ? lues.get(tete.idPositionVersion) : undefined;
    couples.push({
      conflitId: liste[0].conflitId,
      ficheId: liste[0].ficheId,
      tete: tete ? serialiser(tete) : null,
      causesARelire: tete
        ? causesARelire(tete, {
            entree: conflitPublie(tete.conflitId, ctx.registre),
            structureSignee: ctx.structure.signee,
            fichesDeLaStructure: ctx.structure.fiches,
            versionRetenue: retenue
              ? { courante: retenue.courante, etat: retenue.etat, appuisNonFrais: retenue.appuisNonFrais }
              : null,
            claimsFrais: frais,
          })
        : [],
      historique: liste.map(serialiser),
    });
  }

  const conflits: ConflitLu[] = ctx.registre
    .filter(c => conflitPublie(c.id, ctx.registre) !== null)
    .map(c => ({ id: c.id, objet: c.objet, claims: [...claimsDuConflit(c)] as [string, string], fichesCurees: [...fichesCurees(c)] }));

  return {
    positions,
    couples,
    conflits,
    structure: { signee: ctx.structure.signee, fiches: [...ctx.structure.fiches].sort() },
  };
}
