// Le FIL DU JOUR du portail patient (domaine PUR, client-safe : aucune
// dépendance React ni Prisma).
//
// ── CE QUE CE MODULE CORRIGE ────────────────────────────────────────────────
//
// Le portail répondait à la question « où en suis-je ? » et jamais à « qu'est-ce
// que j'ai à faire aujourd'hui ? ». Il mettait en avant UNE étape du moment
// (`calculerActionRecommandee`), et la campagne « la vie du portail patient » a
// ensuite ajouté un récapitulatif RÉTROSPECTIF de ce qui s'était passé dans le
// dossier. Le responsable, ouvrant son propre écran de patient le 2026-09-12, a
// tranché en une phrase : le récapitulatif ajoute du bruit, et ce qu'il attendait
// est « un fil du jour de ce qu'il y a à faire », « plus une todo list qu'un
// calendrier rétrospectif ». Le récapitulatif a été éteint le jour même
// (§ B.4 de `docs/FEATURE_FLAGS.md`). Ce module est ce qui prend sa place.
//
// ── CE QU'UNE TÂCHE EST, ET CE QU'ELLE N'EST PAS ────────────────────────────
//
// Une tâche est un GESTE QUE LE PATIENT PEUT POSER MAINTENANT, et qui
// DISPARAÎT quand il l'a posé. C'est la seule règle, et elle est stricte :
// une liste qui ne se vide jamais cesse d'être une liste de tâches et redevient
// le mur de blocs que l'écart E11 reprochait déjà à cette page.
//
// Chaque espèce porte donc ici sa condition de disparition, et aucune n'est
// inventée pour l'occasion — toutes existent déjà, ailleurs, et sont déjà
// bancées là où elles vivent :
//
//   agenda du sommeil    — disparaît quand `deriverRappelAgenda` rend `cta: null`
//                          (nuit du jour notée). Revient demain matin.
//   agenda alimentaire   — disparaît quand `deriverRappelAgendaAli` rend
//                          `cta: null`. Revient le lendemain.
//   questionnaire        — disparaît quand l'assignation quitte `a_completer`
//                          (transmise, expirée, verrouillée).
//   ce qui compte        — disparaît quand la fenêtre de dépôt se ferme, c'est-
//                          à-dire dès que le patient a déposé (`D-166`). Revient
//                          à la prochaine ancre de cycle confirmée.
//
// Un `cta` nul, côté rappel d'agenda, N'EST PAS un état dégradé : c'est le mot
// par lequel le domaine dit « il n'y a rien à faire aujourd'hui ». Ce module
// s'en sert tel quel plutôt que de relire les états un par un — sinon la règle
// de disparition existerait à deux endroits et finirait par diverger.
//
// ── L'INVITATION À DIRE CE QUI COMPTE ───────────────────────────────────────
//
// C'est la pièce qui manquait, et elle manquait au sens propre : l'écran
// existait, la route existait, le texte du praticien l'attendait, et LE PATIENT
// N'ÉTAIT JAMAIS INVITÉ À L'ÉCRIRE. Un bouton de navigation a été essayé le
// 2026-09-12 puis retiré le jour même (#1052) : il faisait doublon avec le
// dossier à deux voix, et surtout une porte n'est pas une invitation.
//
// Elle n'entre dans le fil que si la fenêtre de dépôt est OUVERTE. Nommer le
// geste sur une fenêtre close le promettrait sans qu'il soit possible (`D-015`)
// — et l'écran, lui, sait expliquer pourquoi le dépôt est clos ; on ne le
// remplace pas, on cesse seulement d'y appeler.
//
// ── CE QUE CE MODULE N'A PAS LE DROIT DE FAIRE ──────────────────────────────
//
// Aucun compte à rebours, aucun « il vous reste », aucun « vous avez manqué »,
// aucun score, aucun pourcentage, aucune série. Les phrases d'appui viennent
// telles quelles des modules de rappel, dont les bancs tiennent déjà ce
// vocabulaire. Ce module n'en FABRIQUE aucune (`DC-19`, `DC-20`).

import type { Enrichi, AgendaAliPortail, AgendaPortail } from '@/lib/portail/hubQuestionnaires';
import { deriverRappelAgenda } from '@/lib/agenda-sommeil/rappelPortail';
import { NB_JOURS_AGENDA } from '@/lib/agenda-sommeil/types';
import { deriverRappelAgendaAli } from '@/lib/agenda-alimentaire/rappelPortail';

