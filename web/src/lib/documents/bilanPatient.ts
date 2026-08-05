import type { Prisma } from '@/generated/prisma';
import { type SyntheseSchema, validateSyntheseSchema } from '@/lib/anthropic';
import { estRedactionPraticien } from '@/lib/synthese-praticien';

/**
 * Le `where` Prisma des envois VISIBLES par le patient `idPatient` — l'unique
 * définition de la visibilité du bilan.
 *
 * Elle est posée ici, dans le module du domaine, et non dans l'une des routes :
 * `api/portail/bilan` (qui sert le document) et `api/portail/assignations` (qui
 * annonce « Consulter mon bilan » sur le hub) doivent répondre la même chose, et
 * deux copies d'une règle de visibilité finissent toujours par se contredire.
 * Elles s'étaient déjà contredites — le hub ignorait le rejet et proposait un
 * bilan que la page refusait de servir. Une troisième surface se branche ici,
 * elle ne réécrit pas la règle.
 *
 * Trois conditions indissociables :
 *
 *  - `statut: 'Envoye'` — le seul statut de succès écrit par `logBookletEnvoi`.
 *    Est visible ce qui a été ENVOYÉ, jamais ce qui a été seulement rédigé : une
 *    synthèse `Validee_Praticien` peut n'avoir jamais été transmise, et un envoi
 *    en `Erreur` n'a rien remis au patient.
 *  - synthèse non `Rejetee` — l'envoi ACCORDE la visibilité, le rejet la RETIRE.
 *    Ce n'est pas la même chose que de se fonder sur le statut pour l'accorder.
 *    Sans cette soupape, un praticien qui s'aperçoit après coup qu'il a transmis
 *    un bilan erroné n'aurait AUCUN moyen de le retirer : `effacer` est refusé
 *    dès qu'un envoi existe.
 *  - concordance des `idPatient` — défense en profondeur : `logBookletEnvoi`
 *    recopie l'`idPatient` de la synthèse, mais c'est une recopie. Exiger que les
 *    deux concordent ferme la classe entière « le bilan d'un autre ».
 *
 * Ne porte ni `orderBy` ni `select` : les deux appelants n'ont pas le même besoin
 * (l'un lit des champs pour les projeter, l'autre ne veut qu'un booléen).
 */
export function whereEnvoiVisible(idPatient: string): Prisma.BookletEnvoiWhereInput {
  return {
    idPatient,
    statut: 'Envoye',
    synthese: { is: { idPatient, statut: { not: 'Rejetee' } } },
  };
}

// Projection PATIENT d'une synthèse. Fonction pure, sans I/O ni React.
//
// Même contrat que `bookletHtml.ts`, obtenu autrement. Le booklet construit une
// chaîne et se garde d'y écrire trois blocs ; ici le TYPE de sortie ne les a
// pas. Une route qui sert `BilanPatient` ne peut donc pas les laisser fuir par
// distraction — il faudrait ajouter un champ, ce qu'une revue verrait.
//
// Les trois blocs réservés, et pourquoi (field-filter de `depuisSynthese.ts`) :
//
//   axes prioritaires        « praticien (détaillé) + médecin ; jamais patient »
//   points de vigilance      « praticien + médecin ; jamais patient »
//   questions d'entretien    « praticien uniquement »
//
// Ce n'est pas une question de ton. `extraireVigilanceDeterministe` préfixe les
// points de vigilance des signaux d'alerte déclarés par le patient — « Idées
// noires ou suicidaires » en fait partie. Et `axe.points_a_confirmer` porte,
// littéralement, « Question à poser en entretien » : retirer
// `questions_entretien` en laissant ce champ-là déplacerait la fuite au lieu de
// la fermer. C'est une revue adversariale qui l'avait vu sur le booklet.
//
// Garde opposable : `bilanPatient.test.ts` sérialise la projection et échoue si
// l'un des trois blocs y reparaît, signal d'alerte compris.
export type BilanPatient = {
  /** Le narratif écrit pour le patient. Jamais vide : voir `NARRATIF_ABSENT`. */
  narratif: string;
  /** La note que le praticien a écrite pour lui, ou null s'il n'y en a pas. */
  notePraticien: string | null;
  /** Mention de préparation — dit qui a rédigé, sans euphémisme. */
  mentionPreparation: string;
  /** Date de transmission par le praticien, ISO. */
  transmisLe: string;
};

// Repli quand le praticien a validé une synthèse au narratif vide. Le patient
// lit une phrase d'attente, jamais un écran blanc.
export const NARRATIF_ABSENT = 'Synthèse à compléter par votre praticien.';

// Les deux mentions de préparation. Définies ici et importées par
// `bookletHtml.ts` : la même phrase doit se lire à l'identique sur les deux
// surfaces, sinon un patient qui compare son e-mail et son espace verrait deux
// attributions différentes du même document.
export const MENTION_ASSISTANCE_IA =
  'Document préparé avec une assistance d’intelligence artificielle et validé par votre praticien.';
export const MENTION_REDACTION_PRATICIEN = 'Document rédigé et validé par votre praticien.';

export function mentionPreparation(assistanceIA: boolean): string {
  return assistanceIA ? MENTION_ASSISTANCE_IA : MENTION_REDACTION_PRATICIEN;
}

/**
 * Projette une synthèse et son envoi en la seule vue destinée au patient.
 *
 * `syntheseJson` arrive en `unknown` : c'est du JSONB, et rien ne garantit sa
 * forme à la lecture. `validateSyntheseSchema` la normalise — la même fonction
 * que le reste du dépôt, pas une seconde lecture tolérante qui divergerait.
 */
export function projeterBilanPatient(entree: {
  syntheseJson: unknown;
  notesPraticien: string | null;
  modele: string;
  transmisLe: Date;
}): BilanPatient {
  const synthese: SyntheseSchema = validateSyntheseSchema(entree.syntheseJson);
  const note = (entree.notesPraticien ?? '').trim();
  return {
    narratif: synthese.narratif_patient.trim() || NARRATIF_ABSENT,
    notePraticien: note.length > 0 ? note : null,
    mentionPreparation: mentionPreparation(!estRedactionPraticien(entree.modele)),
    transmisLe: entree.transmisLe.toISOString(),
  };
}
