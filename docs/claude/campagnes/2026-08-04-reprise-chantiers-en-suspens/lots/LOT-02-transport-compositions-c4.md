---
id: "LOT-02"
titre: "Transport des compositions C4 — reprendre ou clore"
statut: "livré — capacité et mesure ; le chargement en production reste un geste séparé"
dépend_de: "arbitrage produit sur le rayon compléments"
palier: "T2"
classe: "API"
branche: "lot/handoff-skills-agents-copilot"
campagne: "2026-08-04-reprise-chantiers-en-suspens"
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

## Ce qui a été fait — 2026-08-05

**Repris.** L'arbitrage produit était pré-répondu par le dépôt : `WN_C4_ENABLED=true`,
phases 0 (#482) et 1a (#489) livrées — le rayon est vivant en production.

**Le lot ne visait pas le bon manque.** Les 526 lignes sauvées compilaient, respectaient
le contrat en vigueur et s'authentifiaient comme leurs routes sœurs. Mais **rien ne
POSTait vers elles** : `projeter.mjs` fait toute la résolution et sa propre sortie annonce
« Aucune écriture ». Les merger seules aurait rempli **zéro fiche**. Le travail réel du
lot était le producteur manquant.

**Mesure, sur les 284 Mo réels** : 140 148 fiches vues, **138 728 (99,0 %)** passeraient
de coquille à composition connue ; 575 769 lignes dont 545 900 résolues (94,8 %) ;
**zéro libellé inconnu** — le non-résolu est de l'ambiguïté. 278 lots.

**Le partage assumé** : ce lot livre la capacité et le chiffre. Charger 138 728 produits
est une écriture en base de production, donc un geste d'exploitation distinct, gardé par
deux clés (`--url` confronté à `SUPPLEMENTS_TRANSPORT_HOTE`), sur le modèle de l'import
NABM.

**Ce que deux revues adversariales ont trouvé, et qui n'était pas dans le lot :**

1. Le banc du transporteur ne tournait **nulle part** — ni T1 ni CI. Ses gardes, dont
   « le dry-run n'ouvre aucune connexion », étaient inertes.
2. `compositions.ts` — 446 lignes décidant de 138 728 écritures — n'avait **aucun test**,
   alors que ses deux frères en ont un.
3. La composition s'écrivait par une version passée en argument, jamais la **courante** :
   un produit réingéré aurait vu sa composition écrite sur une ligne que le catalogue ne
   sert pas — succès compté, fiche restée coquille.
4. Rien ne **nommait la cible** avant d'écrire 138 728 produits.
5. **Le rejeu ne réparait pas le dénominateur** : un lot transporté avec un
   `compositionSourceLignes` faux était définitivement figé, alors que trois endroits
   présentaient le rejeu comme le geste de reprise complet.
6. Un premier correctif sur les doublons **inversait le sens du signal clinique** :
   il sortait tous les doublons du dénominateur, y compris ceux qui perdent une dose.
   Mesuré : **7 307 identiques, 2 912 divergents**. Jusqu'à 2 912 fiches auraient affiché
   « Compatible » sur une quantité sous-évaluée.

**Réserve ouverte** : 1 420 fiches ont des lignes source mais aucune résolue. Elles ne
sont pas transportées ; leur `compositionSourceLignes` reste nul, donc leur complétude
est `absente` et l'écran dit « Composition inconnue ». Aucun écran ne ment — mais on sait
quelque chose qu'on ne dit pas.
