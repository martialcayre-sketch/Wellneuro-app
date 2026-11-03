// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { CleSonde } from '@/components/patient/autres-espaces/entreesAutresEspaces';

/*
 * CÂBLAGE DES RAPPELS `onSonde` DU HUB (lot L1 de l'audit « rails et menus »).
 * Le rendu de L1 ne lit pas encore l'état des sondes : permuter deux props
 * `onSonde` ne changerait ni les requêtes ni l'écran. Ce banc l'épingle
 * directement — chaque `Lien*` reçoit le rapporteur de SA clé —, avant que le
 * regroupement de D-423 (L2) ne s'en serve. Relevé par la revue CodeRabbit de
 * la PR #1840.
 */

const { routeur, recus, rapporteurs } = vi.hoisted(() => {
  const cles = [
    'fiches',
    'bibliotheque',
    'courrierMedecin',
    'courrierComplement',
    'pourVotreMedecin',
    'compteRendu',
    'depot',
    'renseignements',
    'echanges',
    'dossier',
  ] as const;
  return {
    routeur: { replace: () => undefined, push: () => undefined },
    recus: {} as Record<string, unknown>,
    rapporteurs: Object.fromEntries(cles.map(cle => [cle, () => undefined])) as Record<string, () => void>,
  };
});

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_TEST' }),
  useRouter: () => routeur,
}));

vi.mock('@/components/patient/autres-espaces/entreesAutresEspaces', async importOriginal => ({
  ...(await importOriginal<object>()),
  useEtatsSondes: () => ({ etats: {}, rapporteurs }),
}));

function capteur(cle: CleSonde) {
  return ({ onSonde }: { onSonde?: unknown }) => {
    recus[cle] = onSonde;
    return null;
  };
}

vi.mock('@/components/patient-companion/LienFichesRemises', () => ({ LienFichesRemises: capteur('fiches') }));
vi.mock('@/components/patient-companion/LienBibliotheque', () => ({ LienBibliotheque: capteur('bibliotheque') }));
vi.mock('@/components/patient-companion/LienCourrierMedecin', () => ({ LienCourrierMedecin: capteur('courrierMedecin') }));
vi.mock('@/components/patient-companion/LienCourrierComplement', () => ({ LienCourrierComplement: capteur('courrierComplement') }));
vi.mock('@/components/patient-companion/LienPourVotreMedecin', () => ({ LienPourVotreMedecin: capteur('pourVotreMedecin') }));
vi.mock('@/components/patient-companion/LienTransmissionCompteRendu', () => ({ LienTransmissionCompteRendu: capteur('compteRendu') }));
vi.mock('@/components/patient-companion/LienDepotDocuments', () => ({ LienDepotDocuments: capteur('depot') }));
vi.mock('@/components/physio-traitements/LienFicheRenseignements', () => ({ LienFicheRenseignements: capteur('renseignements') }));
vi.mock('@/components/patient-companion/LienMesEchanges', () => ({ LienMesEchanges: capteur('echanges') }));
vi.mock('@/components/patient-companion/LienDossierDeuxVoix', () => ({ LienDossierDeuxVoix: capteur('dossier') }));

import QuestionnairesHubPage from './page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('« Autres espaces » — câblage des rappels onSonde', () => {
  it('chaque Lien* reçoit le rapporteur de sa propre clé', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const corps = url.startsWith('/api/portail/assignations')
        ? {
            ok: true,
            patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola' },
            assignations: [],
            agendas: [],
            agendasAlimentaires: [],
            derniereReponseLe: null,
            parcours: { consultationStatut: null, bookletEnvoye: false, bilanConsultable: false },
            statutAge: 'majeur',
            dossierOuvert: true,
          }
        : { ok: false, error: 'indisponible' };
      return { ok: true, status: 200, json: async () => corps };
    }));
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(Object.keys(recus)).toHaveLength(10));
    for (const cle of Object.keys(rapporteurs)) {
      expect([cle, recus[cle] === rapporteurs[cle]]).toEqual([cle, true]);
    }
  });
});
