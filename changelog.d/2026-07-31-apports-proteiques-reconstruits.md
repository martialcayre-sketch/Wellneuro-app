### Certification — la grille d'apports (`Q_ALI_03`) reconstruite, corrigée et débaptisée

- **Le servi n'était pas l'instrument de sa source.** La source (WN-SRC-0473/0474)
  est une feuille de calcul à cinq colonnes : un nombre de portions par ligne, une
  table de protéines par portion, un coefficient de conversion, et deux totaux
  nommés « Apports totaux en protéines » et « Apports totaux en calories ».
  L'application en avait fait dix items de fréquence, sans aucune quantité — l'exact
  contraire de ce que son titre annonçait. Le dépôt justifiait ce renoncement en
  écrivant qu'un calcul « exigerait le poids, les portions et une table de
  composition, qu'aucun item ne recueille » : c'était vrai de la forme servie, et
  faux de la source, qui porte cette table.
- **23 items de saisie chiffrée**, un par ligne de saisie de la source, servis par
  un moteur neuf (`apports_ponderes`) — aucune branche existante ne savait pondérer
  un *item*, seulement une sous-échelle entière. Il rend les deux grandeurs de la
  source, en grammes de protéines et en calories.
- **Trois écarts à la source, servis et déclarés**, sur arbitrage praticien « le
  calcul, mais corrigé » : « 2 œufs » et « poisson 150 g » passent de 3,6 g de
  protéines — la même valeur pour deux aliments sans rapport, sous-estimée d'un
  facteur 4 à 8 — à 13 g et 30 g ; et les lignes hebdomadaires sont divisées par
  sept, la source additionnant le jour et la semaine sans règle de conversion. Le
  coefficient « × 24 » de conversion en calories est **conservé** : la source ne
  l'explique pas, mais il n'est pas démontrablement faux. L'instrument étant
  corrigé, il est **débaptisé** — « grille WellNeuro, dérivée de la méthode
  Monnier », et non plus la méthode elle-même.
- **Aucun seuil, aucune bande** : la source n'en donne aucun, ni par âge, ni par
  sexe, ni par poids. Les deux grandeurs sont écartées du prompt de synthèse, comme
  l'était déjà le bloc `monnier` — la consigne interdit au modèle de conclure à une
  masse consommée, et lui en livrer une le mettrait en contradiction avec elle.
- **Identifiants neufs** (`AP1`…`AP23`) et non `MO1`…`MO10` : aucune réponse de
  l'ancienne forme ne peut correspondre à un item de la nouvelle, ce qui fait mordre
  d'elle-même la garde de passation vide au lieu de renverser une relecture —
  c'est le défaut trouvé en revue sur le MFI-20.
- **La réserve du 2026-07-30 est fermée.** « La suspension ferme le robinet, pas le
  réservoir » : l'unique passation de production (2026-07-25, mesurée le 2026-07-31)
  portait encore un total et cinq sous-scores qui ne mesurent aucun apport. Elle
  entre au registre des passations non interprétables, avec la frontière datée posée
  pour le MFI-20 — antérieure marquée, neuve lisible.
- **La divergence `nombre_items` du banc est requalifiée sur preuve**, non levée :
  les 39 « items » lus dans la source sont ses 39 lignes de tableau — 25 de saisie,
  10 intitulés de bloc, 4 lignes de calcul. Les 25 lignes de saisie sont toutes
  servies, deux paires d'états exclusifs étant fondues en choix uniques. Même forme
  de requalification que la grille de Tinetti, et même règle : ce sont les axes et
  les totaux qui se comparent, jamais le compteur.
- **Une garde du prompt alimentaire change de forme sans changer de rôle.** Elle
  interdisait toute saisie chiffrée dans un questionnaire alimentaire, parce qu'un
  nombre nu arrive au modèle comme non exploitable. Elle exige désormais que toute
  saisie chiffrée porte une **unité**, qui est ce qui la rend lisible comme quantité
  déclarée.
