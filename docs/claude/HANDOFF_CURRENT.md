# Handoff — 2026-08-03

## Git

- Branche `main`, arbre propre. Dernier commit : PR **#543** (squash), mergée
  et branche distante supprimée depuis cette session.
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`
  **inchangée par ce lot** : LOT-00, LOT-03, LOT-04 restent livrés (LOT-04 est
  arrivé en parallèle via une autre session pendant celle-ci). Ce lot est
  orthogonal à la campagne — orchestration des skills WN, hors périmètre
  packs/moteur.

## Objectif de ce lot

Faire en sorte que les skills d'orchestration de campagne (`wn-lot` en tête)
puissent réellement appliquer un modèle, un effort et une réflexion différents
selon l'étape en cours — demande explicite de l'utilisateur, suite à un constat
que `wn-lot` classait déjà un lot en modèle/palier/revue sans jamais exécuter
ce choix. **Livré et mergé** (#543).

## Décisions prises, et pourquoi

- **Aucun skill ne peut appeler `/model`** : la commande est interceptée par le
  harnais avant d'atteindre le modèle. Conclusion tirée avant d'écrire une
  ligne : le seul levier réel pour changer de modèle est de déléguer l'étape
  via l'outil `Agent` (sous-agent épinglé, ou paramètre `model` explicite qui
  prime sur l'épinglage par défaut).
- **`wn-lot` confie désormais chaque étape de sa séquence à un appel `Agent`**
  (cadrage → `wn-explorer`/`wn-reviewer`, exécution → `general-purpose`, revue →
  `wn-reviewer`/fork `Explore`), avec le mot-clé de réflexion natif
  (`think`/`think hard`/`think harder`) écrit littéralement dans le prompt —
  seul levier scriptable pour l'effort, l'outil `Agent` n'exposant pas de
  paramètre effort séparé (contrairement à `Workflow`, hors mécanisme utilisé
  ici).
- **Exception documentée et corrigée en cours de route** : le mode Plan
  (`EnterPlanMode`) reste **natif à la session**, jamais délégué. Un premier
  jet le déléguait à un agent `Plan` — revu et corrigé, parce que déléguer
  aurait supprimé la porte d'approbation humaine (`ExitPlanMode`) qui est tout
  le sens de l'étape. Si le modèle de cette étape doit correspondre à la
  classe, c'est `/wn-model` qui recommande `/model opusplan` **avant**, pas une
  délégation.
- **Étendu à `wn-plan`, `wn-pr`, `wn-finish`, `wn-merge`** (demande explicite de
  l'utilisateur) : chacun gagne une échappatoire vers `Agent(wn-reviewer)` sur
  les classes à risque (Scoring/clinique, Prisma/migration, Auth), utilisable
  même hors séquence `wn-lot` — `wn-lot` reste la seule source de vérité pour
  la table de classification, référencée par les 4 autres, pas dupliquée.

## Fichiers livrés

- `.claude/skills/wn-lot/SKILL.md` — colonne « Effort · réflexion » dans le
  tableau de classification, section « Comment le modèle et l'effort
  s'appliquent réellement », séquence et sortie de proposition mises à jour.
- `.claude/skills/wn-plan/SKILL.md`, `wn-pr/SKILL.md`, `wn-finish/SKILL.md`,
  `wn-merge/SKILL.md` — échappatoire `Agent(wn-reviewer)` sur classes à risque.

## Validations exécutées

- Changement purement documentaire (skills de session) : pas de `npm run check`
  requis, hors périmètre `web/`.
- `bash scripts/check_no_secrets.sh` : OK.
- Relecture de cohérence manuelle entre la nouvelle section de `wn-lot` et le
  reste du fichier (séquence, sortie de proposition) — a fait remonter et
  corriger l'erreur sur le mode Plan avant merge.
- CI de la PR #543 : `verify` présent et vert, checks Vercel verts.

## Problèmes ouverts

- Aucun héritage de ce lot : documentation d'orchestration seule, aucun code
  applicatif touché.
- Hérité de la campagne packs/moteur (non retouché ici) : LOT-05 devra trancher
  si `signauxAlerte` peut porter une décision de sécurité malgré son filtrage
  silencieux ; `estAdministrableParLaRoute` ne vérifie pas `actif` contrairement
  à `IDS_ASSIGNABLES` ; 10 des 16 packs de doctrine n'existent pas en base
  (décision produit).

## Prochaine action exacte

La priorité reste celle de la campagne packs/moteur, non affectée par ce lot :
**LOT-05** (table de règles d'orientation, dépend de LOT-03 et LOT-04, tous
deux livrés) ou **LOT-01** (validation praticien des 755 claims d'intervention,
sans dépendance). Côté orchestration : la classification de `wn-lot` reste une
heuristique textuelle, pas un contrôle automatisé — à observer sur le premier
lot réel qui l'utilisera pour vérifier que la délégation `Agent` proposée est
suivie dans la pratique, pas seulement écrite.

## Interdits encore actifs

- **Pas de migration Prisma** sauf demande explicite distincte.
- **Pas de branchement de `extraireDrapeauxAnamnese`** dans une route sans
  cadrer d'abord la question de sécurité LOT-05 (héritée, inchangée).
- **Le mode Plan ne se délègue jamais** à un sous-agent — nouvelle règle posée
  par ce lot, à ne pas rouvrir sans revoir la porte d'approbation humaine
  qu'elle protège.
- **Repartir de `main`** pour le prochain lot.
- **Ne pas merger sans avoir lu `verify`** — les seuls checks Vercel ne
  prouvent rien.
