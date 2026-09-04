import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MENTION_NATURE_INDICE_GLOBAL,
  TENDANCE_INDICE_GLOBAL_PATIENT,
} from './natureIndiceGlobal';

// LOT-07 « Doctrine exécutable » — [[D-106]], `DC-22`.
//
// L'arbitrage du 2026-08-24 est : le total de « Mon équilibre » n'a **pas**
// d'interprétation clinique, et il n'est pas retiré pour autant — il reste un
// repère de suivi, IDENTIFIÉ COMME TEL (`DC-20`).
//
// Une issue de cette forme n'est tenue par rien de structurel : elle vit dans
// deux libellés d'écran, que la première refonte d'interface peut effacer sans
// que rien ne bronche. Ce banc est ce qui la rend opposable.
//
// CE QU'IL GARDE, et pourquoi chaque cas existe :
//   1. Une surface qui affiche le NOMBRE porte la mention de nature. C'est le
//      cœur : afficher le total sans dire ce qu'il est, c'est le laisser passer
//      pour un score clinique — le seul état que l'arbitrage interdit.
//   2. Aucun libellé patient n'affirme une amélioration. Le défaut trouvé à la
//      mesure était exactement là (« En progression depuis votre dernier
//      bilan »), et il portait sur la VARIATION, seule chose que le patient
//      lise — il ne voit jamais le chiffre.
//   3. La doctrine n'est écrite qu'une fois.
//   4. Le module reste une FEUILLE, donc importable par un composant client.
//   5. Le module est déclaré au garde de gamification. Ce cas garde un piège
//      que ce lot a lui-même failli poser : en sortant les libellés patient de
//      `components/patient`, il les sortait du balayage de
//      `gamification-patient.guard.test.ts`, qui ne lit que des chemins
//      déclarés. Un texte patient déplacé est un texte patient DÉGARDÉ tant que
//      son nouveau chemin n'est pas inscrit.

const RACINE = path.resolve(__dirname, '../..');
const MODULE = 'lib/equilibre/natureIndiceGlobal.ts';
const GARDE_GAMIFICATION = path.join(RACINE, 'lib/gamification-patient.guard.test.ts');

function lire(relatif: string): string {
  return readFileSync(path.join(RACINE, relatif), 'utf8');
}

/** Tous les `.tsx` de `src`, découverte automatique — aucune liste de chemins. */
function composants(): string[] {
  const trouves: string[] = [];
  const descendre = (dossier: string) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const p = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        if (entree.name === 'node_modules' || entree.name === 'generated') continue;
        descendre(p);
      } else if (entree.name.endsWith('.tsx') && !entree.name.endsWith('.test.tsx')) {
        trouves.push(p);
      }
    }
  };
  descendre(RACINE);
  return trouves.sort();
}

/**
 * L'ÉLÉMENT JSX qui reçoit le total, pas le fichier qui le contient.
 *
 * LE GRAIN EST LE POINT, et il a été trouvé en voyant le banc rester vert sous
 * injection. Un prédicat par FICHIER est fail-open dès qu'un composant rend
 * plusieurs jauges : `FichePatientPanel.tsx` en porte une servie
 * `showValue={false}` ailleurs dans le fichier, et cette seule occurrence
 * dispensait TOUTES les autres — y compris la jauge du total, dont on venait de
 * retirer la mention. On lit donc l'élément qui reçoit `indiceGlobal`, et lui
 * seul.
 */
/**
 * L'élément SANS ses commentaires.
 *
 * Sans cela, le cas central est satisfait par une mention **commentée** — vu
 * vert sous mutation le 2026-08-24 : reléguer `MENTION_NATURE_INDICE_GLOBAL`
 * dans un commentaire JSX gardait le banc au vert alors que l'écran n'affichait
 * plus rien. Une mention qui ne se rend pas n'est pas une mention.
 */
function sansCommentaires(element: string): string {
  return element.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, ' ');
}

