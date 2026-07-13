# Registre de frontières — Programme WellNeuro 3.0

> Créé le 2026-07-12 à l'issue du brainstorm d'arbitrage (audit PR #31 +
> audit croisé des campagnes). Ce document est la **source normative unique
> d'exécution** : il consigne, pour chaque campagne, ce qu'elle possède, ce
> qu'elle consomme et les décisions déjà actées. Il ne contient jamais de
> spécification détaillée — dès qu'un sujet exige du détail, c'est que la
> campagne concernée doit être compilée (règle N+1, cf. §2).
>
> `ROADMAP_AGENT_PLAN.md` est gelé en vision historique / backlog. Ses
> invariants (ex-section 2) et consignes agent (ex-section 8) migrent ici
> (§1) et restent pleinement normatifs.

---

## 1. Invariants non négociables (toutes campagnes, tous lots)

- Aucun secret en dur ; variables d'environnement uniquement.
- Patients fictifs exclusifs : **Sophie Nicola, Jennifer Martin, Michel
  Dogne** (sans accent). Aucune donnée patient réelle, jamais.
- Interface 100 % en français.
- Vocabulaire réglementaire : « recommandation », « protocole personnalisé »,
  « indice de suivi », « explorations à discuter avec le médecin traitant ».
  Interdits : « prescription », « ordonnance », « diagnostic », « NeuroScore ».
- Aucune modification de logique clinique, seuil, cotation ou interprétation
  sans demande explicite documentée dans `CHANGELOG.md`, avec versionnage
  (`versionScore`, `versionPrompt`).
- Éviter par conception la qualification dispositif médical : finalité
  bien-être/suivi, validation praticien systématique de tout contenu généré
  par IA avant diffusion.
- HDS obligatoire avant tout stockage de données de santé réelles.
- 1 tâche = 1 branche courte = 1 PR = 1 périmètre. Jamais de mélange
  design / clinique / IA / corpus / infra dans une même PR.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande
  explicite et confirmation distincte.
- Prompt système IA : règles de `docs/claude/PROMPT_CACHING.md` (stable dans
  le système, volatile dans le message, bump de version).
- Contrôles avant commit : `bash scripts/check_no_secrets.sh` et
  `cd web && npm run type-check`.
- Accessibilité : contraste AA, aucune fonction critique au seul survol,
  cibles ≥ 44×44 px, focus clavier visible, aucun état clinique signalé par
  la seule couleur.
- Par défaut : exploration et discussion, pas de génération de code sans
  demande explicite.

## 2. Arbitrages transverses actés (2026-07-12)

### A1 — Deux systèmes de jalons, deux objets distincts (Q1, option A)

- **Jalons de mesure** : T0 / J21 / J42 / J90, glissants ±8 jours. Propriété
  du moteur d'équilibre (`web/src/lib/equilibre/momentum.ts`). Seules
  lectures comparables entre elles, sous condition `versionScore`.
- **Points d'étape** : J7 / J14 / J21. Propriété de C2. Check-ins courts
  (effet ressenti, tolérance, adhésion). **Jamais convertis en score, jamais
  injectés dans le calcul « Mon équilibre ».**
- **J21 = point de jonction déclaré.** Le « résumé J21 » est le seul objet
  autorisé à croiser les deux lectures, via leurs contrats publics.
- Vocabulaire verrouillé : « jalon de mesure » / « point d'étape » (côté
  patient : « rendez-vous de suivi »). Chaque terme est banni du contexte de
  l'autre (code, branches, commits, UI, docs).
- Le comparateur avant/maintenant ne compare **que** des jalons de mesure.

### A2 — La propriété suit le contrat de données (Q2, lecture hybride)

- Une campagne possède un objet si et seulement si elle possède son contrat
  de données. Les capacités de présentation sans contrat propre sont des
  **mécanismes** HC-Foundation, instanciés par les campagnes métier.
