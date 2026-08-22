import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import type { DesaccordExpose, SyntheseExposee } from '@/app/api/praticien/comprehension/route';
import type { SyntheseServie } from '@/app/api/portail/comprehension/route';

// Gardes structurelles de « ce que j'ai compris de vous » (Alliance 6.0-A,
// LOT-04).
//
// Les invariants de campagne ne valent que s'ils sont OPPOSABLES : « un
// désaccord ne se supprime pas », « jamais un score », « jamais un diagnostic »,
// « append-only » sont des phrases tant qu'aucun banc ne les rend rouges quand
// on les débranche. Chacune des gardes ci-dessous a été vue rouge par mutation
// réelle avant d'être déclarée verte — une garde jamais vue rouge est
// décorative.
//
// CE FICHIER EST À LA RACINE DE `src/lib/` À DESSEIN : c'est le glob qui charge
// `.claude/rules/clinique-scoring.md`, de sorte qu'une session future qui vient
// l'affaiblir lise d'abord la doctrine (patron
// `ceQuiCompteAntiAgregat.guard.test.ts`, LOT-03).

const RACINE_WEB = path.resolve(__dirname, '../..');
const MODULE = 'src/lib/praticien/syntheseComprehension.ts';
const ROUTE_PRATICIEN = 'src/app/api/praticien/comprehension/route.ts';
const ROUTE_PORTAIL = 'src/app/api/portail/comprehension/route.ts';
/**
 * La route d'ASSEMBLAGE du LOT-06. Elle sert la synthèse au patient sans être
 * la route du LOT-04 : ces listes sont FIGÉES, et un fichier neuf y échapperait
 * en silence — les interdits de forme ne s'appliquent qu'à ce qui est nommé.
 */
const ROUTE_DOSSIER = 'src/app/api/portail/dossier/route.ts';

/**
 * Le source débarrassé de ses commentaires : la prose de ces fichiers PARLE des
 * champs interdits (elle explique pourquoi ils le sont), et la scanner rendrait
 * ces gardes rouges sur des fichiers parfaitement sains.
 */
