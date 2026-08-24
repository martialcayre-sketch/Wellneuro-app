import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// LOT-03 « Doctrine exécutable » — [[D-105]]. Le banc de doctrine que `DC-58`
// appelait, posé sur le sujet que la MESURE a trouvé, et pas sur celui que la
// fiche annonçait.
//
// CE QUE LA MESURE A DIT, ET POURQUOI CE BANC N'EST PAS CELUI QUI ÉTAIT PRÉVU.
// `DC-58` demande de détecter « une valeur cliniquement signifiante qui
// n'existerait que dans un test ». La descente du 2026-08-24 (476 fichiers de
// test, 595 fichiers source) en a trouvé ZÉRO — et surtout, elle a montré que la
// méthode prescrite ne tient pas : contrôler qu'une valeur de test « existe
// ailleurs » est VACUE. Avec 633 valeurs distinctes au dénominateur, presque
// tout entier court trouve un répondant par hasard — `poids = 1` était « couvert »
// parce que le chiffre 1 figure dans `indicationsBiologieV1.ts`, et
// `doseCibleBasse = 4000` par `LONGUEUR_MAX_CE_QUI_COMPTE`, une longueur de
// texte. Un tel banc serait vert en permanence ET vert pour la mauvaise raison.
//
// LE SUJET RÉEL EST DE L'AUTRE CÔTÉ. Ce que `DC-58` décrit — « un cut-off
// inventé puis recopié dans le moteur » — devient décidable dès qu'on cesse de
// comparer des VALEURS pour regarder des POSITIONS : un littéral à droite d'un
// opérateur de comparaison EST un seuil, sans qu'on ait à deviner si le nombre
// est clinique. La mesure en a compté 61 dans `src/lib`, dont deux réellement
// fautives, corrigées par [[D-105]] et disparues de ce balayage :
//   — `discordanceRythme.ts` confrontait le déclaré à un littéral `10` pendant
//     que l'observé lisait `SEUIL_JEUNE_MIN` : DEUX écritures d'un seul repère,
//     dont une seule nommée ;
//   — la borne « trois actions maximum » était écrite SIX FOIS dans trois
//     fichiers, moteur et écran compris.
//
// CE BANC GARDE DONC `DC-19`/`DC-20` (aucun seuil inventé, un chiffre technique
// identifié comme tel) PLUS QUE `DC-58`. C'est dit ici et non ailleurs : un banc
// dont on croit qu'il garde autre chose que ce qu'il garde est pire qu'absent.
//
// LA LIMITE, NOMMÉE. Le CATALOGUE est exempté par forme, parce qu'un cut-off
// écrit dans le catalogue est CHEZ LUI — c'est lui la source déclarée, et
// `ranges.ts` interdit déjà de ré-encoder ses bornes ailleurs. Les 33 seuils de
// `questions.ts` (PSQI, Horne-Östberg, Karasek…) ne sont donc pas gardés ici ;
// ils le sont par la certification de scoring et par `DC-17`/`DC-18`.

const RACINE = path.resolve(__dirname, '../../..');
const LIB = path.join(RACINE, 'src', 'lib');

function fichiersDeLib(): string[] {
  const trouves: string[] = [];
  const descendre = (dossier: string) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const p = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        if (entree.name === 'generated' || entree.name === 'node_modules') continue;
        descendre(p);
      } else if (
        entree.name.endsWith('.ts') &&
        !entree.name.endsWith('.test.ts') &&
        !entree.name.endsWith('.d.ts')
      ) {
        trouves.push(p);
      }
    }
  };
  descendre(LIB);
  return trouves.sort();
}

