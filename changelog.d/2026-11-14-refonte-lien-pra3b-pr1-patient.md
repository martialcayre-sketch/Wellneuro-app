### Refonte Lien, PRA-3b PR 1 : phase Patient (P05 à P07, P31) (2026-11-14)

- `ui/Button` et `ui/Input` passent à 44 px de hauteur au moins, avec un
  anneau de focus (Q8 a). Tous les écrans praticien qui les emploient
  changent de hauteur ; aucun écran du portail ne les importe.
- Fiche administrative (P05) : titre de niveau 4 sous la phase « Patient »
  dans le cockpit (Q2 a), niveau 3 inchangé dans le rayon Patients.
- « Débloquer » (demande de correction) passe de plein à bordé, comme celui
  des questionnaires échus (Q3 a) ; les deux, et « Réessayer la lecture des
  questionnaires échus », passent à 44 px avec focus.
- Renseignements (P06) : un échec de lecture de la fiche signalétique et de
  l'anamnèse porte « Réessayer » (T-17, D-488), sur la ligne d'état de la
  phase comme dans le tiroir ; il relit cette seule lecture, puis rend le
  focus au contenu relu. Les sections du tiroir passent en titres de niveau 3
  sous le titre du tiroir (Q2 a).
- Données physiologiques et traitements (P07) : anneau de focus sur chaque
  geste et champ du panneau ; « Réessayer » devient un bouton de 44 px. Le
  formulaire de traitement, commun au portail (COM-0), n'est pas touché.
- Documents remis et déposés (P31) : titres de niveau 4 sous la phase ;
  gestes de ligne, sélecteur de catégorie et motifs de retrait à 44 px, tous
  bordés.
- Aucun texte neuf hors de D-488, aucun changement serveur, rien de clinique.
