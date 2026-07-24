import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CheckinReponses, CheckinRow, PointEtape } from './checkinDomain';
import {
  construireTrajectoireIntentions,
  VERSION_TRAJECTOIRE_INTENTIONS,
  type EpisodeTrajectoireInput,
  type ProtocolActionInput,
} from './trajectoireIntentions';

const ref = {
  ingredientId: 'ING_MAGNESIUM',
  ruleId: 'RULE_SOMMEIL_1',
  ruleVersion: 2,
  productId: 'PROD_42',
  justification: 'sommeil fragmenté',
};

const action = (over: Partial<ProtocolActionInput> = {}): ProtocolActionInput => ({
  actionId: over.actionId ?? 'A1',
  type: over.type ?? 'supplement_exploration',
  title: over.title ?? 'Complément à explorer',
  supplementCatalogRef: over.supplementCatalogRef,
});

const reponses = (partiel: Partial<CheckinReponses> = {}): CheckinReponses => ({
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'stable',
  ...partiel,
});

const checkin = (
  id: string,
  pointEtape: PointEtape,
  soumisLe: string,
  partiel: Partial<CheckinReponses> = {},
): CheckinRow => ({
  id,
  idPatient: 'PAT_SEED_01',
  idAssignation: 'ASG_1',
  protocolDraftId: 'DRAFT_1',
  pointEtape,
  reponses: reponses(partiel),
  canal: 'portail',
  supersedesCheckinId: null,
  soumisLe,
});

describe('construireTrajectoireIntentions — juxtaposition, jamais de causalité', () => {
  it('inscrit dans la donnée : aucune causalité, aucun coefficient', () => {
    const t = construireTrajectoireIntentions({ actions: [], episodes: [], checkins: [] });
    expect(t.version).toBe(VERSION_TRAJECTOIRE_INTENTIONS);
    expect(t.causalite).toBe('aucune');
    expect(t.coefficients).toBe('aucun');
    expect(t.intentions).toEqual([]);
    expect(t.episodes).toEqual([]);
    expect(t.pointsCheckin).toEqual([]);
    // La météo réutilisée reste l’agrégat existant : indéterminée sans check-in.
    expect(t.meteoAdhesion.etat).toBe('indeterminee');
  });

  it('bande intentions : matérialisation compléments détectée, référence OPAQUE', () => {
    const t = construireTrajectoireIntentions({
      actions: [
        action({ actionId: 'A_mat', supplementCatalogRef: ref }),
        action({ actionId: 'A_intention', supplementCatalogRef: undefined }),
        action({ actionId: 'A_food', type: 'food', title: 'Assiette du soir' }),
      ],
      episodes: [],
      checkins: [],
    });
    const materialisee = t.intentions.find((i) => i.actionId === 'A_mat')!;
    expect(materialisee.materialiseeComplement).toBe(true);
    expect(materialisee.referenceCatalogue).toEqual({
      ingredientId: 'ING_MAGNESIUM',
      ruleId: 'RULE_SOMMEIL_1',
      ruleVersion: 2,
      productId: 'PROD_42',
    });

    const intention = t.intentions.find((i) => i.actionId === 'A_intention')!;
    expect(intention.materialiseeComplement).toBe(false);
    expect(intention.referenceCatalogue).toBeNull();

    const food = t.intentions.find((i) => i.actionId === 'A_food')!;
    expect(food.materialiseeComplement).toBe(false);
    expect(food.referenceCatalogue).toBeNull();
  });

  it('la référence n’expose JAMAIS produit/forme/dose/marque — seulement les ids gouvernés', () => {
    const t = construireTrajectoireIntentions({
      actions: [action({ supplementCatalogRef: ref })],
      episodes: [],
      checkins: [],
    });
    const keys = Object.keys(t.intentions[0].referenceCatalogue!).sort();
    expect(keys).toEqual(['ingredientId', 'productId', 'ruleId', 'ruleVersion']);
    for (const interdit of ['product', 'produit', 'form', 'forme', 'dose', 'brand', 'marque']) {
      expect(keys).not.toContain(interdit);
    }
  });

  it('bande épisodes : ordonnée par date, statut conservé, proposé daté à targetAt', () => {
    const episodes: EpisodeTrajectoireInput[] = [
      { milestone: 'J42', status: 'proposed', targetAt: '2026-03-01T00:00:00.000Z' },
      { milestone: 'T0', status: 'confirmed', targetAt: '2026-01-01T00:00:00.000Z', confirmedAt: '2026-01-02T00:00:00.000Z' },
      { milestone: 'J21', status: 'confirmed', targetAt: '2026-01-22T00:00:00.000Z', confirmedAt: '2026-01-23T00:00:00.000Z' },
    ];
    const t = construireTrajectoireIntentions({ actions: [], episodes, checkins: [] });
    expect(t.episodes.map((e) => e.milestone)).toEqual(['T0', 'J21', 'J42']);
    expect(t.episodes[0]).toEqual({ milestone: 'T0', statut: 'confirmed', date: '2026-01-02T00:00:00.000Z' });
    // Épisode proposé : sa date théorique (targetAt), jamais devinée.
    expect(t.episodes[2]).toEqual({ milestone: 'J42', statut: 'proposed', date: '2026-03-01T00:00:00.000Z' });
  });

  it('bande observance : faits rapportés verbatim par point, jamais un état agrégé par point', () => {
    const t = construireTrajectoireIntentions({
      actions: [],
      episodes: [],
      checkins: [
        checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', {
          adhesion: 'quelques_jours',
          observance_complements: 'quelques_prises',
          observance_complements_motif: 'oubli',
        }),
      ],
    });
    expect(t.pointsCheckin).toHaveLength(1);
    const point = t.pointsCheckin[0];
    // Chaque entrée est purement factuelle : point d’étape, date, faits verbatim.
    expect(Object.keys(point).sort()).toEqual(['date', 'faitsRapportes', 'pointEtape'].sort());
    expect(point.faitsRapportes).toContain('Action principale : « Quelques jours »');
    expect(point.faitsRapportes).toContain('Compléments : « Quelques prises »');
    expect(point.faitsRapportes).toContain('Frein compléments rapporté : « Oubli »');
    // Aucun état/score agrégé n’est produit par point.
    expect(point).not.toHaveProperty('etat');
  });

  it('réutilise l’agrégat météo EXISTANT (pas un nouvel agrégat)', () => {
    const t = construireTrajectoireIntentions({
      actions: [],
      episodes: [],
      checkins: [checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', { adhesion: 'tous_les_jours' })],
    });
    expect(t.meteoAdhesion.etat).toBe('reguliere');
    expect(t.meteoAdhesion.pointEtapeSource).toBe('J14');
  });
});

