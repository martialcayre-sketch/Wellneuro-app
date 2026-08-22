// L'objectif négocié (Alliance 6.0-A, LOT-02) — domaine PUR, aucune
// dépendance Prisma.
//
// Un objectif négocié est ce que le praticien et le patient ont MIS D'ACCORD :
// l'énoncé du patient (ses mots), la reformulation du praticien (sa
// compréhension), la priorité retenue, et ce qui est assumé « non traité pour
// l'instant » — daté et motivé. Ce n'est ni un score, ni un diagnostic, ni un
// classement : `DC-27` (score ≠ diagnostic), `DC-31`/`DC-32` (diagnostic,
// hypothèse et orientation sont trois objets distincts) et `DC-19`/`DC-20`
// (aucun seuil ni poids inventé) valent ici comme partout ailleurs. Les gardes
// structurelles de `objectifNegocie.guard.test.ts` les rendent opposables.
//
// APPEND-ONLY PAR RÉFÉRENCE : une révision est une NOUVELLE ligne portant
// `supersedesObjectifId`. Rien ne s'écrase, rien ne se supprime — la
// trajectoire de la négociation reste lisible en entier (invariant de
// campagne, patron `relectureNote.ts`).
//
// DEUX DATES, jamais confondues. `negocieLe` (le moment où l'accord a été
// pris) et `nonTraiteDepuisLe` (le moment depuis lequel quelque chose est
// assumé non traité) sont des DONNÉES portées par l'appelant. La date
// d'ÉCRITURE, elle, n'apparaît **nulle part** dans ce que ce module prépare
// pour la base : c'est `@default(now())` qui la pose. C'est précisément ce qui
// rend une ligne d'objectif structurellement inantidatable — un praticien ne
// peut pas se donner rétroactivement un accord qu'il n'avait pas.

/**
 * Bornes de longueur. TOUTES sont des bornes TECHNIQUES de saisie, aucune n'a
 * de sémantique clinique (`DC-19`/`DC-20` : un chiffre purement technique doit
 * être identifié comme tel). Chacune se justifie par rapport au précédent déjà
 * arbitré dans le dépôt, jamais par un nombre choisi au hasard.
 */

/** L'énoncé du patient : même borne qu'une note de relecture
 *  (`LONGUEUR_MAX_NOTE = 4000`, `relectureNote.ts:20`). Au-delà, ce n'est plus
 *  ce que le patient demande, c'est un compte rendu de consultation. */
export const LONGUEUR_MAX_ENONCE = 4000;

/** La reformulation : MÊME borne que l'énoncé, et c'est délibéré — une
 *  reformulation qui devrait être plus longue que ce qu'elle reformule n'est
 *  plus une reformulation. */
export const LONGUEUR_MAX_REFORMULATION = 4000;

/** La priorité : même borne qu'un libellé de médecin
 *  (`LONGUEUR_MAX_MEDECIN_LIBELLE = 200`, `correspondanceMedecin.ts:27`). Elle
 *  est un LIBELLÉ LIBRE — une ligne, pas un paragraphe — et surtout jamais un
 *  rang : `schema.prisma:1955-1957` dit que le jour où quelqu'un veut la
 *  trier, c'est la doctrine qu'il faut rouvrir, pas cette constante. */
export const LONGUEUR_MAX_PRIORITE = 200;

/** Le motif du « non traité pour l'instant » : la MOITIÉ de l'énoncé (4000).
 *  Assumer de ne pas traiter quelque chose se justifie en quelques
 *  paragraphes ; au-delà, la justification appartient à la synthèse de
 *  compréhension (LOT-04), pas à ce champ. */
export const LONGUEUR_MAX_MOTIF = 2000;

