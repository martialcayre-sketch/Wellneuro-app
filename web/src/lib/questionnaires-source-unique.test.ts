import { describe, it, expect } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import * as MOD from '@/lib/questionnaires';

// Invariant de source unique (2026-07-24).
//
// Chaque questionnaire vit à un seul endroit :
// - soit défini inline dans `questions.ts` (clé littérale du catalogue) ;
// - soit défini dans un module `questionnaires/*.ts` et référencé par
//   `questions.ts` en shorthand (`Q_XXX,`), auquel cas la valeur du catalogue
//   EST l'objet du module, par référence.
//
// Ce qui est interdit : un id défini des DEUX côtés. Jusqu'au 2026-07-24, 27
// questionnaires avaient une copie module morte (jamais servie, car masquée par
// leur définition inline) qui avait divergé sémantiquement de l'inline servi
// (seuils, échelles de réponse, structure, statut de certification). Corriger
// la copie module ne changeait rien en production : piège de maintenance. Les
// copies mortes ont été supprimées ; ce test empêche qu'un tel doublon
// divergent réapparaisse.

// Reconnaît une définition de questionnaire par sa FORME (id + sections), pas
// par le nom de son export : couvre aussi les ids non standard, si un module en
// exporte un jour.
function estDefinitionQuestionnaire(v: unknown): v is { id: string; sections: unknown[] } {
  return (
    !!v && typeof v === 'object' &&
    typeof (v as { id?: unknown }).id === 'string' &&
    Array.isArray((v as { sections?: unknown }).sections)
  );
}

// FORMES ALTERNATIVES DÉCLARÉES (2026-07-28).
//
// `Q_ALI_01` existe en deux formes vivantes : l'Enquête alimentaire SIIN
// complète (57 items, /90) et le dépistage court historique (14 items, /42).
// `WN_ALI_01_SIIN57` décide laquelle est servie ; l'autre reste le repli, et
// reste donc exportée.
//
// Ce n'est PAS le doublon que ce fichier interdit. Le doublon interdit est une
// copie MORTE, jamais servie, qui dérive en silence — ici les deux formes sont
// atteignables, la bascule est explicite, et un banc dédié
// (`questionnaires/alimentaireSiin57.guard.test.ts`) vérifie qu'elles ne
// partagent aucun identifiant d'item.
//
// L'exception est nominative à dessein : tout NOUVEL export non servi continue
// de faire échouer le test. Élargir cette liste doit rester un geste conscient.
const FORMES_ALTERNATIVES_DECLAREES = new Set(['Q_ALI_01_SIIN_57', 'Q_ALI_01_COURT_14']);

describe('source unique des questionnaires', () => {
  const defsModule = Object.entries(MOD)
    .filter(([, v]) => estDefinitionQuestionnaire(v))
    .map(([nom, v]) => ({ nom, def: v as { id: string; sections: unknown[] } }));

  const defsServies = defsModule.filter(({ nom }) => !FORMES_ALTERNATIVES_DECLAREES.has(nom));

  it('tout questionnaire exporté par un module EST la valeur servie (égalité de référence)', () => {
    const divergents = defsServies
      .filter(({ def }) => (QUESTIONNAIRE_CATALOGUE as Record<string, unknown>)[def.id] !== def)
      .map(({ nom, def }) => `${nom} (id ${def.id})`);
    // Un export ici signale soit un doublon divergent (défini inline ET en
    // module), soit un module orphelin non câblé au catalogue.
    expect(divergents).toEqual([]);
  });

  it('chaque forme alternative déclarée existe, et l’une d’elles est servie', () => {
    // Sans cela, la liste d'exception pourrait nommer un export disparu et
    // n'exclure plus rien — une exception qui ne s'applique à rien donne
    // l'illusion d'une garde.
    const nomsPresents = defsModule.map(({ nom }) => nom);
    for (const nom of FORMES_ALTERNATIVES_DECLAREES) {
      expect(nomsPresents, `${nom} est déclarée en exception mais n’est plus exportée`).toContain(nom);
    }
    const alternatives = defsModule.filter(({ nom }) => FORMES_ALTERNATIVES_DECLAREES.has(nom));
    const servies = alternatives.filter(
      ({ def }) => (QUESTIONNAIRE_CATALOGUE as Record<string, unknown>)[def.id] === def,
    );
    expect(servies, 'exactement une forme alternative doit être servie').toHaveLength(1);
  });

  it('les formes alternatives portent toutes le même identifiant', () => {
    // Deux formes d'un même instrument, pas deux instruments : si l'une dérivait
    // vers un autre id, elle deviendrait un questionnaire orphelin non câblé.
    const ids = new Set(
      defsModule.filter(({ nom }) => FORMES_ALTERNATIVES_DECLAREES.has(nom)).map(({ def }) => def.id),
    );
    expect([...ids]).toEqual(['Q_ALI_01']);
  });

  it('aucune régression du nombre de questionnaires modulaires', () => {
    // 37 questionnaires servis depuis leur module (shorthand). Ce compte ne doit
    // évoluer que par un ajout/retrait volontaire, jamais par surprise.
    // 37 depuis l'ajout de Q_SOM_09 (agenda du sommeil, 2026-07-25). Compté sur
    // les seules définitions servies : les formes alternatives déclarées ne
    // gonflent pas ce chiffre, qui garde donc exactement le sens qu'il avait.
    expect(defsServies.length).toBe(37);
  });
});
