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

  it('un aperçu périmé recharge l’état de diffusion ET les versions — l’aperçu à jour s’affiche', () => {
    // Les versions aussi : le clic vise la version active de l'état LOCAL, et
    // un état local en retard renverrait le même refus sans fin.
    expect(corpsDuClic()).toMatch(
      /payload\.reason === 'apercu_fiches_perime'\) \{\s*await Promise\.all\(\[loadVersions\(readyDecisionCardId\), loadDiffusion\(readyDecisionCardId\)\]\)/,
    );
  });

  it('une lecture manquée de l’état de diffusion efface l’aperçu des fiches', () => {
    const debut = SOURCE.indexOf('const loadDiffusion = useCallback');
    const corps = SOURCE.slice(debut, SOURCE.indexOf('}, [idPatient]);', debut));
    // Deux chemins d'échec — réponse en erreur, exception —, deux effacements.
    expect(corps.match(/setApercuFiches\(null\)/g)?.length).toBe(2);
  });

  it('le panneau reçoit l’aperçu des fiches', () => {
    expect(SOURCE).toMatch(/fiches=\{apercuFiches\}/);
  });
});

// L'E-MAIL NEUTRE ([[D-251]] §9, lot 11 ; revue Copilot de #1249) : le praticien
// le sait AVANT le clic, et apprend APRÈS s'il est parti. Un cockpit qui jetait
// `annonceFiches` faisait ressembler un échec à un succès.
describe('Cockpit — l’e-mail neutre, dit avant et après le clic', () => {
  it('la lecture de l’état de diffusion pose « un e-mail suivrait »', () => {
    expect(SOURCE).toMatch(/setAnnonceParEmail\(payload\.annonceParEmail === true\)/);
  });

  it('le clic efface l’avis précédent, puis pose le sort de SON e-mail', () => {
    const corps = corpsDuClic();
    expect(corps).toMatch(/setAnnonceFiches\(null\)/);
    expect(corps).toMatch(/setAnnonceFiches\(payload\.annonceFiches \?\? null\)/);
    expect(corps.indexOf('setAnnonceFiches(null)')).toBeLessThan(corps.indexOf('fetch('));
  });

  it('le panneau reçoit les deux', () => {
    expect(SOURCE).toMatch(/annonceParEmail=\{annonceParEmail\}/);
    expect(SOURCE).toMatch(/annonce=\{annonceFiches\}/);
  });
});

// LE COURRIER POUR LE MÉDECIN ([[D-262]], LOT-03b) : le praticien le voit AVANT
// le clic. Son identifiant voyage dans le jeton des fiches, déjà envoyé — seul
// l'affichage est à câbler, et à effacer comme l'aperçu des fiches.
describe('Cockpit — l’aperçu du courrier pour le médecin', () => {
  it('la lecture de l’état de diffusion pose l’aperçu de la lettre, et l’efface sur les deux échecs', () => {
    expect(SOURCE).toMatch(/setApercuLettre\(payload\.lettre \?\? null\)/);
    const debut = SOURCE.indexOf('const loadDiffusion = useCallback');
    const corps = SOURCE.slice(debut, SOURCE.indexOf('}, [idPatient]);', debut));
    expect(corps.match(/setApercuLettre\(null\)/g)?.length).toBe(2);
  });

  it('le panneau reçoit l’aperçu de la lettre', () => {
    expect(SOURCE).toMatch(/lettre=\{apercuLettre\}/);
  });
});
