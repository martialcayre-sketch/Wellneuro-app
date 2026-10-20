// Textes de l'écran de dépôt ([[D-330]], J3-collecte).
//
// LE TEXTE DE COLLECTE est celui de G-11, validé tel quel par le responsable le
// 2026-10-14 (« Texte 1 — Déposer un document dans votre espace ») :
// `docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`. Il est lu à
// côté du dépôt, sans accusé (arbitrage 2 de G-11), et ne change plus sans
// nouvelle validation ; un banc le compare au document validé.
//
// LES LIBELLÉS DE L'ÉCRAN (titre, champs, bouton, liste, refus) ont été validés
// tels quels par le responsable le 2026-10-20 (préparation d'ACT-4), le refus
// du plafond des non-consultés rendu neutre :
// `docs/claude/propositions/2026-10-20-act4-textes/README.md`. Le drapeau reste
// éteint jusqu'à l'ouverture.

export const TITRE_DEPOT = 'Déposer un document';

/** Le lien de la navigation « Autres espaces ». */
export const LIEN_DEPOT = 'Déposer un document';

export const BLOCS_COLLECTE_G11: readonly { titre: string; texte: string }[] = Object.freeze([
  {
    titre: 'Ce que vous pouvez déposer',
    texte:
      'Vous pouvez transmettre à votre praticien les documents utiles à votre accompagnement : un courrier, le compte rendu d’une consultation, la liste de vos traitements ou de vos compléments. Avant de déposer un document, vérifiez qu’il vous concerne bien.',
  },
  {
    titre: 'Ce qui se passe ensuite',
    texte:
      'Le document est rangé dans votre dossier, et seul votre praticien peut le consulter. Aucun outil d’intelligence artificielle ne le lit. Aucun document n’est transmis à un tiers. Il est hébergé en France, comme le reste de votre dossier, chez un hébergeur certifié « données de santé ».',
  },
  {
    titre: 'Ce n’est pas une messagerie',
    texte:
      'Déposer un document n’ouvre pas de conversation : vous ne recevrez pas de réponse ici, et votre praticien ne le lit pas dès son arrivée. En cas de symptôme grave ou inquiétant, n’attendez pas : appelez le 15 (SAMU), le 112 (numéro d’urgence européen) ou le 114 (par SMS ou application, pour les personnes sourdes, malentendantes, sourdaveugles ou aphasiques).',
  },
  {
    titre: 'Vos analyses biologiques',
    texte:
      'Le compte rendu de vos analyses biologiques suit un circuit à part, décrit dans « Vos données personnelles ». Il est supprimé une fois ses valeurs relues par votre praticien, et au plus tard 30 jours après son dépôt. Déposez-le à l’endroit prévu pour lui.',
  },
  {
    titre: 'Combien de temps',
    texte:
      'Les documents déposés ici sont conservés avec votre dossier, selon les mêmes règles que le reste de vos données.',
  },
  {
    titre: 'Une erreur, un retrait',
    texte:
      'Si vous avez déposé par erreur un document qui ne vous concerne pas, ou qui concerne une autre personne, signalez-le depuis « Signaler un problème » : il sera retiré. Vous pouvez aussi demander à tout moment à consulter, corriger ou retirer un document déposé (choix « Je souhaite exercer un droit »).',
  },
]);

export const LEGENDE_CATEGORIE = 'Ce que contient le document';
export const LIBELLE_FICHIER = 'Le document : un PDF de 10 Mo au plus, ou une photo (JPEG, PNG ou WebP)';
export const BOUTON_DEPOSER = 'Déposer le document';
export const DEPOT_REUSSI = 'Votre document est déposé dans votre dossier.';
export const TITRE_MES_DEPOTS = 'Mes documents déposés';
export const AUCUN_DEPOT = 'Vous n’avez encore déposé aucun document.';
