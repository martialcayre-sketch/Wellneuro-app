# Gouvernance questionnaires et scoring

Date de création : 2026-07-06.

Ce document fixe les règles applicables à toute modification de questionnaire, d'option, de conditionnel, de moteur de scoring, de seuil ou d'interprétation clinique.

## Source de vérité

- La source fonctionnelle Wellneuro par défaut est le dossier Google Drive `QUESTIONNAIRES MD`.
- Une version officielle externe ne remplace pas le MD Drive sans validation clinique explicite.
- Une incohérence présente dans un MD Drive doit être documentée comme ambiguïté ; elle ne doit pas être corrigée silencieusement.
- Les fichiers `00_index_*` et les doublons Drive ne créent pas automatiquement de questionnaire applicatif.

## Règle de changement clinique

Toute modification clinique doit mettre à jour les trois traces suivantes dans la même passe :

1. `CHANGELOG.md` : nature clinique du changement et impact potentiel.
2. `docs/questionnaires-drive-mapping.md` : statut items/options/conditionnels/scoring/interprétation/tests.
3. `scripts/check_questionnaire_certification.js` : fixture si le statut `Tests` passe à `certifié`.

Une modification clinique est notamment :

- ajout, suppression, renommage ou réordonnancement d'item ;
- changement d'option, valeur numérique ou conditionnel ;
- changement de seuil, moteur de scoring ou interprétation ;
- changement de source de vérité ou de statut de certification.

## Statuts de certification

- `certifié` : vérifié contre le MD Drive et couvert par fixture automatisée quand le scoring est concerné.
- `mappé` : source MD identifiée mais audit détaillé ou fixture à poursuivre.
- `ambigu` : source Drive conservée mais incohérente ou incomplète.
- `historique` : conservé pour compatibilité sans source Drive certifiée.
- `doublon` : source ou questionnaire fonctionnellement doublonné, sans création automatique.
- `absent Drive` : aucun MD équivalent identifié.

## Sortie de scoring

Les nouveaux moteurs doivent retourner une forme compatible avec `ScoreResultBase` :

- `total` et `maxTotal` quand un score principal existe ;
- `subScores` quand le résultat est multidimensionnel ;
- `missing`, `missingIds` et `notApplicable` quand utile ;
- `note` pour toute ambiguïté source ou règle clinique non automatisée ;
- `certification` pour les scores certifiés ou ambigus Drive.

Les questionnaires normatifs sans tables validées ne doivent pas automatiser de T-score ou percentile. Ils peuvent retourner une somme brute documentée.

## Contrôles obligatoires

Avant de considérer une passe clinique terminée :

```bash
cd web && npm run type-check
cd web && npm run scoring-check
bash scripts/check_no_secrets.sh
```

`npm run scoring-check` doit rester strict : couverture de la matrice, statuts autorisés, types de scoring connus, absence de `NaN`/`Infinity`, fixtures des questionnaires certifiés.

Si `check_no_secrets.sh` échoue sur un fichier local ignoré, signaler le fichier sans affaiblir le script et sans exposer le secret dans les journaux ou commits.
