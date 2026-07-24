import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle (audit HDS 2026-07-24) : aucune identité patient ne part
// vers l'API Anthropic. Le contrôle ne juge pas la sortie du modèle : il
// vérifie que la construction du message utilisateur (`buildUserMessage`) ne
// reçoit ni ne référence `prenom`/`nom`, et que le gabarit n'a pas retrouvé
// d'en-tête « Patient : ». Réintroduire l'un ou l'autre est le défaut cherché.
//
// Le contexte clinique reste hors de ce test à dessein :
// `buildContexteClinique` exclut l'identité par construction (champs cliniques
// listés un à un), et ses champs libres sont de la donnée clinique, pas un
// en-tête d'identité.

const SOURCE = readFileSync(join(__dirname, 'route.ts'), 'utf8');

describe('Synthèse IA — pseudonymisation de l’appel Anthropic (structurel)', () => {
  it('buildUserMessage ne reçoit ni prénom ni nom', () => {
    const appels = SOURCE.match(/buildUserMessage\([^)]*\)/g) ?? [];
    expect(appels.length).toBeGreaterThan(0);
    for (const appel of appels) {
      expect(appel, `identité passée au message Anthropic : « ${appel} »`).not.toMatch(/prenom|\bnom\b/);
    }
  });

  it('le gabarit du message ne contient plus d’en-tête « Patient : »', () => {
    expect(SOURCE).not.toContain('Patient : ${');
  });
});
