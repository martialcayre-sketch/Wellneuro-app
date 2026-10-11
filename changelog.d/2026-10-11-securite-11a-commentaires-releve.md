### Biologie : les commentaires du laboratoire sont relevés et montrés au praticien (2026-10-11)

Dernière étape du correctif `D-278` §3 (lot de sécurité 11A). Le relevé des
comptes rendus passe en `bio-extraction-v4` : l'outil recopie tels
qu'imprimés le commentaire qu'un laboratoire écrit sur un résultat (hémolyse,
valeur critique, contrôle souhaité) et ceux qui portent sur le compte rendu
entier, sans les compléter, les reformuler ni en rien conclure. Le praticien
les lit à la validation, attribués au laboratoire, à côté de chaque résultat
et en tête du compte rendu ; ils restent au dossier après la suppression du
document. Un commentaire trop long n'est jamais tronqué : l'écran dit qu'il
est à lire sur le compte rendu. Une lecture faite avec un procédé antérieur
dit que les commentaires n'ont pas été relevés, au lieu de laisser croire
qu'il n'y en avait pas. Ces commentaires ne sont ni journalisés, ni servis au
patient, ni repris dans un courriel ou un export ; une garde épingle les seuls
modules qui les lisent ou les écrivent.
