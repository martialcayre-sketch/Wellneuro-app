---
id: "2026-09-17-promesse-tenue-partage-medecin"
titre: "La promesse tenue — le refus du patient ferme le courrier"
statut: "active (ouverte 2026-09-17 — un lot, livré dans la foulée de son cadrage)"
créée_le: "2026-09-17"
mise_à_jour: "2026-09-17"
lot_courant: "LOT-00"
branche_campagne: "aucune"
branche_lot_courant: "wn-session-2026-09-17"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# La promesse tenue — le refus du patient ferme le courrier

*Huit versions publiées promettaient une garde que le logiciel ne tenait pas.*

## Objectif

Faire que la phrase lue par le patient et le comportement du logiciel disent la
même chose — **dans les deux sens**. Le texte vient au logiciel : la promesse
cesse d'être absolue et nomme son exception. Le logiciel vient au texte : une
garde ferme réellement ce que le refus prétendait fermer.

## Ce qui a causé cette campagne

`D-222`, écrit dans la nuit du 2026-09-17, a nommé trois pièces sans les
toucher — « dégrader une promesse patient n'appartient pas à une session ». Le
responsable a tranché en session le matin même, formulation par formulation.

**Le défaut, tel qu'il existait.** « Aucun partage avec un tiers (par exemple
votre médecin traitant) n'a lieu sans un choix explicite de votre part » était
écrite depuis la v1 du 2026-07-16. Or depuis le 2026-07-22, un praticien pouvait
consigner un échange, et depuis le 2026-09-15 en **générer** un, sur un dossier
dont le patient avait refusé le partage. Rien ne l'en empêchait : `D-219` §3
posait explicitement TRUST comme **indicateur, jamais garde**.

**Une quatrième pièce, que `D-222` n'avait pas vue** : la même promesse vivait
dans `consentement_suivi@v2` — le texte que le patient lit **au moment où il
consent**, le plus engageant des trois.

**Et l'écran d'accusé portait la phrase fausse en dur.** La séquence « Avant de
commencer » affirmait « Rien ne lui est adressé sans un choix explicite de votre
part », et son bouton final faisait **accuser réception** de cette phrase.

## Ce qui n'est PAS l'objet de cette campagne

- **Le geste de transcription praticien.** La mesure du 2026-09-17 montre qu'il
  n'a jamais servi en deux mois, et le responsable a nommé deux frictions — le
  nom du médecin à ressaisir, et l'onglet à aller chercher après coup. Un lot de
  refonte est en file ; il ne se traite pas ici, et le geste ne se retire pas.
- **La messagerie de santé.** Périmètre fermé par `D-222` §4.
- **La qualification juridique du traitement**, qui appartient au responsable.

## Lots

| Lot | Titre | Statut |
|---|---|---|
| LOT-00 | La garde, les quatre textes, et la trace de formulation | en cours |
