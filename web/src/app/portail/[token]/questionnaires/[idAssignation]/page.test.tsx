// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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

// Les écrans de lecture seule chargent leurs propres données : remplacés par
// des doublures qui n'exposent que la navigation, seule chose testée ici.
vi.mock('@/components/patient/ConsultationScreen', () => ({
  ConsultationScreen: ({ onVoirEquilibre }: { onVoirEquilibre: () => void }) => (
    <button type="button" onClick={onVoirEquilibre}>Voir Mon équilibre</button>
  ),
}));
vi.mock('@/components/patient/MonEquilibreAccueil', () => ({
  MonEquilibreAccueil: ({ onVoirDetail, onRetour }: { onVoirDetail: () => void; onRetour: () => void }) => (
    <div>
      <p>Accueil Mon équilibre</p>
      <button type="button" onClick={onVoirDetail}>Voir le détail</button>
      <button type="button" onClick={onRetour}>Retour</button>
    </div>
  ),
}));
vi.mock('@/components/patient/MonEquilibreDetail', () => ({
  MonEquilibreDetail: ({ onRetour }: { onRetour: () => void }) => (
    <div>
      <p>Détail Mon équilibre</p>
      <button type="button" onClick={onRetour}>Retour à l’accueil</button>
    </div>
  ),
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

// APRÈS TRANSMISSION, L'ENCART SUIT LE PATIENT DANS CHAQUE SOUS-VUE ([[D-275]]).
// Revue Codex de la PR #1370 : « Mon équilibre » et son détail retournaient
// avant l'encart.
describe('écran portail — encart d’urgence après transmission', () => {
  const ENCART = { name: 'Besoin d’aide maintenant ?' };
  for (const idQuestionnaire of ['Q_NEU_01', 'Q_NEU_02', 'Q_NEU_03', 'Q_NEU_12']) {
    it(`${idQuestionnaire} : présent sur l’écran transmis, l’accueil et le détail de Mon équilibre`, async () => {
      monter({ assignation: { idQuestionnaire, consentement: 'donne', statutReponses: 'verrouille' } });
      fireEvent.click(await screen.findByRole('button', { name: 'Voir Mon équilibre' }));
      expect(screen.getByText('Accueil Mon équilibre')).not.toBeNull();
      expect(screen.getAllByRole('note', ENCART)).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Voir le détail' }));
      expect(screen.getByText('Détail Mon équilibre')).not.toBeNull();
      expect(screen.getAllByRole('note', ENCART)).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Retour à l’accueil' }));
      fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
      expect(screen.getByRole('button', { name: 'Voir Mon équilibre' })).not.toBeNull();
      expect(screen.getAllByRole('note', ENCART)).toHaveLength(1);
    });
  }

  it('témoin : un questionnaire sans question sur le suicide n’affiche l’encart dans aucune sous-vue', async () => {
    monter({ assignation: { idQuestionnaire: 'Q_STR_04', consentement: 'donne', statutReponses: 'verrouille' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Voir Mon équilibre' }));
    expect(screen.queryByRole('note', ENCART)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le détail' }));
    expect(screen.queryByRole('note', ENCART)).toBeNull();
  });
});

describe('écran portail — encart d’urgence avant la saisie', () => {
  const ENCART = { name: 'Besoin d’aide maintenant ?' };
  it('présent sur l’écran de consentement d’un questionnaire qui parle de suicide', async () => {
    monter({ assignation: { idQuestionnaire: 'Q_NEU_01' } });
    await screen.findByRole('note', ENCART);
    expect(screen.getAllByRole('note', ENCART)).toHaveLength(1);
  });

  it('présent sur l’écran « période terminée »', async () => {
    monter({ assignation: { idQuestionnaire: 'Q_NEU_02' }, consentementPossible: false });
    await screen.findByText(/La période est terminée/);
    expect(screen.getAllByRole('note', ENCART)).toHaveLength(1);
  });

  it('témoin : absent du consentement d’un autre questionnaire', async () => {
    monter({ assignation: { idQuestionnaire: 'Q_STR_04' } });
    // Attendre l'écran chargé, sinon le témoin passerait pendant le chargement.
    await screen.findAllByText('Questionnaire test');
    expect(screen.queryByRole('note', ENCART)).toBeNull();
  });
});

