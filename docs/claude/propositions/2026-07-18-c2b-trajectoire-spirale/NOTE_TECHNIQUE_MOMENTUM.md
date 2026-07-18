# Note technique — branchement momentum du résumé J21 & comparateur (C2B)

> Enrichit `BRAINSTORM_C2B.md` (2026-07-18). Transforme les questions ouvertes
> Q1/Q2/Q3/Q5 en options **ancrées dans le code réel**. Documentaire — **aucun code,
> aucune compilation**. Les tranchages restent pour `ARBITRAGES_C2B.md` (registre A8-x).

## 1. État réel — le moteur existe déjà, seul le branchement du résumé J21 manque

Le calcul du momentum n'est **pas** à construire. Il est complet et déjà utilisé en prod
sur la fiche « Mon équilibre » :

- `web/src/lib/equilibre/depuisPrisma.ts` :
  - `construireReponsesParQuestionnaire(reponses: ReponseBrute[], dateLimite?)` — dédup par
    questionnaire (dernière réponse ≤ `dateLimite`), **ne garde que les lignes portant
    `scoresJson.rawAnswers`** (`extraireRawAnswers`) ;
  - `resoudreDateT0(reponses): Date | null` — T0 = date de la **toute première** réponse
    du patient ;
  - `construireHistoriqueEquilibre(reponses): LectureDatee[]` — historique **borné aux 4
    jalons** T0/J21/J42/J90 ; un jalon non atteint / sans couverture est **omis, jamais un 0**.
- `web/src/lib/equilibre/momentum.ts` : `resoudreLectureJalon(dateT0, jalon, lectures)` +
  `calculerDeltaMomentum(depart, arrivee)` → `{ delta, tendance }`.

**Preuve que le branchement est trivial** — `web/src/app/api/praticien/equilibre/route.ts`
le fait déjà, verbatim :

```ts
const dateT0 = resoudreDateT0(reponsesDb);
if (dateT0) {
  const historique = construireHistoriqueEquilibre(reponsesDb);
  const lectureT0 = resoudreLectureJalon(dateT0, 'T0', historique);
  const dernierJalonAtteint = (['J90','J42','J21'] as JalonMomentum[])
    .find(j => resoudreLectureJalon(dateT0, j, historique) !== null);
  const lectureRecente = dernierJalonAtteint
    ? resoudreLectureJalon(dateT0, dernierJalonAtteint, historique) : null;
  momentum = calculerDeltaMomentum(lectureT0, lectureRecente);
}
```

**Le trou C2B** : `web/src/app/api/praticien/protocoles/checkins/route.ts` appelle
`buildResumeJ21({ checkins })` **sans momentum**, alors que `resumeJ21.ts` accepte déjà un
`momentum?: { dateT0: Date; lectures: LectureDatee[] } | null` (absent → score `null`, « le
point de jonction reste honnête »). **C2B = fournir cet argument**, rien de plus côté moteur.

## 2. Branchement minimal (le plus petit incrément C2B utile)

Dans la route checkins praticien : charger les `questionnaire_reponses` du patient (comme la
route équilibre), construire `historique` + `dateT0`, et passer
`{ dateT0, lectures: historique }` à `buildResumeJ21`. Le volet score du résumé J21 cesse
d'être `null` — **sans nouvelle table, sans toucher au moteur**. C'est le candidat naturel du
premier lot C2B.

## 3. Q1 — ancrage de T0 : global vs par épisode

`resoudreDateT0` renvoie un T0 **global** (1re réponse du patient). Or le comparateur
**multi-épisodes** (5.0, Fiche-trajectoire) doit ancrer les jalons au T0 **de chaque
épisode**.

| Option | Ancre | Pour | Contre |
|---|---|---|---|
| **A. T0 global** (existant) | 1re réponse patient | zéro travail ; cohérent avec « Mon équilibre » actuel | un seul cycle ; faux dès le 2ᵉ épisode |
| **B. T0 par épisode** (reco C2B) | `AssessmentEpisode` (milestone `T0`, `confirmedAt`/`targetAt`) | jalons J21/J42/J90 corrects par cycle ; **prérequis du comparateur multi-épisodes** | exige de mapper réponses → fenêtre d'épisode |

