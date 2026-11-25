import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

// LES BORNES DE D-538 §5 ET LA MENTION DE D-542 §5 ([[D-548]] §2.4).
//   — Horne : le total 30 passe dans la catégorie de la table publiée
//     (`WN-CL-0697-003`, 16-30 « nettement du soir ») ;
//   — PSQI : la meilleure cote de l'efficacité ne va qu'aux valeurs STRICTEMENT
//     au-dessus de la borne publiée (`WN-CL-0666-015`, « > 85 % ») ;
//   — Horne : la note du responsable (question 20261117-1313-b, variante C) ;
//   — MFI-20 : la mention de l'écart de structure, à la fin de la note.

const DEF = (id: string): any => (QUESTIONNAIRE_CATALOGUE as any)[id];

// ── Horne ───────────────────────────────────────────────────────────────────
const ITEMS_HORNE = ['HO1', 'HO2', 'HO3', 'HO4', 'HO5', 'HO6', 'HO7', 'HO8', 'HO9', 'HO10', 'HO11', 'HO12', 'HO13', 'HO14', 'HO15', 'HO16', 'HO17', 'HO18', 'HO19'];

/** Un jeu de réponses valides dont le total vaut `cible` (programmation dynamique). */
function reponsesDeTotal(cible: number): Record<string, number> {
  const questions: any[] = (DEF('Q_SOM_05').sections ?? []).flatMap((s: any) => s.questions ?? []).concat(DEF('Q_SOM_05').questions ?? []);
  const options = ITEMS_HORNE.map(id => {
    const q = questions.find(x => x.id === id);
    return (q.options as { v: number }[]).map(o => o.v);
  });
  const chemin: Map<number, number[]>[] = [new Map([[0, []]])];
  options.forEach((opts, i) => {
    const suivant = new Map<number, number[]>();
    for (const [somme, choix] of chemin[i]) {
      for (const v of opts) if (!suivant.has(somme + v)) suivant.set(somme + v, [...choix, v]);
    }
    chemin.push(suivant);
  });
  const choix = chemin[ITEMS_HORNE.length].get(cible);
  if (!choix) throw new Error(`total ${cible} inatteignable`);
  return Object.fromEntries(ITEMS_HORNE.map((id, i) => [id, choix[i]]));
}

describe('Horne — le total 30 suit la table publiée (D-538 §4.1 et §5.1)', () => {
  const lire = (total: number) => calculateScore('Q_SOM_05', reponsesDeTotal(total)) as any;

  it('30 est « tout à fait du soir », 31 « modérément du soir »', () => {
    const a = lire(30);
    expect(a.total).toBe(30);
    expect(a.interpretation.label).toBe('Tout à fait du soir');
    expect(lire(31).interpretation.label).toBe('Modérément du soir');
    expect(lire(29).interpretation.label).toBe('Tout à fait du soir');
  });

  it("les autres frontières de la table ne bougent pas (41/42, 58/59, 69/70)", () => {
    expect(lire(41).interpretation.label).toBe('Modérément du soir');
    expect(lire(42).interpretation.label).toBe('Neutre');
    expect(lire(58).interpretation.label).toBe('Neutre');
    expect(lire(59).interpretation.label).toBe('Modérément du matin');
    expect(lire(69).interpretation.label).toBe('Modérément du matin');
    expect(lire(70).interpretation.label).toBe('Tout à fait du matin');
  });

  it('la note fixe du responsable accompagne le résultat, mot pour mot sur ses deux limites', () => {
    const note: string = lire(50).note;
    expect(note).toContain("Classement selon la grille d'origine (Horne et Östberg, 1976).");
    expect(note).toContain('566 travailleurs français non postés de 44 à 58 ans');
    expect(note).toContain("pour cette population seulement");
    expect(note).toContain("elles ne remplacent pas la grille affichée. L'application ne tient pas compte de l'âge.");
    // Aucune borne chiffrée de la validation française dans la note (variante C).
    expect(note).not.toMatch(/\b(52|53|64|65)\b/);
  });
});

// ── PSQI ────────────────────────────────────────────────────────────────────
const BASE_PSQI = {
  Q2: 10, Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0, Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0, Q6: 0, Q7: 0, Q8: 0, Q9: 0,
};

describe("PSQI — l'efficacité : la meilleure cote exige STRICTEMENT plus que la borne (D-538 §2 et §5.2)", () => {
  // 10 h au lit (22 h → 8 h) ; les heures dormies fixent l'efficacité.
  const c4 = (heuresDormies: number) => {
    const r = calculateScore('Q_SOM_01', { ...BASE_PSQI, Q1: 22, Q3: 8, Q4: heuresDormies }) as any;
    return { cote: r.components.find((c: any) => c.id === 'C4').val, efficacite: r.efficiency };
  };

  it('85 % reçoit la cote 1, et 86 % la cote 0', () => {
    expect(c4(8.5)).toEqual({ cote: 1, efficacite: 85 });
    expect(c4(9)).toEqual({ cote: 0, efficacite: 90 });
  });

  it('les autres cotes de la grille publiée ne bougent pas : 75 % → 1, 74 % → 2, 65 % → 2, 64 % → 3', () => {
    expect(c4(7.5).cote).toBe(1);
    expect(c4(7).cote).toBe(2);
    expect(c4(6.5).cote).toBe(2);
    expect(c4(6).cote).toBe(3);
  });
});

// ── MFI-20 ──────────────────────────────────────────────────────────────────
describe('MFI-20 — la mention de D-542 §2 est à la fin de la note, sans identifiant de claim', () => {
  const note: string = DEF('Q_SOM_07').scoring.note;

  it("elle suit la note servie, qui n'est pas modifiée", () => {
    expect(note.indexOf('ne valent pas bande.')).toBeGreaterThan(0);
    expect(note.indexOf('Structure : la seule validation publiée de cette traduction')).toBeGreaterThan(
      note.indexOf('ne valent pas bande.'),
    );
    expect(note.endsWith('les garde en attendant plus d\'informations.')).toBe(true);
  });

  it('elle nomme la population de la validation et la clé du manuel, sans crochets', () => {
    expect(note).toContain('Fillion et al. 2003, 604 patients traités pour un cancer du sein ou de la prostate');
    expect(note).toContain('15 items en quatre facteurs');
    expect(note).toContain('suivent la clé du manuel');
    expect(note).toContain('Smets et al. 1995');
    expect(note).not.toMatch(/\[0\d{3}-\d{3}/);
    expect(note).not.toContain('WN-CL-');
  });

  it("ni clé, ni sous-échelle, ni version ne changent (D-542 §5.3)", () => {
    const sc = DEF('Q_SOM_07').scoring;
    expect(Object.keys(sc)).not.toContain('version');
  });
});
