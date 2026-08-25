import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import type { PropositionExposee } from '@/app/api/praticien/propositions-objectif/route';
import { CLES_INTERDITES, clesInterdites, depuisAnamnese } from './propositionObjectif';

// Gardes structurelles du moteur de proposition (Alliance 6.0-B, LOT-02) — G7.
//
// « Le module de proposition est DISTINCT du module objectif » (`D-094` §5),
// « la machine cite, elle n'invente pas », « ni rang ni score ni numérotation »
// (`D-094` §3) : ce sont des phrases tant qu'aucun banc ne les rend rouges
// quand on les débranche. Chacune des gardes ci-dessous a été vue rouge par
// mutation réelle avant d'être déclarée verte — une garde jamais vue rouge est
// décorative.
//
// MÊME FACTURE QUE G1-G6 (`objectifNegocie.guard.test.ts`), délibérément : une
// garde qui invente sa propre mécanique se relit deux fois moins vite, et la
// campagne 6.0-A a déjà payé l'apprentissage (scan des DÉCLARATIONS et pas
// seulement des propriétés, préfixes de répertoire et non noms feuilles,
// anti-vacuité systématique).

const RACINE_WEB = path.resolve(__dirname, '../../..');
const MODULE = 'src/lib/praticien/propositionObjectif.ts';
const ROUTE = 'src/app/api/praticien/propositions-objectif/route.ts';
const BANC_UNITAIRE = 'src/lib/praticien/propositionObjectif.test.ts';
/** La moitié SERVEUR du moteur, sortie du domaine pour que celui-ci reste
 *  importable d'un composant `'use client'` (défaut vu au palier T2). */
const EMPREINTE = 'src/lib/praticien/assemblageProposition.ts';

/** Un fichier qui, LUI, importe le moteur clinique — l'ancre d'anti-vacuité. */
const TEMOIN_MOTEUR = 'src/lib/clinical-engine/chaineC1.ts';

