# Mon équilibre — Contexte consolidé
# Complète ROADMAP_AGENT_PLAN.md et PROJET_CONTEXTE.md

> Rédigé à partir d'une session d'exploration (D0) sur l'indicateur patient
> anciennement désigné "NeuroScore" / "NeuroBody Score" / "Score d'Équilibre
> Neuro-Corporel". Terminologie définitivement abandonnée au profit de
> **Mon équilibre** (patient) / **Cartographie neuro-fonctionnelle**
> (praticien) / **moteur d'équilibre** (interne, code, base de données).
> En cas de conflit : PROJET_CONTEXTE.md fait foi sur l'architecture
> technique globale, ce fichier fait foi sur les décisions produit de
> cette fonctionnalité jusqu'à intégration dans ROADMAP_AGENT_PLAN.md
> (mise à jour R9 déjà appliquée dans `docs/ROADMAP_PRODUIT.md` §R9 ;
> texte d'origine archivé dans
> `docs/archive/roadmap-updates/ROADMAP_R9_UPDATE_2026-07-11.md`).

---

## 1. Terminologie — table de correspondance

| Ancien terme | Terme retenu | Contexte d'usage |
|---|---|---|
| NeuroScore / NeuroBody Score | Mon équilibre | UI patient, noms de composants React exposés au patient |
| Score d'Équilibre Neuro-Corporel | Cartographie neuro-fonctionnelle | UI praticien, dashboard dense |
| Moteur de scoring | Moteur d'équilibre | Code interne, noms de fichiers/modules, jamais affiché à l'écran |
| "Surchauffe" (poursuivi tel quel) | Renommer par polarité cohérente, ex. "Stabilité métabolique" | Toute variable où une valeur haute = mauvais signe doit être inversée pour que "plus haut" reste toujours "mieux" dans l'UI, patient comme praticien |

Ne jamais réintroduire "NeuroScore" dans le code, les noms de branche, les
commits, la documentation ou l'UI.

---

## 2. Architecture du score

- **12 besoins fondamentaux** répartis en **4 piliers** :
  1. Nutritionnels (besoins 1-3)
  2. Somatiques (besoins 4-6)
  3. Sensoriels et émotionnels (besoins 7-9)
  4. Psychiques (besoins 10-12)
- **Regroupement en 3 strates pondérées** pour le calcul et la visualisation :
  - **Corps** = piliers 1+2 = besoins 1-6 = **60 %** du score global
  - **Ancrage** = pilier 3 = besoins 7-9 = **20 %**
  - **Esprit** = pilier 4 = besoins 10-12 = **20 %**
  - Équi-pondération à l'intérieur de chaque strate (chaque besoin de Corps
    pèse 10 %, chaque besoin d'Ancrage/Esprit pèse environ 6,7 %).
- **Le score global n'est jamais une moyenne arithmétique simple.** Il est
  plafonné/modulé par les fondations critiques (sommeil effondré,
  hyperexcitabilité majeure, carences objectivées, inflammation de bas
  grade, instabilité glycémique, troubles digestifs, stress chronique).
  L'affichage doit toujours privilégier le **profil par besoin** (mettre en
  évidence les creux) plutôt qu'un chiffre unique sans contexte.
- **Aucune moyenne ne doit masquer une carence sévère** : un score élevé sur
  un pilier ne compense jamais mathématiquement un pilier effondré.

---

## 3. Niveaux de preuve (A/B/C/D)

Chaque donnée qui alimente le score ou une priorité doit être taguée :

- **A** — questionnaires cliniques validés (PSQI, HAD, PSS-10, etc.)
- **B** — référentiels neuronutrition (échelles SIIN, DNSM, etc.)
- **C** — biologie fonctionnelle interprétative (biomarqueurs)
- **D** — hypothèses innovantes propres à WellNeuro (métaphores non validées
  scientifiquement, à formuler avec prudence)

Ces tags sont visibles côté **praticien uniquement** dans un premier temps.
Ne pas les exposer au patient sans réflexion UX dédiée (risque de
sur-complexifier une interface pensée pour rester calme).

---

## 4. Biomarqueurs — hors périmètre V1

- **V1 du moteur d'équilibre repose uniquement sur les questionnaires et le
  mode de vie.** Aucune dépendance HDS/D6 pour cette version.
- Les biomarqueurs réels (CRPus, HOMA, zonuline, BDNF, cortisol, etc.)
  deviennent un **mécanisme de raffinement ultérieur** (T0 = questionnaires,
  T1 = ajustement par la biologie quand disponible), pas un prérequis.
- Point non tranché : lorsqu'un biomarqueur ajuste un besoin déjà noté par
  questionnaire, faut-il **écraser** la valeur ou **tracer les deux**
  (questionnaire vs biomarqueur-ajusté) pour l'audit clinique ? À trancher
  avant l'implémentation du mécanisme de raffinement, probablement en
  réutilisant le pattern `versionScore`/`versionPrompt` déjà acté.

