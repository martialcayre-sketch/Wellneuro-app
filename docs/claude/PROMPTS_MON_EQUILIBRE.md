# Prompts Claude Code — chantier "Mon équilibre"

Un prompt = une branche = une PR. Coller tel quel dans Claude Code (VS
Code) après avoir créé la branche indiquée. Chaque prompt suppose que
`docs/claude/MON_EQUILIBRE_CONTEXTE.md` et `docs/claude/PROJET_CONTEXTE.md`
sont déjà dans le repo et lisibles par l'agent.

Ordre d'exécution : 1 → (2, 3 en parallèle possible) → (4, 5, 6 en
parallèle possible, après 1/2/3) → 7 en dernier ou en continu.

---

## 1. `feat/e2-scoring-engine`

```
Lis docs/claude/MON_EQUILIBRE_CONTEXTE.md (sections 2 et 9) avant de
commencer.

Implémente le moteur de calcul de l'indicateur "Mon équilibre" :
- 12 besoins répartis en 3 strates (Corps 60 %, Ancrage 20 %, Esprit 20 %),
  équi-pondérés à l'intérieur de chaque strate.
- Agrégation NON basée sur une moyenne arithmétique simple : implémente le
  plafonnement/modulation par fondations critiques décrit dans le fichier
  de contexte.
- Expose les 12 valeurs individuelles par besoin, pas seulement les 3
  agrégats de strate — nécessaire pour l'écran détail patient et praticien.
- Aucun biomarqueur dans cette version : uniquement les questionnaires déjà
  portés dans web/src/lib/questions.ts.
- Ne renomme, ne modifie et ne supprime aucun questionnaire existant.
- Pas de migration Prisma/SQL sans me le demander explicitement d'abord.
- Aucun texte affiché à l'utilisateur dans cette branche (moteur pur,
  pas d'UI) — si tu dois nommer des identifiants internes, utilise
  "equilibre" ou "moteur-equilibre", jamais "neuroscore".
- Reste strictement dans le périmètre du calcul. Ne touche pas aux
  composants UI, aux routes API existantes, ni au design system.

Utilise les patients fictifs Sophie Nicola, Jennifer Martin ou Michel
Dogne pour tout exemple ou test.
```

---

## 2. `feat/e2-evidence-levels`

```
Lis docs/claude/MON_EQUILIBRE_CONTEXTE.md (section 3) avant de commencer.

Ajoute le système de niveaux de preuve (A/B/C/D) aux données produites par
le moteur d'équilibre (branche feat/e2-scoring-engine, doit être mergée ou
disponible avant celle-ci) :
- A = questionnaires cliniques validés
- B = référentiels neuronutrition
- C = biologie fonctionnelle interprétative
- D = hypothèses WellNeuro

Chaque donnée ou priorité générée par le moteur doit pouvoir porter un ou
plusieurs de ces tags. Ne construis pas encore l'affichage UI de ces tags
— cette branche ne touche que la donnée et son typage, pas la
présentation. Pas de migration Prisma/SQL sans confirmation explicite.
Reste strictement dans ce périmètre.
```

---

## 3. `feat/e2-momentum-tracking`

```
Lis docs/claude/MON_EQUILIBRE_CONTEXTE.md (section 5) avant de commencer.

Implémente le suivi longitudinal du moteur d'équilibre : jalons T0, J21,
J42, J90. Chaque jalon capture un instantané complet du calcul (les 12
besoins + les 3 agrégats de strate + le plafonnement appliqué à cette
date). Ajoute une fonction de calcul du delta entre deux jalons.

Ne construis pas l'UI de la trajectoire ici — uniquement la donnée et son
stockage/récupération. Pas de migration Prisma/SQL sans confirmation
explicite. Reste strictement dans ce périmètre.
```

---

## 4. `feat/d1-2b-equilibre-orb`

