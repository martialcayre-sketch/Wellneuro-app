### Observance compléments versionnée + trajectoire intentions→épisodes (2026-07-24)

C4 LOT-05. Trois interdits tenus partout : jamais un score/pourcentage, jamais
montré au patient comme mesure, jamais de relance ni d'agrégat nouveau.

- **Évolution VERSIONNÉE du catalogue de check-in gelé** (`checkinDomain.ts`).
  Le tableau `CHECKIN_QUESTIONS` reste **gelé** (4 questions, longueur inchangée,
  libellés/valeurs identiques — pinné par test). L'évolution passe par des
  constantes **séparées** et une version de catalogue explicite :
  `CHECKIN_CATALOGUE_BASE_VERSION` (`checkin-catalogue-v1`, les 4 gelées) et
  `CHECKIN_CATALOGUE_VERSION` (`checkin-catalogue-v2-observance-complements`,
  additive). La question `observance_complements` (+ un motif fermé facultatif)
  n'est **rendue que si** le protocole actif porte une action
  `supplement_exploration` matérialisée (`supplementCatalogRef` défini), via
  `resolveCheckinQuestions()` + le prédicat pur `aUneMaterialisationComplements()`.
  Options fermées non culpabilisantes calquées sur `adhesion` (« Pas encore
  commencé / Quelques prises / La plupart des jours / Tous les jours » ; motif :
  « oubli / gêne digestive / doute / autre »). `ensureReponses` porte et valide
  ces réponses **quand elles sont présentes** (facultatives, additives) — le
  contrat des 4 questions de base est inchangé.
- **Fait observé, pas deuxième météo** (`adhesion.ts`). La réponse
  `observance_complements` (et son motif) entre dans `faitsObserves`, verbatim et
  sourcée sur son point d'étape, **au même titre que la tolérance non-« bien »**.
  La forme de `deriverMeteoAdhesion` est **inchangée** : toujours 3 états +
  indéterminée, dérivés de la seule question `adhesion` ; aucune pondération,
  aucun nouvel agrégat.
- **Vue trajectoire « intentions → épisodes »**, praticien seul, dérivée à la
  lecture, **jamais persistée** (`trajectoireIntentions.ts`, sans dépendance
  Prisma). Juxtapose trois bandes de faits — intentions/matérialisations actives
  du protocole (référence catalogue **opaque** : ni produit, ni forme, ni dose,
  ni marque), épisodes `AssessmentEpisode` T0/J21/J42/J90, faits d'observance
  rapportés par point d'étape — plus l'agrégat météo **réutilisé** (pas
  recalculé). Champs `causalite: 'aucune'` et `coefficients: 'aucun'` inscrits
  dans la donnée : aucune flèche causale, aucun coefficient. Le praticien conclut.
- **Périmètre** : évolution de **domaine + tests** (Vitest exhaustifs, garde-fous
  de non-fuite patient inclus). Le câblage du formulaire patient / route GET et
  l'affichage de la trajectoire dans `TrajectoirePanel` (derrière `WN_C4_ENABLED`
  fail-closed) sont laissés à un lot de suite pour ne pas toucher aux contrats
  gelés route/formulaire/panneau ; le domaine est prêt à câbler (résolveur +
  report additif en place). Contrat clinique gelé touché → **revue adversariale
  requise avant merge**.