/**
 * LA TOLÉRANCE D'UN JOUR N'EST PAS DU CONFORT — mécanique recopiée de
 * `api/praticien/biologie/proposition/route.ts:180`.
 *
 * `<input type="date">` rend « 2026-08-22 », que `new Date()` lit en UTC
 * minuit. À 00 h 30 à Paris, c'est 22 h 30 UTC la veille : la date DU JOUR
 * serait refusée comme future, chaque nuit, pendant une à deux heures selon la
 * saison — avec un message faux. La borne vise une saisie d'année (2027 pour
 * 2026), pas un décalage de fuseau ; un jour de marge la tient sans rien
 * laisser passer de ce qu'elle vise.
 */
export const TOLERANCE_FUSEAU_MS = 24 * 60 * 60 * 1000;

export type RefusObjectif =
  | 'enonce_absent'
  | 'enonce_trop_long'
  | 'reformulation_trop_longue'
  | 'priorite_trop_longue'
  | 'motif_trop_long'
  | 'non_traite_incomplet'
  | 'date_invalide'
  | 'date_future';

/**
 * Ce qui part en base. AUCUNE date d'écriture : c'est délibéré et c'est
 * l'invariant du lot — `creeLe` est posé par `@default(now())`, jamais
 * transmis. Une ligne d'objectif ne peut structurellement pas être antidatée.
 * Garde : `objectifs/route.test.ts` (« deux dates »).
 */
export type DonneesObjectif = {
  idPatient: string;
  praticienEmail: string;
  enoncePatient: string;
  reformulationPraticien: string | null;
  priorite: string | null;
  nonTraiteMotif: string | null;
  nonTraiteDepuisLe: Date | null;
  negocieLe: Date | null;
  supersedesObjectifId: string | null;
};

export type PreparationObjectif =
  | { ok: true; donnees: DonneesObjectif }
  | { ok: false; raison: RefusObjectif };

export type EntreeObjectif = {
  idPatient: string;
  praticienEmail: string;
  enoncePatient: string | null | undefined;
  reformulationPraticien: string | null | undefined;
  priorite: string | null | undefined;
  nonTraiteMotif: string | null | undefined;
  nonTraiteDepuisLe: string | null | undefined;
  negocieLe: string | null | undefined;
  supersedesObjectifId?: string | null;
};

/**
 * La ligne visée par une révision, TELLE QUE LA ROUTE L'A VÉRIFIÉE (existence
 * et appartenance au même dossier). Elle n'est pas lue ici : ce module est
 * pur, il reçoit le résultat de la vérification, il ne la fait pas.
 */
export type CibleObjectif = { enoncePatient: string };

/** Texte utile d'un champ facultatif : vide ⇒ `null`, jamais chaîne vide. */
function texteFacultatif(brut: string | null | undefined): string | null {
  const valeur = (brut ?? '').trim();
  return valeur.length === 0 ? null : valeur;
}

type LectureDate =
  | { ok: true; date: Date | null }
  | { ok: false; raison: 'date_invalide' | 'date_future' };

/**
 * Une date d'ÉVÉNEMENT : facultative (les colonnes sont nullables par
 * construction), refusée si illisible, refusée si future au-delà de la
 * tolérance de fuseau. Pas de borne passée : un accord peut avoir été pris il
 * y a des mois, et inventer une ancienneté maximale serait un seuil.
 */
function lireDateEvenement(brut: string | null | undefined): LectureDate {
  const valeur = (brut ?? '').trim();
  if (valeur.length === 0) return { ok: true, date: null };

  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return { ok: false, raison: 'date_invalide' };
  if (date.getTime() > Date.now() + TOLERANCE_FUSEAU_MS) return { ok: false, raison: 'date_future' };
  return { ok: true, date };
}

/**
 * Valide un objectif et prépare ses données d'écriture.
 *
 * `cible` n'est fournie QUE pour une révision, et seulement après que la route
 * a vérifié que la ligne visée existe et appartient au même dossier. L'énoncé
 * du patient est alors RECOPIÉ depuis elle, jamais repris du corps de la
 * requête : `enonce_patient` est NOT NULL non vide sur chaque ligne
 * (`migration.sql:133-135`), et laisser l'appelant le réécrire à chaque
 * révision permettrait de faire dire au patient, ligne après ligne, autre
 * chose que ce qu'il a dit.
 */
