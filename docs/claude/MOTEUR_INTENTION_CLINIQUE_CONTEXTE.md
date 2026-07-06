# Moteur d'intention clinique — Contexte consolidé

> Complète `ROADMAP_AGENT_PLAN.md` et `PROJET_CONTEXTE.md`. Recoupe R2
> (bibliothèque compléments) et R4/E6 (protocole builder), non encore
> officialisé comme lot de roadmap (à faire une fois ce schéma V1 validé
> en usage réel).

## 1. Objectif

Transformer une requête clinique en langage libre (ex : « fibromyalgie +
hyperexcitabilité + sommeil fragmenté + constipation + ISRS ») en
recommandation d'actifs structurée, sourcée, arbitrée et auditable — sans
jamais laisser le LLM décider seul de la recommandation finale.

**Principe directeur :** le LLM comprend l'intention (NLU), un moteur de
règles déterministe décide de la recommandation. Séparation non négociable
pour la traçabilité réglementaire — même logique que le moteur d'équilibre
(cf. `MON_EQUILIBRE_CONTEXTE.md`) : le LLM traduit/comprend, jamais ne
décide.

## 2. Scope V1 vs V2

Le schéma d'origine proposait 7 tables avec options d'ingrédients
interchangeables et conflits symétriques entre tags. Décision actée
(2026-07-06) : **V1 simplifiée d'abord**, car ce module est conçu avant
que R2 (bibliothèque compléments) dépasse le stade squelette (E1) —
cohérent avec le vertical slice déjà pratiqué sur la Boussole alimentaire.

- **V1 (ce document/ce schéma)** : mapping direct 1 ingrédient par règle
  (pas de table d'options interchangeables), pas de table de conflits
  symétrique entre tags. `ingredient_functional_thresholds` et
  `protocol_review_flags` restent non négociables même en V1 (sécurité).
- **V2 (différé)** : `clinical_rule_ingredient_options` (options multiples
  par règle avec préférence de rang) et `intent_conflicts` (arbitrages
  tag×tag), une fois R2 mature.

## 3. Décisions actées lors de l'audit du schéma (2026-07-06)

1. **`niveau_preuve` renommé `grade_preuve_scientifique`** côté ingrédients
   (échelle fort/modéré/faible/usage_traditionnel, type GRADE) pour ne pas
   collisionner avec l'échelle A/B/C/D déjà actée pour le moteur
   d'équilibre (provenance de donnée patient, cf. `MON_EQUILIBRE_CONTEXTE.md`
   §3). Les deux échelles répondent à des questions différentes et ne
   doivent jamais être confondues dans le code.
2. **Résolution ingrédient dynamique** : en V1 il n'y a qu'un ingrédient
   par règle donc ce point ne s'applique pas encore — redevient pertinent
   à l'introduction de la V2 (`clinical_rule_ingredient_options`).
3. **Override praticien tracé** : `protocol_review_flags` porte `statut`
   (`ouvert`/`accepte_praticien`/`resolu`), `justificationPraticien`,
   `traitePar`, `traiteLe` — jamais de résolution silencieuse d'un flag
   orange/rouge.
4. **Vocabulaire contrôlé pour les conditions** : nouvelle table
   `clinical_criteria` (même structure que `clinical_intent_tags`).
   `condition_supplementaire` (jsonb) doit référencer un `critere_id`
   existant dans cette table, jamais une chaîne libre non gouvernée.
5. **Versioning des règles** : `clinical_rules` ne se modifie jamais en
   place après validation. Toute édition crée une nouvelle ligne
   (`versionRegle` incrémenté), l'ancienne passe `actif = false`. Même
   motif que `versionScore`/`versionPrompt`/`versionMapping` déjà utilisé
   ailleurs dans ce schéma.
6. **Pas de duplication d'état d'alerte** : `ingredient_functional_thresholds`
   ne porte que `safetyAlertId` (FK) — toujours joindre
   `supplement_safety_alerts.niveauAlerte`, jamais de copie locale.
7. **`categorie_fonctionnelle` en table de référence** (`functional_categories`)
   plutôt qu'enum ouvert — ajout d'une catégorie = ajout de donnée, pas un
   enum à redéployer.
8. **Deux strates de détection de contradiction** : `intent_conflicts` (V2,
   connu/nommé) vs `protocol_review_flags` (V1, émergent au niveau
   protocole via `functional_categories`). Une contradiction récurrente en
   V1 doit être promue en règle explicite quand `intent_conflicts` existera.
9. **Fusion de dose inter-objectifs = alerte systématique, jamais de calcul
   automatique.** Si un même ingrédient est proposé à deux doses
   différentes pour deux objectifs distincts dans un protocole, le moteur
   lève un `protocol_review_flags` (`typeFlag = cumul_substance`) — jamais
   de somme ni de maximum silencieux. Cohérent avec le principe directeur
   n°1 (le moteur signale, ne décide jamais seul).
10. **Scope d'implémentation** : voir §2 ci-dessus.
11. **Alimentation des tables référentielles** (`supplement_ingredients`,
    `supplement_source_references`, `supplement_safety_alerts`) : pas de
    synchronisation API live, jamais d'écriture directe en base active
    depuis une source externe. Réutilisation du pipeline corpus SIIN déjà
    acté (NotebookLM → Markdown → GitHub → brouillon Claude → validation
    praticien/interne → import). Une API externe peut au mieux générer un
    brouillon de candidat, jamais écrire une alerte de sécurité active
    directement.

## 4. Tables prérequises minimales (squelette R2)

R2 (bibliothèque de compléments) n'existe pas encore dans le code — ce
schéma introduit donc un **squelette minimal** de `supplement_ingredients`,
`supplement_ingredient_formes`, `supplement_source_references` et
`supplement_safety_alerts`, juste suffisant comme cibles de FK pour le
moteur d'intention clinique. L'enrichissement complet (badges qualité,
filtrage DGCCRF/Compl'Alim, etc.) reste le périmètre de R2 à part entière.

## 5. Pipeline runtime (rappel, hors périmètre de cette PR)

Le parsing LLM (étape 1) et le moteur de résolution des règles
(étapes 2 à 7) ne sont **pas** implémentés dans cette PR — seul le schéma
de données V1 est posé ici. Voir le document source du brainstorming pour
le détail des 7 étapes.