function sourceSansCommentaires(chemin: string): string {
  return readFileSync(path.join(RACINE_WEB, chemin), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Tout ce qui porte un NOM : propriétés (imbriquées comprises) ET déclarations
 * de premier niveau. Les deux, et pas seulement les propriétés — le chemin le
 * moins coûteux pour ranger un classement n'est pas un champ d'objet, c'est une
 * table de correspondance (`const POIDS_DESACCORD: Record<string, number>`).
 * Motif complet : `praticien/objectifNegocie.guard.test.ts`.
 */
function nomsDeclares(chemin: string): string[] {
  const source = sourceSansCommentaires(chemin);
  const proprietes = [...source.matchAll(/^\s*(\w+)\??\s*:/gm)].map((m) => m[1]);
  const declarations = [
    ...source.matchAll(/\b(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g),
  ].map((m) => m[1]);
  return [...proprietes, ...declarations];
}

// ── G1 — les formes exposées sont épinglées ─────────────────────────────────

type Egales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * LES LISTES ÉPINGLÉES. Y toucher est une décision, pas un geste de passage :
 * tout champ qui entrerait devrait d'abord être défendu contre `DC-19`/`DC-20`
 * (aucun seuil ni poids inventé) et `DC-31`/`DC-32` (diagnostic, hypothèse et
 * orientation sont trois objets distincts). L'assertion EST le type de la
 * constante : un champ ajouté rend `Egales` faux, `false` ne s'assigne pas à
 * une constante déclarée `true`, et c'est `tsc` — donc T1 et le CI — qui
 * refuse le fichier.
 */
type CleSyntheseExposee =
  | 'id'
  | 'texte'
  | 'redigeeLe'
  | 'publieeLe'
  | 'creeLe'
  | 'supersedesSyntheseId';

type CleDesaccordExpose = 'id' | 'idSynthese' | 'texte' | 'exprimeLe' | 'creeLe' | 'etat';

/** Ce que le PATIENT reçoit. Volontairement plus étroit que la vue praticien :
 *  ni `creeLe`, ni `supersedesSyntheseId` — la mécanique de versionnage du
 *  praticien n'est pas une information due au patient. */
type CleSyntheseServie = 'id' | 'texte' | 'redigeeLe' | 'publieeLe';

describe('G1 — les objets exposés ne portent que les clés épinglées', () => {
  it('la synthèse vue du praticien', () => {
    const inchangees: Egales<keyof SyntheseExposee, CleSyntheseExposee> = true;
    expect(inchangees).toBe(true);
  });

  it('le désaccord vu du praticien — avec son état DÉRIVÉ, jamais stocké', () => {
    const inchangees: Egales<keyof DesaccordExpose, CleDesaccordExpose> = true;
    expect(inchangees).toBe(true);
  });

  it('la synthèse servie au patient est plus étroite que celle du praticien', () => {
    const inchangees: Egales<keyof SyntheseServie, CleSyntheseServie> = true;
    expect(inchangees).toBe(true);
  });

  it('les deux dates y sont, et elles sont deux', () => {
    // `redigeeLe` est la date de l'ÉVÉNEMENT (une donnée déclarée), `creeLe`
    // celle de l'ENREGISTREMENT (posée par la base). Les confondre rendrait une
    // ligne antidatable ; en perdre une rendrait l'autre ambiguë.
    const deuxDates: Egales<
      Extract<keyof SyntheseExposee, 'redigeeLe' | 'creeLe'>,
      'redigeeLe' | 'creeLe'
    > = true;
    expect(deuxDates).toBe(true);
  });
});

// ── G2 — ni score, ni note, ni classement ───────────────────────────────────

describe('G2 — un désaccord ne se compte pas, ne se note pas, ne se moyenne pas', () => {
  // Racines des formulations plausibles d'une mesure ordonnée ou d'un agrégat,
  // en français comme en anglais. Compter les désaccords d'un patient — « 3
  // désaccords sur 5 versions » — transformerait une parole en note, et
  // poserait une borne sans provenance (`DC-19`/`DC-20`).
  const RACINES_INTERDITES = [
    'score',
    'seuil',
    'bande',
    'rang',
    'severit',
    'gravit',
    'poids',
    'moyenne',
    'pourcentage',
    'taux',
  ];

  it.each([MODULE, ROUTE_PRATICIEN, ROUTE_PORTAIL, ROUTE_DOSSIER])(
    '%s ne déclare aucune propriété de mesure ordonnée',
    (chemin) => {
      const noms = nomsDeclares(chemin);

      // ANTI-VACUITÉ, ancre PROPRE À CHAQUE FICHIER : une extraction qui
      // cesserait de fonctionner rendrait ce cas vert en ne scannant rien. Une
      // ancre unique obligerait à choisir un nom partagé par les trois
      // surfaces, c'est-à-dire à affaiblir la vérification.
      const ANCRES: Record<string, string> = {
        [MODULE]: 'preparerSynthese',
        [ROUTE_PRATICIEN]: 'SELECTION_SYNTHESE',
        [ROUTE_PORTAIL]: 'surfaceFermee',
        [ROUTE_DOSSIER]: 'SELECTION_OBJECTIF',
      };
      expect(noms.length).toBeGreaterThan(8);
      expect(noms).toContain(ANCRES[chemin]);

      const fautifs = noms.filter((nom) =>
        RACINES_INTERDITES.some((racine) => nom.toLowerCase().includes(racine)),
      );
      expect(fautifs).toEqual([]);
    },
  );
});

// ── G3 — anti-diagnostic ────────────────────────────────────────────────────

describe('G3 — ni moteur clinique, ni code diagnostique', () => {
  // Une synthèse de compréhension est une COMPRÉHENSION, jamais une conclusion
  // (`DC-31`, `DC-32`). Importer un moteur « pour suggérer » une synthèse
  // ferait entrer une sortie de scoring dans un texte publié au patient sous la
  // signature du praticien.
  // PRÉFIXES DE RÉPERTOIRE, pas noms feuilles : `clinical-engine` ne couvre pas
  // `clinical/` (motif établi au LOT-02).
  const IMPORTS_INTERDITS = [
    '@/lib/clinical',
    '@/lib/clinical-engine',
    '@/lib/scoring',
    '@/lib/instruments',
    '@/lib/equilibre',
  ];

  const RACINES_DIAGNOSTIQUES = ['cim', 'icd', 'dsm', 'classification', 'diagnos'];

  it.each([MODULE, ROUTE_PRATICIEN, ROUTE_PORTAIL, ROUTE_DOSSIER])(
    '%s n’importe aucun moteur clinique',
    (chemin) => {
      const source = sourceSansCommentaires(chemin);
      expect(source.length).toBeGreaterThan(500); // anti-vacuité
      for (const interdit of IMPORTS_INTERDITS) {
        expect(source).not.toContain(interdit);
      }
    },
  );

  it.each([MODULE, ROUTE_PRATICIEN, ROUTE_PORTAIL, ROUTE_DOSSIER])(
    '%s ne déclare aucune propriété de nature diagnostique',
    (chemin) => {
      const noms = nomsDeclares(chemin);
      expect(noms.length).toBeGreaterThan(8); // anti-vacuité

      const fautifs = noms.filter((nom) => {
        const minuscule = nom.toLowerCase();
        return (
          minuscule.startsWith('code') ||
          RACINES_DIAGNOSTIQUES.some((racine) => minuscule.includes(racine))
        );
      });
      expect(fautifs).toEqual([]);
    },
  );
});

// ── G4 — le module de domaine reste PUR ─────────────────────────────────────

describe('G4 — le module n’embarque ni Prisma ni rien d’autre', () => {
  it('zéro import de valeur : il est lu par des panneaux « use client »', () => {
    const source = sourceSansCommentaires(MODULE);
    expect(source.length).toBeGreaterThan(500); // anti-vacuité
    // Un seul `import` de valeur suffirait à tirer Prisma dans le bundle
    // navigateur par transitivité — piège constaté au LOT-05 (`instruments.ts`
    // embarque Prisma, la Bibliothèque est un panneau client).
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});

// ── G5 — append-only opposable à tout le dépôt ──────────────────────────────

/** Répertoires applicatifs sous garde. Les bancs sont exclus : un banc DOIT
 *  pouvoir nommer `update` pour asserter qu'il n'est jamais appelé. */
const RACINES_SOUS_GARDE = ['src/app/api', 'src/lib'];

/**
 * L'UNIQUE exception, et elle est NOMMÉE : l'effacement d'un dossier est un
 * geste explicite du patient (`effacement.ts`, garde de complétude), pas une
 * révision ni un retrait de désaccord. Une exception creusée en silence
 * servirait au défaut qu'on prétend interdire.
 */
const EXCEPTION_EFFACEMENT = 'src/lib/patient/effacement.ts';

const ECRITURES_SYNTHESE =
  /syntheseComprehension\.(updateMany|update|deleteMany|delete|upsert)\b/;

/**
 * UN DÉSACCORD NE SE SUPPRIME PAS, NE SE FERME PAS, NE SE TRANSFORME PAS EN
 * NOTE PRIVÉE (`LOT-04-…md:59-60`). `update` est inclus au même titre que
 * `delete` : marquer un désaccord « traité » par une mise à jour serait
 * précisément la fermeture silencieuse que le lot interdit — et c'est la raison
 * pour laquelle la table n'a aucune colonne d'état.
 */
const ECRITURES_DESACCORD =
  /desaccordComprehension\.(updateMany|update|deleteMany|delete|upsert)\b/;

/**
 * LA SYNTHÈSE EST ÉCRITE PAR LE PRATICIEN, LE DÉSACCORD PAR LE PATIENT. Une
 * route praticien qui créerait un désaccord fabriquerait une contestation que
 * le patient n'a pas exprimée ; une route portail qui créerait une synthèse
 * ferait dire au praticien ce qu'il n'a pas écrit. Jusqu'ici l'invariant ne
 * tenait que par des assertions de mock dans les bancs de route.
 */
const CREATION_DESACCORD = /desaccordComprehension\.create\b/;
const CREATION_SYNTHESE = /syntheseComprehension\.create\b/;

function fichiersSources(racine: string): string[] {
  const absolu = path.join(RACINE_WEB, racine);
  const trouves: string[] = [];
  const parcourir = (repertoire: string) => {
    for (const entree of readdirSync(repertoire)) {
      const complet = path.join(repertoire, entree);
      if (statSync(complet).isDirectory()) {
        parcourir(complet);
        continue;
      }
      if (!/\.tsx?$/.test(entree) || /\.test\.tsx?$/.test(entree)) continue;
      trouves.push(path.relative(RACINE_WEB, complet));
    }
  };
  parcourir(absolu);
  return trouves;
}

describe('G5 — rien ne s’écrase, rien ne se retire', () => {
  const fichiers = () => RACINES_SOUS_GARDE.flatMap(fichiersSources);

  const fautifsPour = (motif: RegExp): string[] =>
    fichiers().filter((chemin) => motif.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')));

  it('le balayage voit bien l’application entière', () => {
    const tous = fichiers();
    // ANTI-VACUITÉ 1 : un parcours cassé rendrait toutes les listes vides,
    // donc tous les cas ci-dessous verts.
    expect(tous.length).toBeGreaterThan(200);
    expect(tous).toContain(ROUTE_PRATICIEN);
    expect(tous).toContain(ROUTE_PORTAIL);
    expect(tous).toContain(ROUTE_DOSSIER);
    expect(tous).toContain(EXCEPTION_EFFACEMENT);
  });

  it('aucune synthèse mise à jour ni supprimée, hors l’effacement nommé', () => {
    const fautifs = fautifsPour(ECRITURES_SYNTHESE);
    // ANTI-VACUITÉ 2 : le détecteur mord pour de vrai — il TROUVE l'effacement.
    // Un motif devenu inopérant rendrait la liste vide, donc ce cas vert.
    expect(fautifs).toContain(EXCEPTION_EFFACEMENT);
    expect(fautifs).toEqual([EXCEPTION_EFFACEMENT]);
  });

  it('aucun désaccord mis à jour ni supprimé, hors l’effacement nommé', () => {
    const fautifs = fautifsPour(ECRITURES_DESACCORD);
    expect(fautifs).toContain(EXCEPTION_EFFACEMENT);
    expect(fautifs).toEqual([EXCEPTION_EFFACEMENT]);
  });

  it('le désaccord ne se crée QUE depuis le portail — c’est un geste du patient', () => {
    expect(fautifsPour(CREATION_DESACCORD)).toEqual([ROUTE_PORTAIL]);
  });

  it('la synthèse ne se crée QUE depuis la route praticien — c’est sa parole', () => {
    expect(fautifsPour(CREATION_SYNTHESE)).toEqual([ROUTE_PRATICIEN]);
  });
});