/**
 * LA SOURCE SANS SES IMPORTS — même raison que `sansCommentaires`, second trou.
 *
 * Le détecteur par libellé (plus bas) exige que le FICHIER contienne
 * `MENTION_NATURE_INDICE_GLOBAL`. Vu vert sous mutation le 2026-09-04 : retirer
 * le `<p>{MENTION_NATURE_INDICE_GLOBAL}</p>` de `TrajectoirePanel` en laissant
 * la ligne `import { MENTION_NATURE_INDICE_GLOBAL } from …` gardait les seize
 * cas au vert, alors que l'écran n'affichait plus rien. L'import satisfaisait la
 * garde à lui seul.
 *
 * Un import ne rend rien. La correction est celle que le premier détecteur
 * applique déjà aux commentaires : on retire ce qui ne s'affiche pas avant de
 * chercher la mention.
 */
function sansImports(source: string): string {
  return source.replace(/\bimport\b[^;]*?['"][^'"]*['"]\s*;/g, ' ');
}

/**
 * LES ALIAS DU TOTAL, résolus à POINT FIXE dans le fichier — [[D-108]].
 *
 * LE TROU MESURÉ PAR LA CONTRE-REVUE. Le suivi par NOM était déclaré plus bas
 * comme une limite assumée. Codex a montré qu'elle n'était pas seulement une
 * limite, mais un CONTOURNEMENT complet : en gardant l'affichage conforme et en
 * ajoutant à côté `const total = objetsCliniques.indiceGlobal` puis
 * `<p>Total : {total}</p>`, le banc restait vert, douze tests sur douze. La
 * sentinelle de fichiers ne pouvait rien y voir — les deux affichages vivent
 * dans le MÊME fichier, donc l'ensemble des chemins ne bouge pas.
 *
 * On résout donc les alias avant d'extraire : tout identifiant affecté depuis
 * une expression qui cite un nom déjà suivi devient lui-même suivi, et on
 * recommence jusqu'à stabilité — une chaîne `a = indiceGlobal ; b = a ; c = b`
 * est suivie de bout en bout.
 *
 * CE QUI RESTE HORS DE PORTÉE, et c'est désormais la vraie limite : un
 * franchissement de FICHIER (valeur passée en prop à un composant enfant qui la
 * renomme), un spread d'attributs, ou un renommage du champ côté API. Il
 * faudrait un flot de données inter-fichiers ; le second détecteur, par
 * LIBELLÉ, est ce qui couvre ces cas-là.
 */
function nomsSuivis(source: string): string[] {
  const noms = new Set(['indiceGlobal']);
  const AFFECTATION = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=\s*([^;\n]+)/g;
  const DESTRUCTURATION = /(?:const|let|var)\s*\{([^}]*)\}\s*=/g;

  for (let passe = 0; passe < 6; passe++) {
    const avant = noms.size;
    const cite = (texte: string) =>
      [...noms].some(nom => new RegExp(`(?<![\\w$])${nom}(?![\\w$])`).test(texte));

    for (const m of source.matchAll(AFFECTATION)) {
      if (cite(m[2])) noms.add(m[1]);
    }
    for (const m of source.matchAll(DESTRUCTURATION)) {
      for (const champ of m[1].split(',')) {
        const [origine, alias] = champ.split(':').map(s => s.trim());
        if (alias && cite(origine)) noms.add(alias.replace(/[^\w$].*$/, ''));
      }
    }
    if (noms.size === avant) break;
  }
  return [...noms];
}

