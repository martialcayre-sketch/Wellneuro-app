import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256 } from './corpusSyntheseV1';
import { ORIENTATION_METADATA, ORIENTATION_RULES_SHA256, ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { idBaseDepuisPackId, type PackId } from '@/lib/questionnaires-functional';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import { extraireDrapeauxAnamnese, type DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';
import { MOTIFS_PASSATION_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import { calculateScore } from '@/lib/questions';

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

  // Héritier direct du banc `R-ANA-01 et R-ANA-02` de V1. `R-ANA-02` est
  // devenue `R2-NEU-02` à l'identique ; `R-ANA-01` est retirée — le PSQI se
  // propose désormais sur une MESURE (`R2-SOM-01`, `R2-SOM-02`) et non plus sur
  // l'attente déclarée seule, si bien que l'attente ne peut plus, à elle seule,
  // produire quoi que ce soit. Ce qui est vérifié ici reste ce qui l'était : la
  // ligne de doctrine « un drapeau déclaré seul ne propose jamais un pack ».
  it('R2-NEU-02 : une déclaration seule propose un instrument, jamais un pack', () => {
    const recos = evaluer([], {
      ...anamneseVide,
      attentes: ['Améliorer le sommeil'],
      antecedentsDomaines: ['Psychiatrique (anxiété, dépression, burn-out)'],
    });
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    expect(cibles.filter(c => c.type === 'pack')).toEqual([]);
    // L'attente « Améliorer le sommeil » ne suffit plus : R-ANA-01 est retirée,
    // et R2-SOM-05 exige en plus une mesure de sommeil non réparateur.
    expect(cibles).not.toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
    // R2-NEU-02 est la SEULE règle de la table à déclencheur unique de drapeau.
    const aDeclencheurDrapeauSeul = ORIENTATION_RULES_V1
      .filter(r => r.declencheurs.length === 1 && r.declencheurs[0].type === 'drapeau')
      .map(r => r.id);
    expect(aDeclencheurDrapeauSeul).toEqual(['R2-NEU-02']);
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

// ─────────────────────────────────────────────────────────────────────────────
// PREMIER TOUR (V2) — les règles qui s'allument sur le pack de base réellement
// administré (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_ALI_01`) et sur l'anamnèse.
//
// Chaque cas moteur ASSERTE SUR LE `regleId` DU MOTIF, et pas seulement sur la
// cible. Ce n'est pas du zèle : `Q_SOM_01` est proposé par `R2-SOM-01` ET par
// `R2-SOM-02`, `Q_NEU_11` par trois règles. Un banc qui ne regarderait que la
// cible resterait vert alors qu'une des deux règles est morte — c'est exactement
// ce qu'une faute de frappe sur un `sousScore` produit, en silence.
//
// Chaque cas n'alimente donc QUE l'instrument de la règle visée.
describe('orientationRulesV1 — premier tour, dans le moteur', () => {
  const anamneseVide: DrapeauxAnamnese = {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
    attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
  };

  // Composition RÉELLE des trois packs de doctrine que cette table peut
  // proposer, relue en base le 2026-08-04. Elle sert à deux choses : exercer
  // l'absorption pack ⊃ membre, et refuser silencieusement toute recommandation
  // qui doublerait un pack par un de ses propres instruments.
  const COMPOSITION_PACKS: Partial<Record<PackId, string[]>> = {
    pack_sommeil_chronobiologie: ['Q_SOM_01', 'Q_SOM_02', 'Q_SOM_03', 'Q_SOM_04', 'Q_SOM_05', 'Q_SOM_06', 'Q_INF_03', 'Q_NEU_11'],
    pack_stress_chronique_burnout: ['Q_STR_02', 'Q_STR_05'],
    pack_digestif_intestin_cerveau: ['Q_GAS_01'],
  };

  function evaluer(
    reponses: ReponseOrientation[],
    drapeaux = anamneseVide,
    compositionPacks?: Partial<Record<PackId, string[]>>,
  ) {
    return evaluerOrientation({
      reponses,
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      drapeaux,
      compositionPacks,
    });
  }

  /** Avec la composition réelle des packs : l'absorption pack ⊃ membre joue. */
  function evaluerAvecPacks(reponses: ReponseOrientation[], drapeaux = anamneseVide) {
    return evaluer(reponses, drapeaux, COMPOSITION_PACKS);
  }

  // Forme RÉELLE des `scoresJson` d'un moteur à sous-scores : la clé est
  // `subScores`, et `extraireCible` y matche sur `id` (l'`id` prime sur le
  // `label`). Le moteur `plaintes_actuelles` de `Q_MOD_03` émet la même forme,
  // bien qu'il déclare ses axes sous le nom `domains` dans le catalogue.
  //
  // `repondus`/`items` ÉGAUX par défaut : c'est ce que le moteur `subscore`
  // sert sur une passation complète depuis le 2026-08-04, et c'est ce que la
  // garde de complétude d'`extraireCible` lit. Une fixture qui les omettrait
  // décrirait un moteur qui n'existe plus, et laisserait la garde non exercée
  // sur le chemin heureux. `manquants` les désolidarise pour les cas partiels.
  const sousScores = (
    idQuestionnaire: string,
    axes: Array<{ id: string; total: number; interpretation?: { label: string; color: string } | null; manquants?: number }>,
  ): ReponseOrientation => ({
    idQuestionnaire,
    dateReponse: '2026-08-04T10:00:00.000Z',
    scores: {
      subScores: axes.map(axe => ({
        id: axe.id,
        label: axe.id,
        total: axe.total,
        interpretation: axe.interpretation ?? null,
        repondus: 5,
        items: 5 + (axe.manquants ?? 0),
      })),
    },
  });

  /** Les règles qui ont motivé une cible donnée — `[]` si la cible est absente. */
  function reglesPour(recos: ReturnType<typeof evaluer>, cible: { type: string; questionnaireId?: string; packId?: string }) {
    const trouvee = recos.find(r =>
      r.cible.type === cible.type
      && (r.cible as { questionnaireId?: string }).questionnaireId === cible.questionnaireId
      && (r.cible as { packId?: string }).packId === cible.packId);
    return trouvee ? trouvee.motifs.map(m => m.regleId) : [];
  }

  it('SOMMEIL — un contexte de sommeil insuffisant propose le PSQI (R2-SOM-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 14, interpretation: { label: 'Sommeil insuffisant', color: 'warning' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  it('STRESS — une adaptation insuffisante propose le PSS-10 (R2-STR-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'ADAPTATION_STRESS', total: 17, interpretation: { label: 'Adaptation insuffisante', color: 'warning' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-01');
  });

  it('HUMEUR — une plainte de moral intense propose le HAD (R2-NEU-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [
        { id: 'moral', total: 8, interpretation: { label: 'Intensité élevée', color: 'danger' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_NEU_11' })).toContain('R2-NEU-01');
  });

  it('DIGESTIF — une plainte digestive intense propose le TFD (R2-GAS-01)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [
        { id: 'digestion', total: 7, interpretation: { label: 'Intensité élevée', color: 'danger' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_GAS_01' })).toContain('R2-GAS-01');
  });

  it("NON-DÉCLENCHEMENT — un sommeil contextuel satisfaisant (15) ne propose pas le PSQI", () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 15, interpretation: { label: 'Sommeil satisfaisant', color: 'success' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toEqual([]);
  });

  // ── LE CAS DU TROU ────────────────────────────────────────────────────────
  //
  // LE banc de ce lot, et la raison pour laquelle `R2-SOM-01` est écrite en
  // `comparaison` plutôt qu'en `couleur`. La grille `SOMMEIL` de `Q_MOD_01` va
  // 0-8, PUIS 10-14 : la valeur 9 n'appartient à AUCUNE bande, et
  // `interpretRanges` y rend `null` (son unique repli ne joue que par le haut,
  // au-dessus du plafond de grille). Un patient à 9 dort donc plus mal qu'un
  // patient à 10, et n'a aucune couleur à quoi s'accrocher.
  //
  // Un déclencheur `{type:'couleur', couleurs:['warning','danger','dark']}` le
  // laisserait échapper EN SILENCE — et resterait vert au banc de monotonie des
  // couleurs, qui n'a rien à redire à cette union. Ce test-ci est le seul à
  // rougir sur cette mutation ; ne pas le supprimer.
  it('TROU À 9 — un sommeil contextuel à 9 (aucune bande) déclenche bien R2-SOM-01', () => {
    const recos = evaluer([
      // `interpretation: null` est ce que le moteur produit RÉELLEMENT à 9 —
      // la fixture ne triche pas, elle reproduit le trou.
      sousScores('Q_MOD_01', [{ id: 'SOMMEIL', total: 9, interpretation: null }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  // Le défaut que V2 corrige, épinglé à l'envers : sur un patient qui n'a passé
  // que le pack de base, AUCUNE des quatre règles de second tour ne peut parler.
  // L'assertion porte sur les `regleId`, et non sur les cibles : `R2-GAS-01`
  // propose `Q_GAS_01` dès le premier tour, si bien qu'un banc écrit sur les
  // cibles confondrait les deux tours.
  it('SECOND TOUR — aucune règle de mesure V1 ne parle sur le seul pack de base', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
        { id: 'ADAPTATION_STRESS', total: 8, interpretation: { label: 'Adaptation perturbée', color: 'danger' } },
      ]),
      sousScores('Q_MOD_03', [
        { id: 'digestion', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
        { id: 'moral', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
      ]),
      sousScores('Q_INF_03', [
        { id: 'SE', total: 25, interpretation: { label: 'Fortement perturbé', color: 'danger' } },
      ]),
    ], { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] });

    // Le premier tour, lui, a bien parlé : le banc ne prouverait rien sur un
    // patient dont personne ne dit rien.
    expect(recos.length).toBeGreaterThan(0);

    const SECOND_TOUR = ['R-SOM-01', 'R-STR-01', 'R-STR-02', 'R-GAS-01'];
    const declenchees = new Set(recos.flatMap(r => r.motifs.map(m => m.regleId)));
    expect(SECOND_TOUR.filter(id => declenchees.has(id))).toEqual([]);
  });

  // ── LE BLOQUANT DE LA REVUE DU 2026-08-04 ─────────────────────────────────
  //
  // Une passation ABANDONNÉE produisait une orientation, et la produisait à
  // l'envers. La fixture n'est pas écrite à la main : elle passe par
  // `calculateScore`, le moteur RÉEL, sur les trois seules réponses du scénario
  // — un item par axe, chacun à sa MEILLEURE option. Tout ce que ce test
  // affirme sur la forme servie est donc vérifié en passant.
  //
  // Sans la garde de complétude : sept recommandations, dont DEUX PACKS,
  // motivées par un « Sommeil non réparateur » chez un patient qui vient de
  // cocher « Excellent sommeil ». Le biais est structurel — un total partiel
  // manque de ce qui n'a pas été répondu, et les sept déclencheurs de
  // `Q_MOD_01` comparent en `<=` sur une échelle inversée.
  it('ABANDON — trois items de Q_MOD_01 à leur MEILLEURE valeur ne recommandent RIEN', () => {
    const scores = calculateScore('Q_MOD_01', {
      SOMMEIL_Q001: 4,             // « Excellent sommeil »
      RYTHME_BIOLOGIQUE_Q001: 4,   // « Oui toujours »
      ADAPTATION_STRESS_Q001: 8,   // « Je gère très bien, toujours »
    });

    // Ce que le moteur sert vraiment : des totaux BAS (4, 4, 8) sur des axes de
    // 5 items dont un seul est répondu. Le test perdrait tout son sens si la
    // fixture n'était pas dans cet état — on le vérifie plutôt que de le
    // supposer.
    const axes = (scores as { subScores: Array<{ id: string; total: number | null; repondus: number; items: number }> }).subScores;
    const sommeil = axes.find(a => a.id === 'SOMMEIL');
    expect(sommeil?.total).toBe(4);
    expect(sommeil?.repondus).toBe(1);
    expect(sommeil?.items).toBe(5);

    const recos = evaluerAvecPacks(
      [{ idQuestionnaire: 'Q_MOD_01', dateReponse: '2026-08-04T10:00:00.000Z', scores: scores as Record<string, unknown> }],
      {
        ...anamneseVide,
        antecedentsDomaines: ['Respiratoire / apnée du sommeil'],
        facteursDeclenchants: ['Stress aigu / burn-out'],
        attentes: ['Améliorer le sommeil'],
      },
    );
    expect(recos).toEqual([]);
  });

  // Le pendant du test ci-dessus : la garde ne doit pas non plus tout éteindre.
  // Mêmes trois axes, complets cette fois et RÉELLEMENT dégradés — l'orientation
  // repart. Sans lui, supprimer la table entière laisserait le test du bloquant
  // vert.
  it('ABANDON — la garde ne mord PAS sur une passation complète et dégradée', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 4, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
      ]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  // ── UN CAS MOTEUR PAR RÈGLE, ASSERTÉ SUR LE `regleId` ─────────────────────
  //
  // Neuf règles n'avaient AUCUN cas moteur, et deux sont neuves. Ce qu'une règle
  // non couverte coûte, mesuré : la mutation `sousScore: 'digestion'` →
  // `'digestions'` sur `R2-GAS-02` laissait le banc ENTIER vert. Une règle morte
  // ne casse rien — elle cesse de parler.

  it('R2-SOM-02 — une plainte de sommeil intense propose le PSQI', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [{ id: 'sommeil', total: 7, interpretation: { label: 'Intensité élevée', color: 'danger' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-02');
  });

  it('R2-SOM-03 — un rythme biologique insuffisant propose le chronotype de Horne', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [{ id: 'RYTHME_BIOLOGIQUE', total: 14, interpretation: { label: 'Rythme insuffisant', color: 'warning' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_05' })).toContain('R2-SOM-03');
  });

  it('R2-SOM-04 — un antécédent respiratoire ET un sommeil dégradé proposent Berlin', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'SOMMEIL', total: 14, interpretation: { label: 'Sommeil insuffisant', color: 'warning' } },
    ]);
    const drapeau = { ...anamneseVide, antecedentsDomaines: ['Respiratoire / apnée du sommeil'] };
    // L'ET logique, dans les deux sens : ni la mesure seule, ni le drapeau seul.
    expect(reglesPour(evaluer([mesure]), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' })).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' })).toEqual([]);
    expect(reglesPour(evaluer([mesure], drapeau), { type: 'questionnaire', questionnaireId: 'Q_SOM_03' })).toContain('R2-SOM-04');
  });

  it('R2-SOM-05 — une attente de sommeil ET un sommeil non réparateur engagent le pack', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
    ]);
    const drapeau = { ...anamneseVide, attentes: ['Améliorer le sommeil'] };
    expect(reglesPour(evaluer([mesure]), { type: 'pack', packId: 'pack_sommeil_chronobiologie' })).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), { type: 'pack', packId: 'pack_sommeil_chronobiologie' })).toEqual([]);
    expect(reglesPour(evaluer([mesure], drapeau), { type: 'pack', packId: 'pack_sommeil_chronobiologie' })).toContain('R2-SOM-05');
  });

  it('R2-SOM-06 — une plainte de fatigue intense propose Epworth PUIS Pichot', () => {
    const recos = evaluer([
      sousScores('Q_MOD_03', [{ id: 'fatigue', total: 7, interpretation: { label: 'Intensité élevée', color: 'danger' } }]),
    ]);
    // Les deux instruments, et l'ordre que le claim leur donne (priorité 1 puis 2).
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_02' })).toContain('R2-SOM-06');
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_06' })).toContain('R2-SOM-06');
    const epworth = recos.find(r => r.cible.type === 'questionnaire' && r.cible.questionnaireId === 'Q_SOM_02');
    const pichot = recos.find(r => r.cible.type === 'questionnaire' && r.cible.questionnaireId === 'Q_SOM_06');
    expect(epworth?.priorite).toBe(1);
    expect(pichot?.priorite).toBe(2);
  });

  it('R2-STR-02 — un burn-out déclaré ET une adaptation insuffisante engagent le pack stress', () => {
    const mesure = sousScores('Q_MOD_01', [
      { id: 'ADAPTATION_STRESS', total: 17, interpretation: { label: 'Adaptation insuffisante', color: 'warning' } },
    ]);
    const drapeau = { ...anamneseVide, facteursDeclenchants: ['Stress aigu / burn-out'] };
    expect(reglesPour(evaluer([mesure]), { type: 'pack', packId: 'pack_stress_chronique_burnout' })).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), { type: 'pack', packId: 'pack_stress_chronique_burnout' })).toEqual([]);
    expect(reglesPour(evaluer([mesure], drapeau), { type: 'pack', packId: 'pack_stress_chronique_burnout' })).toContain('R2-STR-02');
  });

  it('R2-STR-03 — une adaptation perturbée propose le BMS-10 sans attendre', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [{ id: 'ADAPTATION_STRESS', total: 8, interpretation: { label: 'Adaptation perturbée', color: 'danger' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_05' })).toContain('R2-STR-03');
    // Correction du 2026-08-04 : à 8, `R2-STR-01` s'allume AUSSI (`8 <= 17`).
    // Le resserrement de `R2-STR-03` n'évite donc aucun doublon — il borne
    // seulement sa propre portée. Les deux règles visent des cibles distinctes.
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-01');
  });

  it('R2-NEU-03 — une échelle fonctionnelle sérotonine perturbée propose le HAD', () => {
    const recos = evaluer([
      sousScores('Q_INF_03', [{ id: 'SE', total: 10, interpretation: { label: 'Perturbations probables', color: 'warning' } }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_NEU_11' })).toContain('R2-NEU-03');
  });

  // La jumelle de `R2-NEU-03` sur l'axe dopamine — ajoutée le 2026-08-04 parce
  // que les deux claims nomment « les scores fonctionnels D ET S » au même rang.
  // Le test l'isole : SEUL `DA` est renseigné, si bien qu'un `R2-NEU-04` muet ne
  // peut pas être masqué par `R2-NEU-03`.
  it('R2-NEU-04 — une échelle fonctionnelle dopamine perturbée propose le HAD', () => {
    const recos = evaluer([
      sousScores('Q_INF_03', [{ id: 'DA', total: 10, interpretation: { label: 'Perturbations probables', color: 'warning' } }]),
    ]);
    const motifs = reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_NEU_11' });
    expect(motifs).toContain('R2-NEU-04');
    expect(motifs).not.toContain('R2-NEU-03');
  });

  it('R2-NEU-03 et R2-NEU-04 — les deux axes perturbés motivent UNE recommandation à DEUX motifs', () => {
    const recos = evaluer([
      sousScores('Q_INF_03', [
        { id: 'DA', total: 12, interpretation: { label: 'Perturbations probables', color: 'warning' } },
        { id: 'SE', total: 15, interpretation: { label: 'Perturbations probables', color: 'warning' } },
      ]),
    ]);
    const had = recos.filter(r => r.cible.type === 'questionnaire' && r.cible.questionnaireId === 'Q_NEU_11');
    expect(had).toHaveLength(1);
    expect(had[0].motifs.map(m => m.regleId).sort()).toEqual(['R2-NEU-03', 'R2-NEU-04']);
  });

  it('R2-GAS-02 — un antécédent digestif ET une plainte modérée engagent le pack digestif', () => {
    const mesure = sousScores('Q_MOD_03', [
      { id: 'digestion', total: 4, interpretation: { label: 'Intensité modérée', color: 'warning' } },
    ]);
    const drapeau = { ...anamneseVide, antecedentsDomaines: ['Digestif (SII, reflux, MICI…)'] };
    expect(reglesPour(evaluer([mesure]), { type: 'pack', packId: 'pack_digestif_intestin_cerveau' })).toEqual([]);
    expect(reglesPour(evaluer([], drapeau), { type: 'pack', packId: 'pack_digestif_intestin_cerveau' })).toEqual([]);
    expect(reglesPour(evaluer([mesure], drapeau), { type: 'pack', packId: 'pack_digestif_intestin_cerveau' })).toContain('R2-GAS-02');
  });

  // La SECONDE porte de `WN-CL-0287-009`, câblée le 2026-08-04. Déclencheur
  // GLOBAL : `Q_ALI_01` (moteur `seuils_points`) n'émet aucun `subScores`.
  //
  // Le banc de cette règle ne vit PAS ici : `Q_ALI_01` désigne deux instruments
  // selon `WN_ALI_01_SIIN57`, et une fixture écrite à la main ne dirait rien de
  // la position du drapeau. Il est plus bas, sur les définitions RÉELLES —
  // « R2-ALI-01 sur l'instrument réel, dans les deux positions du drapeau ».

  // ── NON-DÉCLENCHEMENT AUX BORNES DES SEUILS RESSERRÉS ─────────────────────
  //
  // Trois règles descendent SOUS le seuil de leur voisine, et chacune le motive.
  // Un seuil qu'aucun test ne borne se laisse « harmoniser » sans rien casser.

  it('BORNE — SOMMEIL à 9 : pas de pack sommeil (R2-SOM-05 exige <= 8)', () => {
    const recos = evaluer(
      [sousScores('Q_MOD_01', [{ id: 'SOMMEIL', total: 9, interpretation: null }])],
      { ...anamneseVide, attentes: ['Améliorer le sommeil'] },
    );
    expect(reglesPour(recos, { type: 'pack', packId: 'pack_sommeil_chronobiologie' })).toEqual([]);
    // Le patient n'est pas laissé sans rien : `R2-SOM-01` lui propose le PSQI
    // seul. C'est l'effet de bord voulu du seuil resserré.
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_SOM_01' })).toContain('R2-SOM-01');
  });

  it('BORNE — ADAPTATION_STRESS à 9 : pas de BMS-10 (R2-STR-03 exige <= 8)', () => {
    const recos = evaluer([
      sousScores('Q_MOD_01', [{ id: 'ADAPTATION_STRESS', total: 9, interpretation: null }]),
    ]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_05' })).toEqual([]);
    expect(reglesPour(recos, { type: 'questionnaire', questionnaireId: 'Q_STR_02' })).toContain('R2-STR-01');
  });

  it('BORNE — digestion à 3 : pas de pack digestif (R2-GAS-02 exige >= 4)', () => {
    const recos = evaluer(
      [sousScores('Q_MOD_03', [{ id: 'digestion', total: 3, interpretation: { label: 'Intensité faible ou absente', color: 'success' } }])],
      { ...anamneseVide, antecedentsDomaines: ['Digestif (SII, reflux, MICI…)'] },
    );
    expect(reglesPour(recos, { type: 'pack', packId: 'pack_digestif_intestin_cerveau' })).toEqual([]);
  });

  // ── UN PACK ABSORBE SES MEMBRES (arbitrage praticien du 2026-08-04) ────────
  it('ABSORPTION — un pack recommandé masque ses propres membres', () => {
    const recos = evaluerAvecPacks(
      [sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
      ])],
      { ...anamneseVide, attentes: ['Améliorer le sommeil'] },
    );
    const cibles = recos.map(r => r.cible);
    expect(cibles).toContainEqual({ type: 'pack', packId: 'pack_sommeil_chronobiologie' });
    // `Q_SOM_01` est un membre de ce pack : `R2-SOM-01` le proposait en ligne
    // distincte, il ne s'affiche plus.
    expect(cibles).not.toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
    // Le motif absorbé ne DISPARAÎT pas : il remonte sur le pack.
    const pack = recos.find(r => r.cible.type === 'pack');
    expect(pack?.motifs.map(m => m.regleId).sort()).toEqual(['R2-SOM-01', 'R2-SOM-05']);
    // Sans la composition, l'absorption ne peut pas jouer — on ne devine pas ce
    // qu'un pack contient.
    const sansComposition = evaluer(
      [sousScores('Q_MOD_01', [{ id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } }])],
      { ...anamneseVide, attentes: ['Améliorer le sommeil'] },
    );
    expect(sansComposition.map(r => r.cible)).toContainEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
  });

  // Un pack absorbe des cibles d'un AUTRE axe clinique — `PACK_SOMMEIL_CHRONO`
  // contient `Q_NEU_11` et `Q_INF_03`. Sans report du niveau, un patient sévère
  // voyait sa sortie tomber à des packs tous `approfondissement` et PLUS RIEN au
  // `socle`, alors que des règles `socle` avaient déclenché.
  it('ABSORPTION — le pack porte le niveau le plus fondamental de ce qu\'il absorbe', () => {
    const recos = evaluerAvecPacks(
      [sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
      ])],
      { ...anamneseVide, attentes: ['Améliorer le sommeil'] },
    );
    const pack = recos.find(r => r.cible.type === 'pack' && r.cible.packId === 'pack_sommeil_chronobiologie');
    // Le pack est `approfondissement` au registre ; `R2-SOM-01`, qui proposait
    // `Q_SOM_01` (membre absorbé), est `socle`. C'est le socle qui l'emporte.
    expect(pack?.niveau).toBe('socle');
    // Et le socle n'a pas disparu de la sortie : c'est tout l'enjeu.
    expect(recos.some(r => r.niveau === 'socle')).toBe(true);
  });

  // L'`objectif` est la seule phrase française qui dit POURQUOI, et elle part
  // aussi au modèle de synthèse. Elle est reportée PRÉFIXÉE par la cible : ainsi
  // préfixée, elle ne peut pas se lire comme une description du pack.
  it('ABSORPTION — les objectifs des membres remontent, préfixés par la cible', () => {
    const recos = evaluerAvecPacks(
      [sousScores('Q_MOD_01', [
        { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
      ])],
      { ...anamneseVide, attentes: ['Améliorer le sommeil'] },
    );
    const pack = recos.find(r => r.cible.type === 'pack' && r.cible.packId === 'pack_sommeil_chronobiologie');
    // L'objectif propre au pack (`R2-SOM-05`) est toujours là, sans préfixe.
    expect(pack?.objectifs.some(o => o.startsWith("Engager l'exploration complète du sommeil"))).toBe(true);
    // Celui de la cible absorbée est là aussi, et il dit de qui il parle.
    const reporte = pack?.objectifs.find(o => o.startsWith('via Q_SOM_01 : '));
    expect(reporte, "l'objectif de Q_SOM_01 doit remonter sur le pack").toBeDefined();
    expect(reporte).toContain('Mesurer la qualité du sommeil par le PSQI');
    // Aucun objectif reporté ne se présente comme une description du pack.
    const membres = COMPOSITION_PACKS.pack_sommeil_chronobiologie ?? [];
    for (const objectif of pack?.objectifs ?? []) {
      const vientDunMembre = membres.some(qid => objectif.startsWith(`via ${qid} : `));
      const propreAuPack = pack?.motifs.some(m => m.regleId === 'R2-SOM-05') && !objectif.startsWith('via ');
      expect(vientDunMembre || propreAuPack).toBe(true);
    }
  });

  // L'invariant général, sur un patient qui allume presque tout : aucune
  // recommandation de questionnaire ne doit être membre d'un pack recommandé.
  it('ABSORPTION — aucun pack recommandé ne coexiste avec un de ses membres', () => {
    const recos = evaluerAvecPacks(
      [
        sousScores('Q_MOD_01', [
          { id: 'SOMMEIL', total: 8, interpretation: { label: 'Sommeil non réparateur', color: 'danger' } },
          { id: 'RYTHME_BIOLOGIQUE', total: 8, interpretation: { label: 'Rythme non réparateur', color: 'danger' } },
          { id: 'ADAPTATION_STRESS', total: 8, interpretation: { label: 'Adaptation perturbée', color: 'danger' } },
        ]),
        sousScores('Q_MOD_03', [
          { id: 'sommeil', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
          { id: 'fatigue', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
          { id: 'moral', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
          { id: 'digestion', total: 9, interpretation: { label: 'Intensité très élevée', color: 'danger' } },
        ]),
        sousScores('Q_INF_03', [
          { id: 'DA', total: 25, interpretation: { label: 'Fortement perturbé', color: 'danger' } },
          { id: 'SE', total: 25, interpretation: { label: 'Fortement perturbé', color: 'danger' } },
        ]),
      ],
      {
        ...anamneseVide,
        attentes: ['Améliorer le sommeil'],
        facteursDeclenchants: ['Stress aigu / burn-out'],
        antecedentsDomaines: ['Digestif (SII, reflux, MICI…)', 'Respiratoire / apnée du sommeil'],
      },
    );

    // Le banc ne prouverait rien sur un patient à qui on ne propose rien.
    expect(recos.length).toBeGreaterThan(0);
    const packsRecommandes = recos
      .filter(r => r.cible.type === 'pack')
      .map(r => (r.cible as { packId: keyof typeof COMPOSITION_PACKS }).packId);
    expect(packsRecommandes.length).toBeGreaterThan(0);

    const membres = new Set<string>(packsRecommandes.flatMap(packId => COMPOSITION_PACKS[packId] ?? []));
    const doublons = recos
      .filter(r => r.cible.type === 'questionnaire')
      .map(r => (r.cible as { questionnaireId: string }).questionnaireId)
      .filter(qid => membres.has(qid));
    expect(doublons).toEqual([]);

    // PAS DE PLAFOND GLOBAL (décision explicite) : ce qui reste justifié reste
    // affiché. L'absorption retire la redondance, jamais la quantité.
    expect(recos.length).toBeGreaterThan(2);
  });
});

// Invariant relevé à la revue adversariale du LOT-06.
//
// Depuis ce lot, les motifs d'orientation entrent dans le prompt de la synthèse
// IA. Or `buildUserMessage` RETIRE délibérément les chiffres des passations
// inscrites au registre `passationsNonInterpretables` — mais le moteur
// d'orientation, lui, lit toutes les réponses sans ce filtre. Une règle
// déclenchée sur une telle passation réintroduirait dans le prompt, sous
// l'étiquette « recommandation déterministe signée », le score que l'autre bloc
// vient d'ôter — et sous une consigne qui déclare ce bloc prioritaire.
//
// La disjonction est vraie aujourd'hui par accident : la table V1 déclenche sur
// Q_GAS_01, Q_SOM_01 et Q_STR_02, le registre porte d'autres instruments. Rien
// ne la gardait. C'est ce test.
describe('disjonction avec les passations non interprétables', () => {
  it('aucun déclencheur ne porte sur une passation dont le résultat n’est pas une mesure', () => {
    const instrumentsDeclencheurs = new Set(
      ORIENTATION_RULES_V1.flatMap(regle =>
        regle.declencheurs
          .filter(declencheur => declencheur.type === 'zone' || declencheur.type === 'comparaison')
          .map(declencheur => (declencheur as { idQuestionnaire: string }).idQuestionnaire),
      ),
    );

    const collisions = [...instrumentsDeclencheurs].filter(id =>
      MOTIFS_PASSATION_NON_INTERPRETABLE.has(id),
    );

    expect(
      collisions,
      'une règle déclenche sur une passation non interprétable : son motif ferait entrer dans le prompt de synthèse le chiffre que buildUserMessage en retire',
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R2-ALI-01 SUR L'INSTRUMENT RÉEL, DANS LES DEUX POSITIONS DU DRAPEAU.
//
// `Q_ALI_01` désigne DEUX instruments selon `WN_ALI_01_SIIN57` : la forme SIIN57
// (57 items, `seuils_points`, /90) quand il vaut `'true'`, la forme COURT14
// (14 items, `sum`, /42) sinon — et il est ÉTEINT par défaut, donc en CI. Le
// claim qui fonde `R2-ALI-01` (`WN-CL-0287-009`) parle de l'enquête « SiiN
// DÉTAILLÉE » : la règle ne doit mordre que sur la forme longue.
//
// Aucune fixture écrite à la main ici : les scores sont produits par le
// SCOREUR RÉEL (`calculateScore`) sur des réponses construites à partir des
// OPTIONS RÉELLES de la définition servie. Une fixture recopiée resterait verte
// le jour où une bande est réécrite — c'est-à-dire au seul moment où ce banc
// aurait quelque chose à dire.
//
// `QUESTIONNAIRE_CATALOGUE` résout le drapeau À L'IMPORT (`Q_ALI_01 =
// process.env.WN_ALI_01_SIIN57 === 'true' ? … : …`) : la variable ne peut donc
// pas être changée après coup, d'où `vi.stubEnv` + `vi.resetModules()` +
// `await import()` à chaque position. Même patron que
// `agendaAlimentaireDrapeau.guard.test.ts`. Le moteur, lui, reste importé
// statiquement : il ne lit aucun drapeau, il ne lit que des scores.
describe('R2-ALI-01 — sur l’instrument réel, dans les deux positions du drapeau', () => {
  type OptionReelle = { v: number; l: string };
  type QuestionReelle = { id: string; options?: OptionReelle[] };
  type FormeServie = { sections: Array<{ questions: QuestionReelle[] }> };
  type ScoreLu = {
    total: number | null;
    missing?: number;
    interpretation?: { label?: string; color?: string } | null;
  };

  const anamneseVide: DrapeauxAnamnese = {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
    attentes: [], automedication: [], debut: null, evolution: null, variationPoids: null,
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** La forme RÉELLEMENT servie sous une position du drapeau, et son scoreur. */
  async function formeServie(drapeau: string | undefined) {
    vi.resetModules();
    // `stubEnv(nom, undefined)` fait un `delete` : c'est la variable ABSENTE,
    // l'état réel du CI, de dev et de preview.
    vi.stubEnv('WN_ALI_01_SIIN57', drapeau as string);
    const questions = await import('@/lib/questions');
    const def = (questions.QUESTIONNAIRE_CATALOGUE as unknown as Record<string, FormeServie>).Q_ALI_01;
    const scorer = (reponses: Record<string, number>) =>
      questions.calculateScore('Q_ALI_01', reponses) as ScoreLu;
    return { def, scorer, items: def.sections.flatMap(s => s.questions) };
  }

  /**
   * Une passation COMPLÈTE, poussée vers le BAS par le scoreur réel : chaque
   * item reçoit celle de ses options qui minimise le total. Rien n'est écrit à
   * la main — ni valeur, ni seuil, ni libellé.
   */
  function passationLaPlusBasse(items: QuestionReelle[], scorer: (r: Record<string, number>) => ScoreLu) {
    const reponses: Record<string, number> = {};
    for (const item of items) reponses[item.id] = (item.options ?? [])[0].v;
    for (const item of items) {
      for (const option of item.options ?? []) {
        const essai = { ...reponses, [item.id]: option.v };
        if ((scorer(essai).total ?? 0) < (scorer(reponses).total ?? 0)) reponses[item.id] = option.v;
      }
    }
    return reponses;
  }

  /**
   * Puis remontée item par item jusqu'à franchir un plancher. Les items valent
   * 1 ou 2 points : le dépassement est d'au plus 2, très en deçà de la largeur
   * des bandes visées. Le banc ASSERTE la bande obtenue plutôt que de la
   * supposer.
   */
  function passationAuDessusDe(
    plancher: number,
    items: QuestionReelle[],
    scorer: (r: Record<string, number>) => ScoreLu,
  ) {
    const reponses = passationLaPlusBasse(items, scorer);
    for (const item of items) {
      if ((scorer(reponses).total ?? 0) >= plancher) break;
      for (const option of item.options ?? []) {
        const essai = { ...reponses, [item.id]: option.v };
        if ((scorer(essai).total ?? 0) > (scorer(reponses).total ?? 0)) reponses[item.id] = option.v;
      }
    }
    return reponses;
  }

  function evaluerSur(score: ScoreLu) {
    return evaluerOrientation({
      reponses: [{
        idQuestionnaire: 'Q_ALI_01',
        dateReponse: '2026-08-04T10:00:00.000Z',
        scores: score as unknown as Record<string, unknown>,
      }],
      idsQuestionnairesAssignes: [],
      regles: ORIENTATION_RULES_V1,
      drapeaux: anamneseVide,
    });
  }

  const PACK_DIGESTIF = { type: 'pack', packId: 'pack_digestif_intestin_cerveau' };

  it('DRAPEAU ALLUMÉ — une bande défavorable de la forme SIIN57 engage le pack digestif', async () => {
    const { scorer, items } = await formeServie('true');
    expect(items, 'la forme allumée doit être celle à 57 items').toHaveLength(57);

    // Bande la plus sévère : toutes les options les moins favorables.
    const severe = scorer(passationLaPlusBasse(items, scorer));
    expect(severe.missing, 'la passation doit être complète').toBe(0);
    expect(severe.interpretation?.label).toBe('Alimentation très déséquilibrée et défavorable');
    expect(evaluerSur(severe).map(r => r.cible)).toContainEqual(PACK_DIGESTIF);

    // Bande défavorable intermédiaire (26-50), l'autre libellé cité par la règle.
    const intermediaire = scorer(passationAuDessusDe(26, items, scorer));
    expect(intermediaire.interpretation?.label)
      .toBe('Alimentation déséquilibrée, ne contribuant pas au maintien du capital santé');
    expect(evaluerSur(intermediaire).map(r => r.cible)).toContainEqual(PACK_DIGESTIF);
  });

  it('DRAPEAU ALLUMÉ — la bande `info` (« plutôt équilibrée ») ne déclenche PAS', async () => {
    const { scorer, items } = await formeServie('true');
    const score = scorer(passationAuDessusDe(51, items, scorer));
    expect(score.interpretation?.label)
      .toBe('Alimentation plutôt équilibrée, mais insuffisamment protectrice');
    expect(score.interpretation?.color, 'la bande visée est bien `info`').toBe('info');
    // Elle est LAISSÉE DEHORS délibérément : « plutôt équilibrée » n'est pas
    // défavorable. Un déclencheur qui partirait de `info` ferait rougir ceci.
    expect(evaluerSur(score)).toEqual([]);
  });

  it('DRAPEAU ÉTEINT — un score bas de la forme COURT14 n’engage RIEN', async () => {
    const { scorer, items } = await formeServie(undefined);
    expect(items, 'drapeau éteint : la forme servie est celle à 14 items').toHaveLength(14);

    const score = scorer(passationLaPlusBasse(items, scorer));
    // La forme courte produit bien, elle aussi, une bande défavorable — et une
    // COULEUR identique à celle de la forme longue. C'est exactement ce qui
    // rendait un déclencheur `{type: 'couleur'}` aveugle au drapeau.
    expect(['warning', 'danger']).toContain(score.interpretation?.color);
    // Mais son libellé n'est pas celui de la forme SIIN57 : la règle ne mord pas.
    expect(score.interpretation?.label).not.toBe('Alimentation très déséquilibrée et défavorable');
    expect(evaluerSur(score)).toEqual([]);
  });

  it('DRAPEAU ÉTEINT — aucune position ne rend la règle muette par accident', async () => {
    // Contre-épreuve : le test précédent serait vert si la règle était morte
    // dans les DEUX positions (identifiant mal orthographié, statut suspendu…).
    // Celle-ci l'exclut en exigeant qu'elle vive dans l'autre.
    const { scorer, items } = await formeServie('true');
    const motifs = evaluerSur(scorer(passationLaPlusBasse(items, scorer)))
      .flatMap(r => r.motifs.map(m => m.regleId));
    expect(motifs).toContain('R2-ALI-01');
  });

  // Le score global d'une enquête abandonnée reste servi par `seuils_points`
  // SANS condition de complétude : trois items renseignés rendent quelques
  // points sur 90, donc la bande la plus sévère. C'est la garde de complétude
  // d'`extraireCible` qui l'arrête, et elle est exercée ici sur l'instrument
  // réel — pas sur un `missing` posé à la main.
  it('DRAPEAU ALLUMÉ — une enquête SIIN abandonnée n’engage aucun pack', async () => {
    const { scorer, items } = await formeServie('true');
    const complete = passationLaPlusBasse(items, scorer);
    const troisItems = Object.fromEntries(
      Object.entries(complete).filter(([id]) => items.slice(0, 3).some(q => q.id === id)),
    );
    const score = scorer(troisItems);
    expect(score.missing, 'la passation doit être incomplète').toBeGreaterThan(0);
    expect(score.interpretation?.label, 'le moteur sert quand même sa bande la plus sévère')
      .toBe('Alimentation très déséquilibrée et défavorable');
    expect(evaluerSur(score)).toEqual([]);
  });
});
