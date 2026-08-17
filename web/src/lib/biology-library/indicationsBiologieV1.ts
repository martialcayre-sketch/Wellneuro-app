import type { OrientationClaimRef, OrientationDeclencheur } from '@/lib/clinical/orientationRulesV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';

// Table des indications de panels biologiques (LOT-06, D-059 §5) — patron
// orientation (`orientationRulesV1.ts`), réutilisé à l'identique : conditions
// TYPÉES sur zones d'instruments et drapeaux d'anamnèse, claims épinglés par
// règle, signature praticien séparée de l'écriture. Le catalogue DB
// (`BiologyPanel`/`BiologyPanelItem`) ne porte que la COMPOSITION des panels ;
// cette table dit QUAND un panel est recommandé, optionnel, conditionnel ou
// non indiqué. Jamais d'expression libre, jamais une condition évaluée par le
// LLM (`D-003`, `DC-26`).
//
// [LIVRÉE VIDE du 2026-08-14 au 2026-08-17, ET C'ÉTAIT LE CONTRAT (`D-059`
// §2 et §3) : écrire une règle d'indication est un CONTENU CLINIQUE, et les
// règles devaient arriver avec la proposition validée, dans la même
// relecture.] PEUPLÉE le 2026-08-17 ([[D-069]]) : les quinze règles du
// catalogue niveau 1, transcrites de la proposition v5 validée par le
// praticien, chaque ligne adossée à ses claims VALIDE relus en production
// (`DC-01`, `DC-26`).
//
// LE VERROU EST FERMÉ, ET `validationExterne` NE LE DIT PAS À LUI SEUL.
// [[D-061]] a posé `validationExterne: true` sur instruction praticien, mais
// sans date, sans claims et sans périmètre relu : au standard des quatre autres
// tables, ce n'est pas une signature — et [[D-063]] a fermé le verrou en
// conséquence, `signatureIndicationsValide` regardant les CINQ termes. Le détail
// (ce qu'il faut poser pour signer réellement, et le piège à ne pas reproduire)
// est écrit sur la métadonnée plus bas, jamais recopié ici : deux copies
// divergeraient. Écrire des règles et les signer restent deux gestes distincts,
// et le second est un geste praticien explicite (même discipline que
// `ORIENTATION_METADATA`). Le verrou de la route est un ET : table signée ET
// `WN_CB_ENABLED === 'true'` (`featureFlag.ts`) — signer est un acte clinique,
// déployer est un acte d'exploitation.

export type ModeIndicationPanel =
  /** Proposé d'emblée sur le tableau clinique couvert par les claims de la règle. */
  | 'recommande'
  /** Proposé, mais explicitement laissé à l'appréciation sans signal d'appel. */
  | 'optionnel'
  /**
   * Suspendu à des déclencheurs : le panel s'affiche TOUJOURS `conditionnel`,
   * déclencheur rempli ou non — non rempli, il s'affiche avec sa condition,
   * jamais absent, jamais refusé en silence (`D-059` §5).
   */
  | 'conditionnel'
  /** Explicitement non indiqué à ce stade (ex. exploration isolée hors contexte). */
  | 'non_indique_actuellement';

export type RepetitionPanel = {
  /**
   * Délai au-delà duquel un panel déjà documenté repasse `a_repeter`. Chiffre
   * CLINIQUE : il n'entre ici qu'adossé aux claims de la règle (`DC-19`),
   * jamais choisi pour la commodité du code.
   */
  delaiJours: number;
};

export type RegleIndicationPanel = {
  id: string;
  /** Seules les règles `publiee` sont évaluées par le moteur de statuts. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /** Code du panel visé (`BiologyPanel.code`) — la composition reste en base. */
  panelCode: string;
  mode: ModeIndicationPanel;
  /**
   * ET logique, réservé au mode `conditionnel` (le moteur écarte toute règle
   * d'un autre mode qui en porterait : la sémantique serait ambiguë). Types
   * partagés avec la table d'orientation — mêmes gardes de recueil incomplet,
   * même interdit sur `signauxAlerte`.
   */
  declencheurs: OrientationDeclencheur[];
  /**
   * Libellé français de la condition, affiché au praticien quand le
   * déclencheur n'est pas rempli. Obligatoire en mode `conditionnel`.
   */
  condition: string | null;
  /** Motif français d'une non-indication (mode `non_indique_actuellement`). */
  motif: string | null;
  repetition?: RepetitionPanel;
  /**
   * Claims VALIDÉS à l'appui. Jamais vide : une règle sans claim n'est pas
   * traçable jusqu'à sa source, et le moteur l'ignore (même invariant que
   * `evaluerOrientation`).
   */
  justificationClaims: OrientationClaimRef[];
};

