// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PlaintesForm } from './PlaintesForm';

const assignation = {
  idAssignation: 'ASS_TEST_PLAINTES',
  idPatient: 'PAT_TEST',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_PLAINTES',
  titre: 'Mes plaintes',
  dateLimite: null,
  notes: null,
  statut: 'envoye',
  consentement: 'donne',
  statutReponses: 'en_cours',
};

describe('PlaintesForm — pagination 4 + 3', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('page 1 : 4 curseurs, « Suivant » et aucun envoi ; page 2 : 3 curseurs, « Précédent » et l’envoi', () => {
    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={vi.fn()} />);

    expect(screen.getByText('Étape 1 sur 2')).not.toBeNull();
    expect(screen.getAllByRole('slider')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Suivant →' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: '← Précédent' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Transmettre au praticien' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant →' }));

    expect(screen.getByText('Étape 2 sur 2')).not.toBeNull();
    expect(screen.getAllByRole('slider')).toHaveLength(3);
    expect(screen.getByRole('button', { name: '← Précédent' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Transmettre au praticien' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Suivant →' })).toBeNull();
  });

  it('conserve la valeur saisie en page 1 après un aller-retour de pagination', () => {
    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={vi.fn()} />);

    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    fireEvent.click(screen.getByRole('button', { name: '← Précédent' }));

    expect((screen.getAllByRole('slider')[0] as HTMLInputElement).value).toBe('9');
  });

  it('transmet le contrat de soumission historique inchangé (7 réponses + _scoresOverride)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const onDone = vi.fn();

    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={onDone} />);

    // Valeurs par défaut (5) pour les 7 dimensions → total 35 → « Charge modérée ».
    fireEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre au praticien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/patient/submit');
    expect(JSON.parse(request.body as string)).toEqual({
      idAssignation: assignation.idAssignation,
      idPatient: assignation.idPatient,
      email: assignation.emailPatient,
      idQuestionnaire: 'Q_PLAINTES',
      answers: { fatigue: 5, douleurs: 5, digestion: 5, surpoids: 5, insomnie: 5, moral: 5, mobilite: 5 },
      _scoresOverride: {
        total: 35,
        interpretation: { label: 'Charge modérée' },
        subScores: [
          { label: 'Fatigue', total: 5 },
          { label: 'Douleurs', total: 5 },
          { label: 'Digestion', total: 5 },
          { label: 'Surpoids / morphologie', total: 5 },
          { label: 'Insomnie / sommeil', total: 5 },
          { label: 'Moral / anxiété', total: 5 },
          { label: 'Mobilité / douleurs musculaires', total: 5 },
        ],
      },
    });
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });
});

describe('PlaintesForm — refonte Lien PAT-4', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const transmettre = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre au praticien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre' }));
  };

  it('Q3b : les dimensions sont nommées par leur libellé seul, sans emoji', () => {
    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={vi.fn()} />);
    const texte = document.body.textContent ?? '';
    expect(texte).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(screen.getByRole('slider', { name: 'Fatigue' })).not.toBeNull();
  });

  it('Q4a : après un échec d’écriture du brouillon, ni confirmation ni heure antérieure', () => {
    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={vi.fn()} />);
    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '7' } });
    expect(screen.getByText(/^Brouillon enregistré sur cet appareil/)).not.toBeNull();

    const ecrire = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    try {
      fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '8' } });
      expect(screen.queryByText(/^Brouillon enregistré sur cet appareil/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Sauvegarder le brouillon' }));
      expect(screen.queryByText(/^Brouillon enregistré sur cet appareil/)).toBeNull();
    } finally {
      ecrire.mockRestore();
    }
  });

  it('Q6a : sous le refus 401, « Me reconnecter » (T-36) mène à la connexion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      json: vi.fn().mockResolvedValue({ ok: false, error: 'Connexion au portail requise.' }),
    }));
    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={vi.fn()} />);
    transmettre();
    const lien = await screen.findByRole('link', { name: 'Me reconnecter' });
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(screen.getByText('Connexion au portail requise.')).not.toBeNull();
  });

  it('Q6a : un autre refus que le 401 ne propose pas « Me reconnecter »', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 409,
      json: vi.fn().mockResolvedValue({ ok: false, error: 'Ce questionnaire a déjà été complété.' }),
    }));
    render(<PlaintesForm assignation={assignation} email={assignation.emailPatient} onDone={vi.fn()} />);
    transmettre();
    await waitFor(() => expect(screen.getByText('Ce questionnaire a déjà été complété.')).not.toBeNull());
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });
});
