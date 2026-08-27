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
  /**
   * La proposition dont cet objectif est la REPRISE, si c'en est une
   * (Alliance 6.0-B, LOT-03). `null` pour tout objectif rédigé de la main du
   * praticien — l'immense majorité, et jamais un défaut à combler.
   *
   * Référence SOUPLE, sans clé étrangère (patron `supersedesObjectifId`,
   * `schema.prisma`) : c'est la ROUTE qui prouve que la proposition existe,
   * appartient au dossier et se laisse encore reprendre. Ce module est pur, il
   * ne lit rien.
   */
  sourcePropositionId: string | null;
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
  sourcePropositionId?: string | null;
};

/**
 * L'ÉNONCÉ QUI NE VIENT PAS DU CORPS DE LA REQUÊTE, tel que la route l'a
 * établi. Il n'est pas lu ici : ce module est pur, il reçoit le résultat de la
 * vérification, il ne la fait pas.
 *
 * TROIS ORIGINES, ET ELLES NE SE VALIDENT PAS PAREIL.
 *
 * `revision` — l'énoncé est RECOPIÉ d'une ligne d'objectif existante. Sa
 * longueur ne se rejuge pas : le texte est déjà dans la table, l'avoir accepté
 * une fois engage. Le rejuger ferait qu'une ligne acceptée hier rendrait
 * INREFORMULABLE l'objectif qu'elle porte, le jour où une borne changerait.
 *
 * `reprise` — l'énoncé est recopié d'un FRAGMENT DE PROPOSITION (Alliance
 * 6.0-B, LOT-03), donc d'une citation d'anamnèse. Il entre dans la table pour
 * la PREMIÈRE fois, et rien en amont ne l'a borné : `depuisAnamnese` ne pose
 * aucune longueur maximale, un champ d'anamnèse très long produirait un
 * verbatim très long. Sa longueur se vérifie donc comme celle d'une saisie —
 * par REFUS, jamais par troncature.
 *
 * `amendement` — l'énoncé est recopié de ce que le PATIENT a écrit lui-même au
 * portail (`amendements_objectif`, Alliance 6.0-B, LOT-04, `D-110`). C'est la
 * seule origine dont le texte n'a jamais transité par un clavier de praticien,
 * et c'est ce qui la rend admissible : `enoncePatient` ne se pré-remplit que
 * par citation verbatim de ce que le patient a écrit (`D-094`). Il entre lui
 * aussi dans `objectifs_negocies` pour la première fois — sa longueur s'y
 * vérifie donc comme celle d'une saisie, même si `LONGUEUR_MAX_AMENDEMENT` l'a
 * déjà bornée en amont : deux bornes qui coïncident aujourd'hui n'ont aucune
 * raison de coïncider demain.
 */
export type CibleObjectif = {
  enoncePatient: string;
  origine: 'revision' | 'reprise' | 'amendement';
};

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
    // Une REPRISE et un AMENDEMENT font entrer le texte dans la table pour la
    // première fois : ils se bornent comme une saisie. Une RÉVISION, elle,
    // recopie ce qui y est déjà. La condition est écrite « tout sauf
    // `revision` » et non « `reprise` ou `amendement` » : une quatrième origine
    // ajoutée un jour serait alors bornée par défaut, au lieu d'échapper en
    // silence à la seule vérification qui protège la colonne.
    if (cible.origine !== 'revision' && enoncePatient.length > LONGUEUR_MAX_ENONCE) {
      return { ok: false, raison: 'enonce_trop_long' };
    }
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
      sourcePropositionId: entree.sourcePropositionId ?? null,
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
 * L'état d'UNE version précise d'objectif, tel que le patient l'a laissé.
 *
 * `en_attente` est l'état par défaut et il ne dit RIEN du patient : il ne s'est
 * pas prononcé. Une donnée absente n'est ni zéro ni un refus (`DC-24`) —
 * l'écran doit dire « pas encore proposé au patient », jamais « non ratifié ».
 *
 * `dit_autrement` (Alliance 6.0-B, LOT-04, `D-110`) N'EST PAS UNE CONTESTATION,
 * et le type le porte plutôt qu'un commentaire d'écran : le patient n'a pas dit
 * « ce n'est pas exactement ça », il a écrit SA version. Le replier sur
 * `conteste` ferait lire un désaccord là où il y a une proposition ; le replier
 * sur `en_attente` effacerait un geste qu'il a bel et bien posé.
 *
 * LE NOM DU TYPE RESTE `EtatRatification` alors qu'il couvre désormais deux
 * tables. Le renommer toucherait les deux routes, les deux écrans et leurs
 * bancs pour un gain de vocabulaire — ce que « changements minimaux » exclut.
 */