function elementsDuTotal(): { chemin: string; element: string }[] {
  const trouves: { chemin: string; element: string }[] = [];
  // (A) BALISE OUVRANTE dont les ATTRIBUTS citent le total. Le nom du composant
  //     n'entre pas dans le filtre : `<JaugeIndice value={…indiceGlobal} />`
  //     doit être vu comme `<ScoreGauge>`. Filtrer sur deux noms connus était le
  //     troisième contournement trouvé en revue.
  const BALISE = /<([A-Za-z][\w.]*)\b([^<>]*?)\/?>/g;
  // (B) INTERPOLATION-ENFANT qui affiche la valeur, et non qui la teste. Le
  //     contenu des accolades doit être une expression de VALEUR pure — pas de
  //     comparaison, pas de ternaire : `{objetsCliniques.indiceGlobal}` est un
  //     affichage, `{indiceGlobal !== null ? (` est une condition de rendu.
  //     Construit par fichier, sur les noms résolus ci-dessus.

  for (const fichier of composants()) {
    const chemin = path.relative(RACINE, fichier);
    const source = readFileSync(fichier, 'utf8');
    const noms = nomsSuivis(source);
    const CITE_LE_TOTAL = new RegExp(`(?<![\\w$])(?:${noms.join('|')})(?![\\w$])`);
    // Le détecteur d'enfant se construit sur les MÊMES noms : sans quoi l'alias
    // serait vu en attribut et manqué en interpolation.
    const ENFANT_ALIAS = new RegExp(
      `\\{\\s*([\\w.?\\[\\]]*(?:${noms.join('|')})[\\w.?\\[\\]]*)\\s*\\}`,
      'g',
    );

    for (const m of source.matchAll(BALISE)) {
      if (!CITE_LE_TOTAL.test(m[2])) continue;
      trouves.push({ chemin, element: m[0] });
    }
    for (const m of source.matchAll(ENFANT_ALIAS)) {
      // UN ENFANT, PAS UNE VALEUR D'ATTRIBUT. `value={objetsCliniques.
      // indiceGlobal}` est déjà couvert par (A) : le reprendre ici le
      // dénoncerait deux fois, dont une sous une forme (`{…}` seule) qui ne
      // porte jamais la mention et ne pourrait donc jamais être satisfaite.
      // Le caractère qui précède l'accolade tranche : `=` ⇒ attribut.
      if (source[m.index - 1] === '=') continue;
      trouves.push({ chemin, element: m[0] });
    }
  }
  return trouves;
}

// Un mot qui affirme que la variation est FAVORABLE affirme une interprétation
// clinique du total — précisément celle que l'arbitrage lui refuse. La liste est
// en FRANÇAIS parce que la donnée gardée l'est : ce sont des libellés d'écran
// servis au patient, pas des identifiants hérités d'un contrat anglophone.
const AFFIRME_UNE_AMELIORATION: { motif: RegExp; quoi: string }[] = [
  { motif: /progress(ion|e|ez|é)/i, quoi: 'progression' },
  { motif: /progrès/i, quoi: 'progrès' },
  { motif: /améliorat|améliore|amélioré/i, quoi: 'amélioration' },
  { motif: /\bmieux\b/i, quoi: 'mieux' },
  { motif: /meilleur/i, quoi: 'meilleur' },
  { motif: /\bréussi/i, quoi: 'réussi' },
  { motif: /\bsuccès\b/i, quoi: 'succès' },
];

