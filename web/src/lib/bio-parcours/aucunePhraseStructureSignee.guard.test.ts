import { describe, expect, it } from 'vitest';
import { fichiersStructuresSignables, lire, litterauxChaine } from './balayageSources';

// BP-01 ([[D-266]]) — aucune phrase dans une structure signée. Une signature
// cohérente ne prouve pas l'absence de phrase : `priorityRulesV1.libelle` sert
// déjà un texte au patient depuis une table signée ([[D-208]]). Les structures
// NOUVELLES du programme — fiches d'usage (BP-12a), bibliothèque des options
// (BP-17) — portent des codes, des identifiants et des renvois ; le texte vit
// en base, versionné et validé à part ([[D-251]]).
//
// PÉRIMÈTRE : toute structure SIGNABLE — tout source de production qui
// déclare son verrou (`validationExterne: true` OU `false`) : une structure
// livrée verrou éteint est jugée dès sa naissance, pas à sa signature.
//
// HISTORIQUES : les dix-sept structures signables du jour du lot (quatorze
// signées, trois au verrou éteint) portent du texte par construction
// (libellés, corpus, motifs). Elles sont exemptées NOMMÉMENT, et la liste ne
// s'allonge jamais : une structure neuve n'y entre pas, elle passe le
// détecteur.
const HISTORIQUES_EXEMPTEES = [
  'web/src/lib/biology-library/import/resolverLibellesV1.ts',
  'web/src/lib/biology-library/indicationsBiologieV1.ts',
  'web/src/lib/clinical/baremeChargeV1.ts',
  'web/src/lib/clinical/catalogueConduitesV1.ts',
  'web/src/lib/clinical/conflitsSourcesV1.ts',
  'web/src/lib/clinical/contradictionsV1.ts',
  'web/src/lib/clinical/corpusSyntheseV1.ts',
  'web/src/lib/clinical/gatePopulationV1.ts',
  'web/src/lib/clinical/indicationsAssiettesV1.ts',
  'web/src/lib/clinical/orientationRulesV1.ts',
  'web/src/lib/clinical/portesBiologiquesAssiettesV1.ts',
  'web/src/lib/clinical/priorityRulesV1.ts',
  'web/src/lib/clinical/replisAssietteV1.ts',
  'web/src/lib/clinical/safetyEffetIndesirableV1.ts',
  'web/src/lib/clinical/safetySignalsV1.ts',
  'web/src/lib/clinical/stopRulesV1.ts',
  'web/src/lib/clinical/tableRepliV1.ts',
];

/**
 * Une phrase : quatre mots ou plus, ou deux mots ou plus terminés par une
 * ponctuation de fin. Un code (`SAF-EI-01`), un identifiant de claim
 * (`ferritine@2`), un chemin, un hex ou un libellé court ne le sont pas.
 */
export function estUnePhrase(litteral: string): boolean {
  const mots = litteral.trim().split(/\s+/).filter(m => /\p{L}/u.test(m));
  if (mots.length >= 4) return true;
  return mots.length >= 2 && /\p{L}[.!?…]$/u.test(litteral.trim());
}

export function phrasesDe(source: string): string[] {
  return litterauxChaine(source).filter(estUnePhrase);
}

describe('structures signées — aucune phrase hors des tables historiques (BP-01)', () => {
  const signes = fichiersStructuresSignables();

  it('le balayage voit toutes les structures historiques (il sait trouver le verrou)', () => {
    for (const chemin of HISTORIQUES_EXEMPTEES) expect(signes, chemin).toContain(chemin);
  });

  const nouvelles = signes.filter(chemin => !HISTORIQUES_EXEMPTEES.includes(chemin));
  it('aucune structure signée neuve ne porte de phrase', () => {
    for (const chemin of nouvelles) {
      expect(phrasesDe(lire(chemin)), `${chemin} : le texte vit en base (D-251), pas dans la structure signée`)
        .toEqual([]);
    }
  });

  // CONTRE-ÉPREUVE : la mutation attendue — une structure signée neuve qui
  // porte un libellé rédigé — rougit ; codes, identifiants et prose de
  // commentaire passent.
  it('le détecteur voit une phrase, laisse passer codes et commentaires', () => {
    const source = [
      'export const META = { validationExterne: true };',
      "const FICHE = { id: 'BES2-Q01', claims: ['ferritine@2', 'SAF-EI-01'], nature: 'hypothese' };",
      "const LIBELLE = 'Votre fatigue peut venir du fer';",
      "const COURT = 'À surveiller.';",
      '// Une phrase en commentaire ne compte pas, elle documente.',
    ].join('\n');
    expect(phrasesDe(source)).toEqual(['Votre fatigue peut venir du fer', 'À surveiller.']);
  });
});
