// Les refus des gestes de constat ([[D-331]], BP-11), en français, sans
// aucune valeur. La route les rend ; l'écran les affiche tels quels.

export const MESSAGES_REFUS_CONSTAT: Record<string, string> = {
  constats_desactives: 'Les constats du parcours ne sont pas ouverts.',
  acte_invalide: 'Le geste demandé est illisible.',
  hypothese_invalide: 'L’hypothèse est mal désignée. Rechargez le parcours.',
  structure_non_signee: 'La structure des fiches d’usage n’est pas encore signée : aucun constat ne se pose.',
  hypothese_hors_structure: 'Cette hypothèse ne figure pas dans la structure signée.',
  verdict_invalide: 'Choisissez un verdict dans la liste.',
  motif_invalide: 'Choisissez un motif dans la liste de ce verdict.',
  note_invalide: 'La note est illisible.',
  note_trop_longue: 'La note dépasse 2000 caractères.',
  note_requise: 'Le motif « autre motif » demande une note.',
  date_invalide: 'La date « à revoir le » est illisible.',
  date_passee: 'La date « à revoir le » doit être postérieure à aujourd’hui.',
  pieces_invalides: 'Les pièces sont mal désignées. Rechargez le parcours.',
  piece_requise: 'Un constat « confirmée » ou « non retenue » cite au moins une pièce.',
  piece_inconnue: 'Une pièce citée est introuvable dans ce dossier. Rechargez le parcours.',
  piece_corrigee: 'Un résultat cité a été corrigé : citez la valeur qui fait foi.',
  piece_annulee: 'Un résultat cité est annulé : il ne se cite plus.',
  passation_exclue: 'Une passation citée est exclue du raisonnement : elle ne se cite plus.',
  remplacement_invalide: 'Le constat à remplacer est mal désigné. Rechargez le parcours.',
  tete_changee: 'Le constat en vigueur a changé depuis votre lecture. Rechargez le parcours.',
  refus_base: 'La base a refusé ce geste. Rechargez le parcours et reprenez-le.',
  conflit_concurrent: 'Un autre geste est passé au même moment. Rechargez le parcours et reprenez-le.',
};
