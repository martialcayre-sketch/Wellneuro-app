import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import type { ContradictionFinding } from './contradictionFinding';

// LOT-01 chaîne T0 — le banc exigé par [[D-041]] : l'objet du moteur de
// contradictions ne porte AUCUN champ de certitude, de probabilité, de score ou
// de confiance, SOUS QUELQUE NOM QUE CE SOIT.
//
// « Sous quelque nom que ce soit » ne se teste pas avec une liste de noms
// interdits : il suffirait d'en choisir un qui n'y est pas. C'est pourquoi ce
// banc procède DANS L'AUTRE SENS pour les champs de l'objet — la liste des clés
// est ÉPINGLÉE, et tout champ ajouté, quel que soit son nom, cesse de compiler.
// La liste de noms interdits ne sert qu'aux types IMBRIQUÉS, que le `keyof` ne
// voit pas.
//
// ASSERTION SUR LE TYPE, PAS SUR UNE INSTANCE (la fiche du lot l'exige) : une
// instance ne prouverait rien, un objet littéral pouvant toujours omettre un
// champ. Les assertions de forme sont donc portées par le TYPE des constantes
// ci-dessous, et c'est `tsc` — donc T1 et le CI — qui les rend rouges, pas
// `expect`. L'`expect` qui suit chaque déclaration n'est là que pour que le cas
// existe dans le rapport de test.

const MODULE = 'web/src/lib/clinical/contradictionFinding.ts';
const RACINE = path.resolve(__dirname, '../../../..');

// Le source débarrassé de ses commentaires : la prose de ce fichier PARLE des
// champs interdits (elle explique pourquoi ils le sont), et la scanner
// rendrait ce banc rouge sur un fichier parfaitement sain.
function sourceSansCommentaires(): string {
  return readFileSync(path.join(RACINE, MODULE), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

// Les noms de propriétés déclarés dans le module, imbriqués compris.
function proprietesDeclarees(): string[] {
  return [...sourceSansCommentaires().matchAll(/^\s*(\w+)\??\s*:/gm)].map(m => m[1]);
}

type Egales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Discordance = Extract<ContradictionFinding, { forme: 'DISCORDANCE' }>;
type Convergence = Extract<ContradictionFinding, { forme: 'CONVERGENCE' }>;
type ConflitSources = Extract<ContradictionFinding, { forme: 'CONFLIT_SOURCES' }>;

// LA LISTE ÉPINGLÉE. Y toucher est une décision, pas un geste de passage : tout
// champ qui entrerait ici devrait d'abord être défendu contre `DC-29`.
type CleCommune =
  | 'forme'
  | 'id'
  | 'audience'
  | 'sources'
  | 'description'
  | 'importance'
  | 'hypotheses'
  | 'actionSuggeree'
  | 'resolution'
  | 'justificationClaims'
  | 'regleId'
  | 'limitations';

describe('objet de contradiction — la liste des clés est épinglée', () => {
  it('la forme DISCORDANCE ne porte que les clés communes', () => {
    // L'assertion EST le type de cette constante : un champ ajouté à l'objet
    // rend `Egales` faux, et `false` ne s'assigne pas à une constante déclarée
    // `true`. Le compilateur refuse alors le fichier.
    const clesInchangees: Egales<keyof Discordance, CleCommune> = true;
    expect(clesInchangees).toBe(true);
  });

  it('la forme CONFLIT_SOURCES ne porte que les clés communes', () => {
    const clesInchangees: Egales<keyof ConflitSources, CleCommune> = true;
    expect(clesInchangees).toBe(true);
  });

  // La graduation est le SEUL champ propre à une forme, et elle vit sur la
  // forme `CONVERGENCE` seule : la porter sur l'objet en aurait fait un degré
  // applicable à une discordance, c'est-à-dire un champ de confiance déguisé.
  it('la forme CONVERGENCE n’ajoute que sa graduation', () => {
    const clesInchangees: Egales<keyof Convergence, CleCommune | 'graduation'> = true;
    expect(clesInchangees).toBe(true);
  });
});

describe('objet de contradiction — aucun champ de certitude, sous aucun nom', () => {
  // Ces racines couvrent les formulations plausibles d'un champ de vraisemblance,
  // en français comme en anglais. Elles ne gardent QUE les types imbriqués : le
  // niveau supérieur est tenu par la liste épinglée ci-dessus, qui est
  // exhaustive et n'a donc pas besoin de deviner les noms.
  const RACINES_INTERDITES = [
    'confian',
    'confidence',
    'certitud',
    'certain',
    'probabil',
    'vraisembl',
    'fiabilit',
    'reliabil',
    'likelihood',
    'score',
    'poids',
    'weight',
  ];

  // `sousScore` NOMME un sous-score, il n'en PORTE pas la valeur : c'est un
  // identifiant de cible, repris tel quel de `OrientationDeclencheur`. Seule
  // exception, et elle est nommée — une exception creusée en silence servirait
  // au défaut qu'on prétend interdire.
  const EXCEPTIONS = ['sousScore'];

  it('aucune propriété du module ne porte un nom de vraisemblance', () => {
    const proprietes = proprietesDeclarees();

    // Anti-vacuité : une extraction qui cesserait de fonctionner rendrait ce cas
    // vert en ne scannant rien du tout.
    expect(proprietes.length).toBeGreaterThan(10);
    expect(proprietes).toContain('importance');

    const fautives = proprietes
      .filter(p => !EXCEPTIONS.includes(p))
      .filter(p => RACINES_INTERDITES.some(r => p.toLowerCase().includes(r)));
    expect(fautives).toEqual([]);
  });

  // D-044 — le motif exact pour lequel ce type existe séparément. Réutiliser
  // `DiscordanceFinding` réintroduirait `confidence` par héritage, et le banc
  // ci-dessus aurait échoué le premier jour.
  it('le module n’emprunte rien au socle qui porte `confidence`', () => {
    const source = sourceSansCommentaires();
    expect(source).not.toContain('ClinicalFindingBase');
    expect(source).not.toContain('DiscordanceFinding');
    expect(source).not.toContain('QualitativeConfidence');
  });
});

describe('objet de contradiction — les trois formes, et seulement elles', () => {
  it('le discriminant porte exactement trois valeurs', () => {
    const formesInchangees: Egales<
      ContradictionFinding['forme'],
      'DISCORDANCE' | 'CONVERGENCE' | 'CONFLIT_SOURCES'
    > = true;
    expect(formesInchangees).toBe(true);
  });

  // La graduation COMPTE des sources indépendantes ; elle ne mesure pas une
  // vraisemblance (`DC-29`). Ses quatre valeurs sont celles de D-041, au mot
  // près : les modifier serait une décision clinique.
  it('la graduation de convergence porte les quatre valeurs de D-041', () => {
    const graduationInchangee: Egales<
      Convergence['graduation'],
      'SIGNAL' | 'CONVERGENCE_FAIBLE' | 'CONVERGENCE_MODEREE' | 'CONVERGENCE_FORTE'
    > = true;
    expect(graduationInchangee).toBe(true);
  });
});
