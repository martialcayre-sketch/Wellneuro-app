// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LienDuHub, chargeUnDocumentNeuf } from './LienDuHub';

describe('LienDuHub', () => {
  afterEach(cleanup);

  it('une page de questionnaire charge un document neuf (caméra et script-src figés au chargement)', () => {
    expect(chargeUnDocumentNeuf('/portail/PAT_SEED_01/questionnaires/ASS_1')).toBe(true);
    expect(chargeUnDocumentNeuf('/portail/PAT_SEED_01/questionnaires/ASS_1?x=1')).toBe(true);
  });

  it('une ancre du hub reste une ancre', () => {
    expect(chargeUnDocumentNeuf('#mon-parcours')).toBe(true);
  });

  it('les autres pages du portail, le hub compris, restent dans le document', () => {
    for (const href of [
      '/portail/PAT_SEED_01/questionnaires',
      '/portail/PAT_SEED_01/bilan',
      '/portail/PAT_SEED_01/suivi',
      '/portail/PAT_SEED_01/fiches/F_1',
    ]) {
      expect(chargeUnDocumentNeuf(href), href).toBe(false);
    }
  });

  it('rend un lien de même nom et de même cible dans les deux cas', () => {
    render(
      <>
        <LienDuHub href="/portail/PAT_SEED_01/questionnaires/ASS_1">Commencer</LienDuHub>
        <LienDuHub href="/portail/PAT_SEED_01/bilan">Lire mon bilan</LienDuHub>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Commencer' })).toHaveProperty(
      'pathname',
      '/portail/PAT_SEED_01/questionnaires/ASS_1',
    );
    expect(screen.getByRole('link', { name: 'Lire mon bilan' })).toHaveProperty('pathname', '/portail/PAT_SEED_01/bilan');
  });
});
