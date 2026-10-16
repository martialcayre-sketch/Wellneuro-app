// LE CONTRÔLE D'UN TEXTE CONTRE LA STRUCTURE SIGNÉE ([[D-314]] §2, §3, §5) — pur.
//
// Partagé par la voie de dépôt et par la décision du responsable, sans que
// l'une importe l'autre (`DC-16`). Un texte n'a de sens que pour la structure
// qu'il rédige : une fiche que la structure ne déclare pas, des rubriques qui
// ne sont pas celles qu'elle attend, ou une structure qui n'est plus celle du
// jour, et le texte est refusé — au dépôt comme à la validation.
//
// La structure et son empreinte sont injectables pour les bancs ; par défaut,
// celles du dépôt.

import {
  FICHES_USAGE_BESOIN2_SHA256,
  FICHES_USAGE_BESOIN2_V1,
  ficheDeLaStructure,
  type StructureFichesUsage,
} from './ficheUsageBesoin2V1';
import type { NatureLibelle } from './vocabulaire';

export type AnomalieStructure =
  | { code: 'fiche_hors_structure' }
  | { code: 'terme_hors_structure' }
  | { code: 'nature_divergente' }
  | { code: 'structure_perimee' }
  | { code: 'rubriques_non_conformes'; manquantes: string[]; enTrop: string[] };

export type ContexteControle = { structure: StructureFichesUsage; empreinte: string };

export const CONTEXTE_DU_DEPOT: ContexteControle = {
  structure: FICHES_USAGE_BESOIN2_V1,
  empreinte: FICHES_USAGE_BESOIN2_SHA256,
};

/** Les rubriques que la structure attend pour cette fiche, ou `null` si elle ne la déclare pas. */
export function rubriquesAttendues(ficheId: string, contexte: ContexteControle = CONTEXTE_DU_DEPOT): readonly string[] | null {
  return ficheDeLaStructure(ficheId, contexte.structure)?.rubriques ?? null;
}

export function controlerVersionContreStructure(
  version: { ficheId: string; rubriques: readonly string[]; structureSha256: string },
  contexte: ContexteControle = CONTEXTE_DU_DEPOT,
): AnomalieStructure[] {
  const attendues = rubriquesAttendues(version.ficheId, contexte);
  if (attendues === null) return [{ code: 'fiche_hors_structure' }];
  const anomalies: AnomalieStructure[] = [];
  if (version.structureSha256 !== contexte.empreinte) anomalies.push({ code: 'structure_perimee' });
  const presentes = new Set(version.rubriques);
  const manquantes = attendues.filter(r => !presentes.has(r));
  const enTrop = version.rubriques.filter(r => !attendues.includes(r));
  if (manquantes.length > 0 || enTrop.length > 0) anomalies.push({ code: 'rubriques_non_conformes', manquantes, enTrop });
  return anomalies;
}

export function controlerLibelleContreStructure(
  libelle: { termeId: string; nature: NatureLibelle | string; structureSha256: string },
  contexte: ContexteControle = CONTEXTE_DU_DEPOT,
): AnomalieStructure[] {
  const liste = libelle.nature === 'hypothese' ? contexte.structure.hypotheses : contexte.structure.populations;
  const declare = contexte.structure.hypotheses.includes(libelle.termeId) || contexte.structure.populations.includes(libelle.termeId);
  if (!declare) return [{ code: 'terme_hors_structure' }];
  const anomalies: AnomalieStructure[] = [];
  // La base tient nature ⇔ préfixe ; ceci tient nature ⇔ liste de la structure.
  if (!liste.includes(libelle.termeId)) anomalies.push({ code: 'nature_divergente' });
  if (libelle.structureSha256 !== contexte.empreinte) anomalies.push({ code: 'structure_perimee' });
  return anomalies;
}