export function preparerObjectif(entree: EntreeObjectif, cible?: CibleObjectif): PreparationObjectif {
  let enoncePatient: string;
  if (cible) {
    enoncePatient = cible.enoncePatient;
  } else {
    enoncePatient = (entree.enoncePatient ?? '').trim();
    if (enoncePatient.length === 0) return { ok: false, raison: 'enonce_absent' };
    if (enoncePatient.length > LONGUEUR_MAX_ENONCE) return { ok: false, raison: 'enonce_trop_long' };
  }

  // REFUS, JAMAIS TRONCATURE. Tronquer un énoncé de patient ou une
  // reformulation de praticien produirait une phrase que personne n'a écrite,
  // rangée dans le dossier comme si elle avait été dite.
  const reformulationPraticien = texteFacultatif(entree.reformulationPraticien);
  if (reformulationPraticien && reformulationPraticien.length > LONGUEUR_MAX_REFORMULATION) {
    return { ok: false, raison: 'reformulation_trop_longue' };
  }

  const priorite = texteFacultatif(entree.priorite);
  if (priorite && priorite.length > LONGUEUR_MAX_PRIORITE) {
    return { ok: false, raison: 'priorite_trop_longue' };
  }

  const nonTraiteMotif = texteFacultatif(entree.nonTraiteMotif);
  if (nonTraiteMotif && nonTraiteMotif.length > LONGUEUR_MAX_MOTIF) {
    return { ok: false, raison: 'motif_trop_long' };
  }

  const negocieLe = lireDateEvenement(entree.negocieLe);
  if (!negocieLe.ok) return { ok: false, raison: negocieLe.raison };

  const nonTraiteDepuisLe = lireDateEvenement(entree.nonTraiteDepuisLe);
  if (!nonTraiteDepuisLe.ok) return { ok: false, raison: nonTraiteDepuisLe.raison };

  // APPARIEMENT : « non traité pour l'instant » n'est un renoncement assumé
  // que s'il porte les DEUX — depuis quand, et pourquoi. Un motif sans date ne
  // se relit pas (« depuis toujours ? »), une date sans motif accuse sans
  // expliquer. RIEN EN BASE NE LE PORTE : les deux colonnes sont nullables
  // indépendamment (`migration.sql:120-146` — les CHECK métier de cette table
  // visent l'auteur et l'énoncé, pas ce couple), donc l'appariement vit ici ou
  // nulle part.
  if ((nonTraiteMotif === null) !== (nonTraiteDepuisLe.date === null)) {
    return { ok: false, raison: 'non_traite_incomplet' };
  }

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      praticienEmail: entree.praticienEmail,
      enoncePatient,
      reformulationPraticien,
      priorite,
      nonTraiteMotif,
      nonTraiteDepuisLe: nonTraiteDepuisLe.date,
      negocieLe: negocieLe.date,
      supersedesObjectifId: entree.supersedesObjectifId ?? null,
    },
  };
}

export type LigneObjectif = {
  id: string;
  supersedesObjectifId: string | null;
  creeLe: Date;
};

/**
 * Objectifs courants = TOUTES les têtes de chaîne (aucune autre ligne ne les
 * supplante), de la plus récente à la plus ancienne.
 *
 * CETTE FONCTION REND UN TABLEAU, ET C'EST LE POINT. La protection
 * « lecture-puis-409 » de la route n'est pas étanche à la course : deux
 * reformulations concurrentes de la même ligne peuvent toutes deux passer la
 * lecture et créer deux têtes. Départager en silence — garder « la plus
 * récente » — ferait disparaître une reformulation de praticien sans qu'aucune
 * erreur ne le dise. Une discordance se SIGNALE, elle ne se moyenne ni ne se
 * supprime (`DC-30`) : c'est l'écran qui affiche les deux têtes et le dit.
 *
 * Les lignes supplantées ne sont pas supprimées : elles sortent de cette
 * liste, pas de la base — `chaineDObjectif` les relit.
 */
