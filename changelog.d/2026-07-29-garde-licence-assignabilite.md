### Une licence non dégagée ne peut plus laisser un instrument assignable en silence

Le fragment de #465 nommait ce trou sous « ce qui n'est PAS couvert » : « rien,
dans le code, ne relie `droits.statut: licence_requise` à l'assignabilité. Ce lot
a pu ouvrir un instrument sous licence non instruite sans qu'aucun garde ne
rougisse. » Ce lot pose la garde manquante, et rien d'autre — **aucun instrument
ne change de statut, aucune assignabilité ne bouge**.

**Pourquoi les gardes existantes ne suffisaient pas.** `bibliotheque.test.ts`
verrouille bien la décision du 2026-07-29 : les cinq fermés le restent, les trois
laissés ouverts aussi. Mais ce sont des **listes d'identifiants tapées à la
main**. Elles ne lisent pas `instrument_registry.json` — le jour où l'instruction
des 42 `a_verifier` fera passer un neuvième instrument à `licence_requise`, rien
ne remarquera qu'il est assignable. Une liste écrite à la main ne peut pas
s'étonner d'une ligne qu'on n'y a pas écrite. Le banc neuf part donc du
**registre**, jamais d'une liste d'ids, et exige que l'exposition constatée soit
exactement celle qui a été décidée : `Q_INF_04`, `Q_NEU_11`, `Q_SOM_02`, chacun
avec son motif écrit à côté de lui.

**Le prédicat retenu est celui de la ROUTE, pas `IDS_ASSIGNABLES`.** Ce dernier
exige une entrée de rayon active ; les trois routes d'assignation, elles,
n'exigent qu'une définition de scoring une fois passé le filtre `IDS_SUSPENDUS`.
Elles sont donc plus permissives, et l'écart entre les deux est précisément la
position « invisible et assignable » que #460 a fermée sur le MMSE et #465 sur
HAD. Garder sur `IDS_ASSIGNABLES` aurait laissé passer le cas même que ces deux
lots ont eu à corriger.

**Deux surfaces, pas une.** L'assignation d'un côté ; `PASSATION_PRATICIEN` de
l'autre, qui porte l'aperçu des items, donc l'usage en consultation. #460 a dû
faire les deux gestes sur le MMSE, parce que fermer la seule assignation en
continuant d'afficher la grille laisse l'usage licencié se poursuivre sur papier.
La liste attendue y est **vide**, et c'est la décision du 2026-07-29 ; elle est
vraie à vide aujourd'hui et mordra le jour où elle cessera de l'être.

**Une troisième assertion garde les deux autres de se taire.** Chemin faux, champ
`droits.statut` renommé, registre déplacé : `SOUS_LICENCE` deviendrait vide et
l'assertion sur la passation praticien passerait au vert sans avoir rien vérifié.

**Preuve par mutation — quatre, toutes rouges.** Un `a_verifier` assignable
(PSS-10) passé à `licence_requise` au registre → « EXPOSÉS SANS DÉCISION » ; la
réouverture d'un fermé pour motif de droits (QLQ-C30) → même verdict ; Epworth
remis en `PASSATION_PRATICIEN` → « grille exposée en consultation » ; les droits
d'Epworth déclarés dégagés au registre → « NOMMÉS MAIS PLUS EXPOSÉS », l'autre
sens de la dérive, celui d'une liste qui vieillit à côté de la donnée qu'elle
commente.

**Ce que ce lot ne fait toujours pas** : il constate, il n'empêche pas. Aucune
route ne consulte le registre à l'exécution ; un instrument sous licence reste
assignable en production tant que son entrée de rayon est active. La garde vit au
CI, et c'est délibéré — brancher les droits sur le chemin d'assignation ferait
dépendre une route patient d'un fichier de documentation.