- Mécanismes HC : `ModeConsultation` (état d'application sans distraction),
  `PrévisualisationPatient` (rendu « vue patient » avec frontière de
  données), **double niveau de lecture** (règle de gouvernance + mécanisme
  générique). Chaque mécanisme est livré avec un contrat d'instanciation
  d'une page maximum.
- Contenus métier : cockpit, carte de décision, protocole 21 jours,
  timeline, comparateur → C1/C2. Documents multi-destinataires → C3.

### A3 — Compilation N+1 glissante (Q3, option C)

- Quand une campagne entre en exécution, la suivante de la séquence est
  compilée en campagne réelle. Jamais plus d'une campagne d'avance.
- Les campagnes non compilées existent sous forme : entrée dans ce registre
  + `CAMPAGNE.md` de cadrage (décisions actées, frontières, lots en
  esquisse) + sources conservées telles quelles.
- Toute compilation commence par une vérification du registre contre l'état
  réel du dépôt (équivalent LOT-00).

### A4 — Reliquat E2 UI (Q4)

- Pas de lot E2 UI dédié. Côté praticien (radar, écran détail 12 besoins,
  vue momentum, 5 objets cliniques) : **intrants de C1** (instanciations
  d'objets E2 dans le cockpit).
- La branche `feat/e2-praticien-neuroscore-view` est retirée (périmètre
  absorbé par C1 ; nom contenant un terme banni).
- La méthodologie des 5 objets cliniques est **codée et testée**
  (`objetsCliniques.ts`) : l'arbitrage radar 3-strates vs 5 objets (options
  A/B/C du 2026-07-07) est débloqué et se tranche en C1 LOT-00. Position par
  défaut : option A (radar 3-strates en fiche patient — seule vue respectant
  visuellement la pondération 60/20/20 — 5 objets au dashboard).
- Côté patient (frise longitudinale, symbole de tendance) : différé, campagne
  « Hybrid Patient » future. Contrat : consomme `momentum.ts` par son API
  publique, delta sans chiffre.

### A5 — Direction visuelle (décisions utilisateur 2026-07-12)

- Interdits D1 §5 **levés** pour : primitives Radix/shadcn sélectionnées,
  Lucide React, Motion (usage justifié uniquement). Amendement porté dans
  `docs/design-system-d1.md`.
- **Tout en mode clair.** Abandon du double mode Jour/Nuit et du contrôleur
  Auto/Jour/Nuit. Praticien : rail sombre structurel (élément signature) +
  espace de travail clair. Patient : clair fixe. Les interdits « toggle
  utilisateur de thème » et « theme-provider JS » deviennent **sans objet**.
- À propager : R9 / `MON_EQUILIBRE_CONTEXTE.md` (« dashboard sombre » caduc),
  `06_SPEC_UX_COCKPIT_PRATICIEN.md` de C1 (idem).

---

## 3. Fiches de frontières par campagne

### HC-F — Hybrid Clinical Foundation (`2026-07-12-hybrid-clinical-experience-questionnaires`)

- **Possède** : tokens clairs, shell premium (rail sombre + espace clair),
  icônes, palette de commandes, primitives partagées, charte patient claire,
  mécanismes A2, règles de densité, accessibilité, lexique UX, gouvernance et
  checklist de conformité des modules futurs.
- **Consomme** : socle technique C0-UX (navigation responsive, tests
  Playwright), tokens D1 amendés.
- **Décisions actées** : A2, A5 ; LOT-03 historique dégonflé (cockpit, carte,
  timeline, comparateur, constructeur → intrants C1/C2).
- **Statut** : en cours au 2026-07-13 ; LOT-00 à LOT-04 terminés, LOT-05
  gouvernance et handoff suivant.

### QX — Expérience questionnaires (`2026-07-12-qx-experience-questionnaires`)

- **Possède** : profils de rendu (focus, micro-lots, sections guidées, grilles
  compactes), reprise/résumé/sauvegarde explicite, contrats `DisplayPolicy` /
  `OptionOrderPolicy`, garde-fous psychométriques.
- **Consomme** : tokens et charte patient HC-F ; catalogue `questions.ts`.
- **Décisions actées** : pilotes bornés aux familles auditées et alignées
  (**ALI_01, ALI_03, NEU_03, MOD_02**) ; politique `strict` par défaut ;
  randomisation **spécification uniquement** (`fixed` par défaut, zéro
  implémentation de mélange en V1) ; CAT exclu ; scoring sur `id`/`v`, jamais
  la position.
- **Statut** : compilée (cette livraison), exécution parallèle à C1 possible
  (aucun contact avec le scoring).

### C1 — Décision clinique 21 jours V1 (`2026-07-11-decision-clinique-21-jours-v1`)

- **Possède** : cockpit fiche patient (dont instanciations radar / 12
  besoins / 5 objets / badges de preuve), carte de décision explicable,
  protocole 21 jours minimal (3 actions max, plan idéal/minimal/secours,
  charge thérapeutique), instanciations `ModeConsultation` et
  `PrévisualisationPatient`, file et flux de validation praticien.
- **Consomme** : `web/src/lib/equilibre/` (score, evidence A/B/C/D,
  objetsCliniques, momentum via contrat public), primitives HC-F,
  synthèse IA existante.
- **Décisions actées** : provenance exprimée en niveaux de preuve A/B/C/D
  (aucun « score de confiance » continu) ; A4 ; aucune action clinique sans
  validation humaine ; pas de persistance longitudinale (C2).
- **Statut** : compilée (cette livraison). Démarrage après HC-F LOT-02.

### C2 — Points d'étape et persistance (`2026-07-11-suivi-j7-j14-j21-et-persistance`)

- **Possède** : journal de suivi, check-ins J7/J14/J21 (2-4 questions),
  lectures adhésion/tolérance/effet ressenti, résumé J21 (point de jonction
  A1), décisions structurées aux points d'étape.
- **Consomme** : `momentum.ts` (jalons de mesure, jamais réimplémentés),
  identité par assignation R8-lite (existante en production), primitives
  HC-F, contrats C1 (protocole actif).
- **Décisions actées** : A1 ; scission C2A (check-ins + persistance minimale,
  gate migration explicite) / C2B (trajectoire et aide à l'ajustement, après
  données réelles) ; **différés** : analyse émotionnelle libre de messages,
  score automatique de décrochage, notifications proactives autonomes,
  pourcentage d'observance affiché au patient (formulation factuelle
  positive obligatoire) ; le déclencheur de la campagne auth dédiée est
  l'identité **inter-assignations**, pas C2A.