export type EtatRatification = 'en_attente' | 'ratifie' | 'conteste' | 'dit_autrement';

export type LigneRatification = {
  id: string;
  idObjectif: string;
  sens: string;
  creeLe: Date;
};

/** Un amendement, vu par la dérivation d'état : son TEXTE n'y entre pas — ce
 *  qui compte ici est qu'un geste ait été posé, et quand. */
export type LigneAmendement = {
  id: string;
  idObjectif: string;
  creeLe: Date;
};

/** Tri partagé : `creeLe` décroissant, l'identifiant départageant les ex aequo
 *  pour que la lecture soit déterministe (patron `objectifsCourants`). */
function plusRecentDAbord(
  gauche: { id: string; creeLe: Date },
  droite: { id: string; creeLe: Date },
): number {
  const delta = droite.creeLe.getTime() - gauche.creeLe.getTime();
  if (delta !== 0) return delta;
  return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
}

/**
 * DERNIER GESTE, JAMAIS UNE MOYENNE ni un décompte. Un patient qui ratifie
 * puis conteste a contesté : compter les lignes, ou faire primer la majorité,
 * effacerait le changement d'avis — une discordance se signale, elle ne se
 * moyenne pas (`DC-30`).
 *
 * LES DEUX TABLES SE LISENT ENSEMBLE, ET C'EST L'INVARIANT DU LOT-04. Ratifier
 * puis dire autrement, ou dire autrement puis ratifier, sont deux trajectoires
 * différentes ; les classer chacune dans sa table et lire la sienne rendrait
 * « ratifié » à un patient qui vient d'écrire autre chose. `amendements` est
 * facultatif pour les appelants qui n'en lisent pas — mais un appelant qui SERT
 * l'état au patient ou au praticien doit les passer, et les bancs de route le
 * vérifient.
 */
