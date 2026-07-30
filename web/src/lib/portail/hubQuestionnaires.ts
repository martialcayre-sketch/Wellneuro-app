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
import type { EtapeDuMoment } from '@/components/patient/MonParcoursAccueil';
import { deriverRappelAgenda, type EtatAgendaPortail } from '@/lib/agenda-sommeil/rappelPortail';
import { AGENDA_SOMMEIL_ID, NB_JOURS_AGENDA } from '@/lib/agenda-sommeil/types';

export type Groupe = 'a_completer' | 'correction' | 'transmis' | 'expire';

export type Affichage = {
  groupe: Groupe;
  badge: string;
  badgeVariant: BadgeVariant;
  action: string | null; // libellé du bouton, null si non cliquable
  ghost?: boolean;
};

export type Enrichi = { a: AssignationPatient; aff: Affichage };
export type AgendaPortail = EtatAgendaPortail & { idAssignation: string };

export const GROUPES: { cle: Groupe; titre: string }[] = [
  { cle: 'a_completer', titre: 'À compléter' },
  { cle: 'correction', titre: 'Correction demandée' },
  { cle: 'transmis', titre: 'Transmis au praticien' },
  { cle: 'expire', titre: 'Expiré' },
];

// Groupes affichés en sections secondaires (repliables) : « à compléter »
// reste toujours visible en premier plan, le reste est du détail consultable.
export const GROUPES_SECONDAIRES = new Set<Groupe>(['correction', 'transmis', 'expire']);

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

// Dérive l'affichage patient à partir des statuts de l'assignation. L'ordre
// des branches compte : un état posé par le PRATICIEN (verrouillé, correction
// demandée, déverrouillé) prime toujours sur le rythme propre de l'agenda.
export function affichage(
  a: AssignationPatient,
  avecBrouillon: boolean,
  agenda?: AgendaPortail,
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
  return {
    groupe: 'a_completer',
    badge: avecBrouillon ? 'Brouillon enregistré' : 'À compléter',
    badgeVariant: 'neutral',
    action: avecBrouillon ? 'Reprendre' : 'Commencer',
  };
}

// Une seule action mise en avant : d'abord un agenda dont la nuit du jour
// manque (seule tâche PÉRISSABLE — `estDateSaisissable` referme la porte à
// J-2, alors qu'un brouillon attend sans rien perdre), puis une reprise de
// brouillon, puis le premier « à compléter », puis une correction demandée en
// attente (non actionnable : présentée en information, pas en CTA), sinon un
// état stable sans action.
export function calculerActionRecommandee(
  enriched: Enrichi[],
  brouillons: Set<string>,
  agendas: AgendaPortail[],
): EtapeDuMoment {
  if (enriched.length === 0) return { kind: 'vide' };

  for (const agenda of agendas) {
    const rappel = deriverRappelAgenda(agenda, NB_JOURS_AGENDA);
    if (!rappel.prioritaire || rappel.cta === null) continue;
    const cible = enriched.find(
      e => e.a.idAssignation === agenda.idAssignation && e.aff.groupe === 'a_completer',
    );
    // Un agenda DÉVERROUILLÉ par le praticien est un recueil déjà clôturé
    // qu'il rouvre pour faire corriger : lui proposer « transmettre » ferait
    // créer une seconde QuestionnaireReponse. Son état praticien prime.
    if (cible && cible.a.statutReponses !== 'deverrouille') {
      return {
        kind: 'action',
        idAssignation: agenda.idAssignation,
        cta: rappel.cta,
        appui: rappel.factuel,
      };
    }
  }

  const brouillon = enriched.find(e => e.aff.groupe === 'a_completer' && brouillons.has(e.a.idAssignation));
  const cible = brouillon ?? enriched.find(e => e.aff.groupe === 'a_completer');
  if (cible) {
    const titre = cible.a.titre || cible.a.idQuestionnaire;
    return { kind: 'action', idAssignation: cible.a.idAssignation, cta: `${cible.aff.action} « ${titre} »` };
  }
  const enAttente = enriched.find(e => e.aff.groupe === 'correction');
  if (enAttente) {
    const titre = enAttente.a.titre || enAttente.a.idQuestionnaire;
    return { kind: 'attente', texte: `Votre demande de correction sur « ${titre} » est en attente de traitement par votre praticien.` };
  }
  return { kind: 'stable' };
}
