import { INDICATIONS_BIOLOGIE_SHA256 } from '@/lib/biology-library/indicationsBiologieV1';
import type { VerdictAncre } from './correspondanceMedecin';

// Verdict d'ancrage d'une lettre de correspondance médecin ([[D-073]]).
//
// IL VIT ICI PARCE QUE DEUX SURFACES LE LISENT. Il est né dans la route de la
// fiche, non exporté, pour que son banc l'éprouve À TRAVERS elle. L'y tenir a
// produit exactement le défaut que [[D-209]] avait fermé : l'accueil et la
// fiche rendaient deux libellés incompatibles pour la même ligne — la fiche
// disant « Courrier préparé » d'une lettre générée, l'accueil « Envoi
// consigné », faute de verdict à lire. La fonction est partagée ; ce qui reste
// vrai, et que les deux bancs de route tiennent, c'est que chacune s'éprouve
// PAR SA ROUTE : un verdict juste qu'aucune route ne sert ne prouve rien.
//
// CE MODULE EST SERVEUR SEUL. Il importe le SHA vivant de la table
// d'indications, dont l'import calcule l'empreinte depuis les règles publiées ;
// l'atteindre depuis un composant client embarquerait la table entière dans le
// bundle. Les écrans ne lisent que le VERDICT, et `estAncree` — qui vit dans le
// domaine pur — pour en tirer l'origine d'une ligne.

/**
 * Verdict d'ancrage, calculé côté serveur.
 *
 * `sans_ancrage` n'est PAS `perimee` ([[DC-24]]) : une lettre sans ancre est
 * antérieure à [[D-073]], ou n'est pas un courrier biologique. La présenter
 * comme périmée ferait porter un soupçon à tout l'historique.
 *
 * `reference_inconnue` n'est PAS `perimee` non plus, et pour la même raison :
 * une ancre dont la VERSION n'est dans aucune table connue du produit n'a pas
 * bougé — c'est le produit qui ne sait pas la lire. Dire « périmée » ferait de
 * chaque lettre d'un écrivain non enregistré une fausse alerte.
 *
 * COMPOSÉ, JAMAIS RECOPIÉ : les verdicts qui attestent une ancre vivent dans le
 * domaine, qui s'en sert pour nommer les lignes du fil. Deux listes auraient
 * divergé — un verdict neuf ici, et les écrans cesseraient silencieusement de
 * reconnaître l'origine des lettres qui le portent.
 */
export type VerdictAncrage = VerdictAncre | 'sans_ancrage';

/**
 * ANCRAGES CONNUS — la version portée par la ligne → le SHA qu'elle doit
 * porter. UN SEUL écrivain ancré existe aujourd'hui ; la table est le verrou du
 * SECOND.
 *
 * Le verdict se rendait en dur contre la table d'indications biologiques. Une
 * lettre ancrée sur une AUTRE table signée — la lettre d'adressage, sur les
 * signaux de sécurité — aurait donc porté « ancrage périmé » sur chacune de ses
 * lignes, sans qu'aucune règle clinique n'ait bougé : une fausse alerte sur
 * toute une chaîne, produite par la seule arrivée d'un second écrivain. Le
 * verdict se rend donc PAR la version que la ligne déclare.
 *
 * COPIE ASSUMÉE des littéraux écrits par les générateurs — ici
 * `genererCourrierBiologie` (`lib/biology-library/courrier.ts`, bloc
 * `provenance`) : ces fichiers sont des tables SIGNÉES, et y ajouter un export
 * serait une modification clinique ([[DC-17]], [[DC-18]]). Deux littéraux
 * peuvent diverger en silence — et une divergence ferait dire « périmée » à des
 * lettres concordantes. Le banc de la route de la fiche épingle la copie sur la
 * source : il génère un vrai courrier et sert sa provenance telle quelle. Il
 * rougit si l'un des deux bouge. UN ÉCRIVAIN AJOUTÉ SANS SA LIGNE ICI ne ment
 * pas pour autant : il rend `reference_inconnue`.
 *
 * La VALEUR reste le SHA VIVANT, recalculé à l'import depuis les règles
 * publiées — jamais un SHA historique figé : un contenu de référence qui bouge
 * doit périmer les lettres parties avant lui ([[D-079]] : le SHA fait foi).
 *
 * Une `Map` et non un objet : la clé vient de la BASE, pas du code, et une
 * ligne dont la version vaudrait `constructor` ou `toString` ferait rendre à un
 * `Record` une valeur héritée du prototype — donc « périmée » au lieu de
 * « inconnue ». `Map.get` ne connaît que ce qu'on y a mis.
 */
const SHA_ATTENDU_PAR_VERSION: ReadonlyMap<string, string> = new Map([
  ['indications-biologie-v1', INDICATIONS_BIOLOGIE_SHA256],
]);

export function verdictAncrage(sha: string | null, version: string | null): VerdictAncrage {
  // AU MOINS UN nul, pas « les deux nuls » : le CHECK
  // `c3_correspondance_ancrage_complet_check` (migration
  // 20260818140000_ancrage_correspondance_medecin) interdit déjà la demi-ancre
  // en base, dans les deux sens. Si elle arrivait tout de même, elle resterait
  // une donnée ABSENTE, jamais un défaut à afficher ([[DC-24]]) — cette garde
  // applicative est une défense en profondeur, et les deux sens sont éprouvés.
  if (!sha || !version) return 'sans_ancrage';
  const attendu = SHA_ATTENDU_PAR_VERSION.get(version);
  // La version inconnue sort AVANT la comparaison : sans cette porte, toute
  // ancre non enregistrée retomberait sur « périmée » — le faux positif que la
  // table existe pour supprimer.
  if (attendu === undefined) return 'reference_inconnue';
  return sha === attendu ? 'concordante' : 'perimee';
}