/**
 * Neutralise commentaires, chaînes ET littéraux d'expression régulière, SANS
 * changer les longueurs — les numéros de ligne restent exacts.
 *
 * Les trois sont indispensables et chacun pour sa propre raison. Sans les
 * CHAÎNES, `questionnaires/stress.ts` remonte « latitude décisionnelle < 72 »,
 * qui est une note de catalogue et pas du code. Sans les COMMENTAIRES, la
 * motivation d'un seuil compte comme une occurrence de ce seuil. Sans les
 * EXPRESSIONS RÉGULIÈRES, une classe contenant une apostrophe (`/['"]/`) ouvre
 * une fausse chaîne qui court jusqu'à l'apostrophe suivante et AVALE le code
 * intermédiaire — le banc se tairait alors sur tout ce qu'elle a mangé, ce qui
 * est le mode de panne qu'un garde ne peut pas se permettre.
 */
export function neutraliser(source: string): string {
  const sortie: string[] = [];
  const blanc = (c: string) => (c === '\n' ? '\n' : ' ');
  // Un `/` ouvre une expression régulière quand il ne peut pas être un
  // opérateur de division — c'est-à-dire après un opérateur, une ouvrante, une
  // virgule ou un point-virgule.
  const PRECEDE_UNE_REGEX = /[=(,:[!&|?{};+\-*%<>~^]$/;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (c === '/' && d === '/') {
      while (i < source.length && source[i] !== '\n') { sortie.push(' '); i++; }
    } else if (c === '/' && d === '*') {
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        sortie.push(blanc(source[i])); i++;
      }
      sortie.push(' ', ' '); i += 2;
    } else if (c === '"' || c === "'" || c === '`') {
      sortie.push(' '); i++;
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') { sortie.push(' ', ' '); i += 2; continue; }
        sortie.push(blanc(source[i])); i++;
      }
      sortie.push(' '); i++;
    } else if (c === '/' && PRECEDE_UNE_REGEX.test(sortie.join('').trimEnd().slice(-1) || '(')) {
      sortie.push(' '); i++;
      let dansClasse = false;
      while (i < source.length && (dansClasse || source[i] !== '/') && source[i] !== '\n') {
        if (source[i] === '\\') { sortie.push(' ', ' '); i += 2; continue; }
        if (source[i] === '[') dansClasse = true;
        if (source[i] === ']') dansClasse = false;
        sortie.push(' '); i++;
      }
      sortie.push(' '); i++;
    } else { sortie.push(c); i++; }
  }
  return sortie.join('');
}

const COMPARAISON = /([A-Za-z_$][\w$.?[\]]{0,60})\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\b/g;

// `0`, `1`, `2` et `-1` ne sont pas des seuils : ce sont des gardes de
// STRUCTURE — liste vide, élément unique, index absent. Les retenir noierait
// la liste d'exemptions sous des bornes qui ne décident de rien, et une liste
// d'exemptions qu'on ne relit plus ne garde plus rien.
const BORNES_DE_STRUCTURE = new Set(['0', '1', '2', '-1']);

type Comparaison = { chemin: string; ligne: number; expression: string };

function comparaisonsLitterales(): Comparaison[] {
  const trouvees: Comparaison[] = [];
  for (const fichier of fichiersDeLib()) {
    const chemin = path.relative(RACINE, fichier).replace(/\\/g, '/');
    const net = neutraliser(readFileSync(fichier, 'utf8'));
    net.split('\n').forEach((ligne, index) => {
      for (const m of ligne.matchAll(COMPARAISON)) {
        if (BORNES_DE_STRUCTURE.has(m[3])) continue;
        trouvees.push({ chemin, ligne: index + 1, expression: `${m[1]} ${m[2]} ${m[3]}` });
      }
    });
  }
  return trouvees;
}

/**
 * LE CATALOGUE, RECONNU PAR SA FORME ET NON PAR SON NOM. Un cut-off écrit dans
 * le catalogue est à sa place — c'est LUI la source déclarée. Le jour où un
 * fichier de catalogue s'ajoute, il est couvert sans qu'on ait à l'inscrire ;
 * une liste de chemins codée en dur aurait laissé le fichier neuf hors garde,
 * qui est exactement le défaut que ce banc existe pour empêcher.
 */
