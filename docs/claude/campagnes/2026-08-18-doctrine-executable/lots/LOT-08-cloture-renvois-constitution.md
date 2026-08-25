---
id: "LOT-08"
statut: "terminé"
dépend_de: "tous les lots précédents"
---

# LOT-08 — Clôture : renvois, constitution à l'état atteint, matrice reconduite

> **LIVRÉ le 2026-08-25 — `D-109`. La campagne est close.** Six règles
> franchissent leurs trois preuves, vérifiées ici et non sur la foi d'un lot
> déclaré terminé : `DC-09`, `DC-19`, `DC-22`, `DC-23`, `DC-54`, `DC-55` — les
> cinq bancs cités existent et tournent. Ce qui **n'est pas** fermé est écrit
> règle par règle. Les quatre non armées sont reconduites sur preuve
> **structurelle** et non plus sur un comptage. Les orphelines recomptées au
> grep : **13**, inchangé. Aucun code modifié.
>
> **CETTE FICHE ÉTAIT PÉRIMÉE SUR UN POINT, et le lot a suivi l'arbitrage le
> plus récent.** Le §2 ci-dessous annonce les dix orphelines comme « dettes
> nommées sans véhicule ». C'est l'option que le responsable a **écartée** le
> 2026-08-24 ([[D-107]]), au profit d'une **campagne dédiée** — et pour ce
> motif exact : « dettes nommées » est le régime qui les avait rendues
> orphelines. La fiche a été cadrée avant cet arbitrage ; elle n'est pas
> réécrite, elle est amendée ici. Le lot **prend acte**, il n'arbitre pas.

## But

À la fin de ce lot, la constitution clinique **est le registre d'avancement**
qu'elle prétend être : chaque règle porte son statut réel, chaque règle non
fermée porte son motif, et rien de ce que la campagne n'a pas fait ne
s'efface. Aucun code n'est modifié.

## Périmètre

1. **Basculer les règles fermées par la campagne**, chacune avec ses trois
   preuves — décision, banc qui mord, statut. Le lot vérifie les trois ; il ne
   bascule pas sur la foi d'un lot déclaré terminé.
2. **Renvoyer explicitement, plutôt que de laisser traîner** :
   - `DC-50` (fréquence ≠ gravité) et `DC-51` (qualité de l'assiette ≠ réponse
     individuelle) → campagne `2026-08-10-chaine-alimentaire`, qui est leur
     matière ;
   - `DC-39` (compatibilité simultanée vs séquentielle) et `DC-41` (axe
     tolérance distinct de l'efficacité) → **dettes sans véhicule**. Le
     véhicule V4 de l'audit était « deux paragraphes dans deux fiches de
     lot » ; ces fiches sont livrées depuis le 2026-08-18 et le code ne porte
     ni l'un ni l'autre. Les nommer ici est le seul acte qui les empêche de
     disparaître avec le véhicule périmé.
   - **Les dix orphelines restantes** ([[D-096]] a sorti `DC-09`) : `DC-03`, `DC-36`,
     `DC-38`, `DC-39`, `DC-40`, `DC-41`, `DC-44`, `DC-45`, `DC-47`, `DC-48`,
     plus la part de `DC-11` hors exclusions. Le responsable a tranché : elles
     restent **dettes nommées sans véhicule**, et ce lot les écrit comme
     telles. `DC-09` fait exception — elle a reçu le **LOT-09**. La liste se
     vérifie par `grep -c '\*\*Orpheline\*\*'` sur la constitution, qui doit
     rendre **13** au moment d'écrire (onze statuts, deux dans l'en-tête qui
     définit le marqueur) — moins un par orpheline refermée entre-temps. Le
     lot **recompte** plutôt que de recopier ce chiffre.
