import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// GARDE : UN REFUS CONFIRMABLE DOIT ÊTRE ATTEIGNABLE DEPUIS LE GESTE QUI LE
// DÉCLENCHE — pas seulement depuis celui qui l'a inspiré.
//
// LE DÉFAUT, constaté par la contre-revue adverse du 2026-09-16 ([[D-200]]).
// L'alerte de registre anxiogène et son bouton « Enregistrer ce texte tel
// quel » vivent dans `#protocol-version-builder`, que la sous-vue masque
// (`hidden` hors de « protocole »). Or `reviserApresArbitrages` part de la
// sous-vue « biologie » : sur un texte signalé, `saveVersion` posait bien la
// confirmation, remettait `saveState` à `idle` et `saveError` à `null` — et le
// praticien ne voyait RIEN. Il cliquait « Appliquer les arbitrages », il ne se
// passait rien, et aucun message ne nommait le terme.
//
// C'est la forme exacte du défaut du booklet : une garde confirmable dont la
// commande est inatteignable est une garde BLOQUANTE déguisée — `D-189` §4 le
// déclarait non négociable, et `confirmations.guard.test.ts` garde déjà l'autre
// moitié de la classe (le drapeau que nul écran n'envoie).
//
// POURQUOI UNE GARDE DE SOURCE. Aucun banc de composant ne traverse
// `reviserApresArbitrages` — le relecteur l'a vérifié : en retirer la ligne de
// version ne faisait rougir personne. Un banc de rendu couvrirait un chemin ;
// celui-ci couvre l'INVARIANT, et il se lit dans les deux sens : masquer le
// constructeur derrière une nouvelle condition, ou retirer la remise en vue,
// fait rougir ici.

const SECTION = path.join(
  process.cwd(), 'src', 'components', 'patient-cockpit', 'ClinicalRuntimeSection.tsx',
);

describe('le refus de registre du protocole est atteignable d’où que parte le geste', () => {
  const source = readFileSync(SECTION, 'utf-8');

  it('le constructeur est bien masqué hors de la sous-vue « protocole »', () => {
    // La prémisse de la garde. Si elle tombe — plus aucun masquage — la garde
    // ci-dessous n'a plus d'objet, et il faut la relire plutôt que la supprimer.
    expect(source).toMatch(/id="protocol-version-builder"[\s\S]{0,120}sousVueActions !== 'protocole'/);
  });

  it('la branche REGISTRE_ANXIOGENE ramène la sous-vue où le refus se lit', () => {
    const debut = source.indexOf("payload.reason === 'REGISTRE_ANXIOGENE'");
    expect(debut, 'la branche de refus de registre a disparu').toBeGreaterThan(-1);
    const fin = source.indexOf('return;', debut);
    expect(fin, 'branche de refus sans sortie — forme inattendue').toBeGreaterThan(debut);
    const branche = source.slice(debut, fin);
    expect(branche, 'le refus est posé mais reste invisible hors de la sous-vue protocole')
      .toContain("setSousVueActions('protocole')");
  });

  it('la confirmation est bien câblée jusqu’au constructeur', () => {
    // L'autre moitié : l'état posé doit atteindre l'écran qui porte le bouton.
    expect(source).toMatch(/confirmationRegistre=\{confirmationRegistre\}/);
    expect(source).toMatch(/confirmerRegistre/);
  });
});
