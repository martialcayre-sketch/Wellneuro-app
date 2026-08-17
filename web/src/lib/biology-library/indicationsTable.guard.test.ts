import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { feuillesDuDeclencheur } from '@/lib/clinical/orientationRulesV1';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import { INDICATIONS_BIOLOGIE_V1 } from './indicationsBiologieV1';

// Gardes de la table d'indications RÉELLE ([[D-069]]) — les deux réserves que
// la revue de [[D-060]] a posées comme prérequis de ce lot :
//
// RV-2 (garde de FORME) : cette table est la première du dépôt à porter des
// `ou`, et elle n'avait aucune garde anti-dérive — « la PR va écrire le
// premier ou du dépôt dans la seule table qui n'a rien pour l'attraper ».
// RV-1 (banc d'INERTIE) : sous un `ou`, une branche ne compte que si son
// instrument publie ses comptes de complétude ([[D-060]] §2). Un moteur qui
// cesse de publier ne casse rien — il rend la branche inerte à vie, sans
// erreur ni log. « L'inertie est silencieuse et un audit décale » : ce banc
// est la version qui ne décale pas, jouée sur les moteurs RÉELS.

const publiees = INDICATIONS_BIOLOGIE_V1.filter(r => r.statut === 'publiee');
const feuillesDe = (regle: (typeof INDICATIONS_BIOLOGIE_V1)[number]) =>
  regle.declencheurs.flatMap(feuillesDuDeclencheur);

// Réponses SATURÉES d'un instrument — patron `axeNonMesure.guard.test.ts`
// (recopié : aucun helper de saturation n'est exporté par le dépôt). La valeur
// maximale de chaque item : la bande atteinte importe peu ici, seule la
// PUBLICATION des comptes est jugée.
const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id]?.sections ?? [])
    .flatMap((s: any) => s.questions ?? []);
const valMax = (q: any) => (q.options?.length
  ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value)))
  : (q.max ?? 1));
const saturee = (id: string): Record<string, number> =>
  Object.fromEntries(itemsDe(id).map((q: any) => [q.id, valMax(q)]));

/**
 * Les comptes lisibles par `comptesDuRecueil`, ET COMPLETS sur une passation
 * saturée (revue, tests manquants) : un moteur qui publierait `missing: 1` en
 * permanence laisserait la branche morte avec un banc vert — la lecture seule
 * de la présence des clés ne suffit pas.
 */
function porteComptesComplets(porteur: unknown): boolean {
  if (!porteur || typeof porteur !== 'object') return false;
  const lire = (cle: string) => (porteur as Record<string, unknown>)[cle];
  const repondus = lire('repondus');
  const items = lire('items');
  if (typeof repondus === 'number' && typeof items === 'number') return repondus === items;
  const missing = lire('missing');
  return typeof missing === 'number' && missing === 0;
}

