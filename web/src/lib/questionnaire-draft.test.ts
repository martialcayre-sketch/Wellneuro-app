// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDraft,
  hasDraft,
  readDraft,
  readDraftSavedAt,
  readQuestionnaireDraft,
  resolveResumePage,
  writeDraft,
  writeQuestionnaireDraft,
} from './questionnaire-draft';

const idAssignation = 'ASS_DRAFT_TEST';

describe('questionnaire-draft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('écrit et relit l’enveloppe versionnée et sa métadonnée séparée', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T10:00:00.000Z'));

    writeQuestionnaireDraft(idAssignation, {
      version: 1,
      answers: { Q1: '2' },
      currentPage: 3,
    });

    expect(readQuestionnaireDraft(idAssignation)).toEqual({
      version: 1,
      answers: { Q1: '2' },
      currentPage: 3,
    });
    expect(JSON.parse(localStorage.getItem(`wellneuro:questionnaire-draft:v1:${idAssignation}`)!)).toEqual({
      version: 1,
      answers: { Q1: '2' },
      currentPage: 3,
    });
    expect(readDraftSavedAt(idAssignation)?.toISOString()).toBe('2026-07-14T10:00:00.000Z');
  });

  it('lit le format historique puis le migre seulement à la prochaine écriture', () => {
    localStorage.setItem(`wellneuro:draft:${idAssignation}`, JSON.stringify({ Q1: '1' }));
    localStorage.setItem(`wellneuro:draft-meta:${idAssignation}`, '2026-07-13T09:00:00.000Z');

    expect(readQuestionnaireDraft(idAssignation)).toEqual({ version: 1, answers: { Q1: '1' }, currentPage: 0 });
    expect(localStorage.getItem(`wellneuro:questionnaire-draft:v1:${idAssignation}`)).toBeNull();

    writeQuestionnaireDraft(idAssignation, { version: 1, answers: { Q1: '1', Q2: '0' }, currentPage: 1 });
    expect(localStorage.getItem(`wellneuro:draft:${idAssignation}`)).toBeNull();
    expect(localStorage.getItem(`wellneuro:draft-meta:${idAssignation}`)).toBeNull();
    expect(readDraft(idAssignation)).toEqual({ Q1: '1', Q2: '0' });
  });

  it('ignore les JSON corrompus, versions inconnues, réponses non textuelles et pages invalides', () => {
    const key = `wellneuro:questionnaire-draft:v1:${idAssignation}`;
    for (const value of [
      '{',
      JSON.stringify({ version: 2, answers: {}, currentPage: 0 }),
      JSON.stringify({ version: 1, answers: { Q1: 1 }, currentPage: 0 }),
      JSON.stringify({ version: 1, answers: {}, currentPage: -1 }),
      JSON.stringify({ version: 1, answers: {}, currentPage: 1.5 }),
    ]) {
      localStorage.setItem(key, value);
      expect(readQuestionnaireDraft(idAssignation)).toBeNull();
    }
  });

  it('conserve les wrappers historiques et efface les deux formats', () => {
    writeDraft(idAssignation, { Q1: '2' });
    expect(readDraft(idAssignation)).toEqual({ Q1: '2' });
    expect(hasDraft(idAssignation)).toBe(true);
    localStorage.setItem(`wellneuro:draft:${idAssignation}`, JSON.stringify({ Q2: '1' }));
    localStorage.setItem(`wellneuro:draft-meta:${idAssignation}`, new Date().toISOString());

    clearDraft(idAssignation);

    expect(readQuestionnaireDraft(idAssignation)).toBeNull();
    expect(localStorage.getItem(`wellneuro:draft:${idAssignation}`)).toBeNull();
    expect(localStorage.getItem(`wellneuro:draft-meta:${idAssignation}`)).toBeNull();
    expect(hasDraft(idAssignation)).toBe(false);
  });

  it('ne reprend jamais après la première page incomplète', () => {
    const pages = [['Q1'], ['Q2'], ['Q3']];
    expect(resolveResumePage(2, { Q1: '1' }, pages)).toBe(1);
    expect(resolveResumePage(1, { Q1: '1' }, pages)).toBe(1);
    expect(resolveResumePage(99, { Q1: '1', Q2: '1' }, pages)).toBe(2);
    expect(resolveResumePage(99, { Q1: '1', Q2: '1', Q3: '1' }, pages)).toBe(2);
  });
});
