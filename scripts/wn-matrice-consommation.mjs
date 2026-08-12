#!/usr/bin/env node
// Matrice de consommation du savoir — LOT-05 de la campagne
// `2026-08-05-cloture-des-dettes-wellneuro-5-0`.
//
// La question du lot n'est pas « qu'avons-nous ingéré ? » mais « qu'est-ce qui
// est CONSOMMÉ, par quoi, et le patient le voit-il ? ». Une source de savoir
// livrée, mappée, testée — et qu'aucun écran n'appelle — est une dette
// invisible : rien n'est rouge, rien ne manque, et pourtant elle ne sert à
// personne. C'est exactement le cas des cinq rayons de `RAYON_VERS_NOTEBOOK`
// sans appelant (constat du 2026-08-03, revenu deux fois en revue).
//
// D'où la contrainte de ce script : la colonne « surface qui la consomme » est
// **dérivée du code**, jamais recopiée. Une source sans appelant apparaît avec
// une surface VIDE — c'est précisément l'information recherchée, et c'est ce
// qu'un tableau rédigé à la main omet en silence.
//
// Ce que ce script NE fait pas, et ne doit pas faire :
//   — lever un drapeau, ni lire sa valeur d'environnement (un drapeau
//     RÉFÉRENCÉ dans le code n'est pas un drapeau POSÉ en production ; même
//     asymétrie honnête que `wn-etat-reel.mjs`) ;
//   — toucher la base de production (CLAUDE.md réserve cette lecture à l'outil
//     MCP Supabase) ;
//   — décider à la place du praticien qu'une source dormante doit être
//     branchée. Il exige seulement qu'une décision DATÉE existe pour chacune,
//     dans `docs/claude/corpus/consommation_decisions.json`.
//
// Deux colonnes ne sont pas dérivables et sont donc DÉCLARÉES : « décision
// produite » (ce que la source sert à trancher) et le verdict d'arbitrage. Le
// rapport les marque comme telles (`origine: 'déclaré'`) plutôt que de les
// faire passer pour des faits mesurés.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Racine dérivée de l'EMPLACEMENT du script, jamais du cwd d'appel : les
// sessions de ce dépôt tournent depuis `web/`, et un chemin relatif y rendrait
// un rapport vide en code 0 (régression N1 de `wn-etat-reel.mjs`, revue du
// 2026-08-05).
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const CHEMIN_DECISIONS = ['docs', 'claude', 'corpus', 'consommation_decisions.json'];
const CHEMIN_MATRICE = ['docs', 'claude', 'MATRICE_CONSOMMATION.md'];
const MODULE_RAYONS = 'web/src/lib/supplement-library/rayonCorpus.ts';

// Profondeur de remontée d'un import vers une surface (`web/src/app`). Un
// service `lib/` appelé par un autre `lib/` appelé par une route reste
// consommé : s'arrêter au premier niveau rendrait « dormante » une source
// pourtant servie. Trois sauts couvrent les chaînes réelles du dépôt
// (service → accès → route) sans transformer le graphe entier en appelant.
const PROFONDEUR_MAX = 3;

// Verrous non-drapeau : une condition de DONNÉE qui garde une source en plus
// de son drapeau. Le couple des deux est le « double verrou » — un ET
// délibéré (`orientationService.ts:73`), qui laisse la surface fail-closed
// même quand le drapeau est posé.
const MOTIFS_VERROU_DONNEE = ['validationExterne', 'tableSignee'];

/**
 * Les sources de savoir du runtime. Cette LISTE est déclarée — ce qui compte
 * comme « source de savoir » est un jugement, pas une propriété du code — mais
 * tout ce qu'on en dit ensuite (appelants, drapeaux, verrous, visibilité
 * patient) est dérivé du dépôt.
 *
 * `symboles` : les identifiants par lesquels une surface consomme la source.
 * Un fichier qui les mentionne est un appelant candidat ; les bancs (`*.test.*`)
 * sont exclus — un test n'est pas une surface.
 */
