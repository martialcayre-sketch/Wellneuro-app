---
id: "LOT-01"
titre: "compilateur-regles-cb04"
statut: "recouvert (clôture campagne 2026-09-04)"
dépend_de: "LOT-00 (CB-03) ; claims biologie validés dans l'Atelier"
---

# LOT-01 (CB-04) — Compilateur de la table de règles biologie

> **Requalifié à la clôture de campagne (2026-09-04, arbitrage du
> responsable).** Les quinze règles publiées sont nées par transcription
> manuelle signée (D-069 : 29 claims relus, shaPerimetre figé), pas par
> compilation du corpus. Un compilateur ne redeviendra pertinent que si la
> cadence de curation signée crée un volume de claims validés qui le
> justifie — aucun dû à ce jour.

## But

Écrire l'outil `tools/corpus/biologie/compile.mjs` (miroir du lot 9
certification) qui régénère `orientationBiologieRulesV1.ts` à partir des seuls
claims du notebook biologie marqués **VALIDÉ**, jamais `EN_ATTENTE_VALIDATION`.

## Résultat observable

- `tools/corpus/biologie/compile.mjs` lit les claims validés du notebook
  biologie et produit un fichier de règles régénéré, avec empreinte sha-256 et
  métadonnées de provenance (`claimId`, `versionClaim`).
- La régénération se fait **par PR revue**, jamais en écriture directe.
- Signature praticien distincte de la table NNPP2 (métadonnées propres,
  décision C du cadrage CB-00).

## Périmètre

- `tools/corpus/biologie/compile.mjs` (nouveau).
- Mise à jour de `orientationBiologieRulesV1.ts` par régénération (pas
  d'édition manuelle).
- Tests du compilateur : rejet des claims non validés, empreinte stable pour
  un même jeu de claims.

## Hors périmètre

- La sélection/priorisation clinique (CB-03, déjà posée).
- La machine à états de la proposition (CB-05).

## Fichiers probables

- `tools/corpus/biologie/compile.mjs`
- `web/src/lib/clinical/orientationBiologieRulesV1.ts` (fichier régénéré)
- `tools/corpus/certification/compile.mjs` (référence de patron, lot 9
  certification — à consulter, ne pas modifier)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Aucune migration ici.
- Ne jamais compiler de claim `EN_ATTENTE_VALIDATION` ou non signé.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier l'état des claims du notebook biologie (combien de `VALIDE` à
  ce stade — état 2026-07-27 : 758 en attente, 0 validé).
- [ ] Écrire le compilateur en s'inspirant strictement du patron du lot 9
  certification.
- [ ] Régénérer la table sur le jeu de claims validés disponible (peut être
  vide au premier passage si aucun claim biologie n'est encore validé — dans
  ce cas le lot livre l'outil, pas nécessairement une table non vide).
- [ ] Exécuter les validations (T1, T2).
- [ ] Documenter les résultats.

## Tests

- T1 après chaque édition.
- T2 avant tout commit.
- Test unitaire : un claim non validé est exclu de la compilation ; deux
  compilations du même jeu produisent la même empreinte sha-256.

## Critères de done

- Outil fonctionnel, testé, revue par PR.
- Aucun claim non validé n'apparaît dans la table régénérée.

## Résultats

À compléter à la clôture.
