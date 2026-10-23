import { describe, expect, it } from 'vitest';

import type { ProtocolAction } from '@/lib/clinical-engine/types';
import {
  DECLENCHEURS_COMPLEMENT_V1,
  shaPerimetreDeclencheurs,
  type DeclencheursMetadata,
} from './declencheursComplementCibleV1';
import {
  courrierComplementRequis,
  lireEtatCritere,
  type DeclarationEtat,
  type EntreeGardeComplement,
} from './gardeComplementCible';

// Banc de la garde du complément ciblé ([[D-345]], J3-12h, lot 1). La table
// est passée en PARAMÈTRE avec une signature calculée ici : chaque branche
// s'exerce sans dépendre de l'état de signature livré. Fixtures neutres.

const SIGNEE: DeclencheursMetadata = {
  validationExterne: true,
  dateValidation: '2026-10-23T12:00:00.000Z',
  shaPerimetre: shaPerimetreDeclencheurs(DECLENCHEURS_COMPLEMENT_V1),
};

function complement(actionId: string, overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId, type: 'supplement_exploration', title: 'Intention fixture',
    idealPlan: 'Plan idéal fixture.', minimalPlan: 'Plan minimal fixture.',
    rescuePlan: 'Plan secours fixture.', limitations: [], interventionStatus: 'active', ...overrides,
  };
}

const NON_PRATICIEN: DeclarationEtat[] = [
  { critere: 'grossesse', reponse: 'non', source: 'praticien', le: '2026-10-01T09:00:00.000Z' },
  { critere: 'allaitement', reponse: 'non', source: 'praticien', le: '2026-10-01T09:00:00.000Z' },
];

function entree(overrides: Partial<EntreeGardeComplement> = {}): EntreeGardeComplement {
  return {
    actions: [complement('a-1', { natureComplement: 'cible' })],
    statutAge: 'majeur',
    declarations: NON_PRATICIEN,
    accordPartage: 'accorde',
    ...overrides,
  };
}

function verdict(overrides: Partial<EntreeGardeComplement> = {}) {
  return courrierComplementRequis(entree(overrides), DECLENCHEURS_COMPLEMENT_V1, SIGNEE);
}

describe('Garde du complément ciblé — objet gardé', () => {
  it('aucune intention de complément : non requis', () => {
    const observation = { ...complement('o-1'), type: 'observation' as const };
    expect(verdict({ actions: [observation] }).statut).toBe('non_requis');
  });

  it('une intention sans nature se refuse, quel que soit le dossier', () => {
    const v = verdict({ actions: [complement('b-2'), complement('a-1', { natureComplement: 'cible' }), complement('a-0')] });
    expect(v).toMatchObject({ statut: 'nature_requise', actionIds: ['a-0', 'b-2'] });
  });

  it('une nature forgée hors liste vaut absente, jamais multivitaminé', () => {
    expect(verdict({ actions: [complement('a-1', { natureComplement: 'autre' as never })] }).statut)
      .toBe('nature_requise');
  });

  it('seulement des multivitaminés : non requis, même chez un mineur', () => {
    const v = verdict({
      actions: [complement('a-1', { natureComplement: 'multivitamine_vente_libre' })],
      statutAge: 'mineur',
    });
    expect(v.statut).toBe('non_requis');
  });

  it('table non signée : tout complément ciblé se refuse', () => {
    const v = courrierComplementRequis(entree(), DECLENCHEURS_COMPLEMENT_V1, { ...SIGNEE, validationExterne: false });
    expect(v.statut).toBe('table_non_signee');
  });

  it('la table livrée par défaut est jugée par son propre verrou', () => {
    // Sans paramètre, la garde lit la métadonnée livrée : verrou éteint tant que
    // le responsable n'a pas signé, et jamais un « non requis » silencieux.
    expect(['table_non_signee', 'non_requis']).toContain(courrierComplementRequis(entree()).statut);
  });
});

describe('Garde du complément ciblé — âge', () => {
  it('date de naissance manquante : refus', () => {
    expect(verdict({ statutAge: 'date_manquante' }).statut).toBe('date_requise');
  });

  it('mineur : refus, même avec un accord et sans autre déclencheur', () => {
    expect(verdict({ statutAge: 'mineur' }).statut).toBe('mineur');
  });
});