function estCatalogue(chemin: string): boolean {
  return chemin === 'src/lib/questions.ts' || chemin.startsWith('src/lib/questionnaires/');
}

/**
 * LES EXEMPTIONS, NOMMÉES ET MOTIVÉES — jamais un motif d'exclusion muet.
 *
 * Clé : `chemin` + tabulation + expression, SANS numéro de ligne (une ligne se
 * déplace au moindre ajout, et un banc qui rougit sur un déplacement finit
 * désarmé). Renommer la variable comparée fait en revanche rougir, et c'est
 * voulu : le nom fait partie de ce qui a été arbitré.
 *
 * Chaque motif dit POURQUOI le littéral n'est pas un seuil clinique inventé.
 * Une entrée sans motif, ou qui ne correspond plus à rien, fait rougir.
 */
const EXEMPTIONS: Record<string, string> = {
  // — Bornes de plausibilité sur une mesure saisie. Elles n'INTERPRÈTENT rien :
  //   hors plage, la valeur est rendue `null` (jamais 0, jamais bornée), donc
  //   aucune conclusion clinique n'en dérive (`DC-24`). Ce sont des filtres de
  //   saisie aberrante — taille en cm, poids en kg, IMC.
  'src/lib/consultation/contexteClinique.ts\tt < 100': 'borne de plausibilité de saisie (taille cm) ; hors plage ⇒ null, aucune interprétation',
  'src/lib/consultation/contexteClinique.ts\tt > 250': 'borne de plausibilité de saisie (taille cm) ; hors plage ⇒ null, aucune interprétation',
  'src/lib/consultation/contexteClinique.ts\tp < 20': 'borne de plausibilité de saisie (poids kg) ; hors plage ⇒ null, aucune interprétation',
  'src/lib/consultation/contexteClinique.ts\tp > 400': 'borne de plausibilité de saisie (poids kg) ; hors plage ⇒ null, aucune interprétation',
  'src/lib/consultation/contexteClinique.ts\timc < 8': 'borne de plausibilité du calcul dérivé ; hors plage ⇒ null, aucune bande IMC publiée ici',
  'src/lib/consultation/contexteClinique.ts\timc > 100': 'borne de plausibilité du calcul dérivé ; hors plage ⇒ null, aucune bande IMC publiée ici',

  // — Longueurs de texte. Techniques au sens de `DC-20` : elles portent sur le
  //   NOMBRE DE CARACTÈRES d'une saisie, jamais sur ce qu'elle dit.
  'src/lib/food-compass/plates.ts\tjustification.length < 10': 'longueur minimale de texte (caractères), pas un seuil clinique',
  'src/lib/food-observation/persistence.ts\tdeltaDecision.length < 10': 'longueur minimale de texte (caractères), pas un seuil clinique',
  'src/lib/food-observation/persistence.ts\tfeedbackPatient.length < 10': 'longueur minimale de texte (caractères), pas un seuil clinique',
  'src/lib/instruments.ts\ttitre.length < 3': 'longueur de titre (caractères), contrainte de saisie',
  'src/lib/instruments.ts\ttitre.length > 120': 'longueur de titre (caractères), contrainte de saisie',
  'src/lib/instruments.ts\ttexte.length < 3': 'longueur de libellé (caractères), contrainte de saisie',
  'src/lib/instruments.ts\ttexte.length > 300': 'longueur de libellé (caractères), contrainte de saisie',
  'src/lib/instruments.ts\toptions.length > 8': 'nombre d’options d’un item ; contrainte d’ergonomie de saisie, aucune cotation n’en dépend',
  'src/lib/biology-library/gardeProposition.ts\tidPatient.length > 64': 'longueur maximale d’un identifiant, garde d’entrée',
  'src/lib/rag/config.ts\tinternalSecret.length < 32': 'longueur minimale d’un secret — garde de SÉCURITÉ, sans rapport clinique',
  'src/lib/supplement-library/config.ts\tinternalSecret.length < 32': 'longueur minimale d’un secret — garde de SÉCURITÉ, sans rapport clinique',

  // — Bornes de saisie non cliniques.
  'src/lib/patient/cycleDeVie.ts\tannee >= 1900': 'plage d’année calendaire plausible, garde de parsing',
  'src/lib/patient/cycleDeVie.ts\tannee <= 2099': 'plage d’année calendaire plausible, garde de parsing',
  'src/lib/supplement-library/gouvernance.ts\tnombre > 1000': 'borne de saisie du poids d’une règle (entier de pondération), arbitrable par le praticien ligne à ligne',
  'src/lib/rag/verification.ts\tsimilarity >= 0.999999': 'tolérance numérique d’une comparaison de vecteurs — identité à l’epsilon près, pas un seuil de décision',

  // — Bornes de COUVERTURE et de CHARGE. Elles ne cotent rien : elles décident
  //   qu'il n'y a pas assez de matière pour émettre, ou qu'un cadre est plein.
  'src/lib/agenda-alimentaire/agregats.ts\tavecPrises.length < 3': 'couverture minimale avant d’émettre une suggestion d’horaire ; sous le seuil ⇒ null, jamais une valeur dégradée (`DC-25`)',
  'src/lib/food-observation/persistence.ts\tbudgetChargeGlobal > 21': 'borne haute du budget de charge, alignée sur la fenêtre 21 jours du protocole ; cadre de la relation, pas une cotation',

  // — DETTE NOMMÉE, PAS UN BLANC-SEING. Troisième borne « au maximum 3 » du
  //   dépôt, après les actions de protocole et les cartes de fil. Sa provenance
  //   n'a PAS été retracée au LOT-03 : elle valide un brouillon de sortie LLM,
  //   et rien n'indique d'où vient le 3. Exemptée pour ne pas bloquer sur un
  //   arbitrage qui appartient au praticien — inscrite ici pour être retrouvée.
  'src/lib/synthese-praticien.ts\tsource.axes_prioritaires.length > 3': 'DETTE : borne de schéma de sortie LLM, provenance non retracée au LOT-03 — à arbitrer',
};

