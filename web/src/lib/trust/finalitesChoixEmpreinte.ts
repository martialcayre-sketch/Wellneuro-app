import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { FINALITES } from './finalitesChoix';

/**
 * Empreinte VIVANTE de la formulation servie — jamais un littéral recopié.
 *
 * SÉPARÉ DE `finalitesChoix.ts` POUR UNE RAISON DE BUNDLE, et le dépôt l'a payée
 * en T2 rouge : ce module-ci importe `node:crypto` par `canonicalSha256`, et
 * `finalitesChoix.ts` est importé par un composant `'use client'`. Les mélanger
 * fait échouer le build webpack (`UnhandledSchemeError`), pas seulement un banc.
 *
 * N'importer ceci que depuis un contexte serveur ou un banc.
 */
export const FORMULATION_CHOIX_SHA256 = canonicalSha256(FINALITES);