export const SOURCES_DE_SAVOIR = [
  {
    id: 'questionnaires',
    libelle: 'Catalogue des questionnaires et scoring',
    module: 'web/src/lib/questions.ts',
    symboles: ['QUESTIONNAIRE_CATALOGUE', 'calculateScore'],
    // `WN_ALI_01_SIIN57` décide QUEL instrument le patient remplit, et il est
    // allumé en production. Il vit dans une DÉPENDANCE de la source, jamais
    // dans un appelant : `modulesDeGarde` remonte les imports des appelants,
    // il ne descend pas dans ceux de la source. Sans cette déclaration, la
    // ligne la plus centrale de la matrice rendait « — ».
    modulesGardes: ['web/src/lib/questionnaires/alimentaire.ts'],
    decisionProduite: 'Score et sous-scores d’un instrument passé par le patient.',
  },
  {
    id: 'orientation-nnpp2',
    libelle: 'Table d’orientation NNPP2 (règles signées)',
    module: 'web/src/lib/clinical/orientationRulesV1.ts',
    symboles: ['ORIENTATION_RULES_V1', 'ORIENTATION_METADATA'],
    // La garde n'est ni un `featureFlag.ts` ni un `access.ts` : c'est
    // `orientationService.ts`, qui porte le ET `WN_ENABLE_ORIENTATION_NNPP2`
    // + `tableSignee()`. Une garde nommée hors convention ne se devine pas —
    // elle se déclare, sinon la colonne rend « — » sur la surface la plus
    // verrouillée du dépôt.
    modulesGardes: ['web/src/lib/clinical/orientationService.ts'],
    decisionProduite: 'Orientation clinique proposée au praticien à partir des scores.',
  },
  {
    id: 'contradictions-nnpp2',
    libelle: 'Table de contradictions NNPP2 (règles signées)',
    module: 'web/src/lib/clinical/contradictionsV1.ts',
    symboles: ['CONTRADICTIONS_RULES_V1', 'CONTRADICTIONS_METADATA'],
    // Même forme que l'orientation, et même raison de le déclarer : la garde
    // est `contradictionsService.ts`, qui porte le ET
    // `WN_ENABLE_CONTRADICTIONS_NNPP2` + `tableSignee()`. Sans cette ligne, la
    // source de savoir clinique la PLUS RÉCENTE du dépôt serait la seule que la
    // matrice ne verrait pas — et c'est exactement ce qu'elle existe pour voir.
    modulesGardes: ['web/src/lib/clinical/contradictionsService.ts'],
    decisionProduite: 'Constat de contradiction entre instruments, affiché au cockpit praticien (table non signée : rien ne sort).',
  },
  {
    id: 'corpus-clinique-synthese',
    libelle: 'Corpus clinique de synthèse V1',
    module: 'web/src/lib/clinical/corpusSyntheseV1.ts',
    symboles: ['CORPUS_CLINIQUE_METADATA', 'CORPUS_CLINIQUE_SYNTHESE_V1'],
    // Le ET `WN_ENABLE_CORPUS_CLINIQUE_V1` + `validationExterne` est écrit
    // dans `lib/anthropic.ts`, qui n'est pas non plus un module de garde au
    // sens des conventions de nommage.
    modulesGardes: ['web/src/lib/anthropic.ts'],
    decisionProduite: 'Cadrage clinique injecté dans la synthèse rédigée par le modèle.',
  },
  {
    id: 'catalogue-complements',
    libelle: 'Catalogue des compléments alimentaires (C4)',
    module: 'web/src/lib/supplement-library/catalogue.ts',
    symboles: ['C4_CATALOGUE_VERSION', 'FACETTES_SERVIES'],
    modulesGardes: [{ chemin: 'web/src/lib/supplement-library/featureFlag.ts', noms: ['isC4Enabled'] }],
    decisionProduite: 'Fiche complément : composition, cumuls, compatibilités.',
  },
  {
    // La question du lot est « qui LIT ce savoir pour décider », pas « qui
    // l'écrit ». Une première version déclarait `referentiel.ts` et
    // `compositions.ts` par leurs symboles d'ingestion (`ingest*`, `parse*`) :
    // leur unique appelant était alors leur propre route d'écriture, la ligne
    // ressortait « consommée », donc sans dette — alors que ce sont
    // précisément les données dont le trou de dose plafonne le cumul.
    id: 'resolution-intentions-complements',
    libelle: 'Résolution des intentions et compositions (lecture des compléments)',
    module: 'web/src/lib/supplement-library/resolution.ts',
    symboles: ['resoudreIntentions'],
    modulesGardes: [{ chemin: 'web/src/lib/supplement-library/featureFlag.ts', noms: ['isC4Enabled'] }],
    decisionProduite: 'Quels ingrédients une fiche contient réellement, et à quelle dose.',
  },
  {
    id: 'compatibilite-complements',
    libelle: 'Tableau de compatibilité et de cumul entre compléments',
    module: 'web/src/lib/supplement-library/compatibilite.ts',
    symboles: ['construireTableauCompatibilite'],
    modulesGardes: [{ chemin: 'web/src/lib/supplement-library/featureFlag.ts', noms: ['isC4Enabled'] }],
    decisionProduite: 'Cumul signalé ou absence de cumul, affichés sur la fiche.',
  },
  {
    id: 'boussole-alimentaire',
    libelle: 'Boussole alimentaire (C5) — distribution signée des aliments',
    module: 'web/src/lib/food-compass/distribution.ts',
    symboles: ['getSignedFoodCompassDistribution', 'C5_OFFICIAL_FOOD_COUNT'],
    modulesGardes: ['web/src/lib/food-compass/featureFlag.ts'],
    decisionProduite: 'Lecture PRAL/densité d’un aliment servie au patient et au praticien.',
  },
  {
    id: 'catalogue-biologie',
    libelle: 'Bibliothèque de biologie fonctionnelle (987 actes NABM V105)',
    // Les 987 actes vivent en base depuis le 2026-07-26 ; côté code, le seul
    // accès est `remboursable.ts` (dérivation du régime de remboursement),
    // gardé par `featureFlag.ts`. Rien d'autre ne les touche — et c'est
    // précisément ce que la matrice doit montrer.
    module: 'web/src/lib/biology-library/remboursable.ts',
    // `isCbEnabled` n'est PAS listé ici : il est défini dans `featureFlag.ts`,
    // et un symbole cherché dans tout l'index fait entrer son propre fichier
    // de définition dans les appelants. La garde se déclare en
    // `modulesGardes`, qui alimente la colonne des drapeaux sans jamais
    // compter comme un consommateur.
    symboles: ['deriverRemboursement', 'regimeDocumentaire'],
    modulesGardes: ['web/src/lib/biology-library/featureFlag.ts'],
    decisionProduite: 'Régime de remboursement d’un acte de biologie proposé.',
  },
  {
    id: 'packs-consultation',
    libelle: 'Packs de consultation (registre + repli legacy)',
    module: 'web/src/lib/consultation/packRegistry.ts',
    symboles: ['resolvePackQuestionnaireIds', 'RaisonRepliLegacy'],
    decisionProduite: 'Quels questionnaires composent une consultation.',
  },
  {
    id: 'registre-sources-notebooks',
    // Ce module est la VUE notebooks du registre sanitaire des sources, pas la
    // barrière D-003 : celle-ci vit dans `match_wellneuro_rag_claims` (SQL) et
    // dans `rayonCorpus.ts`. Nommer la ligne « barrière D-003 » faisait croire
    // que la matrice mesure les appelants du savoir validé, alors qu'elle
    // mesure ceux d'un helper d'annotation.
    libelle: 'Registre sanitaire des sources — vue par notebook',
    module: 'web/src/lib/rag/claims/notebooks.ts',
    symboles: ['sourcesDuNotebook', 'annoterSources', 'noticeDeSource'],
    decisionProduite: 'Quelles sources bibliographiques adossent un rayon de corpus.',
  },
];

// ── Collecte ────────────────────────────────────────────────────────────────

