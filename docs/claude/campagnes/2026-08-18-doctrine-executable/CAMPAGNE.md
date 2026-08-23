---
id: "2026-08-18-doctrine-executable"
titre: "Doctrine exécutable — les cinq véhicules de l'audit"
statut: "ouverte en primaire (2026-08-23) — huit lots cadrés sur état réel re-mesuré ; trois véhicules déplacés par le cadrage"
créée_le: "2026-08-18"
mise_à_jour: "2026-08-23"
lot_courant: "LOT-01"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Doctrine exécutable — les cinq véhicules de l'audit

## Objectif

Faire passer les règles de la constitution clinique de « opposable sur parole »
([[D-043]]) à « le code refuse ». L'audit doctrinal du 2026-08-11
(`docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md`) a compté 11 règles
acquises, 18 partielles, 13 portées, 16 sans ancrage, et ordonné **cinq
véhicules** de fermeture par coût du report. Cette campagne les exécute — dans
l'ordre que l'audit a arbitré, **corrigé par l'état réel du 2026-08-23**.

Le brief a douze jours et le dépôt a bougé sous lui : deux véhicules sont
partiellement livrés, un est périmé dans sa forme, et un troisième n'est plus
préventif mais **en retard** sur une activation déjà consentie ([[D-093]]).
Le cadrage ci-dessous est écrit sur les mesures, pas sur le brief.

## Résultat observable

1. La constitution clinique **dit l'état atteint** : chaque règle dont les
   trois preuves existent (décision, banc qui mord, statut basculé) porte son
   statut réel et sa référence `D-xxx` — plus aucun retard entre ce que le code
   tient et ce que le document annonce.
2. Le claim porte les axes que la doctrine lui demande — catégorie `A-E`
   (`DC-07`), niveau d'exécution (`DC-13`), population (`DC-14`), nature du
   seuil (`DC-20`) — **en structure**, avec une lecture fail-closed : une
   population absente restreint, elle ne généralise pas.
3. L'objet de sécurité existe comme **type**, avec un producteur réel et un
   pouvoir d'inhibition : un red flag n'ajoute ni ne retire de points
   (`DC-23`, patron `D-021`) et retire un candidat au lieu de coexister avec
   lui (`DC-12`).
4. Les populations particulières **filtrent avant le classement**
   (`DC-43`), et un effet indésirable déclaré interdit la poursuite
   automatique (`DC-42`).
5. Une contradiction entre sources suit une politique de résolution écrite
   (`DC-54`) dont l'escalade praticien est une issue, pas un échec (`DC-55`).
6. Un banc de doctrine détecte une valeur cliniquement signifiante qui
   n'existerait que dans un test (`DC-58`).
7. La question `DC-22` — le total de « Mon équilibre » a-t-il une
   interprétation clinique ? — est **tranchée par une décision**, dans un sens
   ou dans l'autre.

## État réel au cadrage — 2026-08-23

Le brief (2026-08-18) a été re-mesuré ligne par ligne contre le dépôt et
contre la production. **Six constats déplacés**, dont trois qui changent la
composition des lots :

