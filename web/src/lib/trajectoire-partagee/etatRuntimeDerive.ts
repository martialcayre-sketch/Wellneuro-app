// L'état runtime que les statuts de phase consomment (J3-cabinet, [[D-385]]).
//
// Module de dérivation PUR, transcrit de `ClinicalRuntimeSection` : la fiche
// le dérive de ce que le cockpit a lu ; la page des comptes du cabinet le
// dérivera des mêmes lectures, faites côté serveur. Un seul calcul, deux
// lecteurs — et aucune logique clinique nouvelle : la carte de décision est
// lue par les gardes du moteur (`isPrioriteLibreOuverte`,
// `isSelectionPrioriteDue`), jamais réinterprétée ici.
//
// Les entrées sont plates et gardent l'état de lecture de chacune : une
// lecture en vol ou en échec rend un champ `null` ou un drapeau d'erreur,
// jamais une valeur par défaut (`DC-24`).

import type { DecisionCard } from '@/lib/clinical-engine/types';
import { isSelectionPrioriteDue } from '@/lib/clinical-engine/decisionGuards';
import { isPrioriteLibreOuverte } from '@/lib/clinical-engine/prioriteLibre';
import { estJalonMesure } from '@/lib/protocol/cycles';
import type { EtatRuntimePourPhases } from './statutsPhases';

/** Sous-ensemble d'un cycle de la trajectoire (`TrajectoireCycle`) réellement lu. */
export type CycleRuntimeDerive = {
  jourZero: string | null;
  jalons: readonly { jalon: string; mesure: boolean }[];
};

export type EntreesRuntimeDerive = {
  /** La lecture du cockpit est-elle en vol ? */
  chargement: boolean;
  erreur: 'session' | 'patient' | 'technical' | null;
  /**
   * La carte de décision lue — sur la fiche, celle de la fixture de
   * démonstration, à défaut celle d'une réponse `ready`. `null` sans carte.
   */
  carte: DecisionCard | null;
  /** L'identifiant de la carte d'une réponse `ready` réelle (hors fixture), sinon `null`. */
  idCarteServie: string | null;
  /**
   * Les préconditions servies sur la branche `proposal_required` ; `null` (ou
   * absentes) partout ailleurs.
   */
  preconditionsProposition: { dures: readonly { id: string; satisfaite: boolean }[] } | null | undefined;
  /**
   * Les versions du protocole : ont-elles été lues POUR LA CARTE SERVIE
   * (`idCarteServie` non nul, lecture aboutie pour elle — t15), et combien.
   * Sans carte servie, jamais vrai : « 0 version » n'y est pas « aucune
   * version » (`DC-24`), et la phase Actions resterait indéterminée sur la fiche.
   */
  versions: { luesPourLaCarte: boolean; nombre: number };
  /**
   * Les check-ins : ont-ils été lus POUR LA CARTE SERVIE, et combien de points
   * d'étape le résumé compte-t-il (`0` sans résumé).
   */
  checkins: { lusPourLaCarte: boolean; pointsRenseignes: number };
  trajectoire: {
    statut: 'inconnue' | 'chargement' | 'chargee' | 'erreur';
    /** Les cycles lus, `null` sans trajectoire. Lus quel que soit le statut, comme le cockpit. */
    cycles: readonly CycleRuntimeDerive[] | null;
  };
};

export function deriverEtatRuntimePourPhases(e: EntreesRuntimeDerive): EtatRuntimePourPhases {
  const cycles = e.trajectoire.cycles;
  // « Une ré-évaluation a-t-elle été MESURÉE ? » — donc un jalon de MESURE, et
  // jamais l'ancre, qui est le point de départ. Le test excluait le littéral
  // `T0` : sur un cycle ancré en `T1`, l'ouverture du cycle aurait compté comme
  // une ré-évaluation, et le rail des phases aurait avancé d'un cran tout seul.
  const reevaluationMesuree = (cycles ?? []).some(cycle =>
    cycle.jalons.some(jalon => estJalonMesure(jalon.jalon) && jalon.mesure),
  );
  // UN RÉSUMÉ LU N'EST PAS UN SUIVI RENSEIGNÉ ([[D-255]], lot 4). La route rend
  // un résumé sur tout dossier, protocole ou non : le rail disait « renseignée »
  // sur un suivi qui n'avait jamais commencé.
  // Et un résumé NON LU n'est pas un suivi vide : `null` tant que la lecture de
  // la carte servie n'a pas abouti.
  const suiviRenseigne = e.checkins.lusPourLaCarte ? e.checkins.pointsRenseignes > 0 : null;
  // Le jour 0 du cycle COURANT, servi par la trajectoire : la même date que
  // le jalon dû et le bandeau, jamais recalculée ici.
  const suiviOuvert = e.trajectoire.statut === 'chargee'
    ? (cycles?.at(-1)?.jourZero ?? null) !== null
    : null;
  // « AUCUN PROTOCOLE NE PEUT ÊTRE PROPOSÉ » — depuis [[D-279]], seul un constat
  // de sécurité le dit : sans candidat, ou sous abstention pour recueil
  // incomplet, la priorité posée par le praticien ouvre encore le protocole, et
  // c'est `selectionPrioriteDue` qui conduit au geste. Avant, ces dossiers
  // affichaient « Protocole bloqué ».
  const decisionBloquee = e.carte !== null && !isPrioriteLibreOuverte(e.carte);
  // `null` quand la carte n'est pas lisible — jamais `false`, qui affirmerait
  // qu'il n'y a rien à faire.
  const selectionPrioriteDue = e.carte === null ? null : isSelectionPrioriteDue(e.carte);
  // « Un épisode a-t-il été confirmé ? » ne dépend plus du seul écran
  // (`D-118`) : un cycle présent dans la trajectoire vient d'une ligne
  // d'`assessment_episodes`, donc d'une confirmation persistée — l'état
  // survit au rechargement de page même quand l'écran affiche la proposition
  // d'un AUTRE jalon (le `J21` dû d'un `T0` confirmé).
  const episodeConfirmeEnBase = (cycles?.length ?? 0) > 0;
  // Le verdict du rideau, tel que la route l'a calculé — jamais recalculé ici.
  //
  // Il n'existe QUE sur la branche `proposal_required` : une fois l'épisode
  // confirmé, la route ne calcule plus de préconditions, et c'est cohérent —
  // il n'y a plus rien à autoriser. `null` dans tous les autres cas, y compris
  // en lecture datée où la checklist est délibérément absente.
  const rideauT0Satisfait = e.preconditionsProposition
    ? (e.preconditionsProposition.dures.find(c => c.id === 'rideau_t0')?.satisfaite ?? null)
    : null;
  return {
    chargement: e.chargement,
    erreur: e.erreur,
    episodeConfirme: e.idCarteServie !== null || episodeConfirmeEnBase,
    nombreVersions: e.versions.nombre,
    versionsLues: e.versions.luesPourLaCarte,
    suiviRenseigne,
    suiviOuvert,
    trajectoireErreur: e.trajectoire.statut === 'erreur',
    trajectoireEnLecture: e.trajectoire.statut === 'inconnue' || e.trajectoire.statut === 'chargement',
    reevaluationMesuree,
    decisionBloquee,
    rideauT0Satisfait,
    selectionPrioriteDue,
  };
}
