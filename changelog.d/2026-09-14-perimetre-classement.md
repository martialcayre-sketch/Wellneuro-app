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

**Cinq corrections de revue, dont une qui rouvrait un défaut déjà fermé.** La première
rédaction déstructurait `ORDRE_EVALUATION_ABSTENTION` par POSITION dans `chaineC1.ts` —
c'est-à-dire qu'elle rouvrait le finding M1 de la revue du 2026-08-16, que le commentaire
du fichier décrit pourtant en toutes lettres : permuter deux lignes aurait servi le texte
SÉCURITÉ sur la branche canal, sans qu'aucun banc ne bouge. Le moteur lie désormais par
NOM (`MOTIF_ABSTENTION.securite`), un banc refuse qu'il lise l'ordre, et un autre exige
que l'ordre déclaré soit celui que le `if` code.

Les quatre autres : le banc ne vérifiait que la longueur et l'unicité des deux
identifiants, pas leur EXISTENCE dans la table signée — une divergence n'aurait éclaté
qu'à l'exécution, sur un dossier réel qui s'abstient ; « les quatre textes servis avec
chaque candidat » était faux, deux sont conditionnels, et la distinction compte pour une
relecture (attester « est servi » et « peut l'être, à cette condition » ne sont pas le
même acte) ; « deux termes sur trois sont techniques » contredisait la table juste
dessous — une description fausse DANS un périmètre destiné à la relecture est le pire
endroit où se tromper ; et l'entrée de `SESSION_LOG` avait été placée par la fusion AVANT
une entrée existante du même jour, ce qui réordonne un journal append-only.

Empreinte du périmètre après corrections : `c2fb8332f9527886`. Banc porté à 8 cas, deux
mutations supplémentaires appliquées et tuées — retour à la liaison positionnelle, et
identifiant de motif inventé.

**La passe Codex a bloqué, et elle avait raison sur le point central.** Cette PR
affirmait que « le moteur lit ces données, il n'en garde pas une copie — c'est ce qui
sépare un périmètre d'un document ». **C'était vrai pour deux objets sur cinq.**
`TERMES_DE_CLASSEMENT`, `DEPARTAGE_PLAINTE_EX_AEQUO` et `INVARIANTS_PRODUCTEUR`
n'étaient importés par personne ; les conditions d'affichage vivaient dans un
commentaire, hors empreinte ; et le banc censé prouver la consommation lisait la SOURCE
du moteur — défait par des littéraux concaténés, et plus gravement par un texte révisé
au périmètre que le moteur ignorait. Les trois réfutations ont été **rejouées** avant
d'être admises, la politique faisant primer la preuve déterministe sur un vote de
modèles.

**La liaison se fait désormais par COMPORTEMENT**, sur arbitrage du responsable. Un banc
EXÉCUTE `construireChaineC1` et compare sa sortie aux données déclarées : textes produits
identiques (positif, donc insensible à la concaténation), texte conditionnel absent quand
sa condition ne tient pas, rang et confiance issus des invariants, ordre conforme aux
trois termes rejoués depuis la table, ex æquo nommés. Pour deux des cinq objets c'est le
**seul** lien possible : un départage émergent et un comparateur n'ont aucun paramètre à
brancher.

Empreinte après corrections : `da1ba306c0551d7b`. Les trois réfutations de Codex tuent
désormais 1, 3 et 2 cas. 813 bancs du moteur clinique verts.

**Une erreur de ma reconstitution, dite parce qu'elle a failli accuser le moteur à tort** :
le banc d'ordre lisait `snapshot.plainteDominante`, alors que `construireChaineC1` la rend
à la RACINE. Le rouge initial reprochait au moteur un ordre faux qui était le mien.
