import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';

// Le moteur d'orientation lit le service, dont le module tire Prisma : jamais appelé ici.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { cleCondition, evaluerConvergences } from './convergenceEngine';
import { RATTACHEMENTS_CONVERGENCE_V1, TABLE_CONVERGENCE_V1 } from './convergenceV1';
import { sha256 } from './corpusSyntheseV1';
import { evaluerOrientationDetaillee, type ReponseOrientation } from './orientationEngine';
import {
  FENETRES_FRAICHEUR_ORIENTATION,
  GRILLES_ORIENTATION,
  ORIENTATION_RULES_V1,
} from './orientationRulesV1';

// LA CONDITION `Q_ALI_01` → BESOIN 1 NE COMPTE PLUS, `R2-ALI-01` RESTE PUBLIÉE —
// [[D-555]] (réponse `20261122-0003-b`).
//
// Le mécanisme est une EXCLUSION de la table de convergence, la même que celle
// du besoin 4 ([[D-443]] §5) : le moteur la relit à l'ouverture comme au compte.
// Ni la règle, ni son statut, ni sa suggestion ne bougent. Ce banc fige les deux
// côtés, chacun avec sa contre-épreuve :
//   — la suggestion de la règle sort toujours (TFD, Bristol) ;
//   — la condition n'ouvre ni ne compte plus ; l'exclusion levée, elle revient ;
//   — la table ne diffère de celle signée le 2026-11-19 que par cette ligne ;
//   — ni les cartes de décision diffusées, ni les protocoles ne lisent ce terme.
//
// Retirer l'exclusion est une décision propre (revue à l'allumage de
// `WN_CONSTAT_BESOIN`, [[D-555]] §4) : ce banc rougit alors, et c'est voulu.

const ID = 'R2-ALI-01';
const ALI_TRES_DEFAVORABLE = 'Alimentation très déséquilibrée et défavorable';
const ALI_DEFAVORABLE = 'Alimentation déséquilibrée, ne contribuant pas au maintien du capital santé';
// Le contenu signé le 2026-11-19 haché SOUS LES GRILLES DU 2026-11-24 ([[D-526]] §5.2) :
// avec les grilles d'avant la valeur 13 du TFD, il hachait `6088b3c6…e696891`.
const SHA_SIGNE_2026_11_19 = 'abd6364697e845185b8271b1654450b0e3c1dea33cf43901f1613efc89237ec0';

const anamneseVide: DrapeauxAnamnese = {
  signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
  attentes: [], automedication: [], intolerancesAlimentaires: [], symptomesFonctionnels: [],
  debut: null, evolution: null, variationPoids: null,
};

function passationAli(label: string): ReponseOrientation {
  return {
    idQuestionnaire: 'Q_ALI_01',
    dateReponse: '2026-11-05T10:00:00.000Z',
    idReponse: 'r-ali-1',
    statutValidite: 'VALID',
    scores: { total: 12, missing: 0, repondus: 19, interpretation: { label, color: 'danger' } },
  };
}

const estExclusionBesoin1 = (e: { idQuestionnaire: string; besoin: number }) =>
  e.idQuestionnaire === 'Q_ALI_01' && e.besoin === 1;

