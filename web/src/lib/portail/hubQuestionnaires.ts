// Logique du hub « Mes questionnaires » (domaine PUR, client-safe).
//
// Extrait de `app/portail/[token]/questionnaires/page.tsx` : cette logique
// décide ce que le patient voit EN PREMIER, et elle vivait dans un composant
// client où rien ne pouvait la couvrir. Une revue l'a relevé le 2026-07-30 —
// aucun test ne portait sur la priorité de l'étape du moment.
//
// Aucune dépendance React ni Prisma : le composant l'appelle, il ne la
// réimplémente pas.

import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import type { BadgeVariant } from '@/components/ui/Badge';
import { deriverRappelAgenda, type EtatAgendaPortail } from '@/lib/agenda-sommeil/rappelPortail';
import { AGENDA_SOMMEIL_ID, NB_JOURS_AGENDA } from '@/lib/agenda-sommeil/types';
import {
  deriverRappelAgendaAli,
  type EtatAgendaAliPortail,
} from '@/lib/agenda-alimentaire/rappelPortail';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';

/**
 * `recueil_termine` — un recueil quotidien dont la fenêtre est CLOSE et dont
 * il ne reste RIEN à faire. N'est ni `transmis` (aucune passation n'est partie
 * chez le praticien), ni `expire` (ce groupe-là dit une date limite dépassée,
 * `estEnAttenteSaisie === false`). Il lui fallait son propre nom.
 */
export type Groupe = 'a_completer' | 'correction' | 'recueil_termine' | 'transmis' | 'expire';

export type Affichage = {
  groupe: Groupe;
  badge: string;
  badgeVariant: BadgeVariant;
  action: string | null; // libellé du bouton, null si non cliquable
  ghost?: boolean;
};

export type Enrichi = { a: AssignationPatient; aff: Affichage };
export type AgendaPortail = EtatAgendaPortail & { idAssignation: string };
export type AgendaAliPortail = EtatAgendaAliPortail & { idAssignation: string };

export const GROUPES: { cle: Groupe; titre: string }[] = [
  { cle: 'a_completer', titre: 'À compléter' },
  { cle: 'correction', titre: 'Correction demandée' },
  { cle: 'recueil_termine', titre: 'Recueil terminé' },
  { cle: 'transmis', titre: 'Transmis au praticien' },
  { cle: 'expire', titre: 'Expiré' },
];

// Groupes affichés en sections secondaires (repliables) : « à compléter »
// reste toujours visible en premier plan, le reste est du détail consultable.
export const GROUPES_SECONDAIRES = new Set<Groupe>(['correction', 'recueil_termine', 'transmis', 'expire']);

/** Badge de liste d'un agenda du sommeil : ce qui reste à faire AUJOURD'HUI,
 * jamais ce qui a été manqué. */
export function badgeAgenda(etatRappel: string): string {
  switch (etatRappel) {
    case 'a_transmettre':
      return 'À transmettre';
    case 'a_jour':
      return 'Nuit notée ce matin';
    case 'a_commencer':
      return 'À commencer';
    default:
      return 'Nuit du jour à noter';
  }
}

/** Badge de liste d'un agenda ALIMENTAIRE : ce qui reste à faire AUJOURD'HUI,
 * jamais ce qui a été manqué. Jumeau de `badgeAgenda`, vocabulaire « journée »
 * — « notée aujourd'hui » et non « ce matin » : la journée alimentaire court de
 * 04:00 à 03:59 et se note en fin de journée, pas au réveil.
 *
 * ── `a_transmettre` DÉCRIT UN ÉTAT, PAS UN GESTE ────────────────────────────
 * Le jumeau sommeil écrit ici « À transmettre », et il le peut :
 * `api/portail/agenda-sommeil/cloture` existe. Aucune route de clôture
 * ALIMENTAIRE n'existe, et `rappelPortail.ts` en tire déjà `cta: null`. Nommer
 * le geste dans le badge le promettait quand même — la même promesse, par
 * l'autre bout de l'écran. Le libellé constate donc la fin de la période, sans
 * nommer une action que le patient ne peut pas poser. À reprendre par le lot qui
 * livrera la clôture alimentaire. */
export function badgeAgendaAli(etatRappel: string): string {
  switch (etatRappel) {
    case 'a_transmettre':
      return 'Recueil terminé';
    case 'a_jour':
      return 'Journée notée aujourd’hui';
    case 'a_commencer':
      return 'À commencer';
    default:
      return 'Journée du jour à noter';
  }
}