function sourceSansCommentaires(chemin: string): string {
  // La prose de ces fichiers PARLE des champs et des imports interdits (elle
  // explique pourquoi ils le sont) : la scanner rendrait ces gardes rouges sur
  // des fichiers parfaitement sains.
  return readFileSync(path.join(RACINE_WEB, chemin), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Tout ce qui porte un NOM : propriétés (imbriquées comprises) ET déclarations
 * de premier niveau. Les deux, et pas seulement les propriétés — le chemin le
 * moins coûteux pour ranger un classement dans ces fichiers n'est pas un champ
 * d'objet, c'est une table de correspondance (leçon de G2, 6.0-A).
 */
function nomsDeclares(chemin: string): string[] {
  const source = sourceSansCommentaires(chemin);
  // SANS ANCRE DE DÉBUT DE LIGNE, et c'est une correction de revue. La forme
  // ancrée (`/^\s*(\w+)\??\s*:/gm`) ne voyait QUE les propriétés posées sur
  // leur propre ligne : sur `const brut = entree as { regle?: unknown; texte?:
  // unknown };` — deux fois présente dans la route — elle ne capturait que
  // `brut`. Un champ interdit glissé dans un type en ligne passait la garde.
  // Le motif global capture aussi des identifiants qui ne sont pas des
  // propriétés (branches de ternaire, schémas d'URL) : c'est sans conséquence,
  // une garde de nommage ne peut que gagner à voir PLUS de noms.
  const proprietes = [...source.matchAll(/(\w+)\??\s*:/g)].map((m) => m[1]);
  const declarations = [
    ...source.matchAll(/\b(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g),
  ].map((m) => m[1]);
  return [...proprietes, ...declarations];
}

// ── G7-1 — le module ne connaît pas le moteur clinique ──────────────────────

describe('G7-1 — ni moteur clinique, ni chaîne C1, nulle part dans le lot', () => {
  // PRÉFIXES DE RÉPERTOIRE, pas noms feuilles : `clinical-engine` ne couvre pas
  // `clinical/`, et la table des priorités signée vit sous le second. Même
  // liste que G6 élargie — un lot neuf ne se dote pas d'un régime plus doux.
  const IMPORTS_INTERDITS = [
    '@/lib/clinical',
    '@/lib/clinical-engine',
    '@/lib/scoring',
    '@/lib/instruments',
    '@/lib/equilibre',
  ];

  /**
   * LES RÉPERTOIRES INTERDITS, RECONNUS DANS N'IMPORTE QUELLE FORME DE CHEMIN.
   *
   * CORRECTION DE REVUE, ET LE TROU ÉTAIT GRAND. La liste d'alias ci-dessus
   * ne voyait que `@/lib/…` : un simple `from '../clinical-engine/chaineC1'`
   * la traversait sans rien faire rougir. Ce n'est pas une contorsion, c'est
   * l'idiome local — `clinical/contradictionFinding.ts` importe
   * `'../clinical-engine/types'`, `equilibre/momentumParBesoin.ts` importe
   * `'../scoring/validite'`. Un développeur qui suit l'usage du répertoire
   * produit spontanément la forme non couverte.
   *
   * On lit donc les SPÉCIFICATEURS d'import, et on refuse le répertoire comme
   * SEGMENT de chemin, quelle que soit la façon dont on y arrive.
   */
  const REPERTOIRES_INTERDITS = /(^|\/)(clinical|clinical-engine|scoring|instruments|equilibre)(\/|$)/;

  function specificateursImportes(chemin: string): string[] {
    const source = sourceSansCommentaires(chemin);
    return [
      ...source.matchAll(/(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g),
    ].map((m) => m[1]);
  }

  it.each([MODULE, ROUTE, EMPREINTE])('%s n’importe aucun moteur clinique', (chemin) => {
    const source = sourceSansCommentaires(chemin);
    expect(source.length).toBeGreaterThan(500); // anti-vacuité
    for (const interdit of IMPORTS_INTERDITS) {
      expect(source).not.toContain(interdit);
    }
  });

  it.each([MODULE, ROUTE, EMPREINTE])('%s n’y accède pas non plus par un chemin relatif', (chemin) => {
    const specificateurs = specificateursImportes(chemin);
    // ANTI-VACUITÉ, PROPRE À CHAQUE FICHIER — et pour le domaine, c'est devenu
    // un invariant à part entière.
    //
    // LE MODULE PUR N'IMPORTE RIEN, ET CE ZÉRO SE VÉRIFIE. C'est la forme la
    // plus forte de l'interdit, et elle en garde une seconde que G7-1 ne visait
    // pas : une dépendance RÉSERVÉE AU SERVEUR (`node:crypto`) y a vécu
    // jusqu'au palier T2, où la CONSTRUCTION DE PRODUCTION a échoué — le
    // panneau du cockpit, qui n'y prend qu'une borne de longueur, tirait tout
    // le module dans le bundle du navigateur. Ni `tsc` ni Vitest ne le
    // voyaient. Ce cas le rendrait rouge avant le build.
    //
    // Les deux autres fichiers importent : une extraction devenue inopérante y
    // rendrait la liste vide, donc le cas vert sur un fichier qui importerait
    // le moteur clinique entier.
    if (chemin === MODULE) {
      expect(specificateurs).toEqual([]);
    } else {
      expect(specificateurs.length).toBeGreaterThan(0);
    }
    const fautifs = specificateurs.filter((specificateur) =>
      REPERTOIRES_INTERDITS.test(specificateur),
    );
    expect(fautifs).toEqual([]);
  });

  it('le détecteur mord pour de vrai — il TROUVE le moteur là où il est', () => {
    // ANTI-VACUITÉ : un motif devenu inopérant (chemin d'alias renommé, par
    // exemple) rendrait les cas précédents verts sur un fichier qui
    // importerait tout le moteur clinique. Le témoin est éprouvé DEUX FOIS,
    // par la liste d'alias et par le motif de répertoire — sans quoi le
    // second pourrait mourir seul, en silence.
    const temoin = sourceSansCommentaires(TEMOIN_MOTEUR);
    expect(temoin).toContain('@/lib/clinical');
    const fautifs = specificateursImportes(TEMOIN_MOTEUR).filter((specificateur) =>
      REPERTOIRES_INTERDITS.test(specificateur),
    );
    expect(fautifs.length).toBeGreaterThan(0);
  });

  it('SEUL LE BANC importe la sérialisation canonique originale (arbitrage 2)', () => {
    // L'arbitrage 2 a tranché pour la DUPLICATION du helper plutôt que pour
    // une exception à G7. Une duplication qui dérive en silence ne vaudrait
    // pas mieux que l'import qu'elle remplace : le banc unitaire confronte les
    // deux implémentations, et c'est le SEUL fichier du lot qui a le droit de
    // toucher à l'original.
    expect(sourceSansCommentaires(BANC_UNITAIRE)).toContain('@/lib/clinical-engine/canonical');
    // LES DEUX FICHIERS, et pas seulement le module : la première rédaction
    // n'éprouvait que `MODULE`, si bien que la ROUTE pouvait réimporter
    // l'original sans rien faire rougir (relevé en revue).
    expect(sourceSansCommentaires(MODULE)).not.toContain('canonical');
    expect(sourceSansCommentaires(ROUTE)).not.toContain('canonical');
    expect(sourceSansCommentaires(EMPREINTE)).not.toContain('canonical');
    // Et la copie est bien là, sinon le banc comparerait le vide.
    expect(sourceSansCommentaires(EMPREINTE)).toContain('createHash');
    // LE DOMAINE, LUI, RESTE PUR : `node:` dans ce fichier casserait le bundle
    // du navigateur, et ni `tsc` ni Vitest ne le verraient — seul le build.
    expect(sourceSansCommentaires(MODULE)).not.toContain('node:');
  });
});

// ── G7-2 — aucun champ de mesure ordonnée ───────────────────────────────────

describe('G7-2 — ni score, ni seuil, ni rang dans le module ni dans la route', () => {
  // Racines des formulations plausibles d'un classement ou d'une mesure
  // ordonnée, français et anglais. SOUS-CHAÎNE ICI, contrairement au balayage
  // du blob (G7-5) qui travaille par égalité exacte : ce banc scanne des NOMS
  // que nous écrivons, pas des clés qu'un tiers pourrait choisir — un nom
  // parent d'un nom interdit est déjà un signal.
  const RACINES_INTERDITES = [
    // Français.
    'score',
    'seuil',
    'bande',
    'rang',
    'severit',
    'gravit',
    'poids',
    'total',
    // ANGLAIS — LE MANQUE QUE LA REVUE A TROUVÉ. La donnée amont nomme ses
    // champs `rank` et `confidence` (`clinical-engine/decisionCard.ts`) : les
    // quatre mutations vues rouges à la rédaction étaient toutes francisées
    // (`rangCandidat`, `rangAffichage`), et la plus PROBABLE — recopier le
    // champ tel qu'il arrive — serait passée. C'est le défaut du LOT-09 :
    // épingler le vocabulaire de l'interdit plutôt que l'interdit.
    //
    // `priorit` N'Y EST PAS, et l'absence est raisonnée : `objectifPrioritaire`
    // est un champ d'anamnèse, ce sont les mots du patient. L'interdire par
    // sous-chaîne rougirait sur une provenance parfaitement légitime, et une
    // garde à faux positif finit assouplie. La clé exacte `priorite` est en
    // revanche refusée dans le blob, où rien ne la justifie.
    'rank',
    'confidence',
    'threshold',
    'weight',
  ];

  it.each([MODULE, ROUTE, EMPREINTE])('%s ne déclare aucune propriété de mesure ordonnée', (chemin) => {
    const noms = nomsDeclares(chemin);

    // ANTI-VACUITÉ, ancre PROPRE À CHAQUE FICHIER : une ancre commune
    // obligerait à choisir un nom que les trois surfaces partagent,
    // c'est-à-dire à affaiblir la vérification.
    //
    // L'ancre du module a bougé au moment du découpage serveur, et le banc l'a
    // dit — bruyamment, comme il devait : `assemblerPropositions` avait suivi
    // le hachage dans l'autre fichier.
    const ANCRES: Record<string, string> = {
      [MODULE]: 'depuisRegleSignee',
      [ROUTE]: 'propositions',
      [EMPREINTE]: 'assemblerPropositions',
    };
    expect(noms.length).toBeGreaterThan(20);
    expect(noms).toContain(ANCRES[chemin]);

    const fautifs = noms.filter((nom) =>
      RACINES_INTERDITES.some((racine) => nom.toLowerCase().includes(racine)),
    );
    expect(fautifs).toEqual([]);
  });

  it.each([MODULE, ROUTE])('%s ne trie sur aucune priorité', (chemin) => {
    // `priorite` est un LIBELLÉ LIBRE côté objectif (G3, 6.0-A) et l'ordre des
    // candidats n'est signé par personne (`D-093`). Ni l'un ni l'autre ne doit
    // devenir une clé de tri dans ce lot.
    const source = sourceSansCommentaires(chemin);
    expect(source.length).toBeGreaterThan(500);
    expect(source).not.toMatch(/orderBy[^;]*priorite/);
    expect(source).not.toMatch(/sort\([^)]*priorite/);
  });
});

// ── G7-3 — le lot n'écrit jamais dans les tables de 6.0-A ───────────────────

/** Répertoires applicatifs sous garde. Les bancs sont exclus : un banc DOIT
 *  pouvoir nommer une écriture pour asserter qu'elle n'a pas lieu. */
const RACINES_SOUS_GARDE = ['src/app/api', 'src/lib'];

/** L'écrivain légitime d'un objectif négocié — l'ancre d'anti-vacuité. */
const ECRIVAIN_OBJECTIF = 'src/app/api/praticien/objectifs/route.ts';

const ECRITURE_OBJECTIF = /objectifNegocie\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\b/;
const ECRITURE_RATIFICATION =
  /ratificationObjectif\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\b/;

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

describe('G7-3 — le moteur de proposition n’écrit rien des tables de 6.0-A', () => {
  it('ni objectif négocié, ni ratification, depuis le module ou la route', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);

    // ANTI-VACUITÉ 1 : le parcours voit bien l'application entière ET les deux
    // fichiers du lot. S'ils étaient renommés, la garde deviendrait creuse en
    // silence.
    expect(fichiers.length).toBeGreaterThan(200);
    expect(fichiers).toContain(MODULE);
    expect(fichiers).toContain(ROUTE);
    expect(fichiers).toContain(ECRIVAIN_OBJECTIF);

    const ecrivainsObjectif = fichiers.filter((chemin) =>
      ECRITURE_OBJECTIF.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // ANTI-VACUITÉ 2 : le détecteur mord pour de vrai — il TROUVE l'écrivain
    // légitime. Un motif devenu inopérant rendrait la liste vide, donc ce cas
    // vert sur un dépôt où le lot écrirait partout.
    expect(ecrivainsObjectif).toContain(ECRIVAIN_OBJECTIF);
    expect(ecrivainsObjectif).not.toContain(MODULE);
    expect(ecrivainsObjectif).not.toContain(ROUTE);

    const ecrivainsRatification = fichiers.filter((chemin) =>
      ECRITURE_RATIFICATION.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );
    expect(ecrivainsRatification.length).toBeGreaterThan(0); // le portail écrit, lui
    expect(ecrivainsRatification).not.toContain(MODULE);
    expect(ecrivainsRatification).not.toContain(ROUTE);
  });

  it('une proposition ne se met jamais à jour : append-only, ici comme ailleurs', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);
    const destructrices =
      /(propositionObjectif|dispositionProposition)\.(update|updateMany|delete|deleteMany|upsert)\b/;

    const fautifs = fichiers.filter((chemin) =>
      destructrices.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // L'UNIQUE exception attendue est l'effacement d'un dossier — geste
    // explicite du patient, garde de complétude RGPD. S'il disparaissait de
    // cette liste, ce serait le détecteur qui serait mort, pas le dépôt qui
    // serait devenu sain.
    expect(fautifs).toContain('src/lib/patient/effacement.ts');
    expect(fautifs).toEqual(['src/lib/patient/effacement.ts']);
  });
});

// ── G7-4 — la forme exposée est épinglée ────────────────────────────────────

type Egales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * LA LISTE ÉPINGLÉE. Y toucher est une décision, pas un geste de passage : un
 * `rang`, une `position` ou un `niveau` ajoutés à cet objet cesseraient de
 * compiler. `hashSources` n'y est PAS — c'est une mécanique de caducité, pas
 * une information d'écran, et l'exposer inviterait un client à se donner un
 * second juge.
 */
type ClePropositionExposee = 'id' | 'fragments' | 'assembleeLe' | 'creeLe' | 'disposition';

describe('G7-4 — la proposition exposée ne porte que les clés épinglées', () => {
  it('la liste des clés est celle-ci, et rien d’autre', () => {
    // L'assertion EST le type de cette constante : un champ ajouté rend
    // `Egales` faux, et `false` ne s'assigne pas à une constante déclarée
    // `true`. C'est donc `tsc` — T1 et le CI — qui rend ce cas rouge.
    const clesInchangees: Egales<keyof PropositionExposee, ClePropositionExposee> = true;
    expect(clesInchangees).toBe(true);
  });

  it('les deux dates y sont, et elles sont deux', () => {
    // `assembleeLe` est la CLÉ D'ASSEMBLÉE (quel calcul a produit cette
    // ligne), `creeLe` la date d'ENREGISTREMENT posée par la base. Les
    // confondre rendrait la caducité indéterminable ; en perdre une rendrait
    // l'autre ambiguë.
    const deuxDates: Egales<
      Extract<keyof PropositionExposee, 'assembleeLe' | 'creeLe'>,
      'assembleeLe' | 'creeLe'
    > = true;
    expect(deuxDates).toBe(true);
  });
});

// ── G7-5 — un fragment sans source est inconstructible ──────────────────────

describe('G7-5 — la provenance et la forme du blob, opposables', () => {
  it('les trois fabriques sont les SEULES à fabriquer un fragment', () => {
    // L'invariant est tenu par le TYPE (marque `unique symbol`), donc par
    // `tsc` : les deux lignes ci-dessous ne compilent pas sans `@ts-expect-error`,
    // et si un jour elles compilaient, `@ts-expect-error` deviendrait à son
    // tour une erreur. C'est le compilateur qui rend ce cas rouge, pas
    // `expect` — patron G1.
    // @ts-expect-error un fragment nu n'existe pas au sens du type
    const nu: FragmentSourceTest = { texte: 'Des mots sans provenance' };
    // @ts-expect-error même avec une source, un littéral ne porte pas la marque
    const litteral: FragmentSourceTest = { texte: 'x', source: { nature: 'anamnese' } };
    expect(nu).toBeDefined();
    expect(litteral).toBeDefined();

    // ANTI-VACUITÉ : la fabrique, elle, produit bien un fragment sourcé.
    const vrai = depuisAnamnese('motif_principal', 'Ses mots', '2026-08-20T09:00:00.000Z');
    expect(vrai?.source).toMatchObject({ nature: 'anamnese' });
  });

  it('le balayage voit une clé interdite déposée au fond du blob', () => {
    // MUTATION RÉELLE : ce qui suit est exactement la forme qu'un fragment
    // aurait si quelqu'un y rangeait un classement — trois niveaux plus bas
    // que ce qu'une inspection à l'œil regarde.
    const blobFautif = [
      { texte: 'x', source: { nature: 'regle_signee', detail: { interne: { rang: 1 } } } },
    ];
    expect(clesInterdites(blobFautif)).toEqual(['rang']);

    // Et le blob réellement produit par le lot est propre — sinon ce cas ne
    // dirait rien du dépôt.
    const vrai = depuisAnamnese('motif_principal', 'Ses mots', '2026-08-20T09:00:00.000Z');
    expect(clesInterdites([vrai])).toEqual([]);
  });

  it('la liste des clés interdites est celle de l’arbitrage 1, et elle est épinglée', () => {
    // En retirer une est une décision : `D-094` §3 interdit jusqu'à la
    // numérotation, et le JSONB est le seul endroit du schéma que rien ne
    // contraint.
    expect([...CLES_INTERDITES].sort()).toEqual([
      'bande',
      'confidence',
      'level',
      'niveau',
      'order',
      'ordre',
      'position',
      'priorite',
      'priority',
      'rang',
      'rank',
      'score',
      'seuil',
      'threshold',
      'weight',
    ]);
  });
});

/** Alias local : le type public, nommé pour que `@ts-expect-error` porte sur
 *  l'assignation et non sur un import inutilisé. */
type FragmentSourceTest = import('./propositionObjectif').FragmentSource;
