// Service du catalogue documentaire du rayon biologie (CB-08) — PRATICIEN
// SEUL, lecture seule. Construit les fiches d'analytes telles que la
// bibliothèque les affiche : identité, provenance, les DEUX référentiels de
// valeurs côte à côte (laboratoire / fonctionnel — jamais fusionnés, invariant
// du schéma), remboursement dérivé, préanalytique, explorations non indiquées.
// Les bilans ne s'y servent plus (D-320 §2) : ils restent l'unité du moteur de
// proposition (D-296 §5), pas une entrée du rayon.
//
// AUCUNE donnée patient n'entre ici : le catalogue est global au cabinet
// (étage 1 documentaire, verrou HDS intact). Le volume est celui du catalogue
// niveau 1 (47 analytes, 15 panels, D-068 ; 49 analytes depuis D-245 §5, 85
// depuis D-261) :
// tout se sert en une réponse, sans pagination — rien de commun avec les
// 140 148 fiches du rayon C4.
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
import { chargerCompositionsSignees } from './compositionsAnalytes';
import { remboursementsAvecCompositions } from './compositionsProposition';
import {
  explorationsNonIndiqueesParAnalyte,
  reglesNonIndiquees,
  type ExplorationNonIndiquee,
} from './nonIndiquesBibliotheque';
import { lireLiensAxe, type LienAxe } from './liensAxe';
import { claimsValidesAuCorpus, cleClaim } from '@/lib/rag/claims/validite';

/** Pointeur de millésime de la nomenclature, tel que l'import CB-02a l'écrit. */
export const SOURCE_NABM = 'nabm_smt_ans';

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
  /** Explorations non indiquées dont cet analyte est l'alternative (D-320 §3). */
  nonIndiques: ExplorationNonIndiquee[];
  /** Liens signés vers un axe biologique (F79, [[D-351]]) ; nul = non gradé. */
  liensAxe: LienAxe[];
  /** Liens d'axe tus : leur claim n'est plus valide au corpus ([[D-140]]). */
  liensAxeSuspendus: number;
};

export type MillesimeNabm = {
  versionSource: string;
  nombreEntrees: number;
  importeLe: string;
};

export type CatalogueBiologieResult = {
  analytes: FicheAnalyte[];
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
  const [analytes, bilansNonIndiques, pointeurNabm, compositions] = await Promise.all([
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
        // Le constat « aucun acte » (M-3c) : son millésime suffit à la dérivation.
        constatNabm: { select: { millesime: true } },
        preanalytiques: {
          where: { actif: true },
          select: { typeCondition: true, consigne: true },
        },
        // F79 ([[D-351]]) : les liens d'axe seuls — les liens nutriment
        // (F52) n'ont pas d'écran décidé.
        liensCliniques: {
          where: { actif: true, cibleType: 'axe' },
          select: {
            cibleCode: true,
            direction: true,
            claimId: true,
            versionClaim: true,
            niveauPreuve: true,
          },
        },
      },
      orderBy: { libelle: 'asc' },
    }),
    // Le seul libellé de bilan encore lu : celui des explorations non
    // indiquées, que la fiche de leur alternative nomme.
    prisma.biologyPanel.findMany({
      where: { actif: true, code: { in: reglesNonIndiquees().map(regle => regle.panelCode) } },
      select: { code: true, libelle: true },
    }),
    prisma.biologyCatalogVersionCourante.findUnique({
      where: { sourceProvenance: SOURCE_NABM },
      select: { versionSource: true, nombreEntrees: true, importeLe: true },
    }),
    chargerCompositionsSignees(),
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

  // [[D-140]] : la validité du claim d'un lien se CONSTATE à la lecture, jamais
  // présumée. Le préflight de release-db ne la voit qu'à la release suivante ;
  // un claim repassé hors VALIDE entre-temps tait son lien ici, dès la lecture.
  const claimsValides = await claimsValidesAuCorpus(
    analytes.flatMap(a =>
      a.liensCliniques.map(l => ({ claimId: l.claimId, versionClaim: l.versionClaim })),
    ),
  );

  const nonIndiques = explorationsNonIndiqueesParAnalyte(
    new Map(bilansNonIndiques.map(bilan => [bilan.code, bilan.libelle])),
  );

  // Même dérivation que la proposition : un calculé ou un regroupement signé
  // hérite de ses mesures ([[D-323]] §4).
  const remboursements = remboursementsAvecCompositions(
    new Map(
      analytes.map(analyte => [
        analyte.code,
        deriverRemboursement(
          analyte.correspondancesNabm as CorrespondanceNabm[],
          actesCourants,
          { constat: analyte.constatNabm, millesimeCourant: pointeurNabm?.versionSource ?? null },
        ),
      ]),
    ),
    compositions,
  );

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
    remboursement: remboursements.get(analyte.code)!,
    preanalytiques: analyte.preanalytiques,
    nonIndiques: nonIndiques.get(analyte.code) ?? [],
    liensAxe: lireLiensAxe(analyte.liensCliniques.filter(l => claimsValides.has(cleClaim(l)))),
    liensAxeSuspendus: analyte.liensCliniques.filter(l => !claimsValides.has(cleClaim(l))).length,
  }));

  return {
    analytes: fiches,
    millesimeNabm: pointeurNabm
      ? {
          versionSource: pointeurNabm.versionSource,
          nombreEntrees: pointeurNabm.nombreEntrees,
          importeLe: pointeurNabm.importeLe.toISOString(),
        }
      : null,
  };
}
