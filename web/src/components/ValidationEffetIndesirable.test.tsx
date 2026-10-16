// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValidationEffetIndesirable as Validation } from '@/app/api/praticien/trust/route';
import { ValidationEffetIndesirable } from './ValidationEffetIndesirable';

// L'AVIS DU PRATICIEN SUR UN SIGNALEMENT RATTACHÉ, OU DU FORMULAIRE D'AVANT
// ([[D-281]] §5, étape 4).

const ELEMENTS = [
  { actionId: 'a-magnesium', title: 'Magnésium le soir' },
  { actionId: 'a-marche', title: 'Marche de vingt minutes' },
];
const PAR_ELEMENT: Validation = {
  rattachement: 'element',
  elementDesigne: { actionId: 'a-magnesium', title: 'Magnésium le soir' },
  elements: ELEMENTS,
  avisSansElement: false,
  verdicts: [],
  verdictCourantId: null,
};

let corps: Record<string, unknown> | null = null;
let reponse: unknown = { ok: true, id: 'v1' };

beforeEach(() => {
  corps = null;
  reponse = { ok: true, id: 'v1' };
  global.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    corps = JSON.parse(String(init?.body));
    return Promise.resolve({ json: () => Promise.resolve(reponse) } as Response);
  }) as unknown as typeof fetch;
});
afterEach(cleanup);

function afficher(validation: Validation, onEnregistre = vi.fn(() => Promise.resolve()), pauseServie = false) {
  render(
    <ValidationEffetIndesirable
      reportId="s1"
      validation={validation}
      debutPriseLe="2026-10-03T00:00:00.000Z"
      debutSymptomesLe={null}
      pauseServie={pauseServie}
      onEnregistre={onEnregistre}
    />,
  );
  return onEnregistre;
}

