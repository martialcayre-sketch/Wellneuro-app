// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Le chargeur importe Prisma par ses modules ; ce banc n'en lit rien.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { FichePatientPanel } from '@/components/FichePatientPanel';
import { C5FeatureProvider } from '@/components/patient-cockpit/C5FeatureProvider';
import { LIBELLES_ETAPES } from '@/components/cabinet/ComptesCabinetPanel';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import type { JalonMomentum } from '@/lib/equilibre/types';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import { etapeDuDossier, type EtapeCompte, type LectureCockpit } from './comptesCabinet';

// PARITÉ FICHE ↔ PAGE ([[D-385]], plan J3-cabinet §5). Un même scénario nourrit
// les deux lecteurs : la fiche, par les réponses de ses routes ; la page, par
// les lecteurs injectés de `etapeDuDossier`. Le banc vérifie deux choses :
// - LA MÊME PHASE : le fil « Prochaine étape : X » de la fiche, et le rangement
//   du dossier sous X par la page ;
// - L'ÉLECTION DU JALON : la suite des jalons demandés au cockpit est la même
//   des deux côtés — c'est l'endroit où la parité casserait sans bruit.
//
// Ce qu'il ne couvre pas, et le dit : l'écart des plus de 40 envois (la fiche
// tronque et rend « indéterminée », la page lit la liste entière — écart
// accepté le 2026-10-27, éprouvé par `comptesCabinet.test.ts`) ; les lectures elles-mêmes (Prisma
// contre routes), que chaque lecteur transcrit de sa route.
//
// Identités de fixture seules (CLAUDE.md).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  try {
    window.localStorage.clear();
  } catch {
    // jsdom sans stockage : rien à purger.
  }
});

const JOUR = 86_400_000;
const ilYa = (jours: number) => new Date(Date.now() - jours * JOUR).toISOString();

function carte(surcharges: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'runtime-decision-fixture', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [] }],
    proposedMainPriorityId: 'p1', selectedMainPriority: { candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'hash',
    ...surcharges,
  };
}

const RIDEAU_SATISFAIT = {
  dures: [{ id: 'rideau_t0', libelle: 'Premier rideau renseigné et cotable', satisfaite: true, detail: null }],
  souples: [],
  bloquant: false,
  contournementsRequis: [],
};

