// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// LE ROUTEUR EST STABLE, comme celui de Next : un objet neuf à chaque rendu
// relancerait l'effet de session à chaque rendu, et la page referait sa
// séquence d'accueil en boucle (constaté au lot (h) de D-284 : le banc de la
// date épuisait la mémoire).
const { replace, routeur } = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, routeur: { replace } };
});
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_TEST' }),
  useRouter: () => routeur,
}));

import PortailPage from './page';
import { TEXTE_MINEUR_15_17, TEXTE_MINEUR_MOINS_15 } from '@/lib/patient/texteMineurs';

describe('PortailPage — restauration de session', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    replace.mockClear();
  });

  it('restaure une session valide sans afficher le gate email', async () => {
    // `ok: true` : le code vérifie res.ok (Response réel) avant de parser —
    // sans lui, le fetch trust/etat partirait en réessais bornés (lenteur).
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
        consultation: null,
        premiereAssignation: 'ASS_TEST',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PortailPage />);

    expect(screen.getByText('Vérification de votre session…')).not.toBeNull();
    await waitFor(() => expect(screen.getByText('Merci !')).not.toBeNull());
    expect(screen.queryByPlaceholderText('votre@email.fr')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  // `premiereAssignation` ne compte que les assignations NON complétées
  // (`session/route.ts`, `statut: { not: 'Complété' }`). Elle est donc null
  // AUSSI pour un patient qui a tout rempli — à qui cet écran fermait la porte
  // du hub, et annonçait des questionnaires « prochainement » alors qu'il n'en
  // attendait aucun.
  it('laisse le hub accessible et ne promet rien quand aucune assignation n’est en attente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
        consultation: null,
        premiereAssignation: null,
      }),
    }));

    render(<PortailPage />);

    await waitFor(() => expect(screen.getByText('Merci !')).not.toBeNull());
    const lien = screen.getByRole('link', { name: 'Accéder à mon parcours' });
    expect(lien.getAttribute('href')).toBe('/portail/PAT_TEST/questionnaires');
    expect(screen.queryByText(/mettra vos questionnaires à disposition prochainement/)).toBeNull();
    expect(screen.getByText(/aucun questionnaire en attente/)).not.toBeNull();
  });

  // LOT-04 : plus de gate email. Sans cookie valide, la page redirige vers la
  // page de connexion (Google + redemande de lien magique).
  it('redirige vers /portail/connexion lorsque la restauration est refusée', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ ok: false, reason: 'forbidden', error: 'Accès refusé.' }),
    }));

    render(<PortailPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/connexion'));
    // Le champ e-mail du gate n'existe plus.
    expect(screen.queryByPlaceholderText('votre@email.fr')).toBeNull();
  });
});

