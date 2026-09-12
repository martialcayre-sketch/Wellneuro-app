import type { CarteFil, TypeCarteFil } from './cartes';
import type { OngletFiche, PhaseFiche } from '@/lib/praticien/ongletsFiche';
import { bornesJourParis } from './fuseau';

/**
 * LA LECTURE D'UNE CARTE DU FIL — dérivation pure, sans accès base.
 *
 * Le Fil connaissait un seul geste pour faire partir une carte : « Écarter »,
 * un REFUS explicite. Le praticien qui a ouvert la fiche, lu la réponse du
 * patient et repris son objectif retrouvait les mêmes cartes le lendemain, et
 * devait refuser une à une des paroles qu'il venait de lire.
 *
 * CE MODULE VIT À PART DE `cartes.ts`, ET C'EST DÉLIBÉRÉ. `cartes.ts` porte
 * déjà un `LectureRow` — la lecture d'une RÉPONSE DE QUESTIONNAIRE, qui nourrit
 * la carte « synthèse à générer ». Deux « lecture » dans le même fichier
 * auraient refait, le jour même, l'homonymie « demande de correction » qu'il a
 * fallu défaire (`D-170`, note du 2026-09-12). Le type d'ici s'appelle
 * `LectureCarteFilRow` et rien d'autre.
 */

/** Une ligne de `fil_card_lectures`, telle que la route la lit. */
export type LectureCarteFilRow = {
  idPatient: string;
  /** Le TYPE de carte acquitté — jamais la clé d'une carte. */
  typeCarte: string;
  /** `false` = lecture annulée (« Remettre »). */
  lue: boolean;
  lueLe: Date;
};

// SÉPARATEUR VISIBLE, et pas un octet invisible : cette clé sort telle
// quelle dans les messages d'échec des bancs. Ni `PAT0xx` ni un type de
// carte ne contient de `|` — la collision est impossible.
function cle(idPatient: string, typeCarte: string): string {
  return `${idPatient}|${typeCarte}`;
}

/**
 * LA LECTURE EFFECTIVE de chaque couple (dossier, type) : la ligne la plus
 * RÉCENTE, et seulement si elle vaut `lue`.
 *
 * La table est append-only chaînée : « Remettre » écrit une seconde ligne
 * (`lue = false`) qui supplante la première. Lire « existe-t-il une ligne ? »
 * rendrait l'annulation sans effet — la première lecture serait toujours là.
 *
 * ÉGALITÉ D'INSTANT : à `lueLe` identique, la PREMIÈRE rencontrée gagne, donc
 * l'ordre d'arrivée. Le cas est théorique (`CURRENT_TIMESTAMP` à la
 * milliseconde) et aucun comportement n'en dépend — mais il est tranché ici
 * plutôt que laissé au hasard d'un tri.
 */
export function lectureEffective(lectures: LectureCarteFilRow[]): Map<string, Date> {
  const dernieres = new Map<string, LectureCarteFilRow>();
  for (const ligne of lectures) {
    const k = cle(ligne.idPatient, ligne.typeCarte);
    const connue = dernieres.get(k);
    if (!connue || ligne.lueLe.getTime() > connue.lueLe.getTime()) dernieres.set(k, ligne);
  }

  const effectives = new Map<string, Date>();
  for (const [k, ligne] of dernieres) {
    if (ligne.lue) effectives.set(k, ligne.lueLe);
  }
  return effectives;
}

export type PartageLectures = {
  /** Les cartes qui restent des cartes : rien ne les a acquittées. */
  visibles: CarteFil[];
  /**
   * Les cartes LUES DONT LA TRACE SE MONTRE ENCORE — « Carte lue … / Remettre ».
   * Les autres lues sont simplement absentes, comme une carte écartée l'est au
   * chargement suivant.
   */
  lues: CarteFil[];
};

