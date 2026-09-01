// Service du catalogue documentaire du rayon biologie (CB-08) — PRATICIEN
// SEUL, lecture seule. Construit les fiches d'analytes et la composition des
// bilans telles que la bibliothèque les affiche : identité, provenance, les
// DEUX référentiels de valeurs côte à côte (laboratoire / fonctionnel — jamais
// fusionnés, invariant du schéma), remboursement dérivé, préanalytique.
//
// AUCUNE donnée patient n'entre ici : le catalogue est global au cabinet
// (étage 1 documentaire, verrou HDS intact). Le volume est celui du catalogue
// niveau 1 (47 analytes, 15 panels, D-068) : tout se sert en une réponse, sans
// pagination — rien de commun avec les 140 148 fiches du rayon C4.
//
// Le remboursement n'est JAMAIS calculé ici : la dérivation vit une seule fois
// dans `remboursable.ts` (invariant du schéma, `biology_analyte_nabm`). Tant
// que l'appariement analyte ↔ NABM est à zéro ligne signée, tout sort
// `non_evalue` — ce que l'écran doit dire sans jamais écrire « non remboursé ».
import { prisma } from '@/lib/prisma';
import {
  deriverRemboursement,
  type CorrespondanceNabm,
  type Remboursement,
} from './remboursable';

/** Pointeur de millésime de la nomenclature, tel que l'import CB-02a l'écrit. */
const SOURCE_NABM = 'nabm_smt_ans';

export type PlageLaboratoire = {
  borneMin: number | null;
  borneMax: number | null;
  unite: string;
  population: string;
  sourceLibelle: string;
  sourceUrl: string | null;
};

export type PlageFonctionnelle = {
  borneMin: number | null;
  borneMax: number | null;
  unite: string;
  population: string;
  claimId: string;
  versionClaim: string;
  niveauPreuve: string;
};

export type PreanalytiqueAffiche = {
  typeCondition: string;
  consigne: string;
};

export type PanelCite = {
  code: string;
  libelle: string;
  niveau: string;
};

export type FicheAnalyte = {
  code: string;
  libelle: string;
  libellePatient: string | null;
  unite: string | null;
  typePrelevement: string;
  delaiRenduIndicatif: string | null;
  sourceProvenance: string;
  statutFiche: string;
  niveauCompletude: string;
  donneesManquantes: string[];
  incertitudes: string | null;
  verifieLe: string | null;
  validationMedicaleRequise: boolean;
  /** Référentiel 1/2 — valeurs laboratoire. Vide tant que rien n'est saisi. */
  plagesLaboratoire: PlageLaboratoire[];
  /** Référentiel 2/2 — plages fonctionnelles, chacune ancrée à son claim. */
  plagesFonctionnelles: PlageFonctionnelle[];
  remboursement: Remboursement;
  preanalytiques: PreanalytiqueAffiche[];
  panels: PanelCite[];
};

export type ItemPanelBiologie = {
  type: 'analyte' | 'ratio';
  code: string;
  libelle: string;
};

export type PanelCatalogueBiologie = {
  code: string;
  libelle: string;
  niveau: string;
  objectif: string | null;
  items: ItemPanelBiologie[];
};

export type MillesimeNabm = {
  versionSource: string;
  nombreEntrees: number;
  importeLe: string;
};

export type CatalogueBiologieResult = {
  analytes: FicheAnalyte[];
  panels: PanelCatalogueBiologie[];
  /** Millésime de la nomenclature servi, `null` si la source n'est pas importée. */
  millesimeNabm: MillesimeNabm | null;
};

/**
 * Lit le catalogue documentaire complet. Les entités inactives sont écartées :
 * contrairement au moteur de proposition (qui reçoit `actif` et refuse
 * lui-même, fail-closed), un rayon de consultation n'a rien à dire d'une
 * fiche retirée du catalogue.
 */
