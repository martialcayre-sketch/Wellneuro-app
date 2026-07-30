import { describe, expect, it } from 'vitest';
import {
  decalerDate,
  dureeMinutes,
  ensureJourReponses,
  estDateSaisissable,
  estDateValide,
  fenetrePlausible,
  fenetreAlimentaire,
  minutesDepuisAncre,
  resolveJoursActifs,
} from './jour';
import type { JourRow } from './types';

const JOUR_VALIDE = {
  prises: [
    { heure: '07:30', nature: 'repas' },
    { heure: '12:30', nature: 'repas' },
    { heure: '16:00', nature: 'hors_repas' },
    { heure: '20:00', nature: 'repas' },
  ],
  premierePriseProteines: true,
  legumesDeuxPrises: true,
  fruitsOuOleagineux: false,
  ultraTransformes: false,
};

describe('minutesDepuisAncre — l’ancre de 04:00', () => {
  it('place une prise nocturne APRÈS celles de la veille au soir', () => {
    // 23:45 puis 00:15 : une demi-heure d'écart, pas douze.
    expect(minutesDepuisAncre('00:15') - minutesDepuisAncre('23:45')).toBe(30);
  });

  it('ancre 04:00 à zéro', () => {
    expect(minutesDepuisAncre('04:00')).toBe(0);
    expect(minutesDepuisAncre('05:00')).toBe(60);
    expect(minutesDepuisAncre('03:45')).toBe(1425);
  });

  it('dureeMinutes traverse minuit', () => {
    expect(dureeMinutes('21:00', '07:00')).toBe(600);
    expect(dureeMinutes('07:00', '21:00')).toBe(840);
  });
});