function cycleT0(dateAncre: string, jourZero: string | null) {
  return {
    cycleId: 'ep_T0',
    ancre: 'T0',
    dateAncre,
    jourZero,
    versionScore: 'v1',
    jalons: [
      { jalon: 'T0', mesure: true, valeur: 40, date: dateAncre },
      { jalon: 'J21', mesure: false, valeur: null, date: null },
      { jalon: 'J42', mesure: false, valeur: null, date: null },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
    momentumParBesoin: [],
  };
}

type Scenario = {
  titre: string;
  idPatient: string;
  prenom: string;
  nom: string;
  /** La réponse du cockpit par jalon demandé. */
  cockpit: Partial<Record<JalonMomentum, LectureCockpit>>;
  cycles: ReturnType<typeof cycleT0>[];
  phase3: { objectifsActifs: number; synthesePubliee: boolean; demandesCorrectionEnAttente: number };
  diffusionApprouvee: boolean;
  /** Ce que la page doit compter — et la fiche désigner. */
  attendu: EtapeCompte;
  /** Les jalons demandés au cockpit, dans l'ordre. */
  jalonsDemandes: JalonMomentum[];
};

const PHASE3_FAITE = { objectifsActifs: 1, synthesePubliee: true, demandesCorrectionEnAttente: 0 };

const SCENARIOS: Scenario[] = [
  {
    titre: 'dossier neuf, rideau complet : la décision est exigible',
    idPatient: 'PAT_SEED_01',
    prenom: 'Sophie',
    nom: 'Nicola',
    cockpit: { T0: { statut: 'proposal_required', preconditions: RIDEAU_SATISFAIT } },
    cycles: [],
    phase3: { objectifsActifs: 0, synthesePubliee: false, demandesCorrectionEnAttente: 0 },
    diffusionApprouvee: false,
    attendu: 'decision',
    jalonsDemandes: ['T0'],
  },
  {
    titre: 'T0 rejoué, protocole jamais diffusé, synthèse non publiée : Compréhension',
    idPatient: 'PAT_SEED_02',
    prenom: 'Jennifer',
    nom: 'Martin',
    cockpit: { T0: { statut: 'ready', carte: carte() } },
    cycles: [cycleT0(ilYa(10), null)],
    phase3: { objectifsActifs: 1, synthesePubliee: false, demandesCorrectionEnAttente: 0 },
    diffusionApprouvee: false,
    attendu: 'comprehension',
    jalonsDemandes: ['T0'],
  },
  {
    titre: 'J21 dû, diffusion de l’ancre approuvée : l’élection avance au J21',
    idPatient: 'PAT_SEED_03',
    prenom: 'Michel',
    nom: 'Dogné',
    cockpit: {
      T0: { statut: 'ready', carte: carte() },
      J21: { statut: 'proposal_required', preconditions: undefined },
    },
    cycles: [cycleT0(ilYa(25), ilYa(21))],
    phase3: PHASE3_FAITE,
    diffusionApprouvee: true,
    attendu: 'reevaluation',
    jalonsDemandes: ['T0', 'J21'],
  },
  {
    titre: 'J21 dû, diffusion de l’ancre non approuvée : le suivi est retenu sur la carte T0',
    idPatient: 'PAT_SEED_03',
    prenom: 'Michel',
    nom: 'Dogné',
    cockpit: { T0: { statut: 'ready', carte: carte() } },
    cycles: [cycleT0(ilYa(25), ilYa(21))],
    phase3: PHASE3_FAITE,
    diffusionApprouvee: false,
    attendu: 'actions',
    jalonsDemandes: ['T0'],
  },
];

function trajectoireDe(s: Scenario) {
  return {
    index: s.cycles.flatMap(c => c.jalons.filter(j => j.mesure && j.date).map(j => ({ milestone: j.jalon, date: j.date }))),
    cycles: s.cycles,
    comparaison: { disponible: false, raison: s.cycles.length > 0 ? 'un_seul_cycle' : 'aucun_cycle' },
    discordanceOrdreCycles: false,
  };
}

/** Quatre envois rendus : seul leur nombre compte. Identiques pour la fiche et la page. */
function envois(idPatient: string) {
  return ['Q_MOD_03', 'Q_MOD_01', 'Q_INF_03', 'Q_NEU_11'].map(idQuestionnaire => ({
    idAssignation: `ASG_${idQuestionnaire}`,
    idPatient,
    emailPatient: 'fixture@example.test',
    statut: 'Complété',
    statutReponses: 'verrouille',
    titre: idQuestionnaire,
    idQuestionnaire,
    dateAssignation: ilYa(30),
    correctionCommentaire: null,
    aPassation: true,
    dateLimite: null,
    nbJourneesAgenda: null,
  }));
}

/** Les routes de la fiche, servies depuis le scénario. */
function stubFiche(s: Scenario) {
  const demandes: string[] = [];
  const fetchMock = vi.fn((input: unknown) => {
    const url = String(input);
    const ok = (payload: unknown, status = 200) =>
      Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(payload) });
    const params = new URL(url, 'http://test.local').searchParams;
    if (url.includes('/api/praticien/equilibre')) {
      return ok({
        patient: { idPatient: s.idPatient, prenom: s.prenom, nom: s.nom, email: 'fixture@example.test' },
        objetsCliniques: {
          indiceGlobal: null, besoinsMesures: 0, besoinsTotal: 12, stabiliteMetabolique: null,
          stabiliteMetaboliqueSources: [], reserveAdaptation: null, clarte: null, momentum: null,
          plafondApplique: false, versionCalcul: 'v15',
          provenance: { indiceGlobal: null, stabiliteMetabolique: null, reserveAdaptation: null, clarte: null, momentum: null },
        },
        priorites: [],
      });
    }
    if (url.includes('/api/praticien/objectifs/etat-phase')) return ok({ ok: true, etat: s.phase3 });
    if (url.includes('/api/praticien/reponses')) return ok({ reponses: [] });
    if (url.includes('/api/praticien/patients')) {
      const filtreReponses = params.get('statutReponses');
      const echeance = params.get('echeanceDepassee') === '1';
      const liste = filtreReponses === null && !echeance ? envois(s.idPatient) : [];
      return ok({
        patients: filtreReponses === null && !echeance
          ? [{ idPatient: s.idPatient, prenom: s.prenom, nom: s.nom, email: 'fixture@example.test', actif: 'OUI', accesRevoque: false, suiviClotureLe: null }]
          : undefined,
        assignations: liste,
        assignationsMeta: {
          total: liste.length, plafond: 40, statut: null, statutReponses: filtreReponses,
          echeanceDepassee: echeance, idPatient: s.idPatient,
        },
      });
    }
    if (url.includes('/api/praticien/trajectoire')) return ok({ ok: true, trajectoire: trajectoireDe(s) });
    if (url.includes('/api/praticien/cockpit')) {
      const jalon = (params.get('milestone') ?? 'T0') as JalonMomentum;
      demandes.push(jalon);
      const lue = s.cockpit[jalon];
      if (!lue) return ok({ status: 'unavailable', reason: 'exception', error: 'Indisponible.' }, 500);
      if (lue.statut === 'ready') {
        return ok({
          status: 'ready', snapshot: {}, review: { missingData: null, discordances: null },
          decisionCard: lue.carte, contradictions: [], rejoue: true,
        });
      }
      return ok({
        status: 'proposal_required',
        proposal: { assessmentEpisodeId: `ep_${jalon}`, milestone: jalon, inWindowResponseIds: [], candidateResponses: [] },
        proposalHash: 'h',
        ...(lue.preconditions ? { preconditions: lue.preconditions } : {}),
      });
    }
    if (url.includes('/api/praticien/protocoles/versions')) return ok({ ok: true, active: null, history: [] });
    if (url.includes('/api/praticien/protocoles/diffusion')) {
      return ok({
        ok: true,
        approval: s.diffusionApprouvee
          ? { approvalId: 'a1', protocolDraftInputHash: 'h1', approvedAt: ilYa(21) }
          : null,
        stale: false,
      });
    }
    if (url.includes('/api/praticien/protocoles/checkins')) {
      return ok({ ok: true, checkins: [], resume: { score: null, points: [], pointsRenseignes: 0 } });
    }
    if (url.includes('/api/praticien/objectifs')) {
      return ok({
        ok: true, objectifs: [], trajectoires: [],
        ancrage: { consultationValidee: false, motifPrincipal: null, objectifPrioritaire: null, attentes: [] },
        ratifications: {},
      });
    }
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return demandes;
}

/** La page : les mêmes faits, par les lecteurs injectés. */
async function etapeDeLaPage(s: Scenario) {
  const demandes: JalonMomentum[] = [];
  const etape = await etapeDuDossier(
    {
      trajectoire: trajectoireDe(s) as unknown as Trajectoire,
      correctionsEnAttente: 0,
      envoisAssignes: envois(s.idPatient).length,
      phase3: s.phase3,
    },
    {
      lireCockpit: async jalon => {
        demandes.push(jalon);
        const lue = s.cockpit[jalon];
        if (!lue) throw new Error(`jalon ${jalon} non prévu par le scénario`);
        return lue;
      },
      diffusionApprouvee: async () => s.diffusionApprouvee,
      compterVersions: async () => 0,
      compterPointsRenseignes: async () => 0,
    },
    new Date(),
  );
  return { etape, demandes };
}

describe('parité fiche ↔ page des comptes (D-385, J3-cabinet §5)', () => {
  it.each(SCENARIOS.map(s => [s.titre, s] as const))('%s', async (_titre, s) => {
    const page = await etapeDeLaPage(s);
    expect(page.etape).toBe(s.attendu);
    expect(page.demandes).toEqual(s.jalonsDemandes);

    const demandesFiche = stubFiche(s);
    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient={s.idPatient} />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(screen.getAllByText(`${s.prenom} ${s.nom}`).length).toBeGreaterThan(0));
    // L'élection est finie quand le dernier jalon attendu a été demandé.
    await waitFor(() => expect(demandesFiche.at(-1)).toBe(s.jalonsDemandes.at(-1)));

    // Le fil se tait sur la phase affichée : on en affiche une autre.
    const autre = s.attendu === 'reevaluation' ? /^1\. Patient/i : /Réévaluation/i;
    fireEvent.click(screen.getByRole('tab', { name: autre }));
    const libelle = LIBELLES_ETAPES[s.attendu];
    await waitFor(() => expect(screen.getByText(new RegExp(`Prochaine étape : ${libelle}`))).toBeTruthy());

    // La même suite de jalons, sans doublon de rendu (la fiche ne redemande
    // jamais le jalon courant).
    expect([...new Set(demandesFiche)]).toEqual(s.jalonsDemandes);
  });
});
