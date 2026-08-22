// « Ce qui compte pour moi aujourd'hui » (campagne Alliance 6.0-A, LOT-03) —
// domaine PUR : aucune dépendance Prisma, aucune lecture d'environnement.
//
// Une entrée est une PAROLE DE PATIENT déposée au portail. Elle se conserve,
// ne s'agrège pas, ne se note pas, ne se résume pas : invariant de campagne
// « jamais un score » (Alliance 6.0-A, CAMPAGNE.md § Résultat observable),
// adossé à `DC-19`/`DC-20` — noter ou moyenner cette parole poserait une
// borne clinique sans provenance. (`DC-27` dit « association ≠ causalité,
// score ≠ diagnostic » et ne porte pas cet interdit : ne pas le citer ici.)
// Une absence d'entrée est un SILENCE, jamais un zéro ni un « rien à
// signaler » (`DC-24`) : c'est pourquoi rien ici ne fabrique de valeur par
// défaut.
//
// DEUX DATES, jamais confondues (patron SP-TT, cf. `correspondanceMedecin.ts`
// et `relectureNote.ts`) : `saisiLe` est DÉCLARÉE par le client — la date à
// laquelle le patient situe ce qu'il dépose — tandis que la date
// d'enregistrement n'apparaît NULLE PART dans ce qu'on prépare pour la base :
// c'est `@default(now())` qui la pose (`schema.prisma`, `cree_le`). Un dépôt
// ne peut donc structurellement pas être antidaté.
//
// PAS DE `supersedes` : contrairement aux quatre autres tables du LOT-01, la
// table `ce_qui_compte_entrees` n'a PAS de colonne de chaînage — la liste
// blanche du contrat SQL fige exactement `cree_le, id, id_patient, saisi_le,
// texte` (`prisma/checks/alli_dossier_deux_voix_v1_negatif.sql`). Une entrée
// NE PEUT PAS en corriger une autre, et ce n'est pas un oubli : une parole
// n'est pas une donnée qu'on rectifie, elle s'ajoute. Aucune surface de
// correction ni de suppression ne doit donc exister — ni ici, ni sur la
// route. Toute proposition d'ajouter `supersedes` à cette table est un
// changement de nature, pas une complétion.

/**
 * Borne de longueur d'un dépôt, en caractères.
 *
 * 4 000, comme `LONGUEUR_MAX_NOTE` (`lib/praticien/relectureNote.ts`) et non
 * 8 000 comme `LONGUEUR_MAX_TEXTE` (`lib/praticien/correspondanceMedecin.ts`) :
 * les 8 000 y sont motivés par la TRANSCRIPTION d'un courrier reçu, un texte
 * qui existe déjà ailleurs et qu'on recopie. Ici, personne ne recopie : c'est
 * une parole écrite au portail, du même ordre qu'une note de relecture. On
 * s'aligne donc sur le précédent le plus proche plutôt que d'inventer un
 * troisième chiffre.
 *
 * CONTRE-PATRON À NE PAS COPIER : `app/api/portail/trust/signalement/route.ts`
 * applique un `tronque(...)` au texte libre patient. Tronquer silencieusement
 * une parole de patient n'est pas une validation, c'est une ALTÉRATION DE
 * DONNÉE : le dossier garderait une phrase coupée que personne n'a écrite, et
 * personne — ni le patient, ni le praticien — ne saurait qu'il en manque un
 * morceau. Ici le dépassement est un REFUS 400, jamais une coupe : le patient
 * garde son texte à l'écran et décide lui-même de ce qu'il retire.
 */
export const LONGUEUR_MAX_CE_QUI_COMPTE = 4000;

/**
 * Tolérance de fuseau sur la date de saisie déclarée.
 *
 * Mécanique et justification reprises telles quelles de
 * `app/api/praticien/biologie/proposition/route.ts` ([[D-071]] §2) :
 * `<input type="date">` rend « 2026-08-22 », que `new Date()` lit à minuit
 * UTC. À 00 h 30 à Paris, c'est 22 h 30 UTC la veille — sans marge, la date
 * DU JOUR serait refusée comme future chaque nuit, une à deux heures selon la
 * saison, avec un message faux. La borne vise une saisie d'ANNÉE (2027 pour
 * 2026), pas un décalage de fuseau ; un jour de marge la tient sans rien
 * laisser passer de ce qu'elle vise.
 */
