import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';

// Garde de la séparation mesure / conduite (arbitrage du 2026-07-26).
// Sortir la conduite de la bande d'interprétation ne l'a pas empêchée de
// partir au modèle de synthèse : le bloc `scores` sérialise `scoresJson` en
// entier, la clé avait seulement remonté d'un niveau. Le défaut cherché ici est
// donc la réapparition d'une conduite dans le prompt, quelle qu'en soit la
// forme — `conduite` (courante) ou `interpretation.protocol` (héritée).
//
// Le contrôle structurel double le contrôle comportemental parce que Next.js
// interdit d'exporter un symbole runtime depuis un `route.ts` : `buildUserMessage`
// n'est pas appelable depuis un test. Même patron que
// `pseudonymisation.guard.test.ts`.

const SOURCE = readFileSync(join(__dirname, 'route.ts'), 'utf8');

/** Toute clé `conduite`/`protocol` restant dans une structure, à toute profondeur. */
function cheminsDeConduite(valeur: unknown, chemin = ''): string[] {
  if (Array.isArray(valeur)) {
    return valeur.flatMap((v, i) => cheminsDeConduite(v, `${chemin}[${i}]`));
  }
  if (valeur === null || typeof valeur !== 'object') return [];
  const trouves: string[] = [];
  for (const [cle, v] of Object.entries(valeur as Record<string, unknown>)) {
    const ici = chemin ? `${chemin}.${cle}` : cle;
    if (cle === 'conduite' || cle === 'protocol') trouves.push(ici);
    else trouves.push(...cheminsDeConduite(v, ici));
  }
  return trouves;
}

function questionsDe(id: string): Array<{ id: string; options?: Array<{ v: unknown }> }> {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id];
  return (def?.sections ?? []).flatMap((s: any) => s.questions ?? []);
}

/** Réponses saturées à la borne basse ou haute de chaque échelle proposée. */
function reponsesALaBorne(id: string, borne: 'min' | 'max'): Record<string, number> {
  return Object.fromEntries(
    questionsDe(id).map(q => {
      const valeurs = (q.options ?? []).map(o => Number(o.v)).filter(Number.isFinite);
      return [q.id, borne === 'min' ? Math.min(...valeurs) : Math.max(...valeurs)];
    })
  );
}

describe('Synthèse IA — aucune conduite clinique dans le prompt (structurel)', () => {
  it('le bloc `scores` du message utilisateur passe par `scoresPourPrompt`', () => {
    expect(SOURCE).toMatch(/scores:\s*scoresPourPrompt\(r\.scores\)/);
    expect(SOURCE).not.toMatch(/^\s*scores:\s*r\.scores\s*,/m);
  });

  it('la mini-synthèse continue de lire l’objet original, non filtré', () => {
    // Sans cela, l'orientation disparaîtrait du prompt entier au lieu d'y
    // figurer une fois, étiquetée.
    expect(SOURCE).toMatch(/miniSynthese:\s*buildMiniSynthese\(r\.scores\)/);
  });
});

describe('scoresPourPrompt — comportement', () => {
  it('retire la forme courante (`conduite` à la racine)', () => {
    const scores = { total: 12, interpretation: { label: 'Fatigue sévère' }, conduite: 'Protocole 21 jours' };
    expect(scoresPourPrompt(scores)).toEqual({ total: 12, interpretation: { label: 'Fatigue sévère' } });
  });

  it('retire la forme héritée (`interpretation.protocol`)', () => {
    const scores = { total: 12, interpretation: { label: 'Fatigue sévère', protocol: 'Protocole 21 jours' } };
    expect(scoresPourPrompt(scores)).toEqual({ total: 12, interpretation: { label: 'Fatigue sévère' } });
  });

  it('retire une conduite imbriquée dans un sous-score', () => {
    const scores = {
      subScores: [
        { id: 'D', label: 'Dopamine', total: 5, interpretation: { label: 'Perturbation', protocol: 'Bilan' } },
        { id: 'S', label: 'Sérotonine', total: 4, conduite: 'Orienter' },
      ],
    };
    expect(cheminsDeConduite(scoresPourPrompt(scores))).toEqual([]);
    expect((scoresPourPrompt(scores) as any).subScores[0].interpretation.label).toBe('Perturbation');
  });

  it('ne mute pas l’entrée', () => {
    const scores = { interpretation: { label: 'Sévère', protocol: 'Protocole' }, conduite: 'Orienter' };
    scoresPourPrompt(scores);
    expect(scores.conduite).toBe('Orienter');
    expect(scores.interpretation.protocol).toBe('Protocole');
  });

  it('laisse intact tout ce qui n’est pas une conduite', () => {
    const scores = { total: 3, rawAnswers: { Q1: 2 }, tags: ['a', 'b'], nul: null, certification: { source: 'drive' } };
    expect(scoresPourPrompt(scores)).toEqual(scores);
  });
});