export function objectifsCourants<T extends LigneObjectif>(lignes: T[]): T[] {
  const supplantees = new Set(
    lignes.map((ligne) => ligne.supersedesObjectifId).filter((id): id is string => id !== null),
  );
  return lignes
    .filter((ligne) => !supplantees.has(ligne.id))
    .sort((gauche, droite) => {
      // Tri par date d'ÉCRITURE, jamais par priorité : la priorité est un
      // libellé libre, l'ordonner en ferait un rang (`DC-19`/`DC-20`).
      const delta = droite.creeLe.getTime() - gauche.creeLe.getTime();
      if (delta !== 0) return delta;
      return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
    });
}

/**
 * Chaîne complète d'un objectif, de la version demandée vers ses versions
 * antérieures. C'est ce qui donne son sens à « append-only » : reformuler
 * n'efface rien, la version précédente reste lisible.
 *
 * Le `Set` anti-cycle n'est pas une précaution de style : la référence
 * `supersedes_objectif_id` est SOUPLE, sans clé étrangère (`schema.prisma:1942-1945`).
 * Rien en base n'empêche A → B → A, et une remontée naïve bouclerait sans fin
 * sur une simple lecture de dossier.
 */
export function chaineDObjectif<T extends LigneObjectif>(lignes: T[], id: string): T[] {
  const parId = new Map(lignes.map((ligne) => [ligne.id, ligne]));
  const chaine: T[] = [];
  const vues = new Set<string>();
  let courant = parId.get(id);
  while (courant && !vues.has(courant.id)) {
    vues.add(courant.id);
    chaine.push(courant);
    courant = courant.supersedesObjectifId ? parId.get(courant.supersedesObjectifId) : undefined;
  }
  return chaine;
}

/**
 * L'état de ratification d'UNE version précise d'objectif.
 *
 * `en_attente` est l'état par défaut et il ne dit RIEN du patient : le geste de
 * ratification n'existe pas encore (il arrive au LOT-06). Une donnée absente
 * n'est ni zéro ni un refus (`DC-24`) — l'écran doit dire « pas encore proposé
 * au patient », jamais « non ratifié ».
 */
export type EtatRatification = 'en_attente' | 'ratifie' | 'conteste';

export type LigneRatification = {
  id: string;
  idObjectif: string;
  sens: string;
  creeLe: Date;
};

/**
 * DERNIER GESTE, JAMAIS UNE MOYENNE ni un décompte. Un patient qui ratifie
 * puis conteste a contesté : compter les lignes, ou faire primer la majorité,
 * effacerait le changement d'avis — une discordance se signale, elle ne se
 * moyenne pas (`DC-30`). Le tri est celui d'`objectifsCourants` : `creeLe`
 * décroissant, l'identifiant départageant les ex aequo pour que la lecture
 * soit déterministe.
 */
export function etatRatification(
  idObjectif: string,
  ratifications: LigneRatification[],
): EtatRatification {
  const dernier = ratifications
    .filter((ligne) => ligne.idObjectif === idObjectif)
    .sort((gauche, droite) => {
      const delta = droite.creeLe.getTime() - gauche.creeLe.getTime();
      if (delta !== 0) return delta;
      return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
    })[0];

  if (!dernier) return 'en_attente';
  // La taxonomie de geste est tenue par un CHECK en base
  // (`migration.sql:144-146`, deux valeurs) ; une valeur hors taxonomie ne peut
  // pas exister, et si elle existait, la lire comme un geste serait pire que
  // de la taire.
  if (dernier.sens === 'ratifie') return 'ratifie';
  if (dernier.sens === 'conteste') return 'conteste';
  return 'en_attente';
}

// ── LE GESTE DU PATIENT (LOT-06) ────────────────────────────────────────────
//
// Ce qui précède LIT la ratification ; ce qui suit la PRÉPARE. Le LOT-02 a
// délibérément laissé ce trou et l'a verrouillé par une garde structurelle :
// une route praticien qui créerait une ligne de ratification fabriquerait un
// acte que le patient n'a pas posé.

