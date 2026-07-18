# Brainstorming — C2B « Trajectoire & Spirale » (aide à l'ajustement)

> Ouvert le 2026-07-18, à la clôture d'implémentation de **C2A** (épisodes,
> protocoles versionnés, check-ins J7/J14/J21 + résumé J21 — PR #110 en prod).
> Ce document **pose** le périmètre C2B et ses questions ouvertes à la lumière du
> programme **Wellneuro 5.0 « la Spirale »** ; il ne décide rien. Les tranchages
> iront dans `ARBITRAGES_C2B.md` (revue utilisateur) puis seront actés au
> `REGISTRE_FRONTIERES.md` sous le prochain code transverse libre **A8**.
> Périmètre : **documentaire — aucune campagne compilée, aucun code.**

## Audit express : C2B tel que cadré vs 5.0

**Cadrage historique (C2 CAMPAGNE.md, registre A1).** C2B possède, *après données
réelles* :
- **momentum clinique explicable** — consomme `web/src/lib/equilibre/momentum.ts`
  (jamais réimplémenté) : praticien = tendance + `|delta|` chiffré, patient =
  tendance + phrase ;
- **comparateur avant/maintenant** — **jalons de mesure uniquement** (T0/J21/J42/J90),
  garde de comparabilité `versionScore` (`VERSION_SCORE_EQUILIBRE`), dates et limites
  explicites ;
- **distinction effet / adhésion / tolérance**, **suggestions d'allègement**,
  **alertes déterministes et explicables uniquement**.

**Invariants qui bornent C2B (A1, non négociables).** Les points d'étape J7/J14/J21
ne deviennent **jamais** un score et n'entrent **jamais** dans « Mon équilibre ». Le
comparateur ne compare **que** des jalons de mesure. **J21 = point de jonction** : le
« résumé J21 » est le seul objet autorisé à croiser les deux lectures, via leurs
contrats publics.

**Ce que 5.0 change.** Le programme (`PROGRAMME_WELLNEURO_5_0.md`, ligne 48) renomme
C2B en **« Trajectoire & Spirale »**, front **praticien**, et lui confie la
**Fiche-trajectoire** : *« la Spirale comme index temporel des épisodes, comparateur
multi-épisodes (même instrument, même version), momentum explicable »*. La Spirale est
un **objet de navigation, jamais un graphe** (A6). C2B passe donc d'un comparateur
*intra-épisode* (avant/maintenant sur les jalons d'un cycle) à un **index
inter-épisodes** navigable.

**Ce que 5.0 découpe hors C2B** (à ne pas absorber) :
- **SP-MET — météo d'adhésion** : signal 3 états (régulière/fragile/interrompue),
  cause observable citée, **jamais affichée côté patient**. L'agrégat 3 états est
  SP-MET ; C2B reste sur des constats déterministes directs.
- **SP-CAB — cabinet apprenant** : repère **médiane** de momentum, `n=` affiché,
  masqué sous **n ≥ 5** épisodes clos. L'overlay cohorte est SP-CAB.
- **SP-TT — time-travel** : rechargement à une date passée (snapshots immuables) +
  **note de relecture** horodatée au présent (`RelectureNote`, A6-1).
- **SP-SPI — Ma spirale (patient)** : accueil patient de trajectoire, gaté IDP.

## Le parti pris proposé

**C2B n'invente aucune mesure ; il rend le temps lisible.** Tout le calcul reste dans
`lib/equilibre` (moteur `momentum.ts` + `depuisPrisma.ts`). C2B est une **couche de
lecture praticien** : brancher les lectures qui existent déjà, les rendre comparables
sous garde de version, et n'énoncer que des constats **recalculables et sourcés**
(instrument, date, `versionScore`). La Spirale est l'index qui donne accès à ces
lectures épisode par épisode — pas une dataviz de plus.

## Le vrai point dur : le score du résumé J21 est *câblé à null*, pas absent

Découverte de l'audit, à mettre au centre du brainstorm : **le moteur existe déjà**,
seul le branchement manque.
- `web/src/lib/equilibre/depuisPrisma.ts` fournit
  `construireHistoriqueEquilibre(reponses) → LectureDatee[]` (borné aux 4 jalons,
  jamais un 0 pour un jalon non atteint) et `resoudreDateT0(reponses)`. C'est **déjà
  branché** dans `api/patient/equilibre` et `api/praticien/equilibre`.
- Mais `api/praticien/protocoles/checkins/route.ts` appelle `buildResumeJ21({ checkins })`
  **sans momentum** → volet score `null` (dette LOT-04 assumée, renvoyée à C2B).

Donc C2B ≈ *« passer `{ dateT0, lectures }` à `buildResumeJ21` et au comparateur, sous
garde `versionScore` »*. Simple en apparence — mais trois choix de fond en découlent,
qui sont l'objet du brainstorm.

> **Approfondissement** : `NOTE_TECHNIQUE_MOMENTUM.md` (même dossier) détaille le
> branchement réel — le moteur existe déjà (`depuisPrisma.ts` + `momentum.ts`, déjà
> utilisés par `api/praticien/equilibre`) et transforme Q1/Q2/Q3/Q5 en options concrètes
> ancrées dans le code. Verdict : aucune des questions techniques n'exige un nouveau
> moteur ni une migration — ce sont des choix de branchement, d'ancrage T0 et d'affichage.

## Concepts à explorer

### 1. La Fiche-trajectoire praticien (Spirale-index)
- **Objet** : un index temporel des **épisodes** d'un patient (T0 confirmé →
  protocole diffusé → check-ins → jalon suivant), navigable, ouvrant sur la lecture
  d'un épisode. **Jamais un graphe** : une liste/spirale de repères datés cliquables.
