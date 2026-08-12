import { ANAMNESE_CHAMP_REQUIS } from '../consultation/anamnese';
import { scoresRecalculesPourRaisonnement } from '../clinical/orientationService';
import { statutExcluDuRaisonnement } from '../scoring/validite';

/**
 * Préconditions de confirmation d'un épisode T0 ([[D-052]]).
 *
 * Ce module NE LIT NI LA BASE, NI LA SESSION, NI LE RÉSEAU : ses entrées lui
 * sont fournies par `preconditionsT0Prisma.ts`, qui les lit en base — jamais
 * depuis le corps d'une requête. La distinction n'est pas décorative :
 * l'épisode qui atteint les points de persistance transite par le navigateur,
 * et un contrôle qui lirait ce qu'il doit vérifier serait un contrôle client
 * déguisé.
 *
 * Il n'est pas SANS DÉPENDANCE Prisma pour autant, et le dire faux serait
 * trompeur : `scoresRecalculesPourRaisonnement` vient d'`orientationService`,
 * qui importe `@/lib/prisma`, dont le module instancie le client au
 * chargement. Un banc de ce module doit donc mocker `@/lib/prisma`. Réutiliser
 * cette fonction reste le bon choix — elle porte cinq fermetures cliniques
 * qu'on ne veut pas recopier.
 *
 * POURQUOI CE MODULE N'EST PAS DANS `assessmentEpisode.ts` : les fonctions de
 * ce fichier-là sont des fonctions de FENÊTRE, sans dossier ni session. Une
 * précondition a besoin du dossier entier ; l'y mettre la placerait là où il
 * n'y a rien à lire.
 */

/**
 * Le rideau T0 — table clinique signée par [[D-052]], et non composition du
 * pack de base.
 *
 * PAS DÉRIVÉ DU PACK, délibérément : le pack est une ligne en base éditable
 * depuis l'UI, et une divergence registre↔pack a déjà été journalisée le
 * 2026-08-03. Dériver le rideau du pack ferait déplacer une règle clinique par
 * un geste administratif (`DC-26`).
 *
 * `Q_SOM_09` EST AU PACK DE BASE SEEDÉ ET N'EST PAS ICI : un agenda du sommeil
 * sur 21 nuits ne peut pas conditionner un point de décision qui se prend à J0.
 * L'écran doit l'expliquer, sans quoi l'exclusion se lit comme un oubli.
 *
 * `Q_ALI_01` est accepté DANS L'UNE OU L'AUTRE DE SES FORMES (14 ou 57 items
 * selon `WN_ALI_01_SIIN57`). Exiger la forme longue rendrait le T0
 * inconfirmable partout où le drapeau est éteint — soit partout aujourd'hui.
 * Le repère de synthèse, lui, continue de s'abstenir sur cet identifiant
 * ([[D-051]]) : constater une passation et désigner celle qui fait foi ne
 * demandent pas la même certitude.
 */
export const RIDEAU_T0 = ['Q_MOD_03', 'Q_MOD_01', 'Q_INF_03', 'Q_ALI_01'] as const;

/** Instrument du pack de base volontairement hors rideau — motivé ci-dessus. */
export const HORS_RIDEAU_MOTIVE = ['Q_SOM_09'] as const;

/**
 * Les deux statuts qui valent validation praticien. Exporté parce que le
 * chargeur doit filtrer la lecture avec EXACTEMENT le même ensemble : filtrer
 * sur un ensemble et juger sur un autre laisserait passer une synthèse que la
 * condition croit validée, ou l'inverse.
 */
export const STATUTS_SYNTHESE_VALIDEE = ['Validee_Praticien', 'Corrigee_Praticien'] as const;

const STATUTS_SYNTHESE_VALIDEE_SET: ReadonlySet<string> = new Set(STATUTS_SYNTHESE_VALIDEE);

export type PassationPourPreconditions = {
  idQuestionnaire: string;
  dateReponse: Date;
  scoresJson: unknown;
  statutValidite?: string | null;
};

export type SynthesePourPreconditions = {
  statut: string;
  dateValidation: Date | null;
};

