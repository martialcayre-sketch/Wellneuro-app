import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  LIBELLE_INSTRUMENT_CABINET,
  TEXTE_INSTRUMENTS_CABINET,
  type CertificationLue,
  type LibelleCertification,
  libelleCertificationBibliotheque,
  libelleCertificationPassation,
} from '@/lib/certification-libelles';
import type { StatutCertificationRuntime } from '@/lib/bibliotheque';

// Garde des libellés de vérification de scoring — D-034 (2026-08-08) et D-036
// (LOT-02).
//
// D-034 tranche que WellNeuro ne revendique aucune validation psychométrique, et
// nomme lui-même ce qu'il laisse dû : les badges praticien affichaient
// « Certifié » sans porter ce sens. D-036 tranche le geste — renommer le
// libellé, sur toute la famille des libellés qui emploient le mot.
//
// DEUX ASSERTIONS, PAS UNE, et c'est la leçon du garde jumeau
// (`api/praticien/synthese/promptAlimentaire.guard.test.ts`, refusé deux fois en
// revue avant d'atteindre sa forme) : une présence seule est satisfaite par
// n'importe quel texte qui la contient, une absence seule est satisfaite par un
// écran muet. Il faut la table des libellés attendus **et** le refus du retour
// du mot nu.
//
// POURQUOI LE MOTIF PORTE SUR LES VALEURS RENDUES, ET NON SUR LE SOURCE. Les
// deux composants contiennent légitimement `libelleCertificationBibliotheque`,
// `CertificationLue` et la valeur de donnée `'certifie'` — le vocabulaire du
// **dossier** ne change pas, seul celui de l'écran change. Un `/certifi/i`
// appliqué au source rougirait sur ces identifiants et exigerait une exception ;
// or une échappatoire creusée pour un cas légitime est réutilisable par le
// défaut (c'est exactement ce qui a fait refuser la deuxième rédaction du garde
// D-034). Le motif porte donc sur ce qui s'affiche, où aucune exception n'est
// nécessaire.
//
// PAS DE `\b` : en JavaScript `\w` est `[A-Za-z0-9_]`, donc `é` n'est pas un
// caractère de mot et `\bcertifié\b` ne borne rien. `/certifi/i` couvre sans
// ancrage « Certifié », « certification », « certifiés », « certifiée ».
//
// UN MOT INTERDIT NE SUFFIT PAS : IL FAUT UN SENS ÉPINGLÉ. Première rédaction de
// ce fichier, refusée en revue adversariale : les deux constantes n'avaient
// aucun attendu écrit à la main, seulement le passage au motif. Or
// `TEXTE_INSTRUMENTS_CABINET` réécrit en « leur scoring **est** vérifié par
// WellNeuro » ne porte pas le mot interdit et **passait le garde vert** — en
// affirmant à l'écran l'inverse exact de D-034 pour un instrument du cabinet.
// La chaîne vide passait aussi. C'est le pendant du piège connu du dépôt (« un
// garde qui assère une présence est satisfait par l'inversion exacte du
// défaut »), pris par l'autre bout : une absence de mot est satisfaite par une
// affirmation inversée. D'où `ATTENDUS_CONSTANTES` plus bas.
//
// CE QUE CE GARDE NE COUVRE PAS, dit plutôt que tu :
//  - un nouveau littéral « Certifié » posé **directement** dans un composant,
//    hors de ce module. Le contrôle de source plus bas n'écarte que les anciens
//    libellés, **nommément et à la casse près** : `'Instrument certifié'`
//    (minuscule) ne contient aucune des chaînes de `ANCIENS_LIBELLES` et
//    passerait. Ce qui réduit ce trou est le rendu réellement asséré —
//    `BibliothequePanel.test.tsx` pour le badge du catalogue, le badge cabinet
//    et la prose du tiroir, `FichePatientPanel.test.tsx` pour la colonne
//    « Qualité », `e2e/dashboard-praticien.spec.ts` pour le parcours cabinet.
//  - le vocabulaire du dossier : `instrument_registry.json`,
//    `StatutCertificationRuntime`, le corpus. Il garde le mot, et c'est le prix
//    assumé de D-036 — l'écran et le dossier ne disent plus la même chose.
//  - **la divergence entre le champ que l'UI lit et le barreau du registre.**
//    « Scoring vérifié » reproduit le nom `scoring_verifie` de
//    `instrument_registry.json`, mais il est piloté par
//    `def.scoring.certification.status`, écrit à la main dans le catalogue de
//    code. Rien ne relie les deux — dette nommée dans D-036.
//
// PIÈGE POUR QUI ÉDITERA CES DEUX COMPOSANTS : le contrôle de source lit les
// fichiers ENTIERS, commentaires compris. Documenter un ancien libellé dans un
// commentaire de `BibliothequePanel.tsx` ou `FichePatientPanel.tsx` fait rougir
// le garde pour une raison légitime — et invite l'exception que l'en-tête
// interdit. Écrire ce commentaire ailleurs (le banc, le spec E2E, le changelog),
// pas dans les deux fichiers scannés.