- **Statut** : cadrée, lots à compiler N+1 (pendant l'exécution de QX/C3).

### C3 — Documents contextuels multi-destinataires V1 (`2026-07-11-fiches-conseils-contextuelles-v1`, renommée)

- **Possède** : modèles documentaires, composants de sections, adaptation au
  destinataire (patient / médecin / praticien), états
  brouillon→relu→validé→envoyé, versionnage, aperçu deux colonnes
  (sources praticien / rendu destinataire), impression HTML.
- **Consomme** : blocs validés de C1 (protocole, décision), C4 (fiches
  compléments), C5 (fiches alimentaires) ; mécanisme
  `PrévisualisationPatient` HC-F ; synthèse IA existante.
- **Décisions actées** : C3 ne possède **aucun contenu clinique source** ;
  renommage acté (le contenu réel est un moteur de composition documentaire,
  pas des « fiches conseils »).
- **Statut** : cadrée, lots à compiler N+1.

### C4 — Compléments clean label (`2026-07-11-complements-clean-label-v1`)

- **Possède** : C4A catalogue de qualité intrinsèque (composition, formes,
  excipients, sources, date de revue, statut de vérification — aucune donnée
  patient) ; C4B compatibilité protocole (objectif actif, contraintes,
  doublons, cumul, vigilance, alternatives).
- **Consomme** : protocole actif C1, rendu documentaire C3, primitives HC-F.
- **Décisions actées** : **pas de score global dominant** — présentation
  multi-dimensions (qualité de formulation / compatibilité / données
  manquantes / dernière revue) ; provenance et fraîcheur obligatoires par
  produit ; justification toujours visible (anti-perception commerciale).
- **Note de factorisation** : le modèle intrinsèque/contextuel est commun à
  C4 et C5 — primitive partagée à concevoir une seule fois (porteur : la
  première des deux campagnes compilée).
- **Statut** : cadrée, lots à compiler N+1. C4A parallélisable en data-first.

### C5 — Boussole alimentaire (`2026-07-11-boussole-alimentaire-slice-v1`)

- **Possède** : C5A « action alimentaire de la semaine » (une action, trois
  exemples, deux substitutions, fiche « pourquoi », plan minimal, critère
  observable) ; C5B assiettes vedettes et substitutions (préférences,
  contraintes, coût, saisonnalité). Référentiel : acquis E1 (tables
  `neuro_axis`, `nutrient_axis_weight`, Ciqual).
- **Consomme** : priorité sélectionnée en C1 (pour C5A — le référentiel et le
  contenu sont data-first, seule la *sélection* dépend de C1), rendu C3,
  charte patient HC-F.
- **Décisions actées** : différés — scan produit, panier temps réel, mode
  frigo, mode restaurant, analyse journée/semaine, recommandations
  automatiques complexes ; chronobiologie : aucune lecture de rythme sans
  heure de repas connue ; langage non culpabilisant.
- **Statut** : cadrée, lots à compiler N+1. Socle data parallélisable.

### C0-UX — Refonte shell 3.0 (`2026-07-11-refonte-ux-shell-3-0`)

- **Statut acté** : *socle technique livré — direction visuelle remplacée par
  Hybrid Clinical.* Ne pas rouvrir. Les tests responsive/Playwright restent
  le filet de non-régression ; le design ne sert plus de cible.

### WN-AUTO (`2026-07-11-wn-auto-orchestration-github-boucles-autonomes`)

- **Statut** : terminée. Extension future des gates UX/psychométriques :
  **graduées par le risque du lot** (jamais uniformes), à spécifier lors de la
  première campagne de code post-HC-F. La boucle de réparation ne modifie
  jamais automatiquement un questionnaire validé.

### Différés (hors campagnes, entrées de registre)

> **Proposition WN Ultimate v2** : intégrée en quarantaine documentaire dans
> `docs/claude/propositions/wn-ultimate-v2/`. Elle ne modifie pas les
> frontières de ce registre. En particulier, sa répartition C5A/C5B et son
> journal alimentaire exigent un arbitrage produit/clinique distinct.

- **Hybrid Patient** (ex-E4) : dashboard patient, frise longitudinale
  (contrat A4), carnet de bord. Dépend de HC-F + C1 + auth.
- **Auth patient inter-assignations** (ex-E3/R8 complet) : magic link +
  passkeys. Déclencheur : besoin d'identité inter-assignations (cf. C2).
- **Biologie réelle stockée** (ex-E8/R5 complet) : après HDS.
- **OCR papier** (ex-« zéro saisie », candidat R10) : D0 fait, pilotes =
  familles auditées (ALI_01, ALI_03, NEU_03, MOD_02 — mêmes que QX).
  Mécanisme zone→id à trancher. Se compile après QX (synergies renderer).
- **Chantier certification questionnaires** : NEU_02/03/06/08, sources
  CAN/CAR/PNE/TAB, GEO_03. **Conditionne l'extension des pilotes QX et OCR.**

## 4. Table de correspondance roadmap historique → programme

| Ancien module | Nouvelle responsabilité |
|---|---|
| R9 / E2 Mon équilibre | Moteur : **livré** (`lib/equilibre/`). UI praticien : intrants C1. UI patient : Hybrid Patient |
| R4 / E6 Protocole builder | C1 (V1 minimale), campagne dédiée si extension |
| R6 / E5 Workflow RDV | différé, non rattaché |
| R3 Fiches / recettes | C3 (rendu) + C5 (contenu alimentaire) |
| R2 Compléments | C4 |
| R1 Ciqual / mapping | acquis E1 + socle data C5 |
| E0 bascule Sheets→PG | livré, hors `feat/e0-patients-pagination` (à séquencer avant restylage annuaire HC-F/C1) |
| E3 / R8 Auth patient | R8-lite livré ; complet = campagne auth différée |
| E4 Dashboard patient | Hybrid Patient (différé) |
| E8 / R5 Biologie réelle | après HDS |
| « Zéro saisie » OCR | candidat R10, différé, entrée de registre |