export type EntreesPreconditionsT0 = {
  passations: readonly PassationPourPreconditions[];
  /** Anamnèse de la consultation validée la plus récente ; `null` si aucune. */
  anamnese: unknown;
  /** Une consultation `validee` existe-t-elle ? Distinct d'une anamnèse vide. */
  consultationValidee: boolean;
  /** Synthèse la plus récente du patient ; `null` si aucune. */
  synthese: SynthesePourPreconditions | null;
  /** Nombre de contradictions ouvertes (LOT-01). Toujours 0 table non signée. */
  contradictionsOuvertes: number;
};

export type ConditionPrecondition = {
  id: string;
  libelle: string;
  satisfaite: boolean;
  /** Ce qui manque, en français, destiné à l'écran comme au message d'API. */
  detail: string | null;
};

export type PreconditionsT0 = {
  dures: ConditionPrecondition[];
  souples: ConditionPrecondition[];
  /** Au moins une condition dure non satisfaite : la confirmation est refusée. */
  bloquant: boolean;
  /** Identifiants des conditions souples exigeant un motif de contournement. */
  contournementsRequis: string[];
};

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/**
 * Dernière passation de chaque instrument, par date de réponse.
 *
 * `dateReponse` et non `createdAt` : `createdAt` est un horodatage d'INSERTION,
 * qui diverge sur toute reprise ou import. La date clinique est celle du
 * recueil — c'est déjà elle qui ordonne la lecture du cockpit et qui devient
 * `observedAt` dans l'épisode.
 */
function dernieresParInstrument(
  passations: readonly PassationPourPreconditions[],
): Map<string, PassationPourPreconditions> {
  const parInstrument = new Map<string, PassationPourPreconditions>();
  for (const passation of passations) {
    const courante = parInstrument.get(passation.idQuestionnaire);
    if (!courante || passation.dateReponse.getTime() > courante.dateReponse.getTime()) {
      parInstrument.set(passation.idQuestionnaire, passation);
    }
  }
  return parInstrument;
}

/**
 * La passation compte-t-elle pour le rideau ?
 *
 * TROIS TERMES ([[D-052]]). L'existence est nécessaire. Le statut non exclu
 * passe par `statutExcluDuRaisonnement`, la porte INDÉPENDANTE DU DRAPEAU,
 * prévue pour désigner et non pour filtrer — c'est son emploi légitime : une
 * précondition désigne. Le troisième terme exige que le recalcul rende une
 * MESURE, et pas seulement un objet.
 *
 * `scores !== null` NE SUFFIT PAS, et c'est le défaut que la revue du
 * 2026-08-12 a trouvé dans la première rédaction de ce fichier : depuis le
 * 2026-07-29, `calculateScore` porte une garde générale de passation vide qui
 * rend, sur une passation sans aucune réponse lisible,
 * `{ scored: false, total: null, interpretation: null, raisonNonScore }` — un
 * objet, donc non-`null`. Quatre passations SANS UNE SEULE RÉPONSE
 * satisfaisaient ainsi « rideau complet », et le T0 est irrévocable. Le cas
 * n'est pas d'école : une passation `Q_ALI_01` de la forme courte (`AL*`)
 * relue sous la définition SIIN (`SIIN*`) tombe exactement là ([[D-051]]).
 *
 * On lit donc `scored`/`total`, les deux drapeaux que cette garde pose et que
 * `equilibre/evidence.ts` lit déjà.
 *
 * On NE relit PAS `statutValidite === 'VALID'` : la migration du LOT-00 a
 * estampillé `VALID` toutes les lignes existantes par défaut de colonne, et la
 * route d'invalidation rend 503 drapeau éteint. Exiger `VALID` serait
 * tautologique — un défaut de colonne présenté comme un jugement clinique,
 * ce que `DC-24` interdit.
 */
