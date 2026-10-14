### Biologie : annuler un résultat saisi par erreur, le code consommateur (BP-09, D-294, 2026-10-14)

PR 2 du lot BP-09 (fiche LOT-09), après la release-db de la PR 1 constatée
par conteneur. Un résultat de biologie saisi dans le mauvais dossier, à la
mauvaise date ou sous le mauvais analyte s'annule depuis la fiche du
praticien ; rien ne s'efface. Aucune règle clinique, aucun seuil, aucune
qualification de valeur.

- **Le geste, sur la fiche praticien** (« Estimé ↔ mesuré ») : « Annuler ce
  résultat » sur la mesure qui fait foi, avec un motif pris dans la liste
  fermée (mauvais dossier, mauvaise date de prélèvement, mauvais analyte) ;
  « Révoquer l'annulation », une fois, avec son propre motif fermé. Aucun
  texte libre.
- **Le marquage** : le résultat annulé reste à l'écran, barré, « annulé »,
  avec son motif, son auteur et sa date ; les autres lignes de son fil le
  rappellent. Il ne se corrige plus — la route le refuse, la base aussi.
- **Les lecteurs de calcul l'excluent** (D-294 §6) : derniers résultats et
  portes biologiques des assiettes (la mesure d'avant revient, ou le
  silence), contrôles de doublon de la saisie groupée et de la validation
  d'un import (la place annulée est libre, comme la garde en base le veut),
  signalement « même jour » de l'écran d'import. Le fil est celui de la
  racine de chaîne, à l'identique de la base.
- **Route neuve** `POST /api/praticien/biologie/resultats/annulations` (actes
  `annulation` et `revocation`) : seul le praticien du dossier, dossier non
  clos, sous les verrous de la garde en base (le dossier, puis la clé) ; les
  refus sont nommés (cible inconnue, ligne déjà corrigée, fil déjà annulé,
  annulation introuvable ou déjà révoquée, place reprise) avant que la base
  ne les oppose.
- **La correction** s'écrit désormais sous ces mêmes verrous, et refuse un
  fil annulé (`correction_resultat_annule`, 409).
- **Bancs** : `annulationParLigne` et `derniersResultatsParAnalyte` (pur),
  route d'actes, route des résultats, saisie groupée, décisions d'import,
  portes, écran ; le banc du client Prisma réel éprouve en plus le verrou de
  clé, la lecture des seules annulations actives et la place libérée puis
  reprise.