describe('Balayage du catalogue servi — aucune conduite ne survit à la sérialisation', () => {
  const ids = Object.keys(QUESTIONNAIRE_CATALOGUE);

  it('le catalogue balayé n’est pas vide', () => {
    expect(ids.length).toBeGreaterThan(50);
  });

  it('aucun instrument, à aucune borne, ne laisse passer de conduite', () => {
    const fuites: string[] = [];
    let porteurs = 0;
    for (const id of ids) {
      for (const borne of ['min', 'max'] as const) {
        let scores: unknown;
        try {
          scores = calculateScore(id, reponsesALaBorne(id, borne));
        } catch {
          continue; // questionnaire non scorable en l'état (cabinet, agenda…)
        }
        if (cheminsDeConduite(scores).length > 0) porteurs += 1;
        const restes = cheminsDeConduite(scoresPourPrompt(scores));
        if (restes.length > 0) fuites.push(`${id} (${borne}) → ${restes.join(', ')}`);
      }
    }
    // Le balayage doit réellement rencontrer des conduites, sans quoi il
    // passerait au vert en ne testant rien.
    expect(porteurs, 'aucune conduite rencontrée : le balayage ne prouve rien').toBeGreaterThan(0);
    expect(fuites, `conduites parvenues au prompt : ${fuites.join(' | ')}`).toEqual([]);
  });

  it('aucune conduite servie ne se loge hors de la racine', () => {
    // Le filtre agit à toute profondeur ; `buildMiniSynthese` ne lit que la
    // racine (`conduite`, puis `interpretation.protocol`). Une conduite posée
    // plus bas — sous `subScores[].interpretation` par exemple — serait donc
    // retirée du prompt sans y être remise ailleurs : le doublon deviendrait
    // une perte, en silence. Aucun instrument n'en pose aujourd'hui ; cette
    // garde est ce qui l'empêche de commencer.
    const PORTEES = new Set(['conduite', 'interpretation.protocol']);
    const horsRacine: string[] = [];
    for (const id of ids) {
      for (const borne of ['min', 'max'] as const) {
        let scores: unknown;
        try {
          scores = calculateScore(id, reponsesALaBorne(id, borne));
        } catch {
          continue;
        }
        for (const chemin of cheminsDeConduite(scores)) {
          if (!PORTEES.has(chemin)) horsRacine.push(`${id} (${borne}) → ${chemin}`);
        }
      }
    }
    expect(
      horsRacine,
      `conduites hors de portée de la mini-synthèse : ${horsRacine.join(' | ')}`
    ).toEqual([]);
  });

  it('chaque conduite servie reste portée par la mini-synthèse, étiquetée', () => {
    const perdues: string[] = [];
    for (const id of ids) {
      for (const borne of ['min', 'max'] as const) {
        let scores: any;
        try {
          scores = calculateScore(id, reponsesALaBorne(id, borne));
        } catch {
          continue;
        }
        const conduite = typeof scores?.conduite === 'string' ? scores.conduite.trim() : '';
        if (!conduite) continue;
        const mini = buildMiniSynthese(scores) || '';
        if (!mini.includes(conduite)) perdues.push(`${id} (${borne})`);
      }
    }
    // C'est ce qui autorise le filtre : ce qu'il retire du bloc brut, le prompt
    // le reçoit ailleurs, sous « — Orientation : ».
    expect(perdues, `conduites absentes de la mini-synthèse : ${perdues.join(', ')}`).toEqual([]);
  });
});