/**
 * LES QUINZE RÈGLES DU CATALOGUE NIVEAU 1 ([[D-069]]) — transcrites de la
 * proposition validée du 2026-08-15 (v5, zones tranchées), claims relus en
 * production (les 49 de la proposition, 49/49 VALIDE le 2026-08-16 — dont les
 * 29 du périmètre signé, revérifiés 29/29 le 2026-08-17). Chaque zone cite les
 * bandes que l'instrument PUBLIE, relues dans sa grille le 2026-08-17 — pas la
 * sténo du document (le « warning (5-21) » du §F.2 est une étendue de score,
 * pas une bande ; le §B fait foi).
 *
 * SIX RÈGLES PORTENT UNE DISJONCTION ([[D-060]]) : atteinte dès qu'UNE branche
 * complète l'est, traçabilité limitée à cette branche, un recueil incomplet
 * n'allume jamais une branche. Les dix-sept instruments visés publient leurs
 * comptes depuis [[D-066]] — le banc d'inertie le tient (RV-1).
 *
 * RÉPÉTITION ANNUELLE (`delaiJours: 365`, arbitrage F.1 explicite du
 * 2026-08-16) : les NEUF panels de tableau clinique de niveau socle — pas les
 * panels de population, pas l'optionnel, pas l'approfondissement. Chiffre
 * clinique adossé à `WN-CL-0312-018` et `WN-CL-0389-004` (« une fois par an »).
 */
