import { describe, expect, it } from 'vitest';

import {
  deriverEpisodeBandeau,
  deriverEtatParcoursPatient,
  phaseInitiale,
  type CycleBandeau,
} from './contrat';

// SP-CONV LOT-01 — le contrat est pur : chaque règle se prouve sans réseau,
// sans Prisma, sans composant.

describe('phaseInitiale (règle D5)', () => {
  const base = {
    chargement: false,
    bloqueurs: [] as const,
    actionsExigibles: [] as const,
    statuts: {},
    dernierePhaseConsultee: null,
  };

  it('ne rend aucune phase pendant le chargement — état neutre, jamais affirmé', () => {
    expect(phaseInitiale({ ...base, chargement: true, bloqueurs: ['actions'] })).toBeNull();
  });

  it('1. un bloqueur de sécurité prime sur tout', () => {
    expect(
      phaseInitiale({
        ...base,
        bloqueurs: ['actions'],
        actionsExigibles: ['patient'],
        statuts: { donnees: 'en_attente' },
      }),
    ).toBe('actions');
  });

  it('2. sinon la première action exigible, dans l’ordre du cycle', () => {
    expect(
      phaseInitiale({
        ...base,
        actionsExigibles: ['decision', 'patient'],
        statuts: { donnees: 'en_attente' },
      }),
    ).toBe('patient');
  });

  it('3. sinon la première phase en attente', () => {
    expect(
      phaseInitiale({ ...base, statuts: { comprehension: 'en_attente', suivi: 'en_attente' } }),
    ).toBe('comprehension');
  });

  it('4. sinon la dernière phase consultée par ce praticien', () => {
    expect(
      phaseInitiale({ ...base, statuts: { decision: 'fait' }, dernierePhaseConsultee: 'suivi' }),
    ).toBe('suivi');
  });

  it('à défaut de tout : décision (comportement antérieur, documenté)', () => {
    expect(phaseInitiale(base)).toBe('decision');
  });
});

describe('deriverEpisodeBandeau', () => {
  const cycle = (
    cycleId: string,
    dateT0: string,
    versionScore: string | null,
    momentum: CycleBandeau['momentum'] = null,
  ): CycleBandeau => ({ cycleId, dateT0, versionScore, momentum });

  const aujourdhui = new Date('2026-07-22T12:00:00Z');

  it('rend null sans aucun cycle — jamais un épisode inventé', () => {
    expect(deriverEpisodeBandeau([], aujourdhui)).toBeNull();
  });

  it('numérote les épisodes par ordre chronologique des T0 et compte la position en jours', () => {
    const bandeau = deriverEpisodeBandeau(
      [cycle('c2', '2026-07-08T00:00:00Z', 'v1'), cycle('c1', '2026-05-01T00:00:00Z', 'v1')],
      aujourdhui,
    );
    expect(bandeau).toMatchObject({ numeroEpisode: 2, cycleId: 'c2', positionJours: 14 });
    expect(bandeau?.positionLibelle).toBe('T0 + 14 j · vous êtes ici');
  });

  it('expose le momentum du tour précédent uniquement à version de score identique (A8-3)', () => {
    const momentum = { tendance: 'hausse' as const, delta: 3 };
    const comparable = deriverEpisodeBandeau(
      [cycle('c1', '2026-05-01T00:00:00Z', 'v1', momentum), cycle('c2', '2026-07-08T00:00:00Z', 'v1')],
      aujourdhui,
    );
    expect(comparable?.deltaTourPrecedent).toMatchObject({ cycleId: 'c1', delta: 3 });

    const versionsDifferentes = deriverEpisodeBandeau(
      [cycle('c1', '2026-05-01T00:00:00Z', 'v0', momentum), cycle('c2', '2026-07-08T00:00:00Z', 'v1')],
      aujourdhui,
    );
    expect(versionsDifferentes?.deltaTourPrecedent).toBeNull();

    const versionInconnue = deriverEpisodeBandeau(
      [cycle('c1', '2026-05-01T00:00:00Z', null, momentum), cycle('c2', '2026-07-08T00:00:00Z', 'v1')],
      aujourdhui,
    );
    expect(versionInconnue?.deltaTourPrecedent).toBeNull();
  });
});

describe('deriverEtatParcoursPatient (D7, D11)', () => {
  const base = {
    questionnairesTransmis: true,
    consultationStatut: null as string | null,
    protocoleDiffuse: false,
    finDeCycle: false,
    bookletEnvoye: false,
  };

  it('rend null tant que les questionnaires ne sont pas transmis — les écrans gardent les étapes 1-4', () => {
    expect(deriverEtatParcoursPatient({ ...base, questionnairesTransmis: false })).toBeNull();
  });

  it('transmis sans autre signal : étape 5, « Vos éléments ont été transmis. »', () => {
    const etat = deriverEtatParcoursPatient(base);
    expect(etat).toMatchObject({ etape: 'elements_transmis', journeyCurrentId: 5, analyseTerminee: false });
  });

  it('consultation en cours : étape 5, « Votre praticien les prépare. »', () => {
    const etat = deriverEtatParcoursPatient({ ...base, consultationStatut: 'en_cours' });
    expect(etat).toMatchObject({ etape: 'analyse_en_cours', journeyCurrentId: 5 });
  });

  it('protocole diffusé ou booklet envoyé : étape 6, restitution disponible, analyse terminée', () => {
    for (const signaux of [{ ...base, protocoleDiffuse: true }, { ...base, bookletEnvoye: true }]) {
      const etat = deriverEtatParcoursPatient(signaux);
      expect(etat).toMatchObject({
        etape: 'restitution_disponible',
        journeyCurrentId: 6,
        analyseTerminee: true,
      });
    }
  });

  it('fin de cycle : la prochaine étape est prête — sans compte à rebours', () => {
    const etat = deriverEtatParcoursPatient({ ...base, finDeCycle: true, protocoleDiffuse: true });
    expect(etat?.etape).toBe('prochaine_etape_prete');
  });

  it('jamais rétrograde : la diffusion prime sur un statut de consultation encore « en cours »', () => {
    const etat = deriverEtatParcoursPatient({
      ...base,
      consultationStatut: 'en_cours',
      protocoleDiffuse: true,
    });
    expect(etat?.journeyCurrentId).toBe(6);
  });
});
