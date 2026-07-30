// Gabarit de la relance praticien — module PUR et DÉDIÉ.
//
// Dédié pour une raison de garde : `correspondance/patient.guard.test.ts`
// vérifie qu'un fichier contenant `sendMail(` contient aussi
// `journaliserCorrespondancePatient`. Poser ce texte dans
// `lib/consultation/email.ts` ferait passer la garde au vert sans rien
// prouver — ce fichier contient déjà les deux chaînes.
//
// CONTRAINTE DE CONTENU, tenue par le banc : aucune donnée de santé. Ni le
// titre de l'instrument, ni « sommeil », ni « nuit », ni le nombre de nuits
// notées. Un corps UNIQUE couvre les trois états relançables, si bien que
// l'e-mail ne révèle même pas où en est le recueil.
//
// CONTRAINTE DE TON : aucun compte à rebours, aucun décompte, aucun « vous
// n'avez pas noté depuis N jours ». « Il n'y a rien à rattraper » est VRAI —
// `estDateSaisissable` borne la saisie à aujourd'hui ou la veille, donc rien
// n'est rattrapable. Ne jamais écrire « rien n'est perdu », qui serait faux.

/** Cadence minimale entre deux relances d'un même recueil. Politique, pas
 * concurrence : c'est le « budget d'attention » rendu opposable côté SERVEUR
 * — le dépôt a déjà connu une interdiction qui ne vivait que dans l'écran.
 * Ici (module pur) pour que l'écran l'annonce sans importer la route, qui
 * tirerait Prisma et nodemailer dans le bundle client. */
export const JOURS_ENTRE_RELANCES = 3;

export const SUJET_RELANCE = 'Un recueil en cours dans votre espace — Wellneuro';

/** Objet consigné au registre (praticien seul, jamais dans l'e-mail). */
export const OBJET_TRACE_RELANCE = 'Relance — agenda du sommeil';

export function construireCorpsRelance(prenom: string, lien: string): string {
  const salutation = prenom.trim().length > 0 ? `Bonjour ${prenom.trim()},` : 'Bonjour,';
  return `${salutation}

Votre praticien vous signale qu'un recueil est à votre disposition dans votre
espace patient Wellneuro. Il se remplit en une minute par jour, au moment qui
vous convient.

Accéder à votre espace :
${lien}

Il n'y a rien à rattraper : commencez ou reprenez simplement au prochain matin.

L'équipe Wellneuro`;
}
