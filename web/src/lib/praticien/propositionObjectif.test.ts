import { describe, expect, it } from 'vitest';

import { canonicalJson, canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  CLES_INTERDITES,
  LONGUEUR_MAX_MOTIF_ECART,
  MAX_PROPOSITIONS,
  assembleeCourante,
  assemblerPropositions,
  clesInterdites,
  depuisAnamnese,
  depuisInstrument,
  depuisRegleSignee,
  dispositionCourante,
  empreinte,
  jsonCanonique,
  preparerDisposition,
  propositionsVivantes,
  type EntreesAssemblage,
} from './propositionObjectif';

// Bancs du moteur de proposition (Alliance 6.0-B, LOT-02).
//
// CE FICHIER IMPORTE `clinical-engine/canonical`, ET C'EST LE SEUL DU LOT À
// AVOIR LE DROIT DE LE FAIRE. L'arbitrage 2 a tranché pour la DUPLICATION du
// helper plutôt que pour une exception à G7 : une duplication qui dérive en
// silence ne vaudrait pas mieux que l'import qu'elle remplace, donc un banc
// confronte les deux implémentations. La garde G7-1 vérifie de son côté que
// c'est bien ici — et nulle part dans le code applicatif — que cet import vit.

const SHA_PERIMETRE = 'a'.repeat(64);

const anamnese = () => ({
  dateConsultation: '2026-08-20T09:00:00.000Z',
  motifPrincipal: 'Je me réveille à trois heures toutes les nuits.',
  objectifPrioritaire: 'Dormir d’une traite.',
  attentes: ['Comprendre pourquoi', 'Ne pas prendre de somnifère'],
});

const entrees = (partiel: Partial<EntreesAssemblage> = {}): EntreesAssemblage => ({
  anamnese: anamnese(),
  plainte: { instrument: 'Q_MOD_03', domaine: 'sommeil', restitution: 'Restitution publiée' },
  candidats: [{ regle: 'PRIO-SOM-01', texte: 'Explorer le sommeil' }],
  shaPerimetre: SHA_PERIMETRE,
  ...partiel,
});

// ── Le fragment sourcé ──────────────────────────────────────────────────────

describe('un fragment ne se construit que par une fabrique, avec sa source', () => {
  it('les trois fabriques posent la nature de la source', () => {
    expect(depuisAnamnese('motif_principal', 'Ses mots', '2026-08-20T09:00:00.000Z')?.source).toEqual({
      nature: 'anamnese',
      champ: 'motif_principal',
      dateConsultation: '2026-08-20T09:00:00.000Z',
    });
    expect(depuisInstrument('Q_MOD_03', 'sommeil', 'Restitution publiée')?.source).toEqual({
      nature: 'instrument',
      instrument: 'Q_MOD_03',
      domaine: 'sommeil',
      restitution: 'Restitution publiée',
    });
    expect(depuisRegleSignee('PRIO-SOM-01', 'Explorer le sommeil', SHA_PERIMETRE)?.source).toEqual({
      nature: 'regle_signee',
      regle: 'PRIO-SOM-01',
      shaPerimetre: SHA_PERIMETRE,
    });
  });

  it('un texte vide ne fait pas un fragment — citer un silence serait le combler', () => {
    // `DC-24` : une donnée absente n'est ni zéro ni une réponse.
    expect(depuisAnamnese('motif_principal', '   ', '2026-08-20T09:00:00.000Z')).toBeNull();
    expect(depuisInstrument('Q_MOD_03', 'sommeil', null)).toBeNull();
    expect(depuisInstrument('Q_MOD_03', 'sommeil', '  ')).toBeNull();
    expect(depuisRegleSignee('PRIO-SOM-01', '', SHA_PERIMETRE)).toBeNull();
  });

  it('une règle sans SHA de périmètre n’est pas une règle signée', () => {
    // Se réclamer d'une signature qu'on ne peut pas montrer (`DC-17`, `DC-26`).
    expect(depuisRegleSignee('PRIO-SOM-01', 'Explorer le sommeil', '')).toBeNull();
    expect(depuisRegleSignee('PRIO-SOM-01', 'Explorer le sommeil', '   ')).toBeNull();
  });

  it('le texte est recopié, jamais reformulé — seuls les blancs de bord tombent', () => {
    const mots = '  Je me réveille à trois heures.  ';
    expect(depuisAnamnese('motif_principal', mots, '2026-08-20T09:00:00.000Z')?.texte).toBe(
      'Je me réveille à trois heures.',
    );
  });
});

