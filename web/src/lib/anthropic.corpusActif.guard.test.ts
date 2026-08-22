import { createHash } from 'crypto';
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
// v28 (2026-08-22, revue de sécurité Codex) : ligne anti-injection du bloc
// <donnees_declaratives_patient> ajoutée au cadre déontologique.
const EMPREINTE_PROMPT_ALLUME_V28 = 'cdbdfda5e37a2a0c';

async function chargerAnthropicAvecDrapeau(valeur: string | undefined) {
  vi.resetModules();
  // `undefined` SUPPRIME réellement la variable (constat N3 de la revue) —
  // le fail-closed sur ABSENCE est la doctrine du dépôt, une chaîne vide
  // n'exerce pas le même chemin.
  vi.stubEnv('WN_ENABLE_CORPUS_CLINIQUE_V1', valeur as string);
  return import('./anthropic');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/lib/clinical/corpusSyntheseV1');
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
    expect(prompt).toContain('ne cite aucune source extérieure à ce référentiel');
    // N2 : la ligne active ne présuppose pas que le corpus contient du
    // protocole — l'interdiction reste absolue, comme à l'état éteint.
    expect(prompt).toContain("n'invente pas de protocole SIIN");
    expect(prompt).toContain('pas un protocole');
    // M1 : le repli `limites` ne nie plus le corpus qu'on vient d'injecter.
    expect(mod.LIMITES_SYNTHESE_DEFAUT).toContain('avec référentiel clinique');
    // N1 : l'empreinte de l'état ALLUMÉ — celui que la pose du drapeau rend
    // effectif — est épinglée comme celle de l'état éteint l'est dans
    // `promptAlimentaire.guard.test.ts`. Toute édition de la branche ON de
    // la consigne OU de la prose du corpus rougit ici tant que la version et
    // cette empreinte n'ont pas bougé ensemble — c'est aussi le garde
    // d'intégrité que l'absence de `shaPerimetre` laissait ouvert (M2).
    const empreinte = createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    expect(
      { version: mod.VERSION_PROMPT_SYNTHESE, empreinte },
      'prompt allumé modifié : incrémenter VERSION_PROMPT_SYNTHESE et reporter la nouvelle empreinte ici',
    ).toEqual({ version: 'synthese-v28', empreinte: EMPREINTE_PROMPT_ALLUME_V28 });
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

  // D-084 (question 4 de la revue) : le verrou est auto-portant — une prose
  // retouchée après signature ne se contente plus de rougir l'empreinte N1,
  // elle FERME le corpus en production. Les cas ci-dessous éprouvent CHAQUE
  // terme du verrou, pas seulement la concordance : la classe D-069
  // (constat 4) a montré qu'un terme jamais contredit n'est tenu que par
  // accident — sa suppression resterait verte.
  async function chargerAvecMetadonneeAlteree(
    surcharge: Partial<import('@/lib/clinical/corpusSyntheseV1').CorpusCliniqueMetadata>,
  ) {
    vi.resetModules();
    vi.stubEnv('WN_ENABLE_CORPUS_CLINIQUE_V1', '1');
    vi.doMock('@/lib/clinical/corpusSyntheseV1', async () => {
      const reel = await vi.importActual<
        typeof import('@/lib/clinical/corpusSyntheseV1')
      >('@/lib/clinical/corpusSyntheseV1');
      return {
        ...reel,
        CORPUS_CLINIQUE_METADATA: { ...reel.CORPUS_CLINIQUE_METADATA, ...surcharge },
      };
    });
    return import('./anthropic');
  }

  it('périmètre discordant : fermé malgré flag posé et signature vraie', async () => {
    const mod = await chargerAvecMetadonneeAlteree({
      shaPerimetre: 'empreinte-perimee-apres-retouche',
    });
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
    const prompt = mod.buildSystemPromptSynthese();
    expect(prompt).not.toContain(TITRE_CORPUS);
    expect(prompt).toContain(LIGNE_INDISPONIBLE);
    expect(mod.LIMITES_SYNTHESE_DEFAUT).toContain('sans corpus SIIN complet');
  });

  it("périmètre jamais relu (`shaPerimetre: null`) : fermé — l'état que le type documente", async () => {
    const mod = await chargerAvecMetadonneeAlteree({ shaPerimetre: null });
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
  });

  it('date absente : fermé — une signature sans date est incomplète (D-063)', async () => {
    const mod = await chargerAvecMetadonneeAlteree({ dateValidation: null });
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
  });

  it("date non canonique (`'2026-08-22'`) : fermé — la forme est contrôlée (D-067)", async () => {
    const mod = await chargerAvecMetadonneeAlteree({ dateValidation: '2026-08-22' });
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
  });

  it("date non canonique (`'…T00:00:00Z'` sans millisecondes) : fermé", async () => {
    const mod = await chargerAvecMetadonneeAlteree({ dateValidation: '2026-08-22T00:00:00Z' });
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
  });

  it("date illisible (`'demain'`) : fermé — sans RangeError au chargement (N4)", async () => {
    // Le terme `!Number.isNaN(...)` a son mode de défaillance propre : sans
    // lui, `toISOString()` sur une date illisible JETTE au chargement du
    // module et la route rendrait 500 au lieu de se fermer. Ce cas prouve la
    // fermeture silencieuse (patron `indicationsBiologieV1.guard`).
    const mod = await chargerAvecMetadonneeAlteree({ dateValidation: 'demain' });
    expect(mod.CORPUS_CLINIQUE_ACTIF).toBe(false);
  });

  // La contre-épreuve inverse : l'ÉTAT LIVRÉ concorde. Le cas « discordant »
  // prouve la fermeture, celui-ci prouve que le littéral épinglé est bien le
  // SHA du texte tel que livré — deux propriétés distinctes (patron
  // `orientationRulesV1.test.ts`).
  it('état livré : le littéral `shaPerimetre` concorde avec le SHA calculé du texte', async () => {
    const { CORPUS_CLINIQUE_METADATA, CORPUS_CLINIQUE_SHA256 } = await import(
      '@/lib/clinical/corpusSyntheseV1'
    );
    expect(CORPUS_CLINIQUE_METADATA.shaPerimetre).toBe(CORPUS_CLINIQUE_SHA256);
  });
});
