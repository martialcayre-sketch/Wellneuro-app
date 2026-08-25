import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import type { AmendementExpose, ObjectifExpose } from '@/app/api/praticien/objectifs/route';
import { objectifsCourants } from './objectifNegocie';

// Gardes structurelles de l'objectif négocié (Alliance 6.0-A, LOT-02).
//
// Les invariants de campagne ne valent que s'ils sont OPPOSABLES : « jamais un
// score », « jamais un diagnostic », « deux dates », « append-only » sont des
// phrases tant qu'aucun banc ne les rend rouges quand on les débranche. Chacune
// des gardes ci-dessous a été vue rouge par mutation réelle avant d'être
// déclarée verte — une garde jamais vue rouge est décorative.
//
// ASSERTION SUR LE TYPE, PAS SUR UNE INSTANCE, pour G1 (patron
// `clinical/contradictionFinding.guard.test.ts:18-23`) : un objet littéral peut
// toujours omettre un champ, alors qu'un type ne le peut pas. C'est donc `tsc`
// — T1 et le CI — qui rend G1 rouge, pas `expect`.

const RACINE_WEB = path.resolve(__dirname, '../../..');
const MODULE = 'src/lib/praticien/objectifNegocie.ts';
const ROUTE = 'src/app/api/praticien/objectifs/route.ts';
// LE PANNEAU EST SOUS GARDE, LUI AUSSI. Trier `priorite` ou brancher un moteur
// clinique est plus naturel au RENDU qu'à la route — et G3 n'assertionne que
// `objectifsCourants`, une fonction que l'UI n'est pas obligée d'employer pour
// ordonner. Sans cette surface dans le balayage, le contournement le plus
// probable ne demandait aucune ruse.
const PANNEAU = 'src/components/patient-cockpit/ObjectifNegociePanel.tsx';
/**
 * LA SECTION QUI MANIPULE RÉELLEMENT LES CANDIDATS CLASSÉS (relevé en revue du
 * LOT-03). C'est le seul fichier du dépôt qui lise `decisionCard.
 * priorityCandidates` pour en composer l'entrée du moteur de proposition — donc
 * l'endroit le plus exposé au geste que `D-093` interdit : recopier le rang
 * tel qu'il arrive. Il n'était sous aucune garde de nommage ; la fiche du
 * LOT-03 demandait pourtant une « garde élargie au RENDU ».
 */
const SECTION_RUNTIME = 'src/components/patient-cockpit/ClinicalRuntimeSection.tsx';

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
 * Tout ce qui porte un NOM dans un fichier : propriétés (imbriquées comprises)
 * ET déclarations de premier niveau.
 *
 * Les deux, et pas seulement les propriétés : le chemin le moins coûteux pour
 * ranger un classement dans ces fichiers n'est pas un champ d'objet, c'est une
 * table de correspondance — `const POIDS_PRIORITE: Record<string, number>`.
 * Une garde qui ne scannerait que les propriétés la laisserait entrer, et
 * `priorite` deviendrait un rang sans qu'aucun banc ne bouge. Constaté en
 * appliquant la mutation : la première rédaction de ce banc restait verte.
 */