describe('estDateValide / decalerDate', () => {
  it('refuse une date impossible', () => {
    expect(estDateValide('2026-13-40')).toBe(false);
    expect(estDateValide('30/07/2026')).toBe(false);
    expect(estDateValide('2026-07-30')).toBe(true);
  });

  it('franchit les bornes de mois et d’année', () => {
    expect(decalerDate('2026-07-31', 1)).toBe('2026-08-01');
    expect(decalerDate('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('estDateSaisissable — aujourd’hui ou la veille, et rien d’autre', () => {
  it('accepte le jour même et la veille', () => {
    expect(estDateSaisissable('2026-07-30', '2026-07-30')).toBe(true);
    expect(estDateSaisissable('2026-07-29', '2026-07-30')).toBe(true);
  });

  // Au-delà de 24 h, un rappel alimentaire est une reconstruction de mémoire.
  it('refuse l’avant-veille — le trou est assumé, jamais rattrapé', () => {
    expect(estDateSaisissable('2026-07-28', '2026-07-30')).toBe(false);
  });

  it('refuse une date future', () => {
    expect(estDateSaisissable('2026-07-31', '2026-07-30')).toBe(false);
  });
});

describe('ensureJourReponses — écriture', () => {
  const ecrire = (v: unknown) => ensureJourReponses(v, { exigerObligatoires: true });

  it('accepte une journée complète', () => {
    const out = ecrire(JOUR_VALIDE);
    expect(out.prises).toHaveLength(4);
    expect(out.premierePriseProteines).toBe(true);
    expect(out.ultraTransformes).toBe(false);
  });

  it('exige les trois présences ENSEMBLE', () => {
    const { ultraTransformes: _omis, ...partiel } = JOUR_VALIDE;
    expect(() => ecrire(partiel)).toThrow(/ultra-transformés/);
  });

  // Sans cette obligation, ne pas répondre vaudrait mieux que répondre « non ».
  it('exige les protéines de la première prise', () => {
    const { premierePriseProteines: _omis, ...sansProt } = JOUR_VALIDE;
    expect(() => ecrire(sansProt)).toThrow(/protéines/);
  });

  it('refuse un ordre de prises non strictement croissant', () => {
    expect(() =>
      ecrire({
        ...JOUR_VALIDE,
        prises: [
          { heure: '12:30', nature: 'repas' },
          { heure: '07:30', nature: 'repas' },
        ],
      }),
    ).toThrow(/ordre/);
  });

  it('refuse deux prises à la même heure', () => {
    expect(() =>
      ecrire({
        ...JOUR_VALIDE,
        prises: [
          { heure: '12:30', nature: 'repas' },
          { heure: '12:30', nature: 'hors_repas' },
        ],
      }),
    ).toThrow(/doublon/);
  });

  it('refuse une heure hors du pas de 15 minutes', () => {
    expect(() =>
      ecrire({ ...JOUR_VALIDE, prises: [{ heure: '07:37', nature: 'repas' }] }),
    ).toThrow(/Heure invalide/);
  });

  it('refuse une nature hors registre', () => {
    expect(() =>
      ecrire({ ...JOUR_VALIDE, prises: [{ heure: '07:30', nature: 'collation' }] }),
    ).toThrow(/Nature invalide/);
  });

  it('refuse une journée vide qui ne se déclare pas sans prise', () => {
    expect(() => ecrire({ prises: [] })).toThrow(/au moins une prise/);
  });

  it('refuse plus de dix prises', () => {
    const prises = Array.from({ length: 11 }, (_, i) => ({
      heure: `${String(6 + i).padStart(2, '0')}:00`,
      nature: 'hors_repas' as const,
    }));
    expect(() => ecrire({ ...JOUR_VALIDE, prises })).toThrow(/Au plus 10/);
  });
});

describe('ensureJourReponses — la journée sans prise est une réponse', () => {
  const ecrire = (v: unknown) => ensureJourReponses(v, { exigerObligatoires: true });

  it('accepte « aucune prise » seule', () => {
    const out = ecrire({ aucunePrise: true });
    expect(out.aucunePrise).toBe(true);
    expect(out.prises).toBeUndefined();
    // Elle n'exige AUCUN des champs obligatoires : il n'y a rien à décrire.
    expect(out.premierePriseProteines).toBeUndefined();
  });

  it('refuse « aucune prise » assortie de prises', () => {
    expect(() =>
      ecrire({ aucunePrise: true, prises: [{ heure: '08:00', nature: 'repas' }] }),
    ).toThrow(/ne peut pas porter de prises/);
  });

  it('refuse « aucune prise » assortie d’une observation de contenu', () => {
    expect(() => ecrire({ aucunePrise: true, legumesDeuxPrises: false })).toThrow(
      /aucune observation de contenu/,
    );
  });
});

describe('ensureJourReponses — lecture', () => {
  // Une ligne écrite sous une version antérieure doit rester relisible : exiger
  // les obligatoires en lecture rendrait l'historique illisible d'un coup.
  it('relit une journée sans les champs obligatoires', () => {
    const out = ensureJourReponses({ prises: [{ heure: '08:00', nature: 'repas' }] });
    expect(out.prises).toHaveLength(1);
    expect(out.legumesDeuxPrises).toBeUndefined();
  });

  it('ignore les clés supplémentaires du JSON stocké', () => {
    const out = ensureJourReponses({
      prises: [{ heure: '08:00', nature: 'repas' }],
      contractVersion: 'agenda-alimentaire-v1',
    });
    expect(out.prises).toHaveLength(1);
  });
});

describe('fenêtre alimentaire et plausibilité', () => {
  it('rend null sur une prise unique — une fenêtre suppose deux bornes', () => {
    expect(fenetreAlimentaire({ prises: [{ heure: '08:00', nature: 'repas' }] })).toBeNull();
    expect(fenetreAlimentaire({ aucunePrise: true })).toBeNull();
  });

  it('mesure première → dernière prise', () => {
    expect(fenetreAlimentaire(JOUR_VALIDE as never)).toBe(750); // 07:30 → 20:00
  });

  it('déclare la fenêtre hors bornes au-delà de 18 h', () => {
    const large = {
      prises: [
        { heure: '05:00', nature: 'repas' as const },
        { heure: '00:30', nature: 'hors_repas' as const },
      ],
    };
    expect(fenetrePlausible(large)).toBe(false);
    expect(fenetrePlausible(JOUR_VALIDE as never)).toBe(true);
  });

  it('ne se prononce pas sur une journée sans prise — il n’y a pas de fenêtre', () => {
    expect(fenetrePlausible({ aucunePrise: true })).toBe(true);
  });
});

describe('resolveJoursActifs — la correction supplante, elle n’écrase pas', () => {
  const ligne = (over: Partial<JourRow>): JourRow => ({
    id: 'L1',
    idPatient: 'PAT_TEST',
    idAssignation: 'ASS_1',
    dateJour: '2026-07-30',
    reponses: { aucunePrise: true },
    canal: 'portail',
    supersedesJourId: null,
    soumisLe: '2026-07-30T08:00:00.000Z',
    ...over,
  });

  it('retient la correction et écarte la ligne supplantée', () => {
    const actifs = resolveJoursActifs([
      ligne({ id: 'L1' }),
      ligne({ id: 'L2', supersedesJourId: 'L1', soumisLe: '2026-07-30T09:00:00.000Z' }),
    ]);
    expect(actifs).toHaveLength(1);
    expect(actifs[0].id).toBe('L2');
  });

  it('garde une ligne par date, triée', () => {
    const actifs = resolveJoursActifs([
      ligne({ id: 'B', dateJour: '2026-07-31' }),
      ligne({ id: 'A', dateJour: '2026-07-30' }),
    ]);
    expect(actifs.map((l) => l.dateJour)).toEqual(['2026-07-30', '2026-07-31']);
  });

  it('à égalité de date sans chaînage, retient la plus récemment soumise', () => {
    const actifs = resolveJoursActifs([
      ligne({ id: 'A', soumisLe: '2026-07-30T08:00:00.000Z' }),
      ligne({ id: 'B', soumisLe: '2026-07-30T10:00:00.000Z' }),
    ]);
    expect(actifs).toHaveLength(1);
    expect(actifs[0].id).toBe('B');
  });
});

// Constats de la revue adversariale du 2026-07-30.
describe('lecture : relire plutôt que lever', () => {
  // Le patron l'écrit noir sur blanc : une règle d'ordre appliquée en lecture
  // ferait lever le GET entier d'un patient sur une seule ligne bancale.
  it('relit et trie une ligne dont les prises sont désordonnées', () => {
    const out = ensureJourReponses({
      prises: [
        { heure: '12:30', nature: 'repas' },
        { heure: '07:30', nature: 'repas' },
      ],
    });
    expect(out.prises?.map((p) => p.heure)).toEqual(['07:30', '12:30']);
  });

  it('relit une ligne portant plus de dix prises', () => {
    const prises = Array.from({ length: 12 }, (_, i) => ({
      heure: `${String(5 + i).padStart(2, '0')}:00`,
      nature: 'hors_repas' as const,
    }));
    expect(ensureJourReponses({ prises }).prises).toHaveLength(12);
  });

  it('relit une ligne panachée sans lever', () => {
    const out = ensureJourReponses({ aucunePrise: true, legumesDeuxPrises: false });
    expect(out.aucunePrise).toBe(true);
  });
});

describe('estDateSaisissable valide ses arguments', () => {
  it('refuse une date impossible ou une non-date', () => {
    expect(estDateSaisissable('2026-02-31', '2026-02-31')).toBe(false);
    expect(estDateSaisissable('pouet', 'pouet')).toBe(false);
    expect(estDateSaisissable('2026-07-30', 'pouet')).toBe(false);
  });
});

describe('resolveJoursActifs — anomalies de chaînage', () => {
  const ligne = (over: Partial<JourRow>): JourRow => ({
    id: 'L1',
    idPatient: 'PAT_TEST',
    idAssignation: 'ASS_1',
    dateJour: '2026-07-30',
    reponses: { aucunePrise: true },
    canal: 'portail',
    supersedesJourId: null,
    soumisLe: '2026-07-30T08:00:00.000Z',
    ...over,
  });

  it('ne fait pas disparaître une date sur un cycle A↔B', () => {
    const actifs = resolveJoursActifs([
      ligne({ id: 'A', supersedesJourId: 'B' }),
      ligne({ id: 'B', supersedesJourId: 'A', soumisLe: '2026-07-30T09:00:00.000Z' }),
    ]);
    // Une anomalie de chaînage ne doit pas se lire comme « rien saisi ce jour-là ».
    expect(actifs).toHaveLength(1);
    expect(actifs[0].id).toBe('B');
  });

  it('n’efface pas une autre date via un supersedes croisé', () => {
    const actifs = resolveJoursActifs([
      ligne({ id: 'HIER', dateJour: '2026-07-29' }),
      ligne({ id: 'AUJ', dateJour: '2026-07-30', supersedesJourId: 'HIER' }),
    ]);
    expect(actifs.map((l) => l.dateJour)).toEqual(['2026-07-29', '2026-07-30']);
  });

  it('départage deux lignes de même horodatage indépendamment de l’ordre reçu', () => {
    const a = ligne({ id: 'A' });
    const b = ligne({ id: 'B' });
    expect(resolveJoursActifs([a, b])[0].id).toBe(resolveJoursActifs([b, a])[0].id);
  });
});

describe('bornes horaires autour de l’ancre', () => {
  it('ordonne 04:00, 23:45, 00:00 et 03:45 dans cet ordre', () => {
    const out = ensureJourReponses(
      {
        prises: [
          { heure: '04:00', nature: 'repas' },
          { heure: '23:45', nature: 'repas' },
          { heure: '00:00', nature: 'hors_repas' },
          { heure: '03:45', nature: 'hors_repas' },
        ],
        premierePriseProteines: true,
        legumesDeuxPrises: true,
        fruitsOuOleagineux: true,
        ultraTransformes: false,
      },
      { exigerObligatoires: true },
    );
    expect(out.prises?.map((p) => p.heure)).toEqual(['04:00', '23:45', '00:00', '03:45']);
    // 04:00 → 03:45 le lendemain matin : 23 h 45, la journée entière.
    expect(fenetreAlimentaire(out)).toBe(1425);
  });
});
