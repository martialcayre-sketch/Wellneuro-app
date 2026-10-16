// LA LECTURE PRATICIEN DES FICHES D'USAGE ([[D-314]] §3, §5) : le rayon (fiches
// et vocabulaire, avec leurs états) et le détail d'une version, rubrique par
// rubrique, pour la relecture.
//
// RIEN N'EST SERVI ICI : c'est l'écran de VALIDATION du responsable. Aucun
// parcours ne consomme encore les fiches (BP-11, BP-16), aucune sélection
// d'après le dossier, rien au patient.
//
// Les états se dérivent des actes à la lecture (`etat.ts`) ; rien n'est
// réécrit. Une version ou un libellé dont la fiche (le terme) n'est plus dans
// la structure reste VISIBLE, état « hors structure » : rien ne disparaît en
// silence.
//
// AUCUN TEXTE NE SORT D'ICI VERS UN JOURNAL ([[D-251]] §4).

import { prisma } from '@/lib/prisma';
import { CONTEXTE_DU_DEPOT, rubriquesAttendues, type ContexteControle } from './controle';
import { rubriquesLues } from './empreintes';
import {
  derniereVersionValidee,
  etatDeLaVersion,
  etatDuLibelle,
  etatDuTexte,
  jetonDernierActe,
  serialiserActe,
  type ActeSerialise,
  type EtatLibelle,
  type EtatTexte,
  type EtatVersionUsage,
} from './etat';
import { structureSignee } from './ficheUsageBesoin2V1';
import { RUBRIQUES_FICHE_USAGE, type NatureLibelle } from './vocabulaire';

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  empreinte: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

export type ResumeVersion = { id: string; numero: number; creeLe: string; etat: EtatVersionUsage };

export type FicheDuRayon = {
  ficheId: string;
  /** La fiche est déclarée par la structure du jour. */
  declaree: boolean;
  population: string | null;
  rubriquesAttendues: readonly string[];
  /**
   * La version de référence : la plus récente validée, ou `null` — toujours
   * `null` tant que la structure n'est pas signée (rien ne fait foi sans elle).
   */
  reference: string | null;
  versions: ResumeVersion[];
};

export type LibelleDuRayon = {
  id: string;
  numero: number;
  libelle: string;
  /** L'empreinte que l'écran renvoie avec son acte. */
  libelleSha256: string;
  creeLe: string;
  etat: EtatLibelle;
  /**
   * L'état du texte au vu de ses seuls actes, sous l'état de structure : le
   * retrait reste offert sur un libellé hors structure ou à relire, comme sur
   * une rubrique.
   */
  etatTexte: EtatTexte;
  /** Un libellé plus récent du même terme est validé : celui-ci ne se valide plus. */
  depasse: boolean;
  dernierActe: string | null;
  actes: ActeSerialise[];
};

export type TermeDuRayon = {
  termeId: string;
  nature: NatureLibelle | string;
  declare: boolean;
  /**
   * Le libellé qui fait foi : le plus récent validé (au sens du numéro), les
   * autres validés sont « remplacés » — aucun acte n'est posé pour autant.
   * `null` tant que la structure n'est pas signée.
   */
  reference: string | null;
  libelles: LibelleDuRayon[];
};

export type RayonFichesUsage = {
  structure: { signee: boolean; empreinte: string; fiches: number; termes: number };
  fiches: FicheDuRayon[];
  termes: TermeDuRayon[];
};

export async function lireRayonFichesUsage(
  contexte: ContexteControle = CONTEXTE_DU_DEPOT,
  signee: boolean = structureSignee(),
): Promise<RayonFichesUsage> {
  const { structure, empreinte } = contexte;

  const versions = await prisma.ficheUsageVersion.findMany({
    orderBy: [{ ficheId: 'asc' }, { numero: 'desc' }],
    select: {
      id: true,
      ficheId: true,
      numero: true,
      contenu: true,
      structureSha256: true,
      creeLe: true,
      actes: { select: { ...SELECTION_ACTE, rubrique: true } },
    },
  });
  const libelles = await prisma.ficheUsageLibelle.findMany({
    orderBy: [{ termeId: 'asc' }, { numero: 'desc' }],
    select: {
      id: true,
      nature: true,
      termeId: true,
      numero: true,
      libelle: true,
      libelleSha256: true,
      structureSha256: true,
      creeLe: true,
      actes: { orderBy: { ordre: 'desc' }, select: SELECTION_ACTE },
    },
  });

  const ficheIds = [...new Set([...structure.fiches.map(f => f.id), ...versions.map(v => v.ficheId)])];
  const fiches: FicheDuRayon[] = ficheIds.map(ficheId => {
    const declaree = structure.fiches.find(f => f.id === ficheId) ?? null;
    const attendues = rubriquesAttendues(ficheId, contexte);
    const resumes = versions
      .filter(v => v.ficheId === ficheId)
      .map(v => ({
        id: v.id,
        numero: v.numero,
        creeLe: v.creeLe.toISOString(),
        etat: etatDeLaVersion(
          { structureSha256: v.structureSha256, rubriques: rubriquesLues(v.contenu, v.actes) },
          { empreinteStructure: empreinte, rubriquesAttendues: attendues },
        ),
      }));
    return {
      ficheId,
      declaree: declaree !== null,
      population: declaree?.population ?? null,
      rubriquesAttendues: attendues ?? [],
      reference: signee ? (derniereVersionValidee(resumes)?.id ?? null) : null,
      versions: resumes,
    };
  });

  const termesDeclares = [...structure.hypotheses, ...structure.populations];
  const termeIds = [...new Set([...termesDeclares, ...libelles.map(l => l.termeId)])];
  const termes: TermeDuRayon[] = termeIds.map(termeId => {
    const declare = termesDeclares.includes(termeId);
    const siens = libelles
      .filter(l => l.termeId === termeId)
      .map(l => ({ l, etat: etatDuLibelle(l, l.actes, { empreinteStructure: empreinte, termeDeclare: declare }) }));
    const numerosValides = siens.filter(x => x.etat.etat === 'validee').map(x => x.l.numero);
    const plusRecentValide = numerosValides.length > 0 ? Math.max(...numerosValides) : null;
    const reference = siens.find(x => x.l.numero === plusRecentValide)?.l.id ?? null;
    return {
      termeId,
      nature: siens[0]?.l.nature ?? (structure.hypotheses.includes(termeId) ? 'hypothese' : 'population'),
      declare,
      reference: signee ? reference : null,
      libelles: siens.map(({ l, etat }) => ({
        id: l.id,
        numero: l.numero,
        libelle: l.libelle,
        libelleSha256: l.libelleSha256,
        creeLe: l.creeLe.toISOString(),
        etat,
        etatTexte: etatDuTexte(l.libelleSha256, l.actes),
        depasse: plusRecentValide !== null && l.numero < plusRecentValide,
        dernierActe: jetonDernierActe(l.actes),
        actes: l.actes.map(serialiserActe),
      })),
    };
  });

  return { structure: { signee, empreinte, fiches: structure.fiches.length, termes: termesDeclares.length }, fiches, termes };
}