function nomsDeclares(chemin: string): string[] {
  const source = sourceSansCommentaires(chemin);
  const proprietes = [...source.matchAll(/^\s*(\w+)\??\s*:/gm)].map((m) => m[1]);
  const declarations = [
    ...source.matchAll(/\b(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g),
  ].map((m) => m[1]);
  return [...proprietes, ...declarations];
}

// ── G1 — la forme exposée est épinglée ──────────────────────────────────────

type Egales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * LA LISTE ÉPINGLÉE. Y toucher est une décision, pas un geste de passage : tout
 * champ qui entrerait ici devrait d'abord être défendu contre `DC-19`/`DC-20`
 * (aucun seuil ni poids inventé) et `DC-27` (score ≠ diagnostic). Un `niveau`,
 * un `rang` ou une `bande` ajoutés à cet objet cesseraient de compiler.
 */
type CleObjectifExpose =
  | 'id'
  | 'enoncePatient'
  | 'reformulationPraticien'
  | 'priorite'
  | 'nonTraiteMotif'
  | 'nonTraiteDepuisLe'
  | 'negocieLe'
  | 'creeLe'
  | 'supersedesObjectifId'
  // Alliance 6.0-B, LOT-03 : la proposition dont cet objectif est la reprise.
  // ELLE EST ADMISE ICI PARCE QU'ELLE NE MESURE RIEN — c'est un identifiant de
  // provenance, du même ordre que `supersedesObjectifId`, et il rend LISIBLE ce
  // qui serait autrement invisible : le praticien a-t-il rédigé cet objectif,
  // ou repris ce que la machine avait cité ? Sans ce champ, le diff
  // proposé↔négocié n'aurait aucun point d'ancrage.
  | 'sourcePropositionId';

/**
 * LA FORME DE L'AMENDEMENT, ÉPINGLÉE ELLE AUSSI (6.0-B, LOT-04, `D-110`).
 *
 * Elle porte un TEXTE DE PATIENT, donc la surface la plus tentante du dépôt
 * pour un champ dérivé : une longueur, un « ton », un indicateur d'écart avec
 * l'énoncé courant. Chacun serait une mesure faite sur une parole
 * (`DC-19`/`DC-20`), et aucun ne demanderait plus d'une ligne à écrire.
 *
 * `exprimeLe` N'Y EST PAS, et ce n'est pas un oubli : la colonne reste nulle
 * par construction — l'exposer inviterait un écran à la combler par `creeLe`.
 */
type CleAmendementExpose = 'id' | 'idObjectif' | 'texte' | 'creeLe';

describe('G1 — l’objectif exposé ne porte que les clés épinglées', () => {
  it('l’amendement du patient ne porte que les siennes', () => {
    const clesInchangees: Egales<keyof AmendementExpose, CleAmendementExpose> = true;
    expect(clesInchangees).toBe(true);
  });

  it('la liste des clés est celle-ci, et rien d’autre', () => {
    // L'assertion EST le type de cette constante : un champ ajouté rend
    // `Egales` faux, et `false` ne s'assigne pas à une constante déclarée
    // `true`. Le compilateur refuse alors le fichier.
    const clesInchangees: Egales<keyof ObjectifExpose, CleObjectifExpose> = true;
    expect(clesInchangees).toBe(true);
  });

  it('les deux dates y sont, et elles sont deux', () => {
    // `negocieLe` est la date de l'ÉVÉNEMENT (une donnée), `creeLe` celle de
    // l'ENREGISTREMENT (posée par la base). Les confondre serait rendre une
    // ligne antidatable ; en perdre une serait rendre l'autre ambiguë.
    const deuxDates: Egales<
      Extract<keyof ObjectifExpose, 'negocieLe' | 'creeLe' | 'nonTraiteDepuisLe'>,
      'negocieLe' | 'creeLe' | 'nonTraiteDepuisLe'
    > = true;
    expect(deuxDates).toBe(true);
  });
});

// ── G2 — aucun champ de score, sous aucun nom ───────────────────────────────

describe('G2 — ni score, ni seuil, ni bande, ni rang dans le module ni dans la route', () => {
  // Racines des formulations plausibles d'un classement ou d'une mesure
  // ordonnée. La liste épinglée de G1 tient le type exposé ; celle-ci tient
  // TOUT le reste des fichiers — variables de sélection Prisma, types internes,
  // littéraux.
  //
  // ELLE SE DISAIT BILINGUE ET NE L'ÉTAIT PAS (relevé en revue du LOT-03). Le
  // commentaire promettait « en français comme en anglais » ; la liste était
  // française seule. C'est MOT POUR MOT le bloquant que la revue du LOT-02
  // avait trouvé sur le moteur de proposition — corrigé là-bas, et non propagé
  // ici, alors que ce banc garde le PANNEAU, lequel consomme désormais une
  // donnée dont l'amont nomme ses champs `rank` et `confidence`
  // (`clinical-engine/decisionCard.ts`). Un `rank: candidat.rank` recopié au
  // rendu serait resté vert.
  //
  // `priorit` reste volontairement absent : `objectifPrioritaire` est un champ
  // d'anamnèse — les mots du patient — et une garde à faux positif finit
  // assouplie.
  const RACINES_INTERDITES = [
    'score',
    'seuil',
    'bande',
    'rang',
    'severit',
    'gravit',
    'poids',
    'total',
    'rank',
    'confidence',
    'threshold',
    'weight',
  ];

  it.each([MODULE, ROUTE, PANNEAU, SECTION_RUNTIME])(
    '%s ne déclare aucune propriété de mesure ordonnée',
    (chemin) => {
    const noms = nomsDeclares(chemin);

    // ANTI-VACUITÉ : une extraction qui cesserait de fonctionner rendrait ce
    // cas vert en ne scannant rien du tout. L'ancre est PROPRE À CHAQUE
    // FICHIER — une ancre unique obligerait à choisir un nom que les trois
    // surfaces partagent, c'est-à-dire à affaiblir la vérification.
    const ANCRES: Record<string, string> = {
      [MODULE]: 'enoncePatient',
      [ROUTE]: 'enoncePatient',
      [PANNEAU]: 'consultationValidee',
      [SECTION_RUNTIME]: 'assemblerPropositions',
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

// ── G2-bis — la parole du patient ne se compte pas au rendu ─────────────────

/**
 * LES DEUX SURFACES QUI RENDENT UN AMENDEMENT (6.0-B, LOT-04, `D-110`), et
 * elles seules : le cockpit et l'écran du patient.
 *
 * G2 balaie des NOMS DÉCLARÉS ; elle attraperait `scoreAmendement`, pas
 * `{amendements.length}`, qui ne déclare rien. Or `D-110` nomme précisément la
 * tentation — « ni résumé, ni compté, ni comparé à l'énoncé courant » — et le
 * cockpit est le seul endroit du dépôt où les mots du patient et ceux du
 * praticien se lisent côte à côte : c'est là qu'un décompte ou un écart
 * s'écrirait. La garde « ce qui compte » ne peut pas accueillir le panneau tel
 * quel — `{objectifs.length}` y est un signal de discordance légitime
 * (`DC-30`) —, d'où un cas propre plutôt qu'une garde élargie à contrecœur.
 */
const SURFACES_AMENDEMENT = [PANNEAU, 'src/components/patient-companion/DossierDeuxVoixView.tsx'];

/**
 * LA GARDE NE NOMME PAS LA COLLECTION, ET C'EST LE POINT. Une première
 * rédaction cherchait `{...amendement....length}` : le panneau range les
 * amendements d'une chaîne dans une variable locale `siens`, et
 * `{siens.length}` passait — la garde tenait par le NOM que l'auteur avait
 * choisi, c'est-à-dire par rien. La mutation l'a montré avant qu'on la croie
 * verte. Même cicatrice que celle déjà écrite dans
 * `ceQuiCompteAntiAgregat.guard.test.ts`, et le même remède : interdire TOUT
 * décompte rendu, puis nommer les cas licites un par un.
 *
 * `x.length === 0` reste licite et n'est pas visé : c'est la distinction
 * « silence / réponse » (`DC-24`), pas un affichage.
 */
const DECOMPTE_RENDU = /\{\s*[\w.]+\.length(?:\.toLocaleString\([^)]*\))?\s*\}/g;

/**
 * LES TROIS SEULS DÉCOMPTES LICITES, chacun avec sa raison :
 *
 * - `objectifs.length` — le signal de DISCORDANCE au cockpit : « 2 versions
 *   courantes coexistent ». Compter des versions n'est pas mesurer une parole,
 *   et `DC-30` demande précisément de le dire.
 * - `anterieures.length` — « Versions antérieures (3) », un repère de
 *   navigation dans la trajectoire.
 * - `valeur.length` et `texteAmendement.length` — les compteurs de caractères
 *   des SAISIES (`Compteur`, et la zone « le dire autrement »). Ils remplacent
 *   `maxLength` : le dépassement est visible, rien n'est coupé.
 *
 * Aucun ne porte sur `amendements`, et c'est bien ce qu'on veut : la parole du
 * patient ne se compte pas (`D-110`, `DC-19`/`DC-20`).
 */
const DECOMPTES_LICITES = [
  'objectifs.length',
  'anterieures.length',
  'valeur.length',
  'texteAmendement.length',
];

/** Un agrégat sur les mots du patient : moyenne, cumul, comparaison chiffrée. */
const AGREGAT_AMENDEMENT = /amendements?\s*\.\s*(reduce|sort)\s*\(/i;

describe('G2-bis — un amendement se lit, il ne se compte ni ne se compare', () => {
  it.each(SURFACES_AMENDEMENT)('%s ne rend aucun décompte ni agrégat', (chemin) => {
    const code = sourceSansCommentaires(chemin);

    // ANTI-VACUITÉ 1 : la surface rend bien des amendements. Un renommage
    // ferait sinon passer ce cas au vert en ne gardant plus rien.
    expect(code).toMatch(/amendement/i);

    const rendus = [...code.matchAll(DECOMPTE_RENDU)].map((m) => m[0]);
    const fautifs = rendus.filter(
      (rendu) => !DECOMPTES_LICITES.some((licite) => rendu.includes(licite)),
    );
    expect(fautifs, `Décompte rendu sur une surface d’amendement : ${fautifs.join(', ')}`).toEqual(
      [],
    );

    expect(AGREGAT_AMENDEMENT.test(code)).toBe(false);
  });

  it('ANTI-VACUITÉ 2 — le détecteur mord : il TROUVE les décomptes licites', () => {
    // Sans ce cas, un motif devenu inopérant rendrait la liste vide, donc les
    // deux cas ci-dessus verts et creux.
    const panneau = sourceSansCommentaires(PANNEAU);
    const rendus = [...panneau.matchAll(DECOMPTE_RENDU)].map((m) => m[0]);
    expect(rendus.some((rendu) => rendu.includes('objectifs.length'))).toBe(true);
    expect(rendus.some((rendu) => rendu.includes('anterieures.length'))).toBe(true);
  });
});

// ── G3 — la priorité ne s'ordonne pas ───────────────────────────────────────

describe('G3 — la priorité est un libellé, jamais un rang', () => {
  it('trois priorités différentes rendent l’ordre de `creeLe`, quel que soit le libellé', () => {
    // `schema.prisma:1955-1957` : la priorité est un LIBELLÉ LIBRE praticien.
    // Le jour où quelqu'un veut la trier, c'est la doctrine qu'il faut rouvrir,
    // pas ce banc. Les trois libellés ci-dessous suggèrent fortement un ordre
    // (« urgent » avant « plus tard ») : c'est exactement le piège que la
    // lecture ne doit pas tendre.
    const lignes = [
      {
        id: 'o1',
        supersedesObjectifId: null,
        creeLe: new Date('2026-08-19T10:00:00.000Z'),
        priorite: 'Urgent',
      },
      {
        id: 'o2',
        supersedesObjectifId: null,
        creeLe: new Date('2026-08-21T10:00:00.000Z'),
        priorite: 'Plus tard',
      },
      {
        id: 'o3',
        supersedesObjectifId: null,
        creeLe: new Date('2026-08-20T10:00:00.000Z'),
        priorite: 'À surveiller',
      },
    ];

    expect(objectifsCourants(lignes).map((l) => l.id)).toEqual(['o2', 'o3', 'o1']);

    // Et l'ordre ne bouge pas quand on permute les libellés : la lecture ne les
    // regarde tout simplement pas.
    const permutees = lignes.map((ligne, index) => ({
      ...ligne,
      priorite: ['Plus tard', 'Urgent', 'Urgent'][index],
    }));
    expect(objectifsCourants(permutees).map((l) => l.id)).toEqual(['o2', 'o3', 'o1']);
  });
});

// ── G5 — append-only opposable ──────────────────────────────────────────────

/** Répertoires applicatifs sous garde. Les bancs sont exclus : un banc DOIT
 *  pouvoir nommer `update` pour asserter qu'il n'est jamais appelé. */
const RACINES_SOUS_GARDE = ['src/app/api', 'src/lib'];

/**
 * L'UNIQUE exception, et elle est NOMMÉE : l'effacement d'un dossier est un
 * geste explicite du patient (`effacement.ts`, garde de complétude), pas une
 * révision d'objectif. Une exception creusée en silence servirait au défaut
 * qu'on prétend interdire.
 */
const EXCEPTION_EFFACEMENT = 'src/lib/patient/effacement.ts';

const ECRITURES_DESTRUCTRICES = /objectifNegocie\.(updateMany|update|deleteMany|delete|upsert)\b/;

/**
 * LA RATIFICATION EST UN GESTE DU PATIENT, ET IL A DÉSORMAIS UN LIEU (LOT-06).
 *
 * Le LOT-02 interdisait TOUTE écriture, `create` compris : une route praticien
 * qui créerait une ligne de ratification fabriquerait un acte que le patient
 * n'a pas posé. Le LOT-06 ouvre le geste — et la garde ne s'ouvre pas avec lui,
 * elle se DÉPLACE : la création est épinglée à l'unique route portail, tout le
 * reste demeure interdit partout.
 *
 * Ce n'est PAS la même chose qu'ajouter une exception à la liste précédente.
 * Une exception nommée `EXCEPTION_*` de plus aurait laissé l'interdit valoir
 * « sauf là où quelqu'un a écrit » ; l'épinglage dit l'inverse — il n'y a
 * qu'un écrivain, et le nommer fait rougir tout second.
 */
const ECRIVAIN_RATIFICATION = 'src/app/api/portail/dossier/route.ts';

/** La création : autorisée au seul écrivain ci-dessus. */
const CREATION_RATIFICATION = /ratificationObjectif\.create\b/;

/**
 * Tout le reste : interdit PARTOUT, y compris à l'écrivain. Un patient qui
 * change d'avis ajoute une ligne — rien ne se met à jour, rien ne s'écrase.
 * `createMany` en fait partie : une ratification se pose une par une, un lot
 * de gestes n'aurait aucun auteur identifiable.
 */
const ECRITURES_RATIFICATION_DESTRUCTRICES =
  /ratificationObjectif\.(createMany|updateMany|update|deleteMany|delete|upsert)\b/;

/**
 * L'AMENDEMENT SUIT LE MÊME RÉGIME QUE LA RATIFICATION (6.0-B, LOT-04,
 * `D-110`), et la garde est écrite à part plutôt que fusionnée avec elle : deux
 * tables, deux motifs qui se lisent séparément — c'est la leçon du LOT-03,
 * « une garde corrigée ne corrige pas sa sœur ».
 *
 * L'écrivain est LE MÊME FICHIER, et il n'y en a qu'un : le geste appartient au
 * patient. Une route praticien qui créerait cette ligne fabriquerait des MOTS
 * que le patient n'a pas écrits — plus grave encore qu'un acte qu'il n'a pas
 * posé, puisque ces mots peuvent ensuite devenir l'énoncé d'un objectif.
 */
const ECRIVAIN_AMENDEMENT = 'src/app/api/portail/dossier/route.ts';

const CREATION_AMENDEMENT = /amendementObjectif\.create\b/;

/**
 * Tout le reste : interdit PARTOUT, y compris à l'écrivain. Se raviser, c'est
 * écrire à nouveau. `createMany` en fait partie : un texte s'écrit un par un,
 * un lot n'aurait aucun auteur identifiable.
 */
const ECRITURES_AMENDEMENT_DESTRUCTRICES =
  /amendementObjectif\.(createMany|updateMany|update|deleteMany|delete|upsert)\b/;

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

describe('G5 — un objectif ne se met jamais à jour, il se succède', () => {
  it('aucun update/delete/upsert sur `objectifNegocie`, hors l’effacement nommé', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);

    // ANTI-VACUITÉ 1 : le parcours voit bien l'application entière.
    expect(fichiers.length).toBeGreaterThan(200);
    expect(fichiers).toContain(ROUTE);
    expect(fichiers).toContain(EXCEPTION_EFFACEMENT);

    const fautifs = fichiers.filter((chemin) =>
      ECRITURES_DESTRUCTRICES.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // ANTI-VACUITÉ 2 : le détecteur mord pour de vrai — il TROUVE l'effacement.
    // Un motif devenu inopérant rendrait la liste vide, donc ce cas vert.
    expect(fautifs).toContain(EXCEPTION_EFFACEMENT);
    expect(fautifs).toEqual([EXCEPTION_EFFACEMENT]);
  });

  it('une ratification ne se crée QUE depuis le portail — le geste appartient au patient', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);

    // ANTI-VACUITÉ : le parcours voit l'application entière, la route praticien
    // du lot, ET l'écrivain qu'on prétend être le seul. Si ce dernier
    // disparaissait ou était renommé, la garde deviendrait creuse en silence.
    expect(fichiers.length).toBeGreaterThan(200);
    expect(fichiers).toContain(ROUTE);
    expect(fichiers).toContain(ECRIVAIN_RATIFICATION);

    const fautifs = fichiers.filter((chemin) =>
      CREATION_RATIFICATION.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // Le détecteur mord pour de vrai : il TROUVE l'écrivain légitime. Un motif
    // devenu inopérant rendrait la liste vide, donc ce cas vert.
    expect(fautifs).toContain(ECRIVAIN_RATIFICATION);
    expect(fautifs).toEqual([ECRIVAIN_RATIFICATION]);

    // Et la route PRATICIEN, elle, ne l'écrit toujours pas — c'était
    // l'invariant du LOT-02, il n'a pas bougé.
    expect(fautifs).not.toContain(ROUTE);
  });

  it('une ratification ne se met jamais à jour ni ne se retire, nulle part', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);

    expect(fichiers.length).toBeGreaterThan(200);
    expect(fichiers).toContain(ECRIVAIN_RATIFICATION);

    const fautifs = fichiers.filter((chemin) =>
      ECRITURES_RATIFICATION_DESTRUCTRICES.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // Anti-vacuité : l'effacement supprime AUSSI les ratifications, donc le
    // détecteur doit le trouver. S'il ne trouve plus rien, c'est le motif qui
    // est mort, pas le dépôt qui est devenu sain.
    expect(fautifs).toContain(EXCEPTION_EFFACEMENT);
    expect(fautifs).toEqual([EXCEPTION_EFFACEMENT]);

    // L'ÉCRIVAIN LÉGITIME N'EST PAS DISPENSÉ : il crée, il ne corrige pas.
    expect(fautifs).not.toContain(ECRIVAIN_RATIFICATION);
  });

  it('un amendement ne se crée QUE depuis le portail — les mots appartiennent au patient', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);

    // ANTI-VACUITÉ : le parcours voit l'application entière, la route praticien
    // qui LIT les amendements, ET l'écrivain qu'on prétend être le seul.
    expect(fichiers.length).toBeGreaterThan(200);
    expect(fichiers).toContain(ROUTE);
    expect(fichiers).toContain(ECRIVAIN_AMENDEMENT);

    const fautifs = fichiers.filter((chemin) =>
      CREATION_AMENDEMENT.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // Le détecteur mord pour de vrai : il TROUVE l'écrivain légitime.
    expect(fautifs).toContain(ECRIVAIN_AMENDEMENT);
    expect(fautifs).toEqual([ECRIVAIN_AMENDEMENT]);

    // Et la route PRATICIEN ne l'écrit pas, alors même qu'elle CITE ce texte
    // pour en faire l'énoncé d'une nouvelle version : citer, c'est lire.
    expect(fautifs).not.toContain(ROUTE);
  });

  it('un amendement ne se met jamais à jour ni ne se retire, nulle part', () => {
    const fichiers = RACINES_SOUS_GARDE.flatMap(fichiersSources);

    expect(fichiers.length).toBeGreaterThan(200);
    expect(fichiers).toContain(ECRIVAIN_AMENDEMENT);

    const fautifs = fichiers.filter((chemin) =>
      ECRITURES_AMENDEMENT_DESTRUCTRICES.test(readFileSync(path.join(RACINE_WEB, chemin), 'utf8')),
    );

    // Anti-vacuité : l'effacement du dossier supprime AUSSI les amendements,
    // donc le détecteur doit le trouver. S'il ne trouve plus rien, c'est le
    // motif qui est mort, pas le dépôt qui est devenu sain.
    expect(fautifs).toContain(EXCEPTION_EFFACEMENT);
    expect(fautifs).toEqual([EXCEPTION_EFFACEMENT]);

    expect(fautifs).not.toContain(ECRIVAIN_AMENDEMENT);
  });
});

// ── G6 — anti-diagnostic ────────────────────────────────────────────────────

describe('G6 — ni moteur clinique, ni code diagnostique', () => {
  // Une reformulation est une COMPRÉHENSION, jamais une conclusion (`DC-31`,
  // `DC-32` : diagnostic, hypothèse et orientation sont trois objets distincts).
  // Importer un moteur « pour suggérer » une reformulation ferait entrer une
  // sortie de scoring dans les mots attribués au patient.
  // PRÉFIXES DE RÉPERTOIRE, pas noms feuilles : `clinical-engine` ne couvre pas
  // `clinical/`, et la liste précédente laissait passer `orientationService`,
  // `orientationEngine`, `contradictionsEngine`, `stopRulesV1`, tout `scoring/`
  // et tout `equilibre/` — c'est-à-dire l'essentiel de ce qu'elle prétendait
  // interdire.
  const IMPORTS_INTERDITS = [
    '@/lib/clinical',
    '@/lib/clinical-engine',
    '@/lib/scoring',
    '@/lib/instruments',
    '@/lib/equilibre',
  ];

  const RACINES_DIAGNOSTIQUES = ['cim', 'icd', 'dsm', 'classification', 'diagnos'];

  it.each([MODULE, ROUTE, PANNEAU])('%s n’importe aucun moteur clinique', (chemin) => {
    const source = sourceSansCommentaires(chemin);
    expect(source.length).toBeGreaterThan(500); // anti-vacuité
    for (const interdit of IMPORTS_INTERDITS) {
      expect(source).not.toContain(interdit);
    }
  });

  it.each([MODULE, ROUTE])('%s ne déclare aucune propriété de nature diagnostique', (chemin) => {
    const noms = nomsDeclares(chemin);
    expect(noms).toContain('enoncePatient'); // anti-vacuité

    const fautifs = noms.filter((nom) => {
      const minuscule = nom.toLowerCase();
      return (
        minuscule.startsWith('code') ||
        RACINES_DIAGNOSTIQUES.some((racine) => minuscule.includes(racine))
      );
    });
    expect(fautifs).toEqual([]);
  });
});