| Le brief / l'audit disait | Mesuré le 2026-08-23 |
|---|---|
| **V1** — « étendre l'objet de discordance du LOT-01 ; vérifier d'abord si la fenêtre tient encore » | **Fenêtre close, véhicule à moitié livré.** `web/src/lib/clinical/contradictionFinding.ts` existe ([[D-041]], [[D-044]]) : **un objet, trois formes** — `DISCORDANCE`, `CONVERGENCE`, `CONFLIT_SOURCES` — et les quatre niveaux de `DC-29` typés mot pour mot (`GraduationConvergence`). `contradictionFinding.guard.test.ts` épingle la liste des clés et interdit tout champ de certitude sous quelque nom que ce soit. **Seule `DISCORDANCE` est peuplée** ; les deux autres formes sont vides à la livraison. V1 n'est donc plus « étendre l'objet » — c'est **écrire les producteurs et la politique** (LOT-06). |
| **V4** — « deux paragraphes dans deux fiches de lot existantes, aucun code » | **Périmé dans sa forme.** Les fiches d'accueil (LOT-05 et LOT-07 de la chaîne T0) sont **livrées** : la campagne T0 est terminée 10/10 depuis le 2026-08-18. Grep du 2026-08-23 : rien dans `web/src/lib` ne porte la tolérance distincte de l'efficacité (`DC-41`) ni la compatibilité simultanée vs séquentielle (`DC-39`). Ce sont désormais des **dettes sans véhicule** — nommées au LOT-08, pas codées ici. |
| **§D** — « le hook d'écriture ne demande rien sur les fichiers cliniques » | **Clos.** Le Socle LOT-02 ([[D-083]]) a posé `demandeClinique` dans `.claude/hooks/protect-wellneuro-files.mjs` : six tables signées et deux fichiers de constantes cliniques passent au niveau « demande », chemins normalisés `path.posix` compris. Le brief l'ignorait. `DC-17` a son banc ; la constitution dit encore « **Banc dû** ». |
| **§E** — « rien ne garantit qu'un `claimId` épinglé existe encore » | **Le mode de défaillance est fermé, le compilateur reste absent.** `claimsEpinglesFraicheur.guard.test.ts` + `prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et son négatif ([[D-042]], [[D-046]]) gardent les trois propriétés que le SQL seul ne tient pas — **avec découverte automatique** des tables signées, donc une table neuve ne passe pas sous le radar. `DC-26` reste **partiel** : `tools/corpus/orientation/` n'existe toujours pas. |
| **§A** — « `typologie_lecture` recouvre-t-elle déjà la taxonomie A-E ? la réponse se lit en une requête » | **Tranché : axe nouveau.** La contrainte `rag_corpus_claims_typologie` (migration `20260722150000`) ferme le vocabulaire sur `déclaré / observé / vécu / interprété` — un axe de lecture, sans rapport avec `A-E`. **Mesure de production** (conteneur `one-off-8873`, lecture seule, 2026-08-23) : **8 224 claims, tous au statut `VALIDE`** ; `metadata` ne porte que `section`, `source_chunk`, `page`, `usage` — rien de doctrinal. Conséquence directe et non négociable du LOT-02 : les colonnes neuves naissent **NULL sur 8 224 lignes**, et `DC-14` lit une population absente comme une **restriction** — la migration crée donc mécaniquement 8 224 claims restreints. C'est un arbitrage de lot, pas un détail d'implémentation. |
| **§C** — « à poser dans le LOT-04, pas après » | **Inchangé dans le code, et le report a commencé à coûter.** `grossesse` / `allaitement` n'apparaissent toujours que dans `trust/contenus/registre.ts` (contenus d'information) ; aucun filtre d'intervention. Or le LOT-04 de la chaîne T0 est livré, `priorityRulesV1` est **signée** ([[D-061]]), et [[D-093]] (2026-08-23) ouvre les recommandations élargies sur trois dossiers **en notant que le classement des candidats n'est couvert par aucune ligne signée, alors que l'ordre EST la recommandation**. V3 n'est plus préventif : il est en retard, et sa fenêtre est la borne de six semaines de `D-093`. |
| **§B** — « `SafetyFinding` existe sans producteur » | **Confirmé, et son sujet s'est élargi.** `chaineC1.ts:315` pose toujours `safetyFindings: 0` en dur ; `evaluerAbstentionImporteurs.guard.test.ts` documente la branche comme inatteignable. **Fait neuf** : le portail capture désormais un **signalement d'effet indésirable** (`api/portail/trust/signalement`, `orienterEffetIndesirable` — sévérité déclarée, action prise, produits concomitants, règle déterministe versionnée). L'audit écrivait « aucune capture d'effet indésirable » pour `DC-42` : il y en a une. L'objet de sécurité a donc **deux producteurs candidats**, pas un. |

Fait transverse : la production est sur **Scalingo** depuis le 2026-08-22
([[D-087]]). Toute lecture d'état se fait par conteneur `scalingo run -d` ; le
MCP Supabase lit la base **gelée**, plus la production. Toute migration
s'applique par `release-db` **après approbation humaine**.

## Les lots

