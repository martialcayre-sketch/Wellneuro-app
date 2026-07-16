---
id: wellneuro-ja5-synthese-critique
version: 5.0-proposition
date: 2026-07-16
statut: proposition_a_arbitrer
---

# Journal alimentaire 5.0 — synthèse critique et cap produit

## 1. Synthèse exécutive

Le Journal alimentaire 5.0 propose de remplacer la saisie exhaustive des
repas par une observation ciblée, proportionnée à une question de phase et à
une action alimentaire validée. Sa direction est cohérente avec WellNeuro 5.0 :
elle privilégie la continuité, la faisabilité et la décision humaine plutôt que
le volume de données ou la performance du patient.

Le concept est néanmoins trop large dans son état actuel. Il réunit un carnet
adaptatif, un moteur d'observabilité, des signatures de repas, la voix, la
photo, le hors-ligne, le time-travel, le Nutrition Lab et un cabinet apprenant.
Ces capacités ne doivent pas être traitées comme un seul produit initial.

Le noyau le plus défendable est plus simple : **observer une action alimentaire
validée afin de déterminer si elle est réellement praticable dans la vie du
patient et d'éclairer la décision du praticien au prochain point d'étape**.

## 2. Proposition de valeur resserrée

### Patient

> Conserver quelques repères ciblés pour montrer ce qui a été possible, ce qui
> ne l'a pas été et dans quel contexte, sans devoir documenter toute son
> alimentation.

### Praticien

> Comprendre rapidement si une action alimentaire était applicable, dans
> quelles occasions, avec quels obstacles et avec quelles limites de mesure.

### Position dans WellNeuro 5.0

```text
C1 : sélectionne la priorité et prépare l'action
→ C2 : active l'épisode et ses jalons
→ JA5 : observe les occasions, tentatives, obstacles et limites
→ C5 : fournit les marqueurs et lectures alimentaires autorisés
→ PhaseReview : confronte faisabilité, tolérance et ressenti
→ praticien : maintient, simplifie, remplace ou arrête l'action
```

JA5 reste un capteur spécialisé. Il ne produit ni diagnostic, ni causalité, ni
prescription autonome, ni preuve d'efficacité clinique.

## 3. Forces du concept

- rupture pertinente avec le journal alimentaire exhaustif ;
- réduction attendue de la charge de saisie ;
- question de phase et action validée comme points de départ ;
- distinction entre déclaré, observé, intrinsèque et contextuel ;
- absence de score patient, de série, de badge et de rattrapage culpabilisant ;
- plan minimal et reprise en douceur ;
- provenance, limites et données non inférables conservées ;
- discordance transformée en question d'entretien, jamais en conclusion ;
- signatures et saisie par différences potentiellement très rapides ;
- cohérence avec les épisodes, protocoles et revues de WellNeuro 5.0.

## 4. Faiblesses et risques

### 4.1 Problème utilisateur encore insuffisamment validé

Le concept suppose que la principale cause d'abandon est la quantité de saisie.
D'autres causes peuvent dominer : manque de bénéfice visible, oubli, peur du
jugement, difficulté à décrire un repas ou absence de retour du praticien. Une
trace rapide ne crée de valeur que si la boucle patient-praticien est visible.

### 4.2 Adaptation encore largement calendaire

Le scénario J1–J3, J4–J14 et J15–J21 reste essentiellement fixe. Un système
réellement adaptatif devrait pouvoir réduire, suspendre, prolonger ou arrêter
l'observation selon la couverture, les occasions réelles, la charge et le
changement éventuel de question.

### 4.3 Observation suffisante non définie

Les règles de suffisance ne sont ni arrêtées ni sourcées. Elles doivent rester
des règles d'observabilité versionnées et ne jamais devenir des seuils
cliniques implicites. Le vocabulaire provisoire recommandé est « couverture
exploitable pour la revue » plutôt que « haute confiance ».

### 4.4 Risque de mauvaise unité centrale

Le repas ou l'épisode complet pourraient être trop larges. L'unité de valeur la
plus directe est probablement l'action alimentaire : occasion réelle,
tentative, possibilité, obstacle, ajustement et décision.

### 4.5 Signatures susceptibles de figer une représentation

Une signature répétée peut être confondue avec une observation directe. La
provenance doit distinguer repas reconfirmé, copie simplifiée, souvenir et
observation structurée au moment du repas.

### 4.6 Météo d'adhésion réductrice

Les états « régulière », « fragile » et « interrompue » agrègent des causes très
différentes. Des constats directs sont plus sûrs : absence de trace, absence
d'occasion, plan minimal actif, action déclarée impossible ou synchronisation
en attente.

### 4.7 Risque clinique et relationnel