**Piste B** : `resoudreLectureJalon(dateT0Episode, jalon, lectures)` fonctionne tel quel si on
lui passe le T0 de l'épisode (`assessment_episodes.confirmed_at` du milestone T0). La fiche
« Mon équilibre » patient garde le T0 global (A) ; le comparateur praticien utilise B. À
trancher : source exacte du T0 d'épisode (confirmedAt vs targetAt) et fenêtrage des réponses.

## 4. Q2 — couverture des lectures sur données réelles

`extraireRawAnswers` **ignore silencieusement** toute réponse sans `scoresJson.rawAnswers`
(les lignes seed pré-agrégées). Conséquence sur données réelles : un jalon peut être « non
mesuré » faute de réponses exploitables, et il est aujourd'hui **omis sans trace**.

Options : (a) **statu quo** — jalon absent = rien ; (b) **explicite** — afficher « jalon non
mesuré » côté praticien (honnêteté de la trajectoire, cohérent A1 « jamais un 0 inventé »).
Reco : (b) pour la Fiche-trajectoire. À vérifier : quel volume de réponses réelles porte
effectivement `rawAnswers` (les soumissions passent par `api/patient/submit`).

## 5. Q3 — garde de comparabilité `versionScore`

`VERSION_SCORE_EQUILIBRE = 'v1'` (`web/src/lib/equilibre/constants.ts`) ; exposé sur
`ResultatEquilibre.versionScore`. Toute évolution des poids/seuils/mapping **doit** bumper
cette version. Le comparateur **ne doit jamais** soustraire deux lectures de `versionScore`
différents.

Options d'UX praticien quand les versions diffèrent : (a) masquer le delta ; (b) l'afficher
**barré** + mention ; (c) bloc « non comparable (score recalibré le …) ». Reco : (c) —
explicite et non trompeur. Règle unique à acter.

## 6. Q5 — prérequis « données réelles »

Le cadrage dit C2B « après données réelles ». Le résumé J21 (branchement §2) est utile dès
**1 épisode avec T0 + J21 mesurés**. Le **comparateur multi-épisodes** exige **≥ 2 épisodes**
du même patient, même instrument, même `versionScore`. Reco : activer C2B en deux temps —
(i) branchement score J21 dès qu'un cycle réel existe ; (ii) comparateur quand ≥ 2 épisodes
comparables existent. À distinguer du seuil **cohorte** `n ≥ 5` (SP-CAB, hors C2B).

## 7. Esquisse — comparateur multi-épisodes

Par patient : lister les `assessment_episodes` (chacun son T0), calculer par épisode
`{ lectureT0, lectureJalon }` via `resoudreLectureJalon` ancré sur le T0 d'épisode, puis
présenter **côte à côte** les épisodes partageant instrument + `versionScore`. Réutiliser le
composant *compare* 4.0 (piste 5 « mémoire longitudinale »). La Spirale = **index** de ces
épisodes (navigation), jamais une courbe.

## 8. Impact sur les futurs lots C2B

- **Lot « score J21 »** : branchement §2 (le plus petit incrément, migration-free) — lève la
  dette LOT-04.
- **Lot « T0 par épisode »** : Q1-B, condition du comparateur.
- **Lot « comparateur multi-épisodes »** : §7, garde `versionScore` (Q3) + « non mesuré » (Q2).
- **Hors C2B** (rappel) : météo 3 états (SP-MET), médiane cohorte (SP-CAB), time-travel
  (SP-TT), accueil patient (SP-SPI).

**Ce que la note dé-risque** : aucune des 4 questions techniques (Q1/Q2/Q3/Q5) n'exige un
nouveau moteur ni une migration — ce sont des choix de **branchement, d'ancrage et
d'affichage**. Seule Q4 (frontière C2B ↔ SP-MET) reste purement conceptuelle, à trancher en
arbitrage.
