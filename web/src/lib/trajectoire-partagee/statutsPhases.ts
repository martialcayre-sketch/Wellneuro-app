// Statuts des phases du rail et phase due d'un dossier (J3-cabinet, [[D-385]]).
//
// Module de dérivation PUR : aucune écriture, aucun appel réseau. C'est le
// moteur qui vivait dans `FichePatientPanel` (`statutPhase`), sorti tel quel
// pour qu'un second lecteur — la page des comptes du cabinet — fasse LE MÊME
// calcul que la fiche, et non une seconde version qui en dériverait. Le corps
// est transcrit à l'identique, ordre des tests compris : un changement ici se
// lit sur la fiche ET sur la page.
//
// Ce que le module ne fait pas : charger. Les entrées sont des lectures déjà
// faites par l'appelant, chacune avec son état de lecture — une lecture en vol
// ou en échec rend « indéterminée », jamais un état par défaut (`DC-24`).

import {
  ORDRE_PHASES,
  phaseDue,
  type EntreesPhaseInitiale,
  type IdPhaseContrat,
  type StatutPhaseContrat,
} from './contrat';

/** Sous-ensemble exact d'`EtatRuntimeClinique` que les statuts consomment. */
export type EtatRuntimePourPhases = {
  chargement: boolean;
  erreur: 'session' | 'patient' | 'technical' | null;
  episodeConfirme: boolean;
  nombreVersions: number;
  versionsLues: boolean;
  suiviRenseigne: boolean | null;
  suiviOuvert: boolean | null;
  trajectoireErreur: boolean;
  trajectoireEnLecture: boolean;
  reevaluationMesuree: boolean;
  decisionBloquee: boolean;
  rideauT0Satisfait: boolean | null;
  selectionPrioriteDue: boolean | null;
};

export type EntreesStatutsPhases = {
  /**
   * Les lectures de base du dossier (sur la fiche : la réponse de
   * `/api/praticien/equilibre`). `indisponible` tant qu'elles manquent ou
   * qu'elles disent `unavailable` : toutes les phases sont alors indéterminées.
   */
  lecturesDeBase: 'ok' | 'indisponible';
  /** Les demandes de correction du patient : état de lecture, et combien attendent. */
  corrections: { etat: 'chargement' | 'chargees' | 'erreur'; enAttente: number };
  /**
   * Les envois de questionnaires : état de lecture, et combien sont attendus ou
   * rendus (`rendues + enAttente`, les annulées exclues).
   */
  passations: { etat: 'chargement' | 'chargees' | 'tronque' | 'erreur'; assignees: number };
  /** L'état de la phase 3 (objectifs, synthèse, demandes de correction). */
  phase3: {
    lu: 'chargement' | 'lu' | 'erreur';
    etat: { objectifsActifs: number; synthesePubliee: boolean; demandesCorrectionEnAttente: number } | null;
  };
  /** L'état remonté par le runtime clinique ; `null` avant la première mesure. */
  runtime: EtatRuntimePourPhases | null;
};

