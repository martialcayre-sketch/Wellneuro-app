---
id: "2026-08-03-packs-moteur-d-intervention-et-corpus-consommable"
titre: "Packs, moteur d'intervention et corpus consommable"
statut: "en_cours"
créée_le: "2026-08-03"
mise_à_jour: "2026-08-04"
lot_courant: "LOT-07"
branche_campagne: "campaign/2026-08-03-packs-moteur-d-intervention-et-corpus-consommable/integration"
branche_lot_courant: "worktree-lot-07-reliquat-certification"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Packs, moteur d'intervention et corpus consommable

> Campagne issue de la demande du 2026-08-03. Le cadrage a **corrigé la demande
> sur trois points** après vérification contre le dépôt et la base de production ;
> les corrections sont consignées dans « État constaté au cadrage » ci-dessous et
> détaillées dans `AUDIT_ETAT_REEL.md`.

## Objectif

Rendre le moteur d'intervention réellement utilisable : une recommandation de
pack ou de questionnaires, reproductible, signée, sourcée sur les fiches de
synthèse NNPP2 déjà ingérées, et affichée sur une surface praticien qui l'appelle
vraiment.

## Résultat observable

- `GET /api/praticien/orientation` rend `actif: true` avec des recommandations
  non vides sur un patient de démonstration ayant répondu au pack initial.
- Un écran praticien affiche ces recommandations et le `sha256` de la table
  servie ; aucune assignation n'est automatique.
- Les 16 packs ont **une** composition faisant foi, et un garde échoue si le code
  et la base divergent.
- Les 755 claims d'intervention en attente sont signés ; le couple mesuré passe
  de `1247 VALIDE / 755 en attente` à `2002 / 0`.
- La synthèse IA restitue la recommandation déterministe sans jamais la produire.

## État constaté au cadrage (2026-08-03)

Trois éléments de la demande initiale ne tenaient pas tels quels. Ils sont
conservés ici parce qu'ils expliquent la forme des lots.

| Demande initiale | Constat vérifié | Conséquence |
|---|---|---|
| « Terminer la certification et le score-check » | Clos et mergé — `#528`, commit `22766e67`. `node scripts/check_questionnaire_certification.js` sort vert sur 64. | Hors périmètre, sauf le reliquat bibliographique isolé en LOT-07. |
| « Concevoir un moteur d'intervention » | Le moteur existe : `orientationEngine.ts` (303 l.), `orientationRulesV1.ts`, route avec double verrou fail-closed, modèles `QuestionnairePackTrigger` et `PackProposition`. Mais `ORIENTATION_RULES_V1 = []` et **aucun appelant**. | Remplir et brancher, jamais reconcevoir (LOT-05, LOT-06). |
| « Utiliser les claims même s'ils ne sont pas validés » | Le fail-closed n'est pas le blocage. Sur les 95 sources d'intervention : **1247 VALIDE, 755 en attente** — de l'ordre de la journée de revue, pas 50 à 100 h. **(Mesure du cadrage, 2026-08-03 au matin — périmée le soir même : 2002 / 0 sur le périmètre, 8224 / 0 sur le corpus actif.)** | Valider les 755 (LOT-01) plutôt qu'assouplir la porte D-003. |

**Ce qui a été confirmé, en revanche** : les fiches de synthèse NNPP2 sont bien
ingérées et réparties par thématique. 95 sources d'intervention — fiches de
synthèse, ordonnances commentées, fiches protocole, prises en charge — sur 11
notebooks, portant 2002 claims actifs à forte densité prescriptive (jusqu'à 25
prescriptifs sur 33 claims). C'est la matière du moteur, et elle n'est pas à
inventer. Inventaire complet : `INVENTAIRE_SOURCES_INTERVENTION.md`.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel — exemples limités à Sophie Nicola, Jennifer Martin et
  Michel Dogné.
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte et
  lot dédié.
- Aucune modification du contenu, des items ou du scoring d'un des 64
  instruments : le `64/64` gelé par `#528` n'est pas rouvert.
- Fail-closed conservé partout : un instrument suspendu ou verrouillé, un pack à
  composition inconnue, un claim non signé ne remontent pas.
- Changements minimaux, un lot = une finalité.

## Décisions prises

| # | Décision | Motif |
|---|---|---|
| PMI-1 | Le refactor porte sur les **packs**, jamais sur les instruments | Arbitrage utilisateur du 2026-08-03 ; le `64/64` certifié reste gelé |
| PMI-2 | La porte D-003 ne bouge pas : on valide les claims manquants au lieu d'ouvrir les non validés | Le volume réel (755) rend la validation moins coûteuse que l'assouplissement |
| PMI-3 | Le moteur existant est rempli et branché ; aucun second moteur n'est écrit | Cinq rayons sont déjà déclarés sans appelant — ne pas en ajouter |
| PMI-4 | L'intake est structuré **avant** que le moteur l'indexe | Un moteur signable ne peut pas s'indexer sur du texte libre |
| PMI-5 | La synthèse IA **restitue** la recommandation, ne la produit jamais | La signature `sha256` de la table est ce qui rend la recommandation gouvernable |
| PMI-6 | Les règles d'orientation vivent en code, pas dans `pack_triggers` | Le code est signable et passe en revue ; la base ne l'est pas |
| PMI-7 | L'Atelier v2 sort du périmètre | Non nécessaire au déblocage de la couche intervention ; chantier propre |

