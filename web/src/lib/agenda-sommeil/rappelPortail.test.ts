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
  it('aucune nuit : invite à commencer, mais NON prioritaire', () => {
    const r = derive({ nbRenseignees: 0, jourCourant: null });
    expect(r.etat).toBe('a_commencer');
    expect(r.cta).toBe('Commencer mon agenda du sommeil');
    // Rien ne se perd à commencer demain : la fenêtre s'ancre sur la première
    // nuit. Prioritaire, cet état enterrerait sans terme un pack assigné.
    expect(r.prioritaire).toBe(false);
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

  it('fenêtre atteinte ET nuit du jour notée : transmettre, avec le compte', () => {
    const r = derive({ cloturablePatient: true, nuitDuJourNotee: true, nbRenseignees: 18, jourCourant: 21 });
    expect(r.etat).toBe('a_transmettre');
    expect(r.cta).toBe('Terminer et transmettre à mon praticien');
    expect(r.prioritaire).toBe(true);
    // Le compte QUALIFIE la décision : clôturer sous 7 nuits produit une
    // réponse sans agrégat. Il ne doit jamais disparaître de l'écran.
    expect(r.factuel).toBe('18 nuits notées sur 21.');
  });

  it('hors fenêtre : transmettre, avec le compte', () => {
    const r = derive({ cloturablePatient: true, nuitDuJourNotee: false, nbRenseignees: 4, jourCourant: null });
    expect(r.etat).toBe('a_transmettre');
    expect(r.factuel).toBe('4 nuits notées sur 21.');
    // Jamais « complet » : la fenêtre l'est, le recueil pas forcément.
    expect(r.factuel).not.toContain('complet');
  });

  // Le défaut trouvé en revue : le matin du 21e jour, `cloturablePatient` est
  // DÉJÀ vrai alors que l'emplacement 21 est vide. Le hub invitait alors à
  // transmettre pendant que le journal ouvrait le formulaire — et le patient
  // qui suivait le hub clôturait irréversiblement en abandonnant sa nuit.
  it('matin du 21e jour, nuit pas encore notée : noter prime sur transmettre', () => {
    const r = derive({ cloturablePatient: true, nuitDuJourNotee: false, jourCourant: 21, nbRenseignees: 20 });
    expect(r.etat).toBe('nuit_a_noter');
    expect(r.cta).toBe('Noter ma nuit');
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
    derive({ cloturablePatient: true, nuitDuJourNotee: true, jourCourant: 21 }),
    derive({ jourCourant: null }),
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
    'complet',
    'affilée',
    'bravo',
    'félicit',
  ])('ne dit jamais « %s »', (interdit) => {
    expect(tousLesTextes).not.toContain(interdit);
  });

  it('ne montre aucun agrégat ni aucune interprétation clinique', () => {
    for (const interdit of ['efficacité', 'latence', 'indice', 'insomnie', 'qualité']) {
      expect(tousLesTextes).not.toContain(interdit);
    }
  });
});