export function etatRatification(
  idObjectif: string,
  ratifications: LigneRatification[],
  amendements: LigneAmendement[] = [],
): EtatRatification {
  // LE GESTE HORS TAXONOMIE N'EST PAS ÉCARTÉ, IL EST TRADUIT EN SILENCE — et la
  // nuance est tout sauf cosmétique (relevé en revue au LOT-04).
  //
  // La taxonomie est tenue par un CHECK en base (`migration.sql:144-146`, deux
  // valeurs) : une valeur inconnue ne peut pas exister aujourd'hui. Mais si le
  // CHECK s'élargissait un jour sans que ce module bouge — `retire`, `annule` —,
  // FILTRER ces lignes AVANT le tri ferait remonter le geste PRÉCÉDENT à la
  // surface, et le cockpit afficherait « Ratifié par le patient » à un praticien
  // dont le patient vient de se rétracter. Les garder dans le tri et les rendre
  // `en_attente` ne dit rien du patient, ce qui est la seule chose vraie quand on
  // ne comprend pas son geste (`DC-24`).
  //
  // C'est la sémantique d'avant le LOT-04, préservée mot pour mot : le dernier
  // geste est choisi D'ABORD, la lecture vient ensuite.
  const gestes: { id: string; creeLe: Date; etat: EtatRatification }[] = [
    ...ratifications
      .filter((ligne) => ligne.idObjectif === idObjectif)
      .map((ligne) => ({
        id: ligne.id,
        creeLe: ligne.creeLe,
        etat:
          ligne.sens === 'ratifie'
            ? ('ratifie' as const)
            : ligne.sens === 'conteste'
              ? ('conteste' as const)
              : ('en_attente' as const),
      })),
    ...amendements
      .filter((ligne) => ligne.idObjectif === idObjectif)
      .map((ligne) => ({ id: ligne.id, creeLe: ligne.creeLe, etat: 'dit_autrement' as const })),
  ];

  const dernier = gestes.sort(plusRecentDAbord)[0];
  return dernier ? dernier.etat : 'en_attente';
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

// ── « LE DIRE AUTREMENT » (Alliance 6.0-B, LOT-04, `D-110`) ─────────────────
//
// Le TROISIÈME verbe du patient. À côté de « c'est bien ça » et « ce n'est pas
// exactement ça », il écrit SA version de l'objectif — dans ses mots, sur la
// version exacte qu'on lui a servie.
//
// TABLE PROPRE, pas un `sens` de plus sur la ratification (`D-094` §2) : un
// amendement porte un texte, une ratification n'en porte pas. Le reste du
// régime est identique — append-only, écrivain unique au portail, version
// exacte référencée, jamais compté ni noté.
//
// CE N'EST NI UN ACCORD NI UN REFUS, et rien ici ne le range dans l'un ou
// l'autre : `etatRatification` rend `dit_autrement`, un état à part entière.

/**
 * La borne du texte : MÊME valeur que `LONGUEUR_MAX_ENONCE` (4 000), et le
 * motif n'est pas la commodité — un amendement EST un énoncé de patient, celui
 * qu'il aurait écrit si on le lui avait demandé. Lui donner une borne plus
 * courte dirait que sa version compte moins que celle qu'on lui propose ; plus
 * longue, qu'elle en est autre chose. Borne TECHNIQUE de saisie, sans aucune
 * sémantique clinique (`DC-19`/`DC-20`).
 *
 * Elle est déclarée à part plutôt qu'aliasée sur `LONGUEUR_MAX_ENONCE` : le
 * jour où l'une des deux bouge, l'autre ne doit pas suivre sans que quelqu'un
 * l'ait voulu.
 */
export const LONGUEUR_MAX_AMENDEMENT = 4000;

export type RefusAmendement = 'objectif_absent' | 'texte_absent' | 'texte_trop_long';

/**
 * Ce qui part en base. AUCUNE DATE, pour les deux motifs déjà écrits au
 * `DonneesRatification` : `creeLe` est posée par `@default(now())` — c'est ce
 * qui rend un amendement inantidatable —, et `exprimeLe` RESTE NULLE parce que
 * c'est une colonne de DÉCLARATION et que le patient ne déclare pas de date, il
 * écrit. La renseigner depuis l'horloge du serveur en ferait une déclaration
 * qu'il n'a pas faite, et elle ne pourrait de toute façon jamais différer de
 * `creeLe` : cette route est le seul écrivain.
 */
export type DonneesAmendement = {
  idPatient: string;
  idObjectif: string;
  texte: string;
};

export type PreparationAmendement =
  | { ok: true; donnees: DonneesAmendement }
  | { ok: false; raison: RefusAmendement };

export type EntreeAmendement = {
  idPatient: string;
  idObjectif: string | null | undefined;
  texte: string | null | undefined;
};

/**
 * Prépare UN amendement. Il ne remplace jamais rien : se raviser, c'est écrire
 * à nouveau — une ligne de plus, et `etatRatification` lit le dernier geste.
 *
 * LE TEXTE EST OBLIGATOIRE, et ce n'est pas une exigence de formulaire. Un
 * amendement sans mots n'est pas un amendement : c'est une contestation, et
 * celle-là existe déjà (`schema.prisma`, `texte` NOT NULL non vide). L'accepter
 * vide fabriquerait un troisième geste indiscernable du deuxième, rangé sous un
 * libellé qui promet des mots.
 *
 * REFUS, JAMAIS TRONCATURE (patron de tout le portail) : tronquer la version
 * d'un patient produirait une phrase que personne n'a écrite, déposée dans son
 * dossier comme s'il l'avait dite.
 *
 * Ce module est PUR : il ne vérifie pas que `idObjectif` existe, appartient au
 * dossier, ou est une tête de chaîne. `id_objectif` n'a pas de clé étrangère
 * (référence souple assumée par la migration) : ces trois vérifications
 * appartiennent à la route, qui seule lit la base.
 */
export function preparerAmendement(entree: EntreeAmendement): PreparationAmendement {
  const idObjectif = (entree.idObjectif ?? '').trim();
  if (idObjectif.length === 0) return { ok: false, raison: 'objectif_absent' };

  const texte = (entree.texte ?? '').trim();
  if (texte.length === 0) return { ok: false, raison: 'texte_absent' };
  if (texte.length > LONGUEUR_MAX_AMENDEMENT) return { ok: false, raison: 'texte_trop_long' };

  return { ok: true, donnees: { idPatient: entree.idPatient, idObjectif, texte } };
}

// ---------------------------------------------------------------------------
// LOT-05 — la réponse d'étape : où le patient en est PAR RAPPORT À SON OBJECTIF.
// ---------------------------------------------------------------------------

/**
 * L'ancre du PREMIER cycle, nommée. Ce n'est pas une étape : au moment où
 * l'objectif se pose, il n'y a rien derrière soi, et « où en êtes-vous par
 * rapport à votre objectif ? » n'a pas de réponse. C'est aussi la valeur que
 * `resoudreJalonDu` rend pour un patient SANS cycle confirmé — d'où la
 * nécessité de la refuser ici, et pas seulement en base.
 *
 * ELLE NE SERT PLUS À FILTRER UNE LIGNE EN BASE (`D-113`) : la série des ancres
 * est ouverte, et `where: { milestone: ANCRE_JALON }` ne voyait pas `T1`. Ce
 * qui reste ici est un point de DÉRIVATION pour la garde de `JALONS_OBJECTIF` —
 * « les jalons d'objectif sont la cadence MOINS son ancre ». La lecture des
 * ancres réellement posées vit dans `protocol/ancresPersistees.ts`.
 */
export const ANCRE_JALON = 'T0';

/**
 * Les trois jalons auxquels une réponse d'étape peut se rattacher :
 * `JOURS_JALON` MOINS SON ANCRE.
 *
 * POURQUOI UNE LITTÉRALE PLUTÔT QU'UN `Object.keys(JOURS_JALON)` ICI. Ce module
 * est importé par `DossierDeuxVoixView`, un composant `'use client'` :
 * `@/lib/equilibre/constants` y ferait entrer les tables cliniques entières
 * dans le bundle patient, pour trois chaînes de caractères. La dérivation est
 * donc VÉRIFIÉE plutôt qu'exécutée — `objectifNegocie.guard.test.ts` importe
 * `JOURS_JALON`, en retire `ANCRE_JALON` par son nom, et compare. Ajouter un
 * `J120`, renommer `T0`, réordonner : la garde rougit.
 *
 * Et ce n'est pas seulement une précaution de bundle : la garde G5 de ce même
 * banc interdit nommément à ce module d'importer `@/lib/equilibre`. L'import
 * direct serait rouge de toute façon.
 *
 * La base tient la même liste (CHECK `reponses_jalon_objectif_jalon_check`) et
 * le contrat SQL la lit dans la DÉFINITION de la contrainte. Trois endroits, un
 * seul énoncé, et deux gardes qui refusent qu'ils divergent.
 */
export const JALONS_OBJECTIF = ['J21', 'J42', 'J90'] as const;

export type JalonObjectif = (typeof JALONS_OBJECTIF)[number];

export function estJalonObjectif(valeur: unknown): valeur is JalonObjectif {
  return typeof valeur === 'string' && (JALONS_OBJECTIF as readonly string[]).includes(valeur);
}

/**
 * Longueur maximale d'une réponse d'étape. Déclarée à part, comme les autres :
 * le jour où l'une bouge, les autres ne suivent pas sans qu'on l'ait voulu.
 */
export const LONGUEUR_MAX_REPONSE_JALON = 4000;

/**
 * Bornes de saisie de l'EVA — PUREMENT TECHNIQUES, et identifiées comme telles
 * (`DC-19`/`DC-20`). Ce ne sont ni un seuil, ni une bande, ni une direction :
 * rien ne lit cette valeur pour en conclure quoi que ce soit, aucune moyenne
 * n'en est tirée, elle n'entre dans aucun moteur. Régime de `D-088`, appliqué
 * sans l'élargir.
 */
export const EVA_MIN = 0;
export const EVA_MAX = 10;

export type RefusReponseJalon =
  | 'objectif_absent'
  | 'jalon_absent'
  | 'jalon_invalide'
  | 'texte_absent'
  | 'texte_trop_long'
  | 'eva_invalide';

/**
 * Ce qui part en base. AUCUNE DATE, pour les motifs déjà écrits deux fois plus
 * haut : `creeLe` est posée par `@default(now())`, et `reponduLe` est une
 * colonne de DÉCLARATION qui reste nulle tant que personne ne déclare de date.
 *
 * `eva` vaut `null` quand le patient n'a pas répondu à l'échelle — JAMAIS `0`
 * (`DC-24`) : une donnée absente n'est pas une donnée basse, et « 0 » sur une
 * EVA se lit comme une réponse.
 */
export type DonneesReponseJalon = {
  idPatient: string;
  idObjectif: string;
  jalon: JalonObjectif;
  texte: string;
  eva: number | null;
};

export type PreparationReponseJalon =
  | { ok: true; donnees: DonneesReponseJalon }
  | { ok: false; raison: RefusReponseJalon };

export type EntreeReponseJalon = {
  idPatient: string;
  idObjectif: string | null | undefined;
  jalon: unknown;
  texte: string | null | undefined;
  eva: unknown;
};

/**
 * Prépare UNE réponse d'étape. Elle ne remplace jamais rien : répondre deux
 * fois au même jalon fait deux lignes (aucun UNIQUE en base, `D-111` §5), et la
 * lecture retient la plus récente.
 *
 * LE TEXTE EST OBLIGATOIRE, ET L'EVA NE PEUT PAS LE REMPLACER. Une ligne au
 * texte vide serait un chiffre nu déposé dans un dossier — précisément ce que
 * ce lot refuse de produire. Refus, jamais troncature (patron du portail).
 *
 * L'EVA EST REFUSÉE ICI, PAS SEULEMENT EN BASE, et l'écart n'est pas
 * décoratif : la colonne est un `INTEGER`, si bien que `5.5` serait ARRONDI À 6
 * par le cast AVANT que le CHECK ne s'exécute. Le CHECK verrait 6, l'accepterait,
 * et le dossier porterait une valeur que le patient n'a pas donnée. Un décimal
 * se refuse donc au bord, en amont du cast.
 *
 * `T0` EST REFUSÉ ICI POUR UNE RAISON SYMÉTRIQUE : `resoudreJalonDu` le rend
 * pour tout patient sans cycle confirmé. Laissé passer, il atteindrait le CHECK,
 * lèverait un `23514`, et le patient verrait un 500 sur un chemin qu'aucun
 * palier de test ne traverse. Il se refuse en français, avant la base.
 *
 * Ce module est PUR : il ne vérifie ni l'existence de `idObjectif`, ni son
 * appartenance au dossier, ni qu'il est une tête de chaîne — `id_objectif` n'a
 * pas de clé étrangère (référence souple assumée par la migration). Ces
 * vérifications appartiennent à la route, qui seule lit la base.
 */
export function preparerReponseJalon(entree: EntreeReponseJalon): PreparationReponseJalon {
  const idObjectif = (entree.idObjectif ?? '').trim();
  if (idObjectif.length === 0) return { ok: false, raison: 'objectif_absent' };

  const jalonBrut = typeof entree.jalon === 'string' ? entree.jalon.trim() : entree.jalon;
  if (jalonBrut === undefined || jalonBrut === null || jalonBrut === '') {
    return { ok: false, raison: 'jalon_absent' };
  }
  if (!estJalonObjectif(jalonBrut)) return { ok: false, raison: 'jalon_invalide' };

  const texte = (entree.texte ?? '').trim();
  if (texte.length === 0) return { ok: false, raison: 'texte_absent' };
  if (texte.length > LONGUEUR_MAX_REPONSE_JALON) return { ok: false, raison: 'texte_trop_long' };

  // Absence et valeur sont deux choses. `null`/`undefined` = le patient n'a pas
  // répondu à l'échelle ; tout le reste doit être un ENTIER dans les bornes.
  // `typeof === 'number'` d'abord : une chaîne « 5 » n'est pas une EVA, et
  // l'accepter par coercition ouvrirait la porte à `''`, qui vaut 0.
  let eva: number | null = null;
  if (entree.eva !== null && entree.eva !== undefined) {
    if (typeof entree.eva !== 'number' || !Number.isInteger(entree.eva)) {
      return { ok: false, raison: 'eva_invalide' };
    }
    if (entree.eva < EVA_MIN || entree.eva > EVA_MAX) {
      return { ok: false, raison: 'eva_invalide' };
    }
    eva = entree.eva;
  }

  return {
    ok: true,
    donnees: { idPatient: entree.idPatient, idObjectif, jalon: jalonBrut, texte, eva },
  };
}
