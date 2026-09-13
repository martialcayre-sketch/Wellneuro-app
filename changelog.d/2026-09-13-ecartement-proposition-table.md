### Orientation — la table qui permet d'écarter une proposition, avec son motif

Les recommandations sont recalculées à chaque lecture depuis la table signée :
aucune ligne ne portait l'état d'une proposition, et « je ne veux plus voir
celle-ci » n'était pas exprimable. Les seules sorties étaient d'assigner
l'instrument, ou de le laisser dans la liste indéfiniment — et sur les dossiers
réels lus le 2026-09-12, c'est la seconde qui domine.

`orientation_ecartements` (`D-178`) porte le geste : cible, motif écrit
obligatoire, auteur et horodatage posés **côté serveur**, chaînage append-only.
Même patron que `DecisionPrioritySelection` (`D-127`), parce que c'est la même
nature d'objet — un geste praticien motivé sur un dossier nommé.

**La colonne qui empêche le geste de trahir la doctrine.** L'écartement porte sur
la cible, ce qui correspond au geste réel du praticien. Pris seul, ce choix ferait
taire un axe qui n'a rien demandé : le Cungi est proposé par `R2-STR-02` depuis
l'axe stress **et** par `R-SOM-01` depuis l'axe sommeil, et c'est l'objection
exacte qui fait renoncer à éteindre par cible dans `stopRulesV1.ts`. D'où
`regles_au_geste`, qui fige les règles motivant la ligne à l'instant du geste :
l'écartement est **levé** dès qu'une règle absente de cette liste vient motiver la
même cible, et la ligne revient avec son nouveau motif.

**La reprise est une espèce, pas une colonne nullable.** Reprendre n'est pas
effacer l'écartement : c'est un second geste, avec son auteur, sa date et son
propre motif. Une paire `repris_le`/`repris_par` aurait écrit en place et perdu le
premier motif. L'état courant est la tête de chaîne — écarter, reprendre, écarter
de nouveau : trois lignes, un seul fil.

**Un défaut attrapé par le contrat négatif avant tout déploiement.** La première
rédaction du CHECK central écrivait `array_length(regles_au_geste, 1) >= 1`. Sur
un tableau vide, `array_length` rend **NULL** et non zéro : la condition valait
NULL, et **un CHECK qui évalue à NULL passe** — seul FALSE refuse. La garde qui
rend le réveil possible ne mordait donc pas, et rien ne l'aurait dit. Corrigé par
`COALESCE` des deux côtés.

Deux cas du contrat ne valent que **par paire** : la seconde racine est refusée,
mais la reprise qui chaîne est acceptée. C'est la seule façon de prouver que
l'index de racine est bien **partiel** — un index total passerait le premier et
casserait le second, donc interdirait toute reprise.

**Ce que le schéma ne peut pas tenir**, dit dans le contrat plutôt que laissé
croire : que `regles_au_geste` contienne des identifiants de règles et non de
cibles. Aucune contrainte de base ne le sait, alors que la distinction porte tout
l'arbitrage. C'est la route qui le gardera.

La table entre dans la transaction d'effacement IDP2 **dès cette PR** — le banc de
complétude se dérive du schéma, et il a rougi jusqu'à ce qu'elle y soit. Elle est
déclarée en rubrique 5 du dossier RGPD avant toute ouverture de surface, l'ordre
que le précédent `WN_CB_RESULTS_ENABLED` impose. Sa qualification au titre de
l'article 9 reste due au responsable de traitement, et la ligne le dit.

Aucun code ne lit encore cette table : le geste arrive dans une PR distincte,
après application constatée de la migration (`D-087`).
