### Le compteur de « Voir les sources et limites » — la table (2026-09-15)

La surface qui porte la provenance des candidats et les limitations servies est
désormais mesurable. Cette PR pose **la table seule** ; le code qui l'alimente
suit dans une PR distincte, après application constatée (`D-087`).

**Deux espèces, parce qu'un compte d'ouvertures seul ne veut rien dire.**
« 40 ouvertures » se lit comme un résultat sans en être un : sans son
dénominateur, il ne distingue pas une surface consultée systématiquement d'une
surface ignorée quatre-vingt-dix-neuf fois sur cent. `affichage` compte les
montages, `ouverture` les dépliements ; le taux est leur quotient.

**Ce que sa forme rend impossible.** Ni `id_patient`, ni identité de praticien,
ni instant, ni ligne par événement : « ce praticien n'ouvre jamais les
limitations » est une phrase que cette table ne peut pas produire. Même
discipline que `portail_lectures_patient`, qui se prive de toute date pour ne pas
devenir un journal de présence — ici la cible serait le praticien, et un second
registre d'accès par-dessus `journal_acces_dossiers`.