export type EspeceTache =
  | 'agenda_sommeil'
  | 'agenda_alimentaire'
  | 'ce_qui_compte'
  | 'questionnaire';

export type Tache = {
  /** Stable et unique dans un fil : la clé de rendu, et l'ancre des bancs. */
  cle: string;
  espece: EspeceTache;
  /** Le libellé du geste. C'est le bouton, et c'est toute la tâche. */
  cta: string;
  /** Une phrase FACTUELLE sous le bouton, ou rien. Jamais un reproche. */
  appui: string | null;
  /** Où le geste se pose. */
  href: string;
};

/**
 * Ce qui s'affiche QUAND LA LISTE EST VIDE — et seulement alors.
 *
 * `rien_aujourdhui` est le repos le plus fréquent et le plus mal servi avant ce
 * module : un patient dont l'agenda court et dont la nuit est notée voyait
 * « Consulter « Mon agenda du sommeil » » présenté comme son étape du moment,
 * c'est-à-dire une tâche là où il n'y en avait aucune. Il porte les phrases
 * factuelles des recueils en cours, pour que « rien à faire » ne se lise pas
 * « rien ne se passe ».
 */
export type EtatRepos =
  | { kind: 'rien_aujourdhui'; appuis: string[] }
  | { kind: 'attente'; texte: string }
  | { kind: 'stable' }
  | { kind: 'vide' };

export type FilDuJour = { taches: Tache[]; repos: EtatRepos };

export type SourcesFilDuJour = {
  token: string;
  /** Les assignations déjà passées par `affichage()`. */
  enrichis: Enrichi[];
  /** Les assignations qui portent un brouillon local — elles passent devant. */
  brouillons: Set<string>;
  agendas: AgendaPortail[];
  agendasAli: AgendaAliPortail[];
  /**
   * La fenêtre de dépôt de « ce qui compte » est-elle ouverte ?
   *
   * `null` = ON NE SAIT PAS — drapeau fermé, sonde en vol, sonde en échec. Et
   * l'inconnu ne produit PAS d'invitation : c'est le seul repli qui ne risque
   * pas de nommer au patient un geste qu'il ne pourra pas poser (`D-015`).
   * L'inverse — inviter dans le doute — enverrait sur un écran qui rend
   * `notFound()`.
   */
  ceQuiCompteOuvert: boolean | null;
  /**
   * La formulation du contrat de parcours quand plus rien n'est à compléter
   * (`deriverEtatParcoursPatient`), ou `null`. Passée telle quelle : ce module
   * ne dérive pas le parcours, il se contente de la relayer en repos.
   */
  formulationParcours: string | null;
};

function lienAssignation(token: string, idAssignation: string): string {
  return `/portail/${token}/questionnaires/${idAssignation}`;
}

/**
 * ORDRE DU FIL, et pourquoi il est celui-là.
 *
 * 1. Les agendas PRIORITAIRES. Seules tâches périssables du portail : la porte
 *    de saisie d'une nuit se referme à J-2, un brouillon attend sans rien
 *    perdre. Sommeil puis alimentaire — non que l'un prime cliniquement sur
 *    l'autre, mais pour que l'ordre soit STABLE (même raison que
 *    `candidatsAgendas`, et même ordre).
 * 2. L'INVITATION À DIRE CE QUI COMPTE. Placée AVANT les questionnaires, et
 *    c'est un arbitrage, pas un hasard : c'est la seule tâche du fil où le
 *    patient PARLE — toutes les autres lui demandent de remplir. La mettre
 *    après les questionnaires reviendrait à ne l'inviter qu'une fois qu'il a
 *    tout rempli, c'est-à-dire, pour la plupart des dossiers, jamais. C'est
 *    exactement l'absence que ce lot corrige ; l'enterrer la reconduirait.
 * 3. Les questionnaires en attente, brouillon repris d'abord — même préférence
 *    que celle qui gouvernait l'étape du moment, pour ne pas faire recommencer
 *    à zéro quelqu'un qui a déjà écrit.
 * 4. Les agendas à COMMENCER, en DERNIER — et c'est une doctrine existante,
 *    pas un choix de ce lot. `rappelPortail` la porte déjà, mot pour mot :
 *    « rien ne se perd à commencer demain » (la fenêtre s'ancre sur la
 *    première saisie), et surtout « le mettre en tête ENTERRERAIT SANS TERME
 *    UN PACK ASSIGNÉ avant une consultation ». Un recueil de 21 jours placé
 *    devant six questionnaires les repousserait de trois semaines.
 *
 *    Une première version de ce module les avait remontés en 2ᵉ position, au
 *    motif qu'« un recueil jamais ouvert est plus urgent qu'un formulaire de
 *    plus ». C'était contredire une doctrine écrite sans l'avoir lue — et le
 *    banc qui devait l'épingler portait le bon titre sur la mauvaise
 *    assertion. C'est l'E2E du parcours patient qui l'a attrapé, en tombant
 *    sur l'agenda là où il attendait le premier questionnaire du pack.
 */
