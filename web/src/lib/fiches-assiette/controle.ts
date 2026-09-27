// LES CONTRÔLES D'UNE FICHE D'ASSIETTE CONTRE LE CORPUS ET LA TABLE SIGNÉE
// ([[D-251]] §5 et §6) — sans écriture.
//
// OÙ ILS SONT REJOUÉS : au dépôt d'un brouillon (`ingestion.ts`), à la
// validation par le responsable (`decision.ts`), et plus tard au moment de
// servir la fiche (« contrôlée à la validation, puis rejouée au moment de
// servir », §6). Un seul module pour les trois : trois copies divergeraient.
//
// MODULE NEUTRE, comme `claimsCites.ts` : ni le dépôt ni la décision ne
// s'importent l'un l'autre (`DC-16`, garde `catalogue.guard.test.ts`).

import type { Prisma } from '@/generated/prisma';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { cleClaim } from '@/lib/rag/claims/validite';
import { ficheSourceDeLAssiette } from './appariement';
import { claimsValidesEtLeursTextes, clesCiteesDuContenu, referenceDeCle } from './claimsCites';
import { ErreurContratFiche, lireContenuFiche } from './contrat';
import { controlerFiche, type AnomalieFiche } from './invariants';
import { clesSecuriteDeLAssiette } from './securite';
import type { ContenuFicheAssiette } from './types';

type ClientLecture = Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Une anomalie du contenu : celles de `controlerFiche`, et un claim cité non VALIDE. */
export type AnomalieContenu = AnomalieFiche | { code: 'claim_non_valide'; detail: string };

/** Une anomalie d'une version en base : son contenu, plus ce que la base porte autour. */
export type AnomalieVersion =
  | AnomalieContenu
  | { code: 'contenu_illisible' | 'empreinte_divergente' | 'appariement_divergent'; detail: string };

export type EntreesContenu = {
  contenu: ContenuFicheAssiette;
  sourceId: string;
  plateCode: string;
  texteSource: string;
};

/**
 * Les anomalies d'un contenu, et les claims cités VALIDE avec leur texte.
 * Aucune anomalie est la seule issue qui autorise la suite.
 */
export async function controlerContenuFiche(
  entrees: EntreesContenu,
  client?: ClientLecture,
): Promise<{ anomalies: AnomalieContenu[]; claimsValides: Map<string, string> }> {
  const references = clesCiteesDuContenu(entrees.contenu)
    .map(referenceDeCle)
    // Une clé mal formée n'est pas cherchée : `controlerFiche` la nomme.
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const claimsValides = await claimsValidesEtLeursTextes(references, client);
  const anomalies: AnomalieContenu[] = references
    .filter(r => !claimsValides.has(cleClaim(r)))
    .map(r => ({ code: 'claim_non_valide' as const, detail: `${cleClaim(r)} n'est pas un claim VALIDE du corpus.` }));

  anomalies.push(
    ...controlerFiche({
      contenu: entrees.contenu,
      sourceIdFiche: entrees.sourceId,
      texteSource: entrees.texteSource,
      textesClaimsCites: [...claimsValides.values()],
      clesSecuriteAttendues: clesSecuriteDeLAssiette(entrees.plateCode),
    }),
  );
  return { anomalies, claimsValides };
}

export type VersionAControler = {
  sourceId: string;
  plateCode: string;
  contenu: unknown;
  contenuSha256: string;
  texteSource: string;
};

/**
 * Une version EN BASE, rejouée entière. Au-delà du contenu, ce que la base
 * porte autour de lui : un JSON que le contrat relit, une empreinte qui redonne
 * celle rangée, et l'appariement assiette → fiche. Un contenu illisible n'est
 * jamais « à valider » : c'est une anomalie, et rien n'est contrôlé de plus.
 */
export async function controlerVersion(
  version: VersionAControler,
  client?: ClientLecture,
): Promise<{ contenu: ContenuFicheAssiette | null; anomalies: AnomalieVersion[]; claimsValides: Map<string, string> }> {
  let contenu: ContenuFicheAssiette;
  try {
    contenu = lireContenuFiche(version.contenu);
  } catch (e) {
    const detail = e instanceof ErreurContratFiche ? e.message : 'Contenu illisible.';
    return { contenu: null, anomalies: [{ code: 'contenu_illisible', detail }], claimsValides: new Map() };
  }

  const anomalies: AnomalieVersion[] = [];
  if (canonicalSha256(contenu) !== version.contenuSha256) {
    anomalies.push({ code: 'empreinte_divergente', detail: 'Le contenu ne redonne pas son empreinte rangée en base.' });
  }
  if (ficheSourceDeLAssiette(version.plateCode) !== version.sourceId) {
    anomalies.push({
      code: 'appariement_divergent',
      detail: `${version.sourceId} n'est pas la fiche de ${version.plateCode}.`,
    });
  }
  const controle = await controlerContenuFiche(
    { contenu, sourceId: version.sourceId, plateCode: version.plateCode, texteSource: version.texteSource },
    client,
  );
  anomalies.push(...controle.anomalies);
  return { contenu, anomalies, claimsValides: controle.claimsValides };
}