L'observation répétée de l'alimentation peut renforcer hypervigilance,
culpabilité ou rigidité chez certains patients. L'activation doit rester une
décision humaine, avec possibilité de suspension immédiate. Les critères
d'éligibilité ou de prudence nécessitent un arbitrage clinique séparé et
documenté ; ils ne sont pas définis par le présent document.

### 4.8 Dette attentionnelle praticien

Couverture, projections, discordances, météo, provenance, signatures,
trajectoire et Nutrition Lab pourraient créer un écran trop dense. La vue
initiale doit répondre à une seule question de décision en moins d'une minute.

### 4.9 Ambition technique prématurée

Event sourcing, hors-ligne, synchronisation, voix, photo et conservation
sélective augmentent fortement le coût et les risques RGPD. Leur nécessité doit
être démontrée après validation de la boucle simple.

### 4.10 Tensions de gouvernance à résoudre

- immutabilité de l'historique versus rectification et effacement RGPD ;
- `confidence: number` versus niveaux de preuve discrets de l'architecture
  clinique WellNeuro ;
- durée fixe de 21 jours versus adaptation réelle ;
- comparaison déclaré/observé malgré une collecte volontairement focalisée ;
- métaphore « Ma spirale alimentaire » versus Spirale WellNeuro globale.

## 5. Noyau MVP recommandé

Le premier produit devrait être une **observation d'action alimentaire**, sans
chercher à représenter toute l'alimentation.

### Inclus

- une action validée et sa question de phase ;
- les occasions attendues ou rencontrées ;
- une trace instantanée : réalisé, non possible, reporté ou journée atypique ;
- un obstacle ou facilitateur facultatif et structuré ;
- un plan minimal activable sans justification ;
- une durée cible avec revue humaine ;
- une couverture descriptive et ses limites ;
- une synthèse praticien très courte aux jalons prévus ;
- arrêt, suspension ou reformulation explicites de l'action.

### Différé

- photo et scan produit ;
- conservation d'actifs bruts ;
- cabinet apprenant ;
- simulateur avancé et repas miroir ;
- projections SIIN automatiques ;
- comparaison multi-épisodes ;
- hors-ligne complexe et résolution avancée de conflits ;
- météo d'adhésion agrégée.

## 6. Expérimentations prioritaires

### E1 — Valeur de la boucle courte

Tester si quatre informations suffisent : occasion, possibilité, réalisation et
obstacle principal.

### E2 — Mode de capture

Comparer sans présupposé : choix structurés, dictée confirmée et photo
confirmée. Mesurer durée, corrections, abandon et compréhension.

### E3 — Signatures

Vérifier que la saisie par différences réduit effectivement le temps sans
dégrader la fiabilité perçue ni masquer la variabilité.

### E4 — Vue praticien

Tester une restitution limitée à : action, occasions documentées, obstacles,
limite principale et décision attendue.

### E5 — Acceptabilité relationnelle

Vérifier que le patient perçoit l'outil comme une aide à la discussion et non
comme une surveillance de ses repas.

## 7. Critères de vérité produit

Le concept mérite une extension seulement si les conditions suivantes sont
observées lors d'une expérimentation encadrée :

1. la majorité des traces simples est saisie en moins de dix secondes ;
2. le patient sait expliquer pourquoi la trace lui est demandée ;
3. le praticien comprend la situation en moins d'une minute ;
4. les observations modifient ou confirment réellement une décision de phase ;
5. le patient juge l'aide supérieure à la charge ou au sentiment de contrôle ;
6. les absences de données ne sont jamais interprétées comme des absences de
   comportement ;
7. aucune restitution ne dépasse le niveau de preuve disponible.

Ces critères sont des hypothèses produit à valider. Ils ne constituent pas des
seuils cliniques ni des paramètres de production.

## 8. Arbitrages nécessaires avant campagne

1. Choisir l'objet principal : repas, épisode ou action alimentaire.
2. Choisir le nom patient : « Ma spirale alimentaire » ou « Mes repères
   alimentaires ».
3. Décider si 21 jours est une durée fixe, une cible ou seulement un maximum.
4. Remplacer ou conserver la météo d'adhésion.
5. Définir la représentation de la couverture sans score de confiance continu.
6. Définir les conditions humaines de suspension ou de reformulation.
7. Déterminer les données réellement nécessaires à la décision J21.
8. Trancher la stratégie RGPD de correction, suppression et audit avant toute
   persistance.

## 9. Cap recommandé

> WellNeuro observe une action alimentaire pendant une période courte pour
> comprendre si elle est praticable, dans quelles occasions et avec quels
> obstacles. Le patient conserve le contrôle de la charge de saisie et le
> praticien reste seul responsable de l'interprétation et du tour suivant.

La campagne ne devrait être compilée qu'après arbitrage de ce noyau. Toute
migration, règle clinique ou activation en production devra faire l'objet d'un
lot séparé et d'une confirmation explicite.
