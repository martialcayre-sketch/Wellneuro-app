import { describe, expect, it } from 'vitest';
import {
  deriverRemboursement,
  mentionsRemboursement,
  regimeDocumentaire,
  type ActeCourant,
  type CorrespondanceNabm,
} from './remboursable';

const acte = (over: Partial<ActeCourant> & { codeActe: string }): ActeCourant => ({
  inactif: false,
  ententePrealable: false,
  acteReserve: false,
  remboursementTotal: true,
  ...over,
});

const signee = (
  codeActe: string,
  nature: CorrespondanceNabm['nature'] = 'isole',
): CorrespondanceNabm => ({ codeActe, nature, verifiePar: 'praticien@wellneuro.fr' });

const proposee = (
  codeActe: string,
  nature: CorrespondanceNabm['nature'] = 'isole',
): CorrespondanceNabm => ({ codeActe, nature, verifiePar: null });

describe('deriverRemboursement', () => {
  it('sans aucune correspondance, dit « non évalué » et non « non remboursé »', () => {
    expect(deriverRemboursement([], [acte({ codeActe: '1213' })]).statut).toBe(
      'non_evalue',
    );
  });

  it('ignore les correspondances non signées : une proposition n’est pas une correspondance', () => {
    const r = deriverRemboursement([proposee('1213')], [acte({ codeActe: '1213' })]);
    expect(r.statut).toBe('non_evalue');
    expect(r.codesActesRetenus).toEqual([]);
  });

  it('reconnaît un acte signé et actif du millésime courant', () => {
    const r = deriverRemboursement([signee('1213')], [acte({ codeActe: '1213' })]);
    expect(r.statut).toBe('remboursable');
    expect(r.codesActesRetenus).toEqual(['1213']);
    expect(r.conditions).toEqual([]);
  });

  it('ne rend jamais « remboursable » quand la nomenclature n’a pas été importée', () => {
    // Le piège que l’ancrage sur la ligne de millésime aurait produit : après
    // un import de version N+1, une signature orpheline ne doit pas basculer
    // en « remboursable » par défaut, ni disparaître en silence.
    expect(deriverRemboursement([signee('1213')], []).statut).toBe(
      'hors_nomenclature',
    );
  });

  it('écarte un acte devenu inactif dans le millésime courant', () => {
    const r = deriverRemboursement(
      [signee('1213')],
      [acte({ codeActe: '1213', inactif: true })],
    );
    expect(r.statut).toBe('hors_nomenclature');
  });

  it('distingue le groupe imposé du groupe au choix (le défaut B3)', () => {
    // 1211 = TSH + T4 libre : proposer la TSH seule ne la rend pas cotable.
    const impose = deriverRemboursement(
      [signee('1211', 'groupe_et')],
      [acte({ codeActe: '1211' })],
    );
    expect(impose.statut).toBe('remboursable_si_groupe');

    // 1387 = folates sériques OU érythrocytaires : chacun est couvert.
    const auChoix = deriverRemboursement(
      [signee('1387', 'groupe_ou')],
      [acte({ codeActe: '1387' })],
    );
    expect(auChoix.statut).toBe('remboursable');
  });

  it('une seule cotation isolée suffit, même à côté de groupes imposés', () => {
    const r = deriverRemboursement(
      [signee('1208', 'isole'), signee('1211', 'groupe_et')],
      [acte({ codeActe: '1208' }), acte({ codeActe: '1211' })],
    );
    expect(r.statut).toBe('remboursable');
  });

  it('remonte les conditions sans jamais les soustraire du statut', () => {
    const r = deriverRemboursement(
      [signee('1213')],
      [
        acte({
          codeActe: '1213',
          ententePrealable: true,
          acteReserve: true,
          remboursementTotal: false,
        }),
      ],
    );
    expect(r.statut).toBe('remboursable');
    expect(r.conditions.sort()).toEqual([
      'acte_reserve',
      'entente_prealable',
      'remboursement_partiel',
    ]);
  });

  it('ne duplique pas une condition portée par plusieurs actes', () => {
    const r = deriverRemboursement(
      [signee('1208'), signee('1212')],
      [
        acte({ codeActe: '1208', ententePrealable: true }),
        acte({ codeActe: '1212', ententePrealable: true }),
      ],
    );
    expect(r.conditions).toEqual(['entente_prealable']);
  });
});

