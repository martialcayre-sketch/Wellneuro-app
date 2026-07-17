import { VERSION_REGISTRE_MARQUEURS } from './types';
import type { MomentPrise } from './types';

/**
 * Registre de marqueurs pilotes (JA-00 A1, validé praticien le 2026-07-17).
 *
 * Libellés de travail des 12 vedettes C5A uniquement — aucun code Ciqual
 * (résolus au C5A LOT-02), aucune valeur nutritionnelle (A7-12). Le reste
 * des 191 aliments moyens Ciqual est une référence documentaire, non pilote :
 * aucun marqueur supplémentaire sans nouvel audit.
 */
export const REGISTRE_MARQUEURS_VERSION = VERSION_REGISTRE_MARQUEURS;

export const MARQUEURS_VEDETTES: readonly string[] = [
  'sardine (conserve)',
  'maquereau',
  'huile d’olive vierge extra',
  'huile de colza',
  'lentilles cuites',
  'pois chiches cuits',
  'noix',
  'flocons d’avoine',
  'pain complet',
  'brocoli cuit',
  'épinards cuits',
  'myrtille',
] as const;

/**
 * Marqueurs structurels (déclaratifs, sans pesée ni quantité) : structure des
 * prises, moment approximatif, contexte.
 */
export const MOMENTS_PRISE: readonly MomentPrise[] = ['matin', 'midi', 'soir', 'hors_repas'] as const;

export const CONTEXTES_PRISE: readonly string[] = [
  'seul·e',
  'accompagné·e',
  'domicile',
  'extérieur',
] as const;

export function isMarqueurVedette(label: string): boolean {
  return MARQUEURS_VEDETTES.includes(label);
}
