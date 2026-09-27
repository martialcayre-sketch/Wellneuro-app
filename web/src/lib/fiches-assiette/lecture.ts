// LA LECTURE DU CATALOGUE DES FICHES D'ASSIETTE POUR LE RESPONSABLE ([[D-251]]
// §5, lot 6) — le rayon « Fiches conseils » de la Bibliothèque. Sans écriture.
//
// LA LISTE : les douze assiettes d'indication, chacune avec sa dernière version
// et son état, plus la dernière version VALIDÉE quand ce n'est pas la même.
// « Absente » (aucune version) et « statut illisible » sont deux états
// distincts, et aucun des deux ne se lit « non validée » (`DC-24`).
//
// LE DÉTAIL : tout ce que la relecture côte à côte exige — le texte source, le
// contenu adapté, le texte de chaque claim cité, les réserves de sécurité
// attendues — et les contrôles REJOUÉS au moment de la lecture : une version
// validée hier peut ne plus être servable aujourd'hui (réserve publiée depuis,
// claim retiré), et le responsable doit le voir avant de rien décider.
//
// LE TEXTE NE SORT QUE VERS L'ÉCRAN DU RESPONSABLE, jamais vers un journal
// ([[D-251]] §4).

import { getRecommendedPlate } from '@/lib/food-compass/plates';
import { prisma } from '@/lib/prisma';
import { FICHE_MY_PAR_ASSIETTE } from './appariement';
import { claimsValidesEtLeursTextes, clesCiteesDuContenu, referenceDeCle } from './claimsCites';
import { controlerVersion, type AnomalieVersion } from './controle';
import {
  derniereVersionValidee,
  etatDeLaVersion,
  jetonDernierActe,
  serialiserActe,
  type ActeSerialise,
  type EtatVersion,
} from './etat';
import { clesSecuriteDeLAssiette } from './securite';
import type { ContenuFicheAssiette } from './types';

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  contenuSha256: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

export type ResumeVersion = {
  id: string;
  numero: number;
  creeLe: string;
  contenuSha256: string;
  etat: EtatVersion;
};

export type LigneRayonFiche = {
  plateCode: string;
  libelle: string;
  sourceId: string;
  nbVersions: number;
  /** `null` : aucune version déposée — l'état « absente ». */
  derniere: ResumeVersion | null;
  /** La version servie, quand ce n'est pas la dernière. */
  derniereValidee: ResumeVersion | null;
};

function libelleDe(plateCode: string): string {
  return getRecommendedPlate(plateCode)?.label ?? plateCode;
}

export async function lireRayonFichesConseils(): Promise<LigneRayonFiche[]> {
  const versions = await prisma.ficheAssietteVersion.findMany({
    where: { sourceId: { in: Object.values(FICHE_MY_PAR_ASSIETTE) } },
    orderBy: [{ sourceId: 'asc' }, { numero: 'desc' }],
    select: {
      id: true,
      sourceId: true,
      numero: true,
      creeLe: true,
      contenuSha256: true,
      actes: { orderBy: { ordre: 'desc' }, take: 1, select: SELECTION_ACTE },
    },
  });

  return Object.entries(FICHE_MY_PAR_ASSIETTE).map(([plateCode, sourceId]) => {
    const resumes: ResumeVersion[] = versions
      .filter(v => v.sourceId === sourceId)
      .map(v => ({
        id: v.id,
        numero: v.numero,
        creeLe: v.creeLe.toISOString(),
        contenuSha256: v.contenuSha256,
        etat: etatDeLaVersion(v, v.actes),
      }));
    const derniere = resumes[0] ?? null;
    const validee = derniereVersionValidee(resumes);
    return {
      plateCode,
      libelle: libelleDe(plateCode),
      sourceId,
      nbVersions: resumes.length,
      derniere,
      derniereValidee: validee && validee.id !== derniere?.id ? validee : null,
    };
  });
}

