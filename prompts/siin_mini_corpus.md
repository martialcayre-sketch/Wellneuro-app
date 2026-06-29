# Mini-corpus SIIN — Référentiel neuronutrition clinique

Ce fichier constitue le premier noyau de connaissances SIIN injectable dans le prompt de synthèse IA.
Il ne remplace pas une formation SIIN complète. Il sert de cadre de raisonnement minimal pour l'assistant IA.

**Règles impératives :**

- Ne jamais inventer de protocole SIIN non listé ici.
- Ne jamais recommander de dosage précis.
- Toute recommandation reste « à valider par le praticien ».
- Ce corpus est partiel : le signaler systématiquement dans les limites de la synthèse.

---

## 1. Axes cliniques principaux

### 1.1 Stress / axe HPA

- L'axe hypothalamo-hypophyso-surrénalien (HPA) régule la réponse au stress via le cortisol.
- Un stress chronique peut entraîner une dysrégulation du cortisol (excès puis épuisement).
- Signes évocateurs : fatigue matinale, difficulté de récupération, troubles du sommeil, irritabilité.
- Questionnaires associés : Q_STR_01 (Stress SIIN), Q_STR_02 (PSS-10), Q_STR_05 (BMS-10 Burnout), Q_STR_04 (DASS-21).
- Axes nutritionnels généraux : magnésium, vitamines B, adaptogènes (à valider par le praticien).

### 1.2 Neurotransmetteurs (Dopamine / Noradrénaline / Sérotonine / Mélatonine)

- Le questionnaire DNSM (Q_INF_03) évalue les 4 axes de neurotransmetteurs.
- Déficit dopaminergique : manque de motivation, difficulté à démarrer, recherche de stimulants.
- Déficit noradrénergique : fatigue intellectuelle, difficulté de concentration, baisse d'attention.
- Déficit sérotoninergique : impulsivité, compulsions alimentaires, anxiété anticipatoire, troubles du sommeil d'endormissement.
- Déficit mélatoninergique : difficulté d'endormissement, décalage de phase, sommeil non réparateur.
- Les axes sont souvent croisés : un déficit sérotonine impacte la mélatonine (précurseur).

### 1.3 Sommeil

- Questionnaires : Q_SOM_01 (PSQI), Q_SOM_02 (Epworth), Q_SOM_03 (Berlin/apnée), Q_SOM_06 (Pichot fatigue), Q_SOM_07 (MFI-20).
- Le sommeil est un intégrateur : sa dégradation aggrave stress, humeur, cognition et inflammation.
- Distinguer : difficulté d'endormissement (sérotonine/mélatonine), réveils nocturnes (cortisol/GABA), sommeil non réparateur (apnée, jambes sans repos).
- Chronotype (Q_SOM_05) : adapter les rythmes alimentaires et les prises de compléments.

### 1.4 Digestion / axe intestin-cerveau

- Questionnaires : Q_GAS_01 (Troubles digestifs SIIN), Q_GAS_02 (Francis/SII), Q_GAS_03 (Bristol).
- L'intestin produit environ 95% de la sérotonine corporelle.
- Dysbiose et perméabilité intestinale peuvent entretenir inflammation systémique et troubles de l'humeur.
- Signes évocateurs : ballonnements, alternance diarrhée/constipation, intolérances alimentaires.
- Axes nutritionnels généraux : probiotiques, L-glutamine, fibres prébiotiques (à valider par le praticien).

### 1.5 Inflammation / immunité

- Questionnaires : Q_INF_01 (Hyperexcitabilité SIIN), Q_INF_02 (Magnésium/spasmophilie), Q_INF_04 (HIT-6 migraine).
- L'inflammation chronique de bas grade peut être entretenue par le stress, le microbiote, l'alimentation.
- Signes évocateurs : douleurs diffuses, crampes, migraines, hyperexcitabilité neuromusculaire.
- Un déficit en magnésium est fréquent et aggrave l'hyperexcitabilité.

### 1.6 Énergie / fatigue

- Questionnaires : Q_SOM_06 (Pichot), Q_SOM_07 (MFI-20 multidimensionnelle).
- Distinguer : fatigue physique, fatigue mentale, fatigue motivationnelle (lien dopamine), fatigue liée au sommeil.
- La fatigue est rarement monocausale en neuronutrition : croiser avec stress, sommeil, digestion, neurotransmetteurs.

