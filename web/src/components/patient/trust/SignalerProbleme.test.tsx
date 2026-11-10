// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalerProbleme } from './SignalerProbleme';

// LA DÉSIGNATION D'UN ÉLÉMENT DU PROGRAMME ([[D-281]] §2, étape 3).

const ELEMENTS = [
  { actionId: 'a-magnesium', title: 'Magnésium le soir' },
  { actionId: 'a-marche', title: 'Marche de vingt minutes' },
];
const QUESTION = 'À quel élément de votre programme associez-vous cet effet ?';
const QUESTION_AVANT = 'Ce produit fait-il partie du programme qui vous a été transmis ?';

let corps: Record<string, unknown> | null = null;

beforeEach(() => {
  corps = null;
  global.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    corps = JSON.parse(String(init?.body));
    return Promise.resolve({ json: () => Promise.resolve({ ok: true, messagePatient: 'Reçu.' }) } as Response);
  }) as unknown as typeof fetch;
});
afterEach(cleanup);

function ouvrir(props: Partial<Parameters<typeof SignalerProbleme>[0]>) {
  render(<SignalerProbleme token="TOK" onEnvoye={() => {}} associationDisponible {...props} />);
  fireEvent.click(screen.getByText(/Un produit me semble mal toléré/));
}

function remplirEtEnvoyer() {
  // Les champs se trouvent par leur rôle, dans l'ordre du formulaire (le
  // libellé « Produit concerné * » porte l'astérisque dans son nom accessible).
  const [produit, ressenti] = screen.getAllByRole('textbox');
  fireEvent.change(produit, { target: { value: 'Magnésium' } });
  fireEvent.change(ressenti, { target: { value: 'Maux de ventre' } });
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'legere' } });
  fireEvent.submit(screen.getByText('Envoyer le signalement').closest('form')!);
}

describe('SignalerProbleme — désignation', () => {
  it('avec des éléments servis : la liste, « Je ne sais pas », « Un autre produit » ; plus la question d’avant', () => {
    ouvrir({ elementsProgramme: ELEMENTS });
    const liste = screen.getByRole('combobox', { name: QUESTION }) as HTMLSelectElement;
    expect([...liste.options].map(o => o.textContent)).toEqual([
      'Choisir…', 'Magnésium le soir', 'Marche de vingt minutes', 'Je ne sais pas', 'Un autre produit',
    ]);
    expect(liste.required).toBe(true);
    expect(liste.value).toBe('');
    expect(screen.queryByText(QUESTION_AVANT)).toBeNull();
  });

  it('un élément choisi part en rattachement « element » avec son identifiant', () => {
    ouvrir({ elementsProgramme: ELEMENTS, versionProgramme: 'v-courante' });
    fireEvent.change(screen.getByRole('combobox', { name: QUESTION }), { target: { value: 'element:a-magnesium' } });
    remplirEtEnvoyer();
    // La version part avec le choix : le serveur refuse un choix fait sur une version remplacée.
    expect(corps).toMatchObject({ rattachement: 'element', elementActionId: 'a-magnesium', versionProgramme: 'v-courante' });
    expect(corps).not.toHaveProperty('rattacheAuProgramme');
  });

  it('« Un autre produit » part sans identifiant d’élément', () => {
    ouvrir({ elementsProgramme: ELEMENTS });
    fireEvent.change(screen.getByRole('combobox', { name: QUESTION }), { target: { value: 'autre_produit' } });
    remplirEtEnvoyer();
    expect(corps).toMatchObject({ rattachement: 'autre_produit' });
    expect(corps).not.toHaveProperty('elementActionId');
  });

  // LA DÉSIGNATION SANS LISTE (arbitrage du responsable du 2026-10-16) :
  // programme non servi au portail, ou aucune intervention ferme.
  it('une liste vide : la désignation sans élément, « Je ne sais pas » ou « Un autre produit » ; plus la question d’avant', () => {
    ouvrir({ elementsProgramme: [], versionProgramme: 'v-courante' });
    const liste = screen.getByRole('combobox', { name: QUESTION }) as HTMLSelectElement;
    expect([...liste.options].map(o => o.textContent)).toEqual(['Choisir…', 'Je ne sais pas', 'Un autre produit']);
    expect(liste.required).toBe(true);
    expect(screen.queryByText(QUESTION_AVANT)).toBeNull();
    fireEvent.change(liste, { target: { value: 'ne_sait_pas' } });
    remplirEtEnvoyer();
    expect(corps).toMatchObject({ rattachement: 'ne_sait_pas' });
    expect(corps).not.toHaveProperty('elementActionId');
    expect(corps).not.toHaveProperty('rattacheAuProgramme');
  });

  it('sans éléments servis (dossier mineur, sans date, sans programme) : la question d’avant, inchangée', () => {
    ouvrir({ elementsProgramme: null });
    expect(screen.getByText(QUESTION_AVANT)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: QUESTION })).toBeNull();
    remplirEtEnvoyer();
    expect(corps).toMatchObject({ rattacheAuProgramme: 'ne_sait_pas' });
    expect(corps).not.toHaveProperty('rattachement');
  });

  it('association fermée : ni l’une ni l’autre question', () => {
    ouvrir({ associationDisponible: false, elementsProgramme: ELEMENTS });
    expect(screen.queryByRole('combobox', { name: QUESTION })).toBeNull();
    expect(screen.queryByText(QUESTION_AVANT)).toBeNull();
  });
});

