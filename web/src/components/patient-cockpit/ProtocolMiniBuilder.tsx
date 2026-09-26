'use client';

import { useMemo, useState } from 'react';
import { isDecisionBloquee } from '@/lib/clinical-engine/decisionGuards';
// Import de VALEUR depuis `types.ts`, qui n'importe lui-même que des types :
// la borne suit le moteur sans traîner `node:crypto` dans le bundle client.
import { MAX_ACTIONS_PROTOCOLE_21J, VERSION_PROTOCOL_DRAFT_V4 } from '@/lib/clinical-engine/types';
import type {
  DecisionCard,
  ProtocolAction,
  ProtocolActionType,
  ProtocolInterventionStatus,
  TherapeuticLoad,
} from '@/lib/clinical-engine/types';
import type { FoodCompassActionRef } from '@/lib/food-compass/types';
// Import de VALEUR depuis `plates.ts`, qui n'importe lui-même qu'un TYPE :
// le catalogue d'assiettes suit sans traîner `node:crypto` au paquet client.
// Le barrel `@/lib/food-compass` le ferait, lui — il ré-exporte `contextual`.
// Précédent mesuré : `PractitionerFoodObservationPanel` importe déjà ce module.
import {
  estAssietteDIndication,
  getCurrentRecommendedPlateRef,
  getRecommendedPlate,
} from '@/lib/food-compass/plates';
import {
  mesurerProtocole,
  suggererDepuisLignes,
  type LigneBaremeCharge,
} from '@/lib/clinical/baremeChargePur';
import {
  LIBELLE_MARQUE_PURPOSE,
  type ProvenancePurpose,
  type SourceCitablePurpose,
} from '@/lib/protocol/provenancePurpose';

// Contenu du brouillon au moment où le praticien le marque comme relu.
// Émis tel quel : la construction du ProtocolDraft (validations et hashes du
// moteur) appartient à l'appelant, côté serveur — le moteur clinique
// (node:crypto) n'est pas embarquable dans le bundle client.
export type RelectureProtocoleSoumission = {
  purpose: string;
  followUpCriterion: string;
  actions: ProtocolAction[];
  therapeuticLoad: TherapeuticLoad;
  /**
   * Contrat de payload DEMANDÉ, jamais déduit ([[D-130]]) : la route refuse de
   * le choisir à la place de qui soumet, et retombe en V1 quand il est absent.
   * Il n'est porté que lorsqu'au moins une action est suspendue — un statut
   * d'intervention n'existe qu'en V4.
   */
  version?: typeof VERSION_PROTOCOL_DRAFT_V4;
  /**
   * Le jeton rendu par un refus `REGISTRE_ANXIOGENE`, renvoyé tel quel pour
   * lever ce refus ([[D-189]] §4). Posé par l'appelant, jamais par le
   * formulaire : le praticien confirme un TEXTE, pas un principe.
   */
  confirmerRegistre?: string;
};

// État de sauvegalde serveur (C2A LOT-03). « Enregistré » n'est jamais affiché
// tant que le serveur n'a pas confirmé (sémantique HC-F : conservé localement ≠
// transmis/enregistré).
export type ProtocolSaveState = 'idle' | 'saving' | 'saved' | 'stale' | 'error';

const ACTION_LABELS: Record<ProtocolActionType, string> = {
  food: 'Alimentation',
  chronobiology: 'Rythme / chronobiologie',
  calming_routine: 'Routine d’apaisement',
  gentle_activity: 'Activité douce',
  hydration: 'Hydratation',
  advice_sheet: 'Fiche conseil',
  biological_exploration: 'Exploration biologique à discuter',
  supplement_exploration: 'Complément à explorer',
  observation: 'Observation / recueil',
  medical_referral: 'Orientation médecin traitant',
};

// Statut d'intervention (contrat V4, `D-056`). Aucun de ces libellés ne se lit
// comme un conseil ferme hors « active » : une intervention suspendue le dit.
const INTERVENTION_STATUS_LABELS: Record<ProtocolInterventionStatus, string> = {
  active: 'En cours',
  conditionnelle_biologie: 'En attente du bilan biologique',
  differee: 'Différée',
  contre_indiquee: 'Contre-indiquée',
  non_indiquee_actuellement: 'Non indiquée actuellement',
};

const LOAD_LABELS: Record<TherapeuticLoad['level'], string> = {
  light: 'Léger', moderate: 'Modéré', loaded: 'Chargé', excessive: 'Excessif',
};

/**
 * UN BROUILLON ADMET L'ABSENCE, LE CONTRAT NON. `ProtocolAction.type` et
 * `TherapeuticLoad['level']` sont obligatoires dans le contrat — c'est
 * précisément pourquoi le brouillon en posait un EN SILENCE (`'food'`,
 * `'light'`). Une action enregistrée sans que le sélecteur ait été touché
 * partait « Alimentation », était hachée, persistée, et servie telle quelle au
 * patient : y compris sur une orientation médicale ou une exploration
 * biologique. L'absence se représente donc ici par `''`, l'écran la rend
 * visible, et `collectSubmission` la refuse — `DC-24` : aucun statut favorable
 * par défaut. Patron de [[D-186]], qui a tranché le même défaut sur la bande de
 * priorité d'un axe.
 */
