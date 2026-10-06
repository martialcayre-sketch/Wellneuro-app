// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImportLu, LigneLue } from '@/lib/biology-library/import/lecture';
import type { ActeLectureLu } from '@/lib/biology-library/import/acteLecture';
import { LectureImportBiologique } from './LectureImportBiologique';

// L'écran de l'acte de lecture ([[D-268]], BP-10). Identités de fixture.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function ligne(statut: string, id = `l_${statut}`): LigneLue {
  return {
    id, rang: 1, page: 1, libelleLu: 'Libellé', valeurLue: '1', uniteLue: null, preleveLeLu: null, heureLue: false,
    intervalleLu: null, marquageLu: null, intervalleNonTranscrit: false, marquageNonTranscrit: false,
    analytePropose: null, statutMapping: 'inconnu', statut, motifEcart: null, idResultat: null, preMarquage: null,
  };
}

function importLu(lignes: LigneLue[]): ImportLu {
  return {
    id: 'imp_1', statut: 'extrait', motifEchec: null, modele: 'modele', versionPrompt: 'bio-extraction-v3',
    laboratoireLu: null, lanceLe: '2026-10-06T08:00:00.000Z', termineLe: '2026-10-06T08:01:00.000Z',
    courant: true, perime: false, lignes,
  };
}

const LECTURE: ActeLectureLu = {
  id: 'lec_1', acte: 'lecture', idLectureRevoquee: null, codeRevocation: null,
  praticienEmail: 'praticien@wellneuro.fr', acteLe: '2026-10-06T10:00:00.000Z',
};

function stubPost(reponse: { status: number; corps: unknown }) {
  const fetchMock = vi.fn(async () => ({ ok: reponse.status < 300, status: reponse.status, json: async () => reponse.corps }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LectureImportBiologique', () => {
  it('rien sans ligne validée : il n’y a pas de lecture à consigner', () => {
    const { container } = render(
      <LectureImportBiologique idPatient="PAT_SOPHIE" imp={importLu([ligne('proposee')])} actes={[]} onActe={async () => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('lignes à décider : l’acte ne s’offre pas encore', () => {
    render(
      <LectureImportBiologique
        idPatient="PAT_SOPHIE"
        imp={importLu([ligne('validee'), ligne('proposee')])}
        actes={[]}
        onActe={async () => {}}
      />,
    );
    expect(screen.getByRole('status').textContent).toMatch(/1 ligne reste à décider/);
    expect(screen.queryByRole('button', { name: 'Consigner ma lecture' })).toBeNull();
  });

  it('dit ce qu’il n’est pas, et ce qui est lu (§9, la restitution, pas le document)', () => {
    render(<LectureImportBiologique idPatient="PAT_SOPHIE" imp={importLu([ligne('validee')])} actes={[]} onActe={async () => {}} />);
    expect(screen.getByText(/n’est pas un filet de sécurité/)).toBeTruthy();
    expect(screen.getByText(/Le document lui-même n’est pas affiché/)).toBeTruthy();
  });

  it('consigne la lecture, puis relit', async () => {
    const fetchMock = stubPost({ status: 201, corps: { ok: true } });
    const onActe = vi.fn(async () => {});
    render(<LectureImportBiologique idPatient="PAT_SOPHIE" imp={importLu([ligne('validee')])} actes={[]} onActe={onActe} />);
    fireEvent.click(screen.getByRole('button', { name: 'Consigner ma lecture' }));
    await waitFor(() => expect(onActe).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)).toEqual({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture',
    });
  });

  it('affiche le refus du serveur tel quel', async () => {
    stubPost({ status: 409, corps: { ok: false, error: 'Une lecture est déjà consignée pour cet import.' } });
    render(<LectureImportBiologique idPatient="PAT_SOPHIE" imp={importLu([ligne('validee')])} actes={[]} onActe={async () => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Consigner ma lecture' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Une lecture est déjà consignée pour cet import.'));
  });

  it('lecture active : révocation armée, code de la liste fermée, aucun champ libre', async () => {
    const fetchMock = stubPost({ status: 201, corps: { ok: true } });
    render(
      <LectureImportBiologique idPatient="PAT_SOPHIE" imp={importLu([ligne('validee')])} actes={[LECTURE]} onActe={async () => {}} />,
    );
    expect(screen.getByText(/Lecture consignée le .* par praticien@wellneuro.fr/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Révoquer cette lecture' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    const choix = screen.getByLabelText('Motif de la révocation') as HTMLSelectElement;
    expect([...choix.options].map(o => o.value)).toEqual(['acte_pose_par_erreur', 'mauvais_import', 'lecture_a_refaire']);
    fireEvent.change(choix, { target: { value: 'mauvais_import' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la révocation' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)).toEqual({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', idLecture: 'lec_1', code: 'mauvais_import',
    });
  });

  it('après révocation : le signalement est rouvert et la lecture révoquée reste tracée', () => {
    render(
      <LectureImportBiologique
        idPatient="PAT_SOPHIE"
        imp={importLu([ligne('validee')])}
        actes={[
          LECTURE,
          { ...LECTURE, id: 'rev_1', acte: 'revocation', idLectureRevoquee: 'lec_1', codeRevocation: 'lecture_a_refaire', acteLe: '2026-10-06T11:00:00.000Z' },
        ]}
        onActe={async () => {}}
      />,
    );
    expect(screen.getByText(/Lecture révoquée le .*\(\s*lecture à refaire\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Consigner ma lecture' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Lectures révoquées' }).textContent).toMatch(/révoquée le/);
  });
});