// LA REMISE À ZÉRO (audit UI du 2026-11-07) : un second signalement ne reprend
// rien du premier — ni le rattachement, ni les deux dates.
describe('SignalerProbleme — remise à zéro', () => {
  const PRISE = 'Depuis quand le prenez-vous ?';
  const SYMPTOMES = 'Depuis quand ressentez-vous ces symptômes ?';

  function remplirAssociation() {
    fireEvent.change(screen.getByRole('combobox', { name: QUESTION_AVANT }), { target: { value: 'oui' } });
    fireEvent.change(screen.getByLabelText(PRISE), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(SYMPTOMES), { target: { value: '2026-10-05' } });
  }

  function attendreVierge() {
    expect((screen.getByRole('combobox', { name: QUESTION_AVANT }) as HTMLSelectElement).value).toBe('ne_sait_pas');
    expect((screen.getByLabelText(PRISE) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(SYMPTOMES) as HTMLInputElement).value).toBe('');
  }

  it('après un envoi, « Faire un autre signalement » repart d’un formulaire vierge', async () => {
    ouvrir({ elementsProgramme: null });
    remplirAssociation();
    remplirEtEnvoyer();
    expect(corps).toMatchObject({ rattacheAuProgramme: 'oui', debutPriseLe: '2026-10-01', debutSymptomesLe: '2026-10-05' });
    fireEvent.click(await screen.findByText('Faire un autre signalement'));
    fireEvent.click(screen.getByText(/Un produit me semble mal toléré/));
    attendreVierge();
  });

  // Le formulaire disparaît, et le bouton qui avait le focus avec lui. Ce message
  // porte la réponse d'orientation de l'effet indésirable : il doit être entendu.
  // Le bouton « Faire un autre signalement » reste hors de la région.
  it('la confirmation s’annonce dans une région déjà présente, et le focus s’y pose — à chaque envoi', async () => {
    ouvrir({ elementsProgramme: null });
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    remplirEtEnvoyer();
    const autre = await screen.findByText('Faire un autre signalement');
    expect(screen.getByRole('status')).toBe(region);
    expect(region.textContent).toBe('Reçu.');
    expect(document.activeElement).toBe(region);

    fireEvent.click(autre);
    expect(region.textContent).toBe('');
    fireEvent.click(screen.getByText(/Un produit me semble mal toléré/));
    remplirEtEnvoyer();
    await screen.findByText('Faire un autre signalement');
    expect(document.activeElement).toBe(region);
  });

  // Audit UI du 2026-11-07, suites du n° 8 : « Annuler » et « Faire un autre
  // signalement » disparaissent sous le doigt. Le focus va aux choix qui les
  // remplacent, jamais au premier affichage.
  it('au premier affichage, le focus ne bouge pas', () => {
    render(<SignalerProbleme token="TOK" onEnvoye={() => {}} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('« Annuler » rend le focus au choix abandonné', () => {
    render(<SignalerProbleme token="TOK" onEnvoye={() => {}} />);
    fireEvent.click(screen.getByText(/Un problème de confidentialité/));
    fireEvent.click(screen.getByText('Annuler'));
    expect(document.activeElement).toBe(screen.getByText(/Un problème de confidentialité/));
  });

  it('« Faire un autre signalement » pose le focus sur le premier choix', async () => {
    ouvrir({ elementsProgramme: null });
    remplirEtEnvoyer();
    fireEvent.click(await screen.findByText('Faire un autre signalement'));
    expect(document.activeElement).toBe(screen.getByText(/Un produit me semble mal toléré/));
  });

  it('« Annuler » puis réouverture : rien du brouillon abandonné', () => {
    ouvrir({ elementsProgramme: null });
    remplirAssociation();
    fireEvent.click(screen.getByText('Annuler'));
    fireEvent.click(screen.getByText(/Un produit me semble mal toléré/));
    attendreVierge();
  });
});
