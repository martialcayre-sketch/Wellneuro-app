### Synthèse : « enregistrer » ne remet plus en brouillon une synthèse validée puis imprimée entre-temps (file D, 2026-11-17)

- Le PATCH `api/praticien/synthese` lisait le brouillon hors verrou, puis
  l'action « enregistrer » écrivait le statut lu et le nouveau texte, sans
  verrou ni contrôle d'impression. Si la synthèse était validée puis imprimée
  pour le médecin entre la lecture et l'écriture, elle revenait en brouillon
  et son texte était remplacé, alors que « Mon bilan » le lit en direct.
- « enregistrer » prend désormais le verrou du dossier, comme « vider »,
  « rejeter » et l'impression (D-307). Sous ce verrou, il relit le statut et
  le modèle et refuse (409) s'ils ont changé, puis refuse aussi une synthèse
  imprimée.
- Défaut relevé par `wn-reviewer` pendant la revue de #2215, routé par la
  file B. « valider » et « annoter » sont inscrits au carnet pour un lot
  suivant.
