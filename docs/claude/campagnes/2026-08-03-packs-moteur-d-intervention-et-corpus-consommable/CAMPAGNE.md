---
id: "2026-08-03-packs-moteur-d-intervention-et-corpus-consommable"
titre: "Packs, moteur d'intervention et corpus consommable"
statut: "cadrée"
créée_le: "2026-08-03"
mise_à_jour: "2026-08-03"
lot_courant: "LOT-00"
branche_campagne: "campaign/2026-08-03-packs-moteur-d-intervention-et-corpus-consommable/integration"
branche_lot_courant: "campaign/2026-08-03-packs-moteur-d-intervention-et-corpus-consommable/lot-00"
cible_pr_lot: "campaign/2026-08-03-packs-moteur-d-intervention-et-corpus-consommable/integration"
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
- Les 327 claims d'intervention en attente sont signés ; le couple mesuré passe
  de `652 VALIDE / 327 en attente` à `979 / 0`.
- La synthèse IA restitue la recommandation déterministe sans jamais la produire.

## État constaté au cadrage (2026-08-03)

Trois éléments de la demande initiale ne tenaient pas tels quels. Ils sont
conservés ici parce qu'ils expliquent la forme des lots.

| Demande initiale | Constat vérifié | Conséquence |
|---|---|---|
| « Terminer la certification et le score-check » | Clos et mergé — `#528`, commit `22766e67`. `node scripts/check_questionnaire_certification.js` sort vert sur 64. | Hors périmètre, sauf le reliquat bibliographique isolé en LOT-07. |
| « Concevoir un moteur d'intervention » | Le moteur existe : `orientationEngine.ts` (303 l.), `orientationRulesV1.ts`, route avec double verrou fail-closed, modèles `QuestionnairePackTrigger` et `PackProposition`. Mais `ORIENTATION_RULES_V1 = []` et **aucun appelant**. | Remplir et brancher, jamais reconcevoir (LOT-05, LOT-06). |
| « Utiliser les claims même s'ils ne sont pas validés » | Le fail-closed n'est pas le blocage. Sur les 48 sources d'intervention : **652 VALIDE, 327 en attente** — quelques heures de revue, pas 50 à 100 h. | Valider les 327 (LOT-01) plutôt qu'assouplir la porte D-003. |

**Ce qui a été confirmé, en revanche** : les fiches de synthèse NNPP2 sont bien
ingérées et réparties par thématique. 48 sources d'intervention — fiches de
synthèse, ordonnances commentées, fiches protocole, prises en charge — sur 11
notebooks, portant 979 claims actifs à forte densité prescriptive (jusqu'à 25
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
| PMI-2 | La porte D-003 ne bouge pas : on valide les claims manquants au lieu d'ouvrir les non validés | Le volume réel (327) rend la validation moins coûteuse que l'assouplissement |
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
- `INVENTAIRE_SOURCES_INTERVENTION.md` : les 48 sources et leurs claims.
- `BRIEF_COMPILED.md`, `CAMPAIGN_DRAFT.md` : artefacts générés.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Registre des 48 sources d'intervention NNPP2 | à_faire | — |
| LOT-01 | Validation ciblée des 327 claims d'intervention | à_faire | LOT-00 |
| LOT-02 | Rayons cognition / douleur / intestin + premier appelant | à_faire | LOT-01 |
| LOT-03 | Refactor des packs : source de vérité unique | à_faire | LOT-00 |
| LOT-04 | Structuration de l'intake | à_faire | — |
| LOT-05 | Table de règles d'orientation V1 : remplir et signer | à_faire | LOT-03 + LOT-04 |
| LOT-06 | Consommateur praticien et restitution IA | à_faire | LOT-05 |
| LOT-07 | Reliquat de certification : bibliographie et psychométrie | à_faire | — |

LOT-04 et LOT-07 n'ont aucune dépendance : ils peuvent être menés en parallèle du
chemin critique `LOT-00 → LOT-03 → LOT-05 → LOT-06`.

## Paliers de validation

| Lot | Palier | Motif |
|---|---|---|
| LOT-00, LOT-07 | T1 | documentaire |
| LOT-02, LOT-04, LOT-06 | T2 | surfaces et API |
| LOT-01, LOT-03, LOT-05 | T3 | corpus, packs, logique clinique |

Revue adversariale `wn-reviewer` obligatoire sur LOT-01, LOT-04 et LOT-05.

## Done de campagne

- [ ] Les 48 sources d'intervention sont désignées par un registre versionné.
- [ ] `979 / 0` sur les claims d'intervention, vérifié en base après merge.
- [ ] Les 16 packs ont une composition faisant foi, gardée par un test.
- [ ] `ORIENTATION_RULES_V1` est non vide, signée, et sert des recommandations.
- [ ] Un écran praticien appelle réellement la route d'orientation.
- [ ] `check_questionnaire_certification.js` reste vert sur les 64.
- [ ] Aucun claim non signé n'est exposé, aucune assignation n'est automatique.
