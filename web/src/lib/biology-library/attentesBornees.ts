import { canonicalJson } from '@/lib/clinical-engine/canonical';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import type { LignePanelProposition } from './statuts';
import { ligneOuvreUneAttente } from './vocabulaireStatuts';
import { codesProposesParLeBilan } from './compositionsProposition';

// LA BORNE DE [[D-190]] §3, TENUE PAR LE SERVEUR ([[D-305]] §3 et §4).
//
// Elle n'était tenue qu'à l'écran : la route des versions ne vérifiait pas
// qu'une attente vient de la proposition de bilan. Ce module porte la partie
// PURE du jugement ; la route lit le catalogue et re-dérive la proposition, puis
// lui passe ce qu'elle a lu. Patron de la re-dérivation au serveur des actions
// alimentaires — recalculer ce qu'on sait plutôt que valider ce qu'on reçoit.

export type AttenteAPoser = {
  actionId: string;
  title: string;
  analyteCodes: string[];
};

/**
 * Les attentes que CETTE soumission pose — et elles seules.
 *
 * LA BORNE JUGE LE GESTE DE SUSPENDRE ([[D-190]] §3 : « le geste est borné »),
 * pas chaque réenregistrement d'une attente déjà posée. Une action suspendue
 * que la version active porte déjà, IDENTIQUE en tout point, a été jugée quand
 * elle a été posée. La rejuger à chaque révision bloquerait la
 * boucle même qu'elle sert : le bilan revenu, sa ligne passe « déjà documenté »,
 * et la révision qui applique l'arbitrage d'UNE intention serait refusée pour
 * l'AUTRE, restée en attente et inchangée.
 *
 * L'ACTION ENTIÈRE, ET NON SON SEUL IDENTIFIANT (contre-revue du 2026-10-15) :
 * le constructeur repart d'un brouillon vide et renumérote `action-1`,
 * `action-2`… — une AUTRE action, suspendue sur les mêmes codes, porterait le
 * même identifiant que l'ancienne et passerait sans jugement. Seule l'égalité
 * canonique de l'action dit « rien n'a été reposé ». `appliquerArbitrages`
 * rend inchangée, à l'identique, une intention non arbitrée : la révision
 * après arbitrage reste exemptée. Les deux côtés sortent du moteur (codes
 * dédupliqués et triés), donc comparables tels quels.
 */
export function attentesAPoser(
  actionsActives: readonly ProtocolAction[],
  actionsSoumises: readonly ProtocolAction[],
): AttenteAPoser[] {
  const actives = new Map(actionsActives.map(action => [action.actionId, action]));
  const attentes: AttenteAPoser[] = [];
  for (const action of actionsSoumises) {
    if (action.interventionStatus !== 'conditionnelle_biologie' || action.waitFor === undefined) continue;
    const active = actives.get(action.actionId);
    if (active !== undefined && canonicalJson(active) === canonicalJson(action)) continue;
    attentes.push({
      actionId: action.actionId,
      title: action.title,
      analyteCodes: action.waitFor.analyteCodes ?? [],
    });
  }
  return attentes;
}

/** Premier code inconnu du catalogue publié, nommé avec son action ([[D-305]] §3). */
export function refusCodeInconnu(
  attentes: readonly AttenteAPoser[],
  codesConnus: ReadonlySet<string>,
): string | null {
  for (const attente of attentes) {
    const inconnu = attente.analyteCodes.find(code => !codesConnus.has(code));
    if (inconnu !== undefined) {
      return `L’action « ${attente.title} » attend « ${inconnu} », un code que le catalogue `
        + 'biologique ne connaît pas : choisissez les analytes dans la proposition de bilan.';
    }
  }
  return null;
}

/**
 * Premier code qui n'est l'analyte d'aucune ligne ouvrant une attente
 * ([[D-305]] §4) — `recommande`, `a_repeter`, `conditionnel` à déclencheur
 * rempli. La proposition passée est la DERNIÈRE, re-dérivée à l'instant de
 * l'enregistrement, et non la dernière version diffusée (arbitrage 6).
 */
export function refusHorsProposition(
  attentes: readonly AttenteAPoser[],
  lignes: readonly LignePanelProposition[],
): string | null {
  const admis = new Set(
    // Ce que le bilan proposait, constituants rangés sous leur groupe compris
    // ([[D-323]] §2) : le regroupement ne déplace pas la borne.
    lignes.filter(ligneOuvreUneAttente).flatMap(ligne => codesProposesParLeBilan(ligne.analytes)),
  );
  for (const attente of attentes) {
    const horsBorne = attente.analyteCodes.find(code => !admis.has(code));
    if (horsBorne !== undefined) {
      return `L’action « ${attente.title} » attend « ${horsBorne} », que la proposition de bilan `
        + 'de ce dossier ne retient pas aujourd’hui (ni recommandé, ni à répéter, ni conditionnel '
        + 'à déclencheur rempli). Une action ne se suspend que sur un bilan proposé.';
    }
  }
  return null;
}
