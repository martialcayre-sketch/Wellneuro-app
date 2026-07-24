import { describe, expect, it } from 'vitest';
import {
  cartesAssignationsEnRetard,
  cartesReprise,
  cartesSignalementsTrust,
  cartesSynthesesAValider,
  construireFil,
  indexCarteImminente,
  resumeFil,
} from './cartes';

// Patients fictifs autorisés uniquement (CLAUDE.md).
const NOMS = new Map([
  ['P-SOPHIE', 'Sophie Nicola'],
  ['P-JENNIFER', 'Jennifer Martin'],
  ['P-MICHEL', 'Michel Dogné'],
]);

const MAINTENANT = new Date('2026-07-15T10:00:00');

describe('cartesSynthesesAValider', () => {
  it('trie par date décroissante et pointe vers la page synthèse', () => {
    const cartes = cartesSynthesesAValider(
      [
        { idSynthese: 'SYN_1', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-10T09:00:00') },
        { idSynthese: 'SYN_2', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') },
      ],
      NOMS,
    );
    expect(cartes.map(c => c.patient)).toEqual(['Jennifer Martin', 'Sophie Nicola']);
    expect(cartes[0].href).toBe('/dashboard/synthese');
    expect(cartes[0].pourquoi).toContain('validation');
  });

  it('agrège les synthèses d’un même patient en une carte « N relectures en attente »', () => {
    const cartes = cartesSynthesesAValider(
      [
        { idSynthese: 'SYN_1', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-10T09:00:00') },
        { idSynthese: 'SYN_2', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-14T09:00:00') },
        { idSynthese: 'SYN_3', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-12T09:00:00') },
      ],
      NOMS,
    );
    expect(cartes).toHaveLength(2);
    expect(cartes[0].patient).toBe('Sophie Nicola');
    expect(cartes[0].titre).toBe('2 relectures en attente');
    expect(cartes[0].nbElements).toBe(2);
    // La date de référence est la synthèse la plus récente du patient.
    expect(cartes[0].pourquoi).toContain('14 juillet');
    expect(cartes[1].titre).toBe('1 relecture en attente');
  });

  it('une nouvelle synthèse change la clé de l’agrégat — la carte écartée revient', () => {
    const avant = cartesSynthesesAValider(
      [{ idSynthese: 'SYN_1', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-10T09:00:00') }],
      NOMS,
    );
    const apres = cartesSynthesesAValider(
      [
        { idSynthese: 'SYN_1', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-10T09:00:00') },
        { idSynthese: 'SYN_2', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-15T09:00:00') },
      ],
      NOMS,
    );
    expect(apres[0].cle).not.toBe(avant[0].cle);
    // Sans fait nouveau, la clé ne bouge pas : le refus persiste.
    const relecture = cartesSynthesesAValider(
      [{ idSynthese: 'SYN_1', idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-10T09:00:00') }],
      NOMS,
    );
    expect(relecture[0].cle).toBe(avant[0].cle);
  });
});

describe('resumeFil', () => {
  it('résume par type dans l’ordre du Fil, en comptant les lignes sources des agrégats', () => {
    const fil = construireFil({
      signalements: [{ id: 'SIG_1', idPatient: 'P-MICHEL', kind: 'demande_droit', soumisLe: new Date('2026-07-15T09:00:00') }],
      syntheses: [
        { idSynthese: 'SYN_1', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-13T09:00:00') },
        { idSynthese: 'SYN_2', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') },
      ],
      assignations: [
        { idAssignation: 'ASG_1', idPatient: 'P-MICHEL', titre: 'Mode de vie', dateLimite: '2026-07-01', statut: 'En attente' },
      ],
      activites: [],
      noms: NOMS,
      maintenant: MAINTENANT,
    });
    // 2 synthèses agrégées en 1 carte : le résumé compte bien 2 relectures.
    expect(resumeFil(fil)).toBe('1 signalement · 2 relectures · 1 retard');
  });

  it('rend une chaîne vide pour un fil vide', () => {
    expect(resumeFil([])).toBe('');
  });
});

describe('indexCarteImminente', () => {
  it('désigne la tête du Fil, ou rien si le Fil est vide', () => {
    const fil = construireFil({
      syntheses: [{ idSynthese: 'SYN_1', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') }],
      assignations: [],
      activites: [],
      noms: NOMS,
      maintenant: MAINTENANT,
    });
    expect(indexCarteImminente(fil)).toBe(0);
    expect(indexCarteImminente([])).toBe(-1);
  });
});

describe('cartesAssignationsEnRetard', () => {
  it('ne retient que les assignations non complétées dont la limite est dépassée', () => {
    const cartes = cartesAssignationsEnRetard(
      [
        { idAssignation: 'ASG_1', idPatient: 'P-MICHEL', titre: 'Mode de vie SIIN', dateLimite: '2026-07-10', statut: 'En attente' },
        { idAssignation: 'ASG_2', idPatient: 'P-SOPHIE', titre: 'Plaintes', dateLimite: '2026-07-10', statut: 'Complété' },
        { idAssignation: 'ASG_3', idPatient: 'P-JENNIFER', titre: 'Alimentaire', dateLimite: '2026-07-20', statut: 'En attente' },
        { idAssignation: 'ASG_4', idPatient: 'P-JENNIFER', titre: 'DNSM', dateLimite: null, statut: 'En attente' },
      ],
      NOMS,
      MAINTENANT,
    );
    expect(cartes).toHaveLength(1);
    expect(cartes[0].patient).toBe('Michel Dogné');
    expect(cartes[0].pourquoi).toContain('5 jours');
    expect(cartes[0].href).toBe('/dashboard/patients/P-MICHEL');
  });

  it('ignore les dates limites invalides', () => {
    const cartes = cartesAssignationsEnRetard(
      [{ idAssignation: 'ASG_5', idPatient: 'P-MICHEL', titre: 'Q', dateLimite: 'hier', statut: 'En attente' }],
      NOMS,
      MAINTENANT,
    );
    expect(cartes).toHaveLength(0);
  });
});

describe('cartesReprise', () => {
  it('signale les patients inactifs depuis plus de six mois, sans pack', () => {
    const cartes = cartesReprise(
      [
        { idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-09-01T08:00:00') },
        { idPatient: 'P-JENNIFER', derniereReponse: new Date('2026-07-01T08:00:00') },
      ],
      NOMS,
      MAINTENANT,
    );
    expect(cartes).toHaveLength(1);
    expect(cartes[0].patient).toBe('Sophie Nicola');
    expect(cartes[0].pourquoi).toContain('mois');
    expect(cartes[0].actionLabel).toBe('Ouvrir la fiche');
  });
});

describe('cartesSignalementsTrust', () => {
  it('mène vers la page Confiance & droits avec le bon libellé', () => {
    const cartes = cartesSignalementsTrust(
      [{ id: 'SIG_1', idPatient: 'P-JENNIFER', kind: 'effet_indesirable', soumisLe: new Date('2026-07-15T09:00:00') }],
      NOMS,
    );
    expect(cartes).toHaveLength(1);
    expect(cartes[0].titre).toBe('Effet indésirable suspecté');
    expect(cartes[0].href).toBe('/dashboard/droits');
    expect(cartes[0].patient).toBe('Jennifer Martin');
  });
});

describe('construireFil', () => {
  it('place les signalements en tête du Fil', () => {
    const fil = construireFil({
      signalements: [{ id: 'SIG_2', idPatient: 'P-MICHEL', kind: 'demande_droit', soumisLe: new Date('2026-07-15T09:00:00') }],
      syntheses: [{ idSynthese: 'SYN_2', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') }],
      assignations: [],
      activites: [],
      noms: NOMS,
      maintenant: MAINTENANT,
    });
    expect(fil.map(c => c.type)).toEqual(['signalement_trust', 'synthese_a_valider']);
  });

  it('ordonne le Fil : synthèses, retards, reprises (les réponses reçues sont passées à l’inbox)', () => {
    const fil = construireFil({
      syntheses: [{ idSynthese: 'SYN_2', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') }],
      assignations: [
        { idAssignation: 'ASG_6', idPatient: 'P-MICHEL', titre: 'Mode de vie', dateLimite: '2026-07-01', statut: 'En attente' },
      ],
      activites: [{ idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-08-01T08:00:00') }],
      noms: NOMS,
      maintenant: MAINTENANT,
    });
    expect(fil.map(c => c.type)).toEqual([
      'synthese_a_valider',
      'assignation_en_retard',
      'reprise',
    ]);
  });
});

// Prérequis de G1 (refus persisté) : sans identité de carte, on ne peut pas
// dire ce qui a été refusé. Ces tests protègent la propriété dont dépendra le
// refus — une clé ancrée sur la ligne source, donc stable dans le temps et
// distincte entre deux cartes jumelles.
describe('identité des cartes (clé)', () => {
  it('deux cartes de même type, même patient et même instant restent distinctes', () => {
    const memeInstant = new Date('2026-07-14T08:00:00');
    const cartes = cartesSignalementsTrust(
      [
        { id: 'SIG_A', idPatient: 'P-SOPHIE', kind: 'effet_indesirable', soumisLe: memeInstant },
        { id: 'SIG_B', idPatient: 'P-SOPHIE', kind: 'effet_indesirable', soumisLe: memeInstant },
      ],
      NOMS,
    );
    // C'est exactement ce qu'une clé « type + patient + date » aurait confondu.
    expect(new Set(cartes.map(c => c.cle)).size).toBe(2);
  });

  it('la clé ne bouge pas d’une ouverture du Fil à l’autre', () => {
    const entree = {
      syntheses: [{ idSynthese: 'SYN_9', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') }],
      assignations: [
        { idAssignation: 'ASG_9', idPatient: 'P-MICHEL', titre: 'Mode de vie', dateLimite: '2026-07-01', statut: 'En attente' },
      ],
      activites: [{ idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-08-01T08:00:00') }],
      noms: NOMS,
      maintenant: MAINTENANT,
    };

    const matin = construireFil(entree);
    // Le lendemain : mêmes données sources, Fil rouvert. Un refus déposé la
    // veille doit encore désigner les mêmes cartes.
    const lendemain = construireFil({ ...entree, maintenant: new Date('2026-07-16T10:00:00') });

    expect(lendemain.map(c => c.cle)).toEqual(matin.map(c => c.cle));
  });

  it('toute carte du Fil porte une clé non vide, préfixée par son type', () => {
    const fil = construireFil({
      signalements: [{ id: 'SIG_9', idPatient: 'P-MICHEL', kind: 'demande_droit', soumisLe: new Date('2026-07-15T09:00:00') }],
      syntheses: [{ idSynthese: 'SYN_9', idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') }],
      assignations: [
        { idAssignation: 'ASG_9', idPatient: 'P-MICHEL', titre: 'Mode de vie', dateLimite: '2026-07-01', statut: 'En attente' },
      ],
      activites: [{ idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-08-01T08:00:00') }],
      noms: NOMS,
      maintenant: MAINTENANT,
    });

    expect(fil).toHaveLength(4);
    for (const carte of fil) {
      expect(carte.cle.startsWith(`${carte.type}:`)).toBe(true);
      expect(carte.cle.length).toBeGreaterThan(carte.type.length + 1);
    }
    expect(new Set(fil.map(c => c.cle)).size).toBe(fil.length);
  });

  it('la carte agrégée `reprise` garde sa clé tant que le patient reste inactif', () => {
    const activites = [{ idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-09-01T08:00:00') }];
    const juillet = cartesReprise(activites, NOMS, MAINTENANT);
    const aout = cartesReprise(activites, NOMS, new Date('2026-08-15T10:00:00'));

    // Le « il y a N mois » change, la clé non : c'est la date de référence qui
    // l'ancre, pas l'ancienneté calculée.
    expect(aout[0].pourquoi).not.toBe(juillet[0].pourquoi);
    expect(aout[0].cle).toBe(juillet[0].cle);
  });
});