### 1.7 Humeur / psychologie

- Questionnaires : Q_NEU_01 (BDI dépression), Q_NEU_02 (MADRS), Q_STR_07 (HAD anxiété/dépression), Q_STR_04 (DASS-21), Q_INF_05 (auto-évaluation anxiété).
- Anxiété et dépression ont des substrats neurochimiques distincts mais souvent intriqués.
- Le score HAD permet de différencier la composante anxieuse (score A) de la composante dépressive (score D).
- L'impulsivité (Q_NEU_05 UPPS) oriente vers un déficit sérotoninergique.

### 1.8 Cognition

- Questionnaire : Q_NEU_06 (MMT).
- Brouillard mental, troubles de la mémoire, difficultés de concentration.
- Croiser avec : sommeil (dette de sommeil), stress (cortisol), neurotransmetteurs (dopamine/noradrénaline), inflammation.

### 1.9 Cardio-métabolique

- Questionnaire : Q_CAR_01 (Cardio-métabolique SIIN).
- Facteurs de risque : surpoids abdominal, sédentarité, tabagisme, antécédents familiaux.
- Lien avec inflammation chronique et stress oxydatif.

---

## 2. Associations fréquentes de scores

| Pattern observé | Hypothèse clinique probable |
| --- | --- |
| Stress élevé + sommeil dégradé + fatigue | Dysrégulation axe HPA — priorité stress |
| DNSM sérotonine basse + troubles endormissement + impulsivité | Déficit sérotoninergique probable |
| DNSM dopamine basse + fatigue motivationnelle + BDI modéré | Déficit dopaminergique à explorer |
| Troubles digestifs + fatigue + humeur basse | Axe intestin-cerveau à explorer |
| Hyperexcitabilité élevée + crampes + migraines | Déficit magnésium probable |
| Stress élevé + anxiété élevée + burnout | Épuisement adaptatif — explorer charge professionnelle |
| Sommeil dégradé + somnolence diurne + Berlin positif | Apnée du sommeil à dépister |
| Fatigue multidimensionnelle + dépression + stress | Tableau intriqué — prioriser le sommeil comme levier |

---

## 3. Points d'entretien prioritaires

Questions que le praticien devrait explorer en consultation selon les scores :

- **Stress élevé** : « Depuis quand ? Facteur déclenchant identifié ? Ressources de récupération ? »
- **Sommeil dégradé** : « Heure de coucher/lever ? Écrans le soir ? Réveils nocturnes ? Ronflements signalés ? »
- **Digestion perturbée** : « Aliments déclencheurs identifiés ? Antibiotiques récents ? Régime d'éviction en cours ? »
- **Neurotransmetteurs bas** : « Appétit pour le sucré en fin de journée ? Besoin de café pour démarrer ? Sautes d'humeur ? »
- **Fatigue persistante** : « Bilan biologique récent (fer, thyroïde, vitamine D) ? Activité physique régulière ? »
- **Dépression/anxiété** : « Suivi psychologique en cours ? Traitement médicamenteux ? Isolement social ? »

---

## 4. Principes généraux SIIN validés

- La neuronutrition SIIN considère le patient dans sa globalité : les axes sont interconnectés.
- Le traitement nutritionnel vise à restaurer les équilibres physiologiques, pas à traiter une maladie.
- Toute complémentation doit être individualisée et réévaluée régulièrement.
- L'alimentation reste le premier levier : avant de complémenter, optimiser l'assiette.
- Les questionnaires sont des outils de repérage, pas de diagnostic : ils orientent l'entretien clinique.
- Un score isolé ne suffit jamais : c'est le croisement des scores qui fait sens.
- Le praticien reste le décideur : l'IA assiste mais ne prescrit pas.

---

## 5. Ton éditorial wellneuro.fr

- Ton professionnel mais accessible.
- Bienveillance sans complaisance.
- Pas de dramatisation des scores.
- Pas de promesse thérapeutique.
- Vocabulaire : « axes à explorer », « hypothèses », « pistes nutritionnelles », « votre praticien vous accompagnera ».
- Éviter : « vous souffrez de », « vous avez un déficit en », « il faut prendre ».
- Le narratif patient doit donner au patient une vision constructive : « vos réponses suggèrent… », « nous allons explorer ensemble… ».
