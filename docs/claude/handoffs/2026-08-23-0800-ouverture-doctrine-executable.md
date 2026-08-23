# 2026-08-23 08:00 — Ouverture Doctrine exécutable : huit lots sur état re-mesuré

## Ce qui a changé

- **La campagne `2026-08-18-doctrine-executable` est OUVERTE en primaire**
  (geste du responsable, « ok pour cette campagne ») : `CAMPAGNE.md` et
  **huit lots** écrits sur état réel du 2026-08-23 ; état, `ACTIVE_CAMPAIGN`
  et `FILE_ATTENTE` resynchronisés (`activate`, `next_action` tracé) ;
  fragment `changelog.d/` posé.
- Le brief avait douze jours et le dépôt a bougé sous lui. **Trois véhicules
  déplacés** :
  1. **V1 à moitié livré** — `contradictionFinding.ts` porte déjà l'objet à
     trois formes (`D-041`, `D-044`), les quatre niveaux de `DC-29` typés mot
     pour mot, et une garde qui interdit tout champ de certitude *sur le
     type*. Seule `DISCORDANCE` est peuplée. V1 n'est plus « étendre l'objet »
     mais « écrire les producteurs et la politique » (LOT-06).
  2. **V4 périmé** — LOT-05 et LOT-07 de la chaîne T0 sont livrés depuis le
     2026-08-18 ; les deux paragraphes à ajouter n'ont plus de fiche.
     `DC-39`/`DC-41` sont des dettes sans véhicule, nommées au LOT-08.
  3. **§D clos** (Socle LOT-02, `D-083`) et **§E** couvert par le banc de
     fraîcheur à découverte automatique (`D-042`/`D-046`). `DC-26` reste
     partiel — le compilateur `tools/corpus/orientation/` n'existe toujours
     pas et n'est au périmètre d'aucun lot.

## À savoir pour la suite

- **LOT-01 = docs seules, aucun code.** Il re-vérifie les 58 lignes de
  l'audit, bascule `DC-17` (hook `demandeClinique`, `D-083`) et `DC-30`
  (moteur + garde, `D-041`/`D-044`) — la constitution dit encore « Banc dû »
  pour les deux — et formule `DC-29` exactement : **typée, sans producteur**.
- **ARBITRAGE DU 2026-08-23 — LA POPULATION SORT DU CLAIM.** Le cadrage
  initial posait un axe `population` lu fail-closed sur `rag_corpus_claims` :
  sur 8 224 claims tous `VALIDE`, cela écartait tout le corpus d'un moteur qui
  n'existe pas encore. Modèle retenu : **général déclaré + exclusions
  déclarées**, porté par l'**intervention**, pas par le claim.
  Trois appuis — un claim descriptif n'a pas de population, c'est la
  proposition qui en a une (`DC-11`) ; le précédent du dépôt est déjà
  « général déclaré » (`BiologyFunctionalRange.population NOT NULL DEFAULT
  'adulte_tout_venant'` + `CHECK` fermé, `D-068`/`D-069`) ; et un `DEFAULT` sur
  8 224 lignes fabriquerait des déclarations que personne n'a prononcées
  (`DC-17`, `DC-19`).
  **`DC-14` n'est pas modifiée** : sa *portée* est écrite au LOT-01 — elle
  gouverne l'extrapolation d'un claim, pas le défaut d'une colonne ; une
  population générale **déclarée** n'est pas un silence. Si la descente montre
  que le texte ne supporte pas cette lecture, le LOT-01 s'arrête et le dit.
  **Garde-fou non négociable** : une intervention dont les exclusions ne sont
  pas curées se propose **en le disant** (`DC-35`). Sans ce message, « ouvert
  par défaut » devient « aveugle par défaut ».
  Conséquences — LOT-02 à **trois** colonnes et **plus le chemin critique** ;
  LOT-05 et LOT-06 n'en dépendent plus ; la cible de curation devient
  `neCouvrePas` (95 interventions, `null` sur les 95).
