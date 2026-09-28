import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : LE COCKPIT PORTE LE JETON DE L'APERÇU DES FICHES AU CLIC
// ([[D-251]] §7, lot 8 ; arbitrage du 2026-09-28 : « refuser et remontrer »).
//
// La route refuse un clic sans jeton, ou dont l'aperçu a changé. Deux oublis du
// cockpit la rendraient fausse sans qu'aucun banc de route ne le voie :
//   — ne pas envoyer le jeton : TOUS les clics seraient refusés, drapeau ouvert ;
//   — ne pas recharger l'aperçu sur ce refus : le praticien lirait « il vient
//     d'être mis à jour » au-dessus de l'aperçu PÉRIMÉ, et recliquerait dessus.
// Aucun banc de composant n'atteint la sous-vue Diffusion — il faudrait y
// monter tout le parcours des versions —, d'où cette garde de source, étroite.

const SOURCE = readFileSync(
  path.join(process.cwd(), 'src', 'components', 'patient-cockpit', 'ClinicalRuntimeSection.tsx'),
  'utf8',
);

/** Le corps de `approveForDiffusion`, du `const` à la fonction suivante. */
function corpsDuClic(): string {
  const debut = SOURCE.indexOf('const approveForDiffusion = async');
  const fin = SOURCE.indexOf('\n  const ', debut + 1);
  expect(debut, 'approveForDiffusion introuvable').toBeGreaterThan(-1);
  return SOURCE.slice(debut, fin);
}

describe('Cockpit — le jeton de l’aperçu des fiches au clic « Valider pour diffusion »', () => {
  it('la lecture de l’état de diffusion pose l’aperçu des fiches', () => {
    expect(SOURCE).toMatch(/setApercuFiches\(payload\.fiches \?\? null\)/);
  });

  it('le clic envoie le jeton de l’aperçu AFFICHÉ', () => {
    expect(corpsDuClic()).toMatch(/jetonApercuFiches:\s*apercuFiches\?\.jeton/);
  });

  it('un aperçu périmé recharge l’état de diffusion — l’aperçu à jour s’affiche', () => {
    expect(corpsDuClic()).toMatch(/payload\.reason === 'apercu_fiches_perime'\)\s*await loadDiffusion\(/);
  });

  it('le panneau reçoit l’aperçu des fiches', () => {
    expect(SOURCE).toMatch(/fiches=\{apercuFiches\}/);
  });
});
