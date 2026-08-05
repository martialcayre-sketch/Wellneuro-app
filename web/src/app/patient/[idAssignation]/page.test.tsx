// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

/**
 * ── LE SECOND ÉCRAN PORTEUR DU `ConsentScreen` ───────────────────────────────
 *
 * L'élargissement « à tous les questionnaires » ne valait que sur UN écran sur
 * deux : celui-ci, le chemin legacy par lien e-mail, n'avait pas reçu le garde.
 * La divergence est devenue vivante dès que `api/patient/questionnaire` a cessé
 * de renvoyer 410 sur une assignation déverrouillée et périmée.
 *
 * Il consomme la MÊME route que l'écran portail, donc le même verdict serveur
 * `consentementPossible` — aucune règle n'est recomposée ici.
 */

vi.mock('next/navigation', () => ({
  useParams: () => ({ idAssignation: 'ASS_TEST' }),
}));

import PatientQuestionnairePage from './page';

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

/**
 * Franchit l'email-gate, puis rend l'écran d'après. Le `fetch` répond à DEUX
 * routes : la vérification (`/api/patient/questionnaire`) et le panneau des
 * questionnaires en attente (`/api/patient/assignations`).
 */
async function monterEtFranchirLeGate(over: {
  assignation?: Partial<typeof assignation>;
  consentementPossible?: boolean;
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        json: () =>
          Promise.resolve(
            String(url).includes('/api/patient/assignations')
              ? { ok: true, assignations: [] }
              : {
                  ok: true,
                  assignation: { ...assignation, ...over.assignation },
                  questionnaire: { id: 'Q_NEU_03', titre: 'Questionnaire test', questions: [] },
                  renderer: 'liste',
                  consentementPossible: over.consentementPossible ?? true,
                },
          ),
      }),
    ),
  );
  render(<PatientQuestionnairePage />);
  fireEvent.change(screen.getByPlaceholderText('votre@email.fr'), {
    target: { value: assignation.emailPatient },
  });
  fireEvent.click(screen.getByRole('button', { name: /accéder au questionnaire/i }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('écran legacy /patient/[idAssignation] — garde « période terminée »', () => {
  it('affiche le garde quand le SERVEUR dit le consentement impossible', async () => {
    await monterEtFranchirLeGate({
      assignation: { consentement: 'non_donne', statutReponses: 'verrouille', dateLimite: '2020-01-01' },
      consentementPossible: false,
    });
    const message = await screen.findByText(/votre consentement ne peut plus être enregistré/i);
    // Le message ne prétend pas que le questionnaire n'a pas été rempli : ce
    // garde n'est atteignable que sur des assignations déjà transmises.
    expect(message.textContent ?? '').not.toMatch(/rempli/i);
    expect(screen.queryByText('Avant de commencer')).toBeNull();
  });

  it('affiche le ConsentScreen normalement quand le consentement est possible', async () => {
    await monterEtFranchirLeGate({
      assignation: { consentement: 'non_donne' },
      consentementPossible: true,
    });
    expect(await screen.findByText('Avant de commencer')).toBeTruthy();
    expect(screen.queryByText(/ne peut plus être enregistré/i)).toBeNull();
  });

  it('le verdict vient du SERVEUR : déverrouillé et périmé ouvre le consentement', async () => {
    await monterEtFranchirLeGate({
      assignation: { consentement: 'non_donne', statutReponses: 'deverrouille', dateLimite: '2020-01-01' },
      consentementPossible: true,
    });
    expect(await screen.findByText('Avant de commencer')).toBeTruthy();
  });

  it('non-régression : un questionnaire ORDINAIRE consenti ne voit jamais le garde', async () => {
    await monterEtFranchirLeGate({
      assignation: { consentement: 'donne', statutReponses: 'non_rempli', dateLimite: '2999-12-31' },
      consentementPossible: true,
    });
    // Le panneau de suivi n'apparaît qu'une fois l'aiguillage franchi : c'est
    // le repère que l'écran de saisie est bien celui qui est monté.
    expect(await screen.findByText('Suivi de vos questionnaires')).toBeTruthy();
    expect(screen.queryByText(/ne peut plus être enregistré/i)).toBeNull();
    expect(screen.queryByText('Avant de commencer')).toBeNull();
  });
});
