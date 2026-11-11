### Corpus : le geste « exclure de la recherche » à l'atelier (D-490, F05, 2026-11-11)

PR 2 sur 3 de D-490, après l'application de la migration (#1992) et son constat par conteneur. Ni migration ni
marquage en production ; le rattrapage des dossiers clos suit dans la PR 3.

- `exclureDeLaRecherche` (individuel) et `exclureDeLaRechercheLot` (liste) : un claim `VALIDE` verrouillé
  (`FOR UPDATE`), la colonne `exclu_recherche` posée ou levée et un acte `exclusion_recherche` au journal dans la
  même transaction, un claim par acte, un sens et un motif. Le lot est tout ou rien, et ses refus sont nommés :
  introuvable, non validé, ambigu ou d'une autre version. Un claim déjà dans l'état visé n'ajoute aucun acte. Ni le
  statut, ni le signataire, ni la date ne bougent.
- Routes praticien `corpus/claims/exclusion-recherche` et `corpus/claims/exclusion-recherche-lot`. Le motif est
  obligatoire ; il est jugé plus strictement que le CHECK de la base, pour qu'un motif accepté à l'écran ne
  devienne jamais une erreur technique.
- Atelier :
  - badge « Exclu de la recherche » ;
  - filtre « Exclus de la recherche seulement » dans l'onglet Validés ;
  - geste exclure ou rétablir, avec motif obligatoire ;
  - panneau « Exclusion de la recherche en lot » sur liste collée (identifiant ; motif).
- `validite.ts` : les commentaires disent désormais cinq prédicats de validité et un sixième, de recherche, qui
  n'est pas recopié ; un test verrouille cette absence (D-490 §2). La logique ne change pas.
- Banc PostgreSQL `banc-exclusion-recherche-prisma.test.ts`, lancé en CI et en T3. Il vérifie :
  - que le CHECK accepte ce que l'écrivain écrit ;
  - le tout ou rien ;
  - qu'un claim exclu disparaît de `servirRayonCorpus` mais reste valide pour `claimsValidesAuCorpus` ;
  - que rétablir le fait revenir.

  Le banc a été vu rouge sous deux mutations : le prédicat retiré de la fonction, et le refus d'un claim non validé
  retiré du lot.