export function construireFilDuJour(sources: SourcesFilDuJour): FilDuJour {
  const { token, enrichis, brouillons, agendas, agendasAli, ceQuiCompteOuvert, formulationParcours } =
    sources;

  // Un agenda DÉVERROUILLÉ par le praticien est un recueil déjà clôturé qu'il
  // rouvre pour faire corriger : son état praticien prime, et le rappel
  // quotidien ne doit pas reprendre la main. Même garde que
  // `calculerActionRecommandee`, pour la même raison — proposer « transmettre »
  // y créerait une seconde réponse. Il n'est donc NI une tâche d'agenda NI un
  // appui de repos : il redevient une tâche de questionnaire ordinaire, sous
  // le libellé que `affichage()` lui donne déjà — « Corriger ».
  const reouverts = new Set(
    enrichis.filter(e => e.a.statutReponses === 'deverrouille').map(e => e.a.idAssignation),
  );

  /*
   * UN RAPPEL D'AGENDA NE SUFFIT PAS À FAIRE UNE TÂCHE — il faut que
   * l'assignation correspondante soit SERVIE et OUVERTE.
   *
   * Deux cas réels, et ils ne sont pas théoriques :
   *
   *  — `IDS_SUSPENDUS` / drapeau `WN_AGENDA_ALI` éteint : la route sert encore
   *    l'état du recueil mais plus l'assignation. Un lien fabriqué depuis le
   *    seul rappel pointerait vers un écran qui rend 410.
   *  — recueil EXPIRÉ, TRANSMIS ou en CORRECTION DEMANDÉE : l'assignation est
   *    servie, mais `affichage()` l'a sortie de `a_completer`. Le rappel
   *    quotidien, lui, continue de dire « nuit du jour à noter » — il ne
   *    connaît que le rythme du recueil, pas l'état que le praticien a posé
   *    dessus. C'est `affichage()` qui arbitre, ici comme dans la liste.
   *
   * La même garde vaut pour les phrases de REPOS : « 5 nuits notées sur 21 »
   * sous « rien à faire aujourd'hui » décrirait un recueil déjà transmis
   * comme s'il courait encore.
   */
  const ouvertes = new Set(
    enrichis.filter(e => e.aff.groupe === 'a_completer').map(e => e.a.idAssignation),
  );

  const prioritaires: Tache[] = [];
  const aCommencer: Tache[] = [];
  // Les phrases factuelles des recueils qui courent SANS rien demander
  // aujourd'hui : elles ne font pas une tâche, elles font le repos.
  const appuisDeRepos: string[] = [];
  // Les assignations couvertes par un rappel d'agenda : elles ne doivent PAS
  // repasser en tâche de questionnaire. La couverture se juge sur la PRÉSENCE
  // du rappel, pas sur l'identifiant du questionnaire — si la lecture des
  // agendas a échoué, le tableau est vide, `affichage()` retombe déjà sur son
  // rendu générique, et le fil doit retomber avec lui plutôt que de faire
  // disparaître un recueil qu'il ne sait plus lire.
  const couvertes = new Set<string>();

  for (const agenda of agendas) {
    if (!ouvertes.has(agenda.idAssignation) || reouverts.has(agenda.idAssignation)) continue;
    couvertes.add(agenda.idAssignation);
    const rappel = deriverRappelAgenda(agenda, NB_JOURS_AGENDA);
    if (rappel.cta === null) {
      appuisDeRepos.push(rappel.factuel);
      continue;
    }
    const tache: Tache = {
      cle: agenda.idAssignation,
      espece: 'agenda_sommeil',
      cta: rappel.cta,
      appui: rappel.factuel,
      href: lienAssignation(token, agenda.idAssignation),
    };
    (rappel.prioritaire ? prioritaires : aCommencer).push(tache);
  }

  for (const agendaAli of agendasAli) {
    if (!ouvertes.has(agendaAli.idAssignation) || reouverts.has(agendaAli.idAssignation)) continue;
    couvertes.add(agendaAli.idAssignation);
    const rappel = deriverRappelAgendaAli(agendaAli);
    if (rappel.cta === null) {
      appuisDeRepos.push(rappel.factuel);
      continue;
    }
    const tache: Tache = {
      cle: agendaAli.idAssignation,
      espece: 'agenda_alimentaire',
      cta: rappel.cta,
      appui: rappel.factuel,
      href: lienAssignation(token, agendaAli.idAssignation),
    };
    (rappel.prioritaire ? prioritaires : aCommencer).push(tache);
  }

  const invitation: Tache[] =
    ceQuiCompteOuvert === true
      ? [
          {
            cle: 'ce-qui-compte',
            espece: 'ce_qui_compte',
            cta: 'Dire ce qui compte pour moi',
            appui: 'Ce que vous écrivez ici arrive tel quel à votre praticien.',
            href: `/portail/${token}/ce-qui-compte`,
          },
        ]
      : [];

  // Un questionnaire DÉJÀ COMMENCÉ passe devant les autres — même préférence
  // que celle qui gouvernait l'étape du moment, et pour la même raison : ne
  // pas faire recommencer à zéro quelqu'un qui a déjà écrit. `sort` est stable
  // en ES2019, donc l'ordre d'origine tient à l'intérieur de chaque moitié.
  const questionnaires: Tache[] = enrichis
    // `filter` rend déjà un nouveau tableau : `sort` ne touche pas `enrichis`.
    .filter(e => e.aff.groupe === 'a_completer' && !couvertes.has(e.a.idAssignation))
    .sort(
      (x, y) =>
        Number(brouillons.has(y.a.idAssignation)) - Number(brouillons.has(x.a.idAssignation)),
    )
    .map(e => ({
      cle: e.a.idAssignation,
      espece: 'questionnaire' as const,
      // `aff.action` n'est jamais nul dans le groupe `a_completer` — la seule
      // branche qui rend `null` est `expire`. Le repli n'est là que pour que le
      // type ne mente pas.
      cta: `${e.aff.action ?? 'Consulter'} « ${e.a.titre || e.a.idQuestionnaire} »`,
      appui: null,
      href: lienAssignation(token, e.a.idAssignation),
    }));

  const taches = [...prioritaires, ...invitation, ...questionnaires, ...aCommencer];
  return { taches, repos: deriverRepos(enrichis, appuisDeRepos, formulationParcours) };
}