export const INDICATIONS_BIOLOGIE_V1: RegleIndicationPanel[] = [
  // ── §B.1 Humeur — ou[BDI ≥ warning · MADRS ≥ 8 · HAD-D ≥ warning] ─────────
  // Le MADRS échappe à la règle des zones, et c'est délibéré (arbitrage du
  // 2026-08-15, confirmé « sans réserves ») : sa grille ne classe ni 7 ni 19 —
  // une zone couleur manquerait en silence un patient à 19. La comparaison
  // `>= 8` couvre la plage sans trou et retient « Dépression légère »,
  // homogène au « cas limite » du BDI et au « douteux » de la HAD.
  {
    id: 'BIO-HUM-01',
    statut: 'publiee',
    panelCode: 'PANEL_HUMEUR_1',
    mode: 'conditionnel',
    declencheurs: [{
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_NEU_01', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
        { type: 'comparaison', idQuestionnaire: 'Q_NEU_02', operateur: '>=', valeur: 8 },
        { type: 'zone', idQuestionnaire: 'Q_NEU_11', sousScore: 'D', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
      ],
    }],
    condition: 'Tableau dépressif ou thymique repéré à l’exploration de l’humeur.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0282-016', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0125-045', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0334-005', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.2 Anxiété — ou[HAD-A ≥ warning · Q_INF_05 ≥ warning] ───────────────
  // `Q_INF_05` publie une bande `dark` (6-11 « critique ») — la seule du
  // périmètre : la citer n'est pas décoratif, l'omettre aurait laissé dehors
  // les patients les plus atteints.
  {
    id: 'BIO-ANX-01',
    statut: 'publiee',
    panelCode: 'PANEL_ANXIETE_1',
    mode: 'conditionnel',
    declencheurs: [{
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_NEU_11', sousScore: 'A', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
        { type: 'zone', idQuestionnaire: 'Q_INF_05', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
      ],
    }],
    condition: 'Tableau anxieux repéré à l’exploration de l’humeur.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0333-020', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.3 Stress — ou[PSS-10 ≥ warning · BMS-10 ≥ warning] ─────────────────
  // PSS-10 : reprise à l'identique de `R-STR-01`/`R-STR-02` de la table
  // d'orientation SIGNÉE — `dark` y est cité alors que l'instrument ne publie
  // pas cette bande, au titre de « ne jamais s'arrêter sous la plus sévère »
  // (inerte, jamais faux). « À l'identique » vaut pour la ZONE, pas pour le
  // comportement (revue D-069) : sous `ou`, le déclenchement par PLANCHER
  // GARANTI sur recueil partiel — que R-STR a choisi cette zone pour obtenir —
  // est perdu ([[D-060]] §2 et §6, fail-closed uniforme assumé). La feuille
  // simple du PSQI (BIO-SOM-01) le conserve : l'asymétrie est interne à cette
  // table, et elle est dite. BMS-10 : la grille publiée porte sur la MOYENNE
  // (1,0-7,0), jamais le total — la zone couleur lit la bande servie et
  // neutralise ce piège ; « warning et au-delà » est l'expression exacte de
  // « moyenne ≥ 3,5, présence du burnout » (`WN-CL-0106-027`).
  {
    id: 'BIO-STR-01',
    statut: 'publiee',
    panelCode: 'PANEL_STRESS_1',
    mode: 'conditionnel',
    declencheurs: [{
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
        { type: 'zone', idQuestionnaire: 'Q_STR_05', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
      ],
    }],
    condition: 'Charge de stress ou tableau de surmenage repéré.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0282-015', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0042-008', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0107-032', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0107-012', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0106-027', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.4 Sommeil — PSQI, reprise de `R-SOM-01` (info/warning/danger/dark) ─
  {
    id: 'BIO-SOM-01',
    statut: 'publiee',
    panelCode: 'PANEL_SOMMEIL_1',
    mode: 'conditionnel',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger', 'dark'] } },
    ],
    condition: 'Trouble du sommeil repéré à l’exploration du sommeil.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0282-017', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-011', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.5 Mémoire — ou[MMSE ≥ info · 5 mots danger · MMT ≥ info] ───────────
  // Départ fixé PAR STADE, pas par couleur (v5) : le MCI tombe en `info` sur
  // le MMSE et le QDRS mais en `warning` sur l'AQ. Les deux échelles INVERSÉES
  // (MMSE, 5 mots) sont portées par les zones couleur — une comparaison aurait
  // dû inverser son opérateur.
  {
    id: 'BIO-MEM-01',
    statut: 'publiee',
    panelCode: 'PANEL_MEMOIRE_1',
    mode: 'conditionnel',
    declencheurs: [{
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_GEO_04', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger'] } },
        { type: 'zone', idQuestionnaire: 'Q_GEO_06', zone: { type: 'couleur', couleurs: ['danger'] } },
        { type: 'zone', idQuestionnaire: 'Q_NEU_06', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger'] } },
      ],
    }],
    condition: 'Plainte mnésique ou cognitive repérée.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0282-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0388-008', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.6 Digestif — ou[TFD ≥ warning (reprise R-GAS-01) · IBS-SSS ≥ warning]
  // Les deux jambes partent à `warning`, délibérément : deux déclencheurs d'un
  // même panel à des sévérités différentes feraient dépendre le déclenchement
  // de l'instrument passé plutôt que de l'état du patient (v5).
  //
  // LIMITE NOMMÉE (revue D-069, mesurée sur le moteur réel) : le score de
  // Francis compte les items écartés par ses questions FILTRES comme
  // manquants — un patient répondant « non » à une question filtre rend
  // `missing > 0`, et la branche IBS-SSS, fail-closed sous `ou`
  // ([[D-060]] §2), ne s'allume alors jamais pour lui. Le panel reste servi
  // par sa jambe TFD. Cesser de compter les items filtrés comme manquants est
  // un lot de scoring sur un instrument certifié — décision distincte.
  {
    id: 'BIO-DIG-01',
    statut: 'publiee',
    panelCode: 'PANEL_DIGESTIF_1',
    mode: 'conditionnel',
    declencheurs: [{
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
        { type: 'zone', idQuestionnaire: 'Q_GAS_02', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
      ],
    }],
    condition: 'Troubles fonctionnels intestinaux repérés.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0348-013', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.7 Fatigue — Pichot zone `warning` (23-32) ──────────────────────────
  // `warning` est la bande LA PLUS SÉVÈRE que le Pichot publie (grille à deux
  // bandes) : la règle ne s'arrête pas « sous la plus sévère ». RÉSERVE
  // CONSIGNÉE (v5) : le corpus fonde le CONTENU du panel (`0361-009`), aucun
  // claim ne fonde ce seuil comme ouverture — `0361-008` dit « en fonction du
  // contexte clinique évocateur ». Le mode conditionnel borne la portée : le
  // panel s'affiche toujours, condition remplie ou non. MFI-20 retiré (§F.2).
  {
    id: 'BIO-FAT-01',
    statut: 'publiee',
    panelCode: 'PANEL_FATIGUE_1',
    mode: 'conditionnel',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_SOM_06', zone: { type: 'couleur', couleurs: ['warning'] } },
    ],
    condition: 'Plainte de fatigue au premier plan.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0361-009', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.8 Neurodégénératif — ou[AQ ≥ warning · QDRS ≥ info] ────────────────
  // Départ par stade (MCI) : `warning` sur l'AQ (qui ne publie pas d'`info`),
  // `info` sur le QDRS. Garde `WN-CL-0387-013` : le bilan complet ne se fait
  // pas systématiquement — ce panel est `approfondissement`, sans répétition.
  {
    id: 'BIO-NEU-01',
    statut: 'publiee',
    panelCode: 'PANEL_NEURODEG_1',
    mode: 'conditionnel',
    declencheurs: [{
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_GEO_03', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
        { type: 'zone', idQuestionnaire: 'Q_GEO_05', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger'] } },
      ],
    }],
    condition: 'Tableau neurodégénératif ou de neurosénescence documenté.',
    motif: null,
    justificationClaims: [
      { claimId: 'WN-CL-0167-022', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0167-023', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.9 Métabolique — Q_CAR_01 ≥ info (départ précoce assumé, v5) ────────
  {
    id: 'BIO-MET-01',
    statut: 'publiee',
    panelCode: 'PANEL_METABOLIQUE_1',
    mode: 'conditionnel',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_CAR_01', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger'] } },
    ],
    condition: 'Tableau d’insulinorésistance ou syndrome métabolique suspecté.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0178-053', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0178-054', versionClaim: 'v1.0' },
    ],
  },
  // ── §B.9 Métabolique optionnel — `WN-CL-0178-055`, seul claim du corpus à
  // qualifier un bilan d'« optionnel » : c'est lui, et lui seul, qui fonde ce
  // mode. Pas de déclencheur, pas de répétition.
  {
    id: 'BIO-MET-02',
    statut: 'publiee',
    panelCode: 'PANEL_METABOLIQUE_OPT',
    mode: 'optionnel',
    declencheurs: [],
    condition: null,
    motif: null,
    justificationClaims: [{ claimId: 'WN-CL-0178-055', versionClaim: 'v1.0' }],
  },
  // ── §B.10 SJSR — IRLS ≥ warning (« modéré », protocole de la bande :
  // « Bilan biologique complet (ferritine++) ») ; `danger` couvre les deux
  // bandes sévère/très sévère. La bande `info` (léger) reste hors
  // déclenchement, tranché v5.
  {
    id: 'BIO-SJS-01',
    statut: 'publiee',
    panelCode: 'PANEL_SJSR',
    mode: 'conditionnel',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_SOM_04', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
    ],
    condition: 'Syndrome des jambes sans repos repéré.',
    motif: null,
    repetition: { delaiJours: 365 },
    // Les deux claims qui fondent le 365 (« une fois par an ») entrent dans le
    // périmètre signé — le seul chiffre paramétrique de la table ne vit pas en
    // prose (revue D-069, finding majeur ; DC-19, DC-34).
    justificationClaims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0320-003', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0318-020', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0112-012', versionClaim: 'v1.0' },
    ],
  },
  // ── §C Populations — `declencheurs: []` (F.3 : ni le sexe ni l'âge ne sont
  // des drapeaux d'anamnèse). Le panel s'affiche conditionnel non rempli, avec
  // sa condition — l'appréciation est praticien. Pas de répétition (F.1 vise
  // les panels de tableau clinique).
  {
    id: 'BIO-POP-01',
    statut: 'publiee',
    panelCode: 'PANEL_POP_FEMME',
    mode: 'conditionnel',
    declencheurs: [],
    condition: 'Femme en population à risque de déficit martial.',
    motif: null,
    justificationClaims: [{ claimId: 'WN-CL-0282-013', versionClaim: 'v1.0' }],
  },
  {
    id: 'BIO-POP-02',
    statut: 'publiee',
    panelCode: 'PANEL_POP_AGEE',
    mode: 'conditionnel',
    declencheurs: [],
    condition: 'Personne âgée.',
    motif: null,
    justificationClaims: [{ claimId: 'WN-CL-0282-014', versionClaim: 'v1.0' }],
  },
  // ── §D Non indiqués — motifs VERBATIM des claims, jamais reformulés ───────
  {
    id: 'BIO-NIA-01',
    statut: 'publiee',
    panelCode: 'PANEL_MG_PLASMATIQUE',
    mode: 'non_indique_actuellement',
    declencheurs: [],
    condition: null,
    motif:
      'Le dosage plasmatique du magnésium circulant n’est pas recommandé en '
      + 'première intention : seulement 1 % du pool magnésien se trouve sous cette forme. '
      + 'L’exploration pertinente est le magnésium érythrocytaire.',
    justificationClaims: [{ claimId: 'WN-CL-0242-007', versionClaim: 'v1.0' }],
  },
  {
    id: 'BIO-NIA-02',
    statut: 'publiee',
    panelCode: 'PANEL_CORTISOL_ISOLE',
    mode: 'non_indique_actuellement',
    declencheurs: [],
    condition: null,
    motif:
      'Une mesure matinale unique de cortisol est peu fiable en raison des variations '
      + 'inter-individuelles et des rythmes biologiques ; l’exploration pertinente est '
      + 'le cortisol awakening response, qui repose sur deux mesures matinales.',
    justificationClaims: [{ claimId: 'WN-CL-0042-007', versionClaim: 'v1.0' }],
  },
];

