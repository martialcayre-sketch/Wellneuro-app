import { describe, expect, it } from 'vitest';
import {
  blocsPourDestinataire,
  construireBloc,
  contenuPourDestinataire,
  estBlocDiffusable,
  type ConstruireBlocInput,
} from './bloc';

function blocStatique(overrides: Partial<ConstruireBlocInput> = {}): ConstruireBlocInput {
  return {
    id: 'b_narratif',
    type: 'narratif',
    regime: 'statique_valide',
    provenance: { source: 'c1_decision', ancrageHash: 'h_dec_1', version: 'c1-decision-v1' },
    contenu: { praticien: 'Résumé praticien', patient: 'Ce que vos réponses suggèrent' },
    ...overrides,
  };
}

function blocIA(statut: ConstruireBlocInput['provenance']['statutSource']): ConstruireBlocInput {
  return {
    id: 'b_ia',
    type: 'narratif',
    regime: 'genere_ia',
    provenance: {
      source: 'synthese_ia',
      ancrageHash: 'synthese-v3#2026-07-18',
      version: 'synthese-v3',
      statutSource: statut,
    },
    contenu: { praticien: 'Narratif IA', patient: 'Narratif patient' },
  };
}

describe('construireBloc', () => {
  it('conserve la provenance et le contenu', () => {
    const bloc = construireBloc(blocStatique());
    expect(bloc.provenance.ancrageHash).toBe('h_dec_1');
    expect(bloc.provenance.version).toBe('c1-decision-v1');
    expect(bloc.contenu.patient).toBe('Ce que vos réponses suggèrent');
  });

  it('refuse une provenance sans ancrage (frontière A2)', () => {
    expect(() =>
      construireBloc(blocStatique({ provenance: { source: 'c1_decision', ancrageHash: '', version: 'v1' } })),
    ).toThrow(/ancrage/);
  });

  it('refuse un contenu praticien vide', () => {
    expect(() => construireBloc(blocStatique({ contenu: { praticien: '' } }))).toThrow(/praticien/);
  });

  it('refuse un bloc généré IA sans statut de synthèse source', () => {
    expect(() =>
      construireBloc({
        ...blocIA('Validee_Praticien'),
        provenance: { source: 'synthese_ia', ancrageHash: 'h', version: 'synthese-v3' },
      }),
    ).toThrow(/statut/);
  });
});

describe('estBlocDiffusable — garde de régime', () => {
  it('diffuse toujours un bloc statique validé', () => {
    expect(estBlocDiffusable(construireBloc(blocStatique()))).toBe(true);
  });

  it('diffuse un bloc IA validé praticien', () => {
    expect(estBlocDiffusable(construireBloc(blocIA('Validee_Praticien')))).toBe(true);
    expect(estBlocDiffusable(construireBloc(blocIA('Corrigee_Praticien')))).toBe(true);
  });

  it('refuse un bloc IA non validé (brouillon / rejeté)', () => {
    expect(estBlocDiffusable(construireBloc(blocIA('Brouillon_IA')))).toBe(false);
    expect(estBlocDiffusable(construireBloc(blocIA('Rejetee')))).toBe(false);
  });
});

describe('contenuPourDestinataire — field-filter', () => {
  it('donne le champ dédié, jamais le champ praticien pour le patient', () => {
    const bloc = construireBloc(blocStatique());
    expect(contenuPourDestinataire(bloc, 'praticien')).toBe('Résumé praticien');
    expect(contenuPourDestinataire(bloc, 'patient')).toBe('Ce que vos réponses suggèrent');
  });

  it('retourne null quand le bloc n’est pas destiné à ce destinataire', () => {
    const bloc = construireBloc(blocStatique({ contenu: { praticien: 'interne' } }));
    expect(contenuPourDestinataire(bloc, 'patient')).toBeNull();
    expect(contenuPourDestinataire(bloc, 'medecin')).toBeNull();
  });
});

describe('blocsPourDestinataire', () => {
  it('exclut les blocs IA non validés et ceux sans contenu pour le destinataire', () => {
    const blocs = [
      construireBloc(blocStatique({ id: 'ok', contenu: { praticien: 'p', patient: 'vu' } })),
      construireBloc(blocStatique({ id: 'interne', contenu: { praticien: 'p' } })),
      construireBloc(blocIA('Brouillon_IA')),
    ];
    const patient = blocsPourDestinataire(blocs, 'patient');
    expect(patient.map((b) => b.id)).toEqual(['ok']);
  });
});
