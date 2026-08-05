// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

/**
 * ── CE QUE CE BANC PROTÈGE ───────────────────────────────────────────────────
 *
 * Le garde « période terminée » posé devant le `ConsentScreen` est le SEUL
 * changement du lot qui touche TOUS les questionnaires, et il partait sans
 * aucune couverture. Trois propriétés, et elles sont liées :
 *
 *  1. le garde s'affiche quand le SERVEUR dit le consentement impossible — et le
 *     verdict vient bien du serveur : l'écran est `'use client'`, et
 *     `isDeadlineExpired` parse `AAAA-MM-JJT23:59:59.999` SANS fuseau. Recalculé
 *     ici, il se lisait dans le fuseau du NAVIGATEUR (~2 h d'écart à Paris
 *     l'été, plusieurs heures à l'ouest d'UTC) ;
 *  2. son MESSAGE n'affirme pas que le questionnaire n'a pas été rempli : depuis
 *     que `api/patient/questionnaire` exempte `deverrouille`, ce garde n'est
 *     atteignable que sur des assignations DÉJÀ transmises ;
 *  3. le `ConsentScreen` s'affiche normalement dès que le serveur dit oui, et un
 *     questionnaire ordinaire non périmé ne voit jamais le garde.
 */

// L'objet routeur est STABLE d'un rendu à l'autre, et ce n'est pas un détail :
// `charger` le porte en dépendance de `useCallback`, et `useEffect` dépend de
// `charger`. Un objet neuf à chaque rendu relance le chargement en boucle, et
// l'écran oscille entre « Chargement… » et son contenu — une assertion
// synchrone tombe alors une fois sur deux.
const { router, replace, push } = vi.hoisted(() => {
  const replace = vi.fn();
  const push = vi.fn();
  return { router: { replace, push }, replace, push };
});
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'TOK_TEST', idAssignation: 'ASS_TEST' }),
  useRouter: () => router,
}));

import PortailQuestionnairePage from './page';

const assignation = {
  idAssignation: 'ASS_TEST',
  idPatient: 'PAT_TEST',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null as string | null,
  notes: null,
  statut: 'En attente',
  consentement: 'non_donne',
  statutReponses: 'non_rempli',
};

function monter(over: {
  assignation?: Partial<typeof assignation>;
  consentementPossible?: boolean;
  questionnaire?: unknown;
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          ok: true,
          assignation: { ...assignation, ...over.assignation },
          // Une définition minimale : il ne s'agit jamais de tester le rendu du
          // questionnaire, seulement l'aiguillage qui le précède.
          questionnaire: over.questionnaire ?? { id: 'Q_NEU_03', titre: 'Questionnaire test', questions: [] },
          renderer: 'liste',
          consentementPossible: over.consentementPossible ?? true,
        }),
    }),
  );
  render(<PortailQuestionnairePage />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  replace.mockClear();
  push.mockClear();
});

describe('écran portail — garde « période terminée » devant le consentement', () => {
  it('affiche le garde quand le SERVEUR dit le consentement impossible', async () => {
    monter({
      assignation: { consentement: 'non_donne', statutReponses: 'verrouille', dateLimite: '2020-01-01' },
      consentementPossible: false,
    });
    await screen.findByText(/votre consentement ne peut plus être enregistré/i);
    // Le geste impossible n'est PAS proposé.
    expect(screen.queryByText('Avant de commencer')).toBeNull();
  });

  it('le message n’affirme JAMAIS que le questionnaire n’a pas été rempli', async () => {
    // Le garde n'est atteignable que sur `verrouille` / `modification_demandee`
    // périmés — des questionnaires déjà remplis ET transmis. « ne peut plus être
    // rempli » y était faux.
    monter({
      assignation: { consentement: 'non_donne', statutReponses: 'modification_demandee', dateLimite: '2020-01-01' },
      consentementPossible: false,
    });
    const texte = (await screen.findByText(/période est terminée/i)).textContent ?? '';
    expect(texte).not.toMatch(/rempli/i);
    // Il oriente vers le praticien : sans action possible, c'est la seule sortie.
    expect(screen.getByText(/contactez votre praticien/i)).toBeTruthy();
  });

  it('le verdict vient du SERVEUR, pas d’un recalcul de la date limite dans le navigateur', async () => {
    // Date limite LARGEMENT dépassée, mais le serveur dit « possible » (cas du
    // déverrouillage praticien). Un écran qui recalculerait `isDeadlineExpired`
    // afficherait le garde ; celui-ci ouvre le consentement.
    monter({
      assignation: { consentement: 'non_donne', statutReponses: 'deverrouille', dateLimite: '2020-01-01' },
      consentementPossible: true,
    });
    expect(await screen.findByText('Avant de commencer')).toBeTruthy();
    expect(screen.queryByText(/ne peut plus être enregistré/i)).toBeNull();
  });

  it('affiche le ConsentScreen normalement quand le consentement est possible', async () => {
    monter({ assignation: { consentement: 'non_donne' }, consentementPossible: true });
    expect(await screen.findByText('Avant de commencer')).toBeTruthy();
  });

  it('non-régression : un questionnaire ORDINAIRE non périmé ne voit jamais le garde', async () => {
    monter({
      assignation: { consentement: 'donne', statutReponses: 'non_rempli', dateLimite: '2999-12-31' },
      consentementPossible: true,
    });
    await waitFor(() =>
      expect(screen.getByText(/entre dans le cadre de votre suivi Wellneuro/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/ne peut plus être enregistré/i)).toBeNull();
  });
});
