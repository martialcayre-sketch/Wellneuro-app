### Le QDRS est réaligné sur son document officiel, et ses droits sont enfin instruits (2026-09-15)

Le praticien a fourni le document officiel du QDRS. Il a rendu **deux choses que
personne n'attendait** : une politique de permission qui nomme nos usages, et
trois divergences cliniques dont une seule était connue.

## Les droits, qui n'étaient « NON INSTRUITS » que faute d'avoir lu

La politique de Galvin / NYU accorde l'usage et la reproduction du QDRS
**« without modification or editing of any kind »** pour le soin clinique et la
recherche non commerciale, et **exclut nommément** :

> (b) the creation of any derivative works of the QDRS, **including translations
> thereof** · (d) incorporation of the QDRS in an **electronic medical record
> application software**

La forme servie par WellNeuro est une traduction française, modifiée, incorporée
dans une application qui stocke des dossiers patients. **Les trois.**

**ARBITRAGE PRATICIEN : POURSUIVRE LE SERVICE**, au titre du soin clinique au
cabinet, la clause contraire étant versée au dossier en toutes lettres.
`droits.statut` reste `permission_obtenue` — et ce n'est pas une contradiction :
dans ce registre l'étiquette se lit depuis le 2026-07-29 « permission **tenue
pour acquise** sous la déclaration du praticien », jamais « licence obtenue ».
La présomption demeure ; sa contestation est désormais écrite. Le document
prévoit la voie de sortie — une autorisation écrite de l'ayant droit — et elle
n'a pas été demandée.

**LE DÉPÔT A FAILLI DIRE NON TOUT SEUL**, et c'est instructif. Passer
`droits.statut` à `a_verifier` a fait rougir `check_questionnaire_certification.js`
en cascade : l'échelle est cumulative (`repere` → `droits_verifies` →
`contenu_verrouille` → `scoring_verifie`), servir le verbatim d'un instrument
exige au moins `contenu_verrouille`, et ce barreau exige des droits dégagés.
**Aucun état ne permet de servir un instrument dont les droits sont
`a_verifier`** — règle écrite le 2026-07-31 après qu'une mutation eut montré
qu'un instrument pouvait sinon « livrer son verbatim intégral sans source, sans
droits vérifiés, sans contenu verrouillé et sans verdict de banc, le CI restant
vert ». Le rail n'a pas été touché.

## Les points de coupure, qui n'étaient pas ceux de la source

Un commentaire du code **et** le banc qui l'épinglait affirmaient tous deux que
la grille avait été « relevée à l'identique » sur Galvin 2015. **C'était faux
aux deux endroits.** La source publie :

| | publié | servi avant |
|---|---|---|
| Normal | 0-1 | 0-1 |
| MCI | 2-5 | 1,5-5,5 |
| Démence légère | 6-12 | 6-12 |
| Démence **modérée** | **13-20** | 12,5-17 « légère à modérée » |
| Démence **sévère** | **20-30** | 17,5-30 « modérée à sévère » |

La bande « légère à modérée » n'existe pas dans la source, et la bande la plus
sévère y commence à 20, non à 17,5 : **un score de 18 ou 19 sortait « démence
modérée à sévère » en rouge là où l'instrument dit « démence modérée »**.
Sur-classement, dans le sens alarmant, sur un outil de stadification de démence
— l'erreur inverse de celle que la revue du 2026-07-30 croyait corriger.

**Deux lectures d'un banc ne valent pas une lecture de la source.** C'est le
constat que ce cas établit, et il est écrit dans le banc.

Aligné, avec **deux arbitrages praticiens épinglés EN TANT QU'ARBITRAGES** et non
comme des valeurs publiées : le chevauchement de la source à 20 (« Moderate
13-20 » ET « Severe 20-30 ») est tranché vers MODÉRÉ, la bande sévère s'ouvrant à
20,5 ; et les demi-pas que la source ne classe pas — 1,5 · 5,5 · 12,5, tous
atteignables — rejoignent la bande supérieure. Sans ce second arbitrage, aligner
sur « 13-20 » ouvrait un trou à 12,5.

## Le domaine substitué, et deux autres qui l'étaient à demi

La source publie « 9. Mood » et « 10. Attention and concentration ». Nous
servions Attention en 9 et **Déambulation** en 10 : l'humeur n'était nulle part,
et un déficit de marche pesait sur un score de sévérité **cognitive**.

Le texte en main a montré que la substitution n'était pas seule. Les descripteurs
servis étaient des paraphrases courtes là où la source décrit chaque niveau en
une phrase clinique complète — et **deux domaines ne faisaient pas qu'abréger** :
en « Toilette et hygiène », le niveau 0,5 servi (« quelques rappels nécessaires »)
correspondait au niveau **1** de la source ; en « Comportement et personnalité »,
le 0,5 servi portait sur l'irritabilité et l'anxiété, qui relèvent du domaine
**Humeur** et non de celui-là. Les dix domaines sont réécrits d'après le texte
publié, dans l'ordre publié.

## Ce qui reste ouvert, et c'est écrit

Les **deux sous-scores** de la source ne sont toujours pas servis — cognitif
(domaines 1, 2, 3, 8) et comportemental (4, 5, 6, 7, 9, 10), plus la dérivation
d'un CDR sur les six premiers. `sum_decimal` ne porte pas de sous-scores : autre
lot. La **traduction** n'est pas validée (`statutContenu` reste `adapte`). Et les
**droits** gardent leur réserve.

**AUCUNE PASSATION PERDUE** : production lue le 2026-09-15 depuis un conteneur
détaché — 188 passations sur trente instruments, **zéro** sur `Q_GEO_05`. Les
identifiants `QD1`-`QD10` sont réattribués dans l'ordre publié sans rien rendre
illisible.

Et la référence du code désignait **une autre revue** : `Alzheimers Dement,
11(4), 461-474` au lieu de `Alzheimers Dement (Amst), 1, 249-259`. Troisième
citation erronée relevée le même jour, après celle de l'AQ.
