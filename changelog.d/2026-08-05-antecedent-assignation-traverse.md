### Corrigé

- **L'antériorité d'une assignation traverse jusqu'aux deux consommateurs qui
  l'ignoraient.** Le moteur d'orientation calculait « déjà assigné » et le
  panneau praticien l'affichait en badge, mais ni le modèle qui rédige la
  synthèse ni le bouton d'assignation ne le lisaient : le premier proposait de
  faire passer un instrument déjà chez le patient, le second déclenchait un
  envoi que la route refuse depuis le lot précédent. Le bloc d'orientation
  transmis au modèle porte désormais un segment « État », la consigne système
  dit ce que chacun change à la rédaction (`synthese-v17`), et le bouton cède la
  place au texte de refus de la route — partagé, plus recopié.

  La consigne se garde d'affirmer le négatif. Pour un pack, « déjà assigné »
  n'est vrai que si **toute** sa composition l'est : un pack dont sept
  questionnaires sur huit sont déjà chez le patient ne porte aucun segment.
  Conclure de cette absence qu'il n'a jamais été adressé aurait fait écrire au
  modèle un fait faux, là où le lot ferme un fait tu.

  Deux réserves assumées, qui ne changent rien au comportement livré : l'état
  « couverture inconnue » est sérialisé et documenté mais reste **inatteignable
  en production** — le service écarte en amont les packs à composition inconnue,
  seule source possible de cet état ; et le texte de refus introduit au lot
  précédent est légèrement reformulé, pour ne nommer ni écran, ni objet, ni
  nombre — les trois seraient faux sur au moins une des quatre routes qui le
  rendent.
