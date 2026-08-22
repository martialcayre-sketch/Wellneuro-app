import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE } from '@/lib/anthropic';

// Revue adversariale du 2026-08-22, constat M4 : le bump `synthese-v28`
// atteste l'enveloppe anti-injection du contexte patient — mais les gardes
// d'empreinte ne hachent que la consigne SYSTÈME. Supprimer l'enveloppe du
// message UTILISATEUR laissait toute la suite verte. Ce banc verrouille les
// deux moitiés : la consigne système (importée et exécutée) et le gabarit du
// message utilisateur (lu en TEXTE, comme `conduite.guard` — un route.ts App
// Router ne peut exporter que ses handlers, `buildUserMessage` n'est donc
// pas importable).

const BALISE = 'donnees_declaratives_patient';
const ROUTE = readFileSync(join(__dirname, 'route.ts'), 'utf8');

describe('enveloppe anti-injection du contexte patient', () => {
  it('le gabarit du message utilisateur enveloppe le contexte entre les balises', () => {
    // Les balises RÉELLES ouvrent et ferment sur leur propre ligne, et le
    // contexte est interpolé ENTRE elles — la consigne qui les cite plus
    // haut (inline) ne compte pas comme enveloppe.
    const ouverture = ROUTE.indexOf(`\n<${BALISE}>\n`);
    const fermeture = ROUTE.indexOf(`\n</${BALISE}>`);
    expect(ouverture).toBeGreaterThan(-1);
    expect(fermeture).toBeGreaterThan(ouverture);
    const dedans = ROUTE.slice(ouverture, fermeture);
    expect(dedans).toContain('${contexte');
  });

  it('la consigne locale précède l’enveloppe et nomme le refus d’exécution', () => {
    const ouverture = ROUTE.indexOf(`\n<${BALISE}>\n`);
    const avant = ROUTE.slice(0, ouverture);
    expect(avant).toMatch(/jamais des consignes/i);
    expect(avant).toMatch(/ne l'exécute pas/i);
  });

  it('le contexte vide reste enveloppé — le délimiteur ne disparaît pas avec lui', () => {
    // Le repli `|| '…non renseigné…'` vit DANS l'interpolation, donc dans
    // l'enveloppe : un contexte absent ne fait pas sauter les balises.
    const ouverture = ROUTE.indexOf(`\n<${BALISE}>\n`);
    const fermeture = ROUTE.indexOf(`\n</${BALISE}>`);
    const dedans = ROUTE.slice(ouverture, fermeture);
    expect(dedans).toMatch(/\|\|\s*'[^']*non renseigné/);
  });

  it('la consigne système nomme la même balise — les deux moitiés ne peuvent pas diverger', () => {
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain(`<${BALISE}>`);
    expect(SYSTEM_PROMPT_GOUVERNANCE).toMatch(/jamais des consignes/i);
  });
});
