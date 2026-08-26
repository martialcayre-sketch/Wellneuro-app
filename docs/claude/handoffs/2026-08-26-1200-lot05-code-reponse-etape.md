# LOT-05 PR 2 — le code de la réponse d'étape (`D-111`)

**Date** : 2026-08-26 · **Campagne** : Alliance 6.0-B — l'objectif à trois voix
**Branche** : `feat/lot05-jalons-code` · **Décision** : `D-111` (complétée)

## Où en est le lot

La migration est **appliquée en production et constatée par conteneur** le
2026-08-26 : cinq contraintes, taxonomie `('J21','J42','J90')` sans `T0`, CHECK
de texte en `btrim(texte, ' \t\r\n')`, RLS active, deux index dont un seul
unique (la clé primaire), zéro ligne. Cette PR est celle qui consomme le schéma.

## Ce qui a été livré

- **`objectifNegocie.ts`** — `ANCRE_JALON`, `JALONS_OBJECTIF`,
  `estJalonObjectif`, `EVA_MIN`/`EVA_MAX`, `LONGUEUR_MAX_REPONSE_JALON`,
  `preparerReponseJalon`. Module toujours PUR, zéro import.
- **`jalonObjectifDu.ts`** (neuf) — la fenêtre, lue de
  `JOURS_JALON`/`TOLERANCE_JOURS_JALON`, sans les redéfinir.
- **`api/portail/dossier`** — troisième geste `reponse_jalon` ; le GET sert
  `reponsesJalon` et `jalonDu`.
- **`api/praticien/objectifs`** — sert `reponsesJalon` en lecture seule.
- **`DossierDeuxVoixView`** — la question d'étape, l'échelle facultative, la
  relecture. **`ObjectifNegociePanel`** — le récit au cockpit.

## Les trois choses à ne pas défaire

1. **`T0` se refuse À LA ROUTE, pas seulement en base.** `resoudreJalonDu` le
   rend pour tout patient sans cycle confirmé. Le laisser passer lève un `23514`
   et rend un 500 sur un chemin qu'aucun palier de test ne traverse.
2. **L'EVA décimale se refuse AU BORD.** La colonne est un `INTEGER` : `5.5`
   est arrondi à `6` **avant** le CHECK, qui l'accepte. La base ne peut pas voir
   la valeur d'avant le cast.
3. **`JALONS_OBJECTIF` est une littérale, et doit le rester.** `G5` interdit à
   ce module d'importer `@/lib/equilibre`, et il part dans le bundle patient. La
   dérivation est vérifiée par `G7`, pas exécutée. Si `G7` rougit, c'est la
   littérale qu'il faut aligner sur `JOURS_JALON`, jamais l'inverse.

## Ce qui reste

- **Revue `wn-reviewer`**, puis **passe Codex** — le lot est **classe P0**
  (surface portail/patient), et cette PR ouvre bien une écriture patient neuve.
- La contre-revue adverse de campagne reste **avant la clôture de campagne**,
  pas ici.
- **`WN_DOSSIER_DEUX_VOIX` est déjà posé en production** : la question d'étape
  s'ouvrira au merge pour tout dossier remplissant ses conditions. Aujourd'hui
  aucun ne les remplit — il n'existe en production ni objectif ratifié, ni cycle
  T0 confirmé sur un tel dossier. La surface n'aura de sujet qu'une fois la
  boucle du LOT-04 tournée au moins une fois.

## Dettes nommées

- Les CHECK de texte **déjà en production** (`amendements_objectif`, 6.0-A)
  emploient `btrim/1` : un texte fait d'une tabulation y passe. Migration à
  part, sans porteur.
- La garde anti-gamification lit les **commentaires** ; les autres gardes de la
  campagne les dépouillent. L'aligner est un changement de garde.
- Pas de CHECK « date non future » (Postgres refuse `now()` dans un CHECK) —
  reconduit de 6.0-A et du LOT-01.