export type ClaimCite = {
  cle: string;
  /** `null` : le claim n'est pas VALIDE au corpus aujourd'hui (ou n'existe pas). */
  texte: string | null;
  /** Une réserve de sécurité que les précautions doivent porter (§6). */
  reserveAttendue: boolean;
};

export type DetailVersionFiche = {
  id: string;
  sourceId: string;
  plateCode: string;
  libelle: string;
  numero: number;
  creeLe: string;
  /** `null` : le JSON rangé en base ne se relit pas par le contrat. */
  contenu: ContenuFicheAssiette | null;
  texteSource: string;
  sourceSha256: string;
  contenuSha256: string;
  modeleRedaction: string;
  modeleFidelite: string;
  versionConsigne: string;
  etat: EtatVersion;
  /** Le jeton que l'écran renvoie avec un acte : `ordre` du dernier acte, ou `null`. */
  dernierActe: string | null;
  /** Du plus récent au plus ancien, au sens d'`ordre`. */
  actes: ActeSerialise[];
  autresVersions: { id: string; numero: number; etat: EtatVersion }[];
  claimsCites: ClaimCite[];
  /** Les contrôles rejoués à la lecture : vide, la version est validable. */
  anomalies: AnomalieVersion[];
};

export async function lireVersionFiche(idVersion: string): Promise<DetailVersionFiche | null> {
  const v = await prisma.ficheAssietteVersion.findUnique({
    where: { id: idVersion },
    select: {
      id: true,
      sourceId: true,
      plateCode: true,
      numero: true,
      creeLe: true,
      contenu: true,
      contenuSha256: true,
      texteSource: true,
      sourceSha256: true,
      modeleRedaction: true,
      modeleFidelite: true,
      versionConsigne: true,
      actes: { orderBy: { ordre: 'desc' }, select: SELECTION_ACTE },
    },
  });
  if (!v) return null;

  const [controle, soeurs] = await Promise.all([
    controlerVersion(v),
    prisma.ficheAssietteVersion.findMany({
      where: { sourceId: v.sourceId, id: { not: v.id } },
      orderBy: { numero: 'desc' },
      select: { id: true, numero: true, contenuSha256: true, actes: { orderBy: { ordre: 'desc' }, take: 1, select: SELECTION_ACTE } },
    }),
  ]);

  // Les textes de TOUTES les clés à relire — citées, et réserves attendues même
  // non citées : une précaution manquante se relit contre la réserve qu'elle
  // aurait dû porter. Les contrôles, eux, ne lisent que les clés citées.
  const reserves = new Set(clesSecuriteDeLAssiette(v.plateCode));
  const cles = [...new Set([...reserves, ...(controle.contenu ? clesCiteesDuContenu(controle.contenu) : [])])].sort();
  const textes = await claimsValidesEtLeursTextes(
    cles.map(referenceDeCle).filter((r): r is NonNullable<typeof r> => r !== null),
  );

  return {
    id: v.id,
    sourceId: v.sourceId,
    plateCode: v.plateCode,
    libelle: libelleDe(v.plateCode),
    numero: v.numero,
    creeLe: v.creeLe.toISOString(),
    contenu: controle.contenu,
    texteSource: v.texteSource,
    sourceSha256: v.sourceSha256,
    contenuSha256: v.contenuSha256,
    modeleRedaction: v.modeleRedaction,
    modeleFidelite: v.modeleFidelite,
    versionConsigne: v.versionConsigne,
    etat: etatDeLaVersion(v, v.actes),
    dernierActe: jetonDernierActe(v.actes),
    actes: v.actes.map(serialiserActe),
    autresVersions: soeurs.map(s => ({ id: s.id, numero: s.numero, etat: etatDeLaVersion(s, s.actes) })),
    claimsCites: cles.map(cle => ({ cle, texte: textes.get(cle) ?? null, reserveAttendue: reserves.has(cle) })),
    anomalies: controle.anomalies,
  };
}