// D-284 §3 et §4, lot (h) : la date de naissance se demande avant tout autre
// geste, se fait confirmer, et un mineur reste en pause.
describe('PortailPage — garde d’âge', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    replace.mockClear();
  });

  function stubPortail(
    statutAge: string,
    reponseDate: Record<string, unknown>,
    session: Record<string, unknown> = {},
  ) {
    const postes: { url: string; corps: unknown }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.body) postes.push({ url, corps: JSON.parse(String(init.body)) });
      const corps = url.startsWith('/api/portail/session')
        ? {
            ok: true,
            patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
            consultation: null,
            premiereAssignation: null,
            statutAge,
            ...session,
          }
        : url.startsWith('/api/portail/trust/etat')
          ? { ok: true, avantDeCommencerRequis: false }
          : reponseDate;
      return { ok: true, json: async () => corps };
    }));
    return postes;
  }

  it('★ date manquante : la date est demandée, confirmée, puis le parcours reprend', async () => {
    const postes = stubPortail('date_manquante', { ok: true, statutAge: 'majeur' });
    render(<PortailPage />);

    await waitFor(() => expect(screen.getByText('Votre date de naissance')).not.toBeNull());
    expect(screen.queryByText('Merci !')).toBeNull();

    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1985-03-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByText('12 mars 1985')).not.toBeNull();
    expect(postes.filter(p => p.url === '/api/portail/date-naissance')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'C’est exact, enregistrer' }));
    await waitFor(() => expect(screen.getByText('Merci !')).not.toBeNull());
    expect(postes.find(p => p.url === '/api/portail/date-naissance')?.corps).toEqual({ dateNaissance: '1985-03-12' });
  });

  it('« Corriger » revient à la saisie sans rien envoyer', async () => {
    const postes = stubPortail('date_manquante', { ok: true, statutAge: 'majeur' });
    render(<PortailPage />);
    await waitFor(() => expect(screen.getByText('Votre date de naissance')).not.toBeNull());
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1985-03-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Corriger' }));
    expect(screen.getByLabelText('Date de naissance')).not.toBeNull();
    expect(postes.filter(p => p.url === '/api/portail/date-naissance')).toHaveLength(0);
  });

  it('★ une date de mineur laisse la pause en place, et le parcours accessible', async () => {
    stubPortail('date_manquante', { ok: true, statutAge: 'mineur', trancheMineur: '15_17' });
    render(<PortailPage />);
    await waitFor(() => expect(screen.getByText('Votre date de naissance')).not.toBeNull());
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '2010-05-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'C’est exact, enregistrer' }));
    // ACT-5 : l'écran sert le texte des mineurs (2B, D-537 §7) dans la variante
    // de la tranche rendue par la route, numéros appelables.
    await waitFor(() =>
      expect(screen.getByText('Avant 18 ans, ton accompagnement attend encore')).not.toBeNull(),
    );
    expect(screen.getByText('Ce que tes parents peuvent savoir')).not.toBeNull();
    for (const numero of ['15', '112', '119']) {
      expect(screen.getByRole('link', { name: numero }).getAttribute('href')).toBe(`tel:${numero}`);
    }
    expect(screen.queryByText('Merci !')).toBeNull();
    expect(screen.getByRole('link', { name: 'Accéder à mon parcours' }).getAttribute('href')).toBe(
      '/portail/PAT_TEST/questionnaires',
    );
  });

  // ACT-5 (D-341 §4) : le texte des mineurs n'est servi qu'à un dossier mineur
  // ouvert — ni à un majeur, ni à un dossier clos (jamais traité en mineur).
  const texteAttendu = (sections: readonly { titre: string; texte: string }[]) =>
    sections.flatMap(s => [s.titre, s.texte]).join('');
  const TITRE_MOINS_15 = 'Avant 15 ans, l’accompagnement ne se fait pas ici';
  const TITRE_15_17 = 'Avant 18 ans, ton accompagnement attend encore';

  it('★ une session mineure de 15 à 17 ans sert sa variante, entière et dans l’ordre', async () => {
    stubPortail('mineur', {}, { trancheMineur: '15_17' });
    const { container } = render(<PortailPage />);
    await waitFor(() => expect(screen.getByText(TITRE_15_17)).not.toBeNull());
    const carte = screen.getByRole('heading', { level: 2 }).closest('div.w-full');
    expect((carte ?? container).textContent).toContain(texteAttendu(TEXTE_MINEUR_15_17));
    expect(screen.queryByText(TITRE_MOINS_15)).toBeNull();
    expect(screen.queryByText('Merci !')).toBeNull();
  });

  it('★ une session mineure de moins de 15 ans sert sa variante, entière et dans l’ordre', async () => {
    stubPortail('mineur', {}, { trancheMineur: 'moins_15' });
    const { container } = render(<PortailPage />);
    await waitFor(() => expect(screen.getByText(TITRE_MOINS_15)).not.toBeNull());
    const carte = screen.getByRole('heading', { level: 2 }).closest('div.w-full');
    expect((carte ?? container).textContent).toContain(texteAttendu(TEXTE_MINEUR_MOINS_15));
    expect(screen.queryByText(TITRE_15_17)).toBeNull();
  });

  it('★ une tranche absente sert la variante des moins de 15 ans, qui n’annonce aucune ouverture', async () => {
    stubPortail('mineur', {});
    render(<PortailPage />);
    await waitFor(() => expect(screen.getByText(TITRE_MOINS_15)).not.toBeNull());
    expect(screen.queryByText(TITRE_15_17)).toBeNull();
  });

  it('★ un dossier mineur clos ne voit pas le texte des mineurs', async () => {
    stubPortail('mineur', {}, { dossierOuvert: false, trancheMineur: '15_17' });
    render(<PortailPage />);
    await waitFor(() => expect(screen.getByText('Merci !')).not.toBeNull());
    expect(screen.queryByText(TITRE_15_17)).toBeNull();
    expect(screen.queryByText(TITRE_MOINS_15)).toBeNull();
  });

  it('★ un dossier majeur ne voit pas le texte des mineurs', async () => {
    stubPortail('majeur', {});
    render(<PortailPage />);
    await waitFor(() => expect(screen.getByText('Merci !')).not.toBeNull());
    expect(screen.queryByText(TITRE_15_17)).toBeNull();
    expect(screen.queryByText(TITRE_MOINS_15)).toBeNull();
  });

  it('le refus de la route s’affiche, et la saisie reste possible', async () => {
    stubPortail('date_manquante', { ok: false, reason: 'invalid_payload', error: 'Cette date n’est pas valide.' });
    render(<PortailPage />);
    await waitFor(() => expect(screen.getByText('Votre date de naissance')).not.toBeNull());
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1985-03-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'C’est exact, enregistrer' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('pas valide'));
    expect(screen.getByLabelText('Date de naissance')).not.toBeNull();
  });
});