describe('deriverRemboursement — constat « aucun acte » (M-3c)', () => {
  const courant = (millesime: string, millesimeCourant: string | null = 'V105') => ({
    constat: { millesime },
    millesimeCourant,
  });

  it('constat sur le millésime courant, sans signature : hors nomenclature', () => {
    const r = deriverRemboursement([], [], courant('V105'));
    expect(r).toEqual({ statut: 'hors_nomenclature', conditions: [], codesActesRetenus: [] });
    expect(regimeDocumentaire(r)).toBe('document_patient');
  });

  it('le même constat, millésime changé depuis : il ne vaut plus, non évalué', () => {
    expect(deriverRemboursement([], [], courant('V105', 'V106')).statut).toBe('non_evalue');
  });

  it('nomenclature non importée : aucun constat ne vaut', () => {
    expect(deriverRemboursement([], [], courant('V105', null)).statut).toBe('non_evalue');
  });

  it('une proposition non signée ne fait pas écran au constat', () => {
    expect(deriverRemboursement([proposee('1213')], [acte({ codeActe: '1213' })], courant('V105')).statut).toBe(
      'hors_nomenclature',
    );
  });

  it('une signature présente l’emporte : le constat est ignoré', () => {
    const r = deriverRemboursement([signee('1213')], [acte({ codeActe: '1213' })], courant('V105'));
    expect(r.statut).toBe('remboursable');
    expect(r.codesActesRetenus).toEqual(['1213']);
  });

  it('sans contexte, la règle d’avant M-3c : non évalué', () => {
    expect(deriverRemboursement([], []).statut).toBe('non_evalue');
  });
});

describe('regimeDocumentaire', () => {
  it('n’envoie au médecin que le franchement remboursable', () => {
    expect(regimeDocumentaire({ statut: 'remboursable', conditions: [], codesActesRetenus: [] }))
      .toBe('courrier_medecin');
  });

  it('retombe sur le document patient dans tous les autres cas', () => {
    for (const statut of ['non_evalue', 'hors_nomenclature', 'remboursable_si_groupe'] as const) {
      expect(regimeDocumentaire({ statut, conditions: [], codesActesRetenus: [] }))
        .toBe('document_patient');
    }
  });
});

describe('mentionsRemboursement — une fois par document (D-316)', () => {
  const a = (code: string, libelle: string, statut: 'non_evalue' | 'hors_nomenclature' | 'remboursable') => ({
    code,
    libelle,
    remboursement: { statut },
  });
  const phrases = [
    ['non_evalue', 'Non évalué'],
    ['hors_nomenclature', 'Hors nomenclature'],
  ] as const;

  it('une phrase par état, dans l’ordre des phrases ; analyses distinctes par code, ordre de première apparition', () => {
    expect(
      mentionsRemboursement(
        [
          a('B', 'Folates', 'non_evalue'),
          a('H', 'Homocystéine', 'hors_nomenclature'),
          a('C', 'Iode', 'non_evalue'),
          a('B', 'Folates', 'non_evalue'),
        ],
        phrases,
      ),
    ).toEqual(['Non évalué : Folates, Iode.', 'Hors nomenclature : Homocystéine.']);
  });

  it('un état sans analyse ne dit rien, et un état sans phrase non plus', () => {
    expect(mentionsRemboursement([a('F', 'Ferritine', 'remboursable')], phrases)).toEqual([]);
  });
});