type BrouillonAction = Omit<ProtocolAction, 'type'> & { type: ProtocolActionType | '' };
type NiveauChargeBrouillon = TherapeuticLoad['level'] | '';

function emptyAction(actionId: string): BrouillonAction {
  return {
    actionId, type: '', title: '', idealPlan: '', minimalPlan: '', rescuePlan: '', limitations: [],
  };
}

export function ProtocolMiniBuilder({
  decisionCard,
  onReviewed,
  onSaveVersion,
  saveState = 'idle',
  saveError = null,
  confirmationRegistre = null,
  onConfirmerRegistre,
  foodCompassSelection = null,
  onClearFoodCompassSelection,
  assietteSelection = null,
  onClearAssietteSelection,
  assiettesIndiquees = null,
  sourcesCitables = [],
  provenancePurpose = null,
  baremeCharge = [],
  chargeVersionActive = null,
}: {
  decisionCard: DecisionCard | null;
  // Optionnel : reçoit le contenu du brouillon quand le praticien le marque
  // comme relu (après les validations locales). Sans cette prop, le
  // composant garde son comportement historique (état purement local).
  onReviewed?: (soumission: RelectureProtocoleSoumission) => void;
  // Optionnel (C2A LOT-03) : enregistre EXPLICITEMENT une version relue sur le
  // serveur. Quand fournie, le bouton « Enregistrer la version » apparaît ;
  // l'état de sauvegarde est piloté par `saveState`.
  onSaveVersion?: (soumission: RelectureProtocoleSoumission) => void;
  saveState?: ProtocolSaveState;
  saveError?: string | null;
  /**
   * Refus de registre en attente, avec son message et son jeton. Le bouton de
   * confirmation part avec la garde : celle du booklet était confirmable
   * « depuis toujours » et aucun écran ne l'envoyait — un bilan validé le
   * 16 août n'est jamais parti.
   */
  confirmationRegistre?: { message: string; jeton: string } | null;
  onConfirmerRegistre?: () => void;
  foodCompassSelection?: { foodLabel: string; actionRef: FoodCompassActionRef } | null;
  onClearFoodCompassSelection?: () => void;
  /**
   * L'assiette retenue sur la carte des indications ([[D-240]]). Même forme que
   * la sélection Boussole, et pour la même raison : la carte est démontée dès
   * que le praticien quitte la sous-vue, le choix doit donc vivre au-dessus.
   */
  assietteSelection?: { plateCode: string; libelle: string } | null;
  onClearAssietteSelection?: () => void;
  /**
   * Les assiettes INDIQUÉES pour ce dossier, telles que la carte les a lues
   * ([[D-249]]) : ce que le menu d'une action « Alimentation » propose. `null`
   * = rien à proposer (verrou fermé, lecture en échec, fixture) : le menu ne
   * paraît pas sur une action SANS assiette. Une action qui en porte déjà une
   * garde son menu, réduit à cette assiette et à « Aucune » — une référence qui
   * partirait à l'enregistrement ne doit jamais être invisible (constat de
   * revue, #1229). Jamais le catalogue entier : une assiette non indiquée n'y
   * entre pas plus qu'elle n'a de bouton sur la carte (`DC-24`).
   */
  assiettesIndiquees?: { plateCode: string; libelle: string }[] | null;
  /**
   * Les deux sources que la raison d'être a le droit de citer ([[D-193]]),
   * relues au serveur. Liste FERMÉE : ni le motif praticien de sélection, ni le
   * `rationale` du moteur n'y entrent — ils s'affichent ailleurs, ils ne se
   * citent pas au patient.
   */
  sourcesCitables?: SourceCitablePurpose[];
  /**
   * Ce que la raison d'être de la VERSION ACTIVE cite, constaté à la lecture par
   * le serveur. `null` = elle ne cite rien, ou plus rien.
   */
  provenancePurpose?: ProvenancePurpose;
  /**
   * Les lignes de barème que le SERVEUR a vouchées ([[D-196]]). Liste vide =
   * barème non signé : aucune suggestion ne s'affiche. Cet écran ne revérifie
   * pas la signature — il n'en a pas les moyens, et une seconde vérification
   * finirait par diverger de celle du serveur.
   */
  baremeCharge?: LigneBaremeCharge[];
  /**
   * La charge portée par la VERSION ACTIVE, ou `null`.
   *
   * Elle était écrite, obligatoire, hachée — et relue par AUCUN écran en usage
   * normal : le seul qui l'affichait recevait `null` et sortait par un retour
   * anticipé. Le praticien déclarait une charge qu'il ne revoyait jamais.
   */
  chargeVersionActive?: TherapeuticLoad | null;
}) {
  const [purpose, setPurpose] = useState('');
  const [followUpCriterion, setFollowUpCriterion] = useState('');
  const [actions, setActions] = useState<BrouillonAction[]>([]);
  const [loadLevel, setLoadLevel] = useState<NiveauChargeBrouillon>('');
  const [loadJustification, setLoadJustification] = useState('');

  /**
   * LA SUGGESTION SE RECALCULE PENDANT LA COMPOSITION, sur le BROUILLON — pas
   * sur la version enregistrée. C'est le sens même d'une aide à la saisie : elle
   * doit bouger quand une action s'ajoute ou se suspend.
   *
   * Les actions sans type ne sont pas mesurables : `mesurerProtocole` lit le
   * type pour compter les registres distincts, et un type vide en fabriquerait
   * un. Elles sont donc écartées du comptage — le refus de `collectSubmission`
   * les nommera de toute façon à l'enregistrement.
   */
  const suggestionCharge = useMemo(() => {
    if (baremeCharge.length === 0) return null;
    const mesurables = actions.filter((item): item is ProtocolAction => item.type !== '');
    if (mesurables.length === 0) return null;
    return suggererDepuisLignes(mesurerProtocole(mesurables), baremeCharge);
  }, [actions, baremeCharge]);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /**
   * LE REFUS NE S'EFFACE PAS À LA PREMIÈRE FRAPPE. Il vivait dans `message`,
   * que `markDirty` vide — le praticien voyait donc le motif de son refus
   * disparaître au premier caractère tapé, avant toute correction, et sans
   * qu'aucun champ ne soit marqué. Deux états distincts : `message` porte
   * l'information et se vide à la frappe, `erreur` porte le refus et ne se lève
   * qu'à la soumission suivante.
   */
  const [erreur, setErreur] = useState<string | null>(null);
  const [nextActionId, setNextActionId] = useState(1);
  const [editedSinceSave, setEditedSinceSave] = useState(false);

  const decisionBlocked = isDecisionBloquee(decisionCard);
  if (!decisionCard?.selectedMainPriority || decisionBlocked) {
    return (
      <section aria-labelledby="protocol-builder-title">
        <h3 id="protocol-builder-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Protocole 21 jours
        </h3>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-base font-semibold text-foreground">
            {decisionBlocked
              ? 'Protocole indisponible — bloqueurs décisionnels à revoir'
              : 'Protocole indisponible — priorité praticien non sélectionnée'}
          </p>
          <p className="mt-1 text-base text-muted-foreground">Le protocole restera local et inactif jusqu’à cette sélection.</p>
        </div>
      </section>
    );
  }

  const markDirty = () => {
    if (reviewed) setReviewed(false);
    setEditedSinceSave(true);
    setMessage(null);
  };

  const addAction = () => {
    if (actions.length >= MAX_ACTIONS_PROTOCOLE_21J) return;
    markDirty();
    setActions(previous => [...previous, emptyAction(`action-${nextActionId}`)]);
    setNextActionId(value => value + 1);
  };

  const insertFoodCompassAction = () => {
    if (!foodCompassSelection || actions.length >= MAX_ACTIONS_PROTOCOLE_21J) return;
    markDirty();
    setActions(previous => [...previous, {
      ...emptyAction(`action-${nextActionId}`),
      title: foodCompassSelection.foodLabel,
      foodCompassRef: foodCompassSelection.actionRef,
    }]);
    setNextActionId(value => value + 1);
    setMessage('Référence Boussole ajoutée au brouillon — complétez les trois plans puis enregistrez manuellement.');
    onClearFoodCompassSelection?.();
  };

  // L'ASSIETTE DEVIENT UNE ACTION — et l'écran REJOUE la garde du domaine.
  //
  // `estAssietteDIndication` est la même fonction que celle qu'appelle
  // `assertRefAssietteDIndication` au serveur. La rejouer ici n'est pas une
  // seconde vérité : c'est le seul moyen de DIRE le refus en français au lieu
  // de le laisser remonter en exception d'enregistrement. Le serveur, lui,
  // re-dérive la référence et ne croit rien de ce que cet écran envoie.
  //
  // CE CAS NE DEVRAIT PAS SURVENIR, et c'est pourquoi il est dit plutôt que tu :
  // le service ne compose sa liste qu'à partir d'`assiettesParIndication()`. Un
  // refus ici signifierait que la carte a servi une assiette d'un autre axe —
  // un défaut de la chaîne, pas une erreur du praticien.
  const insertAssietteAction = () => {
    if (!assietteSelection || actions.length >= MAX_ACTIONS_PROTOCOLE_21J) return;
    if (!estAssietteDIndication(assietteSelection.plateCode)) {
      setMessage('Cette assiette n’est pas une assiette d’indication : elle ne peut pas porter une action.');
      return;
    }
    markDirty();
    setActions(previous => [...previous, {
      ...emptyAction(`action-${nextActionId}`),
      type: 'food',
      title: assietteSelection.libelle,
      recommendedPlateRef: getCurrentRecommendedPlateRef(assietteSelection.plateCode),
    }]);
    setNextActionId(value => value + 1);
    setMessage('Assiette ajoutée au brouillon — complétez les trois plans puis enregistrez manuellement.');
    onClearAssietteSelection?.();
  };

  // CHANGER LE TYPE D'UNE ACTION QUI PORTE UNE ASSIETTE — le second mur de la
  // même famille que la demande de contrat, et il se ferme ici plutôt qu'à
  // l'enregistrement.
  //
  // Laisser la référence sur une action devenue `chronobiology` la ferait
  // refuser au serveur (« exige une action alimentaire ») : un refus technique,
  // deux clics après le geste que l'écran venait de proposer. La retirer en
  // SILENCE serait pire — le praticien perdrait le lien à la table signée sans
  // l'apprendre. Elle est donc retirée ET dite.
  const updateAction = (actionId: string, patch: Partial<BrouillonAction>) => {
    markDirty();
    setActions(previous => previous.map((action, index) => {
      if (action.actionId !== actionId) return action;
      const fusionnee = { ...action, ...patch };
      if (fusionnee.recommendedPlateRef !== undefined && fusionnee.type !== 'food') {
        setMessage(`L’assiette a été retirée de l’action ${index + 1} : une référence d’assiette `
          + 'n’existe que sur une action alimentaire.');
        const { recommendedPlateRef: _retiree, ...sansAssiette } = fusionnee;
        return sansAssiette;
      }
      return fusionnee;
    }));
  };

  // L'ASSIETTE SE CHOISIT AUSSI DANS L'ACTION ALIMENTAIRE ([[D-249]]) — second
  // chemin vers la MÊME référence qu'« Insérer manuellement », et sous la même
  // garde. Le menu ne propose que la liste de la carte ; un code hors de cette
  // liste (DOM retouché) est refusé ici comme il le serait au serveur, qui
  // re-dérive la référence et ne croit rien de ce que l'écran envoie.
  //
  // L'INTITULÉ SUIT L'ASSIETTE TANT QU'IL EST VIDE OU ENCORE ÉGAL AU LIBELLÉ DE
  // L'ASSIETTE PRÉCÉDENTE. Un intitulé qui en diffère n'est jamais écrasé par un
  // changement de menu. L'intention se lit dans le TEXTE, pas dans un marqueur :
  // un marqueur de provenance porté par l'action partirait dans le payload
  // soumis — les actions y sont recopiées telles quelles, puis hachées. Un
  // intitulé tapé à la main IDENTIQUE au libellé suit donc l'assiette : il ne
  // s'en distingue pas (constat de revue, #1229).
  const choisirAssiette = (actionId: string, plateCode: string) => {
    const choix = plateCode === ''
      ? null
      : (assiettesIndiquees ?? []).find(assiette => assiette.plateCode === plateCode) ?? null;
    if (plateCode !== '' && (choix === null || !estAssietteDIndication(plateCode))) {
      setMessage('Cette assiette n’est pas une assiette d’indication pour ce dossier : elle ne peut pas porter une action.');
      return;
    }
    markDirty();
    setActions(previous => previous.map(action => {
      if (action.actionId !== actionId) return action;
      const { recommendedPlateRef: precedente, ...sansAssiette } = action;
      const libellePrecedent = precedente ? libelleAssiette(precedente.plateCode) : null;
      const intituleSuit = action.title.trim() === '' || action.title === libellePrecedent;
      if (choix === null) return { ...sansAssiette, title: intituleSuit ? '' : action.title };
      return {
        ...sansAssiette,
        title: intituleSuit ? choix.libelle : action.title,
        recommendedPlateRef: getCurrentRecommendedPlateRef(choix.plateCode),
      };
    }));
  };

  // Le libellé d'une assiette : celui de la liste servie, sinon celui du
  // catalogue — la carte le tire du même catalogue, les deux ne divergent pas.
  const libelleAssiette = (plateCode: string): string => (
    assiettesIndiquees?.find(assiette => assiette.plateCode === plateCode)?.libelle
    ?? getRecommendedPlate(plateCode)?.label
    ?? plateCode
  );

  const removeAction = (actionId: string) => {
    markDirty();
    setActions(previous => previous.filter(action => action.actionId !== actionId));
  };

  const reset = () => {
    const hasContent = purpose || followUpCriterion || actions.length > 0 || loadJustification;
    if (hasContent && !window.confirm('Effacer ce brouillon local non enregistré ?')) return;
    setPurpose(''); setFollowUpCriterion(''); setActions([]); setLoadLevel(''); setLoadJustification('');
    setReviewed(false); setMessage(null); setErreur(null); setNextActionId(1); setEditedSinceSave(false);
  };

  // Validations locales communes à « Marquer comme relu » et « Enregistrer la
  // version ». Retourne la soumission ou null (en posant un message d'erreur).
  const refuser = (texte: string): null => {
    setReviewed(false);
    setMessage(null);
    setErreur(texte);
    return null;
  };

  const collectSubmission = (): RelectureProtocoleSoumission | null => {
    const missingActionField = actions.some(action => (
      !action.title.trim() || !action.idealPlan.trim() || !action.minimalPlan.trim() || !action.rescuePlan.trim()
    ));
    if (!purpose.trim() || !followUpCriterion.trim() || actions.length === 0 || missingActionField) {
      return refuser('Brouillon incomplet : renseignez la raison d’être, le critère J21 et tous les plans d’au moins une action.');
    }
    // Le refus NOMME ce qui manque, et combien : « une action attend son type »
    // se corrige, « brouillon incomplet » se cherche. Patron de [[D-186]].
    const sansType = actions.filter(action => action.type === '');
    if (sansType.length > 0) {
      const rangs = sansType.map(action => actions.indexOf(action) + 1).join(', ');
      return refuser(sansType.length === 1
        ? `L’action ${rangs} n’a pas de type : choisissez-en un. Sans lui, elle serait servie au patient sous un type qu’aucun praticien n’a posé.`
        : `Les actions ${rangs} n’ont pas de type : choisissez-en un pour chacune. Sans lui, elles seraient servies au patient sous un type qu’aucun praticien n’a posé.`);
    }
    if (loadLevel === '') {
      return refuser('La charge n’est pas déclarée : choisissez-en une. Elle est une saisie du praticien, jamais un calcul — donc jamais un défaut.');
    }
    if (loadLevel === 'excessive' && !loadJustification.trim()) {
      return refuser('Une charge excessive exige une justification du praticien.');
    }
    // Le contrat V4 refuse `conditionnelle_biologie` sans `waitFor`, et une
    // attente sans cible. Le refuser ICI plutôt que de laisser la route rendre
    // un `draft_invalid` : le praticien voit quel champ manque, sur quelle action.
    const attenteSansCible = actions.filter(action =>
      action.interventionStatus === 'conditionnelle_biologie' && !(action.waitFor?.cible ?? '').trim());
    if (attenteSansCible.length > 0) {
      const rangs = attenteSansCible.map(action => actions.indexOf(action) + 1).join(', ');
      return refuser(attenteSansCible.length === 1
        ? `L’action ${rangs} attend un bilan sans dire lequel : nommez ce qu’on attend.`
        : `Les actions ${rangs} attendent un bilan sans dire lequel : nommez ce qu’on attend pour chacune.`);
    }
    setErreur(null);
    const suspendues = actions.some(action => action.interventionStatus === 'conditionnelle_biologie');
    // UNE ASSIETTE EXIGE V4, ET LA DEMANDE DOIT SUIVRE — sans quoi le geste
    // butait sur un mur. Le contrat n'était demandé que sur SUSPENSION ; une
    // assiette posée sur un protocole sans action suspendue serait partie en V1,
    // et le moteur l'aurait refusée (« exige un payload protocole V4
    // explicite »). Le praticien aurait lu un refus technique sur un geste que
    // l'écran venait de lui proposer.
    // Le contrat reste DEMANDÉ et non déduit au serveur ([[D-130]]) : c'est
    // l'écran qui demande, sur ce qu'il porte, exactement comme il le fait déjà
    // pour une suspension.
    const porteUneAssiette = actions.some(action => action.recommendedPlateRef !== undefined);
    const contratV4 = suspendues || porteUneAssiette;
    return {
      purpose,
      followUpCriterion,
      // LE CONTRAT EST DEMANDÉ, JAMAIS DÉDUIT ([[D-130]]) : un statut
      // d'intervention n'existe qu'en V4, et la route refuse de choisir le
      // contrat à la place de qui soumet. Une soumission SANS suspension reste
      // en V1 — demander V4 partout ferait basculer des protocoles que rien
      // n'oblige à changer de contrat, et V4 exige alors un statut sur CHAQUE
      // action.
      ...(contratV4 ? { version: VERSION_PROTOCOL_DRAFT_V4 } : {}),
      // Le filtre de type ci-dessus a établi que plus aucune action ne porte
      // `''` : la conversion est constatée, pas supposée. En V4, toute action
      // non suspendue porte `active` — le contrat l'exige sur chacune, et ne
      // tolère aucun défaut implicite (`DC-24`).
      actions: actions.map(action => ({
        ...action,
        type: action.type as ProtocolActionType,
        ...(contratV4 && action.interventionStatus === undefined ? { interventionStatus: 'active' as const } : {}),
      })),
      therapeuticLoad: { level: loadLevel, source: 'practitioner', justification: loadJustification.trim() || null },
    };
  };

  const review = () => {
    const submission = collectSubmission();
    if (!submission) return;
    onReviewed?.(submission);
    setReviewed(true);
    setMessage('Brouillon relu par le praticien — non activé et non transmis.');
  };

  const saveVersion = () => {
    const submission = collectSubmission();
    if (!submission) return;
    setReviewed(true);
    setEditedSinceSave(false);
    setMessage(null);
    onSaveVersion?.(submission);
  };

  return (
    <section aria-labelledby="protocol-builder-title" className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="protocol-builder-title" className="text-sm font-semibold text-foreground">Protocole 21 jours</h3>
          <p className="mt-1 text-xs text-muted-foreground">Brouillon local non enregistré</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
          {reviewed ? 'Relu par le praticien' : 'Brouillon'}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="text-sm font-medium text-foreground">
          Raison d’être
          <span className="ml-2 font-normal text-xs text-muted-foreground">
            votre patient la lit en sous-titre de son accueil
          </span>
          <textarea aria-label="Raison d’être" value={purpose} onChange={event => { markDirty(); setPurpose(event.target.value); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal" />
          {/* CITER, C'EST REPRENDRE UN TEXTE DÉJÀ ÉCRIT — jamais en composer un.
              Le bouton recopie la source telle quelle dans le champ ; la marque,
              elle, se constate au serveur et tombe au premier caractère
              réécrit. Rien n'est envoyé au serveur ici : le texte fait foi, pas
              le clic ([[D-193]]). */}
          {sourcesCitables.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Reprendre :</span>
              {sourcesCitables.map(source => (
                <button
                  key={`${source.marque}:${source.idSource}`}
                  type="button"
                  onClick={() => { markDirty(); setPurpose(source.texte); }}
                  title={source.texte}
                  className="min-h-11 max-w-full truncate rounded-lg border border-border px-3 py-1.5 text-xs font-normal"
                >
                  {source.libelle}
                </button>
              ))}
            </div>
          )}
          {/* CE QUE LA VERSION ACTIVE CITE. Constaté par comparaison de textes,
              jamais déclaré par cet écran — une marque que le navigateur
              annoncerait serait une marque que rien n'a confrontée. */}
          {provenancePurpose && (
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              {LIBELLE_MARQUE_PURPOSE[provenancePurpose.marque]}
            </p>
          )}
        </label>
        <label className="text-sm font-medium text-foreground">
          Critère observable à J21
          <input aria-label="Critère observable à J21" value={followUpCriterion} onChange={event => { markDirty(); setFollowUpCriterion(event.target.value); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal" />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Actions ({actions.length}/{MAX_ACTIONS_PROTOCOLE_21J})</span>
            <button type="button" onClick={addAction} disabled={actions.length >= MAX_ACTIONS_PROTOCOLE_21J} className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50">Ajouter une action</button>
          </div>
          {assietteSelection && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-2 text-sm">
              <span>Assiette indiquée retenue : {assietteSelection.libelle}</span>
              <button type="button" onClick={insertAssietteAction} disabled={actions.length >= MAX_ACTIONS_PROTOCOLE_21J} className="min-h-11 rounded-lg border border-foreground px-3 py-2 disabled:opacity-50">
                Insérer manuellement
              </button>
              <button type="button" onClick={onClearAssietteSelection} className="min-h-11 px-2 py-2 text-muted-foreground underline">
                Écarter cette sélection
              </button>
            </div>
          )}
          {foodCompassSelection && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-2 text-sm">
              <span>Sélection Boussole prête : {foodCompassSelection.foodLabel}</span>
              <button type="button" onClick={insertFoodCompassAction} disabled={actions.length >= MAX_ACTIONS_PROTOCOLE_21J} className="min-h-11 rounded-lg border border-foreground px-3 py-2 disabled:opacity-50">
                Insérer manuellement
              </button>
              <button type="button" onClick={onClearFoodCompassSelection} className="min-h-11 px-2 py-2 text-muted-foreground underline">
                Écarter cette sélection
              </button>
            </div>
          )}
          <div className="mt-3 grid gap-3">
            {actions.map((action, index) => (
              <fieldset key={action.actionId} className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Action {index + 1}</legend>
                <div className="grid gap-2">
                  <label className="text-xs">Type
                    <select
                      aria-label={`Type de l’action ${index + 1}`}
                      aria-invalid={erreur !== null && action.type === ''}
                      value={action.type}
                      onChange={event => updateAction(action.actionId, { type: event.target.value as ProtocolActionType | '' })}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm aria-[invalid=true]:border-status-danger"
                    >
                      {/* Option d'absence NON désactivée : elle doit se lire,
                          et rester atteignable si le praticien veut revenir en
                          arrière. C'est le refus à l'enregistrement qui garde,
                          pas la désactivation d'une option. */}
                      <option value="">Choisir un type…</option>
                      {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  {action.type === 'supplement_exploration' && (
                    <p className="text-xs text-muted-foreground">
                      Intention d’exploration uniquement : aucun produit, forme, marque ou dose.
                    </p>
                  )}
                  {/* LE MENU PARAÎT SUR UNE ACTION ALIMENTAIRE dès que la carte a
                      servi sa liste — ou dès que l'action porte déjà une
                      assiette, pour qu'elle reste visible et retirable même si
                      la liste manque. Une assiette posée hors de la liste
                      courante reste affichée sous son libellé : un menu qui ne
                      montrerait pas sa propre valeur mentirait sur l'action. */}
                  {action.type === 'food' && (assiettesIndiquees !== null || action.recommendedPlateRef !== undefined) && (
                    (assiettesIndiquees ?? []).length === 0 && action.recommendedPlateRef === undefined ? (
                      <p className="text-xs text-muted-foreground">
                        Aucune assiette n’est indiquée pour ce dossier — la carte « Assiettes indiquées » en donne la raison.
                      </p>
                    ) : (
                      <label className="text-xs">Assiette indiquée
                        <select
                          aria-label={`Assiette de l’action ${index + 1}`}
                          value={action.recommendedPlateRef?.plateCode ?? ''}
                          onChange={event => choisirAssiette(action.actionId, event.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                        >
                          <option value="">Aucune assiette — action alimentaire libre</option>
                          {(assiettesIndiquees ?? []).map(assiette => (
                            <option key={assiette.plateCode} value={assiette.plateCode}>{assiette.libelle}</option>
                          ))}
                          {action.recommendedPlateRef !== undefined
                            && !(assiettesIndiquees ?? []).some(assiette => assiette.plateCode === action.recommendedPlateRef?.plateCode) && (
                            <option value={action.recommendedPlateRef.plateCode}>
                              {libelleAssiette(action.recommendedPlateRef.plateCode)}
                            </option>
                          )}
                        </select>
                      </label>
                    )
                  )}
                  {/*
                    LE PRATICIEN SUSPEND, IL N'ACTIVE PAS. Le seul statut qu'il
                    pose à la main est `conditionnelle_biologie` : le geste
                    RETIENT une action en attendant un bilan, il n'en libère
                    aucune. La crainte de `D-056` — « une intention pourrait
                    naître *active* sans règle derrière » — visait exactement le
                    mouvement inverse, et son arbitrage 5 dit déjà que
                    `conditionnelle_biologie` n'est pas une recommandation.
                    Les trois autres statuts non-actifs (`differee`,
                    `contre_indiquee`, `non_indiquee_actuellement`) restent la
                    SORTIE d'un arbitrage biologique, jamais une saisie : ils
                    s'affichent ici quand la révision les a posés.
                  */}
                  {action.interventionStatus !== undefined
                    && action.interventionStatus !== 'active'
                    && action.interventionStatus !== 'conditionnelle_biologie' && (
                    <p className="text-xs font-medium text-muted-foreground">
                      Statut : {INTERVENTION_STATUS_LABELS[action.interventionStatus]}
                      . Cette intervention n’est pas un conseil ferme en l’état.
                    </p>
                  )}
                  <div className="rounded-lg border border-border bg-muted/40 p-2">
                    <label className="flex min-h-11 items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={action.interventionStatus === 'conditionnelle_biologie'}
                        onChange={event => updateAction(action.actionId, event.target.checked
                          ? { interventionStatus: 'conditionnelle_biologie', waitFor: { type: 'biologie', cible: '' } }
                          // Le contrat refuse une attente sans statut ET un
                          // statut sans attente : les deux se lèvent ensemble.
                          : { interventionStatus: undefined, waitFor: undefined })}
                      />
                      <span>
                        <span className="block font-medium text-foreground">
                          {INTERVENTION_STATUS_LABELS.conditionnelle_biologie}
                        </span>
                        <span className="block text-muted-foreground">
                          L’action attend un résultat avant d’être un conseil ferme. Le patient la
                          lit comme suspendue, et vous l’arbitrez au retour du bilan.
                        </span>
                      </span>
                    </label>
                    {action.interventionStatus === 'conditionnelle_biologie' && (
                      <label className="mt-2 block text-xs">
                        Ce qu’on attend
                        <input
                          aria-label={`Ce qu’on attend pour l’action ${index + 1}`}
                          aria-invalid={erreur !== null && !(action.waitFor?.cible ?? '').trim()}
                          value={action.waitFor?.cible ?? ''}
                          onChange={event => updateAction(action.actionId, {
                            waitFor: { type: 'biologie', cible: event.target.value },
                          })}
                          placeholder="Ex. ferritine, TSH, 25-OH vitamine D"
                          className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm aria-[invalid=true]:border-status-danger"
                        />
                      </label>
                    )}
                  </div>
                  {(['title', 'idealPlan', 'minimalPlan', 'rescuePlan'] as const).map(field => {
                    const labels = { title: 'Intitulé', idealPlan: 'Plan idéal', minimalPlan: 'Plan minimal', rescuePlan: 'Plan de secours' };
                    return <label key={field} className="text-xs">{labels[field]}<input aria-label={`${labels[field]} de l’action ${index + 1}`} value={action[field]} onChange={event => updateAction(action.actionId, { [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label>;
                  })}
                  <button type="button" onClick={() => removeAction(action.actionId)} className="min-h-11 justify-self-start text-xs text-muted-foreground underline">Supprimer l’action</button>
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        {/* CE QUE LA VERSION ACTIVE PORTE — sans quoi le praticien déclare une
            charge qu'il ne revoit jamais. Même geste que la décision remontée à
            côté du formulaire au LOT-02. */}
        {chargeVersionActive && (
          <p className="text-xs text-muted-foreground">
            Version active : <span className="font-medium text-foreground">{LOAD_LABELS[chargeVersionActive.level]}</span>
            {chargeVersionActive.justification ? ` — ${chargeVersionActive.justification}` : ''}
          </p>
        )}

        <label className="text-sm font-medium">Charge déclarée par le praticien
          <select
            aria-label="Charge déclarée par le praticien"
            aria-invalid={erreur !== null && loadLevel === ''}
            value={loadLevel}
            onChange={event => { markDirty(); setLoadLevel(event.target.value as NiveauChargeBrouillon); }}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal aria-[invalid=true]:border-status-danger"
          >
            <option value="">Choisir la charge…</option>
            {Object.entries(LOAD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {loadLevel === 'excessive' && <label className="text-sm font-medium">Justification de la charge excessive<input aria-label="Justification de la charge excessive" value={loadJustification} onChange={event => { markDirty(); setLoadJustification(event.target.value); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal" /></label>}
        {/* LE BARÈME PROPOSE, LE PRATICIEN DISPOSE ([[D-196]]).
            `TherapeuticLoad.source` vaut la constante 'practitioner', posée en
            dur : le barème ne peut pas devenir l'auteur de la charge sans
            changer le contrat. Le bouton RECOPIE le niveau dans le champ — il
            n'enregistre rien, et la valeur qui part reste celle du champ. */}
        {/* UN NIVEAU « EXCESSIF » SE LIT EN AVERTISSEMENT, les trois autres en
            note discrète ([[D-196]] §2 bis). Le contrat exige déjà une
            justification écrite quand le praticien DÉCLARE ce niveau : la
            suggestion le signale du même registre, sans rien bloquer et sans
            pré-remplir la justification — ouvrir ce champ d'avance pousserait
            vers un choix que le praticien n'a pas fait.

            CETTE BRANCHE EST DORMANTE, ET C'EST DÉLIBÉRÉ : l'échelle signée le
            2026-09-15 ne monte pas jusqu'à « excessif » — aucune ligne ne peut
            donc la déclencher aujourd'hui. Elle s'arme le jour où une ligne
            l'atteindra, et l'arbitrage a préféré la garder écrite plutôt que
            d'avoir à re-décider le registre d'alerte à ce moment-là. Un
            relecteur ne doit pas la lire comme du code en service : aucun banc
            ne l'exerce sur la table réelle, seulement sur une ligne de
            fixture. */}
        {suggestionCharge && (
          <div className={suggestionCharge.niveau === 'excessive'
            ? 'rounded-lg border border-status-warning bg-status-warning/10 px-3 py-2'
            : 'rounded-lg border border-border bg-muted/40 px-3 py-2'}
          >
            <p
              role={suggestionCharge.niveau === 'excessive' ? 'alert' : undefined}
              className={suggestionCharge.niveau === 'excessive'
                ? 'text-sm text-status-warning'
                : 'text-xs text-muted-foreground'}
            >
              Le barème suggère <span className="font-medium text-foreground">{LOAD_LABELS[suggestionCharge.niveau]}</span> — {suggestionCharge.motif}
            </p>
            {loadLevel !== suggestionCharge.niveau && (
              <button
                type="button"
                onClick={() => { markDirty(); setLoadLevel(suggestionCharge.niveau); }}
                className="mt-2 min-h-11 rounded-lg border border-border px-3 py-1.5 text-xs font-normal"
              >
                Reprendre cette charge
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {loadLevel === ''
            ? 'Charge : non déclarée — saisie manuelle, aucun calcul automatique.'
            : `Charge : ${LOAD_LABELS[loadLevel]} — la valeur enregistrée est la vôtre.`}
        </p>
      </div>

      {/* LA QUESTION SE POSE COMME UNE QUESTION, PAS COMME UNE ERREUR
          ([[D-090]]) : le registre anxiogène signale un terme, il n'affirme pas
          une faute — la garde ne lit pas la négation, et « il n'y a ni urgence
          ni danger » est signalé comme le reste. D'où le registre
          d'avertissement, et un second geste EXPLICITE, distinct
          d'« Enregistrer la version ». */}
      {confirmationRegistre && (
        <div role="alert" className="mt-4 rounded-lg border border-accent bg-status-warning/10 p-3">
          <p className="text-base text-status-warning">{confirmationRegistre.message}</p>
          {onConfirmerRegistre && (
            <button
              type="button"
              onClick={onConfirmerRegistre}
              className="mt-2 min-h-11 rounded-lg border border-accent px-3 py-2 text-sm font-medium text-solar-ink hover:bg-accent/10"
            >
              Enregistrer ce texte tel quel
            </button>
          )}
        </div>
      )}
      {/* `role="alert"` et couleur de danger, comme `SelectionPrioritePanel` :
          un refus ne se lit pas dans le même registre qu'un accusé de relecture. */}
      {erreur && <p role="alert" className="mt-4 text-base text-status-danger">{erreur}</p>}
      {message && <p role="status" className="mt-4 text-base text-muted-foreground">{message}</p>}
      {onSaveVersion && (
        <p role="status" className="mt-3 text-base">
          {editedSinceSave && saveState === 'saved'
            ? <span className="text-status-warning">Modifications locales non enregistrées.</span>
            : saveState === 'saving'
              ? <span className="text-muted-foreground">Enregistrement en cours…</span>
              : saveState === 'saved'
                ? <span className="text-foreground font-medium">Version enregistrée sur le serveur — non transmise au patient.</span>
                : saveState === 'stale'
                  ? <span className="text-status-warning">La version active a changé ; rechargez l’historique avant d’enregistrer.</span>
                  : saveState === 'error'
                    ? <span className="text-status-danger">{saveError ?? 'Échec de l’enregistrement.'}</span>
                    : <span className="text-muted-foreground">Brouillon local — non enregistré.</span>}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {onSaveVersion ? (
          <button
            type="button"
            onClick={saveVersion}
            disabled={saveState === 'saving'}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Enregistrer la version
          </button>
        ) : (
          <button type="button" onClick={review} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Marquer comme relu</button>
        )}
        <button type="button" onClick={reset} className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm">Réinitialiser</button>
      </div>
    </section>
  );
}