- **Langage** : « point d'étape » (pilotage) vs « jalon de mesure » (score) restent
  visuellement distincts ; le résumé J21 est le nœud où les deux se rejoignent.
- **Écarté** : courbe continue, score de risque, projection.

### 2. Le comparateur multi-épisodes (intra-instrument)
- **Objet** : extension du composant *compare* existant — **même instrument, même
  `versionScore`**, épisodes côte à côte. Refus explicite de comparer deux lectures de
  `versionScore` différents (afficher « non comparable » plutôt qu'un delta trompeur).
- **Écarté** : comparer des points d'étape entre eux ; mélanger instruments.

### 3. Momentum explicable, différencié par audience
- **Objet** : réutiliser `calculerDeltaMomentum` — praticien voit `|delta|` + tendance
  + date + `versionScore` ; patient (si un jour exposé) verrait tendance + phrase
  factuelle. Chaque énoncé cite sa source.
- **Écarté** : « Adhésion : 43 % », pronostic nominatif, envoi automatique.

### 4. Suggestions d'allègement & alertes déterministes
- **Objet** : à partir de `effet` (momentum) × `adhésion`/`tolérance` (check-ins),
  proposer des **brouillons** d'ajustement (alléger la charge) — toujours validés par
  le praticien, routés vers le versionnement C2A existant (`/versions`). Alertes =
  règles explicites (« tolérance difficile 2 points d'étape de suite »), jamais un
  modèle.
- **Écarté** : score de décrochage, notification proactive autonome.

## Questions ouvertes à arbitrer (→ ARBITRAGES_C2B.md)

1. **Ancrage de T0 : global vs par épisode.** `resoudreDateT0` prend la *première
   réponse questionnaire* du patient. Un comparateur **multi-épisodes** (5.0) exige des
   jalons ancrés au T0 **de chaque épisode** (`AssessmentEpisode` confirmé). Faut-il un
   T0 par épisode (recommandé pour la Spirale) tout en gardant le T0 global pour la
   fiche « Mon équilibre » actuelle ?
2. **Couverture des lectures sur données réelles.** `construireHistoriqueEquilibre`
   n'utilise que les réponses portant `scoresJson.rawAnswers` (les lignes seed
   pré-agrégées sont silencieusement ignorées). Sur données réelles, quel niveau de
   couverture garantit un jalon « valide » ? Afficher explicitement « jalon non mesuré »
   plutôt que rien ?
3. **Garde `versionScore` dans le comparateur.** Politique exacte quand deux jalons/
   épisodes ont des `versionScore` différents : masquer le delta ? l'afficher barré
   avec mention ? Règle unique et lisible.
4. **Frontière C2B ↔ SP-MET.** Jusqu'où vont les « alertes déterministes » de C2B avant
   de devenir la « météo d'adhésion » 3 états (SP-MET) ? Proposition : C2B = constats
   directs par point d'étape ; SP-MET = agrégat 3 états. Où est la ligne ?
5. **Données réelles = prérequis.** Le cadrage dit « après données réelles ». Combien
   d'épisodes/jalons réels avant d'activer C2B, pour ne pas cadrer sur du vide ?

## Garde-fous — ce que C2B refuse

- Réimplémenter le score ou les jalons (propriété exclusive `lib/equilibre`).
- Convertir un point d'étape en score / l'injecter dans « Mon équilibre ».
- Comparer hors `versionScore` identique ; comparer des instruments différents.
- Score de risque chiffré, pronostic nominatif, envoi automatique, gamification.
- Pourcentage d'observance côté patient (formulation factuelle positive obligatoire).
- Absorber SP-MET (météo agrégée), SP-CAB (médiane cohorte), SP-TT (time-travel),
  SP-SPI (accueil patient).

## Raccordement

- **Suite immédiate** : revue utilisateur de ce brainstorm → `ARBITRAGES_C2B.md`
  (tranchages, code registre **A8-x**) → compilation des lots C2B.
- **Consomme** : `momentum.ts` + `depuisPrisma.ts` (lectures datées), objets C2A
  persistés (`assessment_episodes`, `protocol_drafts`, `protocol_checkins`,
  `protocol_diffusion_approvals`), primitives HC-F, composant *compare* existant.
- **Ne possède pas** : le score, les jalons, la météo d'adhésion (SP-MET), la médiane
  cohorte (SP-CAB), le time-travel (SP-TT), l'accueil patient trajectoire (SP-SPI).
- **Dette C2A reprise ici** : brancher `{ dateT0, lectures }` dans `buildResumeJ21`
  (`resumeJ21.ts`) et le comparateur — le volet score du résumé J21 cesse alors d'être
  `null`.
