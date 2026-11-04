### Atelier corpus : la revue en tête de page, le reste par notebook (2026-11-04)

Suite de #1855, à la demande du responsable du 2026-11-04 : les blocs repliés
laissaient encore un titre par notebook, et il fallait descendre pour trouver ce qui
restait à valider. En vue « Tous », « Sources en revue » ne montre plus que les sources
qui ont des claims en attente ou une revue en cours, rangées par notebook. Une ligne
compte les sources entièrement traitées et renvoie au sélecteur de notebook. Choisir
un notebook affiche toutes ses sources, traitées comprises, pour consultation.
`AtelierCorpus.tsx` seul : ni la route, ni les compteurs, ni la file individuelle ne changent.
