// « Ce que j'ai compris de vous » (Alliance 6.0-A, LOT-04) — domaine PUR,
// aucune dépendance Prisma.
//
// HOMONYMIE, À LEVER D'ENTRÉE DE JEU. Ce module n'a RIEN à voir avec les trois
// surfaces qui portent déjà le mot « synthèse » dans ce dépôt :
//   - `api/praticien/synthese/` et `lib/anthropic.ts` — la synthèse IA, générée
//     par un modèle à partir des questionnaires ;
//   - `lib/synthese-praticien.ts` — le brouillon praticien de cette synthèse IA ;
//   - `components/SynthesePanel.tsx` — son panneau d'affichage.
// Une SYNTHÈSE DE COMPRÉHENSION est autre chose : ce que le praticien dit avoir
// compris du patient, écrit par lui, dans ses mots, et publié AU PATIENT. Aucun
// modèle ne la produit, aucun score ne l'alimente.
//
// Elle n'est ni un diagnostic, ni une hypothèse, ni une orientation — ce sont
// trois objets distincts (`DC-31`, `DC-32`), et aucun des trois n'est celui-ci.
// Elle ne porte aucun seuil ni aucune pondération (`DC-19`/`DC-20`). Les gardes
// structurelles de `comprehensionAppendOnly.guard.test.ts` rendent ces
// interdits opposables.
//
// APPEND-ONLY PAR RÉFÉRENCE : réviser, c'est écrire une NOUVELLE ligne portant
// `supersedesSyntheseId`. Rien ne s'écrase, rien ne se supprime. Le désaccord
// du patient reste accroché à la version EXACTE qu'il a contestée, et survit à
// toutes les révisions ultérieures — c'est ce qui fait qu'une contestation ne
// peut pas être effacée en réécrivant ce qu'elle contestait.
//
// UNE SEULE SÉMANTIQUE PAR ARÊTE. `supersedesSyntheseId` dit « cette ligne
// remplace celle-là », rien d'autre. L'état publié/brouillon est porté par la
// COLONNE `publieeLe`, jamais par l'arête. Confondre les deux — faire dire à
// l'arête « publie » d'un côté et « révise » de l'autre — rendrait la chaîne
// illisible dès la deuxième révision.

/**
 * Bornes de longueur. TOUTES sont des bornes TECHNIQUES de saisie, aucune n'a
 * de sémantique clinique (`DC-19`/`DC-20` : un chiffre purement technique doit
 * être identifié comme tel). Chacune se justifie par un précédent déjà arbitré
 * dans le dépôt, jamais par un nombre choisi au hasard.
 */

/** La synthèse du praticien : même borne qu'une note de relecture
 *  (`LONGUEUR_MAX_NOTE = 4000`, `relectureNote.ts`) et qu'une reformulation
 *  d'objectif — et non 8 000 comme une correspondance médecin. Le destinataire
 *  fait la différence : ce texte est lu par le patient SEUL, souvent avant la
 *  consultation. Au-delà de quelques paragraphes, ce n'est plus « ce que j'ai
 *  compris de vous », c'est un compte rendu. */
export const LONGUEUR_MAX_SYNTHESE = 4000;

/** Le désaccord du patient : MÊME borne, et c'est délibéré. Donner au patient
 *  moins de place qu'au praticien pour dire « ce n'est pas exactement ça »
 *  ferait de la contestation un objet de second rang. Même borne que « ce qui
 *  compte pour moi » (`LONGUEUR_MAX_CE_QUI_COMPTE`), l'autre endroit où le
 *  patient parle librement. */
export const LONGUEUR_MAX_DESACCORD = 4000;

/**
 * LA TOLÉRANCE D'UN JOUR N'EST PAS DU CONFORT — mécanique recopiée de
 * `objectifNegocie.ts` et `ceQuiCompte.ts`.
 *
 * `<input type="date">` rend « 2026-08-22 », que `new Date()` lit en UTC
 * minuit. À 00 h 30 à Paris, c'est 22 h 30 UTC la veille : la date DU JOUR
 * serait refusée comme future, chaque nuit, pendant une à deux heures selon la
 * saison — avec un message faux. La borne vise une saisie d'année (2027 pour
 * 2026), pas un décalage de fuseau.
 */
export const TOLERANCE_FUSEAU_MS = 24 * 60 * 60 * 1000;