/**
 * Les deux seuls gestes, et ils ne sont pas symétriques d'un point de vue
 * clinique : ratifier dit « c'est bien ça », contester dit « ce n'est pas
 * exactement ça ». AUCUN TROISIÈME — et surtout pas un « ne se prononce pas »,
 * qui transformerait un silence en réponse (`DC-24`). Un patient qui ne
 * répond pas n'a pas de ligne, et `etatRatification` rend `en_attente`.
 *
 * La liste double le CHECK de `migration.sql:144-146`. Ce n'est pas une
 * redondance décorative : le CHECK est un FILET, pas une validation. Sans ce
 * contrôle en TypeScript, une valeur hors taxonomie ne serait pas refusée
 * proprement — elle remonterait en erreur Prisma, donc en 500, pour ce qui est
 * une requête malformée.
 */
export const SENS_RATIFICATION = ['ratifie', 'conteste'] as const;

export type SensRatification = (typeof SENS_RATIFICATION)[number];

export type RefusRatification = 'objectif_absent' | 'sens_invalide';

/**
 * Ce qui part en base. AUCUNE DATE — ni `gesteLe`, ni `creeLe` — et les deux
 * absences n'ont pas le même motif.
 *
 * `creeLe` est posée par `@default(now())`, comme partout dans la campagne :
 * c'est ce qui rend une ratification inantidatable.
 *
 * `gesteLe` RESTE NULLE, et c'est un choix, pas un oubli. La colonne est celle
 * d'une DÉCLARATION (`migration.sql:11-15`, même rôle que `negocieLe` pour un
 * objectif ou `saisiLe` pour une entrée « ce qui compte ») : elle porte une
 * date que quelqu'un AFFIRME, pas celle où la ligne a été écrite. Or le patient
 * ne déclare rien ici — il clique. La renseigner depuis l'horloge du serveur en
 * ferait une déclaration qu'il n'a pas faite, et elle ne pourrait de toute
 * façon jamais différer de `creeLe` : cette route est le seul écrivain, l'écart
 * serait de quelques millisecondes. Une colonne qui ne peut que dupliquer sa
 * voisine en prétendant dire autre chose est pire qu'une colonne vide — c'est
 * la même faute que combler une date de saisie absente par la date d'écriture.
 *
 * La lire depuis le corps de la requête reste exclu : ce serait donner au
 * client un moyen d'antidater son propre geste.
 */
export type DonneesRatification = {
  idPatient: string;
  idObjectif: string;
  sens: SensRatification;
};

export type PreparationRatification =
  | { ok: true; donnees: DonneesRatification }
  | { ok: false; raison: RefusRatification };

export type EntreeRatification = {
  idPatient: string;
  idObjectif: string | null | undefined;
  sens: string | null | undefined;
};

/**
 * Prépare UNE ligne de ratification. Elle ne remplace jamais rien : un
 * changement d'avis est une ligne de plus, et `etatRatification` lit le dernier
 * geste. Il n'existe aucun verbe pour retirer une ratification — publier un
 * accord engage, se raviser se dit en le disant, pas en l'effaçant.
 *
 * Ce module est PUR : il ne vérifie pas que `idObjectif` existe, appartient au
 * dossier, ou est une tête de chaîne. `id_objectif` n'a pas de clé étrangère
 * (référence souple assumée par `migration.sql:17-20`) : ces trois
 * vérifications appartiennent à la route, qui seule lit la base.
 */
export function preparerRatification(entree: EntreeRatification): PreparationRatification {
  const idObjectif = (entree.idObjectif ?? '').trim();
  if (idObjectif.length === 0) return { ok: false, raison: 'objectif_absent' };

  const sens = (entree.sens ?? '').trim();
  if (!(SENS_RATIFICATION as readonly string[]).includes(sens)) {
    return { ok: false, raison: 'sens_invalide' };
  }

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      idObjectif,
      sens: sens as SensRatification,
    },
  };
}
