### Commentaires du laboratoire : la base est prête à les conserver (2026-10-10)

Première étape du correctif `D-278` §3 (lot de sécurité 11A) : la base reçoit
de quoi garder les commentaires qu'un laboratoire imprime sur un compte rendu
— valeur critique, hémolyse, contrôle souhaité —, qui disparaissaient du
dossier à la suppression du document. Le commentaire d'un résultat se range
avec ce résultat, ceux du compte rendu entier avec l'import ; ils sont
recopiés tels qu'imprimés, jamais vides, bornés en longueur pour des raisons
techniques, et un commentaire trop long n'est jamais tronqué : il est signalé
« non transcrit ». Une fois relus, ils ne se réécrivent plus. Migration seule,
appliquée par `release-db` après approbation ; rien ne change encore à
l'écran : la lecture des commentaires et leur affichage viennent ensuite.