## Questions ouvertes

- Un rayon filtre par notebook entier, pas par source. Faut-il restreindre les
  nouveaux rayons aux sources du registre, ou assumer un rayon partiel tant que
  le reste du notebook n'est pas validé ? (tranché en LOT-02)
- Quelle surface praticien accueille les recommandations — fiche patient,
  Spirale, ou écran dédié ? (tranché en LOT-06)
- Les 12 « protocole assiette » (NB09) relèvent-ils du moteur d'orientation
  questionnaires, ou d'une couche protocole distincte ? (tranché en LOT-00)

## Dépendances

- `web/src/lib/clinical/orientationEngine.ts`, `orientationRulesV1.ts`
- `web/src/app/api/praticien/orientation/route.ts`
- `web/src/lib/questionnaires-functional.ts`, `web/src/lib/consultation/packRegistry.ts`
- `web/src/lib/supplement-library/rayonCorpus.ts`, `web/src/lib/rag/claims/`
- `docs/claude/corpus/source_registry.json`, `instrument_registry.json`
- `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`
- `docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration/`

## Hors périmètre

- L'Atelier v2 et la validation des ~2650 claims hors couche intervention.
- Toute modification d'un des 64 instruments certifiés.
- Toute migration de schéma Prisma.
- L'exposition d'une recommandation au patient — le palier s'arrête au praticien.
- La réouverture de `Q_GEO_04` ou `Q_PED_03`.

## Artefacts de préparation