```
Lis docs/claude/MON_EQUILIBRE_CONTEXTE.md (section 6) et le design system
D1 (docs/design-system-d1.md) avant de commencer.

Crée le composant d'écran d'accueil patient "Mon équilibre" :
- Indicateur circulaire simple (0-100), palette teal du design system D1,
  thème clair patient.
- Delta de progression affiché à côté (ex. "+8 points en 3 semaines").
- Liste de 2-3 priorités en langage patient (jamais de jargon clinique
  brut — reformule toujours en langage courant, ex. "le sommeil est votre
  priorité" plutôt qu'un nom de questionnaire).
- Frise de trajectoire T0 → J90.
- Un lien "voir le détail de mes 12 besoins" vers la route
  /patient/besoins (créée dans une autre branche, feat/d1-2b-equilibre-detail
  — si cette route n'existe pas encore, le lien peut pointer vers un
  placeholder, ne construis pas cette route ici).

Consomme le moteur d'équilibre (feat/e2-scoring-engine) pour les données,
ne réimplémente aucun calcul côté composant. Interface 100 % en français.
Utilise Sophie Nicola, Jennifer Martin ou Michel Dogné comme données
d'exemple. Reste strictement dans ce périmètre : pas de modification du
moteur, pas de vue praticien.
```

---

## 5. `feat/d1-2b-equilibre-detail`

```
Lis docs/claude/MON_EQUILIBRE_CONTEXTE.md (section 6) avant de commencer.

Crée l'écran détail patient des 12 besoins, route /patient/besoins :
- Visualisation en trois sphères concentriques (Corps englobante, Ancrage
  intermédiaire, Esprit au cœur), une couleur distincte par strate (teal,
  violet, or/champagne — cohérent avec la palette D1), pas de dégradé
  unique à décoder.
- 12 points de repère répartis sur les surfaces, un par besoin.
- Interaction : survoler le nom d'un besoin dans une liste/légende met en
  évidence le point correspondant et affiche sa description en une phrase.
- Aucune imagerie de dégradation (pas de rouge alarme, pas de noir/gris,
  pas de fissures ou d'effondrement) : les scores bas se distinguent
  uniquement par une intensité de couleur plus claire dans la même teinte,
  jamais par un changement de registre visuel négatif.
- Lien de retour explicite vers l'écran d'accueil.

Avant de choisir la librairie 3D (Three.js, react-three-fiber ou
alternative), vérifie le poids ajouté au bundle et confirme avec moi si ça
dépasse ce qui est raisonnable pour du mobile first. Si le rendu 3D pose
problème sur mobile, prévois un repli 2D (SVG) affichant la même
information.

Consomme le moteur d'équilibre pour les 12 valeurs, ne réimplémente aucun
calcul. Interface 100 % en français. Utilise les 3 patients fictifs
autorisés. Reste strictement dans ce périmètre.
```

---

## 6. `feat/d1-2b-equilibre-praticien`

```
Lis docs/claude/MON_EQUILIBRE_CONTEXTE.md (section 7) avant de commencer.

Crée le composant dashboard praticien "Cartographie neuro-fonctionnelle" :
- Thème sombre, cohérent avec le shell praticien déjà livré (D1-3).
- 5 objets cliniques : indice global, stabilité métabolique (jamais nommé
  "surchauffe" — vérifie que toute variable où une valeur haute est un
  mauvais signe est présentée de façon à ce que "plus haut" reste "mieux"
  visuellement), réserve d'adaptation, clarté, momentum.
- Liste de priorités des prochains jours, chaque priorité affichant ses
  niveaux de preuve (tags A/B/C/D, avec légende) issus de la branche
  feat/e2-evidence-levels.

Consomme le moteur d'équilibre, ne réimplémente aucun calcul. Interface
100 % en français, vocabulaire réglementaire (jamais "diagnostic",
"prescription", "ordonnance"). Utilise les 3 patients fictifs autorisés.
Reste strictement dans ce périmètre : pas d'écran détail des 12 besoins
côté praticien dans cette branche (non conçu à ce stade).
```

---

## 7. `docs/e2-equilibre-methodologie`

```
Applique le contenu de docs/claude/ROADMAP_R9_UPDATE.md en remplaçant
intégralement la section R9 actuelle de docs/claude/ROADMAP_AGENT_PLAN.md.
Vérifie qu'aucune occurrence de "NeuroScore" ou "Wellness Body Score" ne
subsiste dans le fichier après la modification (grep -i neuroscore).
Aucune autre section du roadmap ne doit être modifiée dans cette PR.
```