// Statuts du rail — dérivés de l'état réel (réponses reçues, demandes de
// correction, état remonté par le runtime clinique). Aucun statut inventé :
// en l'absence d'information, la phase reste « à ouvrir » — et tant que
// l'état réel n'est pas établi, « indéterminée ».
export function statutPhase(id: IdPhaseContrat, e: EntreesStatutsPhases): StatutPhaseContrat {
  const etatRuntime = e.runtime;
  if (e.lecturesDeBase === 'indisponible') return 'inconnu';
  // Une lecture en échec ne vaut pas « rien en attente » : sans cette
  // branche, le rail affirmerait « renseignée » alors que l'état réel des
  // demandes de correction n'a pas pu être établi.
  if (id === 'patient') {
    if (e.corrections.etat === 'erreur') return 'inconnu';
    return e.corrections.enAttente > 0 ? 'en_attente' : 'fait';
  }
  if (id === 'donnees') {
    // « RENSEIGNÉE » VEUT DIRE « LE RIDEAU T0 EST COMPLET ET COTABLE »,
    // arbitrage praticien du 2026-09-13 — et non « au moins une passation
    // est arrivée », qui était le critère jusqu'ici.
    //
    // L'ancien critère mentait dans le sens qui coûte : un dossier à qui
    // il manquait un questionnaire du rideau — donc dont l'ancre était
    // inconfirmable — portait la même pastille verte qu'un dossier
    // complet. Constaté sur un dossier réel le 2026-09-12, et le compte
    // posé depuis en phase 2 disait déjà l'inverse du badge, à trois
    // centimètres l'un de l'autre.
    //
    // Le critère est celui de `preconditionsT0`, PAS un second : le rail
    // dit maintenant la même chose que le panneau de confirmation
    // d'épisode. Un envoi du second rideau qui traîne ne fait donc pas
    // retomber la phase — il n'empêche pas de confirmer l'ancre, et la
    // liste des envois le montre déjà pour ce qu'il est.
    if (e.passations.etat === 'erreur' || e.passations.etat === 'tronque') return 'inconnu';
    if (!etatRuntime || etatRuntime.chargement) return 'inconnu';
    // L'ANCRE CONFIRMÉE VAUT VERDICT, et c'est le seul raccourci admis :
    // le rideau complet est une condition DURE de la confirmation, donc un
    // épisode confirmé ne peut pas coexister avec un rideau incomplet au
    // moment où il a été posé. La route cesse d'ailleurs de calculer les
    // préconditions dès qu'il n'y a plus rien à autoriser — sans cette
    // branche, tout dossier ancré retomberait en « indéterminée ».
    if (etatRuntime.episodeConfirme) return 'fait';
    // Le verdict du rideau vient du serveur ; absent, il est INCONNU et
    // ne s'invente pas (`DC-24`).
    if (etatRuntime.rideauT0Satisfait === null) return 'inconnu';
    if (etatRuntime.rideauT0Satisfait) return 'fait';
    // LE RIDEAU EST INCOMPLET — reste à savoir qui on attend, et l'ORDRE
    // compte : le verdict d'abord, l'acteur ensuite. Tester « rien
    // d'envoyé » en tête ferait dire « à ouvrir » à un dossier dont le
    // rideau est pourtant satisfait — un état que la production ne produit
    // pas mais que les fixtures, elles, produisent (passations semées sans
    // assignation).
    //
    // RIEN N'A ÉTÉ DEMANDÉ : le geste attendu est PRATICIEN, pas patient.
    // `en_attente` afficherait « en attente du patient » et reprocherait à
    // celui-ci un envoi qui n'est jamais parti — cinq dossiers sur douze
    // en production au 2026-09-12. C'est le défaut de désignation d'acteur
    // que la requalification de « Compréhension » a corrigé le 2026-09-10.
    return e.passations.assignees === 0 ? 'a_ouvrir' : 'en_attente';
  }
  if (id === 'comprehension') {
    // CE QUE LA PHASE CONTIENT, ET NON CE QUI L'ENTOURE. Elle lisait les
    // couvertures des douze besoins — un objet du cercle, affiché en tête de
    // phase, mais qui ne dit RIEN de l'objectif ni de la compréhension.
    // Un dossier sans le moindre objectif s'affichait « renseignée », et
    // `D-161` §10 en tire la conséquence : le rail ne peut pas servir de feu
    // pour passer à la prise de décision tant qu'il dit cela.
    //
    // Une lecture en vol ou en échec rend « indéterminée », jamais un état
    // par défaut — même discipline que les phases du runtime plus bas.
    if (e.phase3.lu !== 'lu' || e.phase3.etat === null) return 'inconnu';
    // LES DEUX, ET PAS L'UNE OU L'AUTRE. Un objectif posé sans qu'on ait
    // dit au patient ce qu'on a compris de lui n'est pas une phase faite ;
    // une synthèse publiée sans objectif non plus. La phase porte les deux
    // sous-vues, son statut porte les deux conditions.
    // TROISIÈME CONDITION (2026-09-11) : une DEMANDE DE CORRECTION en
    // attente empêche « renseignée ». Le patient a lu son objectif et
    // demande qu'on le reprenne — la phase porterait au vert pendant
    // qu'une parole reste sans réponse, et ce rail sert de feu pour passer
    // à la prise de décision (`D-161` §10).
    //
    // Elle s'ajoute aux deux autres, elle n'en remplace aucune : un
    // dossier sans objectif ni synthèse n'est pas « en attente d'une
    // correction », il est en attente tout court.
    return e.phase3.etat.objectifsActifs > 0
      && e.phase3.etat.synthesePubliee
      && e.phase3.etat.demandesCorrectionEnAttente === 0
      ? 'fait'
      : 'en_attente';
  }
  // Phases dérivées du runtime : tant que son état n'est pas établi
  // (première mesure absente, chargement en cours ou erreur), le statut est
  // honnêtement « indéterminée » — jamais une affirmation par défaut.
  if (!etatRuntime || etatRuntime.chargement || etatRuntime.erreur !== null) return 'inconnu';
  if (id === 'decision') {
    // CE QUE LA PHASE CONTIENT, ET NON CE QUI L'ENTOURE — troisième
    // application, après `comprehension` (`D-161` §10) et `donnees`. La
    // phase lisait l'ANCRE CONFIRMÉE, un acte de la phase précédente, pour
    // statuer sur un geste qu'elle porte seule : la sélection d'une
    // priorité par le praticien (`SelectionPrioritePanel`, monté sous
    // `affiche('decision')`). Un dossier ancré sans priorité retenue
    // s'affichait donc « renseignée », pendant que la phase Actions
    // refusait le protocole faute de cette même priorité — et `phaseDue`,
    // sautant une phase verte, y envoyait le praticien.
    //
    // Le rail sert de feu pour passer à la prise de décision (`D-161` §10) :
    // un feu vert sur une phase qui attend un acte n'est pas une
    // imprécision d'affichage, c'est un feu faux. Mesuré le 2026-09-13 :
    // six dossiers réels sur sept étaient dans cet état.
    if (!etatRuntime.episodeConfirme) return 'en_attente';
    // Carte non lisible sur un épisode pourtant confirmé (rejeu d'un jalon
    // suivant, `D-118`) : la sélection n'est pas absente, elle est inconnue.
    if (etatRuntime.selectionPrioriteDue === null) return 'inconnu';
    // « Renseignée » couvre DEUX situations, et c'est voulu : la priorité
    // est retenue, ou aucun geste n'est offert (décision bloquée, table des
    // priorités non signée). Dans le second cas, ce n'est pas ici que le
    // praticien doit aller — le bandeau bloqueur porte déjà ce cas-là.
    return etatRuntime.selectionPrioriteDue ? 'en_attente' : 'fait';
  }
  if (id === 'actions') {
    if (etatRuntime.nombreVersions > 0) return 'fait';
    if (!etatRuntime.episodeConfirme) return 'a_ouvrir';
    // Avant la lecture des versions, « 0 version » n'est pas « aucune
    // version » (t15, `DC-24`) : le rail ne dit « en attente » qu'une fois
    // la lecture aboutie.
    return etatRuntime.versionsLues ? 'en_attente' : 'inconnu';
  }
  if (id === 'suivi') {
    if (!etatRuntime.episodeConfirme) return 'a_ouvrir';
    // LE SUIVI PART DE LA DIFFUSION ([[D-255]], lot 4) : sans protocole
    // diffusé sur le cycle courant, aucun point d'étape n'est dû, et la
    // phase s'ouvre par la diffusion. Trajectoire non lue : on ne sait pas.
    if (etatRuntime.suiviOuvert === null) return 'inconnu';
    if (!etatRuntime.suiviOuvert) return 'a_ouvrir';
    // Check-ins non lus : ni « en attente », ni « renseignée ».
    if (etatRuntime.suiviRenseigne === null) return 'inconnu';
    return etatRuntime.suiviRenseigne ? 'fait' : 'en_attente';
  }
  // Réévaluation : « renseignée » uniquement si un jalon POST-T0 (J21/J42/J90)
  // a réellement été mesuré (booléens `mesure` de la trajectoire, A8-2) — un
  // T0 confirmé ouvre un cycle mais ne constitue pas une réévaluation. Tant que
  // la lecture de la trajectoire n'a pas abouti (en vol) ou a échoué, l'état
  // est inconnu, jamais affirmé « à ouvrir ».
  if (etatRuntime.trajectoireErreur || etatRuntime.trajectoireEnLecture) return 'inconnu';
  return etatRuntime.reevaluationMesuree ? 'fait' : 'a_ouvrir';
}