describe('seuils littéraux — le balayage lui-même', () => {
  // ANTI-VACUITÉ. Un balayage qui ne trouve plus rien rendrait tous les cas
  // suivants verts en ne comparant que des ensembles vides — le pire silence
  // possible pour un garde de ce type.
  it('le balayage voit bien tout `src/lib`', () => {
    expect(fichiersDeLib().length).toBeGreaterThan(200);
  });

  it('le balayage trouve encore des comparaisons à littéral', () => {
    expect(comparaisonsLitterales().length).toBeGreaterThan(30);
  });

  // Le catalogue est exempté PAR FORME : si le prédicat ne reconnaissait plus
  // rien, les 33 seuils de `questions.ts` tomberaient d'un coup dans la liste
  // des non exemptés et le banc rougirait en masse pour une raison qui n'est
  // pas la sienne. S'il reconnaissait TOUT, le banc ne garderait plus rien.
  it('le prédicat de catalogue reconnaît le catalogue, et lui seul', () => {
    const comparaisons = comparaisonsLitterales();
    const auCatalogue = comparaisons.filter(c => estCatalogue(c.chemin));
    expect(auCatalogue.length).toBeGreaterThan(20);
    expect(auCatalogue.length).toBeLessThan(comparaisons.length);
  });

  // Le neutraliseur est la pièce dont la panne est SILENCIEUSE : s'il avalait
  // trop, le banc se tairait sans rien signaler. Ces cas le tiennent aux deux
  // bouts — il doit effacer ce qui n'est pas du code, et rien d'autre.
  it('le neutraliseur efface chaînes, commentaires et regex — et rien de plus', () => {
    expect(neutraliser("const s = 'latitude < 72';").includes('72')).toBe(false);
    expect(neutraliser('// seuil < 72\nconst a = b < 14;')).toContain('b < 14');
    // Le cas qui compte : une regex portant une apostrophe ne doit pas ouvrir
    // une chaîne qui avalerait la comparaison suivante.
    expect(neutraliser("const r = /['\"]/g;\nif (x > 30) {}")).toContain('x > 30');
    expect(neutraliser('const a = b < 14;')).toBe('const a = b < 14;');
    // Les longueurs sont préservées : les numéros de ligne restent exacts.
    const source = "const s = 'aa';\nif (x >= 42) {}\n";
    expect(neutraliser(source)).toHaveLength(source.length);
    expect(neutraliser(source).split('\n')[1]).toContain('x >= 42');
  });
});

