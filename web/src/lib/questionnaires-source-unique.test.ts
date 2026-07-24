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

describe('source unique des questionnaires', () => {
  const defsModule = Object.entries(MOD)
    .filter(([, v]) => estDefinitionQuestionnaire(v))
    .map(([nom, v]) => ({ nom, def: v as { id: string; sections: unknown[] } }));

  it('tout questionnaire exporté par un module EST la valeur servie (égalité de référence)', () => {
    const divergents = defsModule
      .filter(({ def }) => (QUESTIONNAIRE_CATALOGUE as Record<string, unknown>)[def.id] !== def)
      .map(({ nom, def }) => `${nom} (id ${def.id})`);
    // Un export ici signale soit un doublon divergent (défini inline ET en
    // module), soit un module orphelin non câblé au catalogue.
    expect(divergents).toEqual([]);
  });

  it('aucune régression du nombre de questionnaires modulaires', () => {
    // 36 questionnaires servis depuis leur module (shorthand). Ce compte ne doit
    // évoluer que par un ajout/retrait volontaire, jamais par surprise.
    expect(defsModule.length).toBe(36);
  });
});
