import type { SyntheseSchema } from '@/lib/anthropic';

/**
 * Longueur maximale d'un point de vigilance ou d'une question, à
 * l'enregistrement d'un brouillon praticien. Exportée depuis le LOT-09 : les
 * vigilances de discordance sont composées par le déterministe, et un banc doit
 * pouvoir vérifier qu'aucune règle de la table ne dépasse ce plafond. Le
 * dépassement se manifesterait par un refus d'enregistrement dont le message ne
 * nomme pas la cause.
 */
export const LONGUEUR_MAX_POINT = 500;

export const MODELE_REDACTION_PRATICIEN = 'redaction-praticien';
export const VERSION_SYNTHESE_PRATICIEN = 'synthese-praticien-v1';
export const LIMITE_SYNTHESE_PRATICIEN =
  'Synthèse rédigée par le praticien et soumise à sa validation avant diffusion.';

const PRIORITES = new Set(['eleve', 'modere', 'faible']);

type ValidationBrouillon =
  | { ok: true; synthese: SyntheseSchema }
  | { ok: false; error: string };

export function estRedactionPraticien(modele: string): boolean {
  return modele === MODELE_REDACTION_PRATICIEN;
}

export function nouveauBrouillonPraticien(): SyntheseSchema {
  return {
    resume_praticien: '',
    axes_prioritaires: [],
    points_de_vigilance: [],
    questions_entretien: [],
    narratif_patient: '',
    limites: LIMITE_SYNTHESE_PRATICIEN,
    _schema_version: VERSION_SYNTHESE_PRATICIEN,
  };
}

function texte(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const nettoye = value.trim();
  if (nettoye.length > max) return null;
  return nettoye;
}

function listeTextes(value: unknown, maxItems: number, maxItemLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items: string[] = [];
  for (const item of value) {
    const nettoye = texte(item, maxItemLength);
    if (nettoye === null) return null;
    if (nettoye) items.push(nettoye);
  }
  return items;
}

export function validerBrouillonPraticien(input: unknown): ValidationBrouillon {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Brouillon praticien invalide.' };
  }

  const source = input as Record<string, unknown>;
  const resume = texte(source.resume_praticien, 4000);
  const narratif = texte(source.narratif_patient, 12000);
  if (!resume) {
    return { ok: false, error: 'Le résumé interne praticien est requis.' };
  }
  if (!narratif) {
    return { ok: false, error: 'Le texte destiné au patient est requis.' };
  }

  if (!Array.isArray(source.axes_prioritaires) || source.axes_prioritaires.length > 3) {
    return { ok: false, error: 'Le brouillon accepte au maximum 3 axes prioritaires.' };
  }

  const axes: SyntheseSchema['axes_prioritaires'] = [];
  for (const valeur of source.axes_prioritaires) {
    if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) {
      return { ok: false, error: 'Un axe prioritaire est invalide.' };
    }
    const axeSource = valeur as Record<string, unknown>;
    const axe = texte(axeSource.axe, 160);
    const priorite = axeSource.niveau_priorite;
    const argumentsAxe = listeTextes(axeSource.arguments, 12, 500);
    const pointsAConfirmer = listeTextes(axeSource.points_a_confirmer, 12, 500);
    if (!axe || typeof priorite !== 'string' || !PRIORITES.has(priorite) || !argumentsAxe || !pointsAConfirmer) {
      return { ok: false, error: 'Complétez correctement chaque axe prioritaire.' };
    }
    axes.push({
      axe,
      niveau_priorite: priorite as 'eleve' | 'modere' | 'faible',
      arguments: argumentsAxe,
      points_a_confirmer: pointsAConfirmer,
    });
  }

  const vigilance = listeTextes(source.points_de_vigilance, 20, LONGUEUR_MAX_POINT);
  const questions = listeTextes(source.questions_entretien, 20, LONGUEUR_MAX_POINT);
  if (!vigilance || !questions) {
    return { ok: false, error: 'Les listes du brouillon contiennent trop d’éléments ou un texte trop long.' };
  }

  return {
    ok: true,
    synthese: {
      resume_praticien: resume,
      axes_prioritaires: axes,
      points_de_vigilance: vigilance,
      questions_entretien: questions,
      narratif_patient: narratif,
      limites: LIMITE_SYNTHESE_PRATICIEN,
      _schema_version: VERSION_SYNTHESE_PRATICIEN,
    },
  };
}
