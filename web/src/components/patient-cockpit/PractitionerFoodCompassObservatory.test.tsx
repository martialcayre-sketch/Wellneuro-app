// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PractitionerFoodCompassObservatory } from './PractitionerFoodCompassObservatory';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PractitionerFoodCompassObservatory', () => {
  it('affiche une restitution tabulaire sourcée et exige un clic séparé pour insérer', async () => {
    const onInsert = vi.fn();
    const actionRef = { foodRef: '26034', refHash: 'ref-hash' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        profile: {
          foodLabel: 'Sardine', status: 'complete', completenessPct: 100, aggregateScore: 61.734453,
          components: [{ nutrientCode: '25000', label: 'Protéines', value: 23.3, unit: 'g/100 g', alignment: 0.896, role: 'required', direction: 'favorable', effectiveWeightPct: 18 }],
          pral: { valueMeqPer100g: 9.681, alignment: 0.214, effectiveWeightPct: 10 },
          sourceRef: 'doi:10.57745/RDMHWY', sourceHash: 'md5-officiel',
          contractVersion: 'c5a-intrinsic-food-profile-v1',
          datasetVersion: 'ciqual-2025-v1', mappingVersion: 'c5a-b1-mapping-v1',
          scoreVersion: 'c5a-b1-score-v1', pralVersion: 'c5a-pral-remer-manz-v1', percentileVersion: 'c5a-percentile-linear-v1',
          limitations: ['Lecture praticien uniquement.'],
        },
        reading: {
          selectedPriority: { priorityId: 'PRIO_1', label: 'Priorité sommeil' },
          activeProtocol: { protocolDraftId: 'proto_DEC_1', inputHash: 'hash-protocole' },
          limitations: ['Décision manuelle du praticien.'],
        },
        actionRef, alternatives: [], insertionAllowed: true, insertionReason: null,
        manifest: { version: 'c5-practitioner-foods-manifest-v1', hash: 'manifest-hash' },
      }),
    }));
    render(<PractitionerFoodCompassObservatory idPatient="PAT_TEST" decisionCardId="DEC_1" onInsert={onInsert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Consulter le profil' }));
    expect(await screen.findByText(/61.734453/)).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText(/doi:10.57745/)).toBeTruthy();
    expect(screen.getByText(/Priorité sommeil/)).toBeTruthy();
    expect(screen.getByText(/proto_DEC_1/)).toBeTruthy();
    expect(screen.getByText(/hash-protocole/)).toBeTruthy();
    expect(screen.getByText(/Décision manuelle/)).toBeTruthy();
    expect(screen.getByText(/9.681 mEq\/100 g/)).toBeTruthy();
    expect(screen.getByText(/c5-practitioner-foods-manifest-v1/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('decisionCardId=DEC_1'));
    expect(onInsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Préparer l’insertion manuelle/ }));
    await waitFor(() => expect(onInsert).toHaveBeenCalledWith({ foodLabel: 'Sardine', actionRef }));
  });

  it('invalide le profil consulté dès que l’aliment sélectionné change', async () => {
    const onInsert = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        profile: {
          foodLabel: 'Sardine', status: 'complete', completenessPct: 100, aggregateScore: 61,
          components: [], pral: { valueMeqPer100g: 9.681, alignment: 0.2, effectiveWeightPct: 10 },
          sourceRef: 'source', sourceHash: 'hash', contractVersion: 'profil-v1', datasetVersion: 'ciqual-2025-v1',
          mappingVersion: 'mapping-v1', scoreVersion: 'score-v1', pralVersion: 'pral-v1', percentileVersion: 'percentile-v1', limitations: [],
        },
        reading: null, actionRef: null, alternatives: [], insertionAllowed: false, insertionReason: 'Protocole requis.',
        manifest: { version: 'manifest-v1', hash: 'manifest-hash' },
      }),
    }));
    render(<PractitionerFoodCompassObservatory idPatient="PAT_TEST" decisionCardId="DEC_1" onInsert={onInsert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Consulter le profil' }));
    expect(await screen.findByRole('heading', { name: 'Profil de Sardine' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Aliment vedette'), { target: { value: '26051' } });
    expect(screen.queryByRole('heading', { name: 'Profil de Sardine' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Préparer l’insertion/ })).toBeNull();
    expect(onInsert).not.toHaveBeenCalled();
  });

  it('rend les erreurs lisibles sans exposer de données', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, reason: 'forbidden', error: 'Patient non accessible.' }),
    }));
    render(<PractitionerFoodCompassObservatory idPatient="PAT_TEST" decisionCardId="DEC_1" onInsert={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Consulter le profil' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Patient non accessible.');
  });
});