/**
 * PARTAGE LES CARTES entre celles qui restent, celles dont la lecture se
 * montre encore, et celles qui s'en vont (absentes des deux listes).
 *
 * UNE CARTE EST LUE si une lecture effective couvre son couple (dossier, type)
 * et que la carte lui est ANTÉRIEURE. Un geste postérieur à la lecture
 * reparaît : un fait nouveau n'est pas acquitté par une lecture passée.
 *
 * UNE CARTE SANS DATE N'EST JAMAIS LUE. `CarteFil.date` est nullable — sans
 * date, rien ne permet de dire si le geste précède la lecture, et l'acquitter
 * « au bénéfice du doute » ferait disparaître un signal que personne n'a vu.
 * (`DC-24` : une absence n'est ni un zéro ni un accord.)
 *
 * LA TRACE NE SURVIT PAS AU JOUR DE SA LECTURE, et ce n'est pas un seuil neuf :
 * c'est le JOUR CIVIL DE PARIS, le cadre que le Fil se donne déjà pour les
 * consultations (`cartesConsultationsPrevues`) et que son nom annonce. Sans
 * cette borne, les deux ratifications de 18:14 resteraient à l'écran des
 * semaines — une trace qui ne s'efface jamais cesse d'être une trace et
 * redevient une liste.
 *
 * CE QUE CELA COÛTE, ET IL FAUT LE SAVOIR : la réparation d'un lien ouvert par
 * mégarde a la durée du jour. Le lendemain, la carte est partie sans trace,
 * comme une carte écartée. C'est le régime de sa sœur, pas une exception.
 */
export function partagerParLecture(
  cartes: CarteFil[],
  lectures: LectureCarteFilRow[],
  maintenant: Date,
): PartageLectures {
  const effectives = lectureEffective(lectures);
  const { debut, fin } = bornesJourParis(maintenant);

  const visibles: CarteFil[] = [];
  const lues: CarteFil[] = [];

  for (const carte of cartes) {
    const lueLe = effectives.get(cle(carte.idPatient, carte.type));
    if (!lueLe || carte.date === null) {
      visibles.push(carte);
      continue;
    }
    if (new Date(carte.date).getTime() > lueLe.getTime()) {
      visibles.push(carte);
      continue;
    }
    if (lueLe >= debut && lueLe < fin) lues.push(carte);
    // Lue avant aujourd'hui : elle n'est ni visible ni tracée. Elle s'en va.
  }

  return { visibles, lues };
}

/**
 * LES TYPES DE CARTE QUI S'ACQUITTENT PAR LECTURE — liste FERMÉE, et étroite
 * par arbitrage du responsable (2026-09-12).
 *
 * Une carte qui appelle un GESTE ailleurs — un signalement Trust, une biologie
 * arbitrée, une assignation en retard — ne se règle pas en la lisant. La faire
 * partir à l'atterrissage effacerait un suivi que personne n'a fait. Le retour
 * du patient sur son objectif, lui, se règle en le lisant : la fiche montre la
 * réponse, et la suite s'y joue.
 */
export const TYPES_ACQUITTABLES_PAR_LECTURE: readonly TypeCarteFil[] = ['geste_objectif'] as const;

export function sAcquitteParLecture(type: TypeCarteFil): boolean {
  return (TYPES_ACQUITTABLES_PAR_LECTURE as readonly string[]).includes(type);
}

/**
 * LE MARQUEUR DE PROVENANCE — ce qui distingue « j'arrive par le Fil » de
 * « j'ouvre ce dossier ».
 *
 * SANS LUI, CONSULTER UN DOSSIER EFFACERAIT EN SILENCE LES SIGNAUX QU'IL PORTE.
 * Ouvrir la fiche de PAT006 depuis la liste des patients, pour tout autre
 * motif, viderait son Fil des paroles qu'on n'a pas lues. La lecture consignée
 * est celle d'un geste précis, atteint par le lien qui le nommait.
 */