/** Les sept statuts du rail, dans l'ordre du cycle. */
export function statutsDesPhases(e: EntreesStatutsPhases): Record<IdPhaseContrat, StatutPhaseContrat> {
  return Object.fromEntries(ORDRE_PHASES.map(id => [id, statutPhase(id, e)])) as Record<
    IdPhaseContrat,
    StatutPhaseContrat
  >;
}

/**
 * Ce que la règle D5 reçoit d'un dossier : le bloqueur de sécurité, les actions
 * exigibles et les statuts. La phase due (`phaseDueDuDossier`) et la phase
 * initiale de la fiche (`phaseInitiale`, mémoire locale en plus) partent de
 * cette même composition — un seul endroit dit ce qui bloque et ce qui est dû.
 *
 * Tant que l'état n'est pas établi (lectures de base absentes, runtime non
 * mesuré ou en chargement), `chargement` vaut vrai : aucune phase n'est
 * affirmée.
 */
export function entreesPhaseDueDuDossier(
  e: EntreesStatutsPhases,
): Omit<EntreesPhaseInitiale, 'dernierePhaseConsultee'> {
  const etatRuntime = e.runtime;
  const statuts = statutsDesPhases(e);
  if (e.lecturesDeBase === 'indisponible' || !etatRuntime || etatRuntime.chargement) {
    return { chargement: true, bloqueurs: [], actionsExigibles: [], statuts };
  }
  return {
    chargement: false,
    bloqueurs: etatRuntime.erreur === null && etatRuntime.decisionBloquee ? ['actions'] : [],
    actionsExigibles: [
      ...(e.corrections.enAttente > 0 ? (['patient'] as const) : []),
      ...(etatRuntime.erreur === null && !etatRuntime.episodeConfirme ? (['decision'] as const) : []),
    ],
    statuts,
  };
}

/**
 * La phase DUE du dossier — celle que le fil « Prochaine étape » de la fiche
 * désigne. `null` : rien n'attend le praticien, ou l'état n'est pas établi
 * (`phaseDue`, `contrat.ts`).
 */
export function phaseDueDuDossier(e: EntreesStatutsPhases): IdPhaseContrat | null {
  return phaseDue(entreesPhaseDueDuDossier(e));
}