export async function listerCatalogueBiologie(): Promise<CatalogueBiologieResult> {
  const [analytes, panels, pointeurNabm] = await Promise.all([
    prisma.biologyAnalyte.findMany({
      where: { actif: true },
      select: {
        code: true,
        libelle: true,
        libellePatient: true,
        unite: true,
        typePrelevement: true,
        delaiRenduIndicatif: true,
        sourceProvenance: true,
        statutFiche: true,
        niveauCompletude: true,
        donneesManquantes: true,
        incertitudes: true,
        verifieLe: true,
        validationMedicaleRequise: true,
        plagesReference: {
          where: { actif: true },
          select: {
            borneMin: true,
            borneMax: true,
            unite: true,
            population: true,
            sourceLibelle: true,
            sourceUrl: true,
          },
        },
        plagesFonctionnelles: {
          where: { actif: true },
          select: {
            borneMin: true,
            borneMax: true,
            unite: true,
            population: true,
            claimId: true,
            versionClaim: true,
            niveauPreuve: true,
          },
        },
        correspondancesNabm: {
          select: { codeActe: true, nature: true, verifiePar: true },
        },
        preanalytiques: {
          where: { actif: true },
          select: { typeCondition: true, consigne: true },
        },
        itemsPanel: {
          select: {
            panel: { select: { code: true, libelle: true, niveau: true, actif: true } },
          },
        },
      },
      orderBy: { libelle: 'asc' },
    }),
    prisma.biologyPanel.findMany({
      where: { actif: true },
      select: {
        code: true,
        libelle: true,
        niveau: true,
        objectif: true,
        items: {
          select: {
            analyte: { select: { code: true, libelle: true } },
            ratio: { select: { code: true, libelle: true } },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.biologyCatalogVersionCourante.findUnique({
      where: { sourceProvenance: SOURCE_NABM },
      select: { versionSource: true, nombreEntrees: true, importeLe: true },
    }),
  ]);

  // Les actes du millésime courant ne sont chargés que pour les codes que les
  // correspondances citent : la dérivation n'a pas besoin des 987 actes, et
  // sans correspondance (l'état livré, zéro ligne) la requête ne part pas.
  const codesActes = [
    ...new Set(
      analytes.flatMap(a =>
        a.correspondancesNabm.filter(c => c.verifiePar !== null).map(c => c.codeActe),
      ),
    ),
  ];
  const actesCourants =
    pointeurNabm && codesActes.length > 0
      ? await prisma.biologyNabmActe.findMany({
          where: { versionSource: pointeurNabm.versionSource, codeActe: { in: codesActes } },
          select: {
            codeActe: true,
            inactif: true,
            ententePrealable: true,
            acteReserve: true,
            remboursementTotal: true,
          },
        })
      : [];

  const fiches: FicheAnalyte[] = analytes.map(analyte => ({
    code: analyte.code,
    libelle: analyte.libelle,
    libellePatient: analyte.libellePatient,
    unite: analyte.unite,
    typePrelevement: analyte.typePrelevement,
    delaiRenduIndicatif: analyte.delaiRenduIndicatif,
    sourceProvenance: analyte.sourceProvenance,
    statutFiche: analyte.statutFiche,
    niveauCompletude: analyte.niveauCompletude,
    donneesManquantes: analyte.donneesManquantes,
    incertitudes: analyte.incertitudes,
    verifieLe: analyte.verifieLe ? analyte.verifieLe.toISOString() : null,
    validationMedicaleRequise: analyte.validationMedicaleRequise,
    plagesLaboratoire: analyte.plagesReference,
    plagesFonctionnelles: analyte.plagesFonctionnelles,
    remboursement: deriverRemboursement(
      analyte.correspondancesNabm as CorrespondanceNabm[],
      actesCourants,
    ),
    preanalytiques: analyte.preanalytiques,
    panels: analyte.itemsPanel
      .map(item => item.panel)
      .filter(panel => panel.actif)
      .map(panel => ({ code: panel.code, libelle: panel.libelle, niveau: panel.niveau })),
  }));

  const panelsCatalogue: PanelCatalogueBiologie[] = panels.map(panel => ({
    code: panel.code,
    libelle: panel.libelle,
    niveau: panel.niveau,
    objectif: panel.objectif,
    items: panel.items.flatMap((item): ItemPanelBiologie[] => {
      if (item.analyte) return [{ type: 'analyte', ...item.analyte }];
      if (item.ratio) return [{ type: 'ratio', ...item.ratio }];
      return [];
    }),
  }));

  return {
    analytes: fiches,
    panels: panelsCatalogue,
    millesimeNabm: pointeurNabm
      ? {
          versionSource: pointeurNabm.versionSource,
          nombreEntrees: pointeurNabm.nombreEntrees,
          importeLe: pointeurNabm.importeLe.toISOString(),
        }
      : null,
  };
}