describe('nature du total — le chiffre ne s’affiche jamais sans ce qu’il est', () => {
  // ANTI-VACUITÉ. Si la découverte ne trouvait plus aucune surface, tous les
  // cas suivants passeraient au vert sur des ensembles vides — le silence le
  // plus coûteux pour un garde de restitution.
  it('la découverte trouve bien les éléments qui restituent le total', () => {
    const elements = elementsDuTotal();
    expect(elements.length).toBeGreaterThan(0);
    expect(composants().length).toBeGreaterThan(50);
    // Les deux surfaces connues au 2026-08-24 : la fiche praticien (avec
    // chiffre) et l'accueil patient (sans chiffre). Une troisième qui
    // apparaîtrait sans être arbitrée fait rougir CE cas-ci, par le `toEqual`
    // ci-dessous — et non le cas central, qui l'accepterait si elle portait la
    // mention. L'arbitrage passe donc par une relecture, pas par un ajout muet.
    expect([...new Set(elements.map(e => e.chemin))].sort()).toEqual([
      'components/FichePatientPanel.tsx',
      'components/patient/MonEquilibreAccueil.tsx',
    ]);
  });

  // LE CŒUR. Deux façons légitimes de restituer le total : sans le chiffre
  // (`showValue={false}`, la surface patient), ou avec le chiffre ET la mention
  // (la fiche praticien). Toute autre combinaison le laisse passer pour un
  // score clinique.
  it('toute surface affichant le NOMBRE porte la mention de nature', () => {
    const fautives = elementsDuTotal()
      .filter(({ element }) => !/showValue=\{false\}/.test(sansCommentaires(element)))
      .filter(({ element }) => !sansCommentaires(element).includes('MENTION_NATURE_INDICE_GLOBAL'))
      .map(({ chemin, element }) => `${chemin} — ${element.replace(/\s+/g, ' ')}`);
    expect(fautives).toEqual([]);
  });

  it('la mention dit bien que ce n’est pas un score clinique', () => {
    expect(MENTION_NATURE_INDICE_GLOBAL).toMatch(/pas un score clinique/i);
  });

  // L'EXTRACTEUR NE DOIT PAS CONFONDRE UN IMPORT AVEC UNE RESTITUTION. Un
  // fichier qui importe la mention sans l'afficher ne satisfait rien : seuls
  // les éléments `<ScoreGauge>`/`<ObjetGauge>` sont retenus, et une ligne
  // d'import n'en est pas un.
  it('l’extracteur ne retient que des restitutions, jamais une condition', () => {
    for (const { element } of elementsDuTotal()) {
      // Soit une balise ouvrante, soit une interpolation de valeur pure.
      expect(element).toMatch(/^(<[A-Za-z]|\{)/);
      // Une condition de rendu n'est PAS une restitution : `{indiceGlobal !==
      // null ? (` ne doit jamais entrer, sans quoi le cas central exigerait la
      // mention sur le `<div>` qui décide d'afficher, pas sur la jauge.
      expect(element).not.toMatch(/[!=]==|&&|\?\s*\(/);
    }
  });

  // LA LIMITE, NOMMÉE PLUTÔT QUE TUE. Le banc lit du TEXTE : il suit la valeur
  // tant qu'elle porte le nom `indiceGlobal`. Une variable intermédiaire
  // (`const total = objets.indiceGlobal` puis `<Jauge value={total} />`), un
  // spread d'attributs, ou un renommage du champ côté API la lui font perdre.
  // Ce n'est pas rattrapable sans analyser le flot de données ; la couverture
  // s'arrête là, et l'écrire vaut mieux que de laisser croire l'inverse.
  it('la limite du suivi textuel est déclarée', () => {
    expect(elementsDuTotal().length).toBeGreaterThan(0);
  });
});

/**
 * LE SECOND DÉTECTEUR — PAR LIBELLÉ, et non par nom de variable ([[D-108]]).
 *
 * POURQUOI IL A FALLU EN AJOUTER UN. La contre-revue a nommé deux surfaces que
 * le premier détecteur ne pouvait pas voir, et pour une raison structurelle :
 * elles ne portent jamais le nom `indiceGlobal`. `TrajectoirePanel` affiche
 * `indice {jalon.valeur}`, `J21DecisionPanel` la tendance sous
 * `Score « Mon équilibre »` — deux chemins de données distincts vers LE MÊME
 * agrégat. Aucune résolution d'alias ne les rejoint : la valeur traverse une
 * réponse d'API et change de nom au passage.
 *
 * On lit donc ce que le PRATICIEN LIT — l'étiquette servie à l'écran — et non ce
 * que le code appelle la valeur. Les deux détecteurs sont complémentaires par
 * construction : l'un suit la donnée, l'autre le mot.
 */
const LIBELLES_DU_TOTAL = /indice\s*\{|indice 0–100|Score\s*«\s*Mon équilibre/;

/**
 * Les surfaces qui restituent le total sous un libellé, chacune motivée.
 *
 * Toutes portent `MENTION_NATURE_INDICE_GLOBAL`, exigence vérifiée juste après.
 * Le registre existe pour que l'apparition d'une TROISIÈME passe par une
 * relecture, jamais par un ajout muet — même patron que la sentinelle de
 * fichiers du premier détecteur.
 */
const SURFACES_PAR_LIBELLE: Record<string, string> = {
  'components/patient-cockpit/TrajectoirePanel.tsx':
    'fiche-trajectoire praticien — affiche l’indice de chaque jalon d’un cycle',
  'components/patient-cockpit/J21DecisionPanel.tsx':
    'point d’étape J21 praticien — affiche la TENDANCE du total, pas sa valeur',
};

describe('nature du total — les surfaces qui le nomment sans le nommer', () => {
  it('aucune surface par libellé qui ne soit déclarée', () => {
    const nonDeclarees = composants()
      .filter(f => LIBELLES_DU_TOTAL.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f))
      .filter(chemin => !(chemin in SURFACES_PAR_LIBELLE));
    expect(nonDeclarees).toEqual([]);
  });

  /**
   * LA RÉPÉTITION DE LA MENTION EST PORTANTE — ne pas la « factoriser ».
   *
   * Ce cas exige que le FICHIER de chaque surface contienne littéralement
   * `MENTION_NATURE_INDICE_GLOBAL`. Extraire un composant partagé
   * (`<MentionNatureIndice />`) retirerait l'identifiant des surfaces et ferait
   * tomber cette garde — dont le remède apparent serait d'assouplir le
   * détecteur, c'est-à-dire de désarmer `D-106` pour un gain cosmétique.
   *
   * Le lot Densité du cadrage (2026-09-02) proposait exactement ce
   * regroupement, « composant unique pour la mention (×4) ». Vérifié le
   * 2026-09-04 : à ne pas faire. Les quatre sites ne sont d'ailleurs pas
   * identiques — deux rendent un `<p>` commun, un troisième un `<span>` ajusté
   * à un badge, le quatrième passe la chaîne en prop.
   *
   * NI COMMENTÉE, NI SEULEMENT IMPORTÉE : les deux retraits ont été vus verts
   * sous mutation, et c'est `sansImports` qui ferme le second (voir sa note).
   */
  it('chaque surface déclarée porte la mention de nature', () => {
    const sansMention = Object.keys(SURFACES_PAR_LIBELLE).filter(
      chemin => !sansImports(sansCommentaires(lire(chemin))).includes('MENTION_NATURE_INDICE_GLOBAL'),
    );
    expect(sansMention).toEqual([]);
  });

  // Anti-vacuité, dans les deux sens : le motif détecte encore quelque chose, et
  // aucune entrée du registre ne survit à la surface qu'elle décrivait.
  it('le détecteur par libellé voit encore les surfaces déclarées', () => {
    const vues = composants()
      .filter(f => LIBELLES_DU_TOTAL.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f))
      .sort();
    expect(vues).toEqual(Object.keys(SURFACES_PAR_LIBELLE).sort());
  });

  it('chaque surface déclarée porte un motif écrit', () => {
    for (const [chemin, motif] of Object.entries(SURFACES_PAR_LIBELLE)) {
      expect(motif.trim().length, `surface sans motif : ${chemin}`).toBeGreaterThan(20);
    }
  });
});

describe('nature du total — la variation ne porte aucune valence', () => {
  // LA COULEUR EST UN ÉNONCÉ, et c'est le défaut que la revue a trouvé.
  // `MomentumCard` colorait le delta du total en `success` sur une hausse et
  // `warning` sur une baisse. Or ce delta est la variation d'un total dont
  // `D-106` établit qu'il n'a aucune interprétation clinique : le colorer EST
  // cette interprétation, servie au praticien sous forme de couleur au lieu de
  // mots. Corriger le libellé patient en laissant la couleur aurait retiré la
  // phrase et gardé le jugement.
  //
  // FAIL-CLOSED, patron de `D-046` : la règle vise TOUTE tendance, pas la
  // seule `momentum.tendance`. Une tendance future qui mériterait vraiment une
  // valence devra être arbitrée et exemptée nommément — elle ne l'héritera pas
  // en silence.
  it('aucune tendance ne commande une couleur de valence', () => {
    const fautifs: string[] = [];
    for (const fichier of composants()) {
      const chemin = path.relative(RACINE, fichier);
      const source = readFileSync(fichier, 'utf8');
      for (const m of source.matchAll(/tendance[\s\S]{0,120}?['"](success|warning|danger)['"]/g)) {
        fautifs.push(`${chemin} — ${m[0].replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
    expect(fautifs).toEqual([]);
  });
});

describe('nature du total — la variation ne s’annonce pas comme une amélioration', () => {
  it('aucun libellé patient n’affirme une amélioration', () => {
    const fautifs: string[] = [];
    for (const [tendance, libelle] of Object.entries(TENDANCE_INDICE_GLOBAL_PATIENT)) {
      for (const { motif, quoi } of AFFIRME_UNE_AMELIORATION) {
        if (motif.test(libelle)) fautifs.push(`${tendance} : « ${quoi} » dans « ${libelle} »`);
      }
    }
    expect(fautifs).toEqual([]);
  });

  // Le pendant de la règle précédente, et il vient d'une doctrine ANTÉRIEURE
  // qu'il ne faut pas casser en croyant symétriser : « construction, jamais
  // dégradation » (SP-CONV LOT-05, `D7`) veut qu'une évolution défavorable ne
  // soit jamais annoncée comme une chute. Le libellé de baisse ne nomme donc
  // pas la direction, et tend la main au praticien.
  it('le libellé de baisse n’annonce pas une chute et oriente vers le praticien', () => {
    const baisse = TENDANCE_INDICE_GLOBAL_PATIENT.baisse;
    expect(baisse).not.toMatch(/chute|effondr|dégrad|recul|en baisse/i);
    expect(baisse).toMatch(/praticien/i);
  });

  // Anti-vacuité de la liste de mots : sans ce cas, une liste vidée par
  // mégarde rendrait le cas précédent vert en ne testant rien.
  it('la liste de mots mord réellement', () => {
    const ancien = 'En progression depuis votre dernier bilan';
    expect(AFFIRME_UNE_AMELIORATION.some(({ motif }) => motif.test(ancien))).toBe(true);
  });
});

describe('nature du total — la doctrine tient à un seul endroit', () => {
  it('les libellés patient ne sont pas redéfinis ailleurs', () => {
    const doublons = composants()
      .map(f => ({ chemin: path.relative(RACINE, f), source: readFileSync(f, 'utf8') }))
      .filter(({ source }) => /depuis votre dernier bilan/.test(source))
      .filter(({ source }) => !source.includes('TENDANCE_INDICE_GLOBAL_PATIENT'))
      .map(({ chemin }) => chemin);
    expect(doublons).toEqual([]);
  });

  // Le module est atteint par des composants `'use client'` des DEUX surfaces.
  // Un import de valeur suffirait à y faire entrer `node:crypto` par un
  // voisin — le défaut que `bundleClient.guard.test.ts` ferme pour
  // `lib/clinical`. Ici la condition est vérifiée, pas déclarée.
  it('le module reste une feuille, donc embarquable côté client', () => {
    const source = lire(MODULE);
    expect(source).not.toMatch(/^\s*import\s/m);
  });

  // LE PIÈGE QUE CE LOT A FAILLI POSER. Les libellés patient ont quitté
  // `components/patient` ; le garde de gamification ne balaie que des chemins
  // DÉCLARÉS. Sans l'entrée, ils sortaient du balayage en même temps que du
  // dossier, et « bravo » y serait passé sans que rien ne rougisse.
  it('le module est déclaré aux surfaces patient du garde de gamification', () => {
    expect(readFileSync(GARDE_GAMIFICATION, 'utf8')).toContain(MODULE);
  });
});
