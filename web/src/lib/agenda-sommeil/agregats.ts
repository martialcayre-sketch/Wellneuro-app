// Agrégats de l'agenda du sommeil (domaine PUR) — cœur des calculs de durées et
// de régularité. Aucune dépendance Prisma ni conversion de fuseau : les heures
// sont des chaînes `HH:MM` en horloge murale LOCALE.
//
// Deux pièges traités à la racine :
//   (a) Traversée de minuit : une durée se calcule modulo 1440 minutes —
//       `((fin − début) + 1440) % 1440`. Extinction 23:30 → lever 07:00 = 450 min.
//   (b) Statistiques d'heures autour de minuit : on ancre à MIDI
//       (`minutesDepuisMidi`), car le sommeil ne traverse jamais midi. Le milieu
//       de nuit devient une valeur linéaire dont on peut prendre moyenne et
//       écart-type sans statistique circulaire.
//   (c) Changement d'heure été/hiver : chaînes locales, aucune conversion — la
//       bascule DST introduit au pire ±60 min sur UNE seule nuit de la fenêtre
//       (bruit clinique accepté et documenté, jamais une exception).
//
// COUVERTURE PAR MÉTRIQUE, PAS PAR NUIT (v2). Une nuit v1 sans réveils renseignés
// ne permet pas d'estimer le temps de sommeil ni l'efficacité — elle en est donc
// EXCLUE, au lieu d'être agrégée comme « 0 minute éveillée ». C'était le défaut
// central de la v1 : un accordéon laissé fermé produisait TST = TIB − latence,
// donc une efficacité artificiellement haute, donc un meilleur score. Le recueil
// récompensait la non-réponse, et dans le sens qui masque la pathologie. La même
// nuit reste comptée pour la qualité, la régularité et le temps au lit, qui
// n'ont pas besoin du WASO.

import {
  MIN_NUITS_AGREGATS,
  MIN_NUITS_INDICE,
  MIN_NUITS_WEEKEND_INDICE,
  type NuitReponses,
} from './types';
import { dureeMinutes, estWeekend } from './nuit';

// Bornes de plausibilité d'un temps au lit (minutes). Hors de [120, 960] la nuit
// est exclue des agrégats (saisie manifestement erronée) mais reste visible nuit
// par nuit côté praticien.
const TIB_MIN_PLAUSIBLE = 120;
const TIB_MAX_PLAUSIBLE = 960;

// Bornes des deux intervalles d'éveil au lit. La validation garantit leur ORDRE
// mais pas leur ordre de grandeur : une poignée glissée à l'opposé du cadran
// produit un « 15 h au lit avant d'éteindre » parfaitement ordonné, qui ferait
// chuter l'efficacité et lever le drapeau de restriction de sommeil. Au-delà de
// ces bornes la valeur est traitée comme INCONNUE — la nuit reste comptée
// ailleurs, mais on ne bâtit pas une conduite clinique sur un geste manifestement
// raté.
const PRELIT_MAX_PLAUSIBLE = 300; // 5 h au lit avant d'éteindre
const TWAK_MAX_PLAUSIBLE = 300; // 5 h éveillé au lit le matin

// Centres de classe (minutes) — une classe qualitative devient une estimation
// ponctuelle pour l'agrégation. Jamais montrés au patient.
const CENTRE_LATENCE: Record<string, number> = { lt15: 8, e15_30: 22, e30_60: 45, gt60: 75 };
// Les deux dernières entrées sont les classes héritées de la v1 : leur centre
// est conservé pour que les nuits déjà en base gardent une moyenne d'éveil
// juste. Elles n'ont volontairement pas d'équivalent dans les classes courantes.
const CENTRE_DUREE_REVEILS: Record<string, number> = {
  aucun: 0,
  lt15: 8,
  e15_30: 22,
  e30_60: 45,
  gt60: 75,
  e15_45: 30,
  gt45: 60,
};

// Classes situées AU-DESSUS du seuil conventionnel de 30 minutes. Les classes
// héritées n'y figurent pas et ne figurent pas non plus en dessous : « 15 à
// 45 » chevauche la borne, donc la nuit est INDÉTERMINÉE pour ce critère — elle
// sort du calcul de fréquence au lieu d'être rangée arbitrairement d'un côté.
const AU_DELA_DE_30 = new Set(['e30_60', 'gt60']);
const CLASSABLE_POUR_30 = new Set(['aucun', 'lt15', 'e15_30', 'e30_60', 'gt60']);