| Lot | Titre | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | L'état atteint — requalifier l'audit, basculer ce qui est déjà acquis | à_faire | — |
| LOT-02 | V2 — la migration du schéma de claim — **CONFIRMATION OBLIGATOIRE** | à_faire | LOT-01 |
| LOT-03 | V5 — le banc de doctrine (`DC-58`) | à_faire | — (se joue pendant l'attente `release-db`) |
| LOT-04 | V3a — typer l'objet de sécurité et lui donner son pouvoir d'inhibition | à_faire | LOT-01 |
| LOT-05 | V3b — les gates de population et l'effet indésirable | à_faire | LOT-02 (releasée et constatée), LOT-04 |
| LOT-06 | V1 achevé — conflit de sources, escalade, sort de la convergence | à_faire | LOT-02, LOT-04 |
| LOT-07 | `DC-22` — le total de « Mon équilibre » a-t-il un sens ? | à_faire | — |
| LOT-08 | Clôture — renvois, constitution à l'état atteint, matrice reconduite | à_faire | tous |

Correspondance avec les cinq véhicules du brief : V2 → LOT-02, V3 → LOT-04 +
LOT-05, V5 → LOT-03, V1 → LOT-06 (redéfini par l'état réel), **V4 → aucun
lot** (périmé, renvoyé au LOT-08). Le LOT-01 et le LOT-08 encadrent : l'un
écrit l'état atteint à l'ouverture, l'autre à la clôture.

**L'ordre suit le chemin critique, pas l'importance.** Le LOT-02 part tôt
parce que le délai d'approbation `release-db` est incompressible et que le
LOT-05 en dépend ; le LOT-03, sans aucune dépendance, occupe précisément cette
attente ; le LOT-04 ne dépend pas de la colonne `population` et peut donc
avancer en parallèle du LOT-02.

## Gates

- **LOT-02 gaté par confirmation explicite** : la migration ne s'écrit
  qu'après accord dans la conversation, **seule dans sa PR**, `release-db`
  entre elle et tout code qui la consomme ; son application se **constate par
  conteneur** ([[D-087]], [[D-092]]) avant le LOT-05.
- **Aucun banc sans sujet.** Une règle dont le comportement gardé n'a pas lieu
  ne s'arme pas : le banc passerait au vert en permanence sans rien prouver.
  C'est la leçon des quatre règles à ne pas intégrer (`DC-05`, `DC-08`,
  `DC-52`, `DC-53`) et elle s'applique à toute règle de cette campagne — y
  compris `DC-29` (voir LOT-06).
- **L'acte d'intégration compte trois preuves, jamais moins** : une décision
  `D-xxx`, un banc ou un contrat qui fait mordre la règle, et le statut
  basculé de *proposition* à *acté* dans `CONSTITUTION_CLINIQUE.md` avec sa
  référence. Un lot qui ne livre que deux des trois n'a pas fermé sa règle.
- **Fenêtre `D-093`** : les recommandations élargies sont ouvertes sur trois
  dossiers pour six semaines, avec relecture praticien avant chaque remise. Le
  LOT-05 (gates de population) est le seul travail de cette campagne qui morde
  sur ce périmètre — il ne le referme ni ne l'élargit ; il en couvre le point
  nommé comme non couvert.
- Toute modification clinique = décision `D-xxx` + fragment `changelog.d/`
  (`DC-17`, `DC-18`), et l'écriture d'un fichier clinique passe par le niveau
  « demande » du hook.

## Invariants de campagne (opposables aux huit lots)

- **Fail-closed partout** : une donnée doctrinale absente restreint, elle ne
  généralise pas. Population absente ⇒ hors population (`DC-14`) ; niveau
  d'exécution absent ⇒ le plus restrictif (`DC-13`) ; nature du seuil absente
  ⇒ pas de lecture clinique.
- **Un red flag n'est pas des points** (`DC-23`) : il ne s'ajoute ni ne se
  retranche, il plancherise ou il inhibe — patron [[D-021]] et [[D-024]], déjà
  au dépôt.
- **Aucun seuil, dose, poids ou borne inventé** (`DC-19`) : cette campagne
  ajoute des **axes** et des **gardes**, jamais un chiffre clinique neuf.
- **Une garde se voit rouge** : chaque banc de cette campagne doit être vu
  rougir quand on le débranche ou qu'on mute la règle qu'il garde.
- **Aucune donnée patient réelle** ; identités de fixture uniquement (Sophie
  Nicola, Jennifer Martin, Michel Dogné) ; aucun seed ni E2E visant un dossier
  réel ([[D-075]]).
- **La constitution est le registre d'avancement**, pas un document
  d'intention : aucun lot ne se clôt sans avoir mis à jour le statut des
  règles qu'il touche.
- Classe clinique : Opus, T3 avant PR migration/scoring/clinique, revue
  `wn-reviewer` avant de passer la main, passe Codex sur les lots P0.

## Questions ouvertes

- **`DC-29` — la convergence a-t-elle un producteur légitime ?** Les quatre
  niveaux sont typés et vides. Les produire est une règle clinique neuve, qui
  exige sa provenance : rien dans le corpus ne dit aujourd'hui à partir de
  combien de sources indépendantes on écrit `CONVERGENCE_MODEREE`. Arbitrage
  au LOT-06 ; défaut assumé en l'absence de provenance : **la forme reste
  vide**.
- **Les 8 224 claims restreints par défaut** : la migration du LOT-02 rend
  mécaniquement inexécutable hors population tout claim sans population
  déclarée. Est-ce l'effet voulu immédiatement, ou derrière un drapeau le
  temps que la curation avance ? Arbitrage du responsable au LOT-02.
- **Qui remplit les axes ?** Le LOT-02 livre la structure ; la catégorie `A-E`
  et la population claim par claim relèvent de la campagne **Curation signée**
  (rang 4), à sa cadence praticien. La campagne ne promet pas le contenu.
- **`DC-26`** restera partiel à la clôture : le compilateur de règles n'est
  au périmètre d'aucun lot, et le banc de fraîcheur ne le remplace pas.

## Hors périmètre

- **Écrire le compilateur de règles** (`tools/corpus/orientation/`) : le banc
  de fraîcheur ferme le mode de défaillance, le compilateur reste souhaitable
  et hors campagne.
- **Curer les 8 224 claims** : catégorie, population et niveau d'exécution
  claim par claim appartiennent à la campagne Curation signée.
- **`DC-39` et `DC-41`** (compatibilité séquentielle, axe tolérance) : leurs
  fiches d'accueil sont livrées, elles n'ont plus de véhicule — nommées au
  LOT-08, pas codées.
- **`DC-50` et `DC-51`** : renvoyées explicitement à la campagne
  `2026-08-10-chaine-alimentaire`.
- **Toute activation, tout drapeau posé en production** : gestes du
  responsable, comme pour les campagnes 6.0.
- **La matrice claim par claim** annoncée en fin de constitution : elle reste
  à faire, et le LOT-08 la reconduit nommément plutôt que de la laisser
  s'effacer.
