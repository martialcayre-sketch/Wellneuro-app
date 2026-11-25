### CI : les bancs d'outillage que seul `npm run check` jouait tournent aussi en CI (2026-11-25)

Treize bancs de `bancs-outillage-check` (`web/package.json`) ne tournaient
nulle part dans `.github/workflows/ci.yml` : intégrateur (`wn-integrer`),
focus PR-Agent, passe de l'orchestrateur cloud, nettoyage des branches,
client REST de `gh`, journaux de one-off, revue Copilot, environnements des
workflows, seuil visuel, ancres de doctrine, réexpédition à la racine,
palier T1 (`wn-check-rapide`) et densité du context pack. Un garde redevenu
muet restait donc vert tant que personne ne rejouait `npm run check` — le
défaut que l'étape « Gardes de merge et contrôle des registres (bancs) »
avait fermé pour huit autres bancs (lot `orchestration-3`).

Une étape sœur, placée juste après elle dans le job `controles`, les joue.
Tous constatés hermétiques (dépendances injectées, faux `gh` ou arrêt à
l'usage avant tout appel externe) : verts sous réseau coupé et sous un
environnement vide sans `gh` dans le `PATH`, sans dépendance npm. La parité
CI → `check` reste intacte (le banc de parité est vert, et l'écart
`bancs-outillage-check` \ `ci.yml` est vide). Aucun script ni banc modifié,
aucune couverture retirée (lot `ci-bancs-gardes-merge-manquants`).