/** Le mot qu'aucun texte d'écran ne doit plus porter. */
const MOTIF_MOT_NU = /certifi/i;

/**
 * Attendus de la bibliothèque, **écrits à la main**. Un attendu dérivé du module
 * testé bougerait avec lui et ne prouverait rien.
 *
 * La clé est le type de l'union : ajouter une valeur à
 * `StatutCertificationRuntime` sans l'inscrire ici ne compile pas. C'est
 * l'exhaustivité, obtenue par le typage plutôt que par une liste à maintenir.
 */
const ATTENDUS_BIBLIOTHEQUE: Record<StatutCertificationRuntime, LibelleCertification> = {
  certifie: { label: 'Scoring vérifié', variant: 'success' },
  ambigu: { label: 'Scoring ambigu', variant: 'warning' },
  a_verifier: { label: 'Scoring à vérifier', variant: 'warning' },
  non_score: { label: 'Non scoré', variant: 'neutral' },
  non_certifie: { label: 'Scoring non vérifié', variant: 'neutral' },
  inconnu: { label: 'Statut inconnu', variant: 'neutral' },
};

/**
 * Attendus des deux littéraux d'écran, **au mot près**. Ce ne sont pas des
 * doublons du motif : le motif interdit un mot, ceux-ci épinglent un SENS. Sans
 * eux, « leur scoring **est** vérifié par WellNeuro » passait vert.
 *
 * Toute reformulation légitime de ces textes fait rougir ce banc, et c'est
 * voulu : elle demande alors de relire ce que la phrase affirme.
 */
const ATTENDUS_CONSTANTES = {
  LIBELLE_INSTRUMENT_CABINET: 'Cabinet — scoring non vérifié',
  TEXTE_INSTRUMENTS_CABINET:
    'Privés à votre cabinet — leur scoring n’est pas vérifié par WellNeuro ; publication après relecture de la grille.',
} as const;

