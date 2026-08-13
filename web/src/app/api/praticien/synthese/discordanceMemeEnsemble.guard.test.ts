import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Garde de NON-DIVERGENCE entre la synthèse et le cockpit ([[D-057]], LOT-09).
//
// LE DÉFAUT CHERCHÉ. Le cockpit (`contradictionsPourPatient`) évalue les
// contradictions sur TOUTES les passations du patient — `where: { idPatient }`,
// sans filtre. La route de synthèse, elle, construit `reponsesAdministrables`,
// un sous-ensemble strict passé par `filtrerPassationsExploitables` puis
// `estAdministrableParLaRoute`, et c'est cet ensemble-là que tout le reste de
// la route consomme. Passer ce sous-ensemble au moteur de contradictions ferait
// rendre au MÊME dossier moins de constats en synthèse qu'au cockpit — deux
// écrans, deux vérités, aucun signal.
//
// Le défaut serait d'autant plus difficile à voir qu'il ne casse rien : la
// synthèse resterait valide, simplement plus pauvre, et la vigilance manquante
// n'a par définition personne pour la réclamer.
//
// La correction est gratuite (`reponses`, non filtré, est déjà chargé au-dessus
// dans la même fonction) — ce qui rend la régression d'autant plus facile :
// remplacer `reponses` par `reponsesAdministrables` se lit comme une
// uniformisation bienvenue avec le reste de la route.
//
// CONTRÔLE STRUCTUREL, comme `conduite.guard.test.ts` et
// `pseudonymisation.guard.test.ts`, et pour la même raison : Next.js interdit
// d'exporter un symbole runtime depuis un `route.ts`, donc le site d'appel
// n'est pas atteignable depuis un test comportemental.

const ROUTE = readFileSync(join(__dirname, 'route.ts'), 'utf8');
const SERVICE = readFileSync(
  join(__dirname, '..', '..', '..', '..', 'lib', 'clinical', 'contradictionsService.ts'),
  'utf8',
);

/** L'argument passé à `constatsContradictionsPourDossier`, tel qu'écrit. */
function premierArgumentDuMoteur(source: string): string | null {
  const appel = source.match(/constatsContradictionsPourDossier\(\s*([A-Za-z_$][\w$]*)/);
  return appel?.[1] ?? null;
}

describe('Discordances — la synthèse évalue le même ensemble que le cockpit', () => {
  it('la route passe l’ensemble NON filtré au moteur de contradictions', () => {
    expect(premierArgumentDuMoteur(ROUTE)).toBe('reponses');
  });

  it('la route ne passe JAMAIS le sous-ensemble administrable au moteur', () => {
    expect(ROUTE).not.toMatch(
      /constatsContradictionsPourDossier\(\s*reponses(Administrables|Valides)/,
    );
  });

  it('le cockpit lit toujours sans filtre — c’est ce qui rend les deux comparables', () => {
    // Si cette lecture gagnait un jour un filtre, l'égalité gardée ci-dessus
    // deviendrait fausse dans l'autre sens, et ce banc doit le dire.
    expect(SERVICE).toMatch(
      /contradictionsPourPatient[\s\S]*?questionnaireReponse\.findMany\(\{\s*where: \{ idPatient \},/,
    );
  });

  it('un seul site d’appel dans la route — deux ensembles ne peuvent pas coexister', () => {
    const appels = ROUTE.match(/constatsContradictionsPourDossier\(/g) ?? [];
    expect(appels).toHaveLength(1);
  });

  it('les mêmes constats alimentent la vigilance et le garde, sans second calcul', () => {
    // Recalculer pour le garde ce qui a été calculé pour la vigilance les
    // ferait diverger au premier changement de critère.
    expect(ROUTE).toMatch(/vigilancesDiscordancePourSynthese\(constats\)/);
    expect(ROUTE).toMatch(/discordancesPourGardeRestitution\(constats\)/);
  });
});