// Dérive l'affichage patient à partir des statuts de l'assignation. L'ordre
// des branches compte : un état posé par le PRATICIEN (verrouillé, correction
// demandée, déverrouillé) prime toujours sur le rythme propre de l'agenda.
export function affichage(
  a: AssignationPatient,
  avecBrouillon: boolean,
  agenda?: AgendaPortail,
  agendaAli?: AgendaAliPortail,
): Affichage {
  if (a.statutReponses === 'verrouille') {
    return { groupe: 'transmis', badge: 'Transmis au praticien', badgeVariant: 'info', action: 'Consulter', ghost: true };
  }
  if (a.statutReponses === 'modification_demandee') {
    return { groupe: 'correction', badge: 'Correction demandée', badgeVariant: 'warning', action: 'Consulter', ghost: true };
  }
  if (a.statutReponses === 'deverrouille') {
    return { groupe: 'a_completer', badge: 'Déverrouillé par le praticien', badgeVariant: 'warning', action: 'Corriger' };
  }
  if (!a.estEnAttenteSaisie) {
    return { groupe: 'expire', badge: 'Expiré', badgeVariant: 'neutral', action: null };
  }
  // L'agenda du sommeil se lit à son propre rythme : un recueil quotidien
  // n'est ni « à compléter » ni un brouillon.
  if (a.idQuestionnaire === AGENDA_SOMMEIL_ID && agenda) {
    const rappel = deriverRappelAgenda(agenda, NB_JOURS_AGENDA);
    return {
      groupe: 'a_completer',
      badge: badgeAgenda(rappel.etat),
      badgeVariant: 'neutral',
      action: rappel.cta ?? 'Consulter',
    };
  }
  // L'agenda ALIMENTAIRE se lit à son propre rythme, exactement comme celui du
  // sommeil : un recueil quotidien n'est ni « à compléter » ni un brouillon.
  if (a.idQuestionnaire === AGENDA_ALI_ID && agendaAli) {
    const rappel = deriverRappelAgendaAli(agendaAli);
    // ── LE RECUEIL CLOS QUITTE « À COMPLÉTER » ──────────────────────────────
    //
    // Fenêtre de 21 jours atteinte et AUCUNE route de clôture patient : ce
    // recueil ne peut plus rien recevoir, et aucun geste du patient ne le fera
    // sortir de la liste. `rappelPortail` le dit déjà — `cta: null`,
    // `prioritaire: false` — au motif qu'on ne nomme pas un geste impossible
    // (D-015). Le `?? 'Consulter'` ci-dessous refaisait cette promesse par
    // l'autre bout : l'item comptait dans « N questionnaires à compléter » et,
    // n'étant candidat d'aucun agenda prioritaire, il était rattrapé par le
    // repli « premier à compléter » de `calculerActionRecommandee` — devenant
    // l'étape du moment sous un bouton que ce `??` venait d'inventer. Constaté
    // en production sur un recueil clos depuis cinq semaines.
    //
    // La condition porte sur `cta === null` et non sur le seul état : le jour
    // où la clôture alimentaire existera, `rappelPortail` rendra un vrai CTA et
    // l'item reviendra de lui-même dans « à compléter ».
    //
    // « Consulter » reste offert, en `ghost` : relire ses journées est un geste
    // POSSIBLE — c'est ce que le journal propose déjà. Ce n'est pas une tâche.
    if (rappel.etat === 'a_transmettre' && rappel.cta === null) {
      return {
        groupe: 'recueil_termine',
        badge: badgeAgendaAli(rappel.etat),
        badgeVariant: 'neutral',
        action: 'Consulter',
        ghost: true,
      };
    }
    return {
      groupe: 'a_completer',
      badge: badgeAgendaAli(rappel.etat),
      badgeVariant: 'neutral',
      action: rappel.cta ?? 'Consulter',
    };
  }
  return {
    groupe: 'a_completer',
    badge: avecBrouillon ? 'Brouillon enregistré' : 'À compléter',
    badgeVariant: 'neutral',
    action: avecBrouillon ? 'Reprendre' : 'Commencer',
  };
}

/*
 * ── CE QUI A ÉTÉ RETIRÉ ICI LE 2026-09-12, ET POURQUOI ─────────────────────
 *
 * `calculerActionRecommandee` vivait à cette place : elle élisait UNE action à
 * mettre en avant — agenda périssable, puis brouillon, puis premier à
 * compléter, puis correction en attente. `lib/portail/filDuJour.ts` répond
 * maintenant à la même question, et en donne la LISTE au lieu du premier.
 *
 * Elle n'a pas été gardée « au cas où ». Deux dérivations de « qu'est-ce que
 * le patient a à faire », lues par le même écran, divergeraient — et la
 * divergence ne se verrait pas : les deux rendraient quelque chose de
 * plausible. Ses promesses ne sont pas perdues pour autant : chacune est
 * rejouée dans `filDuJour.test.ts`, y compris celles que le fil honore
 * autrement (un agenda à jour n'est plus une action « Consulter », il devient
 * un repos).
 */
