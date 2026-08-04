---
lot: "LOT-02"
campagne: "2026-08-04-reprise-chantiers-en-suspens"
titre: "Transport des compositions C4 — reprendre ou clore"
statut: "à instruire"
classe: "API"
branche: "lot/handoff-skills-agents-copilot"
---

# LOT-02 — Transport des compositions : reprendre ou clore

## But

Trancher le sort du transport des compositions du catalogue compléments : remplir les
fiches produit avec leurs ingrédients, ou abandonner cette voie par écrit.

## Ce qui existe déjà, et où

Branche **`lot/handoff-skills-agents-copilot`** — le nom ne dit pas son contenu, c'est un
héritage. Son commit de tête d'origine (skills) est **déjà sur `main`** sous #513 ; seul
le commit de sauvegarde `4402fd50` est inédit :

- `web/src/lib/supplement-library/compositions.ts` — 446 lignes ;
- `web/src/app/api/internal/supplements/compositions/route.ts` — 80 lignes.

**Ces 526 lignes n'étaient suivies par git d'aucune manière.**

## Pourquoi ça compte

Le catalogue compte **140 148 fiches qui sont des coquilles** : zéro composition, zéro
ingrédient. Ce n'est pas un détail de complétude — **six critères de recherche sur huit
sont impossibles** tant que la donnée n'est pas chargée, et le trou de dose plafonne le
cumul à 35,3 % des fiches. Les compositions sont déjà sur disque ; le bloqueur est le
pivot vide.

Ce chantier est la voie de chargement. Sa valeur dépend donc entièrement d'un arbitrage
produit : **le rayon compléments est-il un axe actif ?** Si la réponse est non, ce lot se
clôt sans code et c'est la bonne issue.

## Périmètre

`web/src/lib/supplement-library/`, `web/src/app/api/internal/supplements/`.

## Travaux

1. **Arbitrage produit d'abord** — reprendre le rayon compléments, oui ou non. Tout le
   reste en dépend, et instruire le code avant cette réponse serait dépenser pour rien.
2. Si oui : rebaser sur `main` et mesurer l'écart. `supplement-library/` a bougé depuis
   (contrat V3 des références, D-008 du 2026-08-03) — la surface d'appel a pu changer.
3. Vérifier la cohérence avec `doseParDjr` : le renommage de #504 est **délibéré** et la
   grandeur est « par apport journalier de référence », pas « par portion ».
4. Vérifier qu'aucun écran ne rend « Compatible » ou « Aucun cumul » sur une composition
   vide — c'est le correctif clinique de la phase 0 (#482), et le transport des données
   est exactement ce qui réveille cette classe de défaut.
5. Décider : livrer derrière `WN_C4_ENABLED`, ou clore par écrit.

## Interdits

- Ne pas réintroduire `doseParPortion`.
- Ne pas activer le rayon en production dans ce lot : le transport et l'activation sont
  deux décisions.
- `[]` n'est pas `null` : une composition vide ne se lit pas « aucun cumul ».

## Tests

**T2** minimum (`test:worktree -- --fast`). **T3** si une migration entre au périmètre.

## Critères de fin

- Soit les compositions sont transportées, mesurées (combien de fiches remplies, combien
  de critères de recherche débloqués), et le résultat est chiffré et écrit ;
- soit une note dit pourquoi la voie est abandonnée, et la branche est supprimée.
