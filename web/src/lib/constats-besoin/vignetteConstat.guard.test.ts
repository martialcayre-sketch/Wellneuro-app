import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from '@/lib/bio-parcours/balayageSources';

// [[D-551]] §6 — LA VIGNETTE DU CONSTAT N'ENTRE NI DANS LE TOTAL, NI DANS LE
// COMPTE, NI DANS AUCUN MOTEUR. Le verdict d'un constat sur un besoin sans score
// se lit à deux endroits de l'écran du praticien — la ligne du besoin dans « Les
// 12 besoins », et celle du tiroir de la fiche — et nulle part ailleurs : ni le
// score, ni le compte des besoins mesurés, ni l'orientation, ni la convergence,
// ni la synthèse, ni le portail, ni le courrier, ni l'IA ne l'importent
// ([[D-347]] §6, [[D-551]] « Ne touche pas »).
//
// CE QUI EST VU : tout module de production qui importe la vignette (`constats-
// besoin/vignette`), le composant qui la rend, le hook qui la lit, ou qui en
// appelle la route (`/api/praticien/besoins/vignettes`). Hors lignes de
// commentaire. Le banc voisin `lecteursConstatsBesoin.guard.test.ts` épingle, lui,
// qui LIT la table des constats.

const CONSOMMATEURS_ADMIS = [
  // La route qui sert la vignette (verdict et « à relire », rien d'autre).
  'web/src/app/api/praticien/besoins/vignettes/route.ts',
  // Le composant qui la rend, et le hook qui la lit.
  'web/src/components/besoins/VignetteConstatBesoin.tsx',
  'web/src/components/besoins/useVignettesConstats.ts',
  // Les deux écrans : « Les 12 besoins » (fiche du besoin) et le tiroir de la fiche
  // (vue d'équilibre du praticien).
  'web/src/components/DetailBesoinsPanel.tsx',
  'web/src/components/FichePatientPanel.tsx',
];

const MOTIF_VIGNETTE =
  /constats-besoin\/vignette\b|from\s+['"]\.\/vignette['"]|\bVignetteConstatBesoin\b|\buseVignettesConstats\b|\/api\/praticien\/besoins\/vignettes\b/;

export function consommateursDeLaVignette(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_VIGNETTE.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

// Ce que la vignette ne doit JAMAIS toucher : le calcul du total et du compte, les
// moteurs, la synthèse. Chemins vérifiés présents (anti-vacuité), puis absents du
// balayage.
const MODULES_QUI_NE_LA_LISENT_PAS = [
  'web/src/lib/equilibre/score.ts',
  'web/src/lib/equilibre/constants.ts',
  'web/src/lib/equilibre/objetsCliniques.ts',
  'web/src/lib/clinical/orientationRulesV1.ts',
  'web/src/lib/clinical/convergenceV1.ts',
  'web/src/app/api/praticien/equilibre/route.ts',
  'web/src/app/api/praticien/besoins/route.ts',
];

describe('Vignette du constat sur un besoin — consommateurs épinglés ([[D-551]] §6)', () => {
  const fichiers = fichiersSource().map(chemin => ({ chemin, source: lire(chemin) }));
  const lus = consommateursDeLaVignette(fichiers);

  it('aucun module neuf ne lit la vignette sans s’inscrire ici', () => {
    expect(
      lus,
      'consommateur neuf de la vignette : D-551 §1 n’en admet que deux, la fiche du besoin et la vue d’équilibre du '
        + 'praticien. L’inscrire ici par un diff relu, avec son motif ; entrée qui n’y accède plus : la retirer',
    ).toEqual([...CONSOMMATEURS_ADMIS].sort());
  });

  it('ni le total, ni le compte, ni un moteur, ni les routes qui les calculent ne la lisent', () => {
    const presents = new Set(fichiers.map(f => f.chemin));
    for (const chemin of MODULES_QUI_NE_LA_LISENT_PAS) {
      expect(presents.has(chemin), `${chemin} doit exister, sans quoi ce cas ne garde rien`).toBe(true);
      expect(lus).not.toContain(chemin);
    }
  });

  // CONTRE-ÉPREUVE : chaque forme de consommation rougit ; la prose et le panneau
  // du constat, qui n'est pas la vignette, ne rougissent pas.
  it('le pipeline voit chaque forme de consommation et ignore la prose et le panneau du constat', () => {
    const vus = consommateursDeLaVignette([
      { chemin: 'web/src/lib/neuf/a.ts', source: "import { vignettesDesConstats } from '@/lib/constats-besoin/vignette';" },
      { chemin: 'web/src/lib/neuf/b.tsx', source: "import { VignetteConstatBesoin } from '@/components/besoins/VignetteConstatBesoin';" },
      { chemin: 'web/src/lib/neuf/c.tsx', source: 'const v = useVignettesConstats(id, true);' },
      { chemin: 'web/src/lib/neuf/d.ts', source: "await fetch('/api/praticien/besoins/vignettes?idPatient=x');" },
      { chemin: 'web/src/lib/neuf/e.ts', source: '// la vignette du constat, VignetteConstatBesoin, vit à deux endroits' },
      { chemin: 'web/src/lib/neuf/f.tsx', source: "import { ConstatsBesoinPanel } from '@/components/besoins/ConstatsBesoinPanel';" },
      { chemin: 'web/src/lib/constats-besoin/h.ts', source: "import { ligneVignette } from './vignette';" },
      { chemin: 'web/src/lib/neuf/g.test.tsx', source: "import { VignetteConstatBesoin } from '@/components/besoins/VignetteConstatBesoin';" },
    ]);
    expect(vus).toEqual([
      'web/src/lib/constats-besoin/h.ts', 'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.tsx', 'web/src/lib/neuf/c.tsx', 'web/src/lib/neuf/d.ts',
    ]);
  });
});