describe('indications biologie — garde de forme de la table réelle (RV-2)', () => {
  it('quinze règles publiées, un panel chacune — jamais deux (discordance moteur)', () => {
    expect(publiees).toHaveLength(15);
    const codes = publiees.map(r => r.panelCode);
    expect(new Set(codes).size, 'deux règles sur un même panel basculeraient en non_indique_actuellement').toBe(codes.length);
    // Les codes sont EXACTEMENT ceux de la migration D-068 : une règle visant
    // un panel absent du catalogue serait une ligne morte à l'écran.
    expect([...codes].sort()).toEqual([
      'PANEL_ANXIETE_1', 'PANEL_CORTISOL_ISOLE', 'PANEL_DIGESTIF_1', 'PANEL_FATIGUE_1',
      'PANEL_HUMEUR_1', 'PANEL_MEMOIRE_1', 'PANEL_METABOLIQUE_1', 'PANEL_METABOLIQUE_OPT',
      'PANEL_MG_PLASMATIQUE', 'PANEL_NEURODEG_1', 'PANEL_POP_AGEE', 'PANEL_POP_FEMME',
      'PANEL_SJSR', 'PANEL_SOMMEIL_1', 'PANEL_STRESS_1',
    ]);
  });

  it('chaque règle porte ses claims, sa condition ou son motif, selon son mode', () => {
    for (const regle of publiees) {
      expect(regle.justificationClaims.length, `${regle.id} sans claim`).toBeGreaterThan(0);
      if (regle.mode === 'conditionnel') {
        expect((regle.condition ?? '').trim().length, `${regle.id} sans condition lisible`).toBeGreaterThan(0);
      } else {
        expect(regle.declencheurs, `${regle.id} : déclencheurs hors mode conditionnel`).toEqual([]);
      }
      if (regle.mode === 'non_indique_actuellement') {
        expect((regle.motif ?? '').trim().length, `${regle.id} sans motif`).toBeGreaterThan(0);
      }
    }
  });

  it('aucune feuille ne s’appuie sur signauxAlerte, à la racine comme sous un `ou`', () => {
    // L'interdit d'adressage ([[D-060]] §5), appliqué à la table qui porte les
    // premiers `ou` du dépôt. VERT À VIDE aujourd'hui — la table ne porte
    // aucune feuille `drapeau` — et c'est dit : le banc mordra à la première
    // feuille déclarative ajoutée, la contre-épreuve du câblage vit dans
    // `orientationRulesV1.test.ts` (même helper `feuillesDuDeclencheur`).
    for (const regle of publiees) {
      for (const feuille of feuillesDe(regle)) {
        expect(
          feuille.type === 'drapeau' && feuille.champ === 'signauxAlerte',
          `${regle.id} s'appuie sur un signal d'alerte`,
        ).toBe(false);
      }
    }
  });

  it('chaque instrument cité existe au catalogue et est assignable', () => {
    // Un instrument suspendu rend la branche morte en amont du moteur — c'est
    // le défaut que l'audit du 2026-08-16 a trouvé sur cinq instruments, et
    // que [[D-066]] a fermé par réactivation. Ce banc empêche la récidive.
    const cites = new Set<string>();
    for (const regle of publiees) {
      for (const feuille of feuillesDe(regle)) {
        if (feuille.type !== 'drapeau') cites.add(feuille.idQuestionnaire);
      }
    }
    expect(cites.size).toBe(17);
    for (const id of cites) {
      expect((QUESTIONNAIRE_CATALOGUE as Record<string, unknown>)[id], `${id} sans définition`).toBeDefined();
      expect(IDS_SUSPENDUS.has(id), `${id} est suspendu : sa branche est morte`).toBe(false);
    }
  });

  it('les zones couleur ne citent que les quatre couleurs défavorables', () => {
    for (const regle of publiees) {
      for (const feuille of feuillesDe(regle)) {
        if (feuille.type !== 'zone' || feuille.zone.type !== 'couleur') continue;
        for (const couleur of feuille.zone.couleurs) {
          expect(['info', 'warning', 'danger', 'dark'], `${regle.id} cite ${couleur}`).toContain(couleur);
        }
      }
    }
  });

  it('le MADRS est en comparaison >= 8 — la grille ne classe ni 7 ni 19', () => {
    // Arbitrage v5, confirmé « sans réserves » : une zone couleur manquerait
    // en silence un patient à 19 (trou de la grille publiée). Ce banc épingle
    // la borne — la recalibrer rouvre un arbitrage clinique.
    const humeur = publiees.find(r => r.id === 'BIO-HUM-01');
    const madrs = feuillesDe(humeur!).find(f => f.type !== 'drapeau' && f.idQuestionnaire === 'Q_NEU_02');
    expect(madrs).toMatchObject({ type: 'comparaison', operateur: '>=', valeur: 8 });
  });
});

describe('indications biologie — aucune branche inerte (RV-1)', () => {
  it('chaque instrument visé publie ses comptes de complétude sur le porteur visé, moteur réel', () => {
    // La forme du banc : `calculateScore` RÉEL sur passation saturée, puis la
    // même lecture que `comptesDuPorteurVise` — repondus+items, ou missing, au
    // grain du sous-score quand la feuille en vise un. Un moteur qui cesse de
    // publier rougit ICI, pas dans six mois en production.
    let verifies = 0;
    for (const regle of publiees) {
      for (const feuille of feuillesDe(regle)) {
        if (feuille.type === 'drapeau') continue;
        const scores: any = calculateScore(feuille.idQuestionnaire, saturee(feuille.idQuestionnaire));
        const porteur = feuille.sousScore
          ? (scores?.subScores ?? []).find((s: any) => s?.id === feuille.sousScore || s?.label === feuille.sousScore)
          : scores;
        expect(
          porteComptesComplets(porteur),
          `${regle.id} → ${feuille.idQuestionnaire}${feuille.sousScore ? `/${feuille.sousScore}` : ''} : `
            + 'comptes absents ou incomplets sur passation saturée — la branche serait inerte à vie, en silence',
        ).toBe(true);
        verifies += 1;
      }
    }
    // Anti-vacuité au COMPTE EXACT (revue, finding 5) : dix-huit feuilles
    // instrumentales — un plancher lâche laisserait quatre instruments
    // disparaître de la table sans qu'un banc bouge.
    expect(verifies).toBe(18);
  });
});

