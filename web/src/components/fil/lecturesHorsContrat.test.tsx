// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { cleanup, render, within } from '@testing-library/react';
import { CorrespondanceRecente } from './CorrespondanceRecente';
import { InboxQuestionnaires } from './InboxQuestionnaires';
import { NouveauxPatientsAside } from './NouveauxPatientsAside';
import { MeteoAdhesionAside } from './MeteoAdhesionAside';
import { FilDuJour } from './FilDuJour';
import { AgendasEnCoursAside } from '../agenda-sommeil/AgendasEnCoursAside';

// PRA-6h (pra6-constat §3.2, règle `error-recovery`). Une réponse hors contrat
// — un 500 JSON `{error}` d'un autre émetteur que nos routes — faisait tomber
// P01 et P53 sur l'erreur globale : chaque panneau lisait `data.lignes` sans
// tester `r.ok` ni la forme. Elle doit tomber dans l'état d'échec EXISTANT du
// panneau, avec son texte actuel — aucun texte neuf.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

function horsContrat() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Erreur interne' }),
      }) as unknown as Response,
    ),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CAS: Array<[string, () => ReactElement, string]> = [
  ['Correspondance récente (P01, P53)', () => <CorrespondanceRecente />, 'La correspondance est momentanément indisponible. Rechargez la page.'],
  ['Inbox questionnaires (P01)', () => <InboxQuestionnaires />, 'momentanément indisponible. Rechargez la page.'],
  ['Nouveaux patients (P01)', () => <NouveauxPatientsAside />, 'Les nouveaux patients sont momentanément indisponibles. Rechargez la page.'],
  ['Météo d’adhésion (P01)', () => <MeteoAdhesionAside />, 'La Météo est momentanément indisponible. Rechargez la page.'],
  ['Agendas en cours (P01)', () => <AgendasEnCoursAside />, 'Le suivi des agendas est momentanément indisponible. Rechargez la page.'],
  ['Le Fil du jour (P01)', () => <FilDuJour />, 'Le Fil est momentanément indisponible. Rechargez la page ou vérifiez votre session.'],
];

describe('P01 et P53 — une réponse hors contrat reste dans son panneau (PRA-6h)', () => {
  it.each(CAS)('%s : 500 `{error}` → état d’échec du panneau, sans exception', async (_nom, rendre, texte) => {
    horsContrat();
    const { container } = render(rendre());
    expect(await within(container).findByText(texte, { exact: false })).toBeTruthy();
  });
});