/** Attendus de la colonne « Qualité » de la fiche patient, écrits à la main. */
const ATTENDUS_PASSATION: Array<{
  cas: string;
  certification: CertificationLue | null;
  attendu: LibelleCertification | null;
}> = [
  {
    cas: 'drive + certifie',
    certification: { source: 'drive', status: 'certifie' },
    attendu: { label: 'Scoring vérifié (Drive)', variant: 'success' },
  },
  {
    cas: 'drive + ambigu',
    certification: { source: 'drive', status: 'ambigu' },
    attendu: { label: 'Scoring ambigu (Drive)', variant: 'warning' },
  },
  {
    cas: 'manuel EORTC + certifie',
    certification: { source: 'manuel_eortc', status: 'certifie' },
    attendu: { label: 'Scoring vérifié (manuel EORTC)', variant: 'success' },
  },
  {
    cas: 'a_verifier, toute source',
    certification: { status: 'a_verifier' },
    attendu: { label: 'Scoring à vérifier', variant: 'warning' },
  },
  {
    cas: 'non_score, toute source',
    certification: { status: 'non_score' },
    attendu: { label: 'Non scoré', variant: 'neutral' },
  },
  {
    // `historique` est un membre DÉCLARÉ de `CertificationSource`
    // (`lib/scoring/types.ts`) qu'**aucun moteur n'écrit** — vérifié : la valeur
    // n'apparaît nulle part ailleurs dans le dépôt. Ce n'est donc pas « la forme
    // d'une passation ancienne » comme une première rédaction l'affirmait : la
    // vraie forme ancienne est l'ABSENCE de clé `certification`, couverte par le
    // cas `null` ci-dessous. Le cas reste utile — `CertificationLue` est laxiste
    // exprès, et la branche par défaut doit tenir sur une source sans statut.
    cas: 'source déclarée mais jamais écrite, sans statut — défaut',
    certification: { source: 'historique' },
    attendu: { label: 'Scoring non vérifié', variant: 'neutral' },
  },
  {
    // Une valeur qu'aucune version du moteur n'a écrite : le mapper lit une
    // colonne JSON, il doit rendre un libellé plutôt que de laisser passer
    // `undefined` à l'affichage.
    cas: 'statut inattendu en base — défaut',
    certification: { source: 'drive', status: 'quelque_chose_de_neuf' },
    attendu: { label: 'Scoring non vérifié', variant: 'neutral' },
  },
  {
    // Pas de métadonnée : l'appelant rend « Historique », pas un badge de
    // vérification. Cette branche est ce qui distingue une passation ancienne
    // d'une passation dont le scoring n'est pas vérifié — les confondre ferait
    // passer l'une pour l'autre.
    cas: 'aucune certification',
    certification: null,
    attendu: null,
  },
];

/** Les libellés que ce lot retire. Le motif DOIT mordre dessus. */
const ANCIENS_LIBELLES = [
  'Certifié',
  'Certifié Drive',
  'Certifié manuel EORTC',
  'Certification ambiguë',
  'Certification à vérifier',
  'Non certifié',
  'Cabinet — non certifié',
  'jamais certifiés',
  'Il reste non certifié.',
  'jamais certifié automatiquement',
];

const RACINE_COMPOSANTS = join(__dirname, '..', 'components');
const SOURCE_BIBLIOTHEQUE = readFileSync(join(RACINE_COMPOSANTS, 'BibliothequePanel.tsx'), 'utf8');
const SOURCE_FICHE = readFileSync(join(RACINE_COMPOSANTS, 'FichePatientPanel.tsx'), 'utf8');

/**
 * Entrée de bibliothèque **telle que `listeBibliotheque()` la produit** : les deux
 * champs dérivent du même `def.scoring.certification.status`, donc ils s'accordent.
 *
 * ATTENTION, ET C'EST LA RAISON DU TEST DE DIVERGENCE PLUS BAS. Accorder les deux
 * champs **retire** une couverture : sur l'état `certifie`, `entree.certifie` vaut
 * `true`, donc la première moitié du `||` suffit et la seconde
 * (`statutCertification === 'certifie'`) n'est plus exercée par cette table. Une
 * première rédaction de ce fichier appelait le mapper sans `certifie` et couvrait
 * donc la seconde moitié ; le passage à `Pick` l'a fait disparaître, et retirer
 * la clause laissait alors les 4 200 tests verts. Relevé en revue adversariale.
 * Les DEUX directions de divergence sont désormais testées à part.
 */
function entreeReelle(etat: StatutCertificationRuntime) {
  return { certifie: etat === 'certifie', statutCertification: etat };
}