describe('ValidationEffetIndesirable', () => {
  it('montre l’élément désigné, les dates, l’attente, et dit que rien n’est encore en pause', () => {
    afficher(PAR_ELEMENT);
    expect(screen.getByText('Magnésium le soir')).toBeTruthy();
    expect(screen.getByText(/Début de la prise : 3 octobre 2026/)).toBeTruthy();
    expect(screen.getByText(/Début des symptômes : non renseigné/)).toBeTruthy();
    expect(screen.getByText('En attente de votre avis.')).toBeTruthy();
    expect(screen.getByText(/pas encore signée : rien n’est mis en pause/)).toBeTruthy();
  });

  it('élément désigné : « impliqué » + aménagement envoie l’avis sans élément (la route prend celui du patient)', async () => {
    const onEnregistre = afficher(PAR_ELEMENT);
    const bouton = screen.getByText('Enregistrer l’avis') as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Impliqué'));
    expect(bouton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Réduire'));
    fireEvent.submit(bouton.closest('form')!);
    await waitFor(() => expect(onEnregistre).toHaveBeenCalled());
    expect(corps).toEqual({ reportId: 's1', verdict: 'implique', amenagement: 'reduire', supersedesVerdictId: null });
  });

  it('« Je ne sais pas » : le praticien choisit l’élément en cause', async () => {
    afficher({ ...PAR_ELEMENT, rattachement: 'ne_sait_pas', elementDesigne: null });
    expect(screen.getByText(/ne sait pas à quel élément/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Un élément du programme est en cause'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a-marche' } });
    fireEvent.click(screen.getByLabelText('Différer'));
    fireEvent.submit(screen.getByText('Enregistrer l’avis').closest('form')!);
    await waitFor(() => expect(corps).not.toBeNull());
    expect(corps).toEqual({
      reportId: 's1', verdict: 'implique', amenagement: 'differer', elementActionId: 'a-marche', supersedesVerdictId: null,
    });
  });

  it('avis en vigueur : la correction le nomme, l’ancien reste lisible', async () => {
    afficher({
      ...PAR_ELEMENT,
      verdicts: [
        { id: 'v1', verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'retirer', renduPar: 'a@wellneuro.fr', renduLe: '2026-10-10T10:00:00.000Z', supersedesVerdictId: null },
        { id: 'v2', verdict: 'non_implique', elementActionId: null, amenagement: null, renduPar: 'a@wellneuro.fr', renduLe: '2026-10-11T10:00:00.000Z', supersedesVerdictId: 'v1' },
      ],
      verdictCourantId: 'v2',
    });
    expect(screen.getByText('Non impliqué', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByText('Avis corrigés (1)')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Impliqué'));
    fireEvent.click(screen.getByLabelText('Retirer'));
    fireEvent.submit(screen.getByText('Enregistrer la correction').closest('form')!);
    await waitFor(() => expect(corps).not.toBeNull());
    expect(corps).toMatchObject({ supersedesVerdictId: 'v2' });
  });

  it('un refus de la route s’affiche, rien n’est rechargé', async () => {
    reponse = { ok: false, error: 'Un avis a été rendu ou corrigé entre-temps sur ce signalement. Rechargez avant de le corriger.' };
    const onEnregistre = afficher(PAR_ELEMENT);
    fireEvent.click(screen.getByLabelText('Non impliqué'));
    fireEvent.submit(screen.getByText('Enregistrer l’avis').closest('form')!);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onEnregistre).not.toHaveBeenCalled();
  });

  it('règle signée : seul « non impliqué » lève la pause, « impliqué » la maintient', () => {
    afficher(PAR_ELEMENT, undefined, true);
    expect(screen.getByText(/« non impliqué » lève la pause au portail, « impliqué » la maintient/)).toBeTruthy();
    expect(screen.queryByText(/pas encore signée/)).toBeNull();
  });

  // D-281 §5, arbitrage du 2026-10-14 : « oui » au programme sans élément.
  it('formulaire d’avant : le dit, et le praticien désigne l’élément en cause ou aucun', async () => {
    afficher({ ...PAR_ELEMENT, rattachement: null, elementDesigne: null });
    expect(screen.getByText(/associe cet effet à son programme, sans désigner d’élément \(formulaire d’avant\)/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Un élément du programme est en cause'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a-magnesium' } });
    fireEvent.click(screen.getByLabelText('Retirer'));
    fireEvent.submit(screen.getByText('Enregistrer l’avis').closest('form')!);
    await waitFor(() => expect(corps).not.toBeNull());
    expect(corps).toEqual({
      reportId: 's1', verdict: 'implique', amenagement: 'retirer', elementActionId: 'a-magnesium', supersedesVerdictId: null,
    });
  });

  it('formulaire d’avant, règle signée : rien en pause au portail, seul l’avis lève l’attente', () => {
    afficher({ ...PAR_ELEMENT, rattachement: null, elementDesigne: null }, undefined, true);
    expect(screen.getByText(/rien n’est mis en pause au portail\. Seul votre avis met fin à l’attente/)).toBeTruthy();
    expect(screen.queryByText(/lève la pause au portail/)).toBeNull();
  });

  it('programme lisible sans élément désignable : le message le dit, sans le dire illisible', () => {
    afficher({ ...PAR_ELEMENT, rattachement: 'ne_sait_pas', elementDesigne: null, elements: [] });
    expect(screen.getByText('Le programme visé ne contient aucun élément désignable.')).toBeTruthy();
  });

  it('signalement délié de son programme : seul « aucun élément » reste possible', () => {
    afficher({ ...PAR_ELEMENT, rattachement: 'autre_produit', elementDesigne: null, elements: null });
    expect((screen.getByLabelText('Un élément du programme est en cause') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/aucun élément ne peut être désigné/)).toBeTruthy();
  });

  // D-281 §5, arbitrage du 2026-10-16 : « impliqué, élément non identifiable ».
  it('programme visé illisible : « impliqué, élément non identifiable » + aménagement, sans élément envoyé', async () => {
    afficher({ ...PAR_ELEMENT, rattachement: 'ne_sait_pas', elementDesigne: null, elements: null, avisSansElement: true });
    expect(screen.getByText(/Vous pouvez rendre « impliqué » sans élément, avec un aménagement/)).toBeTruthy();
    const bouton = screen.getByText('Enregistrer l’avis') as HTMLButtonElement;
    fireEvent.click(screen.getByLabelText('Impliqué, élément non identifiable'));
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(bouton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Différer'));
    expect(bouton.disabled).toBe(false);
    fireEvent.submit(bouton.closest('form')!);
    await waitFor(() => expect(corps).not.toBeNull());
    expect(corps).toEqual({ reportId: 's1', verdict: 'implique', amenagement: 'differer', supersedesVerdictId: null });
  });

  it('avis « impliqué » sans élément en vigueur : dit « élément non identifiable »', () => {
    afficher({
      ...PAR_ELEMENT, rattachement: null, elementDesigne: null, elements: null, avisSansElement: true,
      verdicts: [
        { id: 'v1', verdict: 'implique', elementActionId: null, amenagement: 'retirer', renduPar: 'a@wellneuro.fr', renduLe: '2026-10-16T10:00:00.000Z', supersedesVerdictId: null },
      ],
      verdictCourantId: 'v1',
    });
    expect(screen.getByText(/élément non identifiable, aménagement : Retirer/)).toBeTruthy();
    expect(screen.queryByText(/sans intitulé lisible/)).toBeNull();
  });
});