3. **Reconduire les quatre règles à ne pas armer** (`DC-05`, `DC-08`,
   `DC-52`, `DC-53`) : leur déclencheur est nommé, il n'y a aucun travail — et
   c'est un état légitime, pas une dette. Vérifier qu'aucun déclencheur n'est
   arrivé entre-temps (un premier claim dérivé, une première exécution `AUTO`,
   un premier socle populationnel référencé).
4. **Reconduire nommément la matrice claim par claim** — la descente des
   claims certifiés dans la grille `DC-07` / `DC-13`, annoncée en fin de
   constitution et en fin d'audit. Elle reste à faire, et elle est désormais
   **entièrement** chez **Curation signée** : sa structure y a suivi le LOT-02
   transféré ([[D-096]]), sa cadence y était déjà. Un travail annoncé deux
   fois et jamais routé finit par ne plus être annoncé.
5. **Dire ce qui reste partiel et pourquoi** : `DC-26` (le compilateur de
   règles n'existe toujours pas), et toute règle dont un lot n'a livré que
   deux preuves sur trois.
6. Mettre à jour `AUDIT_DOCTRINE_CHAINE_T0.md` avec la répartition finale, et
   `FILE_ATTENTE.md` avec le sort de la campagne.

## Interdits

- **Aucune bascule sans ses trois preuves**, y compris pour une règle qu'un
  lot a déclarée close : le lot de clôture vérifie, il n'enregistre pas.
- **Aucune modification de code.**
- Ne pas déclarer fermé un véhicule dont les règles sont renvoyées : un renvoi
  est un routage, pas une fermeture.
- Ne pas supprimer les lignes de l'audit d'origine : elles s'amendent et se
  datent (le constat du 2026-08-11 reste lisible).
- Ne pas résumer la campagne en promettant ce que les lots n'ont pas livré.

## Dépendances

Tous les lots précédents. Le lot ne s'ouvre pas tant qu'un lot reste en cours
— il constate un état, et un état en mouvement ne se constate pas.

## Étapes

1. Vérifier les trois preuves de chaque règle que la campagne prétend fermer.
2. Basculer les statuts vérifiés ; laisser les autres, avec leur motif.
3. Écrire les renvois (`DC-50`, `DC-51`) et les dettes sans véhicule
   (`DC-39`, `DC-41`).
4. Vérifier les quatre déclencheurs des règles non armées.
5. Reconduire la matrice claim par claim, en la routant vers Curation signée.
6. Répartition finale dans l'audit ; `FILE_ATTENTE.md` ; `/wn-finish` et
   handoff avant la PR.

## Tests

- T2 — des bancs lisent la doctrine ; une renumérotation ou une citation
  cassée les fait rougir.
- Relecture croisée : chaque bascule cite une décision **existante** et un
  banc **qui tourne** (nommé dans une étape CI ou dans une suite).

## Critères de done

- [x] Chaque bascule vérifiée sur ses trois preuves, aucune sur parole — six
      règles, cinq bancs nommés et présents au dépôt.
- [x] `DC-50`/`DC-51` renvoyées à la chaîne alimentaire ; `DC-39`/`DC-41`
      nommées sans véhicule — et rattachées à la campagne dédiée ([[D-107]]),
      l'arbitrage ayant changé après le cadrage de cette fiche.
- [x] Les quatre règles non armées reconduites, déclencheurs vérifiés
      **structurellement** : aucune colonne de claim parent, aucune colonne de
      niveau d'exécution, aucun socle référencé (« PNNS 4 » n'est qu'un libellé
      d'item de questionnaire).
- [x] La matrice claim par claim routée chez **Curation signée**, aux deux
      endroits qui l'annonçaient sans destinataire.
- [x] `DC-26` et tout reste partiel documentés avec leur motif — `DC-20`,
      `DC-26`, `DC-42`, `DC-43`, `DC-58`, plus les quatre non armées.
- [x] Audit amendé **ligne par ligne et daté** (le constat du 2026-08-11 reste
      lisible), répartition finale écrite, `FILE_ATTENTE.md` à jour ; clôture
      écrite avant la PR.