export type IndicationsBiologieMetadata = {
  version: string;
  /**
   * Passe à `true` uniquement quand le praticien a signé la table relue.
   * Second verrou du double verrou fail-closed des routes biologie — le
   * premier est `WN_CB_ENABLED`.
   */
  validationExterne: boolean;
  dateValidation: string | null;
  /** Claims distincts cités par la table — le périmètre couvert par la signature. */
  claimsSource: OrientationClaimRef[];
  /**
   * SHA du périmètre effectivement relu au moment de la signature ([[D-063]]).
   *
   * C'est ce terme qui rend la PÉREMPTION DÉTECTABLE : dès qu'une règle est
   * ajoutée ou retouchée, `INDICATIONS_BIOLOGIE_SHA256` change et ne concorde
   * plus — le verrou se ferme SEUL, au lieu de laisser la nouvelle règle entrer
   * sous une signature acquise. `null` tant que rien n'a été relu.
   */
  shaPerimetre: string | null;
};

export const INDICATIONS_BIOLOGIE_METADATA: IndicationsBiologieMetadata = {
  version: 'indications-biologie-v1',
  // SIGNÉE le 2026-08-15 (arbitrage praticien explicite, [[D-061]]).
  //
  // SIGNÉE VIDE, ET C'EST UN PASSAGE EN FORCE NOMMÉ. La table ne portait
  // aucune règle : la signature n'attestait donc aucune relecture de contenu —
  // et AU MOMENT DE LA SIGNATURE, `deriverStatutsBiologie` ne testait que ce
  // booléen, si bien que toute règle ajoutée serait entrée sous une signature
  // acquise. Cette dette de [[D-061]] est CLOSE depuis : [[D-063]] a porté le
  // verrou à cinq termes, et la revue du 2026-08-16 (finding M4) a relié le
  // SHA attendu aux règles réellement évaluées — une règle ajoutée change le
  // sha dérivé et FERME le verrou seule. Le paragraphe suivant dit l'état
  // courant ; celui-ci n'est que l'histoire du passage en force.
  //
  // Le drapeau `WN_CB_ENABLED` reste le second terme du ET : signer n'allume
  // pas.
  //
  // SIGNATURE INCOMPLÈTE, ET LE VERROU LE DIT DÉSORMAIS ([[D-063]]).
  // [[D-061]] a posé `validationExterne: true` sur instruction praticien, mais
  // sans date, sans claims et sans périmètre : au standard des quatre autres
  // tables, ce n'est pas une signature. Elle passait parce que le verrou ne
  // regardait que le booléen. Il regarde maintenant les cinq termes, donc il
  // est FERMÉ — état juste, et sans effet observable tant que la table est
  // vide, le moteur refusant déjà faute de règle publiée.
  //
  // SIGNÉE RÉELLEMENT le 2026-08-17 ([[D-069]], arbitrage praticien explicite
  // en session — « toutes les signatures praticien, sans réserves », porté sur
  // la table PEUPLÉE) : date ISO canonique, les 29 claims distincts du
  // périmètre relu, et `shaPerimetre` en littéral figé — la chaîne hex que
  // `INDICATIONS_BIOLOGIE_SHA256` valait au moment de la relecture, recopiée
  // telle quelle. Toute règle retouchée après cette signature rouvrira le
  // verrou seule. Signer n'allume toujours pas par soi-même — mais le drapeau
  // `WN_CB_ENABLED` était DÉJÀ posé à `true` en production quand cette
  // signature a été écrite ([[D-070]], constat du 2026-08-17) : les deux
  // termes du ET sont vrais. La table n'atteint pour autant aucun écran,
  // `deriverStatutsBiologie` n'ayant aucun appelant hors bancs.
  //
  // SURTOUT PAS `shaPerimetre: INDICATIONS_BIOLOGIE_SHA256` — l'instruction
  // d'origine le prescrivait, et c'était un piège à double fond (revue du
  // 2026-08-16, correction documentée en changelog) : (1) la constante est
  // déclarée APRÈS cet objet, la référence lèverait un `ReferenceError` à
  // l'import — crash, pas fail-closed ; (2) réordonner pour compiler rendrait
  // la comparaison TAUTOLOGIQUE — le SHA est recalculé à chaque chargement
  // depuis la table vivante, la concordance serait toujours vraie et la
  // péremption ne serait plus jamais détectée, c'est-à-dire l'exact contraire
  // de ce que [[D-063]] a construit. Un banc garde ce fichier contre cette
  // écriture (`indicationsBiologieV1.guard.test.ts`).
  validationExterne: true,
  dateValidation: '2026-08-17T00:00:00.000Z',
  // Les 29 claims distincts cités par les quinze règles — dont les deux qui
  // fondent la répétition annuelle (`0312-018`, `0389-004`) : le seul chiffre
  // paramétrique de la table est DANS le périmètre signé (revue D-069). Le
  // banc d'égalité exacte (deux sens) refuse toute divergence avec les
  // `justificationClaims` réellement portés.
  claimsSource: [
    { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0389-004', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0042-007', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0042-008', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0106-027', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0107-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0107-032', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0112-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0125-045', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0167-022', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0167-023', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0178-053', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0178-054', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0178-055', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0242-007', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0282-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0282-014', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0282-015', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0282-016', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0282-017', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0282-018', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0318-020', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0320-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0323-011', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0333-020', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0334-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0348-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0361-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0388-008', versionClaim: 'v1.0' },
  ],
  shaPerimetre: 'a2f28c0be27051c1c93833197659f9dba19afda2a96305e8b61157ebb38acb8f',
};

export const INDICATIONS_BIOLOGIE_SHA256 = sha256(JSON.stringify(INDICATIONS_BIOLOGIE_V1));

/**
 * La table des indications est-elle RÉELLEMENT signée ? ([[D-063]])
 *
 * Patron `tablePrioritesSignee()`, enfin repris ici — un `validationExterne`
 * seul était un booléen qu'un flip isolé suffisait à ouvrir, et c'était le plus
 * faible des cinq verrous du dépôt. S'y ajoute un terme que les autres n'ont
 * pas encore : la concordance du SHA de périmètre, qui referme le verrou dès
 * que le contenu bouge sans re-signature.
 *
 * La date doit être ISO CANONIQUE — même motif qu'en priorités : une date mal
 * formée doit FERMER le verrou, jamais le laisser ouvert puis jeter en aval.
 */
export function signatureIndicationsValide(
  signature: Pick<
    IndicationsBiologieMetadata,
    'validationExterne' | 'dateValidation' | 'claimsSource' | 'shaPerimetre'
  >,
  shaAttendu: string = INDICATIONS_BIOLOGIE_SHA256,
): boolean {
  const date = signature.dateValidation;
  return signature.validationExterne
    && date !== null
    && !Number.isNaN(new Date(date).getTime())
    && new Date(date).toISOString() === date
    && signature.claimsSource.length > 0
    && signature.shaPerimetre === shaAttendu;
}
