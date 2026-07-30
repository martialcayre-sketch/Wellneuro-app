import { describe, expect, it } from 'vitest';
import { deriverRappelAgenda, type EtatAgendaPortail } from './rappelPortail';
import { NB_JOURS_AGENDA } from './types';

function etat(over: Partial<EtatAgendaPortail> = {}): EtatAgendaPortail {
  return {
    nbRenseignees: 5,
    jourCourant: 6,
    nuitDuJourNotee: false,
    cloturablePatient: false,
    ...over,
  };
}

const derive = (o: Partial<EtatAgendaPortail> = {}) =>
  deriverRappelAgenda(etat(o), NB_JOURS_AGENDA);

describe('deriverRappelAgenda — les quatre états', () => {
  it('aucune nuit : invite à commencer, prioritaire', () => {
    const r = derive({ nbRenseignees: 0, jourCourant: null });
    expect(r.etat).toBe('a_commencer');
    expect(r.cta).toBe('Commencer mon agenda du sommeil');
    expect(r.prioritaire).toBe(true);
  });

  it('nuit du jour manquante : « Noter ma nuit », prioritaire, avec le compte', () => {
    const r = derive();
    expect(r.etat).toBe('nuit_a_noter');
    expect(r.cta).toBe('Noter ma nuit');
    expect(r.prioritaire).toBe(true);
    expect(r.factuel).toBe('5 nuits notées sur 21.');
  });

  it('nuit du jour notée : aucun CTA, quitte la mise en avant', () => {
    const r = derive({ nuitDuJourNotee: true, nbRenseignees: 6 });
    expect(r.etat).toBe('a_jour');
    expect(r.cta).toBeNull();
    expect(r.prioritaire).toBe(false);
  });

  it('fenêtre atteinte : transmettre prime, même si la nuit du jour est notée', () => {
    const r = derive({ cloturablePatient: true, nuitDuJourNotee: true, nbRenseignees: 18 });
    expect(r.etat).toBe('a_transmettre');
    expect(r.cta).toBe('Terminer et transmettre à mon praticien');
    expect(r.prioritaire).toBe(true);
  });

  it('accorde le singulier', () => {
    expect(derive({ nbRenseignees: 1 }).factuel).toBe('1 nuit notée sur 21.');
  });
});

// Garde de vocabulaire : ce que le patient lit ne doit contenir ni compte à
// rebours, ni reproche, ni score. C'est la doctrine « construction jamais
// dégradation » rendue vérifiable.
describe('rappel portail — vocabulaire interdit', () => {
  const tousLesTextes = [
    derive({ nbRenseignees: 0, jourCourant: null }),
    derive(),
    derive({ nuitDuJourNotee: true }),
    derive({ cloturablePatient: true }),
  ]
    .flatMap((r) => [r.cta ?? '', r.factuel])
    .join(' | ')
    .toLowerCase();

  it.each([
    'manqué',
    'oubli',
    'retard',
    'il vous reste',
    'plus que',
    'score',
    '%',
    'série',
    'perdu',
    'attention',
    'urgent',
  ])('ne dit jamais « %s »', (interdit) => {
    expect(tousLesTextes).not.toContain(interdit);
  });

  it('ne montre aucun agrégat ni aucune interprétation clinique', () => {
    for (const interdit of ['efficacité', 'latence', 'indice', 'insomnie', 'qualité']) {
      expect(tousLesTextes).not.toContain(interdit);
    }
  });
});