function git(args, racine) {
  return execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/**
 * Index {chemin, contenu} de tout `web/src`, lu UNE fois. Tout le reste du
 * script est ensuite une fonction pure de cet index : c'est ce qui rend la
 * matrice testable sur fixtures sans dépôt git ni réseau.
 *
 * Un fichier illisible est ignoré plutôt que fatal — comme les collecteurs de
 * `wn-etat-reel.mjs`, une entrée manquante ne doit jamais faire échouer les
 * autres.
 */
/**
 * Retire commentaires de bloc et de ligne. Ce dépôt commente BEAUCOUP, et
 * nomme volontiers dans un commentaire ce qu'un fichier ne fait justement pas
 * (« servirRayonCorpus ne gate plus sur aucun flag », `access.test.ts:13`).
 * Sans ce nettoyage, une source citée en prose passait pour consommée — la
 * matrice aurait affirmé l'inverse de ce qu'elle est censée révéler.
 *
 * Le `//` précédé de `:` est épargné : c'est une URL (`https://…`), pas un
 * commentaire, et tronquer sa ligne ferait disparaître de vrais identifiants.
 *
 * **Deux passes de regex ne peuvent pas faire ce travail**, et le prouver a
 * coûté deux tours de revue. Retirer les blocs d'abord transforme un `/*`
 * écrit dans un commentaire de ligne (« les six routes `api/patient/*` ont
 * changé », tournure courante ici) en ouverture de bloc. Retirer les lignes
 * d'abord fait l'inverse : un `//` écrit DANS un bloc emporte le `*​/` qui
 * ferme ce bloc, et le commentaire ressort comme du code. Ni l'une ni l'autre
 * ne connaît les chaînes — `const s = '/*'` ou `'https://x'` cassent les deux.
 * Choisir un ordre déplace le défaut, il ne le ferme pas.
 *
 * D'où cet automate : un seul passage, quatre états (code, chaîne, commentaire
 * de ligne, commentaire de bloc). Il connaît les trois quotes, les échappements
 * et les gabarits, donc un `//` ou un `/*` dans une chaîne reste une chaîne.
 *
 * Les fins de ligne sont normalisées EN PREMIER. 72 des 879 fichiers de
 * `web/src` sont en CRLF, et une version antérieure y était purement
 * inopérante (`$` sans `m` n'accroche pas devant un `\r`) : les commentaires y
 * survivaient tous, et la ligne « catalogue des questionnaires » de la matrice
 * livrée comptait 17 surfaces fantômes, toutes descendant d'un seul
 * commentaire de `lib/equilibre/types.ts`. Un correctif inopérant sur 8 % des
 * fichiers, invisible parce que toutes les fixtures étaient en LF.
 */
export function sansCommentaires(source) {
  const texte = source.replace(/\r\n?/g, '\n');
  let sortie = '';
  let i = 0;
  let quote = null; // "'", '"' ou '`' quand on est dans une chaîne

  while (i < texte.length) {
    const c = texte[i];
    const suivant = texte[i + 1];

    if (quote) {
      sortie += c;
      if (c === '\\') {
        // Échappement : le caractère suivant ne peut pas fermer la chaîne.
        sortie += texte[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      // Une chaîne simple ou double ne franchit pas la fin de ligne. Sans
      // cette garde, une apostrophe française en JSX (`<p>L'équilibre du
      // patient</p>`, le motif le plus courant de ce dépôt) ouvre une
      // pseudo-chaîne qui court jusqu'à l'apostrophe suivante du fichier — et
      // tout ce qu'elle enjambe, commentaires compris, ressort comme du code.
      // Seul le gabarit est multiligne.
      if (c === '\n' && quote !== '`') quote = null;
      i += 1;
      continue;
    }

    if (c === '/' && suivant === '/') {
      while (i < texte.length && texte[i] !== '\n') i += 1;
      continue; // le `\n` sera recopié au tour suivant
    }
    if (c === '/' && suivant === '*') {
      i += 2;
      while (i < texte.length && !(texte[i] === '*' && texte[i + 1] === '/')) {
        // Les fins de ligne du bloc sont conservées : les numéros de ligne
        // restent comparables à ceux du fichier d'origine.
        if (texte[i] === '\n') sortie += '\n';
        i += 1;
      }
      i += 2;
      sortie += ' ';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    sortie += c;
    i += 1;
  }

  return sortie;
}

export function chargerIndexSources(racine) {
  let liste;
  try {
    liste = git(['ls-files', 'web/src'], racine).split('\n').filter(Boolean);
  } catch {
    return [];
  }
  const index = [];
  for (const chemin of liste) {
    if (!/\.(ts|tsx|js|jsx)$/.test(chemin)) continue;
    try {
      const brut = fs.readFileSync(path.join(racine, chemin), 'utf8');
      index.push({ chemin, contenu: sansCommentaires(brut) });
    } catch {
      /* fichier illisible : ignoré, jamais fatal */
    }
  }
  return index;
}

export function lireDecisions(racine) {
  const cheminRelatif = path.posix.join(...CHEMIN_DECISIONS);
  const cheminAbsolu = path.join(racine, ...CHEMIN_DECISIONS);
  if (!fs.existsSync(cheminAbsolu)) return { status: 'missing', chemin: cheminRelatif, decisions: {} };
  try {
    const brut = JSON.parse(fs.readFileSync(cheminAbsolu, 'utf8'));
    const decisions = brut && typeof brut.decisions === 'object' && brut.decisions ? brut.decisions : {};
    return { status: 'loaded', chemin: cheminRelatif, decisions };
  } catch {
    return { status: 'invalid', chemin: cheminRelatif, decisions: {} };
  }
}

// ── Dérivation (fonctions pures sur l'index) ────────────────────────────────

const estBanc = (chemin) => /\.(test|spec)\.[tj]sx?$/.test(chemin);

/** `web/src/lib/a/b.ts` → `@/lib/a/b` — le spécificateur par lequel on l'importe. */
export function specificateurModule(chemin) {
  return `@/${chemin.replace(/^web\/src\//, '').replace(/\.(ts|tsx|js|jsx)$/, '')}`;
}

function echapper(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Un jeton est soit un identifiant (`ORIENTATION_METADATA`), soit un
 * spécificateur d'import (`@/lib/clinical/orientationService`, `./catalogue`).
 *
 * Les deux ne s'ancrent pas pareil, et c'est un piège qui a coûté une première
 * version fausse : `\b` exige une transition mot/non-mot, or un spécificateur
 * commence par `@` ou `.` — non-mot — précédé d'une apostrophe, non-mot elle
 * aussi. `\b@/lib/…` ne correspondait JAMAIS, et toutes les chaînes d'import
 * remontaient vides : la matrice déclarait dormante la table d'orientation, que
 * `api/praticien/orientation/route.ts` importe pourtant en toutes lettres.
 */
export function mentionne(contenu, jeton) {
  if (/^[\w$]+$/.test(jeton)) return new RegExp(`\\b${echapper(jeton)}\\b`).test(contenu);
  return contenu.includes(jeton);
}

/**
 * Les formes sous lesquelles un module peut être importé : son alias `@/…`,
 * la forme abrégée du baril (`@/lib/x` pour `@/lib/x/index`), et la forme
 * relative — celle-ci n'étant valable que DANS le même dossier, sans quoi
 * `./catalogue` confondrait `supplement-library` et `biology-library`.
 */
export function jetonsDeModule(chemin) {
  const alias = specificateurModule(chemin);
  const base = path.posix.basename(chemin).replace(/\.(ts|tsx|js|jsx)$/, '');
  const dossier = path.posix.dirname(chemin);
  const jetons = [{ jeton: alias, dossier: null }, { jeton: `./${base}`, dossier }];
  if (base === 'index') jetons.push({ jeton: alias.replace(/\/index$/, ''), dossier: null });
  return jetons;
}

/**
 * Nature d'un fichier consommateur. C'est cette classification qui distingue
 * une SURFACE (route, écran, composant — quelque chose qu'un humain atteint)
 * d'un simple relais de bibliothèque. Une source dont tous les appelants sont
 * des relais reste dormante : personne ne peut l'atteindre.
 */
export function natureDuFichier(chemin) {
  // Tout `route.ts` de l'App Router est une route, `api/` ou non : le portail
  // patient en pose plusieurs hors de `api/` (`app/portail/google/route.ts`,
  // `app/portail/lien/[jeton]/route.ts`). Les ranger en « librairie » les
  // sortait des surfaces — elles ne comptaient donc pour personne.
  if (/^web\/src\/app\/.*\/route\.tsx?$/.test(chemin)) return 'route-api';
  // `.*\/` exigeait un sous-dossier : `app/page.tsx` et `app/layout.tsx`, la
  // racine du site, n'étaient pas des écrans.
  if (/^web\/src\/app\/(.*\/)?(page|layout)\.tsx?$/.test(chemin)) return 'ecran';
  if (/^web\/src\/components\//.test(chemin)) return 'composant';
  return 'librairie';
}

const NATURES_SURFACE = new Set(['route-api', 'ecran', 'composant']);

/**
 * Le patient voit-il ce fichier ? Dérivé du chemin : portail patient (écrans
 * `app/patient`, routes `api/portail`) ou composants du portail. Tout le reste
 * est praticien.
 */
export function estVisiblePatient(chemin) {
  // Route ou écran : la réponse est dans le chemin. `app/portail/` couvre le
  // parcours unifié livré au LOT-04 (#591) — dix écrans que les clauses
  // initiales ignoraient ; `components/portail/`, lui, n'a jamais existé.
  //
  // Un COMPOSANT, en revanche, ne se juge pas au nom : `components/patient/`
  // est bien patient, mais `components/patient-cockpit/` est le cockpit du
  // PRATICIEN, monté depuis `app/dashboard/`. Un préfixe `components/patient`
  // sans séparateur attrapait les deux et faisait dire à la matrice que la
  // table d'orientation est visible du patient — en contradiction avec sa
  // propre colonne « décision produite » (« proposée au praticien »). Les
  // composants passent donc par `visibilitePatientDeLaSurface`, qui remonte
  // au point de montage.
  return /^web\/src\/app\/(patient|portail)\//.test(chemin)
    || /^web\/src\/app\/api\/(patient|portail)\//.test(chemin);
}

/**
 * Un composant est visible du patient si l'un des écrans qui le MONTENT l'est.
 * Dérivé, pas deviné : on remonte les importateurs du composant jusqu'à un
 * fichier d'`app/`. Un composant qu'aucun écran n'importe ne compte pas.
 */
export function visibilitePatientDeLaSurface(index, surface) {
  if (surface.nature !== 'composant') return estVisiblePatient(surface.chemin);
  // Un composant peut être monté par un AUTRE composant, lui-même monté par
  // un écran (`app/portail/…/page.tsx → Formulaire.tsx → Champ.tsx`).
  // S'arrêter au parent rendait « non » sur un composant pourtant affiché au
  // patient — sans rien signaler. On remonte donc de composant en composant,
  // borné comme le reste par `PROFONDEUR_MAX`.
  const vus = new Set([surface.chemin]);
  let frontiere = [surface.chemin];
  for (let saut = 0; saut < PROFONDEUR_MAX && frontiere.length > 0; saut += 1) {
    const montages = frontiere
      .flatMap((chemin) => appelantsDe(index, jetonsDeModule(chemin), [...vus]))
      .filter((a) => a.nature !== 'librairie');
    if (montages.some((m) => estVisiblePatient(m.chemin))) return true;
    frontiere = [];
    for (const m of montages) {
      if (vus.has(m.chemin) || m.nature !== 'composant') continue;
      vus.add(m.chemin);
      frontiere.push(m.chemin);
    }
  }
  return false;
}

/**
 * Remonte des jetons d'une source jusqu'aux fichiers qui la consomment, en
 * suivant les imports jusqu'à `PROFONDEUR_MAX` sauts. Rend TOUS les fichiers
 * atteints, chacun avec sa nature et sa distance — y compris zéro, qui est le
 * résultat intéressant.
 *
 * `exclus` : le module de définition lui-même. Un fichier ne se consomme pas.
 */
export function appelantsDe(index, jetons, exclus = []) {
  const vus = new Map();
  const ignores = new Set(exclus);
  // Chaque entrée est `{jeton, dossier}` : `dossier` non nul restreint la
  // correspondance aux fichiers de ce dossier (cas des imports relatifs).
  let frontiere = jetons.map((j) => (typeof j === 'string' ? { jeton: j, dossier: null } : j));

  for (let saut = 0; saut < PROFONDEUR_MAX && frontiere.length > 0; saut += 1) {
    const suivante = [];
    for (const fichier of index) {
      if (ignores.has(fichier.chemin) || estBanc(fichier.chemin) || vus.has(fichier.chemin)) continue;
      const correspond = frontiere.some(
        ({ jeton, dossier }) =>
          (dossier === null || path.posix.dirname(fichier.chemin) === dossier)
          && mentionne(fichier.contenu, jeton),
      );
      if (!correspond) continue;
      const nature = natureDuFichier(fichier.chemin);
      vus.set(fichier.chemin, { chemin: fichier.chemin, nature, saut });
      // Un relais de bibliothèque prolonge la chaîne ; une surface la termine.
      if (nature === 'librairie') suivante.push(...jetonsDeModule(fichier.chemin));
    }
    frontiere = suivante;
  }

  return [...vus.values()].sort((a, b) => a.chemin.localeCompare(b.chemin));
}

/**
 * Le texte à scanner pour une portée : le fichier entier (`noms: null`) ou la
 * seule tranche des exports atteints.
 */
function texteDeLaPortee(index, { chemin, noms }) {
  const fichier = index.find((f) => f.chemin === chemin);
  if (!fichier) return '';
  if (noms === null || noms.length === 0) return fichier.contenu;
  return noms.map((n) => trancheExport(fichier.contenu, n) ?? '').join('\n');
}

/**
 * Les drapeaux LUS dans les portées données — `process.env.WN_*`, et rien
 * d'autre. Ce sont des références dans le code, jamais des valeurs
 * d'environnement (même asymétrie que `wn-etat-reel.mjs`).
 *
 * Chercher le simple littéral `WN_[A-Z_]+` attrapait les mentions en clair
 * dans les **messages d'interface** : `featureFlag.ts` porte « Son activation
 * métier se fait via le flag WN_RECHERCHE_CORPUS_ENABLED. », une chaîne
 * affichée au praticien. Ce nom-là se retrouvait attribué à micronutrition,
 * dont le code dit en toutes lettres que le servir par cette porte
 * **contournerait** ce drapeau. Une phrase qui NOMME un drapeau n'est pas une
 * garde ; seul `process.env` en est une.
 *
 * Limite assumée : une lecture par déstructuration (`const { WN_X } =
 * process.env`) n'est pas vue. Le dépôt n'en contient aucune, et une garde
 * invisible vaut mieux qu'une garde inventée.
 */
export function drapeauxDe(index, portees) {
  const trouves = new Set();
  for (const portee of portees) {
    const texte = texteDeLaPortee(index, portee);
    for (const m of texte.matchAll(/process\.env\.(WN_[A-Z0-9_]+)/g)) trouves.add(m[1]);
    for (const m of texte.matchAll(/process\.env\[\s*['"](WN_[A-Z0-9_]+)['"]\s*\]/g)) trouves.add(m[1]);
  }
  return [...trouves].sort();
}

export function verrousDonneeDe(index, portees) {
  const trouves = new Set();
  for (const portee of portees) {
    const texte = texteDeLaPortee(index, portee);
    for (const motif of MOTIFS_VERROU_DONNEE) if (mentionne(texte, motif)) trouves.add(motif);
  }
  return [...trouves].sort();
}

/**
 * Les rayons de corpus, lus DANS `rayonCorpus.ts` et non recopiés ici. C'est
 * la garantie qui compte : un rayon ajouté à `RAYON_VERS_NOTEBOOK` entre dans
 * la matrice au prochain appel, sans que personne y pense — la classe de
 * défaut qui s'est produite deux fois (#546 puis #552, un rayon exposé derrière
 * le mauvais drapeau parce qu'une liste avait été maintenue à la main).
 */
export function collecterRayons(index) {
  const fichier = index.find((f) => f.chemin === MODULE_RAYONS);
  if (!fichier) return [];
  const corps = corpsDObjet(fichier.contenu, 'RAYON_VERS_NOTEBOOK');
  if (corps === null) return [];

  // Chaque entrée du bloc est examinée — jamais comptée. Une version
  // antérieure comparait le nombre de rayons lus à un `(bloc.match(/:\s*['"]/g))`,
  // qui compte AUSSI les `: "` situés à l'intérieur d'une valeur (faux
  // positif sur du TypeScript légal) et ignore toute valeur non littérale
  // (omission silencieuse — le défaut même qu'il prétendait détecter).
  //
  // Quatre formes de clé : identifiant nu (`biologie:`), alias calculé
  // (`[RAYON_MICRONUTRITION]:`), clé citée (`'axe-thyroide':`, `"peau":`) —
  // seule façon d'écrire une clé à tiret.
  const MOTIF_CLE = /^(?:\[([A-Za-z0-9_$]+)\]|'([^']*)'|"([^"]*)"|([A-Za-z0-9_$]+))\s*:\s*([\s\S]*)$/;
  const rayons = [];
  for (const entree of entreesDObjet(corps)) {
    const m = MOTIF_CLE.exec(entree.trim());
    if (!m) {
      rayons.push({ cle: `NON_ANALYSÉ (${entree.trim().slice(0, 40)})`, notebook: 'entrée que le parseur n’a pas su lire', alias: null });
      continue;
    }
    const [, alias, citeeSimple, citeeDouble, nue, valeurBrute] = m;
    let cle = citeeSimple ?? citeeDouble ?? nue ?? null;
    if (alias) {
      const resolu = new RegExp(`${echapper(alias)}\\s*=\\s*['"]([^'"]*)['"]`).exec(fichier.contenu);
      cle = resolu ? resolu[1] : `NON_ANALYSÉ (alias ${alias} non résolu)`;
    }
    // Une valeur non littérale (constante, gabarit) ne se lit pas ici — mais
    // le rayon existe et doit figurer dans la matrice. On le liste avec un
    // notebook explicitement inconnu plutôt que de le laisser tomber.
    const litteral = /^['"]([^'"]*)['"]/.exec(valeurBrute.trim());
    rayons.push({ cle, notebook: litteral ? litteral[1] : 'notebook non littéral — non lisible ici', alias: alias ?? null });
  }
  return rayons;
}

/**
 * Corps de l'objet littéral affecté à `nom`, délimité par accolades
 * appariées et non par un `\n}` de fin de ligne — `} as const;` indenté
 * faisait échouer la recherche et perdre TOUS les rayons d'un coup.
 * Les accolades vivant dans une chaîne ne comptent pas.
 */
export function corpsDObjet(contenu, nom) {
  const depart = new RegExp(`${echapper(nom)}[^={]*=[^{]*\\{`).exec(contenu);
  if (!depart) return null;
  const debut = depart.index + depart[0].length;
  let profondeur = 1;
  let quote = null;
  for (let i = debut; i < contenu.length; i += 1) {
    const c = contenu[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '{' || c === '[' || c === '(') profondeur += 1;
    else if (c === '}' || c === ']' || c === ')') {
      profondeur -= 1;
      if (profondeur === 0) return contenu.slice(debut, i);
    }
  }
  return null;
}

/** Découpe un corps d'objet à ses virgules de premier niveau, hors chaînes. */
export function entreesDObjet(corps) {
  const entrees = [];
  let courant = '';
  let profondeur = 0;
  let quote = null;
  for (let i = 0; i < corps.length; i += 1) {
    const c = corps[i];
    if (quote) {
      courant += c;
      if (c === '\\') { courant += corps[i + 1] ?? ''; i += 1; } else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; courant += c; continue; }
    if (c === '{' || c === '[' || c === '(') profondeur += 1;
    if (c === '}' || c === ']' || c === ')') profondeur -= 1;
    if (c === ',' && profondeur === 0) {
      if (courant.trim()) entrees.push(courant);
      courant = '';
      continue;
    }
    courant += c;
  }
  if (courant.trim()) entrees.push(courant);
  return entrees;
}

/**
 * Les allowlists de rayons déclarées dans `rayonCorpus.ts` (aujourd'hui
 * `RAYONS_RECHERCHE_CORPUS`). Un rayon membre d'une allowlist est consommé par
 * les appelants de CETTE allowlist, même sans que son littéral apparaisse dans
 * la route — c'est le cas de cognition/douleur/intestin.
 */
export function collecterAllowlistsRayons(index) {
  const fichier = index.find((f) => f.chemin === MODULE_RAYONS);
  if (!fichier) return [];
  const listes = [];
  for (const m of fichier.contenu.matchAll(/export const (RAYONS_[A-Z0-9_]+)[^=]*=\s*\[([^\]]*)\]/g)) {
    const membres = [...m[2].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
    listes.push({ nom: m[1], membres });
  }
  return listes;
}

// ── Construction de la matrice ──────────────────────────────────────────────

/**
 * Les modules de garde importés par les fichiers donnés : `featureFlag.ts`,
 * `access.ts` et consorts. Dans ce dépôt, une route ne lit presque jamais
 * `process.env.WN_*` elle-même — elle appelle `getPractitionerC4Access`, qui
 * appelle `isC4Enabled`. Sans ce saut, la colonne des drapeaux rendait « — »
 * pour des rayons pourtant fail-closed derrière `WN_RECHERCHE_CORPUS_ENABLED`,
 * et un tiret dans cette colonne se lit « rien ne le garde ».
 */
/** `import { a, b } from './x'` → `[{specificateur: './x', noms: ['a','b']}]`. */
export function importsDe(contenu) {
  const imports = [];
  for (const m of contenu.matchAll(/import\s+([^;]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const noms = [...m[1].matchAll(/[A-Za-z_$][\w$]*/g)].map((x) => x[0]).filter((n) => n !== 'type' && n !== 'as');
    imports.push({ specificateur: m[2], noms });
  }
  return imports;
}

/**
 * La portion de `contenu` qui déclare `nom`, jusqu'à l'export suivant. C'est
 * l'unité qui compte pour un drapeau : `supplement-library/featureFlag.ts`
 * porte `WN_C4_ENABLED` ET `WN_RECHERCHE_CORPUS_ENABLED`, et scanner le
 * fichier entier attribuait les deux à chacun de ses accesseurs — donc
 * `WN_C4_ENABLED` aux rayons de recherche, dont le code dit en toutes lettres
 * qu'ils en sont « délibérément distincts », et `WN_RECHERCHE_CORPUS_ENABLED`
 * à micronutrition, que servir par cette porte **contournerait**. La classe
 * #546/#552 réécrite par l'outil bâti pour la prévenir.
 */
export function trancheExport(contenu, nom) {
  const debut = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${echapper(nom)}\\b`).exec(contenu);
  if (!debut) return null;
  const reste = contenu.slice(debut.index + debut[0].length);
  // La tranche s'arrête à la prochaine déclaration de premier niveau, pas
  // seulement au prochain `export` : un `const` intercalaire non exporté
  // faisait déborder la tranche sur le voisin suivant.
  const fin = /\n(?:export|const|let|var|function|class|type|interface)\s/.exec(reste);
  return reste.slice(0, fin ? fin.index : reste.length);
}

function resoudreSpecificateur(index, cheminSource, specificateur) {
  const attendu = specificateur.startsWith('.')
    ? path.posix.normalize(path.posix.join(path.posix.dirname(cheminSource), specificateur))
    : `web/src/${specificateur.replace(/^@\//, '')}`;
  return index.find((f) => f.chemin.replace(/\.(ts|tsx|js|jsx)$/, '') === attendu) ?? null;
}

/**
 * Les modules de garde atteints depuis `chemins`, **avec les noms par
 * lesquels ils sont atteints**. Dans ce dépôt une route ne lit presque jamais
 * `process.env.WN_*` : elle appelle `getPractitionerC4Access`, qui appelle
 * `isC4Enabled`. Deux sauts, et seul le second lit l'environnement — d'où
 * l'itération. Les noms suivent la chaîne : ce que la tranche d'un accesseur
 * mentionne détermine ce qu'on va chercher au saut suivant.
 */
export function modulesDeGarde(index, chemins) {
  const trouves = new Map(); // chemin → Set de noms (vide = fichier entier)
  let frontiere = chemins.map((chemin) => ({ chemin, noms: null }));

  for (let saut = 0; saut < PROFONDEUR_MAX && frontiere.length > 0; saut += 1) {
    const suivante = [];
    for (const { chemin, noms } of frontiere) {
      const fichier = index.find((f) => f.chemin === chemin);
      if (!fichier) continue;
      // Portée examinée : les tranches des noms atteints, ou le fichier entier
      // au premier saut (une surface lit parfois `process.env` elle-même).
      const portee = noms === null
        ? fichier.contenu
        : [...noms].map((n) => trancheExport(fichier.contenu, n) ?? '').join('\n');

      for (const { specificateur, noms: importes } of importsDe(fichier.contenu)) {
        if (!/(featureFlag|access|auth|gouvernance)$/.test(specificateur)) continue;
        const cible = resoudreSpecificateur(index, chemin, specificateur);
        if (!cible) continue;
        // Seuls les noms effectivement mentionnés dans la portée examinée
        // prolongent la chaîne — sans quoi tout accesseur voisin du bon
        // ramènerait son drapeau avec lui.
        const pertinents = importes.filter((n) => mentionne(portee, n));
        if (pertinents.length === 0) continue;
        const dejaVus = trouves.get(cible.chemin) ?? new Set();
        const nouveaux = pertinents.filter((n) => !dejaVus.has(n));
        if (nouveaux.length === 0) continue;
        for (const n of nouveaux) dejaVus.add(n);
        trouves.set(cible.chemin, dejaVus);
        suivante.push({ chemin: cible.chemin, noms: new Set(nouveaux) });
      }
    }
    frontiere = suivante;
  }

  return [...trouves.entries()].map(([chemin, noms]) => ({ chemin, noms: [...noms] }));
}

function ligneDepuisAppelants(base, index, appelants) {
  const surfaces = appelants.filter((a) => NATURES_SURFACE.has(a.nature));
  // Les drapeaux se lisent sur la source, ses modules de garde déclarés, et
  // ses surfaces DIRECTES — pas sur toute la fermeture transitive. Élargir
  // attribuait au catalogue de questionnaires quatre drapeaux qui ne le
  // gardent pas (`WN_AGENDA_ALI`, `WN_C5_ENABLED`…), simplement ramassés dans
  // le voisinage.
  const directes = surfaces.filter((s) => s.saut === 0).map((s) => s.chemin);
  // Portées scannées pour les drapeaux. Fichier entier pour la source, ses
  // gardes DÉCLARÉES et ses surfaces directes ; tranche d'export seulement
  // pour les gardes découvertes — un `featureFlag.ts` en porte plusieurs, et
  // chacune ne concerne que son accesseur.
  // Une garde déclarée peut l'être en entier (`'chemin'`) ou par accesseur
  // (`{chemin, noms}`) : `supplement-library/featureFlag.ts` porte
  // `WN_C4_ENABLED` ET `WN_RECHERCHE_CORPUS_ENABLED`, et le déclarer en entier
  // attribuait les deux à tout ce qui le cite.
  const gardesDeclarees = (base.modulesGardes ?? []).map((g) => (typeof g === 'string' ? { chemin: g, noms: null } : { noms: null, ...g }));
  const seed = [base.module, ...gardesDeclarees.map((g) => g.chemin), ...directes].filter(Boolean);
  const declares = new Set(seed);
  const portees = [
    ...[base.module, ...directes].filter(Boolean).map((chemin) => ({ chemin, noms: null })),
    ...gardesDeclarees,
    ...modulesDeGarde(index, seed).filter((g) => !declares.has(g.chemin)),
  ];
  return {
    ...base,
    // `saut` = distance d'import. 0 = la surface importe la source elle-même ;
    // au-delà, elle l'atteint À TRAVERS un relais. La nuance n'est pas
    // cosmétique : `corpusSyntheseV1` traverse `lib/anthropic.ts`, que seize
    // surfaces importent — les compter toutes comme consommatrices dirait
    // « atteignable », pas « consomme ».
    surfaces: surfaces.map((s) => ({ chemin: s.chemin, nature: s.nature, saut: s.saut })),
    relais: appelants.filter((a) => a.nature === 'librairie').map((a) => a.chemin),
    drapeaux: drapeauxDe(index, portees),
    verrousDonnee: verrousDonneeDe(index, portees),
    patientVisible: surfaces.some((s) => visibilitePatientDeLaSurface(index, s)),
    consommee: surfaces.length > 0,
  };
}

/**
 * Fonction pure : index + déclarations + décisions → matrice. Aucun accès
 * disque, aucun git. C'est elle que le banc exerce.
 */
export function construireMatrice(index, decisions, sources = SOURCES_DE_SAVOIR) {
  const lignes = [];

  for (const source of sources) {
    const appelants = appelantsDe(index, [...source.symboles, ...jetonsDeModule(source.module)], [source.module]);
    lignes.push(
      ligneDepuisAppelants(
        {
          id: source.id,
          libelle: source.libelle,
          module: source.module,
          modulesGardes: source.modulesGardes,
          decisionProduite: { origine: 'déclaré', texte: source.decisionProduite },
        },
        index,
        appelants,
      ),
    );
  }

  const allowlists = collecterAllowlistsRayons(index);
  // Le nom d'un rayon est un mot courant : « sommeil », « humeur » et
  // « stress » apparaissent partout dans l'app (agenda du sommeil, météo
  // d'adhésion…) sans rapport avec le corpus. Chercher le littéral dans TOUT
  // le dépôt déclarait ces trois rayons consommés — l'inverse exact de la
  // vérité, et le genre de faux vert qu'une matrice est censée détruire.
  //
  // Le candidat légitime est donc borné : d'abord les fichiers qui consomment
  // `servirRayonCorpus`, ensuite seulement ceux d'entre eux qui nomment le
  // rayon.
  const consommateursDuService = appelantsDe(
    index,
    ['servirRayonCorpus', ...jetonsDeModule(MODULE_RAYONS)],
    [MODULE_RAYONS],
  );

  for (const rayon of collecterRayons(index)) {
    // Jetons du rayon : son littéral, son alias éventuel, et le nom de toute
    // allowlist dont il est membre. Sans ce dernier, cognition/douleur/intestin
    // seraient déclarés dormants alors qu'une route les sert via l'allowlist.
    const jetons = [`'${rayon.cle}'`, `"${rayon.cle}"`];
    if (rayon.alias) jetons.push(rayon.alias);
    for (const liste of allowlists) if (liste.membres.includes(rayon.cle)) jetons.push(liste.nom);
    lignes.push(
      ligneDepuisAppelants(
        {
          id: `rayon:${rayon.cle}`,
          libelle: `Rayon de corpus « ${rayon.cle} » → notebook ${rayon.notebook}`,
          module: MODULE_RAYONS,
          decisionProduite: { origine: 'déclaré', texte: 'Claims validés servis pour ce rayon.' },
        },
        index,
        consommateursDuService.filter((appelant) => {
          const fichier = index.find((f) => f.chemin === appelant.chemin);
          return fichier ? jetons.some((jeton) => mentionne(fichier.contenu, jeton)) : false;
        }),
      ),
    );
  }

  // Jointure avec les décisions datées. Une source dormante SANS décision est
  // une dette non arbitrée — c'est le seul défaut que ce script sait nommer.
  const connus = new Set(lignes.map((l) => l.id));
  for (const ligne of lignes) {
    const d = decisions[ligne.id] ?? null;
    ligne.decision = d ? { origine: 'déclaré', ...d } : null;
  }
  const sansDecision = lignes.filter((l) => !l.consommee && !l.decision).map((l) => l.id);
  const decisionsOrphelines = Object.keys(decisions).filter((id) => !connus.has(id));

  return {
    lignes: lignes.sort((a, b) => a.id.localeCompare(b.id)),
    sansDecision,
    decisionsOrphelines,
  };
}

export function construireRapport(racine) {
  const index = chargerIndexSources(racine);
  const registre = lireDecisions(racine);
  const matrice = construireMatrice(index, registre.decisions);
  return {
    genereLe: new Date().toISOString(),
    fichiersIndexes: index.length,
    registreDecisions: { status: registre.status, chemin: registre.chemin },
    // Jamais « actifs » : ce sont des références dans le code. La valeur en
    // production n'est pas lue ici (même asymétrie que `wn-etat-reel.mjs`).
    valeurDrapeauxEnEnvironnement: null,
    ...matrice,
  };
}

// ── Rendu Markdown ──────────────────────────────────────────────────────────

const cellule = (texte) => String(texte).replace(/\|/g, '\\|');

export function rendreMarkdown(rapport) {
  const l = [];
  l.push('# Matrice de consommation du savoir');
  l.push('');
  l.push('> **Fichier généré — ne pas éditer à la main.**');
  l.push('> `node scripts/wn-matrice-consommation.mjs --markdown` le régénère depuis le code.');
  l.push('> Les arbitrages, eux, s’écrivent dans `docs/claude/corpus/consommation_decisions.json`.');
  l.push('');
  l.push('La colonne « surface » est **dérivée des imports**, pas rédigée : une source');
  l.push('sans appelant y apparaît avec une surface vide. C’est l’information');
  l.push('recherchée, pas une omission.');
  l.push('');
  l.push('Un **drapeau référencé n’est pas un drapeau posé** : ce tableau ne lit aucune');
  l.push('valeur d’environnement, seulement les `process.env.WN_*` du code. Un double');
  l.push('verrou (drapeau **et** condition de donnée, colonne « verrou donnée ») laisse la');
  l.push('surface fermée même drapeau posé.');
  l.push('');
  l.push('Un drapeau lu par une surface directe est listé **même s’il ne garde qu’un aspect');
  l.push('de cette surface** : `WN_SYNTHESE_STREAM` choisit le transport de la route de');
  l.push('synthèse (flux ou JSON), pas l’accès au corpus clinique qu’elle sert. Éteindre un');
  l.push('drapeau de cette colonne ne ferme donc pas nécessairement la source — la colonne');
  l.push('dit « ce qui est lu sur ce chemin », pas « ce qui suffit à le fermer ».');
  l.push('');
  l.push('| Source de savoir | Surface qui la consomme | Décision produite | Drapeau(x) | Verrou donnée | Patient | Arbitrage |');
  l.push('|---|---|---|---|---|---|---|');
  for (const ligne of rapport.lignes) {
    const directes = ligne.surfaces.filter((s) => s.saut === 0);
    const indirectes = ligne.surfaces.length - directes.length;
    let surfaces;
    if (ligne.surfaces.length === 0) surfaces = '**aucune — dormante**';
    else if (directes.length === 0) surfaces = `${indirectes} surface(s) indirecte(s) seulement`;
    else {
      surfaces = directes.map((s) => `\`${s.chemin}\` (${s.nature})`).join('<br>');
      if (indirectes > 0) surfaces += `<br>+ ${indirectes} indirecte(s)`;
    }
    const arbitrage = ligne.decision
      ? `${ligne.decision.verdict ?? '—'} (${ligne.decision.date ?? 'sans date'})`
      : ligne.consommee ? '—' : '**à trancher**';
    l.push(
      `| ${cellule(ligne.libelle)} | ${cellule(surfaces)} | ${cellule(ligne.decisionProduite.texte)} `
      + `| ${cellule(ligne.drapeaux.join(', ') || '—')} | ${cellule(ligne.verrousDonnee.join(', ') || '—')} `
      + `| ${ligne.patientVisible ? 'oui' : 'non'} | ${cellule(arbitrage)} |`,
    );
  }
  l.push('');
  const dormantes = rapport.lignes.filter((x) => !x.consommee);
  l.push(`${rapport.lignes.length} source(s) recensée(s), dont **${dormantes.length} dormante(s)**.`);
  if (rapport.sansDecision.length > 0) {
    l.push('');
    l.push(`Sans arbitrage daté : ${rapport.sansDecision.map((id) => `\`${id}\``).join(', ')}.`);
  }
  l.push('');
  return `${l.join('\n')}\n`;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function resumerSurStderr(rapport, cheminEcrit) {
  const dormantes = rapport.lignes.filter((x) => !x.consommee);
  const lignes = [
    `wn-matrice-consommation : ${rapport.lignes.length} source(s), ${dormantes.length} dormante(s), ${rapport.fichiersIndexes} fichier(s) indexé(s)`,
    `  registre de décisions : ${rapport.registreDecisions.status} (${rapport.registreDecisions.chemin})`,
  ];
  for (const d of dormantes) lignes.push(`  dormante ${d.id} — ${d.decision ? `${d.decision.verdict} (${d.decision.date})` : 'SANS ARBITRAGE'}`);
  for (const id of rapport.decisionsOrphelines) lignes.push(`  arbitrage orphelin : ${id} ne correspond à aucune source`);
  if (cheminEcrit) lignes.push(`  écrit : ${cheminEcrit}`);
  console.error(lignes.join('\n'));
}

// `import.meta.url` porte le chemin RÉSOLU ; `process.argv[1]` porte celui que
// l'appelant a tapé. Sur macOS, `os.tmpdir()` rend `/var/folders/…`, lien
// symbolique vers `/private/var/folders/…` : la comparaison brute échouait, le
// bloc CLI ne tournait pas, et le script sortait **en code 0 sans rien faire**.
// Un `--strict` silencieusement muet vaut moins que pas de garde du tout.
const lanceEnCli = (() => {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  }
})();

if (lanceEnCli) {
  const args = new Set(process.argv.slice(2));
  try {
    const rapport = construireRapport(RACINE);
    let cheminEcrit = null;
    if (args.has('--markdown')) {
      cheminEcrit = path.posix.join(...CHEMIN_MATRICE);
      fs.writeFileSync(path.join(RACINE, ...CHEMIN_MATRICE), rendreMarkdown(rapport));
    } else {
      process.stdout.write(`${JSON.stringify(rapport, null, 2)}\n`);
    }
    resumerSurStderr(rapport, cheminEcrit);
    // `--strict` : une source dormante sans arbitrage daté est un échec. Le
    // défaut reste 0 — observer ne doit pas casser une passe qui ne l'a pas
    // demandé.
    process.exit(args.has('--strict') && rapport.sansDecision.length > 0 ? 2 : 0);
  } catch (err) {
    console.error(`wn-matrice-consommation : échec — ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
}