// ── Le balayage du blob (arbitrage 1) ───────────────────────────────────────

describe('le balayage refuse toute clé de mesure ordonnée, à toute profondeur', () => {
  it('trouve chacune des clés interdites', () => {
    for (const cle of CLES_INTERDITES) {
      expect(clesInterdites({ [cle]: 1 })).toEqual([cle]);
    }
    // ANTI-VACUITÉ : la liste n'est pas vide, sinon la boucle ci-dessus
    // n'assertionnerait rien du tout.
    expect(CLES_INTERDITES.length).toBeGreaterThan(4);
  });

  it('descend dans les tableaux et les objets imbriqués', () => {
    const blob = [{ texte: 'x', source: { nature: 'anamnese', detail: { ordre: 2 } } }];
    expect(clesInterdites(blob)).toEqual(['ordre']);
  });

  it('est insensible à la casse — `Rang` est un rang', () => {
    expect(clesInterdites({ Rang: 1 })).toEqual(['Rang']);
  });

  it('ÉGALITÉ EXACTE, PAS SOUS-CHAÎNE : `disposition` et `restitution` passent', () => {
    // Le cœur de l'arbitrage 1. Une garde par sous-chaîne rougirait sur
    // `disposition` (qui contient « position ») et serait assouplie au premier
    // faux positif — donc désarmée. Ces deux noms sont ceux du lot lui-même.
    expect(clesInterdites({ disposition: 'reprise', restitution: 'Publiée' })).toEqual([]);
  });

  it('un fragment réellement assemblé est propre', () => {
    const propositions = assemblerPropositions(entrees());
    expect(propositions).toHaveLength(1);
    expect(clesInterdites(propositions.map((p) => p.fragments))).toEqual([]);
  });

  it('ne boucle pas sur une référence circulaire', () => {
    const noeud: Record<string, unknown> = { texte: 'x' };
    noeud.soi = noeud;
    expect(clesInterdites(noeud)).toEqual([]);
  });
});

// ── L'empreinte dupliquée (arbitrage 2) ─────────────────────────────────────

