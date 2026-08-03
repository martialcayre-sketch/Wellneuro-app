import { describe, expect, it } from 'vitest';
import { sha256 } from './corpusSyntheseV1';
import { ORIENTATION_METADATA, ORIENTATION_RULES_SHA256, ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { idBaseDepuisPackId, type PackId } from '@/lib/questionnaires-functional';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import { extraireDrapeauxAnamnese, type DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';

// Épinglage du verrou sombre (patron questions.pss10.test.ts) : si ce test
// casse, la table de règles ou son statut de validation a changé — cela
// n'arrive légitimement qu'au lot 9 (table compilée signée par le praticien),
// avec arbitrage explicite et fragment changelog.
describe('orientationRulesV1 — verrou v1', () => {
  // LOT-05 (2026-08-03) : la table est REMPLIE, et volontairement PAS signée.
  // Écrire les règles et les signer sont deux gestes distincts — le second
  // appartient au praticien, après relecture clinique. Tant que les trois
  // marqueurs restent faux, la route demeure fail-closed et ne sert rien.
  it('la table v1 est remplie mais toujours NON signée', () => {
    expect(ORIENTATION_RULES_V1.length).toBeGreaterThan(0);
    // Trois marqueurs, pas un : la route exige les trois pour s'ouvrir.
    expect(ORIENTATION_METADATA.validationExterne).toBe(false);
    expect(ORIENTATION_METADATA.dateValidation).toBeNull();
    expect(ORIENTATION_METADATA.claimsSource).toEqual([]);
    expect(ORIENTATION_METADATA.version).toBe('orientation-nnpp2-v1');
  });

  it('chaque règle est identifiée de façon unique et porte au moins un claim', () => {
    const ids = ORIENTATION_RULES_V1.map(regle => regle.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const regle of ORIENTATION_RULES_V1) {
      expect(regle.declencheurs.length).toBeGreaterThan(0);
      expect(regle.suggestions.length).toBeGreaterThan(0);
      // Invariant de traçabilité : le moteur ignore en silence une règle sans
      // claim. Ce banc transforme ce silence en échec de CI.
      expect(regle.justificationClaims.length).toBeGreaterThan(0);
    }
  });

  it('chaque claim cité respecte le format du registre', () => {
    for (const regle of ORIENTATION_RULES_V1) {
      for (const claim of regle.justificationClaims) {
        expect(claim.claimId).toMatch(/^WN-CL-\d{4}-\d{3}$/);
        expect(claim.versionClaim).not.toBe('');
      }
    }
  });

  it('le sha publié correspond au contenu de la table', () => {
    expect(ORIENTATION_RULES_SHA256).toBe(sha256(JSON.stringify(ORIENTATION_RULES_V1)));
  });

  // Vacant tant que la table est vide — et c'est exactement pourquoi il est
  // écrit MAINTENANT. Au lot 9, une règle citant un pack sans existence en base
  // (`idPackBase: null`) ne recommanderait rien, en silence : le fail-closed
  // rejette une composition absente sans rien dire. Ce banc transforme ce
  // silence en échec de CI.
  it('chaque pack cité par une règle existe réellement en base', () => {
    const inassignables = ORIENTATION_RULES_V1.flatMap(regle =>
      (regle.suggestions ?? [])
        .map(suggestion => suggestion.packId)
        .filter((packId): packId is PackId => Boolean(packId))
        .filter(packId => idBaseDepuisPackId(packId) === null)
        .map(packId => `${regle.id} → ${packId}`),
    );
    expect(inassignables).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gardes anti-dérive (LOT-05). Chacune ferme un silence : une règle mal câblée
// ne casse rien, elle cesse simplement de se déclencher — et personne ne le voit.
describe('orientationRulesV1 — gardes anti-dérive', () => {
  const declencheurs = ORIENTATION_RULES_V1.flatMap(regle =>
    regle.declencheurs.map(declencheur => ({ regleId: regle.id, declencheur })),
  );

  function optionsDuChamp(champId: string): readonly string[] {
    for (const section of ANAMNESE_SECTIONS) {
      const champ = section.champs?.find(c => c.id === champId);
      if (champ?.options) return champ.options;
    }
    return [];
  }

  // Les clés typées de `DrapeauxAnamnese` ne portent pas le nom du champ
  // d'anamnèse : la correspondance est faite par `extraireDrapeauxAnamnese`.
  // Recopiée ici, elle dériverait en silence — d'où le banc qui suit, qui la
  // confronte à l'extraction réelle plutôt que de la croire sur parole.
  const CHAMP_ANAMNESE: Record<string, string> = {
    signauxAlerte: 'signaux_alerte',
    antecedentsDomaines: 'antecedents_domaines',
    facteursDeclenchants: 'facteurs_declenchants',
    attentes: 'attentes',
    automedication: 'automedication',
    debut: 'debut',
    evolution: 'evolution',
    variationPoids: 'variation_poids',
  };

  // La correspondance clé typée ↔ champ d'anamnèse, vérifiée contre
  // l'extraction RÉELLE et non recopiée : on injecte la première option du
  // champ et on exige de la retrouver sous la clé attendue. Si
  // `extraireDrapeauxAnamnese` change de mapping, la garde du dessous
  // chercherait dans le mauvais champ et resterait verte — celle-ci rougit.
  it('CHAMP_ANAMNESE décrit bien ce que extraireDrapeauxAnamnese fait', () => {
    const drapeauxVides = extraireDrapeauxAnamnese({});
    // Aucune clé oubliée : un neuvième drapeau forcerait la mise à jour.
    expect(Object.keys(CHAMP_ANAMNESE).sort()).toEqual(Object.keys(drapeauxVides).sort());
    for (const [cle, champId] of Object.entries(CHAMP_ANAMNESE)) {
      const options = optionsDuChamp(champId);
      expect(options.length, `aucune option pour ${champId}`).toBeGreaterThan(0);
      // Un champ liste se stocke en tableau, un champ radio en valeur seule :
      // injecter la mauvaise forme ferait échouer la garde sur sa propre
      // fixture au lieu du mapping. La forme se lit sur l'extraction vide.
      const estListe = Array.isArray(drapeauxVides[cle as keyof DrapeauxAnamnese]);
      const extrait = extraireDrapeauxAnamnese({ [champId]: estListe ? [options[0]] : options[0] });
      const valeur = extrait[cle as keyof typeof extrait];
      const obtenues = Array.isArray(valeur) ? valeur : valeur === null ? [] : [valeur];
      expect(obtenues, `${cle} ne lit pas ${champId}`).toContain(options[0]);
    }
  });

  // LA garde du lot. Un libellé retouché dans `anamnese.ts` — une apostrophe,
  // un accent — ferait taire la règle sans rien casser. Ici, elle casse le CI.
  it("chaque valeur de drapeau existe verbatim dans ANAMNESE_SECTIONS", () => {
    const inconnues: string[] = [];
    for (const { regleId, declencheur } of declencheurs) {
      if (declencheur.type !== 'drapeau') continue;
      const champId = CHAMP_ANAMNESE[declencheur.champ];
      expect(champId, `champ non mappé : ${declencheur.champ}`).toBeDefined();
      const options = optionsDuChamp(champId);
      expect(options.length, `aucune option lue pour ${champId}`).toBeGreaterThan(0);
      for (const valeur of declencheur.valeurs) {
        if (!options.includes(valeur)) inconnues.push(`${regleId} → ${champId} : « ${valeur} »`);
      }
    }
    expect(inconnues).toEqual([]);
  });

  // Arbitrage praticien du 2026-08-03 : un signal d'alerte appelle un
  // adressage, pas une exploration — et cette table ne sait produire qu'une
  // cible. Y répondre par un questionnaire ferait passer le signal pour une
  // chose que l'outil traite. La surface qui les affichera sans les traiter
  // reste à écrire (lot dédié) ; d'ici là, ce banc empêche qu'une règle
  // s'engouffre dans le trou.
  it("aucune règle ne s'appuie sur signauxAlerte", () => {
    const fautives = declencheurs
      .filter(({ declencheur }) => declencheur.type === 'drapeau' && declencheur.champ === 'signauxAlerte')
      .map(({ regleId }) => regleId);
    expect(fautives).toEqual([]);
  });

  it('chaque questionnaire cité existe au catalogue et est administrable', () => {
    const cites = new Set<string>();
    for (const { declencheur } of declencheurs) {
      if (declencheur.type !== 'drapeau') cites.add(declencheur.idQuestionnaire);
    }
    for (const regle of ORIENTATION_RULES_V1) {
      for (const suggestion of regle.suggestions) {
        if (suggestion.questionnaireId) cites.add(suggestion.questionnaireId);
      }
    }
    expect(cites.size).toBeGreaterThan(0);
    const introuvables = [...cites].filter(id => !estAdministrableParLaRoute(id));
    expect(introuvables).toEqual([]);
  });

  // L'invariant n'est PAS « citer les trois couleurs » — une règle peut
  // légitimement ne viser que la bande la plus haute. C'est qu'une règle ne
  // doit jamais s'arrêter en dessous du plus sévère : viser `danger` sans
  // `dark`, ou `warning` sans ce qui suit, laisserait dehors des patients PLUS
  // atteints que ceux qu'on retient. C'est le défaut que LOT-05 a corrigé dans
  // le type ; ce banc empêche de le réintroduire règle par règle.
  const GRAVITE = ['info', 'warning', 'danger', 'dark'] as const;

  it('une zone de couleur ne s\'arrête jamais sous la bande la plus sévère', () => {
    const trous: string[] = [];
    for (const { regleId, declencheur } of declencheurs) {
      if (declencheur.type !== 'zone' || declencheur.zone.type !== 'couleur') continue;
      const citees = declencheur.zone.couleurs;
      if (citees.length === 0) { trous.push(`${regleId} → aucune couleur`); continue; }
      // Une couleur hors de l'échelle rendrait -1, et `slice(-1)` ne vérifierait
      // plus que la dernière bande : on la refuse plutôt que de la subir.
      const rangs = citees.map(c => GRAVITE.indexOf(c));
      if (rangs.some(rang => rang < 0)) { trous.push(`${regleId} → couleur hors échelle`); continue; }
      const plusBasse = Math.min(...rangs);
      // Tout ce qui est au-dessus de la plus basse couleur citée doit l'être aussi.
      for (const attendue of GRAVITE.slice(plusBasse)) {
        if (!citees.includes(attendue)) trous.push(`${regleId} → ${attendue} manquante`);
      }
    }
    expect(trous).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Les six règles RÉELLES, évaluées par le moteur réel. Les bancs ci-dessus
// inspectent la table sans jamais l'exécuter, et ceux du moteur l'exécutent sur
// des règles fabriquées : ni les uns ni les autres ne diraient qu'une règle
// livrée ne se déclenche jamais.
describe('orientationRulesV1 — les règles livrées, dans le moteur', () => {
  const anamneseVide: DrapeauxAnamnese = {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
    attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
  };

  function evaluer(reponses: ReponseOrientation[], drapeaux = anamneseVide) {
    return evaluerOrientation({
      reponses,
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      drapeaux,
    });
  }

  const reponse = (idQuestionnaire: string, scores: Record<string, unknown>): ReponseOrientation =>
    ({ idQuestionnaire, dateReponse: '2026-08-01T10:00:00.000Z', scores });

  it('R-SOM-01 : un PSQI en zone défavorable propose HAD puis Cungi', () => {
    const recos = evaluer([
      reponse('Q_SOM_01', { total: 14, interpretation: { label: 'Troubles du sommeil modérés', color: 'warning' } }),
    ]);
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    // Cungi, nommé par le claim WN-CL-0323-013 — pas le PSS-10.
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_STR_03' });
  });

  // Arbitrage du 2026-08-03 : bande d'entrée par instrument. Le PSQI démarre à
  // `info` (total 5-10), au-dessus du seuil de 4 qu'il publie. Ce banc échoue si
  // quelqu'un « harmonise » les règles en les faisant toutes partir de warning.
  it("R-SOM-01 : un PSQI en bande `info` déclenche déjà", () => {
    const recos = evaluer([
      reponse('Q_SOM_01', { total: 7, interpretation: { label: 'Troubles du sommeil légers', color: 'info' } }),
    ]);
    expect(recos.map(r => r.cible)).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
  });

  it('R-STR-01 : un PSS-10 défavorable propose le BMS-10', () => {
    const recos = evaluer([
      reponse('Q_STR_02', { total: 30, interpretation: { label: 'Niveau élevé de stress', color: 'danger' } }),
    ]);
    expect(recos.map(r => r.cible)).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_STR_05' });
  });

  it('R-STR-02 : le pack stress exige le drapeau ET la mesure', () => {
    const mesure = reponse('Q_STR_02', { total: 30, interpretation: { label: 'Élevé', color: 'danger' } });
    const cible = { type: 'pack', packId: 'pack_stress_chronique_burnout' };
    // Mesure seule : pas de pack.
    expect(evaluer([mesure]).map(r => r.cible)).not.toContainEqual(cible);
    // Drapeau seul : pas de pack non plus.
    expect(evaluer([], { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] })
      .map(r => r.cible)).not.toContainEqual(cible);
    // Les deux : le pack sort.
    expect(evaluer([mesure], { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] })
      .map(r => r.cible)).toContainEqual(cible);
  });

  it('R-GAS-01 : un TFD défavorable propose le pack digestif', () => {
    const recos = evaluer([
      reponse('Q_GAS_01', { total: 55, interpretation: { label: 'C — Prédominance', color: 'danger' } }),
    ]);
    expect(recos.map(r => r.cible)).toContainEqual({ type: 'pack', packId: 'pack_digestif_intestin_cerveau' });
  });

  it('R-ANA-01 et R-ANA-02 : une déclaration propose un instrument, jamais un pack', () => {
    const recos = evaluer([], {
      ...anamneseVide,
      attentes: ['Améliorer le sommeil'],
      antecedentsDomaines: ['Psychiatrique (anxiété, dépression, burn-out)'],
    });
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    expect(cibles.filter(c => c.type === 'pack')).toEqual([]);
  });

  it('un patient sans réponse ni anamnèse ne reçoit rien', () => {
    expect(evaluer([])).toEqual([]);
  });

  // Une zone favorable ne déclenche jamais d'exploration : c'est la règle que
  // l'union de couleurs encode (`success` en est absente).
  it('une zone favorable ne déclenche aucune règle', () => {
    const recos = evaluer([
      reponse('Q_SOM_01', { total: 2, interpretation: { label: 'Pas de trouble du sommeil', color: 'success' } }),
      reponse('Q_STR_02', { total: 14, interpretation: { label: 'Bonne gestion du stress', color: 'success' } }),
    ]);
    expect(recos).toEqual([]);
  });
});