export type RefusSynthese =
  | 'texte_absent'
  | 'texte_trop_long'
  | 'date_invalide'
  | 'date_future';

export type RefusDesaccord =
  | 'texte_trop_long'
  | 'synthese_absente'
  | 'date_invalide'
  | 'date_future';

/**
 * Ce qui part en base pour une synthèse.
 *
 * `creeLe` n'y figure PAS : c'est `@default(now())` qui le pose, jamais un
 * appelant — une ligne de synthèse est structurellement inantidatable.
 *
 * `publieeLe` est la SEULE date que ce module fabrique, et elle n'est jamais
 * acceptée de l'appelant : publier, c'est publier maintenant. Un praticien ne
 * peut pas se donner rétroactivement une publication qu'il n'a pas faite —
 * ce qui compte, puisque c'est la date que le patient verra.
 *
 * `redigeeLe`, elle, est une DONNÉE portée par l'appelant : le moment où cette
 * compréhension s'est formée (une consultation, un échange) peut légitimement
 * précéder l'écriture de plusieurs jours.
 */
export type DonneesSynthese = {
  idPatient: string;
  praticienEmail: string;
  texte: string;
  redigeeLe: Date | null;
  publieeLe: Date | null;
  supersedesSyntheseId: string | null;
};

/**
 * Ce qui part en base pour un désaccord. Pas d'auteur : il n'y en a qu'un
 * possible, le patient du dossier, et la route le tient de la session — jamais
 * du corps de la requête.
 *
 * `texte` est FACULTATIF, et ce n'est pas un oubli : « ce n'est pas exactement
 * ça » est déjà une information complète. Exiger une justification pour
 * pouvoir être en désaccord ferait de la contestation un examen de passage.
 */
export type DonneesDesaccord = {
  idPatient: string;
  idSynthese: string;
  texte: string | null;
  exprimeLe: Date | null;
};

export type PreparationSynthese =
  | { ok: true; donnees: DonneesSynthese }
  | { ok: false; raison: RefusSynthese };

export type PreparationDesaccord =
  | { ok: true; donnees: DonneesDesaccord }
  | { ok: false; raison: RefusDesaccord };

export type EntreeSynthese = {
  idPatient: string;
  praticienEmail: string;
  texte: string | null | undefined;
  redigeeLe: string | null | undefined;
  /** `true` ⇒ ligne publiée (`publieeLe` posée à l'insert) ; sinon brouillon. */
  publier: boolean;
  supersedesSyntheseId?: string | null;
};

export type EntreeDesaccord = {
  idPatient: string;
  idSynthese: string | null | undefined;
  texte: string | null | undefined;
  exprimeLe: string | null | undefined;
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
 * tolérance de fuseau. Pas de borne passée : inventer une ancienneté maximale
 * serait un seuil.
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
 * Valide une synthèse de compréhension et prépare ses données d'écriture.
 *
 * REFUS, JAMAIS TRONCATURE. Tronquer une synthèse produirait un texte que le
 * praticien n'a pas écrit, publié sous son nom à son patient — et coupé, très
 * probablement, au milieu d'une nuance.
 *
 * Le texte est TOUJOURS relu du corps de la requête, y compris en révision :
 * c'est l'inverse de `preparerObjectif`, et c'est voulu. Là-bas, l'énoncé du
 * patient était recopié de la ligne visée pour qu'on ne puisse pas lui faire
 * dire autre chose ; ici le texte EST ce que le praticien révise — le recopier
 * rendrait toute révision impossible.
 */
export function preparerSynthese(entree: EntreeSynthese): PreparationSynthese {
  const texte = (entree.texte ?? '').trim();
  if (texte.length === 0) return { ok: false, raison: 'texte_absent' };
  if (texte.length > LONGUEUR_MAX_SYNTHESE) return { ok: false, raison: 'texte_trop_long' };

  const redigeeLe = lireDateEvenement(entree.redigeeLe);
  if (!redigeeLe.ok) return { ok: false, raison: redigeeLe.raison };

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      praticienEmail: entree.praticienEmail,
      texte,
      redigeeLe: redigeeLe.date,
      publieeLe: entree.publier ? new Date() : null,
      supersedesSyntheseId: entree.supersedesSyntheseId ?? null,
    },
  };
}