describe('la sérialisation canonique dupliquée rend exactement la même chose que l’originale', () => {
  // ARBITRAGE 2 : G7 interdit d'importer `clinical-engine/` depuis le module,
  // donc le helper est recopié. Une copie qui dérive ne vaut pas mieux que
  // l'import qu'elle remplace — ce banc est ce qui l'empêche.
  const valeurs: unknown[] = [
    null,
    'texte',
    42,
    true,
    [],
    {},
    { b: 1, a: 2 },
    { imbrique: { z: [1, 2, { y: 'x' }], a: null } },
    [{ b: 1 }, { a: 2 }],
    { avecUndefined: undefined, garde: 'ok' },
  ];

  it.each(valeurs.map((v, i) => [i, v] as const))(
    'valeur %i — même chaîne canonique et même empreinte',
    (_index, valeur) => {
      expect(jsonCanonique(valeur)).toBe(canonicalJson(valeur));
      expect(empreinte(valeur)).toBe(canonicalSha256(valeur));
    },
  );

  it('refuse les mêmes formes que l’originale', () => {
    for (const invalide of [undefined, new Date(), Number.NaN, new Map()]) {
      expect(() => jsonCanonique(invalide)).toThrow();
      expect(() => canonicalJson(invalide)).toThrow();
    }
  });

  it('rend une empreinte SHA-256 hexadécimale de 64 caractères', () => {
    expect(empreinte({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── L'assemblage ────────────────────────────────────────────────────────────

describe('assembler — une proposition par candidat signé, jamais plus de trois', () => {
  it('assemble la règle, la plainte, puis l’anamnèse — chaque fragment sourcé', () => {
    const [proposition] = assemblerPropositions(entrees());
    expect(proposition.fragments.map((f) => f.source)).toEqual([
      { nature: 'regle_signee', regle: 'PRIO-SOM-01', shaPerimetre: SHA_PERIMETRE },
      { nature: 'instrument', instrument: 'Q_MOD_03', domaine: 'sommeil', restitution: 'Restitution publiée' },
      { nature: 'anamnese', champ: 'motif_principal', dateConsultation: '2026-08-20T09:00:00.000Z' },
      { nature: 'anamnese', champ: 'objectif_prioritaire', dateConsultation: '2026-08-20T09:00:00.000Z' },
      { nature: 'anamnese', champ: 'attentes', dateConsultation: '2026-08-20T09:00:00.000Z' },
      { nature: 'anamnese', champ: 'attentes', dateConsultation: '2026-08-20T09:00:00.000Z' },
    ]);
    // Chaque attente devient SON fragment : aucune n'est fondue dans une
    // phrase de synthèse que personne n'aurait écrite.
    expect(proposition.fragments.filter((f) => f.source.nature === 'anamnese').map((f) => f.texte)).toEqual([
      'Je me réveille à trois heures toutes les nuits.',
      'Dormir d’une traite.',
      'Comprendre pourquoi',
      'Ne pas prendre de somnifère',
    ]);
  });

  it('SANS CANDIDAT, AUCUNE PROPOSITION — même avec une anamnèse pleine', () => {
    // Table non signée, abstention requise, aucune règle déclenchée : la
    // machine n'a rien de signé à citer. Assembler sur la seule anamnèse
    // ferait de Wellneuro l'auteur d'une proposition que rien ne fonde.
    expect(assemblerPropositions(entrees({ candidats: [] }))).toEqual([]);
  });

  it('SANS SHA DE PÉRIMÈTRE, AUCUNE PROPOSITION', () => {
    expect(assemblerPropositions(entrees({ shaPerimetre: null }))).toEqual([]);
    expect(assemblerPropositions(entrees({ shaPerimetre: '  ' }))).toEqual([]);
  });

  it('borne la PRODUCTION à trois, quel que soit le nombre de candidats reçus', () => {
    const candidats = Array.from({ length: 9 }, (_, i) => ({
      regle: `PRIO-${i}`,
      texte: `Règle ${i}`,
    }));
    const propositions = assemblerPropositions(entrees({ candidats }));
    expect(propositions).toHaveLength(MAX_PROPOSITIONS);
    // Les TROIS PREMIERS de l'ordre reçu, sans tri : l'ordre des candidats
    // n'est couvert par aucune ligne signée (`D-093`), le module ne le
    // réinterprète pas.
    expect(propositions.map((p) => p.fragments[0].source)).toEqual([
      { nature: 'regle_signee', regle: 'PRIO-0', shaPerimetre: SHA_PERIMETRE },
      { nature: 'regle_signee', regle: 'PRIO-1', shaPerimetre: SHA_PERIMETRE },
      { nature: 'regle_signee', regle: 'PRIO-2', shaPerimetre: SHA_PERIMETRE },
    ]);
  });

  it('écarte un candidat sans libellé plutôt que d’en fabriquer un', () => {
    const propositions = assemblerPropositions(
      entrees({
        candidats: [
          { regle: 'PRIO-A', texte: '  ' },
          { regle: 'PRIO-B', texte: 'Règle B' },
        ],
      }),
    );
    expect(propositions).toHaveLength(1);
    expect(propositions[0].fragments[0].texte).toBe('Règle B');
  });

  it('se passe de plainte et d’anamnèse sans rien inventer', () => {
    const propositions = assemblerPropositions(entrees({ plainte: null, anamnese: null }));
    expect(propositions).toHaveLength(1);
    expect(propositions[0].fragments.map((f) => f.source.nature)).toEqual(['regle_signee']);
  });

  it('n’expose ni rang, ni position, ni numérotation', () => {
    const propositions = assemblerPropositions(entrees({
      candidats: [
        { regle: 'PRIO-A', texte: 'A' },
        { regle: 'PRIO-B', texte: 'B' },
      ],
    }));
    // `D-094` §3 interdit jusqu'à la numérotation. La forme rendue ne porte
    // que deux clés, et aucune n'ordonne.
    for (const proposition of propositions) {
      expect(Object.keys(proposition).sort()).toEqual(['fragments', 'hashSources']);
    }
  });
});

// ── La caducité par empreinte ───────────────────────────────────────────────

describe('l’empreinte porte les SOURCES, jamais le texte des fragments', () => {
  it('est déterministe — mêmes entrées, mêmes empreintes', () => {
    expect(assemblerPropositions(entrees()).map((p) => p.hashSources)).toEqual(
      assemblerPropositions(entrees()).map((p) => p.hashSources),
    );
  });

  it('bouge dès qu’une donnée source bouge', () => {
    const reference = assemblerPropositions(entrees())[0].hashSources;

    const anamneseBougee = assemblerPropositions(
      entrees({ anamnese: { ...anamnese(), motifPrincipal: 'Autre chose.' } }),
    )[0].hashSources;
    const plainteBougee = assemblerPropositions(
      entrees({ plainte: { instrument: 'Q_MOD_03', domaine: 'digestion', restitution: 'Publiée' } }),
    )[0].hashSources;
    const shaBouge = assemblerPropositions(entrees({ shaPerimetre: 'b'.repeat(64) }))[0].hashSources;
    const regleBougee = assemblerPropositions(
      entrees({ candidats: [{ regle: 'PRIO-AUTRE', texte: 'Explorer le sommeil' }] }),
    )[0].hashSources;

    expect(new Set([reference, anamneseBougee, plainteBougee, shaBouge, regleBougee]).size).toBe(5);
  });

  it('NE BOUGE PAS quand seul le LIBELLÉ du candidat change', () => {
    // LE POINT DE L'ARBITRAGE 2. Le texte d'un fragment peut être reformulé
    // en aval ; les données sources, elles, n'ont pas bougé. Hacher le texte
    // rendrait caduque une proposition que rien n'a périmée.
    const reference = assemblerPropositions(entrees())[0];
    const reformule = assemblerPropositions(
      entrees({ candidats: [{ regle: 'PRIO-SOM-01', texte: 'Explorer le sommeil, autrement dit' }] }),
    )[0];
    expect(reformule.hashSources).toBe(reference.hashSources);
    // Et pourtant le fragment, lui, a bien changé — sinon ce cas serait creux.
    expect(reformule.fragments[0].texte).not.toBe(reference.fragments[0].texte);
  });

  it('donne une empreinte DIFFÉRENTE à chaque candidat du même assemblage', () => {
    const propositions = assemblerPropositions(
      entrees({
        candidats: [
          { regle: 'PRIO-A', texte: 'A' },
          { regle: 'PRIO-B', texte: 'B' },
        ],
      }),
    );
    expect(new Set(propositions.map((p) => p.hashSources)).size).toBe(2);
  });
});

// ── La disposition (arbitrages 3 et 4) ──────────────────────────────────────

const disposition = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  praticienEmail: 'praticien@wellneuro.fr',
  idProposition: 'PROP_1',
  geste: 'ecartee',
  motif: 'Le patient a déjà tranché autrement.',
  ...partiel,
});

describe('preparerDisposition — refus nommé, jamais accommodement (arbitrage 3)', () => {
  it('accepte un écart motivé', () => {
    const preparation = preparerDisposition(disposition());
    expect(preparation).toEqual({
      ok: true,
      donnees: {
        idPatient: 'PAT_TEST',
        idProposition: 'PROP_1',
        praticienEmail: 'praticien@wellneuro.fr',
        geste: 'ecartee',
        motif: 'Le patient a déjà tranché autrement.',
      },
    });
  });

  it('REFUSE un écart sans motif — le motif est le matériau du bilan LOT-06', () => {
    expect(preparerDisposition(disposition({ motif: null }))).toEqual({
      ok: false,
      raison: 'motif_absent',
    });
    // Un motif fait d'espaces n'est pas un motif.
    expect(preparerDisposition(disposition({ motif: '   ' }))).toEqual({
      ok: false,
      raison: 'motif_absent',
    });
  });

  it('REFUSE un motif sur une reprise, au lieu de le normaliser en silence', () => {
    // L'ARBITRAGE 3 LUI-MÊME. Absorber ce champ couvrirait un écran qui envoie
    // ce qu'il ne devrait pas : c'est un bug à voir, pas à rattraper.
    expect(preparerDisposition(disposition({ geste: 'reprise', motif: 'quelque chose' }))).toEqual({
      ok: false,
      raison: 'motif_sur_reprise',
    });
  });

  it('accepte une reprise sans motif, et n’en invente pas', () => {
    const preparation = preparerDisposition(disposition({ geste: 'reprise', motif: null }));
    expect(preparation.ok && preparation.donnees.motif).toBeNull();
    // `''` est traité comme absent, pas comme un motif vide déposé en base.
    expect(preparerDisposition(disposition({ geste: 'reprise', motif: '' })).ok).toBe(true);
  });

  it('refuse par troncature jamais, par refus toujours', () => {
    const trop = 'x'.repeat(LONGUEUR_MAX_MOTIF_ECART + 1);
    expect(preparerDisposition(disposition({ motif: trop }))).toEqual({
      ok: false,
      raison: 'motif_trop_long',
    });
    // La borne elle-même passe : elle borne, elle n'exclut pas.
    expect(preparerDisposition(disposition({ motif: 'x'.repeat(LONGUEUR_MAX_MOTIF_ECART) })).ok).toBe(true);
  });

  it('refuse une proposition absente et un geste hors taxonomie', () => {
    expect(preparerDisposition(disposition({ idProposition: '  ' }))).toEqual({
      ok: false,
      raison: 'proposition_absente',
    });
    expect(preparerDisposition(disposition({ geste: 'caduque' }))).toEqual({
      ok: false,
      raison: 'geste_invalide',
    });
  });
});

const ligneDisposition = (partiel: Record<string, unknown> = {}) => ({
  id: 'DIS_1',
  idProposition: 'PROP_1',
  geste: 'reprise',
  creeLe: new Date('2026-08-22T09:00:00.000Z'),
  ...partiel,
});

describe('dispositionCourante — le dernier geste gagne (arbitrage 4)', () => {
  it('rend `null` quand rien n’a été posé — c’est une attente, pas un refus', () => {
    // `DC-24` : une donnée absente n'est ni zéro ni une réponse.
    expect(dispositionCourante('PROP_1', [])).toBeNull();
    expect(dispositionCourante('PROP_1', [ligneDisposition({ idProposition: 'PROP_AUTRE' })])).toBeNull();
  });

  it('rend le geste le plus récent, jamais une majorité', () => {
    const lignes = [
      ligneDisposition({ id: 'D1', geste: 'reprise', creeLe: new Date('2026-08-22T09:00:00.000Z') }),
      ligneDisposition({ id: 'D2', geste: 'reprise', creeLe: new Date('2026-08-22T10:00:00.000Z') }),
      ligneDisposition({ id: 'D3', geste: 'ecartee', creeLe: new Date('2026-08-22T11:00:00.000Z') }),
    ];
    // Deux « reprise » contre une « ecartee » : compter les lignes ferait
    // gagner la reprise et effacerait le changement d'avis (`DC-30`).
    expect(dispositionCourante('PROP_1', lignes)).toBe('ecartee');
  });

  it('départage les ex aequo par l’identifiant, comme `etatRatification`', () => {
    const memeInstant = new Date('2026-08-22T09:00:00.000Z');
    const lignes = [
      ligneDisposition({ id: 'D_A', geste: 'reprise', creeLe: memeInstant }),
      ligneDisposition({ id: 'D_B', geste: 'ecartee', creeLe: memeInstant }),
    ];
    expect(dispositionCourante('PROP_1', lignes)).toBe('ecartee');
    // Déterministe : l'ordre d'entrée ne change rien.
    expect(dispositionCourante('PROP_1', [...lignes].reverse())).toBe('ecartee');
  });

  it('tait un geste hors taxonomie plutôt que de le lire', () => {
    expect(dispositionCourante('PROP_1', [ligneDisposition({ geste: 'caduque' })])).toBeNull();
  });
});

// ── La caducité et le plafond de service (arbitrage 5) ──────────────────────

const ligneProposition = (partiel: Record<string, unknown> = {}) => ({
  id: 'PROP_1',
  hashSources: 'a'.repeat(64),
  assembleeLe: new Date('2026-08-22T09:00:00.000Z'),
  creeLe: new Date('2026-08-22T09:00:00.000Z'),
  ...partiel,
});

describe('assembleeCourante — la dernière assemblée, tout le reste est caduc', () => {
  it('ne garde que les lignes du `assembleeLe` le plus récent', () => {
    const ancienne = new Date('2026-08-21T09:00:00.000Z');
    const recente = new Date('2026-08-22T09:00:00.000Z');
    const lignes = [
      ligneProposition({ id: 'VIEILLE_A', assembleeLe: ancienne }),
      ligneProposition({ id: 'NEUVE_A', assembleeLe: recente }),
      ligneProposition({ id: 'NEUVE_B', assembleeLe: recente }),
      ligneProposition({ id: 'VIEILLE_B', assembleeLe: ancienne }),
    ];
    expect(assembleeCourante(lignes).map((l) => l.id)).toEqual(['NEUVE_A', 'NEUVE_B']);
  });

  it('traite une ligne sans `assembleeLe` comme caduque, pas comme courante', () => {
    // Se tromper du côté de la caducité retire une proposition d'un écran ;
    // se tromper de l'autre côté en sert une dont les sources ont bougé.
    expect(assembleeCourante([ligneProposition({ assembleeLe: null })])).toEqual([]);
    const lignes = [
      ligneProposition({ id: 'SANS_DATE', assembleeLe: null }),
      ligneProposition({ id: 'DATEE' }),
    ];
    expect(assembleeCourante(lignes).map((l) => l.id)).toEqual(['DATEE']);
  });

  it('rend une liste vide sur un dossier vide', () => {
    expect(assembleeCourante([])).toEqual([]);
  });
});

describe('propositionsVivantes — au plus trois, non caduques et non disposées', () => {
  it('écarte les propositions déjà disposées', () => {
    const lignes = [ligneProposition({ id: 'PROP_1' }), ligneProposition({ id: 'PROP_2' })];
    const dispositions = [ligneDisposition({ idProposition: 'PROP_1', geste: 'ecartee' })];
    expect(propositionsVivantes(lignes, dispositions).map((l) => l.id)).toEqual(['PROP_2']);
  });

  it('TIENT LE PLAFOND AU SERVICE, même si le stock déborde', () => {
    // ARBITRAGE 5 : aucun index ne peut tenir ce plafond, et la table est
    // append-only. Une assemblée de six lignes — qu'un incident, une reprise
    // manuelle ou un futur appelant pourrait produire — ne doit jamais faire
    // servir plus de trois propositions.
    const lignes = Array.from({ length: 6 }, (_, i) => ligneProposition({ id: `PROP_${i}` }));
    expect(propositionsVivantes(lignes, [])).toHaveLength(MAX_PROPOSITIONS);
  });

  it('rend une liste vide quand tout est disposé', () => {
    const lignes = [ligneProposition({ id: 'PROP_1' })];
    const dispositions = [ligneDisposition({ idProposition: 'PROP_1', geste: 'reprise' })];
    expect(propositionsVivantes(lignes, dispositions)).toEqual([]);
  });

  it('une proposition reprise PUIS écartée sort du service — le dernier geste tranche', () => {
    // Elle reste reprise EN FAIT (l'objectif négocié existe) : c'est l'écran
    // qui affiche la trajectoire, pas cette lecture.
    const lignes = [ligneProposition({ id: 'PROP_1' })];
    const dispositions = [
      ligneDisposition({ id: 'D1', geste: 'reprise', creeLe: new Date('2026-08-22T09:00:00.000Z') }),
      ligneDisposition({ id: 'D2', geste: 'ecartee', creeLe: new Date('2026-08-22T10:00:00.000Z') }),
    ];
    expect(propositionsVivantes(lignes, dispositions)).toEqual([]);
    expect(dispositionCourante('PROP_1', dispositions)).toBe('ecartee');
  });
});
