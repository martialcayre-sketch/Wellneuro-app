import { describe, expect, it } from 'vitest';
import { buildMiniSynthese } from './miniSynthese';

describe('buildMiniSynthese', () => {
  it('renvoie une chaîne vide sans throw pour null, undefined ou {}', () => {
    expect(buildMiniSynthese(null)).toBe('');
    expect(buildMiniSynthese(undefined)).toBe('');
    expect(buildMiniSynthese({})).toBe('');
  });

  it('renvoie une chaîne vide pour une entrée non-objet', () => {
    // @ts-expect-error scores brut non garanti conforme (JSON stocké)
    expect(buildMiniSynthese('texte')).toBe('');
  });

  it('interprétation globale simple → le label seul', () => {
    const result = buildMiniSynthese({ interpretation: { label: 'Fatigue modérée' } });
    expect(result).toBe('Fatigue modérée');
  });

  it('interprétation globale avec detail → label + detail concaténés', () => {
    const result = buildMiniSynthese({
      interpretation: { label: 'Fatigue modérée', detail: 'à surveiller sur 4 semaines' },
    });
    expect(result).toBe('Fatigue modérée. à surveiller sur 4 semaines');
  });

  it('interprétation globale avec protocol (sans detail) → orientation ajoutée', () => {
    const result = buildMiniSynthese({
      interpretation: { label: 'Fatigue sévère', protocol: 'Protocole 21 jours' },
    });
    expect(result).toBe('Fatigue sévère — Orientation : Protocole 21 jours');
  });

  it('label vide/blanc est ignoré, retombe sur les subScores puis sur vide', () => {
    expect(buildMiniSynthese({ interpretation: { label: '   ' } })).toBe('');
  });

  it('multi-axes (DNSM) — aucun axe perturbé', () => {
    const result = buildMiniSynthese({
      subScores: [
        { id: 'D', label: 'Dopamine', total: 5, interpretation: { label: 'Dans la norme', color: 'success' } },
        { id: 'S', label: 'Sérotonine', total: 4, interpretation: { label: 'Dans la norme', color: 'success' } },
      ],
    });
    expect(result).toBe('Tous les axes explorés sont peu perturbés.');
  });

  it('multi-axes (DNSM) — tri par sévérité et limite à 3 axes perturbés', () => {
    const result = buildMiniSynthese({
      subScores: [
        { id: 'D', label: 'Dopamine', total: 1, interpretation: { label: 'Perturbation légère', color: 'warning' } },
        { id: 'N', label: 'Noradrénaline', total: 1, interpretation: { label: 'Perturbation sévère', color: 'danger' } },
        { id: 'S', label: 'Sérotonine', total: 8, interpretation: { label: 'Dans la norme', color: 'success' } },
        { id: 'M', label: 'Mélatonine', total: 1, interpretation: { label: 'Perturbation modérée', color: 'warning' } },
      ],
    });
    // Danger avant warning : Noradrénaline en tête.
    expect(result).toBe(
      'Noradrénaline : perturbation sévère ; Dopamine : perturbation légère ; Mélatonine : perturbation modérée'
    );
  });

  it('subScores présent mais vide → chaîne vide', () => {
    expect(buildMiniSynthese({ subScores: [] })).toBe('');
  });
});