describe('Garde du complément ciblé — déclencheurs et accord', () => {
  it('majeur, « non » du praticien sur les deux critères, sans situation : non requis', () => {
    expect(verdict().statut).toBe('non_requis');
  });

  it('grossesse déclarée : courrier requis, compléments ciblés couverts triés', () => {
    const v = verdict({
      actions: [
        complement('b-1', { natureComplement: 'cible' }),
        complement('a-1', { natureComplement: 'cible' }),
        complement('m-1', { natureComplement: 'multivitamine_vente_libre' }),
      ],
      declarations: [
        ...NON_PRATICIEN,
        { critere: 'grossesse', reponse: 'oui', source: 'anamnese', le: '2026-10-10T09:00:00.000Z' },
      ],
    });
    expect(v).toMatchObject({ statut: 'requis', declencheurs: ['grossesse'], actionIdsCibles: ['a-1', 'b-1'] });
  });

  it('une situation déclarée sur un complément ciblé déclenche', () => {
    const v = verdict({ actions: [complement('a-1', { natureComplement: 'cible', situationsComplement: ['S-MG-2'] })] });
    expect(v).toMatchObject({ statut: 'requis', declencheurs: ['S-MG-2'] });
  });

  it('une situation absente de la table passée se refuse', () => {
    const sansSmg2 = DECLENCHEURS_COMPLEMENT_V1.filter(ligne => ligne.id !== 'S-MG-2');
    // Signée sur son propre sha, la table amputée est refusée par le verrou :
    // la situation inconnue ne peut donc venir que d'un payload forgé.
    const v = courrierComplementRequis(
      entree({ actions: [complement('a-1', { natureComplement: 'cible', situationsComplement: ['S-XX-9' as never] })] }),
      DECLENCHEURS_COMPLEMENT_V1,
      SIGNEE,
    );
    expect(v).toMatchObject({ statut: 'situation_inconnue', actionIds: ['a-1'] });
    expect(courrierComplementRequis(entree(), sansSmg2, {
      ...SIGNEE, shaPerimetre: shaPerimetreDeclencheurs(sansSmg2),
    }).statut).toBe('table_non_signee');
  });

  it('un déclencheur atteint l’emporte sur un critère à établir', () => {
    const v = verdict({
      declarations: [{ critere: 'grossesse', reponse: 'oui', source: 'praticien', le: '2026-10-10T09:00:00.000Z' }],
    });
    expect(v).toMatchObject({ statut: 'requis', declencheurs: ['grossesse'] });
  });

  it.each(['refuse', 'retire', 'jamais_exprime'] as const)(
    'courrier requis sans accord de partage (%s) : refus',
    accordPartage => {
      const v = verdict({
        accordPartage,
        actions: [complement('a-1', { natureComplement: 'cible', situationsComplement: ['S-MG-1'] })],
      });
      expect(v).toMatchObject({ statut: 'accord_requis', accord: accordPartage, declencheurs: ['S-MG-1'] });
    },
  );

  it('sans déclencheur, l’accord n’est pas exigé', () => {
    expect(verdict({ accordPartage: 'jamais_exprime' }).statut).toBe('non_requis');
  });

  it('aucune déclaration : grossesse et allaitement à établir, sans déduction par le sexe', () => {
    expect(verdict({ declarations: [] })).toMatchObject({
      statut: 'etat_a_etablir', criteres: ['allaitement', 'grossesse'],
    });
  });
});

describe('Lecture de Q4 dans le temps', () => {
  const oui = (le: string | null, source: DeclarationEtat['source'] = 'anamnese'): DeclarationEtat =>
    ({ critere: 'grossesse', reponse: 'oui', source, le });
  const non = (le: string | null, source: DeclarationEtat['source'] = 'praticien'): DeclarationEtat =>
    ({ critere: 'grossesse', reponse: 'non', source, le });

  it.each([
    ['un « non » du praticien postérieur lève', [oui('2026-10-01T00:00:00.000Z'), non('2026-10-02T00:00:00.000Z')], 'leve'],
    ['un « non » du praticien antérieur ne lève rien', [non('2026-10-01T00:00:00.000Z'), oui('2026-10-02T00:00:00.000Z')], 'declenche'],
    ['à égalité, le « oui » tient', [oui('2026-10-01T00:00:00.000Z'), non('2026-10-01T00:00:00.000Z')], 'declenche'],
    ['un « non » du patient ne lève pas', [oui('2026-10-01T00:00:00.000Z'), non('2026-10-02T00:00:00.000Z', 'patient')], 'declenche'],
    ['un « non » de l’anamnèse ne lève pas', [non('2026-10-02T00:00:00.000Z', 'anamnese')], 'a_etablir'],
    ['un « oui » non daté déclenche malgré un « non » daté', [oui(null), non('2026-10-02T00:00:00.000Z')], 'declenche'],
    ['un « non » non daté vaut ancien', [oui('2020-01-01T00:00:00.000Z'), non(null)], 'declenche'],
    ['une date illisible vaut non datée', [oui('2020-01-01T00:00:00.000Z'), non('hier')], 'declenche'],
    ['seul, un « non » non daté du praticien lève', [non(null)], 'leve'],
    ['aucune expiration : un « oui » ancien tient', [oui('2019-01-01T00:00:00.000Z')], 'declenche'],
    ['« inconnu » ne déclenche ni ne lève', [{ ...oui('2026-10-01T00:00:00.000Z'), reponse: 'inconnu' as const }], 'a_etablir'],
    ['le dernier « non » compte, pas le premier', [non('2026-09-01T00:00:00.000Z'), oui('2026-09-15T00:00:00.000Z'), non('2026-10-01T00:00:00.000Z')], 'leve'],
  ])('%s', (_cas, declarations, attendu) => {
    expect(lireEtatCritere('grossesse', declarations)).toBe(attendu);
  });

  it('les critères ne se mélangent pas', () => {
    expect(lireEtatCritere('allaitement', [oui('2026-10-01T00:00:00.000Z')])).toBe('a_etablir');
  });
});
