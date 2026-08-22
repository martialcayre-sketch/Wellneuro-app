import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Le chemin ALLUMÉ du corpus clinique n'était testé nulle part (revue
 * adversariale de D-082) : toutes les specs de synthèse mockent le corpus
 * éteint, alors que la signature rend précisément ce chemin atteignable.
 * Ce banc charge le module dans les deux états du drapeau et vérifie que le
 * prompt ne s'y contredit jamais — c'est le constat H1 : avant v27,
 * l'activation servait au modèle « le corpus SIIN n'est pas disponible » ET
 * un corpus intitulé SIIN, dans la même consigne.
 */

const LIGNE_INDISPONIBLE = "n'est pas encore disponible";
const TITRE_CORPUS = 'Référentiel clinique SIIN — Snapshot V1';

async function chargerAnthropicAvecDrapeau(valeur: string | undefined) {
  vi.resetModules();
  if (valeur === undefined) {
    vi.stubEnv('WN_ENABLE_CORPUS_CLINIQUE_V1', '');
  } else {
    vi.stubEnv('WN_ENABLE_CORPUS_CLINIQUE_V1', valeur);
  }
  return import('./anthropic');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('prompt de synthèse — les deux états du corpus clinique (D-082, H1)', () => {
  it("drapeau posé : le corpus est injecté et la consigne ne le déclare PAS indisponible", async () => {
    const mod = await chargerAnthropicAvecDrapeau('1');
    // La table est signée (D-082) : le ET est vrai.
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(true);
    const prompt = mod.buildSystemPromptSynthese();
    expect(prompt).toContain(TITRE_CORPUS);
    expect(prompt).toContain('Référentiel clinique versionné');
    // H1 : les deux affirmations ne doivent jamais coexister.
    expect(prompt).not.toContain(LIGNE_INDISPONIBLE);
    // La consigne active garde une instruction anti-hallucination de source.
    expect(prompt).toContain("ne cite aucune source qui n'y figure pas");
    // M1 : le repli `limites` ne nie plus le corpus qu'on vient d'injecter.
    expect(mod.LIMITES_SYNTHESE_DEFAUT).toContain('avec référentiel clinique');
  });

  it('drapeau absent : pas de corpus, et la consigne le dit indisponible', async () => {
    const mod = await chargerAnthropicAvecDrapeau(undefined);
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
    const prompt = mod.buildSystemPromptSynthese();
    expect(prompt).not.toContain(TITRE_CORPUS);
    expect(prompt).toContain(LIGNE_INDISPONIBLE);
    expect(mod.LIMITES_SYNTHESE_DEFAUT).toContain('sans corpus SIIN complet');
  });

  it("drapeau à une valeur non-'1' : fermé — la convention est stricte", async () => {
    const mod = await chargerAnthropicAvecDrapeau('true');
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
  });
});
