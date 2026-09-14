### Clinique — le périmètre du classement est posé et ancré ; l'attestation reste due (2026-09-14)

**`D-162` §5 demandait un choix, et il est fait : signer d'abord (`D-185`).** La clause
conditionne toute généralisation à l'entrée du classement, des textes `LIMITATION_*` et
de l'ordre d'évaluation des motifs d'abstention dans un périmètre **signé**, et exige que
l'amendement qui ouvre le périmètre dise lequel des deux il fait. Celui-ci signe d'abord
— première des deux étapes que cela demande.

**Ce qui restait dehors, et le dépôt le disait lui-même.** `priorityRulesV1.ts` déclare sa
dette en toutes lettres : producteur de candidats, classement à trois termes, quatre
textes servis, ordre des deux motifs, tous dans `chaineC1.ts`, « aucune ligne signée ne
les décrit ». `D-182` a signé les grilles d'orientation et de biologie ; il n'a pas touché
à ceci.

**Ce que le périmètre rend relisable.** Les trois termes de départage **avec leur nature
déclarée** — deux cliniques, le troisième technique, parce qu'un tri alphabétique
d'identifiants n'est pas une hiérarchie soignante et qu'un banc refuse de le présenter
comme telle. Le départage des ex aequo de plainte dominante, avec
`arbitrageCliniqueRendu: false` : il ne l'a pas été, et l'inscrire comme rendu le
fabriquerait. Les quatre textes servis. L'ordre des deux motifs `required`, qui DÉCIDE —
le premier atteint compose le texte servi, et les deux appellent des gestes opposés. Les
trois invariants du producteur.

**Le moteur lit ces données, il n'en garde pas une copie.** C'est ce qui sépare un
périmètre d'un document : `chaineC1.ts` composait ses quatre limitations depuis des
littéraux locaux. Les laisser aurait donné une signature portant sur un texte que **rien
n'exécute** — la forme de la conformité sans son effet, c'est-à-dire `DC-26`. Un banc lit
la source du moteur et refuse qu'un de ces textes y réapparaisse en dur.

**Pourquoi l'ancre précède l'attestation.** Poser le sha maintenant rend mesurable ce sur
quoi la relecture portera : le jour venu, le praticien relit un objet dont on sait qu'il
n'a pas bougé. L'ordre inverse laisse un intervalle où contenu relu et contenu haché
divergent sans trace — le trou exact que `D-180` a montré sur les grilles.

**Ce que l'attestation coûtera, dit maintenant.** Déplacer un terme, réécrire un texte ou
permuter les deux motifs refermera le verrou jusqu'à re-signature. Et
`DecisionSummaryCard` sert aujourd'hui ces quatre limitations sous l'intitulé « Ajoutées
par le moteur (**hors périmètre signé**) » : cet intitulé deviendra FAUX le jour de
l'attestation et devra bouger dans le même lot, sinon l'écran sous-promettra sur du relu.

**Ce que ce lot ne fait pas.** Il ne signe rien — `ATTESTATION_CLASSEMENT` porte
`relu: false`, et un banc échoue si quelqu'un la remplit sans le décider. Aucun
comportement ne change : mêmes textes, même ordre, mêmes rangs, et les 806 bancs du
moteur clinique passent sans édition. Aucune généralisation ne devient possible.

Banc `perimetreClassement.guard.test.ts` (7 cas) : l'empreinte figée, l'attestation
exigée ABSENTE, l'ordre des trois termes, la nature technique du dernier ressort,
l'unicité des deux motifs, la lecture par le moteur, l'anti-vacuité. Quatre mutations
appliquées, quatre tuées — dont « attestation fabriquée » et « motifs permutés ».

**Et une entrée de registre due, enfin écrite (`D-186`).** #1089 (« la priorité d'un axe
se choisit ») a été mergée le 2026-09-13 sans numéro de décision, sur une question posée
au relecteur restée sans réponse : retirer un défaut sur une *bande* appelle-t-il un
`D-xxx` ? Réponse rendue le 2026-09-14 — oui, mais **pas parce qu'un nombre a bougé**.
Aucune valeur n'a changé ; ce qui a changé est le **statut de l'absence**, et c'est
`DC-24` qui le gouverne : un silence cessait d'être lisible comme tel. L'entrée prend un
numéro d'aujourd'hui et **dit qu'elle est écrite après coup** — le commit d'origine
n'annonçait aucun numéro, et lui en attribuer un rétroactivement ferait décrire au
registre autre chose que ce que l'historique Git affirme. Elle voyage dans ce lot faute
d'en avoir un à elle, et le dire est préférable à le glisser.