// ── Banc zone↔grille — le test que la revue a nommé « le plus important » ────
//
// Une zone qui citerait une couleur que l'instrument ne PUBLIE pas serait
// inerte à vie sans rien faire rougir (l'AQ n'a pas de bande `info` : une
// transcription `['info']` passerait la garde des quatre couleurs et ne
// s'allumerait jamais). Chaque couleur citée doit donc être publiée par la
// grille du porteur visé — ou déclarée INERTE, la convention des reprises des
// règles d'orientation signées (`dark` cité « au titre de ne jamais s'arrêter
// sous la plus sévère » sur des grilles qui ne le publient pas).
describe('indications biologie — chaque couleur citée est publiée par la grille (zone↔grille)', () => {
  // Inerties DÉCLARÉES, jamais déduites : la reprise à l'identique des zones
  // d'orientation (`R-STR-01`, `R-GAS-01`, `R-SOM-01`) cite `dark` sur trois
  // instruments qui ne publient pas cette bande. Une entrée ici est un choix
  // relu, pas un oubli — et la liste est exacte : toute couleur non publiée
  // hors de cette liste fait rougir.
  const INERTIES_DECLAREES: Record<string, string[]> = {
    Q_STR_02: ['dark'],
    Q_GAS_01: ['dark'],
    Q_SOM_01: ['dark'],
  };

  // Les couleurs que la grille du porteur PUBLIE, lues sur la définition —
  // trois formes : `interpretation` racine, `globalInterpretation` (TFD),
  // ranges par subscale (HAD). Le PSQI est le seul dont la grille vit dans le
  // moteur (`BANDES_PSQI`, hors définition) : ses couleurs sont épinglées ici,
  // et les bancs du moteur épinglent les bandes elles-mêmes.
  const COULEURS_PSQI = ['success', 'info', 'warning', 'danger'];
  function couleursPubliees(id: string, sousScore?: string): string[] {
    if (id === 'Q_SOM_01') return COULEURS_PSQI;
    const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id];
    const scoring = def?.scoring ?? def;
    if (sousScore) {
      const entree = (scoring?.interpretation ?? []).find?.((e: any) => e?.subscale === sousScore);
      return (entree?.ranges ?? []).map((b: any) => b?.color).filter(Boolean);
    }
    const grille = scoring?.globalInterpretation ?? scoring?.interpretation;
    if (!Array.isArray(grille)) return [];
    return grille.map((b: any) => b?.color).filter(Boolean);
  }

  it('les couleurs citées sont publiées, ou déclarées inertes nommément', () => {
    let jugees = 0;
    for (const regle of publiees) {
      for (const feuille of feuillesDe(regle)) {
        if (feuille.type !== 'zone' || feuille.zone.type !== 'couleur') continue;
        const publieesParGrille = couleursPubliees(feuille.idQuestionnaire, feuille.sousScore);
        expect(publieesParGrille.length,
          `${feuille.idQuestionnaire} : aucune grille lisible au porteur visé`).toBeGreaterThan(0);
        for (const couleur of feuille.zone.couleurs) {
          jugees += 1;
          const publiee = publieesParGrille.includes(couleur);
          const inertie = (INERTIES_DECLAREES[feuille.idQuestionnaire] ?? []).includes(couleur);
          expect(
            publiee || inertie,
            `${regle.id} cite « ${couleur} » sur ${feuille.idQuestionnaire}`
              + `${feuille.sousScore ? `/${feuille.sousScore}` : ''} — non publiée par la grille et non déclarée inerte`,
          ).toBe(true);
        }
      }
    }
    expect(jugees).toBeGreaterThanOrEqual(30);
  });

  // Contre-épreuve : la garde discrimine — une couleur non publiée sur une
  // règle fabriquée est bien attrapée (l'AQ ne publie pas `info`).
  it('une couleur non publiée sur une règle fabriquée serait attrapée', () => {
    const publieesAq = couleursPubliees('Q_GEO_03');
    expect(publieesAq).toContain('warning');
    expect(publieesAq).not.toContain('info');
    expect((INERTIES_DECLAREES['Q_GEO_03'] ?? []).includes('info')).toBe(false);
  });
});
