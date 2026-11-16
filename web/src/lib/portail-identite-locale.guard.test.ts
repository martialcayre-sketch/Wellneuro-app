import { readdirSync, readFileSync } from 'fs';
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

// LE SEGMENT LU PAR `useSegmentPage` ([[D-481]], DOC-14).
//
// Le segment `[token]` revient dans les composants par ce crochet, pour une
// seule fonction : l'en-tête `x-wn-dossier-page` (`enTeteDossierPage`). C'est
// le même jeton que plus haut : il ne doit jamais nommer une clé de stockage.
// Plutôt que de chercher les clés fautives, le banc borne les emplois : le
// segment est lié une fois (`const x = useSegmentPage()`), puis n'apparaît que
// dans `enTeteDossierPage(x)` ou dans le tableau de dépendances d'un crochet.
// Tout autre emploi — une clé, un argument de fonction, une copie — rougit.
// Les composants sont découverts, pas listés : un nouvel emploi est gardé
// sans qu'on pense à l'inscrire.

const CROCHET = 'lib/portail/useSegmentPage.ts';

function sansCommentaires(source: string): string {
  return source
    .split('\n')
    .filter(ligne => !/^\s*(\/\/|\/\*|\*)/.test(ligne))
    .join('\n');
}

/**
 * Efface `nom` des seuls tableaux de dépendances : le DERNIER argument d'un
 * appel à un crochet React qui en prend. Un tableau passé en dernier argument
 * à une autre fonction (`stocker('cle', [x])`) n'est pas une dépendance, et le
 * nom y reste visible (faux négatif relevé par PR-Agent sur #2168).
 */
function sansDependances(code: string, nom: string): string {
  const mot = new RegExp(`\\b${nom}\\b`, 'g');
  const plages: Array<[number, number]> = [];
  for (const appel of code.matchAll(/\buse(?:Effect|LayoutEffect|InsertionEffect|Callback|Memo|ImperativeHandle)\(/g)) {
    const debut = appel.index + appel[0].length;
    let profondeur = 1;
    let i = debut;
    for (; i < code.length && profondeur > 0; i++) {
      if ('([{'.includes(code[i])) profondeur++;
      else if (')]}'.includes(code[i])) profondeur--;
    }
    const corps = code.slice(debut, i - 1);
    const deps = /,\s*\[[^[\]]*\]\s*,?\s*$/.exec(corps);
    if (deps) plages.push([debut + deps.index, debut + corps.length]);
  }
  let resultat = code;
  for (const [a, b] of plages.reverse()) {
    resultat = resultat.slice(0, a) + resultat.slice(a, b).replace(mot, '') + resultat.slice(b);
  }
  return resultat;
}

/** Emplois du segment hors de l'en-tête et des dépendances ; `null` si le segment n'est pas lié une seule fois. */
function emploisHorsEnTete(source: string): string[] | null {
  const code = sansCommentaires(source).replace(/^import .*$/gm, '');
  const liaisons = [...code.matchAll(/const (\w+) = useSegmentPage\(\);/g)];
  const appels = code.match(/useSegmentPage\(/g) ?? [];
  if (liaisons.length !== 1 || appels.length !== 1) return null;
  const nom = liaisons[0][1];
  const reste = sansDependances(code, nom)
    .replace(liaisons[0][0], '')
    .replace(new RegExp(`enTeteDossierPage\\(${nom}\\)`, 'g'), '');
  const dansLaLigne = new RegExp(`\\b${nom}\\b`);
  return reste.split('\n').filter(ligne => dansLaLigne.test(ligne));
}

function emploisDuCrochet(): string[] {
  return (readdirSync(RACINE, { recursive: true }) as string[])
    .filter(chemin => /\.tsx?$/.test(chemin) && !/\.test\.tsx?$/.test(chemin) && chemin !== CROCHET)
    .filter(chemin => sansCommentaires(readFileSync(join(RACINE, chemin), 'utf8')).includes('useSegmentPage'))
    .sort();
}

describe('le segment lu par useSegmentPage ne sert que l’en-tête du dossier', () => {
  const composants = emploisDuCrochet();

  it('les composants qui l’emploient sont trouvés', () => {
    // Si la découverte ne trouve plus rien, c'est le banc qui a cessé de
    // regarder. Le panneau du Journal Alimentaire est le cas sensible : il
    // écrit en `sessionStorage` ET lit le segment.
    expect(composants).toContain('components/food-observation/PatientFoodObservationPanel.tsx');
  });

  it.each(composants)('%s n’emploie le segment que dans enTeteDossierPage', (chemin) => {
    const emplois = emploisHorsEnTete(readFileSync(join(RACINE, chemin), 'utf8'));
    expect(emplois, 'segment lié zéro ou plusieurs fois, ou appel non lié').not.toBeNull();
    expect(emplois).toEqual([]);
  });

  it('le crochet lui-même ne touche à aucun stockage', () => {
    const code = sansCommentaires(readFileSync(join(RACINE, CROCHET), 'utf8'));
    expect(code).not.toMatch(/Storage|wellneuro:|indexedDB|document\.cookie/);
  });

  it('le banc rougit sur un segment employé comme clé', () => {
    const fautif = [
      "const segmentPage = useSegmentPage();",
      "window.localStorage.setItem(`wellneuro:brouillon:${segmentPage}`, 'x');",
      "fetch('/api', { headers: { ...enTeteDossierPage(segmentPage) } });",
    ].join('\n');
    expect(emploisHorsEnTete(fautif)).toEqual([
      "window.localStorage.setItem(`wellneuro:brouillon:${segmentPage}`, 'x');",
    ]);
    // Une copie dans une autre variable, puis un appel non lié, rougissent aussi.
    expect(emploisHorsEnTete('const s = useSegmentPage();\nconst cle = s;')).toEqual(['const cle = s;']);
    expect(emploisHorsEnTete('cle(useSegmentPage());')).toBeNull();
  });

  it('seul le tableau de dépendances d’un crochet React est admis', () => {
    // Un tableau en dernier argument d'une autre fonction n'est pas une dépendance.
    expect(emploisHorsEnTete("const s = useSegmentPage();\nstocker('cle', [s]);")).toEqual(["stocker('cle', [s]);"]);
    expect(emploisHorsEnTete("const s = useSegmentPage();\nsessionStorage.setItem('k', [s]);")).toEqual([
      "sessionStorage.setItem('k', [s]);",
    ]);
    // Ni dans le corps du crochet : seul son DERNIER argument est effacé.
    const dansLeCorps = [
      'const s = useSegmentPage();',
      'const f = useCallback(() => {',
      "  stocker('cle', [s]);",
      '}, [s]);',
    ].join('\n');
    expect(emploisHorsEnTete(dansLeCorps)).toEqual(["  stocker('cle', [s]);"]);
    // Les formes admises : en-tête, dépendances sur une ou plusieurs lignes.
    const admis = [
      'const s = useSegmentPage();',
      'const f = useCallback(async () => {',
      "  await fetch('/api', { headers: { ...enTeteDossierPage(s) } });",
      '}, [a, s]);',
      'const g = useCallback(',
      '  () => enTeteDossierPage(s),',
      '  [s],',
      ');',
    ].join('\n');
    expect(emploisHorsEnTete(admis)).toEqual([]);
  });
});