describe('seuils littéraux — toute comparaison hors catalogue est arbitrée', () => {
  // LE CŒUR. Un littéral à droite d'un opérateur de comparaison est un seuil.
  // Hors du catalogue, il doit être soit NOMMÉ dans une constante motivée —
  // auquel cas il ne remonte pas ici, puisqu'il n'y a plus de littéral —, soit
  // inscrit dans la liste ci-dessus avec la raison qui le rend acceptable.
  // Aucun jeu de propriétés par défaut, aucun héritage silencieux : une
  // comparaison inconnue fait rougir plutôt que d'être devinée.
  it('aucun seuil littéral non arbitré hors catalogue', () => {
    const nonArbitres = comparaisonsLitterales()
      .filter(c => !estCatalogue(c.chemin))
      .filter(c => !(`${c.chemin}\t${c.expression}` in EXEMPTIONS))
      .map(c => `${c.chemin}:${c.ligne} — ${c.expression}`);
    expect(nonArbitres).toEqual([]);
  });

  // UNE EXEMPTION MORTE EST UN TROU QUI SE REFERME TOUT SEUL. Sans ce cas, la
  // liste accumulerait des lignes qui ne correspondent plus à rien, et le jour
  // où un code réintroduirait la même expression au même endroit, elle serait
  // exemptée par une décision prise pour un autre code.
  it('aucune exemption ne survit à ce qu’elle exemptait', () => {
    const presentes = new Set(comparaisonsLitterales().map(c => `${c.chemin}\t${c.expression}`));
    const mortes = Object.keys(EXEMPTIONS).filter(cle => !presentes.has(cle));
    expect(mortes).toEqual([]);
  });

  it('chaque exemption porte un motif écrit', () => {
    for (const [cle, motif] of Object.entries(EXEMPTIONS)) {
      expect(motif.trim().length, `exemption sans motif : ${cle}`).toBeGreaterThan(20);
    }
  });
});

describe('seuils littéraux — les deux corrections de D-105 tiennent', () => {
  // Ces deux cas ne gardent pas une valeur, ils gardent une FORME : que le
  // repère reste dérivé et la borne nommée. Ils rougiraient si quelqu'un
  // réécrivait le littéral, ce qui est précisément ce que D-105 a défait.
  it('le repère de jeûne déclaré reste dérivé de son homologue observé', () => {
    const source = readFileSync(path.join(LIB, 'equilibre/discordanceRythme.ts'), 'utf8');
    expect(source).toContain('export const SEUIL_JEUNE_DECLARE_H = SEUIL_JEUNE_MIN / 60;');
    expect(neutraliser(source)).not.toMatch(/SIIN54\s*>=\s*10/);
  });

  it('la borne « trois actions » n’est plus écrite qu’une fois', () => {
    const porteurs = [
      'clinical-engine/types.ts',
      'clinical-engine/protocolDraft.ts',
      'clinical-engine/patientProtocolView.ts',
    ].map(f => neutraliser(readFileSync(path.join(LIB, f), 'utf8')));
    const declarations = porteurs.filter(s => /export const MAX_ACTIONS_PROTOCOLE_21J\s*=\s*3/.test(s));
    expect(declarations).toHaveLength(1);
    for (const source of porteurs) {
      expect(source).not.toMatch(/actions\.length\s*[<>]=?\s*3/);
    }
  });
});
