import { describe, expect, it } from 'vitest';
import { extraireJsonEvaluation, interpreterEvaluation } from './evaluation';

// Contrat de sortie du juge IA (fonctions pures, sans réseau) : ce qui n'est
// pas un verdict énuméré + une justification bornée non vide est REFUSÉ — jamais
// « nettoyé » en silence. L'aide au praticien doit refléter fidèlement le juge.
describe('evaluation — interprétation du verdict IA', () => {
  it('accepte un objet conforme complet', () => {
    const r = interpreterEvaluation({ verdict: 'conforme', justification: 'Fidèle aux claims.' });
    expect(r).toEqual({ verdict: 'conforme', justification: 'Fidèle aux claims.' });
  });

  it('accepte non_conforme avec justification', () => {
    const r = interpreterEvaluation({ verdict: 'non_conforme', justification: 'Dosage inventé.' });
    expect(r?.verdict).toBe('non_conforme');
  });

  it('refuse un verdict hors énumération', () => {
    expect(interpreterEvaluation({ verdict: 'peut-être', justification: 'x' })).toBeNull();
  });

  it('refuse une justification vide', () => {
    expect(interpreterEvaluation({ verdict: 'conforme', justification: '   ' })).toBeNull();
  });

  it('refuse une justification hors borne', () => {
    const longue = 'a'.repeat(2001);
    expect(interpreterEvaluation({ verdict: 'conforme', justification: longue })).toBeNull();
  });

  it('refuse une entrée non-objet', () => {
    expect(interpreterEvaluation(null)).toBeNull();
    expect(interpreterEvaluation([{ verdict: 'conforme', justification: 'x' }])).toBeNull();
  });

  it('extrait le JSON même entouré d’un fence markdown', () => {
    const txt = 'Voici mon verdict :\n```json\n{"verdict":"conforme","justification":"ok"}\n```';
    const r = interpreterEvaluation(extraireJsonEvaluation(txt));
    expect(r).toEqual({ verdict: 'conforme', justification: 'ok' });
  });

  it('extrait le JSON précédé d’un préambule', () => {
    const txt = 'Réponse: {"verdict":"non_conforme","justification":"écart"}';
    const r = interpreterEvaluation(extraireJsonEvaluation(txt));
    expect(r?.verdict).toBe('non_conforme');
  });
});
