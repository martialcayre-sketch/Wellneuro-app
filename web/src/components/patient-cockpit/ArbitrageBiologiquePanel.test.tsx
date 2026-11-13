// @vitest-environment jsdom
//
// Le panneau d'arbitrage était le SEUL composant de `patient-cockpit` sans banc
// de composant — vingt de ses voisins en ont un. L'oubli s'explique : il était
// INATTEIGNABLE, faute d'une surface posant `conditionnelle_biologie`. Le geste
// de suspension livré avec ce lot le rend joignable ; il gagne son banc avec.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArbitrageBiologiquePanel } from './ArbitrageBiologiquePanel';

function intention(
  over: Partial<{ actionId: string; title: string; cible: string | null; analytes: string[] }> = {},
) {
  return {
    actionId: over.actionId ?? 'act-1',
    title: over.title ?? 'Exploration martiale avant supplémentation',
    cible: over.cible === undefined ? 'Ferritine' : over.cible,
    analytes: over.analytes ?? ['Ferritine sérique'],
  };
}

describe('ArbitrageBiologiquePanel', () => {
  it('ne se rend pas du tout quand il n’y a ni intention ni arbitrage', () => {
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
      />,
    );
    // Un panneau vide affirmerait qu'il n'y a rien à arbitrer ; il se tait.
    expect(container.innerHTML).toBe('');
  });

  it('rend l’intention avec ce qu’elle attend, et consigne le verdict choisi', () => {
    const onArbitrer = vi.fn();
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={onArbitrer}
      />,
    );
    const ui = within(container);
    expect(ui.getByText('Exploration martiale avant supplémentation')).not.toBeNull();
    expect(ui.getByText(/En attente de biologie : Ferritine/)).not.toBeNull();
    expect(ui.getByText('Analytes attendus : Ferritine sérique')).not.toBeNull();

    fireEvent.click(ui.getByRole('radio', { name: 'Confirmée par le bilan' }));
    fireEvent.click(ui.getByRole('button', { name: 'Consigner l’arbitrage' }));
    expect(onArbitrer).toHaveBeenCalledWith('act-1', 'confirme', '');
  });

  // [[D-305]] §8 : une attente posée avant le champ s'affiche — jamais
  // refusée, jamais tue — et dit qu'aucun résultat ne la réveillera.
  it('dit d’une attente sans codes qu’elle est non typée', () => {
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention({ analytes: [] })]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
      />,
    );
    expect(within(container).getByText('Attente non typée : aucun résultat ne la réveille.')).not.toBeNull();
  });

  it('exige une note pour un verdict INFIRMÉ, et le dit dans l’étiquette', () => {
    const onArbitrer = vi.fn();
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={onArbitrer}
      />,
    );
    const ui = within(container);
    fireEvent.click(ui.getByRole('radio', { name: 'Infirmée par le bilan' }));
    // Le motif d'un retrait se relit six semaines plus tard : la note n'est pas
    // facultative, et l'étiquette le dit avant que le bouton ne refuse.
    expect(ui.getByText(/obligatoire pour un verdict infirmé/)).not.toBeNull();
    const consigner = ui.getByRole('button', { name: 'Consigner l’arbitrage' });
    expect(consigner.hasAttribute('disabled')).toBe(true);

    fireEvent.change(ui.getByLabelText(/Note courte/), {
      target: { value: 'Ferritine dans les bornes du laboratoire.' },
    });
    fireEvent.click(consigner);
    expect(onArbitrer).toHaveBeenCalledWith('act-1', 'infirme', 'Ferritine dans les bornes du laboratoire.');
  });

  it('un arbitrage déjà consigné remplace le formulaire par sa relecture', () => {
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[{
          intentionId: 'act-1',
          verdict: 'infirme',
          noteCourte: 'Bornes du laboratoire respectées.',
          arbitreLe: '2026-09-15T08:00:00.000Z',
        }]}
        revisionPossible
        onArbitrer={vi.fn()}
        onReviser={vi.fn()}
      />,
    );
    const ui = within(container);
    expect(ui.queryByRole('button', { name: 'Consigner l’arbitrage' })).toBeNull();
    expect(ui.getByText(/Bornes du laboratoire respectées/)).not.toBeNull();
  });

  // BP-23 ([[D-213]] §1, arbitrage du 2026-10-06) : la révision ne part
  // qu'avec la coche, transmise telle quelle. Sans elle, le bouton reste inactif
  // — une révision née brouillon ne se relirait plus nulle part.
  it('la révision exige la coche « J’ai relu le protocole révisé », et la transmet', () => {
    const onReviser = vi.fn();
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[{ intentionId: 'act-1', verdict: 'confirme', noteCourte: null, arbitreLe: '2026-09-15T08:00:00.000Z' }]}
        revisionPossible
        onArbitrer={vi.fn()}
        onReviser={onReviser}
      />,
    );
    const ui = within(container);
    const bouton = ui.getByRole('button', { name: /Appliquer les arbitrages/ }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.click(bouton);
    expect(onReviser).not.toHaveBeenCalled();
    fireEvent.click(ui.getByLabelText('J’ai relu le protocole révisé'));
    expect(bouton.disabled).toBe(false);
    fireEvent.click(bouton);
    expect(onReviser).toHaveBeenCalledWith(true);
  });

  // Revue Copilot de #1342 : un verdict consigné après la coche change la
  // révision qui sera générée — la coche ne lui survit pas.
  it('un nouvel arbitrage après la coche la fait tomber', () => {
    const premier = { intentionId: 'act-1', verdict: 'confirme', noteCourte: null, arbitreLe: '2026-09-15T08:00:00.000Z' };
    const second = { intentionId: 'act-2', verdict: 'infirme', noteCourte: null, arbitreLe: '2026-09-15T09:00:00.000Z' };
    const panneau = (arbitrages: typeof premier[]) => (
      <ArbitrageBiologiquePanel
        intentions={[intention(), { ...intention(), actionId: 'act-2' }]}
        arbitrages={arbitrages}
        revisionPossible
        onArbitrer={vi.fn()}
        onReviser={vi.fn()}
      />
    );
    const { container, rerender } = render(panneau([premier]));
    const ui = within(container);
    fireEvent.click(ui.getByLabelText('J’ai relu le protocole révisé'));
    expect((ui.getByLabelText('J’ai relu le protocole révisé') as HTMLInputElement).checked).toBe(true);
    rerender(panneau([premier, second]));
    expect((ui.getByLabelText('J’ai relu le protocole révisé') as HTMLInputElement).checked).toBe(false);
    expect((ui.getByRole('button', { name: /Appliquer les arbitrages/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('le badge suit l’état réel de l’étage 2, et la phrase reste vraie dans les deux cas', () => {
    const { container, rerender } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
      />,
    );
    expect(within(container).getByText('Aucune valeur d’analyse conservée')).not.toBeNull();
    rerender(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
        resultatsActifs
      />,
    );
    expect(within(container).getByText('L’arbitrage ne consigne jamais une valeur')).not.toBeNull();
    // Dans les deux cas : jamais de champ de VALEUR. La table d'arbitrage n'a
    // aucune colonne de résultat, et un contrat SQL négatif le garde en CI.
    expect(screen.queryByLabelText(/valeur|résultat|taux/i)).toBeNull();
  });
});

// PRA-3b, PR 6 (T-64, Q5 a, Q17 a ; [[D-488]]) : un échec de lecture des
// arbitrages n'est jamais lu comme « rien d'arbitré ».
describe('ArbitrageBiologiquePanel — lecture des arbitrages', () => {
  // Le bloc précédent ne démonte rien : on part d'un document vide.
  beforeEach(cleanup);
  afterEach(cleanup);
  const T64 = 'Les arbitrages biologiques n’ont pas pu être lus. Ce n’est pas une absence d’arbitrage.';
  const DOUBLE = 'Un arbitrage existe déjà pour cette intention sur cette version de protocole.';
  const consigne = (intentionId: string) => ({
    intentionId,
    verdict: 'sans_objet',
    noteCourte: null,
    arbitreLe: '2026-11-10T09:00:00.000Z',
  });

  it('en échec : T-64, ni verdict ni « Appliquer »', () => {
    render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible
        onArbitrer={vi.fn()}
        onReviser={vi.fn()}
        lecture="echec"
        onRelire={vi.fn(async () => false)}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(T64);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Consigner l’arbitrage' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Appliquer les arbitrages/ })).toBeNull();
  });

  it('pas encore lus : aucun formulaire non plus', () => {
    render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
        lecture="en_cours"
      />,
    );
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(T64)).toBeNull();
  });

  it('« Réessayer » est désactivé pendant la relecture', () => {
    render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
        lecture="echec"
        relectureEnCours
        onRelire={vi.fn(async () => false)}
      />,
    );
    expect((screen.getByRole('button', { name: 'Réessayer' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('relecture réussie : focus au titre ; encore en échec : focus sur « Réessayer »', async () => {
    const proprietes = {
      intentions: [intention()],
      arbitrages: [],
      revisionPossible: false,
      onArbitrer: vi.fn(),
    };
    const { rerender } = render(
      <ArbitrageBiologiquePanel {...proprietes} lecture="echec" onRelire={vi.fn(async () => false)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Réessayer' })));

    const onRelire = vi.fn(async () => {
      rerender(<ArbitrageBiologiquePanel {...proprietes} lecture="ok" onRelire={onRelire} />);
      return true;
    });
    rerender(<ArbitrageBiologiquePanel {...proprietes} lecture="echec" onRelire={onRelire} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Biologie — arbitrage au retour du bilan' })),
    );
  });

  it('un échec de relecture ne vide pas le choix local', () => {
    const proprietes = {
      intentions: [intention()],
      arbitrages: [],
      revisionPossible: false,
      onArbitrer: vi.fn(),
      onRelire: vi.fn(async () => true),
    };
    const { rerender } = render(<ArbitrageBiologiquePanel {...proprietes} lecture="ok" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Infirmée par le bilan' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ferritine normale au bilan.' } });

    rerender(<ArbitrageBiologiquePanel {...proprietes} lecture="echec" />);
    expect(screen.queryByRole('radio')).toBeNull();

    rerender(<ArbitrageBiologiquePanel {...proprietes} lecture="ok" />);
    expect(screen.getByRole('radio', { name: 'Infirmée par le bilan' }).getAttribute('aria-checked')).toBe('true');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Ferritine normale au bilan.');
  });

  it('arbitrée entre-temps ailleurs avec un choix local : verdict consigné et message du serveur', () => {
    const proprietes = { intentions: [intention()], revisionPossible: false, onArbitrer: vi.fn(), lecture: 'ok' as const };
    const { rerender } = render(<ArbitrageBiologiquePanel {...proprietes} arbitrages={[]} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Confirmée par le bilan' }));

    rerender(<ArbitrageBiologiquePanel {...proprietes} arbitrages={[consigne('act-1')]} />);
    expect(screen.getByText(/Bilan sans objet pour cette intention — arbitré le/)).toBeTruthy();
    expect(screen.getByText(DOUBLE)).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('consignée depuis ce panneau : pas de message de double arbitrage', () => {
    const onArbitrer = vi.fn();
    const proprietes = { intentions: [intention()], revisionPossible: false, onArbitrer, lecture: 'ok' as const };
    const { rerender } = render(<ArbitrageBiologiquePanel {...proprietes} arbitrages={[]} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Confirmée par le bilan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Consigner l’arbitrage' }));
    expect(onArbitrer).toHaveBeenCalledWith('act-1', 'confirme', '');

    rerender(<ArbitrageBiologiquePanel {...proprietes} arbitrages={[{ ...consigne('act-1'), verdict: 'confirme' }]} />);
    expect(screen.queryByText(DOUBLE)).toBeNull();
  });

  it('« Consigner l’arbitrage » est bordé ; « Appliquer » reste la seule action pleine (Q3 a)', () => {
    render(
      <ArbitrageBiologiquePanel
        intentions={[intention(), intention({ actionId: 'act-2', title: 'Autre intention' })]}
        arbitrages={[{ ...consigne('act-2'), verdict: 'confirme' }]}
        revisionPossible
        onArbitrer={vi.fn()}
        onReviser={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Consigner l’arbitrage' }).className).not.toContain('bg-primary');
    expect(screen.getByRole('button', { name: /Appliquer les arbitrages/ }).className).toContain('bg-primary');
  });
});