// Une semaine, pour ramener un compte de nuits à une fréquence hebdomadaire.
const JOURS_SEMAINE = 7;

// Une nuit telle qu'elle est agrégée : la date compte (règle de couverture
// week-end), pas seulement les réponses.
export type NuitAgregable = { dateNuit: string; reponses: NuitReponses };

export type AgregatsAgenda = {
  AGD_NB_NUITS: number; // nuits plausibles retenues
  AGD_FENETRE_MOY: number; // extinction → sortie du lit (minutes)
  AGD_TIB_MOY: number | null; // TEMPS AU LIT : mise au lit → sortie du lit
  AGD_PRELIT_MOY: number | null; // temps au lit avant extinction (minutes)
  AGD_TST_MOY: number | null; // temps de sommeil total moyen (minutes)
  AGD_EFF_MOY: number | null; // efficacité moyenne (%)
  AGD_LAT_MED: number; // latence médiane (minutes, centres de classe)
  AGD_WASO_MOY: number | null; // éveil nocturne cumulé moyen (minutes)
  AGD_TWAK_MOY: number | null; // éveil AU LIT après le réveil final (minutes)
  AGD_REV_MOY: number | null; // réveils nocturnes moyens par nuit (compte)
  AGD_REG_ECT: number; // régularité = écart-type du milieu de sommeil (minutes)
  AGD_QUAL_MOY: number; // qualité subjective moyenne (1..5)
  // — Fréquences : le critère clinique est un NOMBRE DE NUITS PAR SEMAINE, pas
  //   une moyenne. Une latence médiane de 22 min peut recouvrir quatre nuits à
  //   8 min et trois nuits à plus d'une heure — profil que la médiane efface.
  AGD_FREQ_LAT30_SEM: number | null; // nuits/semaine à latence > 30 min
  AGD_FREQ_WASO30_SEM: number | null; // nuits/semaine à éveil > 30 min
  AGD_FREQ_CRITERE_SEM: number | null; // nuits/semaine remplissant l'un OU l'autre
  // — Aide au sommeil : exposition, jamais un résultat. Comptée et affichée,
  //   jamais scorée (cf. `questions.ts`).
  AGD_NB_NUITS_AIDE: number | null; // nuits sous aide au sommeil
  // — Couverture, par métrique et non par nuit —
  AGD_NB_NUITS_TST: number; // nuits où le TST est estimable
  AGD_NB_NUITS_EFF: number; // nuits où l'efficacité l'est (TST + temps au lit)
  AGD_NB_NUITS_PRELIT: number; // nuits où le mode de coucher est connu
  AGD_NB_NUITS_REV: number; // nuits où le COMPTE de réveils est connu
  AGD_NB_NUITS_TWAK: number; // nuits où le mode de lever est connu
  AGD_NB_NUITS_FREQ: number; // nuits classables pour le seuil de 30 min
  AGD_NB_NUITS_AIDE_CONNU: number; // nuits où l'aide au sommeil est renseignée
  AGD_NB_NUITS_WE: number; // nuits de week-end retenues
  AGD_INDICE_ELIGIBLE: 1 | 0; // couverture suffisante pour l'indice composite
};

// ─── Primitives horaires ─────────────────────────────────────────────────────
// `dureeMinutes` vit dans `nuit.ts` (la validation en a besoin, et `agregats`
// importe déjà `nuit` — l'inverse fermerait un cycle). Réexportée ici : c'est
// d'ici que les appelants historiques l'importent.
export { dureeMinutes };

// Minutes écoulées depuis midi (ancrage anti-minuit : le sommeil ne traverse
// jamais midi, donc cette valeur est linéaire et comparable d'une nuit à l'autre).
export function minutesDepuisMidi(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m - 720 + 1440) % 1440;
}

