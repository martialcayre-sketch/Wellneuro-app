import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// [[D-335]] §8 (BP-13) — dans la préparation de la synthèse, les traitements
// en vigueur ne nourrissent QUE la ligne de vigilance, sous drapeau, et leur
// lecture vit dans son propre `try` : un échec n'emporte ni le contexte de
// l'anamnèse ni ses signaux d'alerte (revue `wn-reviewer` de la PR 2). Aucun
// banc n'exerce `preparerGeneration` de bout en bout ; celui-ci épingle la
// forme du code.

const SOURCE = readFileSync(path.join(__dirname, '..', 'synthese', 'generation.ts'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Synthèse — les traitements en vigueur, vigilance seule ([[D-335]] §8)', () => {
  it('une seule lecture, sous le drapeau, dans un `try` à elle', () => {
    expect(SOURCE.match(/lireTraitementsEnVigueur\(/g)).toHaveLength(1);
    expect(SOURCE).toMatch(
      /if \(isPhysioTraitementsEnabled\(\)\) \{\s*try \{\s*const lignesEnVigueur = await lireTraitementsEnVigueur\(prisma, idPatient\);\s*vigilanceDeterministe = extraireVigilanceDeterministe\(anamnesePourConstats, lignesEnVigueur\);\s*\} catch/,
    );
  });

  it('le texte transmis à l’IA ne reçoit pas les lignes', () => {
    const appel = SOURCE.match(/buildUserMessage\(([^)]*)\)/g) ?? [];
    expect(appel.length).toBeGreaterThan(0);
    for (const a of appel) expect(a).not.toMatch(/lignesEnVigueur|traitement/i);
    expect(SOURCE).toMatch(/buildContexteClinique\(consultation\.ficheSignaletique, consultation\.anamnese\)/);
  });
});
