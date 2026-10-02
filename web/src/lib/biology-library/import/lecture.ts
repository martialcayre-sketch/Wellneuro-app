import { prisma } from '@/lib/prisma';
import { preMarquage, type MotifEcart } from './valeurLue';

// LECTURE DU STAGING POUR L'ÉCRAN (BIO-INGEST LOT-02). Ne rend JAMAIS le
// contenu du document : chaque sélection est explicite, `contenu` n'y figure
// pas. Le pré-marquage est calculé ici, à la lecture, et n'écrit rien.

export type LigneLue = {
  id: string;
  rang: number;
  page: number;
  libelleLu: string;
  valeurLue: string;
  uniteLue: string | null;
  preleveLeLu: string | null;
  analytePropose: string | null;
  statutMapping: string;
  statut: string;
  motifEcart: string | null;
  idResultat: string | null;
  /** Suggestion d'écart pour l'écran — jamais une décision. */
  preMarquage: MotifEcart | null;
};

export type ImportLu = {
  id: string;
  statut: string;
  motifEchec: string | null;
  modele: string;
  versionPrompt: string;
  laboratoireLu: string | null;
  lanceLe: string;
  termineLe: string | null;
  /** L'extraction courante — la seule dont les lignes se décident (arbitrage du 2026-10-02). */
  courant: boolean;
  lignes: LigneLue[];
};

export type CompteRenduLu = {
  id: string;
  typeMime: string;
  deposePar: string;
  deposeLe: string;
  imports: ImportLu[];
};

/** Les comptes rendus d'un dossier, sans leurs lignes — la liste de l'écran. */
export async function listerComptesRendus(idPatient: string) {
  const comptesRendus = await prisma.compteRenduBiologique.findMany({
    where: { idPatient },
    orderBy: { deposeLe: 'desc' },
    select: {
      id: true,
      typeMime: true,
      deposePar: true,
      deposeLe: true,
      imports: { orderBy: { lanceLe: 'desc' }, take: 1, select: { id: true, statut: true } },
    },
  });
  return comptesRendus.map(c => ({
    id: c.id,
    typeMime: c.typeMime,
    deposePar: c.deposePar,
    deposeLe: c.deposeLe.toISOString(),
    dernierImport: c.imports[0] ?? null,
  }));
}

/** Un compte rendu, ses extractions et leurs lignes, avec le pré-marquage. `null` s'il n'est pas de ce dossier. */
export async function lireCompteRendu(idPatient: string, idCompteRendu: string): Promise<CompteRenduLu | null> {
  const c = await prisma.compteRenduBiologique.findFirst({
    where: { id: idCompteRendu, idPatient },
    select: {
      id: true,
      typeMime: true,
      deposePar: true,
      deposeLe: true,
      imports: {
        orderBy: { lanceLe: 'desc' },
        select: {
          id: true, statut: true, motifEchec: true, modele: true, versionPrompt: true,
          laboratoireLu: true, lanceLe: true, termineLe: true,
          lignes: {
            orderBy: { rang: 'asc' },
            select: {
              id: true, rang: true, page: true, libelleLu: true, valeurLue: true, uniteLue: true,
              preleveLeLu: true, analytePropose: true, statutMapping: true, statut: true,
              motifEcart: true, idResultat: true,
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  const codes = [...new Set(c.imports.flatMap(i => i.lignes.flatMap(l => (l.analytePropose ? [l.analytePropose] : []))))];
  const analytes = codes.length === 0 ? [] : await prisma.biologyAnalyte.findMany({
    where: { code: { in: codes } },
    select: { code: true, unite: true },
  });
  const uniteParCode = new Map(analytes.map(a => [a.code, a]));
  // Triés du plus récent au plus ancien : la courante est la première qui n'a pas échoué.
  const idCourant = c.imports.find(i => i.statut !== 'echec')?.id ?? null;

  return {
    id: c.id,
    typeMime: c.typeMime,
    deposePar: c.deposePar,
    deposeLe: c.deposeLe.toISOString(),
    imports: c.imports.map(i => ({
      id: i.id,
      statut: i.statut,
      motifEchec: i.motifEchec,
      modele: i.modele,
      versionPrompt: i.versionPrompt,
      laboratoireLu: i.laboratoireLu,
      lanceLe: i.lanceLe.toISOString(),
      termineLe: i.termineLe?.toISOString() ?? null,
      courant: i.id === idCourant,
      lignes: i.lignes.map(l => ({
        ...l,
        preleveLeLu: l.preleveLeLu?.toISOString() ?? null,
        preMarquage: preMarquage(l, l.analytePropose ? uniteParCode.get(l.analytePropose) ?? null : null),
      })),
    })),
  };
}
