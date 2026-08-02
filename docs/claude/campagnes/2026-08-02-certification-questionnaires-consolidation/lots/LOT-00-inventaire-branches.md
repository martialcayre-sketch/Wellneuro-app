---
id: "LOT-00"
titre: "Inventaire et classification des branches"
statut: "terminé"
dépend_de: "aucun"
---

# LOT-00 — Inventaire et classification des branches

## But

Identifier toutes les branches non mergées touchant le développement, le
scoring, le banc ou la certification des questionnaires, puis les classer sans
modifier le code.

## Périmètre

- les 36 branches recensées dans `CAMPAGNE.md` ;
- comparaison avec `origin/main` ;
- registre, dossier de certification et définitions pédiatriques.

## Interdits

- aucun cherry-pick, merge ou changement clinique ;
- aucune suppression de branche ;
- aucune donnée patient réelle.

## Tests

- vérification Git des branches non mergées avec le prédicat suivant :

```bash
INC='^(web/src/lib/questionnaires/|web/src/lib/questionnaires-catalog|web/src/lib/scoring/|docs/questionnaires-drive-mapping\.md|docs/claude/corpus/instrument_registry\.json|docs/claude/corpus/measurement_evidence|docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/|docs/claude/propositions/2026-07-29-certification-montee/|docs/claude/propositions/2026-07-30-divergences-scoring/|docs/claude/propositions/.*(ali01|conners|mfi|psqi|eortc|scoring|instrument|certif)|tools/corpus/certify/|scripts/check_questionnaire_certification|tests/wellneuro/golden/|tests/wellneuro/fixtures/scoring)'
for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | sed 's#^origin/##' | sort -u); do
  git merge-base --is-ancestor "$b" origin/main 2>/dev/null && continue
  mb=$(git merge-base origin/main "$b")
  git diff --name-only "$mb" "$b" |
    grep -EI "$INC" |
    grep -Eiv 'complalim|complement|rayon-complements' |
    grep -q . && echo "$b"
done
```

- ajouter `docs/session-log-2026-07-29-certification`, retenue par thème mais
  volontairement absente du filtre de contenu ;
- contrôle des références contre les sources canoniques.

## Critères de done

- liste exhaustive persistée selon le prédicat documenté ;
- séparation entre 15 branches intégrées ou obsolètes et 21 apports à revoir ;
- branche de campagne unique créée depuis `origin/main`.

## Résultats

Trente-six branches classées ; 15 ne justifient pas de réimport automatique et
21 nécessitent une revue ciblée dans LOT-01.