/**
 * LE REPOS, et l'ordre de ses réponses.
 *
 * Il n'est LU que si la liste est vide — il n'y a donc aucun cas où il
 * contredit une tâche. L'ordre ci-dessous répond à la question dans l'ordre où
 * elle se pose : « qu'est-ce que je fais aujourd'hui ? », puis seulement « où
 * en est mon dossier ? ».
 *
 * `rien_aujourdhui` passe AVANT la correction en attente, alors que les deux
 * énoncés sont vrais. Motif : un recueil qui court est la réponse à la question
 * posée, et la correction en attente a sa propre section, plus bas dans la page
 * — elle ne se perd pas. L'inverse perdrait, lui, l'information que le patient
 * est à jour.
 */
function deriverRepos(
  enrichis: Enrichi[],
  appuisDeRepos: string[],
  formulationParcours: string | null,
): EtatRepos {
  if (appuisDeRepos.length > 0) return { kind: 'rien_aujourdhui', appuis: appuisDeRepos };
  if (enrichis.length === 0) return { kind: 'vide' };
  const enAttente = enrichis.find(e => e.aff.groupe === 'correction');
  if (enAttente) {
    const titre = enAttente.a.titre || enAttente.a.idQuestionnaire;
    return {
      kind: 'attente',
      texte: `Votre demande de correction sur « ${titre} » est en attente de traitement par votre praticien.`,
    };
  }
  if (formulationParcours !== null) return { kind: 'attente', texte: formulationParcours };
  return { kind: 'stable' };
}
