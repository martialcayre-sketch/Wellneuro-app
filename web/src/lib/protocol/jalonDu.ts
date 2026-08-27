import { TOLERANCE_JOURS_JALON } from '@/lib/equilibre/constants';
import { joursDepuisAncre } from './fenetreJalon';
import type { JalonMomentum } from '@/lib/equilibre/types';
import { ancreSuivante, jalonsDuCycle, type AncreCycle } from './cycles';
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
// de l'ancre du cycle courant (`cycle.dateAncre`, LOT-08 A8-1) — celle que la
// trajectoire utilise pour résoudre ses lectures ET celle que le serveur
// utilise désormais pour bâtir la fenêtre d'un épisode de mesure
// (`ancreCycleCourant`, revue LOT-07 B2). Deux ancres pour « la fenêtre du
// J21 » donnaient des fenêtres disjointes dès que la confirmation de l'ancre
// suivait la première réponse de plus de deux tolérances.

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Ce que le module rend, quel que soit le verdict : l'ancre qu'ouvrirait un
 * NOUVEAU cycle, ou `null` quand il n'y a pas encore de cycle du tout — dans ce
 * cas l'ouverture n'est pas un geste à part, c'est le jalon dû lui-même (`T0`).
 *
 * SERVIE MÊME QUAND UN JALON EST DÛ, et c'est voulu : `D-113` §8 énonce que
 * l'ouverture d'un cycle FERME les fenêtres restées ouvertes du précédent.
 * Cette fermeture est désormais une règle, plus un effet de bord — donc le
 * geste reste disponible pendant qu'une fenêtre est ouverte, et l'écran qui le
 * propose doit dire ce qu'il coûte.
 */
type OuvertureDeCycle = { ancreOuvrable: AncreCycle | null };

export type JalonDu = OuvertureDeCycle & (
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
    }
);

function fenetre(dateAncre: Date, jalon: JalonMomentum): { debut: Date; fin: Date } {
  const centre = dateAncre.getTime() + joursDepuisAncre(jalon) * JOUR_MS;
  const tolerance = TOLERANCE_JOURS_JALON * JOUR_MS;
  return { debut: new Date(centre - tolerance), fin: new Date(centre + tolerance) };
}

/**
 * Le jalon confirmable à l'instant donné, ou le motif qui l'en empêche.
 *
 * Trois règles, et la troisième est celle qui compte.
 *
 * Sans aucune ancre confirmée, le jalon dû est `T0` — c'est le comportement
 * historique du cockpit, et il reste inchangé pour tout patient qui n'a pas
 * encore commencé.
 *
 * LE CYCLE DE RÉFÉRENCE EST CELUI DU RANG LE PLUS HAUT — `cycles` est ordonné
 * par rang d'ancre depuis `D-113`, et non plus par date de confirmation. C'est
 * ici que se lit la règle §8 : tant qu'un cycle plus récent existe, les jalons
 * du précédent ne sont plus proposés, MÊME si leur fenêtre est encore ouverte.
 * Cette fermeture ne change pas — elle était déjà le comportement observable —
 * mais elle n'est plus un effet de bord du renommage d'une ancre : elle
 * découle de « le cycle courant est le dernier ouvert », qui s'énonce.
 *
 * HORS FENÊTRE, RIEN N'EST PROPOSÉ. Ni le jalon le plus proche, ni le suivant
 * « au cas où » : confirmer un J21 trois semaines trop tôt daterait l'épisode
 * d'un moment où la mesure n'a pas eu lieu, et le momentum comparerait ensuite
 * deux points que rien ne sépare. La fenêtre est la même que celle qui résout
 * les lectures — ce n'est pas une commodité d'affichage.
 */
export function resoudreJalonDu(trajectoire: Trajectoire | null, maintenant: Date): JalonDu {
  const cycles = trajectoire?.cycles ?? [];
  const cycle = cycles.at(-1);
  // Ouvrir un nouveau cycle reste possible à tout moment ; le geste appartient
  // au praticien, jamais à ce module, qui se borne à en nommer l'ancre.
  const ancreOuvrable = cycle ? ancreSuivante(cycles.map((c) => c.ancre)) : null;
  if (!cycle) {
    return { ancreOuvrable, statut: 'du', jalon: 'T0' };
  }

  const dateAncre = new Date(cycle.dateAncre);
  if (Number.isNaN(dateAncre.getTime())) {
    return {
      ancreOuvrable,
      statut: 'aucun',
      motif: `La date de l’ancre ${cycle.ancre} de ce cycle est illisible : aucun jalon n’est proposé.`,
    };
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

  // Les jalons DE CE CYCLE : son ancre, puis les trois mesures. La liste était
  // littérale (`['T0', 'J21', 'J42', 'J90']`) : sur un cycle ancré en `T1`,
  // elle aurait tenu `T0` pour un jalon jamais confirmé de ce cycle, dont la
  // fenêtre — centrée sur l'ancre, donc ouverte le jour même — aurait été
  // proposée en boucle.
  const restants = jalonsDuCycle(cycle.ancre).filter(jalon => !confirmes.has(jalon));
  if (restants.length === 0) {
    return { ancreOuvrable, statut: 'aucun', motif: 'Tous les jalons de ce cycle sont confirmés.' };
  }

  for (const jalon of restants) {
    const { debut, fin } = fenetre(dateAncre, jalon);
    if (maintenant >= debut && maintenant <= fin) {
      return {
        ancreOuvrable,
        statut: 'du',
        jalon,
        ouvertLe: debut.toISOString(),
        fermeLe: fin.toISOString(),
      };
    }
  }

  // Aucune fenêtre ouverte : soit elles sont toutes passées, soit la prochaine
  // n'a pas commencé. Les deux se disent, et ne se disent pas pareil.
  const aVenir = restants
    .map(jalon => ({ jalon, ...fenetre(dateAncre, jalon) }))
    .filter(candidat => candidat.debut > maintenant)
    .sort((gauche, droite) => gauche.debut.getTime() - droite.debut.getTime())[0];

  if (aVenir) {
    return {
      ancreOuvrable,
      statut: 'aucun',
      motif: `Aucun jalon n’est confirmable aujourd’hui. Le ${aVenir.jalon} s’ouvrira à sa date.`,
      prochainJalon: aVenir.jalon,
      prochaineOuverture: aVenir.debut.toISOString(),
    };
  }

  return {
    ancreOuvrable,
    statut: 'aucun',
    motif: 'Les fenêtres des jalons restants sont passées : aucun ne peut plus être confirmé sur ce cycle.',
  };
}