// Garde-fou structurel : la vue trajectoire est PRATICIEN SEUL. Elle importe le
// module d’adhésion : si une surface patient l’importait, elle tirerait la météo
// avec. Aucune surface patient ne doit référencer ce module, ni la référence
// catalogue matérialisée (`supplementCatalogRef`).
describe('frontière patient : la trajectoire praticien et la matérialisation ne fuitent pas', () => {
  const RACINE = join(__dirname, '..', '..');
  const SURFACES_PATIENT = [
    join(RACINE, 'app', 'api', 'patient'),
    join(RACINE, 'app', 'api', 'portail'),
    join(RACINE, 'app', 'patient'),
    join(RACINE, 'app', 'portail'),
    join(RACINE, 'components', 'patient'),
    join(RACINE, 'components', 'patient-companion'),
  ];

  const fichiers = (dossier: string): string[] => {
    let entrees: string[];
    try {
      entrees = readdirSync(dossier);
    } catch {
      return [];
    }
    return entrees.flatMap((entree) => {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) return fichiers(chemin);
      return /\.tsx?$/.test(entree) ? [chemin] : [];
    });
  };

  it('aucune surface patient n’importe la vue trajectoire ni ne référence supplementCatalogRef', () => {
    const coupables = SURFACES_PATIENT.flatMap(fichiers).filter((chemin) => {
      const source = readFileSync(chemin, 'utf8');
      return (
        /from\s+['"][^'"]*protocol\/trajectoireIntentions['"]/.test(source) ||
        /supplementCatalogRef/.test(source)
      );
    });
    expect(coupables).toEqual([]);
  });
});

// La vue est DÉRIVÉE à la lecture, jamais persistée : le module n’a aucune
// dépendance Prisma ni écriture. (Ce test échoue si un `prisma` s’y glisse.)
describe('non persistée : aucune dépendance Prisma dans le module', () => {
  it('trajectoireIntentions.ts n’importe jamais Prisma', () => {
    const source = readFileSync(join(__dirname, 'trajectoireIntentions.ts'), 'utf8');
    expect(source).not.toMatch(/@\/lib\/prisma|from\s+['"].*prisma/);
    expect(source).not.toMatch(/\bprisma\./);
  });
});
