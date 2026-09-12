import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle — préalable au gate G4 (identité patient durable).
//
// Le portail patient garde trois traces dans le navigateur : les brouillons du
// wizard (fiche, anamnèse), le brouillon du Journal Alimentaire, et
// l'instantané « depuis la dernière visite ». Toutes étaient nommées d'après le
// jeton de l'URL. Deux conséquences, et la seconde n'est pas cosmétique :
//
// 1. le jeton est un secret d'accès — il n'a rien à faire dans une clé de
//    stockage, lisible par tout script de l'origine et persistante en
//    `localStorage` ;
// 2. le jeton est appelé à changer (lien magique à consommation unique). Une
//    trace indexée dessus devient introuvable au lien suivant, alors que la
//    personne, elle, n'a pas changé — et c'est exactement la reprise à
//    plusieurs mois que SP-SPI attend.
//
// Le test lit les sources plutôt que le comportement : une régression ici se
// réintroduit par un `${token}` recopié, pas par une logique fautive.

const RACINE = join(__dirname, '..');

// `lib/portail-visite.ts` figurait ici et n'existe plus : l'instantané « depuis
// votre dernière visite » a été retiré avec le journal rétrospectif
// (2026-09-12). Le banc plus bas EXIGE au moins une clé par surface listée —
// laisser l'entrée aurait fait échouer la lecture du fichier, pas simplement
// passer à vide, ce qui est le bon comportement pour une garde.
const SURFACES = [
  'app/portail/[token]/page.tsx',
  'components/food-observation/PatientFoodObservationPanel.tsx',
];

describe('clés de stockage local du portail patient', () => {
  it.each(SURFACES)('%s ne nomme aucune clé d’après le jeton de lien', (chemin) => {
    const source = readFileSync(join(RACINE, chemin), 'utf8');
    const lignesDeCle = source
      .split('\n')
      .filter(ligne => ligne.includes('wellneuro:') && !ligne.trimStart().startsWith('//'));

    // Si le filtre ne trouve plus rien, c'est le test qui a cessé de regarder,
    // pas le code qui s'est assaini.
    expect(lignesDeCle.length).toBeGreaterThan(0);
    for (const ligne of lignesDeCle) {
      expect(ligne).not.toMatch(/token/i);
    }
  });

  // RETIRÉ LE 2026-09-12 — « le hub questionnaires date sa visite d'après le
  // patient, pas d'après le lien ». Son sujet n'existe plus : le hub ne garde
  // AUCUNE trace locale depuis le retrait de l'instantané « depuis votre
  // dernière visite ». Un banc dont l'objet a disparu ne garde pas moins, il
  // garde du vide — et sa présence laisserait croire qu'une surface est
  // surveillée alors qu'elle n'écrit plus rien.

  it('le panneau du Journal Alimentaire ne reçoit plus le jeton du tout', () => {
    const source = readFileSync(join(RACINE, 'components/food-observation/PatientFoodObservationPanel.tsx'), 'utf8');
    // Le jeton ne descend plus jusqu'au composant : il ne peut donc plus
    // réapparaître dans une clé par simple copier-coller.
    expect(source).not.toMatch(/\btoken\b/);
  });
});
