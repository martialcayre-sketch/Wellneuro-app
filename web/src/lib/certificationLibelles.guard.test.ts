import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  LIBELLE_INSTRUMENT_CABINET,
  TEXTE_INSTRUMENTS_CABINET,
  type LibelleCertification,
  type ScoreCertification,
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
// `ScoreCertification` et la valeur de donnée `'certifie'` — le vocabulaire du
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
// CE QUE CE GARDE NE COUVRE PAS, dit plutôt que tu :
//  - un nouveau littéral « Certifié » posé **directement** dans un composant,
//    hors de ce module. Le contrôle de source plus bas n'écarte que les anciens
//    libellés, nommément ; il ne peut pas deviner un mot neuf. Ce qui réduit ce
//    trou est le rendu réellement asséré — `FichePatientPanel.test.tsx` pour la
//    colonne « Qualité », `e2e/dashboard-praticien.spec.ts` pour le badge
//    cabinet.
//  - le vocabulaire du dossier : `instrument_registry.json`,
//    `StatutCertificationRuntime`, le corpus. Il garde le mot, et c'est le prix
//    assumé de D-036 — l'écran et le dossier ne disent plus la même chose.

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

/** Attendus de la colonne « Qualité » de la fiche patient, écrits à la main. */
const ATTENDUS_PASSATION: Array<{
  cas: string;
  certification: ScoreCertification | null;
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
    cas: 'statut inconnu du mapper — défaut',
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

describe('libellés de certification — la table attendue', () => {
  it('rend le libellé et la variante de chaque état de bibliothèque', () => {
    for (const [etat, attendu] of Object.entries(ATTENDUS_BIBLIOTHEQUE)) {
      expect(
        libelleCertificationBibliotheque({ statutCertification: etat as StatutCertificationRuntime }),
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

  it('le raccourci booléen `certifie` mène au même libellé que l’état', () => {
    // Deux entrées pour une seule vérité : `entree.certifie` est dérivé de
    // `def.scoring.certification.status` par `estCertifie()`, et le composant
    // lisait déjà les deux. Si les deux chemins divergeaient, un instrument
    // s'afficherait vérifié sur une donnée et non vérifié sur l'autre.
    expect(libelleCertificationBibliotheque({ certifie: true })).toEqual(
      ATTENDUS_BIBLIOTHEQUE.certifie,
    );
    // Et le défaut, quand rien n'est renseigné : jamais « sans badge ».
    expect(libelleCertificationBibliotheque({})).toEqual(ATTENDUS_BIBLIOTHEQUE.non_certifie);
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

  it('anti-vacuité : il y a bien des textes à examiner', () => {
    // Une liste vide passerait le test suivant sans rien prouver — c'est la
    // manière dont un garde de refus cesse silencieusement de garder.
    expect(textesRendus.length).toBeGreaterThanOrEqual(13);
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
        etat =>
          libelleCertificationBibliotheque({ statutCertification: etat as StatutCertificationRuntime })
            .label,
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