- `AUDIT_ETAT_REEL.md` : les mesures qui fondent le cadrage.
- `INVENTAIRE_SOURCES_INTERVENTION.md` : les 95 sources et leurs claims.
- `BRIEF_COMPILED.md`, `CAMPAIGN_DRAFT.md` : artefacts générés.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Registre des 95 sources d'intervention NNPP2 | livré | — |
| LOT-01 | Validation ciblée des 755 claims d'intervention | **livré** — clos sur preuve en base, pas par exécution ; garde D-003 ajouté | LOT-00 |
| LOT-02 | Rayons cognition / douleur / intestin + premier appelant | **livré** (#546 puis clôture `douleur`) | LOT-01 |
| LOT-03 | Refactor des packs : source de vérité unique | livré | LOT-00 |
| LOT-04 | Structuration de l'intake | livré (#539) | — |
| LOT-05 | Table de règles d'orientation V1 : remplir et signer | **livré_partiel** (#545) — remplie, **non signée** | LOT-03 + LOT-04 |
| LOT-06 | Consommateur praticien et restitution IA | livré (#550) | LOT-05 |
| LOT-07 | Reliquat de certification : bibliographie et psychométrie | à_faire | — |

LOT-04 et LOT-07 n'ont aucune dépendance : ils peuvent être menés en parallèle du
chemin critique `LOT-00 → LOT-03 → LOT-05 → LOT-06`.

**`livré_partiel` sur le LOT-05 n'est pas une nuance de comptabilité.** La table
porte ses six règles mais `ORIENTATION_METADATA.validationExterne` reste `false` :
`tableSignee()` est faux, et la route ne sert **rien**. La signature est un geste
praticien, postérieur à la relecture clinique des six règles. Tant qu'il n'a pas
eu lieu, le LOT-06 ne peut afficher que l'état « en cours de constitution » —
c'est une limite connue et assumée, pas un défaut de ce lot.

## État après LOT-00

- `docs/claude/corpus/nnpp2_interventions_registry.json` désigne **95 sources sur
  12 notebooks**, 4 écartées (notebook 00), gardées par
  `npm run interventions-check` (26 cas, un échec prouvé par invariant).
- **Le critère de sélection a changé en cours de lot** : le `documentType` déclaré
  prime sur le motif de titre, qui ratait 51 sources sur 99 — dont toute la
  doctrine d'exploration (`WN-SRC-0046/0047/0049/0050/0051/0052`). Périmètre B,
  arbitré le 2026-08-03.
- Conséquence chiffrée : **LOT-01 passe de 327 à 755 claims** à valider. PMI-2
  tient — 755 reste très loin des 2982 — mais le chiffre affiché a été corrigé
  partout.
- La disjonction avec `instrument_registry.json` est **mesurée nulle et désormais
  gardée** : aucune source d'intervention n'appartient au banc `certify`.
- Reste ouvert : la **validation praticien** de la pré-classification.
- Le prochain lot utile est `LOT-01`, ou `LOT-03` / `LOT-04` en parallèle.

## État après LOT-03

- **Le moteur d'orientation était structurellement muet sur les packs.** Les
  `PackId` du code et les `id_pack` de la base formaient deux espaces de noms
  disjoints ; la route les comparait directement, `compositionPacks` restait vide,
  et le fail-closed rejetait toute recommandation de pack. Corrigé et testé dans
  les deux sens.
- 6 packs de doctrine sur 16 existent réellement en base ; les 10 autres portent
  `idPackBase: null` et ne sont pas citables par une règle — un banc l'impose.
- Le repli `legacy` de la composition de pack distingue désormais un registre
  absent d'une dérive réelle, et n'alerte que sur la seconde.
- Retiré à la revue : le correctif du `niveau`, sans consommateur et sans effet
  sur les packs existants.
- Le prochain lot utile est `LOT-04` (intake), sans dépendance, ou `LOT-01`
  (validation praticien des 755 claims).

## État après LOT-02 (clôture du reliquat `douleur`, 2026-08-03 soir)

- **La première porte est franchie pour tout le corpus.** Relevé `execute_sql` :
  **8 224 claims actifs, 8 224 VALIDE, 0 en attente, 0 signé sans validateur**,
  sur les douze notebooks 01→12. Le LOT-01 est donc clos **sur preuve**, sans
  avoir été exécuté comme lot : la revue praticien a eu lieu dans l'Atelier, hors
  campagne, et a dépassé les 755 claims visés.
- Le tableau de périmètre du LOT-01 (242 en attente sur le 11, 235 sur le 05, 168
  sur le 06…) décrit l'état au cadrage et n'a plus de valeur d'état.
- **Ce qui reste déficitaire est la seconde porte, le consommateur.**
  `RAYON_VERS_NOTEBOOK` déclare huit rayons ; l'allowlist réellement servie par la
  recherche corpus en compte trois (`cognition`, `douleur`, `intestin`).
  **`stress`, `humeur` et `sommeil` restent mappés, validés à 100 %, et sans
  appelant** — décision produit ouverte, hors périmètre du LOT-02.
- **Une allowlist par route, jamais la carte entière** — la règle posée en #546 a
  été prise en défaut une seconde fois, à l'autre bout de la chaîne : la route du
  tiroir compléments validait `rayon` par regex syntaxique et servait donc tout le
  mapping derrière `WN_C4_ENABLED`. Ajouter une paire à `RAYON_VERS_NOTEBOOK`
  n'est jamais un geste local : **il faut relire toutes les routes qui acceptent
  un `rayon` en entrée libre.** Corrigé dans ce lot, listes de refus désormais
  dérivées du mapping pour que le prochain rayon soit couvert d'office.
- Le prochain lot utile est le **LOT-07** (reliquat de certification, sans
  dépendance), ou la **signature clinique de la table du LOT-05** — geste
  praticien, sans lequel le LOT-06 livré ne peut rien afficher d'autre que
  « en cours de constitution ».
- **LOT-07 livré le 2026-08-04** (PR #560) : la distinction entre scoring
  vérifié, validité psychométrique et complétude bibliographique est écrite, et
  trois écarts cliniques trouvés en chemin attendent un arbitrage praticien
  (`Q_STR_03`, `Q_FIB_03`, `Q_NEU_03`). Détail dans le fichier du lot.
- **`cible_pr_lot` corrigée en `main`.** La branche d'intégration déclarée par
  `branche_campagne` **n'a jamais existé sur `origin`** : les LOT-00 à LOT-07
  sont tous partis en PR directe sur `main`. Le champ décrivait une intention,
  pas la pratique.

## Paliers de validation

| Lot | Palier | Motif |
|---|---|---|
| LOT-00, LOT-07 | T1 | documentaire |
| LOT-02, LOT-04, LOT-06 | T2 | surfaces et API |
| LOT-01, LOT-03, LOT-05 | T3 | corpus, packs, logique clinique |

Revue adversariale `wn-reviewer` obligatoire sur LOT-01, LOT-04 et LOT-05.

## Done de campagne

- [x] Les 95 sources d'intervention sont désignées par un registre versionné.
- [ ] `2002 / 0` sur les claims d'intervention, vérifié en base après merge.
- [x] Les 16 packs ont une composition faisant foi (`packs.qids`, option C) et une identité gardée par un test.
- [ ] `ORIENTATION_RULES_V1` est non vide, signée, et sert des recommandations.
- [ ] Un écran praticien appelle réellement la route d'orientation.
- [x] `check_questionnaire_certification.js` reste vert sur les 65 (et non 64 : le registre en portait 65 dès le cadrage du LOT-07).
- [ ] Aucun claim non signé n'est exposé, aucune assignation n'est automatique.
