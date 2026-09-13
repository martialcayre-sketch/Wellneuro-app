import { describe, expect, it } from 'vitest';
import { dateDePassation, passationsDuCandidat } from './passationsDuCandidat';

const RELEVE = [
  { responseId: 'R-ANCIENNE', questionnaireId: 'Q_STR_04', observedAt: '2026-07-01T08:00:00.000Z' },
  { responseId: 'R-RECENTE', questionnaireId: 'Q_SOM_06', observedAt: '2026-09-10T08:00:00.000Z' },
  { responseId: 'R-MEME-JOUR', questionnaireId: 'Q_ALI_02', observedAt: '2026-09-10T08:00:00.000Z' },
];

describe('passationsDuCandidat', () => {
  it('traduit chaque identifiant en instrument et en date', () => {
    const rendu = passationsDuCandidat({ responseIds: ['R-RECENTE'], sourceRefs: RELEVE });

    expect(rendu).toEqual([
      { responseId: 'R-RECENTE', idQuestionnaire: 'Q_SOM_06', observeLe: '2026-09-10T08:00:00.000Z' },
    ]);
  });

  it('rend la plus récente d’abord, et départage à date égale par l’instrument', () => {
    // Ordre déterministe : deux rendus de la même carte doivent donner la même
    // liste, sinon un repli ouvert saute d'une ligne à l'autre.
    const rendu = passationsDuCandidat({
      responseIds: ['R-ANCIENNE', 'R-MEME-JOUR', 'R-RECENTE'],
      sourceRefs: RELEVE,
    });

    expect(rendu.map(p => p.idQuestionnaire)).toEqual(['Q_ALI_02', 'Q_SOM_06', 'Q_STR_04']);
  });

  it('DIT une source absente du relevé au lieu de l’élider', () => {
    // La divergence assumée avec `recoupementsContradictions`, qui la filtre :
    // là-bas on calcule une intersection, ici on rend une provenance. Taire une
    // source qu'on n'a pas su retrouver ferait passer une chaîne trouée pour
    // une chaîne complète (`DC-01`).
    const rendu = passationsDuCandidat({
      responseIds: ['R-RECENTE', 'R-INCONNUE'],
      sourceRefs: RELEVE,
    });

    expect(rendu).toHaveLength(2);
    const inconnue = rendu.find(p => p.responseId === 'R-INCONNUE');
    expect(inconnue).toEqual({ responseId: 'R-INCONNUE', idQuestionnaire: null, observeLe: null });
  });

  it('les sources introuvables ferment la marche, sans rang suggéré', () => {
    const rendu = passationsDuCandidat({
      responseIds: ['R-INCONNUE', 'R-RECENTE'],
      sourceRefs: RELEVE,
    });

    expect(rendu.map(p => p.responseId)).toEqual(['R-RECENTE', 'R-INCONNUE']);
  });

  it('dédoublonne un identifiant répété', () => {
    const rendu = passationsDuCandidat({
      responseIds: ['R-RECENTE', 'R-RECENTE'],
      sourceRefs: RELEVE,
    });

    expect(rendu).toHaveLength(1);
  });

  it('un relevé vide ne fabrique aucune traduction', () => {
    const rendu = passationsDuCandidat({ responseIds: ['R-RECENTE'], sourceRefs: [] });

    expect(rendu).toEqual([
      { responseId: 'R-RECENTE', idQuestionnaire: null, observeLe: null },
    ]);
  });
});

describe('dateDePassation', () => {
  it('rend `JJ/MM/AAAA` dans le fuseau clinique', () => {
    expect(dateDePassation('2026-09-10T08:00:00.000Z')).toBe('10/09/2026');
  });

  it('le fuseau est celui du cockpit, pas celui de la machine', () => {
    // 23 h 30 UTC le 9 septembre, c'est déjà le 10 à Paris. Sans le fuseau,
    // une passation changerait de jour selon l'endroit d'où on la lit.
    expect(dateDePassation('2026-09-09T23:30:00.000Z')).toBe('10/09/2026');
  });
});