// ─── Statistiques élémentaires ───────────────────────────────────────────────
function moyenne(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function mediane(xs: number[]): number {
  const tri = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(tri.length / 2);
  return tri.length % 2 === 0 ? (tri[mid - 1] + tri[mid]) / 2 : tri[mid];
}

// Écart-type d'ÉCHANTILLON (diviseur n−1). Le diviseur n sous-estime
// systématiquement la dispersion sur petit effectif, et la régularité est
// justement la dimension qui demande le plus de données : faire passer un
// patient irrégulier pour régulier est l'erreur à ne pas commettre ici.
function ecartType(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = moyenne(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

function arrondi(x: number, decimales = 0): number {
  const f = 10 ** decimales;
  return Math.round(x * f) / f;
}

// Moyenne d'une série éventuellement vide : `null` (métrique non couverte),
// jamais 0 — un 0 se lirait comme « zéro minute d'éveil », pas comme « inconnu ».
function moyenneOuNull(xs: number[], decimales = 0): number | null {
  return xs.length === 0 ? null : arrondi(moyenne(xs), decimales);
}

// ─── Dérivés d'une nuit ──────────────────────────────────────────────────────
type NuitDerivee = {
  dateNuit: string;
  fenetre: number; // extinction → sortie du lit (minutes) — toujours connue
  tib: number | null; // TEMPS AU LIT : mise au lit → sortie du lit — null si inconnu
  prelit: number | null; // temps au lit avant extinction — null si inconnu
  waso: number | null; // éveil nocturne cumulé — null si non renseigné (v1)
  twak: number | null; // éveil au lit après le réveil final — null si inconnu
  tst: number | null; // temps de sommeil total estimé — null si waso ou twak l'est
  efficacite: number | null; // % — null si le TST l'est
  latence: number; // centre de classe (minutes)
  nbReveils: number | null; // compte — null si non renseigné (facultatif en v2)
  milieu: number; // milieu de sommeil, minutes depuis midi
  qualite: number;
  aide: boolean | null; // aide au sommeil — null si non renseignée (v1)
  latenceAu30: boolean | null; // latence > 30 min — jamais indéterminée
  wasoAu30: boolean | null; // éveil > 30 min — null sur une classe héritée
};

function derivee(nuit: NuitAgregable): NuitDerivee {
  const { reponses } = nuit;
  // Fenêtre de sommeil : extinction → sortie du lit. Toujours connue, c'est elle
  // qui borne le sommeil. À ne pas confondre avec le temps au lit.
  const fenetre = dureeMinutes(reponses.heureCoucher, reponses.heureLever);

  // Temps au lit AVANT extinction : lecture, écrans, attente. C'est une conduite
  // distincte d'une latence d'endormissement longue, et elle appelle une réponse
  // différente — les confondre était le prix de l'ancre manquante.
  const prelitBrut =
    reponses.extinctionImmediate === true
      ? 0
      : reponses.extinctionImmediate === false && reponses.heureMiseAuLit !== undefined
        ? dureeMinutes(reponses.heureMiseAuLit, reponses.heureCoucher)
        : null;
  const prelit = prelitBrut !== null && prelitBrut > PRELIT_MAX_PLAUSIBLE ? null : prelitBrut;

  // TEMPS AU LIT au sens du consensus : mise au lit → sortie du lit. C'est le
  // dénominateur de l'efficacité. Inconnu tant que la mise au lit l'est — auquel
  // cas l'efficacité n'est pas calculée plutôt que calculée sur une fenêtre plus
  // courte, ce qui la rendrait flatteuse et incomparable.
  const tib = prelit === null ? null : fenetre + prelit;

  const latence = CENTRE_LATENCE[reponses.latence] ?? 0;
  const classeWaso = reponses.reveils?.dureeTotale;
  const waso = classeWaso === undefined ? null : (CENTRE_DUREE_REVEILS[classeWaso] ?? 0);

  // Temps passé éveillé AU LIT après le dernier réveil. `leverImmediat` vaut le
  // zéro explicite ; son absence (nuits v1) laisse la valeur inconnue plutôt que
  // nulle — c'est ce qui empêche de recompter ces minutes comme du sommeil.
  const twakBrut =
    reponses.leverImmediat === true
      ? 0
      : reponses.leverImmediat === false && reponses.heureReveilFinal !== undefined
        ? dureeMinutes(reponses.heureReveilFinal, reponses.heureLever)
        : null;
  const twak = twakBrut !== null && twakBrut > TWAK_MAX_PLAUSIBLE ? null : twakBrut;

  // TST = fenêtre de sommeil − endormissement − éveil nocturne − éveil du matin
  // au lit. Le temps passé au lit AVANT extinction n'en fait pas partie : le
  // patient ne cherchait pas encore à dormir. Il pèse en revanche sur
  // l'efficacité, via le dénominateur.
  const tst = waso === null || twak === null ? null : Math.max(0, fenetre - latence - waso - twak);
  const efficacite = tst === null || tib === null || tib <= 0 ? null : (tst / tib) * 100;

  return {
    dateNuit: nuit.dateNuit,
    fenetre,
    tib,
    prelit,
    waso,
    twak,
    tst,
    efficacite,
    latence,
    nbReveils: reponses.reveils?.nombre ?? null,
    // Milieu de sommeil : ancré sur l'extinction, pas sur la mise au lit — c'est
    // le rythme de SOMMEIL que la régularité mesure, pas celui du coucher.
    milieu: minutesDepuisMidi(reponses.heureCoucher) + fenetre / 2,
    qualite: reponses.qualite,
    aide: reponses.aideSommeil === undefined ? null : reponses.aideSommeil === 'prise',
    latenceAu30: reponses.latence === 'e30_60' || reponses.latence === 'gt60',
    wasoAu30:
      classeWaso === undefined || !CLASSABLE_POUR_30.has(classeWaso)
        ? null
        : AU_DELA_DE_30.has(classeWaso),
  };
}

// Horaires habituels du patient — position d'ouverture des poignées du cadran.
// C'est une SUGGESTION affichée en pointillé, jamais une valeur enregistrée : le
// patient doit toucher chaque poignée pour qu'elle compte (cf. `CadranNuit`).
//
// Médiane et non moyenne : une nuit blanche ne doit pas déplacer le repère de
// tout le monde. Calcul ancré à midi (`minutesDepuisMidi`), sans quoi 23:45 et
// 00:15 se médianiseraient vers midi au lieu de minuit.
export function horairesHabituels(
  nuits: NuitAgregable[],
  defauts: { extinction: string; sortie: string } = { extinction: '23:00', sortie: '07:00' },
): { extinction: string; sortie: string } {
  const plausibles = nuits.filter(estPlausible);
  if (plausibles.length === 0) return defauts;
  const versHeure = (depuisMidi: number): string => {
    const m = (Math.round(depuisMidi / 15) * 15 + 720) % 1440;
    const p = (x: number) => String(x).padStart(2, '0');
    return `${p(Math.floor(m / 60))}:${p(m % 60)}`;
  };
  return {
    extinction: versHeure(
      mediane(plausibles.map((n) => minutesDepuisMidi(n.reponses.heureCoucher))),
    ),
    sortie: versHeure(mediane(plausibles.map((n) => minutesDepuisMidi(n.reponses.heureLever)))),
  };
}

// Nuit plausible = FENÊTRE DE SOMMEIL dans [120, 960] minutes. Le critère porte
// sur la fenêtre et non sur le temps au lit : la fenêtre est toujours connue,
// alors que le temps au lit manque aux nuits d'avant la mise au lit — le seuil
// resterait sinon inapplicable à l'historique.
function estPlausible(nuit: NuitAgregable): boolean {
  const tib = dureeMinutes(nuit.reponses.heureCoucher, nuit.reponses.heureLever);
  return tib >= TIB_MIN_PLAUSIBLE && tib <= TIB_MAX_PLAUSIBLE;
}

// Nombre de nuits plausibles (sert au seuil d'agrégation et à la note « recueil
// transmis sans agrégation »).
export function compterNuitsPlausibles(nuits: NuitAgregable[]): number {
  return nuits.filter(estPlausible).length;
}

// L'indice composite /100 est-il calculable ? Un COMPTE ne suffit pas : quatorze
// nuits toutes ouvrables donnent une régularité excellente et fausse, puisque
// c'est le week-end qui fait dériver les horaires. D'où la double condition.
export function couvertureSuffisante(nuits: NuitAgregable[]): boolean {
  const plausibles = nuits.filter(estPlausible);
  if (plausibles.length < MIN_NUITS_INDICE) return false;
  return plausibles.filter((n) => estWeekend(n.dateNuit)).length >= MIN_NUITS_WEEKEND_INDICE;
}

// Agrège les nuits plausibles. Retourne `null` sous le seuil `MIN_NUITS_AGREGATS`
// (jamais un objet à zéros — l'absence d'agrégat est distincte d'un mauvais
// sommeil, cf. doctrine « trou, jamais 0 »). Au-dessus du seuil, chaque métrique
// porte sa propre couverture : une métrique sans nuit exploitable vaut `null`.
export function calculerAgregats(nuits: NuitAgregable[]): AgregatsAgenda | null {
  const retenues = nuits.filter(estPlausible);
  if (retenues.length < MIN_NUITS_AGREGATS) return null;
  const plausibles = retenues.map(derivee);

  // Sous-ensembles par métrique — c'est ici que « pas répondu » cesse d'être 0.
  const avecTst = plausibles.filter((n): n is NuitDerivee & { tst: number } => n.tst !== null);
  const avecEff = plausibles.filter(
    (n): n is NuitDerivee & { efficacite: number } => n.efficacite !== null,
  );
  const avecTib = plausibles.filter((n): n is NuitDerivee & { tib: number } => n.tib !== null);
  const avecPrelit = plausibles.filter(
    (n): n is NuitDerivee & { prelit: number } => n.prelit !== null,
  );
  const avecWaso = plausibles.filter((n): n is NuitDerivee & { waso: number } => n.waso !== null);
  const avecTwak = plausibles.filter((n): n is NuitDerivee & { twak: number } => n.twak !== null);
  const avecRev = plausibles.filter(
    (n): n is NuitDerivee & { nbReveils: number } => n.nbReveils !== null,
  );
  const avecAide = plausibles.filter((n): n is NuitDerivee & { aide: boolean } => n.aide !== null);
  // Fréquence : une nuit n'y compte que si les DEUX critères sont tranchables.
  // Une classe d'éveil héritée rend la nuit indéterminée — elle sort du calcul
  // plutôt que d'être rangée arbitrairement au-dessus ou au-dessous de 30 min.
  const classables = plausibles.filter(
    (n): n is NuitDerivee & { wasoAu30: boolean; latenceAu30: boolean } => n.wasoAu30 !== null,
  );
  // Taux hebdomadaire : on ramène le compte au nombre de nuits réellement
  // classables, pas aux 21 emplacements — sinon un recueil incomplet paraîtrait
  // toujours plus sain qu'il n'est.
  const parSemaine = (compte: number, sur: number): number | null =>
    sur === 0 ? null : arrondi((compte / sur) * JOURS_SEMAINE, 1);

  return {
    AGD_NB_NUITS: plausibles.length,
    AGD_FENETRE_MOY: arrondi(moyenne(plausibles.map((n) => n.fenetre))),
    AGD_TIB_MOY: moyenneOuNull(avecTib.map((n) => n.tib)),
    AGD_PRELIT_MOY: moyenneOuNull(avecPrelit.map((n) => n.prelit)),
    AGD_TST_MOY: moyenneOuNull(avecTst.map((n) => n.tst)),
    AGD_EFF_MOY: moyenneOuNull(avecEff.map((n) => n.efficacite)),
    AGD_LAT_MED: arrondi(mediane(plausibles.map((n) => n.latence))),
    AGD_WASO_MOY: moyenneOuNull(avecWaso.map((n) => n.waso)),
    AGD_TWAK_MOY: moyenneOuNull(avecTwak.map((n) => n.twak)),
    AGD_REV_MOY: moyenneOuNull(
      avecRev.map((n) => n.nbReveils),
      1,
    ),
    AGD_REG_ECT: arrondi(ecartType(plausibles.map((n) => n.milieu))),
    AGD_QUAL_MOY: arrondi(moyenne(plausibles.map((n) => n.qualite)), 1),
    // La latence est obligatoire depuis la v1 et ses bornes ont toujours inclus
    // 30 min : elle est tranchable sur TOUTES les nuits, y compris héritées. La
    // faire partager le dénominateur de l'éveil la rendait `null` sur une
    // cohorte 100 % v1, alors que la réponse était connue.
    AGD_FREQ_LAT30_SEM: parSemaine(
      plausibles.filter((n) => n.latenceAu30).length,
      plausibles.length,
    ),
    AGD_FREQ_WASO30_SEM: parSemaine(
      classables.filter((n) => n.wasoAu30).length,
      classables.length,
    ),
    // Le critère combiné exige les DEUX grandeurs : il se limite donc aux nuits
    // où l'éveil est lui aussi classable.
    AGD_FREQ_CRITERE_SEM: parSemaine(
      classables.filter((n) => n.latenceAu30 || n.wasoAu30).length,
      classables.length,
    ),
    AGD_NB_NUITS_AIDE: avecAide.length === 0 ? null : avecAide.filter((n) => n.aide).length,
    AGD_NB_NUITS_TST: avecTst.length,
    AGD_NB_NUITS_EFF: avecEff.length,
    AGD_NB_NUITS_PRELIT: avecPrelit.length,
    AGD_NB_NUITS_REV: avecRev.length,
    AGD_NB_NUITS_TWAK: avecTwak.length,
    AGD_NB_NUITS_FREQ: classables.length,
    AGD_NB_NUITS_AIDE_CONNU: avecAide.length,
    AGD_NB_NUITS_WE: retenues.filter((n) => estWeekend(n.dateNuit)).length,
    AGD_INDICE_ELIGIBLE: couvertureSuffisante(nuits) ? 1 : 0,
  };
}
