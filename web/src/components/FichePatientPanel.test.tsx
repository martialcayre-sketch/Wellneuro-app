// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FichePatientPanel } from './FichePatientPanel';
import { C5FeatureProvider } from './patient-cockpit/C5FeatureProvider';
import type { DecisionCard } from '@/lib/clinical-engine/types';

// Patient fictif autorisé (CLAUDE.md) — aucune donnée réelle.
const EQUILIBRE = {
  patient: { idPatient: 'PAT001', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
  objetsCliniques: {
    indiceGlobal: 62,
    stabiliteMetabolique: null,
    reserveAdaptation: 48,
    clarte: null,
    momentum: null,
  },
  priorites: [
    { besoin: 1, libellePraticien: 'Sommeil réparateur', strate: 'CORPS', couverture: 40, niveauPreuve: 'A' },
    { besoin: 2, libellePraticien: 'Ancrage du matin', strate: 'ANCRAGE', couverture: null, niveauPreuve: 'D' },
  ],
};

const REPONSES = {
  reponses: [
    {
      idReponse: 'REP001',
      idAssignation: 'ASG001',
      idQuestionnaire: 'NEU_03',
      titre: 'Questionnaire sommeil',
      dateSoumission: '2026-07-01T10:00:00.000Z',
      scorePrincipal: 18,
      interpretation: 'Vigilance modérée',
      scoresParsed: null,
      subScoreRanges: null,
    },
  ],
};

// DecisionCard complète et actionnable (mêmes conventions que ProtocolMiniBuilder.test).
function decisionCard(): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [] }],
    proposedMainPriorityId: 'p1', selectedMainPriority: { candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'hash',
  };
}

type Options = {
  runtime?: 'ready' | 'proposal' | 'unauthenticated' | 'unavailable';
  assignationsModif?: boolean;
  trajectoire?: 'ok' | '401' | 'cycleT0Seul' | 'cycleJ21Mesure' | 'enVol';
};