describe('libellés de certification — la table attendue', () => {
  it('rend le libellé et la variante de chaque état de bibliothèque', () => {
    for (const [etat, attendu] of Object.entries(ATTENDUS_BIBLIOTHEQUE)) {
      expect(
        libelleCertificationBibliotheque(entreeReelle(etat as StatutCertificationRuntime)),
        `état ${etat}`,
      ).toEqual(attendu);
    }
  });

  it('couvre les six états, dans l’ordre — un retrait ou un renommage rougit', () => {
    // L'appartenance ne suffit pas : `toEqual` sur un tableau ORDONNÉ attrape
    // aussi la disparition d'un état, qu'un `toContain` par état laisserait
    // passer.
    expect(Object.keys(ATTENDUS_BIBLIOTHEQUE)).toEqual([
      'certifie',
      'ambigu',
      'a_verifier',
      'non_score',
      'non_certifie',
      'inconnu',
    ]);
  });

  it('les DEUX moitiés du `||` sont exercées, chacune seule', () => {
    // `entree.certifie` dérive de `def.scoring.certification.status` par
    // `estCertifie()`, comme `statutCertification` par
    // `statutCertificationRuntime()` : en production ils s'accordent, et
    // `entreeReelle` les accorde donc. Mais c'est précisément pour cela que la
    // table n'exerce plus qu'une moitié du `||`. Les deux cas ci-dessous sont
    // **défensifs** : ils ne décrivent pas un état que la production sert, ils
    // gardent chaque moitié de la condition contre son retrait.
    //
    // Sans le second, retirer `|| entree.statutCertification === 'certifie'` du
    // mapper laissait toute la suite verte.
    expect(
      libelleCertificationBibliotheque({ certifie: true, statutCertification: 'non_certifie' }),
      'le booléen seul doit suffire',
    ).toEqual(ATTENDUS_BIBLIOTHEQUE.certifie);
    expect(
      libelleCertificationBibliotheque({ certifie: false, statutCertification: 'certifie' }),
      'l’état seul doit suffire',
    ).toEqual(ATTENDUS_BIBLIOTHEQUE.certifie);
    // Et la réciproque : le booléen faux ne force rien, l'état décide.
    expect(
      libelleCertificationBibliotheque({ certifie: false, statutCertification: 'a_verifier' }),
    ).toEqual(ATTENDUS_BIBLIOTHEQUE.a_verifier);
  });

  it('épingle le SENS des deux littéraux d’écran, pas seulement leur vocabulaire', () => {
    // Le motif plus bas interdit un mot ; ces deux assertions interdisent une
    // affirmation inversée. « leur scoring EST vérifié par WellNeuro » ne porte
    // pas le mot interdit et passait le garde vert avant elles — en affirmant à
    // l'écran l'inverse de D-034. La chaîne vide passait aussi.
    expect(LIBELLE_INSTRUMENT_CABINET).toBe(ATTENDUS_CONSTANTES.LIBELLE_INSTRUMENT_CABINET);
    expect(TEXTE_INSTRUMENTS_CABINET).toBe(ATTENDUS_CONSTANTES.TEXTE_INSTRUMENTS_CABINET);
  });

  it.each(ATTENDUS_PASSATION)('passation — $cas', ({ certification, attendu }) => {
    expect(libelleCertificationPassation(certification)).toEqual(attendu);
  });

  it('nomme la source de la règle scorée, pas seulement son état', () => {
    // Le moteur EORTC suit le manuel officiel, les autres la grille Drive. Sans
    // cette distinction, le badge du manuel EORTC retombait sur le libellé de
    // défaut alors que le registre porte `scoring_verifie` — la fiche
    // contredisait le dossier. Les deux libellés verts doivent donc DIFFÉRER.
    const drive = libelleCertificationPassation({ source: 'drive', status: 'certifie' });
    const eortc = libelleCertificationPassation({ source: 'manuel_eortc', status: 'certifie' });
    expect(drive?.label).not.toBe(eortc?.label);
    expect(drive?.variant).toBe(eortc?.variant);
  });
});