function passationExploitable(passation: PassationPourPreconditions): boolean {
  if (statutExcluDuRaisonnement(passation.statutValidite)) return false;
  const scores = scoresRecalculesPourRaisonnement(
    passation.idQuestionnaire,
    estObjet(passation.scoresJson) ? passation.scoresJson : null,
    passation.dateReponse,
    passation.statutValidite,
  );
  if (scores === null) return false;
  // Une passation que le moteur refuse de coter n'est pas une mesure. Les deux
  // tests sont gardés séparément : `scored: false` est la garde générale,
  // `total: null` couvre un moteur qui ne poserait pas le drapeau.
  if (scores.scored === false) return false;
  if (scores.total === null || scores.total === undefined) return false;
  return true;
}

/**
 * PAS DE REPLI SUR UNE PASSATION ANTÉRIEURE, et c'est le comportement déjà
 * tenu par l'orientation : si la dernière passation d'un instrument n'est pas
 * exploitable, l'instrument manque. Se rabattre sur une passation plus
 * ancienne ferait porter le T0 par une mesure que le dossier a remplacée.
 */
function evaluerRideau(passations: readonly PassationPourPreconditions[]): ConditionPrecondition {
  const dernieres = dernieresParInstrument(passations);
  const absents: string[] = [];
  const inexploitables: string[] = [];

  for (const idQuestionnaire of RIDEAU_T0) {
    const passation = dernieres.get(idQuestionnaire);
    if (!passation) {
      absents.push(idQuestionnaire);
      continue;
    }
    if (!passationExploitable(passation)) inexploitables.push(idQuestionnaire);
  }

  const manques: string[] = [];
  if (absents.length > 0) manques.push(`non renseigné${absents.length > 1 ? 's' : ''} : ${absents.join(', ')}`);
  if (inexploitables.length > 0) {
    manques.push(`sans résultat exploitable : ${inexploitables.join(', ')}`);
  }

  return {
    id: 'rideau_t0',
    libelle: 'Premier rideau complet et exploitable',
    satisfaite: manques.length === 0,
    detail: manques.length === 0 ? null : `Premier rideau incomplet — ${manques.join(' ; ')}.`,
  };
}

/**
 * Le prédicat porte sur le CONTENU, pas sur la nullité : `normaliserAnamnese`
 * ne conserve que les champs connus non vides et peut donc rendre `{}`, qui est
 * un objet non nul. Une anamnèse vide compterait pour consignée.
 *
 * Deux messages distincts, et non un seul : « aucune consultation validée » et
 * « consultation validée sans motif » n'appellent pas le même geste.
 */
function evaluerAnamnese(entrees: EntreesPreconditionsT0): ConditionPrecondition {
  const base = { id: 'anamnese_consignee', libelle: 'Anamnèse consignée' };
  if (!entrees.consultationValidee) {
    return { ...base, satisfaite: false, detail: 'Aucune consultation validée pour ce patient.' };
  }
  const anamnese = entrees.anamnese;
  const motif = estObjet(anamnese) ? anamnese[ANAMNESE_CHAMP_REQUIS] : null;
  if (typeof motif !== 'string' || motif.trim() === '') {
    return {
      ...base,
      satisfaite: false,
      detail: 'La consultation validée ne porte pas de motif principal.',
    };
  }
  return { ...base, satisfaite: true, detail: null };
}

/**
 * Fraîcheur de la synthèse : postérieure à la dernière passation DU RIDEAU, et
 * non du dossier ([[D-052]]) — une passation hors rideau, plus récente, ne
 * périme pas une synthèse qui n'avait pas à en tenir compte.
 *
 * `dateValidation` fait foi, jamais la date d'annotation : `Corrigee_Praticien`
 * ne rafraîchit pas `dateValidation` (comportement existant, non modifié ici).
 * Une annotation commente une synthèse, elle ne la re-valide pas.
 *
 * `dateValidation` reste `DateTime?` en base : la tester est nécessaire, un
 * `null` hérité passerait sinon pour une date.
 */
