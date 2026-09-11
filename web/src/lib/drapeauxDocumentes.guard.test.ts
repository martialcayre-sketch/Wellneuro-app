import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// [[D-064]], DEUXIÈME APPLICATION — LE DOCUMENT QU'ON LIT AVANT DE POSER UN
// DRAPEAU NE CONNAISSAIT PAS QUATRE DES PORTES DE LA VOIE PATIENT.
//
// `D-064` a fait naître `verrousSignatureDocumentes.guard.test.ts` parce que
// `docs/FEATURE_FLAGS.md` avait menti trois jours sur l'état d'un verrou qu'il
// décrivait. Ce banc-ci garde l'étage au-dessus, celui que personne n'avait
// gardé : **l'inventaire lui-même**. Un drapeau peut être décrit faux — c'est
// ce que `D-064` rattrape — ou n'être décrit NULLE PART, et le second silence
// est le plus épais des deux : il ne se corrige pas en relisant une ligne,
// puisqu'il n'y a pas de ligne.
//
// LE 2026-09-11, NEUF VARIABLES ÉTAIENT LUES PAR LE CODE SANS FIGURER AU
// DOCUMENT, dont les quatre qui commandent toute la voie patient de la campagne
// Alliance (`WN_CE_QUI_COMPTE`, `WN_COMPREHENSION`, `WN_DOSSIER_DEUX_VOIX`,
// `WN_OBJECTIF_PROPOSE`) — et les quatre étaient POSÉES en production. Leur
// état était pourtant écrit : dans `D-089`, `D-095`, `D-138` et `D-154`, à
// quatre dates différentes, c'est-à-dire partout sauf à l'endroit dont le §B
// dit qu'il fait foi. Lire le document, en septembre, c'était croire que la
// voie patient tenait en trois portes.
//
// CE QUE CE BANC NE FAIT PAS. Il ne juge aucune valeur, ne vérifie aucun état
// de production et n'exige aucune date : poser ou retirer un drapeau est un
// geste d'exploitation, jamais le verdict d'un test. Il exige seulement qu'une
// variable que le code LIT soit NOMMÉE là où on vient la chercher. Décrire
// reste libre ; ouvrir une porte en silence, non.
//
// IL NE GARDE QU'UN SENS, ET C'EST DÉLIBÉRÉ. L'autre — « toute variable citée
// au document est lue par le code » — échouerait sur des entrées légitimes :
// `WN_PORTAIL_TOKEN_TTL_JOURS` est laissée pour mémoire depuis que #397 a
// retiré le jeton du portail, et `WN_GOOGLE_PATIENT_CLIENT_ID` n'apparaît dans
// `web/src` que sous une lecture de test. Garder ce sens-là reviendrait à
// entretenir une liste d'exceptions, c'est-à-dire un second document à tenir à
// jour — le défaut qu'on répare.
//
// LECTURE DU TEXTE, PAS IMPORT DES MODULES — même raison que le banc voisin :
// plusieurs de ces modules instancient un client Prisma au chargement.

const RACINE = path.resolve(__dirname, '../../..');
const DOC = 'docs/FEATURE_FLAGS.md';
const SOURCES = 'web/src';

// Les trois préfixes du dépôt. `NEXT_PUBLIC_WN_` compte autant que les autres :
// une variable exposée au navigateur mérite d'autant plus d'être nommée.
const PREFIXES = /^(?:WN|RAG|NEXT_PUBLIC_WN)_[A-Z0-9_]+$/;

function fichiersSources(repertoire: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(repertoire, { withFileTypes: true })) {
    const chemin = path.join(repertoire, entree.name);
    if (entree.isDirectory()) {
      trouves.push(...fichiersSources(chemin));
      continue;
    }
    if (!/\.tsx?$/.test(entree.name)) continue;
    // Les bancs lisent des variables pour les éprouver — dont des noms
    // volontairement fautifs (`WN_AGENDA_XXX` épingle ce que rend une faute de
    // frappe). Exiger qu'un document les décrive n'aurait aucun sens.
    if (/\.(test|guard\.test)\.tsx?$/.test(entree.name)) continue;
    if (entree.name.endsWith('.d.ts')) continue;
    trouves.push(chemin);
  }
  return trouves;
}

// Les variables que le CODE lit réellement, hors bancs.
function luesParLeCode(): string[] {
  const trouvees = new Set<string>();
  for (const fichier of fichiersSources(path.join(RACINE, SOURCES))) {
    const source = readFileSync(fichier, 'utf8');
    for (const m of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (PREFIXES.test(m[1])) trouvees.add(m[1]);
    }
  }
  return [...trouvees].sort();
}

// Les variables que le DOCUMENT nomme. Un nom entre accents graves, où qu'il
// soit : table, prose ou bloc de configuration. Le banc n'impose pas une forme
// de tableau — il impose d'être nommé.
function nommeesParLeDocument(): Set<string> {
  const source = readFileSync(path.join(RACINE, DOC), 'utf8');
  const nommees = new Set<string>();
  for (const m of source.matchAll(/`([A-Z0-9_]+)`/g)) {
    if (PREFIXES.test(m[1])) nommees.add(m[1]);
  }
  return nommees;
}

describe('drapeaux — le document nomme ce que le code lit', () => {
  it('chaque variable lue par `web/src` est nommée dans FEATURE_FLAGS', () => {
    const lues = luesParLeCode();

    // Anti-vacuité : un balayage qui ne trouverait plus rien rendrait ce banc
    // vert en ne comparant que du vide — exactement le silence qu'il existe
    // pour rompre. Le dépôt en portait 35 le 2026-09-11.
    expect(lues.length).toBeGreaterThan(25);

    const nommees = nommeesParLeDocument();
    const orphelines = lues.filter(nom => !nommees.has(nom));
    expect(
      orphelines,
      `${DOC} ne nomme pas ces variables, que le code lit pourtant : ` +
        `${orphelines.join(', ')}. Une porte qu'aucun document ne nomme s'ouvre ` +
        `sans que personne ne puisse lire qu'elle s'est ouverte.`,
    ).toEqual([]);
  });
});