---

## 5. Momentum et suivi longitudinal

- Jalons de suivi : **T0 / J21 / J42 / J90**.
- Le "momentum" (delta entre deux mesures) doit être traité comme un objet
  à part entière, pas comme un simple recalcul du score global — il porte
  la dimension motivationnelle de l'outil.

---

## 6. UX patient

Principe directeur : **un seul objet visuel synthétique sur l'écran
d'accueil**, jamais de saturation d'informations, aucune imagerie de
dégradation (pas de fissures, pas de noir/gris/brouillard, pas de rouge
alarme). La progression est toujours montrée comme une construction, jamais
comme un effondrement.

- **Écran `/patient/accueil`** :
  - Un indicateur circulaire simple ("Mon équilibre", valeur 0-100, teal).
  - Delta de progression depuis le dernier bilan.
  - 2-3 priorités en langage patient (jamais de jargon clinique brut, ex.
    "le sommeil est votre priorité" plutôt que "score plafonné par PSQI").
  - Trajectoire T0 → J90 en frise simple.
  - Un lien discret vers l'écran détail : "voir le détail de mes 12
    besoins".

- **Écran `/patient/besoins`** (route distincte, pas une simple ancre) :
  - Visuel 3D : **trois sphères concentriques** (Corps englobante, Ancrage
    intermédiaire, Esprit au cœur), matière organique ondulante (effet de
    respiration continue, pas d'arêtes dures), rotation lente et
    indépendante par strate pour un effet d'orbite.
  - Couleur distincte par strate (pas de dégradé unique à décoder) : teal
    pour Corps, violet pour Ancrage, or/champagne pour Esprit — cohérent
    avec la palette D1 (deep teal + champagne gold).
  - 12 points de repère (un par besoin) répartis sur les surfaces
    (distribution de Fibonacci pour un espacement uniforme).
  - Survol d'un besoin dans une légende texte : le point 3D correspondant
    grossit, une description en une phrase s'affiche.
  - Retour vers l'accueil via lien explicite, pas de perte de contexte.

---

## 7. UX praticien

Principe directeur : vue dense assumée, le praticien est un professionnel
formé, l'objectif est l'explicabilité et la décision clinique rapide, pas
l'apaisement émotionnel.

- Dashboard dense, charte Hybrid Clinical claire (rail sombre structurel,
  espace de travail clair) — cf. HC-F.
- **5 objets cliniques** sur le dashboard patient (vue praticien) :
  1. Indice global (non décisionnel seul)
  2. Stabilité métabolique (ex-"surchauffe", polarité corrigée)
  3. Réserve d'adaptation
  4. Clarté (vitalité, humeur, cognition)
  5. Momentum
- Liste de priorités des 21 prochains jours, chacune sourcée avec ses tags
  A/B/C/D et une légende explicite de ces tags.
- Écran détail des 12 besoins équivalent à celui du patient reste à
  concevoir (non fait à ce stade — cf. points ouverts).

---

## 8. Maquettes de référence produites en session

- `wellneuro-mon-equilibre-maquettes.html` — maquette HTML autonome livrée
  en conversation, illustrant les deux vues (patient et praticien) et
  l'interaction de survol sur les 12 besoins. **Prototype de discussion
  uniquement, pas un composant à fusionner tel quel.**
- Une maquette React antérieure (`web/src/app/score-maquette/page.tsx`,
  documentée dans `docs/score-maquette-react.md`) a servi de point de
  comparaison : son architecture de données (5 objets, niveaux de preuve,
  priorités sourcées, momentum) a été retenue, mais son habillage visuel
  ("iceberg" sombre avec fissures, badges rouges, couleurs en dur hors
  design system D1) a été écarté pour la vue patient. À ne pas réutiliser
  tel quel — vérifier qu'il a bien été créé sur une branche dédiée avant
  toute fusion, sinon isoler le commit (discipline une-tâche-une-branche).

---

## 9. Invariants transverses à rappeler pour ce chantier

- Interface 100 % française, vocabulaire réglementaire uniquement
  ("recommandation", "indice de suivi", "protocole personnalisé" — jamais
  "diagnostic", "prescription", "ordonnance").
- Patients fictifs exclusivement : Sophie Nicola, Jennifer Martin,
  Michel Dogné.
- Aucune migration Prisma/SQL sans confirmation explicite.
- Aucun secret en dur.
- Un composant = une branche = une PR ; ne jamais mélanger moteur de
  calcul, visualisation patient et visualisation praticien dans une même
  PR (voir `PROMPTS_MON_EQUILIBRE.md` pour le découpage exact).
