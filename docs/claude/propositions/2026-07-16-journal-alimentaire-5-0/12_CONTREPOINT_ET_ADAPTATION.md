---
id: wellneuro-ja5-contrepoint-adaptation
version: 5.0-adaptation
date: 2026-07-16
statut: adaptation_actee
---

# Journal alimentaire 5.0 — contrepoint critique et adaptation du plan de campagne

> Session du 2026-07-16, à la suite de l'actation A7 (brainstorm + arbitrages
> D1–D12 + architecture à deux régimes). L'utilisateur a demandé une vision
> critique indépendante du produit, au-delà des cadres posés par les docs
> 00–11, puis a décidé d'adapter le plan de campagne selon ces
> recommandations — en gardant un outil de mesure/calibrage pré-protocole et
> en raccordant les notes Ciqual et assiettes de la Boussole alimentaire.
> Décisions utilisateur recueillies le 2026-07-16, actées au registre
> (A7-11 amendé, A7-12 à A7-14).

## 1. La thèse du contrepoint

Le JA 5.0 ne devrait pas être un instrument d'observation qui produit des
données pour le praticien. Il devrait être un **dispositif de préparation de
la conversation** : son seul travail est de faire atterrir chaque
consultation sur la bonne décision plus vite, avec le moins de travail
patient possible. Tous les journaux alimentaires meurent de la même mort —
ils demandent plus qu'ils ne rendent ; la discipline produit n° 1 est de
résister à la pulsion de mesurer.

## 2. Forces confirmées du concept

- **L'inversion faisabilité/contenu** : aucun journal du marché ne capture
  pourquoi un changement tient ou ne tient pas — la seule donnée qu'une
  photo d'assiette ne donnera jamais, et celle dont le praticien a besoin.
- **Le droit au silence utile** : la minimisation RGPD transformée en vertu
  UX, défendable devant une CNIL comme devant un patient.
- **Le delta de décision** : mesurer le produit à ce qu'il change aux
  décisions, pas à l'engagement — l'anti-métrique de l'économie de
  l'attention, et le kill-switch honnête du dispositif.
- **L'essai non concluant utile** : protège l'alliance thérapeutique
  structurellement.

## 3. Faiblesses identifiées (au-delà de l'autocritique du doc 09)

1. **Le pack résout la charge, pas le motif.** On tient parce que quelqu'un
   qu'on estime va regarder et répondre — pas parce que saisir est léger.
   Douze documents de vision, zéro conversation patient : la production de
   vision a dépassé la validation.
2. **La taxonomie des frictions est le mur porteur le plus fragile.** La
   friction réelle est composite, ambivalente, parfois intime ; les
   catégories fermées produiront des données propres mais creuses. La
   friction se capture mal en taxonomie et très bien en entretien.
3. **Le régime A métrologique est surdimensionné** pour un cabinet :
   gouvernance d'instrument-grade (fixtures de certification, règles
   déterministes) à coût fixe élevé pour une base de quelques dizaines de
   patients.
4. **La rareté des données tuera les moteurs.** Avec budget d'attention,
   silence et plan minimal, l'épisode médian contiendra 5 à 15 traces — à ce
   volume, l'affichage bat le calcul.
5. **Même la friction peut devenir surveillance de soi** pour un patient
   hypervigilant ou à tendance orthorexique (doc 09 §4.7) ; le produit le
   plus sûr sait parfois ne pas exister du tout.

## 4. Innovations apportées par le contrepoint

- **La carrière d'action** : l'action devient l'objet longitudinal —
  proposée → essayée → adaptée → stabilisée → intégrée /
  abandonnée-informative — à travers les tours de la Spirale (la recherche
  sur les habitudes parle de ~66 jours, pas 21 : une action a besoin de
  plusieurs tours).
- **La friction comme ordre du jour, pas comme donnée** : le patient pose un
  marqueur simple ; l'application prépare pour le praticien les « 3 moments
  à explorer » en consultation. La vraie capture a lieu dans la relation.
- **Le protocole d'abstention** (régime « silence ») : le praticien peut
  prescrire zéro observation ; l'épisode n'existe que comme ancre de
  conversation à la revue. Sécurité pour les profils à risque + groupe
  contrôle naturel pour l'expérimentation E1.
- **La question du jour** : l'épisode se compile en au plus une petite
  question certains jours ; le cadre « journal » disparaît, la cible < 10 s
  est garantie par construction.
