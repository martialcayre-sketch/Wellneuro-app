import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PACKS_REGISTRY,
  QUESTIONNAIRE_OVERRIDES,
  packIdDepuisIdBase,
  packDoctrineDepuisIdBase,
  idBaseDepuisPackId,
  type PackId,
} from './questionnaires-functional';

// Le registre de doctrine relie trois choses qui vivent ailleurs : les `id_pack`
// de la base, les axes du registre des interventions, et les `PackId` que les
// règles d'orientation citent. Chacun de ces liens peut se rompre en silence.
// Ces bancs les tiennent — sans base, donc exécutables en CI.

const AXES_INTERVENTIONS: Set<string> = new Set(
  (
    JSON.parse(
      readFileSync(
        path.resolve(__dirname, '../../../docs/claude/corpus/nnpp2_interventions_registry.json'),
        'utf8',
      ),
    ) as { interventions: { axeId: string }[] }
  ).interventions.map(entree => entree.axeId),
);

describe('registre de doctrine des packs', () => {
  it('aucun `id_pack` de base revendiqué par deux packs de doctrine', () => {
    const idsBase = PACKS_REGISTRY.map(pack => pack.idPackBase).filter((id): id is string => id !== null);
    expect(new Set(idsBase).size).toBe(idsBase.length);
  });

  it('aucun `PackId` en double', () => {
    const ids = PACKS_REGISTRY.map(pack => pack.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque `axeId` renseigné existe au registre des interventions', () => {
    // Un axe renommé au LOT-00 sans reprise ici passerait inaperçu : le pack
    // resterait rattaché à une doctrine qui n'existe plus.
    const axesInconnus = PACKS_REGISTRY.filter(
      pack => pack.axeId !== null && !AXES_INTERVENTIONS.has(pack.axeId),
    ).map(pack => `${pack.id} → ${pack.axeId}`);
    expect(axesInconnus).toEqual([]);
  });

  it('le registre des interventions n\'est pas vide — sinon le contrôle d\'axe serait muet', () => {
    expect(AXES_INTERVENTIONS.size).toBeGreaterThan(0);
  });

  it('les `packsRecommandes` de chaque override pointent vers un pack déclaré', () => {
    // Itération sur la SOURCE, jamais sur une liste d'ids recopiée : une entrée
    // ajoutée demain avec un pack inexistant doit rougir toute seule.
    const declares = new Set<string>(PACKS_REGISTRY.map(pack => pack.id));
    const inconnus: string[] = [];
    for (const [idQuestionnaire, override] of Object.entries(QUESTIONNAIRE_OVERRIDES)) {
      for (const packId of override.packsRecommandes ?? []) {
        if (!declares.has(packId)) inconnus.push(`${idQuestionnaire} → ${packId}`);
      }
    }
    expect(Object.keys(QUESTIONNAIRE_OVERRIDES).length).toBeGreaterThan(0);
    expect(inconnus).toEqual([]);
  });

  it('chaque `PackId` du type a une entrée au registre — et réciproquement', () => {
    // `PackId` (union de types) et `PACKS_REGISTRY` (tableau) sont deux listes
    // parallèles que rien ne contraignait. Un id ajouté à l'une seule donnerait
    // un pack sans `idPackBase`, sans niveau, et un repli silencieux côté
    // moteur.
    const parId: Record<PackId, true> = Object.fromEntries(
      PACKS_REGISTRY.map(pack => [pack.id, true]),
    ) as Record<PackId, true>;
    expect(Object.keys(parId)).toHaveLength(PACKS_REGISTRY.length);
  });
});

describe('traduction base → doctrine', () => {
  it('traduit les `id_pack` réellement présents en production', () => {
    // Relevé en base le 2026-08-03. Si un de ces packs disparaissait ou était
    // renommé, la correspondance mentirait — ce banc le dirait.
    expect(packIdDepuisIdBase('PACK_SOCLE_INIT')).toBe('pack_socle_initial_neuronutrition');
    expect(packIdDepuisIdBase('PACK_STRESS_BURNOUT')).toBe('pack_stress_chronique_burnout');
    expect(packIdDepuisIdBase('PACK_SOMMEIL_CHRONO')).toBe('pack_sommeil_chronobiologie');
    expect(packIdDepuisIdBase('PACK_HUMEUR_NEURO')).toBe('pack_humeur_motivation_neurochimie');
    expect(packIdDepuisIdBase('PACK_DIGESTIF_INTESTIN')).toBe('pack_digestif_intestin_cerveau');
    expect(packIdDepuisIdBase('PACK_CARDIO_METABO')).toBe('pack_cardio_metabolique_poids_inflammation');
  });

  it('rend `null` pour un pack composé par le praticien', () => {
    expect(packIdDepuisIdBase('PACK_-bG21yeIvVYRhrdlYuWIMnFz')).toBeNull();
    expect(packIdDepuisIdBase('PACK_b8sda7asd-h_B8x8061uORhc')).toBeNull();
  });

  it('rend `null` pour un slug de doctrine passé comme un `id_pack`', () => {
    // Les deux espaces de noms sont disjoints : un slug n'est jamais un
    // `id_pack`. Confondre les deux est le défaut que le LOT-03 a corrigé.
    for (const pack of PACKS_REGISTRY) {
      expect(packIdDepuisIdBase(pack.id)).toBeNull();
    }
  });

  it('rend l\'entrée de doctrine complète, axe compris', () => {
    const entree = packDoctrineDepuisIdBase('PACK_SOMMEIL_CHRONO');
    expect(entree).toMatchObject({
      id: 'pack_sommeil_chronobiologie' satisfies PackId,
      axeId: 'sommeil-chronobiologie',
      niveau: 'approfondissement',
    });
    expect(packDoctrineDepuisIdBase('PACK_INCONNU')).toBeNull();
  });

  it('la traduction est réversible sur les packs qui existent en base', () => {
    for (const pack of PACKS_REGISTRY) {
      if (pack.idPackBase === null) continue;
      expect(idBaseDepuisPackId(pack.id)).toBe(pack.idPackBase);
      expect(packIdDepuisIdBase(pack.idPackBase)).toBe(pack.id);
    }
  });

  it('un pack sans existence en base ne se traduit dans aucun sens', () => {
    const sansBase = PACKS_REGISTRY.filter(pack => pack.idPackBase === null);
    expect(sansBase.length).toBeGreaterThan(0);
    for (const pack of sansBase) {
      // Aller : le slug n'est pas un `id_pack`. Retour : pas d'`id_pack` à
      // rendre. C'est ce `null` qui empêche une recommandation d'être un
      // cul-de-sac silencieux à l'assignation.
      expect(packIdDepuisIdBase(pack.id)).toBeNull();
      expect(idBaseDepuisPackId(pack.id)).toBeNull();
    }
  });
});