export const PARAM_PROVENANCE_FIL = 'fil';

/**
 * OÙ LA LECTURE SE FAIT, sur la fiche — un couple (onglet, phase) par type.
 *
 * Le lien ne se contente plus d'ouvrir le dossier : il ouvre l'endroit où la
 * parole du patient se lit. « Ouvrir la fiche » puis chercher soi-même la
 * réponse dans sept phases, c'est le trajet que la carte existe pour éviter.
 *
 * TOUTE CLÉ D'ICI DOIT S'ACQUITTER PAR LECTURE, et c'est un banc qui le tient,
 * pas une garde au runtime : une destination déclarée pour un signalement
 * Trust poserait le marqueur sur un lien qui ne doit jamais l'avoir. Le
 * vérifier ici ET dans `lienFilVersFiche` serait une garde morte — la seconde
 * ne pourrait jamais rendre un verdict différent de la première.
 */
const DESTINATION_LECTURE: Partial<Record<TypeCarteFil, { onglet: OngletFiche; phase: PhaseFiche }>> = {
  geste_objectif: { onglet: 'cockpit', phase: 'comprehension' },
};

/**
 * LE LIEN D'UNE CARTE ACQUITTABLE : la fiche, à sa phase, marquée d'où l'on
 * vient. Un type sans destination déclarée rend la fiche nue — un lien qui
 * marche, jamais une 404 ni un marqueur orphelin.
 */
export function lienFilVersFiche(idPatient: string, type: TypeCarteFil): string {
  const base = `/dashboard/patients/${encodeURIComponent(idPatient)}`;
  const destination = DESTINATION_LECTURE[type];
  if (!destination) return base;
  return `${base}?onglet=${destination.onglet}&phase=${destination.phase}&${PARAM_PROVENANCE_FIL}=${encodeURIComponent(type)}`;
}

/**
 * CE QUE LA PAGE ACCEPTE DE CONSIGNER À L'ATTERRISSAGE — la même liste étroite
 * que la route, relue ici sur une valeur d'URL.
 *
 * UNE URL EST UNE ENTRÉE UTILISATEUR. `?fil=signalement_trust` collé à la main
 * ferait disparaître du Fil un suivi que personne n'a fait ; la page le refuse
 * avant même que la route ait à le refuser (`D-164`, deux gardes valent mieux
 * qu'une quand la seconde est gratuite).
 */
export function typeLuAlAtterrissage(valeur: unknown): TypeCarteFil | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  if (typeof brut !== 'string') return null;
  const type = brut.trim();
  return sAcquitteParLecture(type as TypeCarteFil) ? (type as TypeCarteFil) : null;
}

/**
 * L'URL DE LA MÊME PAGE, SANS LE MARQUEUR — ce que le client remet dans la
 * barre d'adresse une fois la lecture consignée.
 *
 * CALCULÉE AU SERVEUR, et pas avec `useSearchParams` : ce hook force la page
 * dans une frontière Suspense et fait basculer son rendu. La page connaît déjà
 * son chemin et ses paramètres ; les recomposer coûte trois lignes.
 *
 * SANS CE NETTOYAGE, un rechargement (F5) réécrirait une lecture — inoffensif,
 * la table est chaînée, mais elle raconterait des lectures qui n'ont pas eu
 * lieu, et une trace d'audit qui exagère ne vaut pas mieux qu'une qui ment.
 */
export function urlSansMarqueurFil(
  idPatient: string,
  parametres: Record<string, string | string[] | undefined> | undefined,
): string {
  const base = `/dashboard/patients/${encodeURIComponent(idPatient)}`;
  const reste = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres ?? {})) {
    if (cle === PARAM_PROVENANCE_FIL || valeur === undefined) continue;
    for (const v of Array.isArray(valeur) ? valeur : [valeur]) reste.append(cle, v);
  }
  const requete = reste.toString();
  return requete ? `${base}?${requete}` : base;
}
