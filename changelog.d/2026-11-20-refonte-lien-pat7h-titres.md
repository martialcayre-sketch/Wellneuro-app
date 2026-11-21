### Refonte Lien, PAT-7h : « Merci ! » en titre de page, et les titres des lectures et des transmissions en Lora (2026-11-20)

Lot de correction issu de la comparaison aux prototypes
(`pat7-constat-prototypes.md` §3.1 et §4), ouvert par le responsable le
2026-11-20.

- **Fin de l'entrée** (U09) : « Merci ! » devient le `h1` de l'écran, qui
  n'en avait aucun (même classe d'écart que PAT-7b). Rien ne change à l'écran.
- **Police des titres** : les `h1` de Mon bilan (U26), de la fiche remise
  (U29), de Pour votre médecin (U30), des deux courriers (U31, U32), du dépôt
  de documents (U33), de la transmission d'un compte rendu (U34) et de Mes
  échanges (U36) passent en Lora (`font-display`), en gras et en interligne
  serré. Ce sont les classes de `PatientPageHeader`, qui titre les autres
  pages du portail, et celles des prototypes. Dans les trois lectures de
  documents, la règle vaut aussi en chargement, en erreur et sans document.

Aucun texte neuf. Aucune route, garde, drapeau, schéma ni règle clinique
modifiés ; aucun texte de consentement, de droits ni de sécurité modifié ;
aucun décor avant COM-1. La frise de U09 n'en fait pas partie : c'est une
largeur, rangée au §3.2 du constat.
