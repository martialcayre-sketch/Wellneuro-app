import { describe, expect, it } from 'vitest';
import type { VerdictEffetIndesirable } from './pauseEffetIndesirable';
import { validerDemandeVerdict } from './verdictEffetIndesirable';

// LE VERDICT DU PRATICIEN ([[D-281]] §5, étape 4) : ce que la route refuse
// avant d'écrire.

const ELEMENTS = [{ actionId: 'a-magnesium' }, { actionId: 'a-marche' }];
const PAR_ELEMENT = { id: 's1', rattachement: 'element' as const, elementActionId: 'a-magnesium' };
const NE_SAIT_PAS = { id: 's1', rattachement: 'ne_sait_pas' as const, elementActionId: null };

const verdict = (v: Partial<VerdictEffetIndesirable> & { id: string }): VerdictEffetIndesirable => ({
  reportId: 's1', verdict: 'non_implique', elementActionId: null, amenagement: null, supersedesVerdictId: null, ...v,
});

describe('validerDemandeVerdict', () => {
  it('élément désigné par le patient : « impliqué » prend SON élément, le praticien choisit l’aménagement', () => {
    expect(validerDemandeVerdict({
      signalement: PAR_ELEMENT, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'reduire', supersedesVerdictId: null },
    })).toEqual({
      ok: true,
      aEcrire: { verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'reduire', supersedesVerdictId: null },
    });
  });

  it('élément désigné par le patient : le praticien ne peut pas en impliquer un autre', () => {
    const r = validerDemandeVerdict({
      signalement: PAR_ELEMENT, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'retirer', elementActionId: 'a-marche' },
    });
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it('« Je ne sais pas » : le praticien désigne l’élément, parmi ceux du programme visé', () => {
    expect(validerDemandeVerdict({
      signalement: NE_SAIT_PAS, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'differer', elementActionId: 'a-marche' },
    })).toMatchObject({ ok: true, aEcrire: { elementActionId: 'a-marche', amenagement: 'differer' } });

    expect(validerDemandeVerdict({
      signalement: NE_SAIT_PAS, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'differer', elementActionId: 'a-absent' },
    })).toMatchObject({ ok: false, status: 400 });

    expect(validerDemandeVerdict({
      signalement: NE_SAIT_PAS, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'differer' },
    })).toMatchObject({ ok: false, status: 400 });
  });

  it('élément désigné : le corps peut renvoyer l’élément du patient, il est accepté', () => {
    expect(validerDemandeVerdict({
      signalement: PAR_ELEMENT, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'retirer', elementActionId: 'a-magnesium' },
    })).toMatchObject({ ok: true, aEcrire: { elementActionId: 'a-magnesium' } });
  });

  it('« un autre produit » suit « Je ne sais pas » : le praticien désigne', () => {
    const autre = { ...NE_SAIT_PAS, rattachement: 'autre_produit' as const };
    expect(validerDemandeVerdict({
      signalement: autre, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'reduire', elementActionId: 'a-marche' },
    })).toMatchObject({ ok: true, aEcrire: { elementActionId: 'a-marche' } });
    expect(validerDemandeVerdict({
      signalement: autre, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'implique', amenagement: 'reduire' },
    })).toMatchObject({ ok: false, status: 400 });
  });

  it('« Je ne sais pas » sur un programme illisible : aucun élément désignable, 409', () => {
    expect(validerDemandeVerdict({
      signalement: NE_SAIT_PAS, verdicts: [], elements: null,
      demande: { verdict: 'implique', amenagement: 'retirer', elementActionId: 'a-magnesium' },
    })).toMatchObject({ ok: false, status: 409 });
  });

  it('« Je ne sais pas » : « aucun élément » s’écrit « non impliqué », même programme illisible', () => {
    expect(validerDemandeVerdict({
      signalement: NE_SAIT_PAS, verdicts: [], elements: null, demande: { verdict: 'non_implique' },
    })).toEqual({
      ok: true,
      aEcrire: { verdict: 'non_implique', elementActionId: null, amenagement: null, supersedesVerdictId: null },
    });
  });

  it('★ jamais à l’identique ni augmenté : hors des trois aménagements, refusé', () => {
    for (const amenagement of ['reconduire', 'augmenter', undefined, '']) {
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [], elements: ELEMENTS, demande: { verdict: 'implique', amenagement },
      }), String(amenagement)).toMatchObject({ ok: false, status: 400 });
    }
  });

  it('« non impliqué » ne porte ni élément ni aménagement', () => {
    expect(validerDemandeVerdict({
      signalement: PAR_ELEMENT, verdicts: [], elements: ELEMENTS,
      demande: { verdict: 'non_implique', amenagement: 'retirer' },
    })).toMatchObject({ ok: false, status: 400 });
  });

  it('un verdict inconnu est refusé', () => {
    expect(validerDemandeVerdict({
      signalement: PAR_ELEMENT, verdicts: [], elements: ELEMENTS, demande: { verdict: 'traite' },
    })).toMatchObject({ ok: false, status: 400 });
  });

  describe('la correction (un verdict se corrige, l’ancien reste lisible)', () => {
    const racine = verdict({ id: 'v1', verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'retirer' });

    it('corrige la tête de chaîne qu’il nomme', () => {
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [racine], elements: ELEMENTS,
        demande: { verdict: 'non_implique', supersedesVerdictId: 'v1' },
      })).toMatchObject({ ok: true, aEcrire: { verdict: 'non_implique', supersedesVerdictId: 'v1' } });
    });

    it('★ un avis rendu entre-temps : 409, jamais une seconde racine ni l’écrasement', () => {
      // Le praticien n'a vu aucun avis, un autre en a rendu un.
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [racine], elements: ELEMENTS,
        demande: { verdict: 'non_implique', supersedesVerdictId: null },
      })).toMatchObject({ ok: false, status: 409 });
      // Il corrige un avis qui a déjà été corrigé.
      const correction = verdict({ id: 'v2', supersedesVerdictId: 'v1' });
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [racine, correction], elements: ELEMENTS,
        demande: { verdict: 'implique', amenagement: 'reduire', supersedesVerdictId: 'v1' },
      })).toMatchObject({ ok: false, status: 409 });
    });

    it('un avis identique à celui en vigueur n’allonge pas la chaîne', () => {
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [racine], elements: ELEMENTS,
        demande: { verdict: 'implique', amenagement: 'retirer', supersedesVerdictId: 'v1' },
      })).toMatchObject({ ok: false, status: 400 });
      // Même élément, autre aménagement : c'est une correction.
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [racine], elements: ELEMENTS,
        demande: { verdict: 'implique', amenagement: 'reduire', supersedesVerdictId: 'v1' },
      })).toMatchObject({ ok: true });
    });

    it('chaîne à deux têtes (irreprésentable en base) : fail-closed', () => {
      const a = verdict({ id: 'v2', supersedesVerdictId: 'v1' });
      const b = verdict({ id: 'v3', supersedesVerdictId: null });
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [racine, a, b], elements: ELEMENTS,
        demande: { verdict: 'non_implique', supersedesVerdictId: 'v2' },
      })).toMatchObject({ ok: false, status: 409 });
    });

    it('les verdicts d’un autre signalement ne comptent pas', () => {
      const ailleurs = verdict({ id: 'x1', reportId: 's2' });
      expect(validerDemandeVerdict({
        signalement: PAR_ELEMENT, verdicts: [ailleurs], elements: ELEMENTS,
        demande: { verdict: 'non_implique', supersedesVerdictId: null },
      })).toMatchObject({ ok: true });
    });
  });
});