function evaluerSynthese(entrees: EntreesPreconditionsT0): ConditionPrecondition {
  const base = { id: 'synthese_validee', libelle: 'Synthèse validée et postérieure au rideau' };
  const synthese = entrees.synthese;
  if (!synthese || !STATUTS_SYNTHESE_VALIDEE_SET.has(synthese.statut)) {
    return { ...base, satisfaite: false, detail: 'Aucune synthèse validée par le praticien.' };
  }
  if (!synthese.dateValidation) {
    return { ...base, satisfaite: false, detail: 'La synthèse ne porte pas de date de validation.' };
  }

  const dernieres = dernieresParInstrument(entrees.passations);
  const datesRideau = RIDEAU_T0
    .map(idQuestionnaire => dernieres.get(idQuestionnaire)?.dateReponse)
    .filter((date): date is Date => date instanceof Date);
  const derniereDuRideau = datesRideau.reduce<Date | null>(
    (max, date) => (max === null || date.getTime() > max.getTime() ? date : max),
    null,
  );

  if (derniereDuRideau && synthese.dateValidation.getTime() < derniereDuRideau.getTime()) {
    return {
      ...base,
      satisfaite: false,
      detail: 'La synthèse validée est antérieure à la dernière passation du premier rideau.',
    };
  }
  return { ...base, satisfaite: true, detail: null };
}

/**
 * MUETTE AUJOURD'HUI, et c'est nommé plutôt que masqué ([[D-052]]) : aucune
 * passation ne peut porter `AMBIGUOUS` tant que `WN_ENABLE_VALIDITE_PASSATIONS`
 * est éteint — la route d'invalidation rend 503. La condition est câblée pour
 * que le chemin existe le jour de l'allumage ; prétendre qu'elle protège
 * quelque chose en production serait faux.
 */
function evaluerAmbigues(passations: readonly PassationPourPreconditions[]): ConditionPrecondition {
  const dernieres = dernieresParInstrument(passations);
  const ambigues = RIDEAU_T0.filter(id => dernieres.get(id)?.statutValidite === 'AMBIGUOUS');
  return {
    id: 'passation_ambigue',
    libelle: 'Aucune passation ambiguë au premier rideau',
    satisfaite: ambigues.length === 0,
    detail: ambigues.length === 0
      ? null
      : `Passation${ambigues.length > 1 ? 's' : ''} au statut ambigu : ${ambigues.join(', ')}.`,
  };
}

/**
 * MUETTE AUJOURD'HUI pour la même raison que ci-dessus : le service de
 * contradictions rend une liste vide tant que la table n'est pas signée.
 */
function evaluerContradictions(entrees: EntreesPreconditionsT0): ConditionPrecondition {
  const ouvertes = entrees.contradictionsOuvertes;
  return {
    id: 'contradictions_ouvertes',
    libelle: 'Aucune contradiction ouverte',
    satisfaite: ouvertes === 0,
    detail: ouvertes === 0
      ? null
      : `${ouvertes} contradiction${ouvertes > 1 ? 's' : ''} ouverte${ouvertes > 1 ? 's' : ''} sur ce dossier.`,
  };
}

/**
 * Évalue les préconditions de confirmation d'un épisode T0.
 *
 * Les conditions DURES bloquent ; les SOUPLES se contournent avec un motif
 * obligatoire, tracé dans le payload d'épisode. Aucune condition ne s'invente
 * un verdict sur une donnée absente : une donnée qui manque rend la condition
 * NON SATISFAITE avec son motif, jamais satisfaite par défaut (`DC-24`).
 */
export function evaluerPreconditionsT0(entrees: EntreesPreconditionsT0): PreconditionsT0 {
  const dures = [
    evaluerRideau(entrees.passations),
    evaluerAnamnese(entrees),
    evaluerSynthese(entrees),
  ];
  const souples = [
    evaluerAmbigues(entrees.passations),
    evaluerContradictions(entrees),
  ];

  return {
    dures,
    souples,
    bloquant: dures.some(condition => !condition.satisfaite),
    contournementsRequis: souples.filter(c => !c.satisfaite).map(c => c.id),
  };
}

/** Message d'API : les conditions dures manquantes, en une phrase française. */
export function messageRefusPreconditions(preconditions: PreconditionsT0): string {
  const manquantes = preconditions.dures.filter(c => !c.satisfaite);
  const details = manquantes.map(c => c.detail ?? c.libelle).join(' ');
  return `Confirmation T0 impossible. ${details}`.trim();
}