- **AUCUN CLAIM N'EST INVALIDÉ, ni ne peut l'être** : `statut`, `validateur`
  et `valide_at` ne sont touchés par aucun lot. Le mot « restreint » employé
  au premier cadrage désignait l'extrapolation, pas la certification — il a
  été lu comme « invalidé » et la formulation a été corrigée partout.
- **LOT-02 = migration, CONFIRMATION OBLIGATOIRE.** Trois axes : catégorie
  `A-E` (`DC-07`), niveau d'exécution (`DC-13`), nature du seuil (`DC-20`).
  Aucun consommateur dans la campagne — le déblocage est **externe**
  (Curation signée n'a aujourd'hui aucun endroit où écrire ces axes), et c'est
  ce qui justifie de partir tôt malgré la perte du chemin critique.
  `rag_corpus_claims` est une table **SQL-brut hors `schema.prisma`**
  (`prisma.config.ts`, `tables.external`) : SQL écrit à la main, pas
  `prisma migrate dev`. Et un fichier posé dans `prisma/checks/` **ne tourne
  nulle part** tant qu'une étape CI ne le nomme (leçon `D-042`).
- **LOT-03 (banc `DC-58`) occupe l'attente `release-db`** — aucune dépendance.
  Piège à ne pas rater : si la descente ne trouve **aucune** valeur orpheline,
  le banc ne se pose pas ; un garde vert en permanence sans sujet ne prouve
  rien. La mesure est alors la livraison.
- **LOT-04 est le seul nœud du graphe** : LOT-05 et LOT-06 en dépendent, plus
  rien d'autre n'est enchaîné. Deux faits utiles — `decisionCard.ts:112` sait déjà
  bloquer sur `safetyFindings.length > 0` (le consommateur est écrit, il n'a
  jamais reçu d'entrée), et `evaluerAbstentionImporteurs.guard.test.ts`
  documente la branche comme inatteignable : **à mettre à jour, jamais à
  contourner**.
- **Fait neuf que l'audit ne pouvait pas connaître** : le portail capture un
  signalement d'**effet indésirable** (`api/portail/trust/signalement`,
  `orienterEffetIndesirable`, règle déterministe versionnée). `DC-42` a donc
  un sujet, et l'objet de sécurité a **deux producteurs candidats** — le
  second est au LOT-05.
- **Fenêtre `D-093`** : les recommandations élargies sont ouvertes sur trois
  dossiers pour six semaines, relecture praticien avant chaque remise. Le
  LOT-05 couvre le point que `D-093` nomme comme non couvert (le classement) ;
  il ne referme ni n'élargit ce périmètre.
- Classe clinique sur les LOT-04, LOT-05, LOT-06, LOT-07 : Opus, T3, revue
  `wn-reviewer`, **passe Codex** (le hook `gate-codex-p0.mjs` la demandera).

## Ouvert

- PR d'ouverture (docs seules) : CI à attendre, merge = Copilot ou go.
- `DC-29` — aucune provenance ne dit à partir de combien de sources
  indépendantes on écrit `CONVERGENCE_MODEREE`. Arbitrage au LOT-06 ; défaut
  assumé : la forme reste vide.
- Le contenu des axes du claim (catégorie, niveau d'exécution, nature du
  seuil) n'appartient pas à cette campagne : c'est **Curation signée**
  (rang 4), à cadence praticien. Le LOT-02 ne livre que la structure.
- **Combien des 95 interventions le LOT-05 curera-t-il ?** Les curer toutes en
  un lot est probablement irréaliste. Le lot doit nommer celles qu'il a
  curées et faire dire au moteur, pour les autres, qu'elles ne le sont pas —
  un périmètre partiel tu serait pire qu'un périmètre partiel déclaré.
- `DC-26` restera partiel à la clôture, et le LOT-08 doit le dire plutôt que
  le laisser passer pour fermé.