export type RubriqueDetaillee = {
  rubrique: string;
  texte: string;
  /** L'empreinte que l'écran renvoie avec son acte. */
  empreinte: string;
  etat: EtatTexte;
  dernierActe: string | null;
  actes: ActeSerialise[];
};

export type DetailVersionUsage = {
  id: string;
  ficheId: string;
  numero: number;
  creeLe: string;
  modeleRedaction: string;
  modeleContreLecture: string;
  versionConsigne: string;
  /** La version rédige la structure du jour (sinon « à relire »). */
  structureDuJour: boolean;
  structureSignee: boolean;
  etat: EtatVersionUsage;
  /** Une version plus récente de la fiche est validée : celle-ci ne se valide plus. */
  depassee: boolean;
  rubriques: RubriqueDetaillee[];
};

const RANG: Record<string, number> = Object.fromEntries(RUBRIQUES_FICHE_USAGE.map((r, i) => [r, i]));

export async function lireVersionFicheUsage(
  id: string,
  contexte: ContexteControle = CONTEXTE_DU_DEPOT,
  signee: boolean = structureSignee(),
): Promise<DetailVersionUsage | null> {
  const v = await prisma.ficheUsageVersion.findUnique({
    where: { id },
    select: {
      id: true,
      ficheId: true,
      numero: true,
      contenu: true,
      structureSha256: true,
      modeleRedaction: true,
      modeleContreLecture: true,
      versionConsigne: true,
      creeLe: true,
      actes: { orderBy: { ordre: 'desc' }, select: { ...SELECTION_ACTE, rubrique: true } },
    },
  });
  if (!v) return null;

  // Le refus `version_depassee` de la décision, lu d'avance : l'écran ne
  // propose pas un geste que le serveur refusera.
  const attendues = rubriquesAttendues(v.ficheId, contexte);
  const plusRecentes = await prisma.ficheUsageVersion.findMany({
    where: { ficheId: v.ficheId, numero: { gt: v.numero } },
    select: { contenu: true, structureSha256: true, actes: { select: { ...SELECTION_ACTE, rubrique: true } } },
  });
  const depassee = plusRecentes.some(
    p =>
      etatDeLaVersion(
        { structureSha256: p.structureSha256, rubriques: rubriquesLues(p.contenu, p.actes) },
        { empreinteStructure: contexte.empreinte, rubriquesAttendues: attendues },
      ).etat === 'validee',
  );

  const lues = rubriquesLues(v.contenu, v.actes);
  const contenu = v.contenu as Record<string, unknown>;
  const rubriques: RubriqueDetaillee[] = lues
    .map(r => {
      const texte = typeof contenu[r.rubrique] === 'string' ? (contenu[r.rubrique] as string) : '';
      return {
        rubrique: r.rubrique,
        texte,
        empreinte: r.empreinte,
        etat: etatDuTexte(r.empreinte, r.actes),
        dernierActe: jetonDernierActe(r.actes),
        actes: r.actes.map(serialiserActe),
      };
    })
    .sort((a, b) => (RANG[a.rubrique] ?? Number.MAX_SAFE_INTEGER) - (RANG[b.rubrique] ?? Number.MAX_SAFE_INTEGER));

  return {
    id: v.id,
    ficheId: v.ficheId,
    numero: v.numero,
    creeLe: v.creeLe.toISOString(),
    modeleRedaction: v.modeleRedaction,
    modeleContreLecture: v.modeleContreLecture,
    versionConsigne: v.versionConsigne,
    structureDuJour: v.structureSha256 === contexte.empreinte,
    structureSignee: signee,
    etat: etatDeLaVersion(
      { structureSha256: v.structureSha256, rubriques: lues },
      { empreinteStructure: contexte.empreinte, rubriquesAttendues: attendues },
    ),
    depassee,
    rubriques,
  };
}