describe('libellés de certification — aucun texte d’écran ne porte plus le mot nu', () => {
  const textesRendus = [
    ...Object.values(ATTENDUS_BIBLIOTHEQUE).map(a => a.label),
    ...ATTENDUS_PASSATION.map(c => c.attendu?.label).filter((l): l is string => Boolean(l)),
    LIBELLE_INSTRUMENT_CABINET,
    TEXTE_INSTRUMENTS_CABINET,
  ];

  it('anti-vacuité : il y a bien des textes à examiner, et aucun n’est vide', () => {
    // Une liste vide passerait le test suivant sans rien prouver — c'est la
    // manière dont un garde de refus cesse silencieusement de garder. Et un
    // texte vide passe `/certifi/i` : compter les éléments ne suffit pas, il
    // faut compter les caractères.
    // Compte EXACT, pas un plancher : un `>=` laisse disparaître un attendu sans
    // rougir, ce qui est la manière dont une anti-vacuité cesse de garder.
    // 6 états de bibliothèque + 7 libellés de passation non nuls + 2 constantes.
    expect(textesRendus).toHaveLength(15);
    for (const texte of textesRendus) {
      expect(texte.trim().length, `texte vide dans la liste examinée`).toBeGreaterThan(0);
    }
  });

  it.each(textesRendus)('« %s » ne porte pas /certifi/i', texte => {
    expect(MOTIF_MOT_NU.test(texte)).toBe(false);
  });

  it('les libellés RENDUS par le module sont les mêmes que ceux examinés ici', () => {
    // Le contrôle ci-dessus porte sur les attendus. Sans ce couplage, un module
    // qui rendrait « Certifié » resterait vert tant que la table attendue,
    // elle, ne le porte pas — le garde examinerait sa propre copie. La table est
    // déjà confrontée au module plus haut ; ceci le redit sur les valeurs
    // réellement produites, y compris les deux constantes.
    const produits = [
      ...Object.keys(ATTENDUS_BIBLIOTHEQUE).map(
        etat => libelleCertificationBibliotheque(entreeReelle(etat as StatutCertificationRuntime)).label,
      ),
      ...ATTENDUS_PASSATION.map(c => libelleCertificationPassation(c.certification)?.label).filter(
        (l): l is string => Boolean(l),
      ),
      LIBELLE_INSTRUMENT_CABINET,
      TEXTE_INSTRUMENTS_CABINET,
    ];
    const fautifs = produits.filter(t => MOTIF_MOT_NU.test(t));
    expect(fautifs, `textes rendus portant le mot : ${fautifs.join(' | ')}`).toEqual([]);
  });

  it.each(ANCIENS_LIBELLES)('preuve par mutation : le motif mord sur « %s »', ancien => {
    // Sans cette passe, un motif cassé (`/xyz/`) rendrait tout le bloc ci-dessus
    // vert sur n'importe quel texte, mot nu compris.
    expect(MOTIF_MOT_NU.test(ancien)).toBe(true);
  });
});

describe('libellés de certification — les deux écrans passent par le module', () => {
  it('les composants importent le module et n’ont plus de mapper local', () => {
    // Contrôle STRUCTUREL, et il ne prouve pas l'affichage : un composant qui
    // calculerait le libellé puis en afficherait un autre le passerait. C'est
    // `BibliothequePanel.test.tsx` et `FichePatientPanel.test.tsx` qui
    // établissent le rendu.
    expect(SOURCE_BIBLIOTHEQUE).toContain("from '@/lib/certification-libelles'");
    expect(SOURCE_BIBLIOTHEQUE).toContain('libelleCertificationBibliotheque(e)');
    expect(SOURCE_BIBLIOTHEQUE).toContain('{LIBELLE_INSTRUMENT_CABINET}');
    expect(SOURCE_BIBLIOTHEQUE).toContain('{TEXTE_INSTRUMENTS_CABINET}');
    expect(SOURCE_FICHE).toContain("from '@/lib/certification-libelles'");
    expect(SOURCE_FICHE).toContain('libelleCertificationPassation(');
  });

  it.each(ANCIENS_LIBELLES)('aucun composant ne réintroduit « %s »', ancien => {
    // Liste FERMÉE des libellés retirés, et c'est sa limite : elle attrape le
    // revert, pas un mot neuf. Elle est là parce qu'un `/certifi/i` sur le
    // source rougirait sur les identifiants légitimes du dossier
    // (`libelleCertificationBibliotheque`, `ScoreCertification`, `'certifie'`)
    // et devrait creuser une exception — ce qu'on ne fait pas.
    expect(SOURCE_BIBLIOTHEQUE).not.toContain(ancien);
    expect(SOURCE_FICHE).not.toContain(ancien);
  });
});
