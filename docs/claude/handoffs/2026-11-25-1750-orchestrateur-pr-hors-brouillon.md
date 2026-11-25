# Handoff — file D, pilote cloud : PR hors brouillon avant « prête » (D-540, amendement du 2026-11-25)

## 1. Branche et état Git

- Branche `claude/exciting-cray-95vkt0` (session cloud de reprise de l'orchestrateur), repartie d'`origin/main`
  (97e0d72) après le merge de #2297. Un commit de documentation.
- Hors dépôt, dans cette session : #2345 et #2355 sorties du brouillon ; #2342, #2345 et #2355 redéclarées
  « prête » sur leur tête inchangée après CI et PR-Agent rejoués à 0.

## 2. Objectif

Débloquer trois PR du pilote arrêtées chez l'intégrateur (déclarées « prête » en brouillon) et empêcher que
cela se reproduise.

## 3. Décisions prises

- D-540, amendement du 2026-11-25 : la PR d'une passe sort du brouillon aussitôt ouverte, avant le CI et la
  revue, jamais après « prête ». Choix du responsable du 2026-11-25 (« Débloquer et corriger »).
- La consigne de passe porte la règle et la vérification `.draft == false` avant « prête ».

## 4. Fichiers modifiés

- `docs/decisions/D-540.md` (ligne d'en-tête, amendement final)
- `docs/claude/templates/ORCHESTRATEUR_PASSE.md` (§4)
- `changelog.d/2026-11-25-orchestrateur-pr-hors-brouillon.md`, ce handoff

## 5. Validations exécutées

- `node scripts/wn-attendre-ci.mjs` et `node scripts/wn-revue-pr-agent.mjs` sur #2342, #2345 et #2355 après la
  sortie du brouillon : six codes 0 (têtes 9aaf874f, 3e163d8a, b49fff38 inchangées), puis redéclaration « prête ».
- `npm run check` (T1 complet) sur ce lot : code 0.

## 6. Problèmes ouverts

- Les passes qui tournent avant le merge de ce lot suivent l'ancienne consigne : une PR en brouillon peut
  encore se présenter ; la redéclarer à la main de la même façon.
- Lot 114 (`matrice-visibilite-patient-affichage`) et lot 119 attendent le passage à `fait` des lots 113 et 118
  au merge de leurs PR.

## 7. Prochaine action exacte

1. CI et PR-Agent de la PR de ce lot, puis « prête @<sha> », la PR étant hors brouillon.
2. Au merge de #2342, #2345 et #2355, passer les lots 113, 115 et 118 à `fait`.

## 8. Interdits encore actifs

- Ne jamais sortir une PR du brouillon après « prête » ; ne pas merger (l'intégrateur merge).
- Aucune adresse de page privée dans le dépôt ; ne jamais supprimer une ligne des registres.
- Ni migration, ni schéma, ni clinique, ni donnée patient.
