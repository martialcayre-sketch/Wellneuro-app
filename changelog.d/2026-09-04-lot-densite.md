### Densité du cockpit : cycles anciens repliés, justification repliée (2026-09-04)

**`TrajectoirePanel`** dépliait entièrement chaque cycle — jalons, momentum,
momentum par besoin. Un dossier au quatrième cycle demandait de traverser quatre
blocs complets avant d'atteindre le comparateur. Seuls restent ouverts le cycle
**courant** (le dernier au rang d'ancre, `D-113` §6) et celui qu'un clic sur la
Spirale **sélectionne** : une sélection qui se replierait laisserait le clic sans
réponse visible. Le libellé du repli est la ligne d'en-tête existante, mot pour
mot.

**`PropositionBilanPanel`** : motifs et claims passent sous « Ce qui justifie
cette ligne ». Restent hors du repli le libellé, le statut, le geste de
déclaration, la composition du panel (analytes et rapports calculés, `D-072`) et
l'avertissement « Interprétation sous validation médicale » — un avertissement au
deuxième clic n'en est plus un.

Rien n'est démonté dans les deux cas : `<details>` garde ses enfants dans le DOM,
donc lecture d'écran, recherche du navigateur et impression continuent de tout
trouver, et la promesse du chapô — « chaque ligne cite les claims qui la
fondent » — reste vraie. Aucun texte clinique n'a bougé ; un seul libellé est
nouveau, celui du repli.

**Garde `D-106` durcie, et c'est ce qui a été trouvé en la testant d'abord.** Le
détecteur par libellé exigeait que le fichier d'une surface déclarée contienne
`MENTION_NATURE_INDICE_GLOBAL` ; retirer le `<p>` qui la rend en laissant la
ligne `import` gardait les seize cas au vert. L'import satisfaisait la garde à
lui seul. `sansImports` ferme le trou, du même geste que `sansCommentaires` sur
le premier détecteur — vérifié rouge sous mutation.

**Deux items du lot ne sont pas faits, sur pièces.** Le « gabarit unique de
non-comparabilité (3 variantes → 1 + motif) » confondait deux énoncés que le type
`TrajectoireComparaison` distingue : `versions_differentes` / `version_inconnue`
sont « non comparable » (A8-3), `aucun_cycle` / `un_seul_cycle` sont « pas encore
de quoi comparer » (A8-5-ii). Les fondre en effacerait la différence, et une
seule branche se rend à la fois — le gain de densité est nul. Les « valeur+motif
condensés » du momentum par besoin mettraient sur une ligne unique une valeur
chiffrée et une phrase entière citant sa source ; le `block` actuel est le bon
rendu.
