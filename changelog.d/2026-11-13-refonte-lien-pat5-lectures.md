### Refonte Lien, PAT-5 : lectures et espaces reçus — deux voix, reconnexion à l'envoi, impression (2026-11-13)

Le code de PAT-5 applique les arbitrages du prototype (D-481, compléments
DOC-9 et DOC-10) et les textes de D-488. Il n'ajoute ni décor, ni texte neuf,
ni drapeau, et ne modifie aucune règle clinique.

- **T-33** : la page de compréhension s'intitule « Ce que mon praticien a
  compris de moi », en chargement, en erreur et une fois chargée (Q4a).
  L'intitulé repris sous l'objectif, dans le dossier à deux voix, ne change
  pas.
- **T-36** : « Me reconnecter » paraît sous le seul refus 401 d'un envoi sur
  « Ce qui compte pour moi », sur la compréhension et sur le dossier à deux
  voix (Q6a). Sur les deux derniers, la connexion s'ouvre dans un nouvel
  onglet, et la page garde le texte saisi. `LienReconnexion` reçoit l'option
  `nouvelOnglet`.
- **Deux voix** (Q3a) : dans le dossier à deux voix, les intitulés des deux
  voix deviennent lisibles et prennent les fonds `voice-patient` et
  `voice-practitioner`. Le texte des intitulés est inchangé. À l'impression,
  les fonds tombent et les intitulés restent.
- **Impression** (Q5a) : le retour et les commandes sont masqués sur U23 à
  U25, U27, U28, U37 et U38.
- **E2E** `portail-reconnexion-envoi.spec.ts` : après un 401, une
  reconnexion du même patient dans le nouvel onglet laisse l'envoi repartir
  depuis la page restée ouverte. Sous un autre patient, l'envoi est refusé
  et rien n'est écrit.