- **Le budget de charge au niveau du protocole** : le patient a un seul
  budget global de sollicitation (questionnaires + check-ins + journal), pas
  un budget par instrument — contrainte architecturale à acter côté C2A.
- **La revue = décision pré-remplie** : la sortie praticien est une décision
  proposée avec ses preuves attachées (« Simplifier l'action — Accepter /
  Modifier »), pas un rapport.
- **La parité papier** : carte A6 imprimable par semaine, saisie praticien
  en 30 s — inclusif et test le moins cher du concept entier.
- **Des métriques de qualité de décision** : % de revues où les traces ont
  changé quelque chose, % de patients sachant dire pourquoi on leur
  demandait une trace, abandons expliqués vs silencieux.

## 5. Décisions d'adaptation (utilisateur, 2026-07-16)

### 5.1 Régime A → « bilan de calibrage »

L'outil de mesure pré-bilan/pré-protocole est conservé, sous forme **bornée
(3–5 jours)** à **double calibrage** :

- **clinique** : structure et **heure** des prises (ce qui débloquera à
  terme la chronobiologie du besoin 3 de la Boussole), empreintes de
  marqueurs ✓/○, variabilité semaine/week-end → `DietaryObservationProfile`
  minimal éclairant le `ClinicalSnapshot` ;
- **produit** : capacité d'observation du patient — charge supportable,
  moments réalistes de saisie, contextes disponibles → calibre le budget
  d'attention et la politique du régime B.

Affichage d'abord, aucun moteur. La gouvernance métrologique complète du
doc 11 §9 devient un **lot ultérieur conditionnel**, déclenché si le profil
observationnel commence à peser dans les décisions cliniques.

### 5.2 Ciqual — les codes, pas les valeurs

Le registre de marqueurs JA est **adossé aux codes des 191 aliments moyens
Ciqual** (Anses, licence Etalab 2.0) dès le JA-00 : traçabilité immédiate,
interopérabilité future avec le scoring C5A, zéro violation de frontière,
zéro dépendance de code. Le JA ne porte **aucune valeur nutritionnelle ni
score** — les valeurs ne seront consommées que via le référentiel C5A quand
il sera livré. Contrainte de vocabulaire commun : **les 12 aliments vedettes
du slice C5 sont un sous-ensemble des marqueurs JA**.

### 5.3 La boucle assiettes ↔ essais

**C5B recommande une assiette par objectif → le régime B du JA la teste en
essai réel (occasions, frictions, adaptations) → les solutions confirmées du
patient documentent quelle version réelle tient dans sa vie → cela éclaire
la recommandation suivante.** L'action validée d'un essai peut référencer
une assiette recommandée — interface actée sans dépendre de la livraison de
la table `assiette_type` (candidate en C5B). Vocabulaire : « recommandation
d'assiette », jamais « prescription » (règle R4 du dépôt : le mot est banni
côté produit).

### 5.4 Articulation avec la Boussole alimentaire (C5)

C5 reste une campagne data parallèle intercalable, **non recadrée**. Quatre
points de contact consignés aux fiches de frontières :

1. vocabulaire Ciqual commun (§5.2) ;
2. boucle assiettes (§5.3) — la fiche C5 consomme désormais explicitement
   « la faisabilité publiée par JA » ;
3. chronobiologie : le calibrage capture l'heure des prises → débloquera le
   besoin 3 différé de C5 (quand C2A persistera) ;
4. lectures complémentaires : JA porte déclaré/observé/vécu, C5 porte
   intrinsèque/contextuel, le praticien porte l'interprété.

**C5A signalée sans séquencer** : candidat naturel de prochaine campagne
data (fonde le scoring Boussole et le vocabulaire de marqueurs JA) ;
l'activation reste un choix explicite.

### 5.5 Briques retenues au plan de campagne

Toutes : lot **JA-0T validation terrain** (5 entretiens patients, E1/E5 du
doc 09, test de la carte papier) avant le lot domaine ; **carrière
d'action** ; **régime silence** ; **parité papier** ; et d'office : question
du jour, friction-agenda, décision pré-remplie, delta instrumenté dès le
premier lot, affichage-avant-moteurs, budget de charge global.

## 6. En une phrase

> Le concept mérite d'exister parce qu'il observe la vie plutôt que
> l'assiette ; il ne survivra que s'il reste un préparateur de conversations
> à cinq questions par semaine, et il mourra s'il devient l'instrument de
> mesure sophistiqué que son architecture rêve déjà d'être.
