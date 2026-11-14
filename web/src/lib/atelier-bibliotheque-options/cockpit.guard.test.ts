import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RACINE, retirerLignesDeCommentaire } from '../bio-parcours/balayageSources';
import { contexteResolution, importsResolus } from '../bio-parcours/resolutionImports';

// GARDE : LE COCKPIT NE CHOISIT RIEN D'APRÈS LE DOSSIER ([[D-480]] §1, §5.4 ;
// cadrage BIO-PARCOURS v3 `:260` ; `wn-reviewer` sur la PR 6, P2-2).
//
// `aucuneLectureDeDossier.guard.test.ts` ferme `bibliotheque-options/` ; le
// cockpit, lui, atteint la base par `lecture.ts` et il est appelé par une route
// qui lit le dossier. Ce banc tient ce que la règle exige de lui :
//   1. ses imports de valeur sont EXACTEMENT le drapeau, la lecture des textes
//      de la bibliothèque et la structure de références — aucun service, aucun
//      client, aucune lecture du dossier ;
//   2. son code ne nomme aucun accès au dossier ni au monde extérieur ;
//   3. la route ne lui passe que la liste des codes d'hypothèse dont la tête
//      est confirmée — rien d'autre du dossier.
// Une retouche qui élargit l'un des trois rougit ici et se relit avant d'entrer.

const COCKPIT = 'web/src/lib/atelier-bibliotheque-options/cockpit.ts';
const ROUTE = 'web/src/app/api/praticien/biologie/constats/route.ts';
const IMPORTS_ADMIS = ['drapeau', 'lecture', 'structure'].map(m => `web/src/lib/atelier-bibliotheque-options/${m}.ts`);

// Le dossier et le monde extérieur, nommés : client de base, modèles du
// dossier, variables d'environnement, réseau, accès globaux.
const ACCES_INTERDIT =
  /\bprisma\b|\$queryRaw|\bpatient|\bidPatient\b|questionnaire|resultat|traitement|constat|\bprocess\b|\bfetch\b|globalThis|\bwindow\b|\bdocument\b|\brequire\s*\(|\bimport\s*\(/i;

const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8');

function importsDeValeur(source?: string) {
  return importsResolus(COCKPIT, contexteResolution(), source).filter(i => !i.typeSeul);
}

describe('Bibliothèque des options au cockpit — aucune sélection d’après le dossier (D-480 §5.4)', () => {
  it('les imports de valeur de `cockpit.ts` sont exactement le drapeau, la lecture et la structure', () => {
    const imports = importsDeValeur();
    expect(imports.filter(i => i.indetermine)).toEqual([]);
    expect(imports.map(i => i.atteint).sort()).toEqual([...IMPORTS_ADMIS].sort());
  });

  it('le code de `cockpit.ts` ne nomme aucun accès au dossier ni au monde extérieur', () => {
    const code = retirerLignesDeCommentaire(lire(COCKPIT));
    expect(code.match(ACCES_INTERDIT)?.[0] ?? null).toBeNull();
  });

  it('la route ne passe au cockpit que les codes des hypothèses dont la tête est confirmée', () => {
    const code = retirerLignesDeCommentaire(lire(ROUTE));
    const appels = [...code.matchAll(/lireOptionsAuCockpit\s*\(([^)]*)\)/g)].map(m => m[1].trim());
    expect(appels).toEqual(['confirmees']);
    expect(code).toContain(
      "const confirmees = constats.hypotheses.filter(h => h.tete?.verdict === 'confirmee').map(h => h.hypotheseCode);",
    );
  });

  // CONTRE-ÉPREUVE : une retouche qui ferait lire le dossier rougit.
  it('la garde rougit sur une source fabriquée (elle n’est pas décorative)', () => {
    const avec = (ligne: string) => `${lire(COCKPIT)}\n${ligne}\n`;
    expect(importsDeValeur(avec("import { prisma } from '@/lib/prisma';")).map(i => i.atteint)).toContain('web/src/lib/prisma.ts');
    expect(importsDeValeur(avec('const m = await import(chemin);')).some(i => i.indetermine)).toBe(true);
    for (const ligne of [
      'const p = await prisma.patient.findUnique({});',
      'export function f(idPatient: string) {}',
      'const t = traitementsDuDossier;',
      'const e = process.env.X;',
    ]) {
      expect(ACCES_INTERDIT.test(retirerLignesDeCommentaire(ligne)), ligne).toBe(true);
    }
    expect(importsDeValeur("import type { X } from '@/lib/prisma';")).toEqual([]);
  });
});