/**
 * Valide un désaccord et prépare ses données d'écriture.
 *
 * `idSynthese` est exigé et non vide — un désaccord orphelin ne conteste rien
 * (`schema.prisma` : NOT NULL). Son EXISTENCE et son APPARTENANCE au dossier
 * sont vérifiées par la route, pas ici : ce module est pur, il ne lit pas la
 * base.
 */
export function preparerDesaccord(entree: EntreeDesaccord): PreparationDesaccord {
  const idSynthese = (entree.idSynthese ?? '').trim();
  if (idSynthese.length === 0) return { ok: false, raison: 'synthese_absente' };

  const texte = texteFacultatif(entree.texte);
  if (texte && texte.length > LONGUEUR_MAX_DESACCORD) {
    return { ok: false, raison: 'texte_trop_long' };
  }

  const exprimeLe = lireDateEvenement(entree.exprimeLe);
  if (!exprimeLe.ok) return { ok: false, raison: exprimeLe.raison };

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      idSynthese,
      texte,
      exprimeLe: exprimeLe.date,
    },
  };
}

export type LigneSynthese = {
  id: string;
  publieeLe: Date | null;
  supersedesSyntheseId: string | null;
  creeLe: Date;
};

/** Tri déterministe : écriture décroissante, l'identifiant départageant les
 *  ex aequo pour qu'une lecture ne dépende jamais de l'ordre de la base. */
function plusRecenteDabord<T extends { id: string; creeLe: Date }>(gauche: T, droite: T): number {
  const delta = droite.creeLe.getTime() - gauche.creeLe.getTime();
  if (delta !== 0) return delta;
  return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
}

/**
 * Têtes de chaîne : toutes les lignes qu'aucune autre ne supplante, de la plus
 * récente à la plus ancienne.
 *
 * REND UN TABLEAU, ET C'EST LE POINT — même raison qu'`objectifsCourants`. La
 * protection « lecture-puis-409 » de la route n'est pas étanche à la course :
 * deux révisions concurrentes de la même ligne peuvent toutes deux passer la
 * lecture et créer deux têtes. Départager en silence ferait disparaître une
 * synthèse de praticien sans qu'aucune erreur ne le dise. Une discordance se
 * SIGNALE (`DC-30`) : c'est l'écran qui montre les deux têtes et le dit.
 */
export function synthesesCourantes<T extends LigneSynthese>(lignes: T[]): T[] {
  const supplantees = new Set(
    lignes.map((ligne) => ligne.supersedesSyntheseId).filter((id): id is string => id !== null),
  );
  return lignes.filter((ligne) => !supplantees.has(ligne.id)).sort(plusRecenteDabord);
}

/**
 * LA SEULE LIGNE QU'UN PATIENT A LE DROIT DE VOIR : la ligne PUBLIÉE la plus
 * récente. `undefined` s'il n'y en a aucune.
 *
 * Un brouillon (`publieeLe === null`) n'est jamais servi — c'est la garde que
 * `schema.prisma` renvoie explicitement « aux lots 04/06 ».
 *
 * LE FILTRE NE PORTE PAS SUR LES TÊTES DE CHAÎNE, et cette rédaction-ci
 * corrige la précédente, qui le faisait. Filtrer sur les têtes retirait au
 * patient une synthèse déjà publiée dès que le praticien enregistrait un
 * BROUILLON la supplantant : la seule tête devenait ce brouillon, non publiée,
 * et le portail affichait « votre praticien n'a encore rien publié » — une
 * absence FABRIQUÉE présentée comme un fait (`DC-24` pris à revers), sur un
 * texte que le patient avait pu lire et parfois contester. C'était une
 * dépublication de fait, déclenchée par le geste le plus anodin de l'écran,
 * dans un lot qui affirme par ailleurs qu'aucun verbe n'écrase.
 *
 * Le filtre « tête » n'apportait rien : une révision est toujours plus récente
 * que ce qu'elle révise, donc dès qu'elle est publiée elle gagne de toute
 * façon. Le seul cas où les deux règles divergeaient était exactement le cas
 * cassé. (Revue LOT-04, B1.)
 *
 * En cas de course (deux lignes publiées concurrentes), la plus récente est
 * servie — et ce silence-là est assumé : le patient n'a pas à arbitrer une
 * collision d'écriture du praticien. C'est le cockpit qui la lui signale, par
 * `synthesesCourantes`.
 *
 * IL N'EXISTE AUCUNE DÉPUBLICATION. Retirer une synthèse au patient n'est pas
 * un geste que ce lot ouvre : publier engage. Corriger, c'est publier une
 * version qui corrige.
 */
