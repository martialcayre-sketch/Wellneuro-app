// Textes de « Mes échanges » ([[D-293]]). Les cinq blocs sont ceux validés tels
// quels par le responsable le 2026-10-14 :
// `docs/claude/propositions/2026-10-14-u-patient-hub/README.md`. Ils ne changent
// plus sans nouvelle validation.
//
// LE BLOC « VOTRE LECTURE EST DATÉE » N'EST PAS ICI, ET C'EST VOULU. Il est
// remplacé par le texte de [[D-297]] §4 et ne se sert qu'avec le code de ai :
// aucune date ne s'écrit depuis une page qui ne sert pas cette phrase, et « Mes
// échanges » ne s'ouvre pas avant ai ([[D-293]] §4).

export const TITRE_MES_ECHANGES = 'Mes échanges';

/** Le lien de la navigation « Autres espaces » (arbitrage du 2026-10-18). */
export const LIEN_MES_ECHANGES = 'Ouvrir mes échanges';

export const BLOCS_MES_ECHANGES: readonly { titre: string; texte: string }[] = Object.freeze([
  {
    titre: 'Ce que vous trouvez ici',
    texte:
      'La liste datée de ce que votre praticien vous a remis — votre bilan et sa note, vos fiches, le courrier pour votre médecin, votre protocole — et de ce que vous lui avez transmis — vos questionnaires, vos comptes rendus d’analyses, vos signalements, avec leur statut. Chaque ligne ouvre la page de votre espace où se trouve le document.',
  },
  {
    titre: 'Ce n’est pas une messagerie',
    texte:
      'Vous ne pouvez pas écrire ici. Rien n’y est nouveau : ce sont les éléments déjà présents dans votre espace, rassemblés par date.',
  },
  {
    titre: 'Qui y a accès',
    texte:
      'Vous et votre praticien, et personne d’autre. Aucun prestataire supplémentaire n’intervient, et aucun outil d’intelligence artificielle ne lit ce journal.',
  },
  {
    titre: 'Combien de temps',
    texte: 'Ce journal est conservé avec votre dossier, selon les mêmes règles que le reste de vos données.',
  },
  {
    titre: 'Vos droits',
    texte:
      'Vous pouvez demander à tout moment à consulter, corriger ou retirer un élément depuis « Signaler un problème », choix « Je souhaite exercer un droit ».',
  },
]);

// Micro-textes d'état, NON VALIDÉS à ce jour : à relire avec le responsable
// avant l'ouverture (ACT-3). La page est livrée fermée.
export const CHARGEMENT_MES_ECHANGES = 'Chargement de vos échanges…';
export const AUCUN_ECHANGE = 'Aucun élément pour le moment.';