export const TOLERANCE_FUSEAU_MS = 24 * 60 * 60 * 1000;

export type RefusEntree = 'texte_absent' | 'texte_trop_long' | 'date_invalide' | 'date_future';

/**
 * Ce qui part en base — et seulement cela.
 *
 * Ni `creeLe` (posé par `@default(now())`), ni `idPatient` (posé par la route
 * depuis la SESSION, jamais depuis le corps de la requête). Ce type est la
 * forme opposable de ces deux invariants : on ne peut pas transmettre ce
 * qu'on ne porte pas.
 */
export type DonneesEntree = {
  texte: string;
  /**
   * `null` = le patient n'a rien déclaré. Ce `null` ne doit JAMAIS être
   * remplacé par `creeLe`, ni ici, ni à la lecture, ni à l'affichage :
   * substituer la date d'enregistrement fabriquerait une déclaration que le
   * patient n'a pas faite (`DC-24` — une absence n'est pas une valeur).
   */
  saisiLe: Date | null;
};

export type PreparationEntree =
  | { ok: true; donnees: DonneesEntree }
  | { ok: false; raison: RefusEntree };

/**
 * Valide un dépôt et prépare ses données d'écriture.
 *
 * `texte` est reçu en `unknown` délibérément : le corps d'une requête n'est
 * pas typé à l'exécution, et un `{ texte: 123 }` doit rendre 400, jamais 500
 * sur un `.trim()` d'un non-string.
 */
export function preparerEntree(entree: { texte: unknown; saisiLe?: unknown }): PreparationEntree {
  // `trim` AVANT le test de vacuité, et pas après : le CHECK de la base fait
  // `btrim("texte") <> ''` (migration `alliance_dossier_deux_voix_v1`). Si la
  // route ne s'alignait pas sur `btrim`, un texte fait de trois espaces
  // passerait la validation applicative et se ferait refuser par Postgres —
  // 500 technique au lieu du 400 explicite que le patient mérite.
  const texte = typeof entree.texte === 'string' ? entree.texte.trim() : '';
  if (texte.length === 0) return { ok: false, raison: 'texte_absent' };
  if (texte.length > LONGUEUR_MAX_CE_QUI_COMPTE) return { ok: false, raison: 'texte_trop_long' };

  const saisiLe = lireDateSaisie(entree.saisiLe);
  if (saisiLe === 'invalide') return { ok: false, raison: 'date_invalide' };
  if (saisiLe === 'future') return { ok: false, raison: 'date_future' };

  return { ok: true, donnees: { texte, saisiLe } };
}

/**
 * Date de saisie déclarée : `null` (rien de déclaré) ou une date bornée.
 *
 * Absente ⇒ `null` ACCEPTÉ : le dépôt reste valide, le patient n'a
 * simplement pas situé sa parole dans le temps. La chaîne vide compte comme
 * absente — c'est ce que rend un `<input type="date">` laissé vide, et
 * refuser le dépôt pour cela punirait le silence.
 *
 * Une valeur d'un autre type (nombre, objet) n'est ni une absence ni une
 * déclaration lisible : elle est refusée, jamais retombée en `null` — un
 * repli silencieux transformerait un appel malformé en silence patient.
 *
 * Aucune borne PASSÉE : on peut déposer aujourd'hui ce qui comptait il y a
 * six mois. La seule borne est le futur, qui ne peut pas être vécu.
 */
function lireDateSaisie(brut: unknown): Date | null | 'invalide' | 'future' {
  if (brut === undefined || brut === null) return null;
  if (typeof brut !== 'string') return 'invalide';
  const texte = brut.trim();
  if (texte.length === 0) return null;

  const date = new Date(texte);
  if (Number.isNaN(date.getTime())) return 'invalide';
  if (date.getTime() > Date.now() + TOLERANCE_FUSEAU_MS) return 'future';
  return date;
}