// Cycle de trajectoire : T0 toujours mesuré (l'ancre), J21 selon le scénario.
// Un T0 confirmé seul ne constitue PAS une réévaluation (A8-2).
function cycleTrajectoire(j21Mesure: boolean) {
  return {
    cycleId: 'ep_T0',
    dateT0: '2026-06-01T00:00:00.000Z',
    versionScore: 'v1',
    jalons: [
      { jalon: 'T0', mesure: true, valeur: 40, date: '2026-06-01T00:00:00.000Z' },
      { jalon: 'J21', mesure: j21Mesure, valeur: j21Mesure ? 55 : null, date: j21Mesure ? '2026-06-22T00:00:00.000Z' : null },
      { jalon: 'J42', mesure: false, valeur: null, date: null },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
  };
}

function stubFetch(options: Options = {}) {
  const runtime = options.runtime ?? 'unavailable';
  const assignationsModif = options.assignationsModif ?? false;
  const trajectoire = options.trajectoire ?? 'ok';

  const fetchMock = vi.fn((input: unknown) => {
    const url = String(input);
    const ok = (payload: unknown, status = 200) =>
      Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(payload) });

    if (url.includes('/api/praticien/equilibre')) return ok(EQUILIBRE);
    if (url.includes('/api/praticien/besoins')) {
      return ok({
        patient: EQUILIBRE.patient,
        besoins: EQUILIBRE.priorites.map(p => ({ ...p, id: p.besoin, sources: [] })),
      });
    }
    if (url.includes('/api/praticien/reponses')) return ok(REPONSES);
    if (url.includes('/api/praticien/patients')) {
      return ok({
        assignations: assignationsModif
          ? [{
              idAssignation: 'ASG001',
              emailPatient: 'sophie.nicola@example.test',
              statutReponses: 'modification_demandee',
              titre: 'Questionnaire sommeil',
              idQuestionnaire: 'NEU_03',
              correctionCommentaire: 'Je me suis trompée sur une question.',
            }]
          : [],
      });
    }
    if (url.includes('/api/praticien/trajectoire')) {
      // Requête volontairement laissée EN VOL : simule la fenêtre transitoire
      // pendant laquelle la lecture n'a pas encore abouti.
      if (trajectoire === 'enVol') return new Promise(() => {});
      if (trajectoire === '401') {
        return ok({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, 401);
      }
      const cycles =
        trajectoire === 'cycleT0Seul'
          ? [cycleTrajectoire(false)]
          : trajectoire === 'cycleJ21Mesure'
            ? [cycleTrajectoire(true)]
            : [];
      return ok({
        ok: true,
        trajectoire: {
          index: [],
          cycles,
          comparaison: { disponible: false, raison: cycles.length > 0 ? 'un_seul_cycle' : 'aucun_cycle' },
        },
      });
    }
    // Runtime clinique C1.
    if (url.includes('/api/praticien/cockpit')) {
      if (runtime === 'ready') return ok({ status: 'ready', snapshot: {}, review: { missingData: null, discordances: null }, decisionCard: decisionCard() });
      if (runtime === 'proposal') return ok({ status: 'proposal_required', proposal: { assessmentEpisodeId: 'ep1', milestone: 'T0', inWindowResponseIds: [], candidateResponses: [] }, proposalHash: 'h' });
      if (runtime === 'unauthenticated') return ok({ status: 'unavailable', reason: 'unauthenticated', error: 'Authentification requise.' }, 401);
      return ok({ status: 'unavailable', reason: 'exception', error: 'Indisponible.' });
    }
    if (url.includes('/api/praticien/protocoles/versions')) return ok({ ok: true, active: null, history: [] });
    if (url.includes('/api/praticien/protocoles/diffusion')) return ok({ ok: true, approval: null, stale: false });
    if (url.includes('/api/praticien/protocoles/checkins')) return ok({ ok: true, resume: null });
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function rendreFiche(options: Options = {}) {
  stubFetch(options);
  render(
    <C5FeatureProvider enabled={false}>
      <FichePatientPanel idPatient="PAT001" />
    </C5FeatureProvider>,
  );
  await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));
}

describe('FichePatientPanel — poste de pilotage (A6-R1)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('rend le rail des 7 phases du cycle clinique, phase « Décision 21 j » sélectionnée', async () => {
    await rendreFiche();

    const rail = screen.getByRole('tablist', { name: 'Cycle clinique' });
    expect(rail.getAttribute('aria-orientation')).toBe('vertical');

    const phases = ['Patient', 'Données fiables', 'Compréhension', 'Décision 21 j', 'Actions', 'Suivi', 'Réévaluation'];
    for (const libelle of phases) {
      expect(screen.getByRole('tab', { name: new RegExp(libelle, 'i') })).toBeTruthy();
    }

    const decision = screen.getByRole('tab', { name: /Décision 21 j/i });
    expect(decision.getAttribute('aria-selected')).toBe('true');
    // Statut jamais porté par la seule couleur : un libellé texte accompagne
    // l'icône. Runtime indisponible ici → statut honnêtement « indéterminée ».
    expect(decision.textContent).toMatch(/en attente|à ouvrir|renseignée|indéterminée/);
  });

  it('navigue de phase en phase au clic et au clavier, sans quitter la page', async () => {
    await rendreFiche();

    fireEvent.click(screen.getByRole('tab', { name: /Patient/i }));
    const patient = screen.getByRole('tab', { name: /Patient/i });
    expect(patient.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/Dernière réponse reçue le/i)).toBeTruthy();

    // Flèche bas → phase suivante du cycle.
    fireEvent.keyDown(patient, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Données fiables/i }).getAttribute('aria-selected')).toBe('true'),
    );
    expect(screen.getByText(/1 questionnaire\(s\) reçu\(s\)/i)).toBeTruthy();
  });

  it('ouvre puis referme un instrument à tiroir (au clic, jamais au survol)', async () => {
    await rendreFiche();

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Les 12 besoins/i }));
    const tiroir = await screen.findByRole('dialog');
    expect(tiroir.textContent).toContain('Sommeil réparateur');

    fireEvent.click(screen.getByRole('button', { name: /Fermer l’instrument Les 12 besoins/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('onglets in-fiche : navigation clavier (flèches) et bascule vers la trajectoire', async () => {
    await rendreFiche();

    const onglets = screen.getByRole('tablist', { name: 'Vues de la fiche patient' });
    const cockpitTab = within(onglets).getByRole('tab', { name: 'Poste de pilotage' });
    expect(cockpitTab.getAttribute('aria-selected')).toBe('true');

    // B1 : les flèches doivent déplacer la sélection (tabindex roving).
    fireEvent.keyDown(cockpitTab, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(within(onglets).getByRole('tab', { name: 'Les 12 besoins' }).getAttribute('aria-selected')).toBe('true'),
    );

    fireEvent.click(within(onglets).getByRole('tab', { name: 'Trajectoire' }));
    await waitFor(() => expect(screen.getByText(/Fiche-trajectoire/i)).toBeTruthy());
    // Le poste de pilotage est masqué, jamais démonté d'un scroll de page.
    expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(true);
  });

  it('préserve le brouillon de protocole en changeant de phase (hidden, pas démontage)', async () => {
    await rendreFiche({ runtime: 'ready' });

    // Passe en phase Actions et saisit une raison d'être.
    fireEvent.click(screen.getByRole('tab', { name: /Actions/i }));
    const raison = await screen.findByLabelText('Raison d’être');
    fireEvent.change(raison, { target: { value: 'Soutenir le sommeil' } });
    expect((raison as HTMLTextAreaElement).value).toBe('Soutenir le sommeil');

    // Détour par Suivi puis retour : le champ conserve sa valeur.
    fireEvent.click(screen.getByRole('tab', { name: /Suivi/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Actions/i }));
    expect((screen.getByLabelText('Raison d’être') as HTMLTextAreaElement).value).toBe('Soutenir le sommeil');
  });

  it('rend une demande de correction perceptible sans sélectionner la phase Patient (B2)', async () => {
    await rendreFiche({ assignationsModif: true });

    // Phase par défaut = Décision : le signal doit tout de même être visible.
    expect(screen.getByRole('tab', { name: /Décision 21 j/i }).getAttribute('aria-selected')).toBe('true');
    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());
    // Et le rail signale la phase Patient « en attente », pas « renseignée ».
    expect(screen.getByRole('tab', { name: /Patient/i }).textContent).toContain('en attente');
  });

  it('affiche un état vide explicite en Suivi et Réévaluation sans épisode confirmé (M3)', async () => {
    await rendreFiche({ runtime: 'proposal' });

    fireEvent.click(screen.getByRole('tab', { name: /Suivi/i }));
    await waitFor(() => expect(screen.getByText(/doit d’abord être ouverte pour suivre/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    await waitFor(() => expect(screen.getByText(/se construit après confirmation d’un épisode/i)).toBeTruthy());
  });

  it('affiche l’erreur de session runtime même hors phase Décision (M1)', async () => {
    await rendreFiche({ runtime: 'unauthenticated' });

    fireEvent.click(screen.getByRole('tab', { name: /Actions/i }));
    await waitFor(() => expect(screen.getByText(/Votre session a expiré/i)).toBeTruthy());
  });

  it('n’affiche pas « aucun épisode » quand la trajectoire échoue (M2)', async () => {
    await rendreFiche({ trajectoire: '401' });

    fireEvent.click(screen.getByRole('tab', { name: 'Trajectoire' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/session a expiré/i)).toBeTruthy();
    expect(screen.queryByText(/Aucun épisode confirmé/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });

  it('phase Réévaluation : un échec de lecture de la trajectoire n’est pas « aucun épisode » (M2, chemin cockpit)', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: '401' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/n'a pas pu être lue/i)).toBeTruthy();
    expect(screen.queryByText(/Aucun épisode confirmé/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    // Le rail ne prétend rien : statut « indéterminée », jamais « à ouvrir ».
    expect(screen.getByRole('tab', { name: /Réévaluation/i }).textContent).toContain('indéterminée');
  });

  it('phase Réévaluation : pendant la lecture de la trajectoire, affiche « chargement » et pas « aucun épisode » (chemin cockpit)', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'enVol' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    // Requête en vol : état « chargement » explicite, jamais une affirmation
    // d'absence d'épisode, et le rail reste « indéterminée », pas « à ouvrir ».
    expect(await screen.findByText(/Chargement de la trajectoire/i)).toBeTruthy();
    expect(screen.queryByText(/Aucun épisode confirmé/i)).toBeNull();
    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    expect(onglet.textContent).toContain('indéterminée');
    expect(onglet.textContent).not.toContain('à ouvrir');
  });

  it('statut Réévaluation : un T0 confirmé sans jalon mesuré ne vaut pas « renseignée »', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'cycleT0Seul' });

    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    await waitFor(() => expect(onglet.textContent).toContain('à ouvrir'));
    expect(onglet.textContent).not.toContain('renseignée');
  });

  it('statut Réévaluation : « renseignée » quand un jalon post-T0 est réellement mesuré', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'cycleJ21Mesure' });

    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    await waitFor(() => expect(onglet.textContent).toContain('renseignée'));
  });
});
