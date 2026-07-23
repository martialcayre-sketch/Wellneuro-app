import { describe, expect, it } from 'vitest';
import { annoterSources, noticeDeSource, sourcesDuNotebook } from './notebooks';

// Le registre réel (source_registry.json) est importé statiquement : ces tests
// verrouillent le contrat sur des notices connues du pilote.
describe('notebooks — vue registre', () => {
  it('annote une source pilote avec son titre et son notebook', () => {
    const notice = noticeDeSource('WN-SRC-0056');
    expect(notice).not.toBeNull();
    expect(notice?.notebook).toBe('09 — Nutrition et aliments vedettes');
    expect(notice?.titre).toContain('acides gras');
  });

  it('rend null pour une source hors registre', () => {
    expect(noticeDeSource('WN-SRC-0000')).toBeNull();
  });

  it('liste les sources du notebook pilote (les 6 sources y figurent)', () => {
    const ids = sourcesDuNotebook('09 — Nutrition et aliments vedettes');
    for (const attendu of ['WN-SRC-0032', 'WN-SRC-0053', 'WN-SRC-0056', 'WN-SRC-0063', 'WN-SRC-0074', 'WN-SRC-0075']) {
      expect(ids).toContain(attendu);
    }
    // Trié, sans doublon.
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('un notebook inconnu rend une liste vide (filtre qui ne matche rien, jamais ignoré)', () => {
    expect(sourcesDuNotebook('Notebook fantôme')).toEqual([]);
  });

  it('annoterSources marque les inconnues Hors registre sans les perdre', () => {
    const annotees = annoterSources(['WN-SRC-0056', 'WN-SRC-0000']);
    expect(annotees).toHaveLength(2);
    expect(annotees[1]).toEqual({ sourceId: 'WN-SRC-0000', titre: 'WN-SRC-0000', notebook: 'Hors registre' });
  });
});
