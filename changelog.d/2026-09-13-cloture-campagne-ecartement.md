### Clôture — le garde de synthèse retrouve sa portée, la dette RGPD rétrécit de onze, et le workflow est enfin JOUÉ (2026-09-13)

**Le garde de fidélité de synthèse s'arme sur « la table a proposé », pas sur « un
bloc est parti » (`D-181`).** Depuis que l'écartement praticien existe (`D-178`),
une ligne écartée quitte `recommandations` : un dossier dont le praticien avait tout
écarté présentait un tableau vide, et le garde cessait de tourner. L'écart journalisé
depuis `D-055` disparaissait le jour où le geste est entré en service. Rien ne
changeait pour le patient — ce garde n'a jamais censuré la prose du modèle — mais la
trace d'audit changeait de comportement sans qu'aucune décision ne l'ait voulu.

**Et nommer une cible écartée est SIGNALÉ — sous un sens propre.** Une première
rédaction mettait les écartées dans l'allowlist, au motif qu'accuser le modèle de
citer ce que la table proposait serait faux. La revue a montré que cela éteignait le
signal le plus parlant du garde : le modèle ne reçoit PAS une ligne écartée — ni
bloc, ni consigne, ni réponse au dossier —, si bien que la voir revenir sous sa plume
dit qu'il **re-propose ce qu'un soignant a refusé par écrit**. Ce qui règle
l'objection n'est pas l'allowlist, c'est le NOM du fait : le garde émet `ecartee`,
distinct de `pack`/`questionnaire`. Ces deux-là disent « le modèle a cité ce qu'on ne
lui a pas donné » — un reproche de fidélité ; le nouveau dit « le modèle propose ce
qui a été refusé » — un fait à voir, pas une faute. La prose n'est pas coupable
d'avoir pensé à la même chose que la table.

La présentation, elle, n'est pas exigée : une cible écartée reste hors des deux camps
(`éteinte` / `recommandée`), comme les instruments déjà passés. Lui imposer un
marqueur d'extinction serait faux, la présenter comme vivante contredirait le geste.

**Deux champs d'audit sont persistés, pas un** — et l'avoir cru a produit un défaut
que la revue a arrêté : `orientationPacksTransmis` passait par la même fonction que
l'allowlist, si bien que l'élargir faisait nommer, dans un dossier patient, un pack
jamais parti au modèle et refusé par écrit. La fonction est scindée.

**Deux questions, deux prédicats.** `orientationInjectee` — le champ persisté — dit
« un bloc est-il parti », et reste FAUX quand tout est écarté. `orientationAPropose`
dit « la table avait-elle quelque chose à dire ». Les confondre était la cause.

**Un défaut attrapé par une fixture du dépôt** : la première rédaction lisait
`ecartees.length` sans garde, et une charge d'orientation sans ce champ faisait
JETER la génération. La synthèse est *best-effort* ; elle ne doit jamais échouer pour
une forme inattendue.

**L'extinction voyage avec une ligne écartée.** Une ligne éteinte par la table
d'arrêt ET écartée par le praticien perdait sa qualification dans le repli : écarter
la ligne effaçait de l'écran ce qui explique POURQUOI l'exploration avait cessé
d'être proposée. Deux faits de natures différentes, deux affichages — et le motif
d'écartement reste distinct de celui de l'extinction.

**La dette RGPD du 2026-09-09 passe de dix-sept à SIX — onze noms en sont sortis, dont neuf ici.** Neuf de ses noms étaient
des dettes **périmées** : déclarés en rubrique 5 depuis le rattrapage `D-167`, mais
toujours listés — donc **dispensés** de vérification. Supprimer leur ligne en
rubrique 5 n'aurait rien fait rougir. Le dixième est `DecisionPrioritySelection`,
déclarée dans le lot précédent. La dispense achetait un silence qui ne servait plus.

**Le workflow `release-db` est désormais JOUÉ, pas seulement relu.** Les 26
invariants lisent du texte ; c'est nécessaire et insuffisant, et on l'a mesuré :
déplacer d'une ligne le report du SHA vers `$GITHUB_ENV` — avant le repointage au
lieu d'après — ramenait le défaut d'origine à l'identique, **invariants verts**. Le
nouveau banc exécute les étapes sur un dépôt git jouet, avec un `scalingo` jetable :
aucun réseau, aucune API, rien qui puisse toucher la production. Il tue cette
mutation. Une garde du dépôt a d'ailleurs refusé qu'il soit bloquant en CI sans être
joué par un palier local — `parite-check-ci.test.mjs`, la leçon du lint à
l'identique : il est câblé des deux côtés.

**Une entrée de registre écrite après coup, et signalée comme telle.** Le commit
`e653dcde` a livré deux arbitrages cliniques en annonçant « (D-180) » dans son sujet
**sans toucher le registre** : le numéro était pris sans être écrit. Un numéro ne se
libère jamais et la garde de numérotation refuse le trou ; l'entrée est donc comblée
depuis la seule source que le dépôt porte — le fragment du lot — qui reste le récit
faisant foi. `DC-26` est la raison de ne pas laisser le trou : une règle clinique vit
au registre, jamais seulement dans le code.
