// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AvantDeCommencer } from './AvantDeCommencer';
import { documentsRequerantAccuse } from '@/lib/trust/avantDeCommencer';

// CE BANC EXISTE POUR UN CONSTAT DE REVUE DU 2026-09-16.
//
// Le registre asserte que la v8 NOMME l'adresse, le NIR et le médecin traitant.
// Rien n'assertait que l'ÉCRAN les montre. Le paragraphe pouvait donc être
// retiré d'ici sans qu'un seul banc ne rougisse : le patient aurait accusé
// réception d'un texte dont l'écran ne disait plus ce qui change.

let postes: { documentKey: string; type: string }[] = [];

function stub() {
  postes = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      postes.push(JSON.parse(String(init?.body ?? '{}')) as { documentKey: string; type: string });
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }),
  );
}

/** Déroule les trois premiers écrans, jusqu'aux confirmations finales. */
function jusquAuxConfirmations() {
  fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }));
  fireEvent.click(screen.getByRole('button', { name: /je comprends le cadre/i }));
}

beforeEach(() => {
  stub();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AvantDeCommencer — l’écran DIT ce qui change', () => {
  it('★ le troisième écran NOMME les trois renseignements administratifs', () => {
    render(<AvantDeCommencer token="t" onDone={() => {}} />);
    jusquAuxConfirmations();

    const ecran = screen.getByText(/renseignements administratifs/i).textContent ?? '';
    expect(ecran).toContain('adresse postale');
    expect(ecran).toContain('numéro de sécurité sociale');
    expect(ecran).toContain('médecin traitant');
  });

  it('★ dit qu’aucun n’est obligatoire, et que noter un médecin n’est pas lui écrire', () => {
    // UN ACCUSÉ SUR UN TEXTE QUI NE DIT PAS CE QUI CHANGE N'EST QU'UNE
    // FORMALITÉ. Ces deux précisions sont ce que le patient peut réellement
    // faire de l'information : refuser, et ne pas craindre un courrier.
    render(<AvantDeCommencer token="t" onDone={() => {}} />);
    jusquAuxConfirmations();

    const ecran = screen.getByText(/renseignements administratifs/i).textContent ?? '';
    expect(ecran).toContain('Aucun n’est obligatoire');
    expect(ecran).toContain('ne veut pas dire lui écrire');
  });

  it('★ l’écran ne PROMET plus la garde absente, et NOMME l’exception', () => {
    // CE BANC EST LE PLUS IMPORTANT DES QUATRE, et il naît d'un défaut réel.
    // Jusqu'au 2026-09-17, cet écran affirmait « Rien ne lui est adressé sans
    // un choix explicite de votre part » — et le bouton final faisait ACCUSER
    // RÉCEPTION de cette phrase. Or le logiciel ne la tenait pas : un praticien
    // pouvait produire et consigner un courrier sur un dossier en refus.
    //
    // LA MUTATION QUI DOIT FAIRE ROUGIR CE BANC : remettre la phrase d'origine,
    // ou retirer l'exception pour « simplifier » l'écran. Les deux rendraient
    // l'accusé mensonger, et aucun banc ne les voyait avant celui-ci.
    render(<AvantDeCommencer token="t" onDone={() => {}} />);
    jusquAuxConfirmations();

    const carte = screen.getByText(/renseignements administratifs/i).closest('div')?.parentElement;
    const texte = carte?.textContent ?? '';

    expect(texte).not.toContain('Rien ne lui est adressé sans un choix explicite');
    expect(texte).toContain('L’application n’envoie rien à un médecin');
    expect(texte).toContain('votre choix l’engage');
    expect(texte).toContain('impose d’écrire à un médecin pour votre sécurité');
    expect(texte).toContain('votre praticien vous en informe alors');
  });

  it('dit que ces renseignements sont saisis par le PRATICIEN, pas par le patient', () => {
    // Les glisser parmi « les informations que vous transmettez » aurait laissé
    // croire au patient qu'il les a donnés lui-même.
    render(<AvantDeCommencer token="t" onDone={() => {}} />);
    jusquAuxConfirmations();
    expect(screen.getByText(/qu’il saisit lui-même/i)).toBeTruthy();
  });
});

describe('AvantDeCommencer — la séquence peut se terminer', () => {
  it('★ valider pose un accusé sur CHAQUE document que la porte exige', async () => {
    // L'INVARIANT DE TERMINAISON, éprouvé sur le composant réel et non sur la
    // seule fonction : si la séquence posait moins d'accusés que la porte n'en
    // exige, le patient boucherait sans fin sur ces quatre écrans.
    const onDone = vi.fn();
    render(<AvantDeCommencer token="t" onDone={onDone} />);
    jusquAuxConfirmations();
    fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }));

    for (const boite of screen.getAllByRole('checkbox')) fireEvent.click(boite);
    fireEvent.click(screen.getByRole('button', { name: /j’ai pris connaissance/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const accuses = postes.filter(p => p.type === 'pris_connaissance').map(p => p.documentKey);
    expect(accuses.sort()).toEqual([...documentsRequerantAccuse()].sort());
  });

  it('le bouton final reste inerte tant que les trois confirmations ne sont pas cochées', () => {
    render(<AvantDeCommencer token="t" onDone={() => {}} />);
    jusquAuxConfirmations();
    fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }));

    const bouton = screen.getByRole('button', { name: /j’ai pris connaissance/i });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
  });
});
