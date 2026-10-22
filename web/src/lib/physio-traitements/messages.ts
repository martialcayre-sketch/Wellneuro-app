// Les refus des lignes de données physiologiques et de traitement
// ([[D-335]], BP-13), en français, sans aucune valeur. Deux voix : le
// praticien au cockpit, le patient au portail. Les routes les rendent ; les
// écrans les affichent tels quels.

export const MESSAGES_REFUS_PRATICIEN: Record<string, string> = {
  physio_desactive: 'Les données physiologiques et les traitements ne sont pas ouverts.',
  acte_invalide: 'Le geste demandé est illisible.',
  objet_invalide: 'Le geste demandé est illisible.',
  critere_invalide: 'Le critère est mal désigné. Rechargez la fiche.',
  reponse_invalide: 'Choisissez une réponse dans la liste.',
  mesure_invalide: 'La mesure est illisible ou hors des bornes de saisie.',
  date_invalide: 'La date est illisible.',
  date_future: 'La date ne peut pas être postérieure à aujourd’hui.',
  fin_avant_debut: 'La date d’arrêt précède la date de début.',
  nature_invalide: 'Choisissez médicament ou complément.',
  nom_requis: 'Le nom est requis.',
  texte_trop_long: 'Un texte dépasse la longueur permise.',
  prescrit_invalide: 'Indiquez s’il est prescrit par un autre soignant.',
  remplacement_invalide: 'La ligne visée est mal désignée. Rechargez la fiche.',
  ligne_inconnue: 'La ligne visée est introuvable dans ce dossier. Rechargez la fiche.',
  tete_changee: 'La ligne en vigueur a changé depuis votre lecture. Rechargez la fiche.',
  statut_sans_sexe: 'Le statut menstruel se pose quand le sexe déclaré en vigueur est féminin ou autre.',
  dossier_mineur: 'Ce dossier est celui d’un mineur : ces données ne s’y posent pas.',
  refus_base: 'La base a refusé ce geste. Rechargez la fiche et reprenez-le.',
  conflit_concurrent: 'Un autre geste est passé au même moment. Rechargez la fiche et reprenez-le.',
};

export const MESSAGES_REFUS_PATIENT: Record<string, string> = {
  physio_desactive: 'Cette partie de votre fiche n’est pas encore ouverte.',
  acte_invalide: 'Votre demande est illisible. Rechargez la page.',
  objet_invalide: 'Votre demande est illisible. Rechargez la page.',
  critere_invalide: 'Votre demande est illisible. Rechargez la page.',
  critere_non_ouvert: 'Votre praticien renseigne cette information avec vous.',
  reponse_invalide: 'Choisissez une réponse dans la liste.',
  date_invalide: 'Indiquez la date (au moins l’année), ou cochez « Je ne sais pas ».',
  date_future: 'La date ne peut pas être après aujourd’hui.',
  fin_avant_debut: 'La date d’arrêt est avant la date de début.',
  nature_invalide: 'Votre demande est illisible. Rechargez la page.',
  nom_requis: 'Indiquez le nom.',
  texte_trop_long: 'Un texte est trop long. Raccourcissez-le — rien n’est coupé automatiquement.',
  prescrit_invalide: 'Indiquez s’il vous a été prescrit par un autre soignant.',
  remplacement_invalide: 'Votre demande est illisible. Rechargez la page.',
  ligne_inconnue: 'Cette ligne est introuvable. Rechargez la page.',
  tete_changee: 'Cette information a changé depuis votre lecture. Rechargez la page.',
  retrait_reserve: 'Cette ligne a été confirmée par votre praticien : vous ne pouvez pas la supprimer.',
  statut_sans_sexe: 'Indiquez d’abord votre sexe.',
  refus_base: 'Votre demande n’a pas pu être enregistrée. Rechargez la page et reprenez-la.',
  conflit_concurrent: 'Votre demande n’a pas pu être enregistrée. Rechargez la page et reprenez-la.',
};
