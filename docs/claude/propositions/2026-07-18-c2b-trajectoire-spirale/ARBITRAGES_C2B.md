# Arbitrages — C2B « Trajectoire & Spirale » (décisions utilisateur 2026-07-18)

> Tranche les questions ouvertes de `BRAINSTORM_C2B.md` (Q1–Q5), à la lumière de
> `NOTE_TECHNIQUE_MOMENTUM.md`. Décisions prises par l'utilisateur (revue du
> 2026-07-18). Ces tranchages sont actés au `REGISTRE_FRONTIERES.md` sous le code
> transverse **A8** (source normative). Périmètre : **documentaire — aucun code,
> aucun lot compilé.**

## Parti pris confirmé

C2B **n'invente aucune mesure** ; il rend le temps lisible côté praticien. Tout le
calcul reste dans `web/src/lib/equilibre` (`momentum.ts` + `depuisPrisma.ts`, déjà
branchés sur `api/praticien/equilibre`). C2B est une **couche de lecture** : brancher
les lectures existantes, les rendre comparables sous garde de version, n'énoncer que
des constats **recalculables et sourcés** (instrument, date, `versionScore`). La
Spirale est l'**index** de ces lectures épisode par épisode — jamais une dataviz de
plus. Aucune des questions techniques n'exige un nouveau moteur ni une migration.

## Décisions

### D1 (Q1) — Ancrage de T0 : **T0 par épisode, T0 global conservé pour « Mon équilibre »**

- Le **comparateur praticien** ancre les jalons J21/J42/J90 sur le **T0 de chaque
  `AssessmentEpisode`** (`confirmed_at` du milestone `T0`). `resoudreLectureJalon`
  fonctionne tel quel dès qu'on lui passe ce T0 d'épisode.
- La fiche **patient « Mon équilibre »** conserve le **T0 global** (`resoudreDateT0`
  = 1re réponse du patient). Aucun changement de son comportement actuel.
- **Prérequis** du comparateur multi-épisodes 5.0. Migration-free.
- **À préciser en compilation de lot** : source exacte du T0 d'épisode
  (`confirmedAt` retenu par défaut vs `targetAt`) et fenêtrage des réponses
  questionnaire rattachées à un épisode.
- *Écarté* : T0 global partout (statu quo) — faux dès le 2ᵉ épisode, casse le
  comparateur.

### D2 (Q2) — Couverture des lectures : **afficher explicitement « jalon non mesuré »**

- `extraireRawAnswers` ignore silencieusement toute réponse sans
  `scoresJson.rawAnswers` (lignes seed pré-agrégées). Un jalon peut donc être « non
  mesuré » faute de réponses exploitables.
- Côté **praticien / Fiche-trajectoire**, un jalon sans couverture est affiché
  **« jalon non mesuré »** (honnêteté de la trajectoire), jamais omis sans trace,
  jamais rempli par un 0 inventé. Strictement aligné sur l'invariant A1.
- *Adopté par défaut* (reco de la note), non contesté en revue.
- **À vérifier en compilation** : volume réel de réponses portant `rawAnswers` (les
  soumissions passent par `api/patient/submit`).
- *Écarté* : statu quo « jalon absent = rien affiché ».

### D3 (Q3) — Garde `versionScore` : **bloc « non comparable (score recalibré le …) »**

- Le comparateur **ne soustrait jamais** deux lectures de `versionScore` différents.
- Quand les versions diffèrent, afficher un **bloc explicite « non comparable (score
  recalibré le …) »** à la place du delta. Règle unique et lisible.
- `VERSION_SCORE_EQUILIBRE = 'v1'` (`web/src/lib/equilibre/constants.ts`) ; toute
  évolution des poids/seuils/mapping **doit** bumper cette version (invariant clinique
  registre §1).
- *Écarté* : delta affiché barré + mention (le chiffre barré reste lu) ; masquer le
  delta silencieusement (opaque).

### D4 (Q4) — Frontière C2B ↔ SP-MET : **C2B = constats déterministes directs seulement**

- C2B n'énonce que des **constats déterministes par point d'étape**, règles
  explicites (ex. « tolérance difficile 2 points d'étape de suite »), chacun sourcé.
- L'**agrégat 3 états** (régulière / fragile / interrompue) reste **entièrement
  SP-MET** (praticien seul, cause observable citée, jamais côté patient, jamais un
  score interne). Aucun pré-agrégat en C2B. Ligne nette, pas de recouvrement.
- Cohérent avec A7-6 (météo différée à SP-MET pour le journal alimentaire).
- *Écarté* : pré-agrégat léger en C2B (empièterait sur SP-MET, flouterait la
  frontière).

### D5 (Q5) — Activation sur données réelles : **deux temps**

- **(i) Score du résumé J21** : branché dès qu'**un cycle réel existe** (T0 + J21
  mesurés). C'est le plus petit incrément C2B, migration-free — **lève la dette
  LOT-04** (`buildResumeJ21` cesse de renvoyer un score `null`).
- **(ii) Comparateur multi-épisodes** : activé quand **≥ 2 épisodes comparables**
  (même patient, même instrument, même `versionScore`) existent.
- Distinct du seuil **cohorte n ≥ 5** (SP-CAB, hors C2B).
- *Écarté* : tout attendre ≥ 2 épisodes (laisse J21 à null trop longtemps) ; activer
  immédiatement sans données réelles (contredit le cadrage « après données réelles »).

## Frontières C2B réaffirmées (inchangées)

C2B **ne possède pas** et **ne réimplémente pas** : le score ni les jalons (propriété
`lib/equilibre`) ; la conversion d'un point d'étape en score ou son injection dans
« Mon équilibre » ; la comparaison hors `versionScore` identique ou inter-instruments ;
un score de risque chiffré, un pronostic nominatif, un envoi automatique, la
gamification ; un pourcentage d'observance côté patient. **N'absorbe pas** : SP-MET
(météo 3 états), SP-CAB (médiane cohorte, n ≥ 5), SP-TT (time-travel), SP-SPI (accueil
patient trajectoire).

## Découpage en lots C2B (indicatif, à compiler ensuite — règle N+1)

1. **Lot « score J21 »** — branchement §2 de la note : dans
   `api/praticien/protocoles/checkins/route.ts`, charger les `questionnaire_reponses`
   du patient, construire `{ dateT0, lectures: historique }` et le passer à
   `buildResumeJ21`. Migration-free. Lève la dette LOT-04 (D5-i).
2. **Lot « T0 par épisode »** — D1-B : ancre par épisode, condition du comparateur.
3. **Lot « comparateur multi-épisodes »** — §7 de la note : garde `versionScore`
   (D3) + « jalon non mesuré » (D2), Spirale = index de navigation, jamais une courbe.

## Raccordement

- **Suite immédiate** : acter A8 au `REGISTRE_FRONTIERES.md`, puis compiler le
  premier lot C2B (règle N+1) — le lot « score J21 » est le candidat naturel.
- **Consomme** : `momentum.ts` + `depuisPrisma.ts` (lectures datées), objets C2A
  persistés (`assessment_episodes`, `protocol_drafts`, `protocol_checkins`,
  `protocol_diffusion_approvals`), primitives HC-F, composant *compare* existant.
- **Discordances 5.0 à porter au handoff** (rappel LOT-06 C2A) : `RelectureNote`
  (A6-1 « en C2A » vs différée SP-TT) et budget de charge (A7-14) — hors périmètre
  C2B, futur gate migration.