describe('D-555 — R2-ALI-01 reste publiée et sa suggestion sort toujours', () => {
  const regle = ORIENTATION_RULES_V1.find(r => r.id === ID);

  it('la ligne est publiée, avec son déclencheur, ses claims et ses suggestions', () => {
    expect(regle?.statut).toBe('publiee');
    expect(regle?.justificationClaims).toEqual([{ claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' }]);
    expect(regle?.suggestions.map(s => s.questionnaireId)).toEqual(['Q_GAS_01', 'Q_GAS_03']);
    expect(JSON.stringify(regle?.declencheurs)).toContain(ALI_TRES_DEFAVORABLE);
    expect(JSON.stringify(regle?.declencheurs)).toContain(ALI_DEFAVORABLE);
    expect(ORIENTATION_RULES_V1.some(r => r.statut === 'suspendue' && r.id === ID)).toBe(false);
  });

  it.each([ALI_TRES_DEFAVORABLE, ALI_DEFAVORABLE])(
    '« %s » : la règle se déclenche et propose le TFD et l’échelle de Bristol',
    label => {
      const resultat = evaluerOrientationDetaillee({
        reponses: [passationAli(label)],
        idsQuestionnairesAssignes: [],
        regles: ORIENTATION_RULES_V1,
        drapeaux: anamneseVide,
      });
      const motifs = resultat.recommandations.flatMap(reco => reco.motifs.map(m => m.regleId));
      expect(motifs).toContain(ID);
      const cibles = resultat.recommandations.map(reco => reco.cible);
      expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_GAS_01' });
      expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_GAS_03' });
    },
  );
});

describe('D-555 — convergence : la condition Q_ALI_01 → besoin 1 ne compte plus, son rattachement reste', () => {
  const convergences = (reglesOrientation = ORIENTATION_RULES_V1) => evaluerConvergences({
    reponses: [passationAli(ALI_TRES_DEFAVORABLE)],
    drapeaux: anamneseVide,
    regles: reglesOrientation,
    maintenantMs: Date.parse('2026-11-07T12:00:00.000Z'),
    fenetres: FENETRES_FRAICHEUR_ORIENTATION,
  });

  it('table livrée : aucun constat de convergence ne sort, la règle étant déclenchée (cf. le bloc précédent)', () => {
    expect(convergences()).toEqual([]);
  });

  it('le rattachement reste dans la table, avec les deux exclusions', () => {
    expect(RATTACHEMENTS_CONVERGENCE_V1.map(r => cleCondition(r.condition)))
      .toContain(cleCondition({ type: 'instrument', idQuestionnaire: 'Q_ALI_01' }));
    expect(TABLE_CONVERGENCE_V1.exclusions.filter(e => e.idQuestionnaire === 'Q_ALI_01').map(e => e.besoin))
      .toEqual([4, 1]);
  });

  it('contre-épreuve : l’exclusion levée, la condition ouvre de nouveau un SIGNAL au besoin 1', async () => {
    vi.resetModules();
    vi.doMock('./convergenceV1', async importer => {
      const reel = await importer<typeof import('./convergenceV1')>();
      return { ...reel, EXCLUSIONS_CONVERGENCE_V1: reel.EXCLUSIONS_CONVERGENCE_V1.filter(e => !estExclusionBesoin1(e)) };
    });
    try {
      const moteur = await import('./convergenceEngine');
      const rattachee = await import('./orientationRulesV1');
      const constats = moteur.evaluerConvergences({
        reponses: [passationAli(ALI_TRES_DEFAVORABLE)],
        drapeaux: anamneseVide,
        regles: rattachee.ORIENTATION_RULES_V1,
        maintenantMs: Date.parse('2026-11-07T12:00:00.000Z'),
        fenetres: rattachee.FENETRES_FRAICHEUR_ORIENTATION,
      });
      expect(constats).toHaveLength(1);
      expect(constats[0]).toMatchObject({ id: 'CONV-B1', graduation: 'SIGNAL' });
      // Les métadonnées que portait l'ancien scénario : claims de la règle et
      // limite propre du besoin 1 ([[D-453]] §5), transmises au constat.
      expect(constats[0].justificationClaims).toEqual([{ claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' }]);
      expect(constats[0].limitations).toContain(
        'Le questionnaire alimentaire décrit un profil alimentaire déclaré défavorable ; il n’établit ni carence nutritionnelle ni statut biologique.',
      );
    } finally {
      vi.doUnmock('./convergenceV1');
      vi.resetModules();
    }
  });
});

describe('D-555 — signature : l’exclusion est la seule différence avec la table signée le 2026-11-19', () => {
  const sansExclusion = {
    ...TABLE_CONVERGENCE_V1,
    exclusions: TABLE_CONVERGENCE_V1.exclusions.filter(e => !estExclusionBesoin1(e)),
  };
  const sha = (convergence: unknown) => sha256(JSON.stringify({
    regles: ORIENTATION_RULES_V1,
    grilles: GRILLES_ORIENTATION,
    fenetres: FENETRES_FRAICHEUR_ORIENTATION,
    convergence,
  }));

  it('une seule ligne d’exclusion est ajoutée', () => {
    expect(TABLE_CONVERGENCE_V1.exclusions).toHaveLength(sansExclusion.exclusions.length + 1);
    expect(sansExclusion.exclusions).toEqual([expect.objectContaining({ idQuestionnaire: 'Q_ALI_01', besoin: 4 })]);
  });

  it('cette ligne retirée, la table hache l’empreinte signée le 2026-11-19', () => {
    expect(sha(sansExclusion)).toBe(SHA_SIGNE_2026_11_19);
  });

  it('contre-épreuve : avec la ligne, l’empreinte est une autre (la table est à re-signer)', () => {
    expect(sha(TABLE_CONVERGENCE_V1)).not.toBe(SHA_SIGNE_2026_11_19);
  });
});

// ── La table de convergence n'entre dans aucune empreinte de carte ni de protocole ──
//
// [[D-338]] §2 : toute table signée qui entre dans l'empreinte des cartes
// diffusées rend sa retouche aussi coûteuse qu'un changement de version. La
// PREUVE est comportementale : `tableOrientationHorsEmpreinteCartes.guard.test.ts`
// (lib/clinical-engine) construit la chaîne de référence avec et sans l'exclusion
// et compare les trois empreintes. CE BANC-CI est le garde de surface, en amont,
// sur les sources : il fige l'ensemble des modules des dossiers des cartes, des
// protocoles et du score qui IMPORTENT la table, sa convergence ou le moteur —
// par `import`, `export … from`, `import()` ou `require` —, hors imports de types
// (effacés à la compilation). Il ne suit pas les dépendances transitives : c'est
// le banc comportemental qui le fait (la chaîne entière est exécutée).
describe('D-555 — les modules des cartes, des protocoles et du score n’importent pas la table', () => {
  const SRC = join(__dirname, '..', '..');
  const DOSSIERS = [
    join(SRC, 'lib', 'clinical-engine'),
    join(SRC, 'lib', 'protocol'),
    join(SRC, 'lib', 'equilibre'),
    join(SRC, 'app', 'api', 'praticien', 'protocoles'),
  ];
  const INTERDITS = /(orientationRulesV1|convergenceV1|convergenceEngine|lignesSuspendues)$/;

  function fichiers(dossier: string): string[] {
    const sortie: string[] = [];
    for (const nom of readdirSync(dossier)) {
      const chemin = join(dossier, nom);
      if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin));
      else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) sortie.push(chemin);
    }
    return sortie;
  }

  /** Les spécificateurs importés À L'EXÉCUTION : les `import type` sont effacés. */
  function importsExecution(source: string): string[] {
    const sortie: string[] = [];
    for (const m of source.matchAll(/\b(import|export)\s+(type\s+)?[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)) {
      if (!m[2]) sortie.push(m[3]);
    }
    // Commentaires tolérés entre la parenthèse et la chaîne : `import(/* … */ '…')`.
    for (const m of source.matchAll(/\b(?:import|require)\s*\(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]([^'"]+)['"]\s*\)/g)) sortie.push(m[1]);
    for (const m of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) sortie.push(m[1]);
    return sortie;
  }

  const sources = DOSSIERS.flatMap(fichiers);

  it('le balayage lit des sources (garde de non-vacuité)', () => {
    expect(sources.length).toBeGreaterThan(20);
    expect(sources.some(f => f.endsWith('decisionCard.ts'))).toBe(true);
    expect(sources.some(f => f.endsWith('versioning.ts'))).toBe(true);
    expect(sources.some(f => f.endsWith('constants.ts'))).toBe(true);
  });

  it('le détecteur voit les formes d’import, commentaire compris (contre-épreuve)', () => {
    const fautive = [
      "import { A } from '@/lib/clinical/orientationRulesV1';",
      "export { B } from './convergenceV1';",
      "const c = await import('@/lib/clinical/convergenceEngine');",
      "const d = require('./lignesSuspendues');",
      "const e = await import(/* webpackChunkName: 'x' */ '@/lib/clinical/orientationRulesV1');",
      "import type { T } from './orientationRulesV1';",
    ].join('\n');
    const vus = importsExecution(fautive).filter(sp => INTERDITS.test(sp));
    expect(vus).toHaveLength(5);
  });

  it('aucun module n’importe, à l’exécution, la table, sa convergence ou les lignes suspendues', () => {
    const fautifs = sources.filter(f =>
      importsExecution(readFileSync(f, 'utf-8')).some(sp => INTERDITS.test(sp)));
    expect(fautifs).toEqual([]);
  });

  // LE SEUL CANAL PAR OÙ UN CONSTAT DE CONVERGENCE ENTRERAIT DANS LES CARTES : le
  // service des contradictions. Le chargeur des préconditions du T0 le lit et en
  // écarte la forme `CONVERGENCE` ([[D-450]] §6, tenu par
  // `preconditionsT0Prisma.test.ts`) ; aucun autre module des quatre dossiers ne
  // doit le lire, et le filtre doit rester écrit.
  it('le service des contradictions n’est lu que par le chargeur du T0, qui écarte la convergence', () => {
    const lecteurs = sources.filter(f =>
      importsExecution(readFileSync(f, 'utf-8')).some(sp => /contradictionsService$/.test(sp)));
    expect(lecteurs.map(f => f.split('/').pop())).toEqual(['preconditionsT0Prisma.ts']);
    expect(readFileSync(lecteurs[0], 'utf-8')).toContain("constat.forme !== 'CONVERGENCE'");
  });

  it('le seul lien direct au service d’orientation est la fonction de score recalculé', () => {
    const importeurs = sources.filter(f =>
      importsExecution(readFileSync(f, 'utf-8')).some(sp => /orientationService$/.test(sp)));
    expect(importeurs.length).toBeGreaterThan(0);
    for (const f of importeurs) {
      const imports = [...readFileSync(f, 'utf-8').matchAll(/import\s*{([^}]*)}\s*from\s*['"][^'"]*orientationService['"]/g)]
        .flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean));
      expect(imports, f).toEqual(['scoresRecalculesPourRaisonnement']);
    }
  });
});