export function syntheseServieAuPatient<T extends LigneSynthese>(lignes: T[]): T | undefined {
  return lignes.filter((ligne) => ligne.publieeLe !== null).sort(plusRecenteDabord)[0];
}

/**
 * Chaîne complète d'une synthèse, de la version demandée vers ses versions
 * antérieures. C'est ce qui donne son sens à « append-only » : réviser n'efface
 * rien, la version précédente reste lisible — et un désaccord qui la vise reste
 * lisible avec elle.
 *
 * Le `Set` anti-cycle n'est pas une précaution de style : la référence
 * `supersedes_synthese_id` est SOUPLE, sans clé étrangère. Rien en base
 * n'empêche A → B → A, et une remontée naïve bouclerait sans fin sur une simple
 * lecture de dossier.
 */
export function chaineDeSynthese<T extends LigneSynthese>(lignes: T[], id: string): T[] {
  const parId = new Map(lignes.map((ligne) => [ligne.id, ligne]));
  const chaine: T[] = [];
  const vues = new Set<string>();
  let courant = parId.get(id);
  while (courant && !vues.has(courant.id)) {
    vues.add(courant.id);
    chaine.push(courant);
    courant = courant.supersedesSyntheseId ? parId.get(courant.supersedesSyntheseId) : undefined;
  }
  return chaine;
}

/**
 * L'état d'un désaccord — DÉRIVÉ, jamais stocké.
 *
 * La table n'a pas de colonne d'état et n'en aura pas : une colonne mutable
 * contredirait l'append-only, et la liste blanche du contrat SQL la refuserait.
 * L'état se recalcule donc à chaque lecture, à partir de lignes qui, elles, ne
 * bougent jamais.
 *
 * `en_attente` NE DIT RIEN DU PRATICIEN — ni négligence, ni refus. Une donnée
 * absente n'est ni zéro ni une réponse (`DC-24`) : l'écran doit dire « pas
 * encore de réponse », jamais « ignoré ». Et il n'existe aucun état
 * « résolu » : répondre, c'est publier une nouvelle version ; le désaccord
 * reste, visible, accroché à la version qu'il visait.
 */
export type EtatDesaccord = 'en_attente' | 'repondu';

export type LigneDesaccord = {
  id: string;
  idSynthese: string;
  creeLe: Date;
};

/**
 * Répondu = il existe une version PUBLIÉE qui descend de la version contestée
 * ET qui a été écrite APRÈS le désaccord.
 *
 * Les deux conditions comptent, et aucune ne suffit seule :
 *   - « descend de » sans « après » qualifierait de réponse une version
 *     publiée avant même que le patient ne conteste ;
 *   - « après » sans « descend de » qualifierait de réponse n'importe quelle
 *     autre synthèse du dossier, sur un tout autre sujet.
 *
 * La descente se fait par remontée : pour chaque ligne publiée postérieure, on
 * remonte sa chaîne et on regarde si elle passe par la version contestée. Coût
 * négligeable (une poignée de lignes par dossier), et `chaineDeSynthese` porte
 * déjà l'anti-cycle.
 */
export function etatDesaccord<T extends LigneSynthese>(
  desaccord: LigneDesaccord,
  syntheses: T[],
): EtatDesaccord {
  const reponse = syntheses.some((ligne) => {
    if (ligne.publieeLe === null) return false;
    if (ligne.creeLe.getTime() <= desaccord.creeLe.getTime()) return false;
    if (ligne.id === desaccord.idSynthese) return false;
    return chaineDeSynthese(syntheses, ligne.id).some(
      (ancetre) => ancetre.id === desaccord.idSynthese,
    );
  });
  return reponse ? 'repondu' : 'en_attente';
}

/**
 * Les désaccords visant UNE version précise, du plus récent au plus ancien.
 * Aucun filtrage, aucun dédoublonnage : un patient qui conteste deux fois la
 * même version a contesté deux fois, et les deux lignes se lisent.
 */
export function desaccordsDeLaSynthese<T extends LigneDesaccord>(
  idSynthese: string,
  desaccords: T[],
): T[] {
  return desaccords.filter((ligne) => ligne.idSynthese === idSynthese).sort(plusRecenteDabord);
}
