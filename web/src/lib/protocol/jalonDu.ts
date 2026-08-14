import { JOURS_JALON, TOLERANCE_JOURS_JALON } from '@/lib/equilibre/constants';
import type { JalonMomentum } from '@/lib/equilibre/types';
import { rattacherReperesAuxCycles, type Trajectoire } from './trajectoire';

// Quel jalon le praticien peut-il confirmer MAINTENANT ? (LOT-07, `D-058`)
//
// Le cockpit demandait `milestone=T0` en dur : J21, J42 et J90 étaient
// inatteignables depuis l'interface alors que le back les accepte déjà. Ce
// module répond à la question, et à elle seule — il ne confirme rien, ne lit
// rien, ne décide d'aucune clinique.
//
// MÊMES NOMBRES, MÊME ANCRE que le reste de la chaîne. Les fenêtres viennent
// de `JOURS_JALON` et `TOLERANCE_JOURS_JALON`, et l'ancre est le `confirmedAt`
// du T0 confirmé le plus récent (`cycle.dateT0`, LOT-08 A8-1) — celle que la
// trajectoire utilise pour résoudre ses lectures ET celle que le serveur
// utilise désormais pour bâtir la fenêtre d'un épisode post-T0
// (`ancreCycleCourant`, revue LOT-07 B2). Deux ancres pour « la fenêtre du
// J21 » donnaient des fenêtres disjointes dès que la confirmation du T0
// suivait la première réponse de plus de deux tolérances.

const JOUR_MS = 24 * 60 * 60 * 1000;
const ORDRE_JALONS: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'] as const;

export type JalonDu =
  | {
      statut: 'du';
      jalon: JalonMomentum;
      /**
       * Bornes de la fenêtre, ISO — affichées au praticien, jamais recalculées
       * ailleurs. ABSENTES pour le T0 initial : sans cycle confirmé il n'y a
       * pas de fenêtre calculable, et en fabriquer une de durée nulle serait
       * affichable telle quelle.
       */
      ouvertLe?: string;
      fermeLe?: string;
    }
  | {
      statut: 'aucun';
      /**
       * Pourquoi rien n'est proposé, en français. Un cockpit qui n'affiche
       * simplement rien laisse croire à une panne ; le motif distingue « pas
       * encore l'heure » de « tout est confirmé ».
       */
      motif: string;
      /** Prochaine ouverture, quand il en reste une. */
      prochainJalon?: JalonMomentum;
      prochaineOuverture?: string;
    };

function fenetre(dateT0: Date, jalon: JalonMomentum): { debut: Date; fin: Date } {
  const centre = dateT0.getTime() + JOURS_JALON[jalon] * JOUR_MS;
  const tolerance = TOLERANCE_JOURS_JALON * JOUR_MS;
  return { debut: new Date(centre - tolerance), fin: new Date(centre + tolerance) };
}

/**
 * Le jalon confirmable à l'instant donné, ou le motif qui l'en empêche.
 *
 * Trois règles, et la troisième est celle qui compte.
 *
 * Sans aucun T0 confirmé, le jalon dû est `T0` — c'est le comportement
 * historique du cockpit, et il reste inchangé pour tout patient qui n'a pas
 * encore commencé.
 *
 * Le cycle de référence est le T0 confirmé le PLUS RÉCENT. Le modèle est
 * mono-protocole aujourd'hui ; le jour où un second T0 sera confirmé, c'est lui
 * qui ancrera les jalons suivants, et non le premier.
 *
 * HORS FENÊTRE, RIEN N'EST PROPOSÉ. Ni le jalon le plus proche, ni le suivant
 * « au cas où » : confirmer un J21 trois semaines trop tôt daterait l'épisode
 * d'un moment où la mesure n'a pas eu lieu, et le momentum comparerait ensuite
 * deux points que rien ne sépare. La fenêtre est la même que celle qui résout
 * les lectures — ce n'est pas une commodité d'affichage.
 */
export function resoudreJalonDu(trajectoire: Trajectoire | null, maintenant: Date): JalonDu {
  const cycle = trajectoire?.cycles.at(-1);
  if (!cycle) {
    return { statut: 'du', jalon: 'T0' };
  }

  const dateT0 = new Date(cycle.dateT0);
  if (Number.isNaN(dateT0.getTime())) {
    return { statut: 'aucun', motif: 'La date du T0 de ce cycle est illisible : aucun jalon n’est proposé.' };
  }

  // Jalons déjà confirmés SUR CE CYCLE. Le rattachement est celui de la
  // Spirale — `rattacherReperesAuxCycles`, id stocké quand il existe, repli
  // par date pour les lignes héritées (gate G2). Une règle de rattachement
  // PROPRE à ce module ignorait les lignes à `cycleId` null : un jalon hérité
  // déjà confirmé voyait sa fenêtre re-proposée, et la Spirale et le jalon dû
  // pouvaient se contredire sur le même écran (revue LOT-07, Mo1).
  const confirmes = new Set(
    rattacherReperesAuxCycles(trajectoire?.index ?? [], trajectoire?.cycles ?? [])
      .filter(repere => repere.cycleId === cycle.cycleId)
      .map(repere => repere.milestone),
  );

  const restants = ORDRE_JALONS.filter(jalon => !confirmes.has(jalon));
  if (restants.length === 0) {
    return { statut: 'aucun', motif: 'Tous les jalons de ce cycle sont confirmés.' };
  }

  for (const jalon of restants) {
    const { debut, fin } = fenetre(dateT0, jalon);
    if (maintenant >= debut && maintenant <= fin) {
      return { statut: 'du', jalon, ouvertLe: debut.toISOString(), fermeLe: fin.toISOString() };
    }
  }

  // Aucune fenêtre ouverte : soit elles sont toutes passées, soit la prochaine
  // n'a pas commencé. Les deux se disent, et ne se disent pas pareil.
  const aVenir = restants
    .map(jalon => ({ jalon, ...fenetre(dateT0, jalon) }))
    .filter(candidat => candidat.debut > maintenant)
    .sort((gauche, droite) => gauche.debut.getTime() - droite.debut.getTime())[0];

  if (aVenir) {
    return {
      statut: 'aucun',
      motif: `Aucun jalon n’est confirmable aujourd’hui. Le ${aVenir.jalon} s’ouvrira à sa date.`,
      prochainJalon: aVenir.jalon,
      prochaineOuverture: aVenir.debut.toISOString(),
    };
  }

  return {
    statut: 'aucun',
    motif: 'Les fenêtres des jalons restants sont passées : aucun ne peut plus être confirmé sur ce cycle.',
  };
}
