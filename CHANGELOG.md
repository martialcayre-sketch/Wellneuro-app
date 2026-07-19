# Changelog

Toutes les évolutions notables du MVP Wellneuro NNPP2 doivent être documentées ici.

## Non publié

### Vague 2 — cadrage des campagnes (2026-07-19)

- **Cinq `CAMPAGNE.md` créés**, fermant l'écart **E2** de l'audit de conformité
  UX 5.0 (campagnes inscrites au Programme sans cadrage) : **SP-COP** (copilote
  pré-vol & minute d'après), **SP-TT** (time-travel & note de relecture),
  **SP-MET** (météo d'adhésion), **IDP** (identité patient durable), **SP-SPI**
  (« Ma spirale » et reprise patient). Chacune fige objectif, frontières
  (possède / consomme / ne possède pas), décisions actées, dépendances et lots.
- **Fiches de frontières** correspondantes ajoutées au registre normatif
  (`REGISTRE_FRONTIERES.md` §3). L'entrée différée « Auth patient
  inter-assignations » sort des différés au profit de la campagne IDP.
- **Gates identifiés et nommés** : G1 (refus persisté des cartes du Fil),
  G2 (identité de cycle des épisodes), G3 (`relecture_notes`), G4 (identité
  patient durable) — chacun exigeant une confirmation explicite distincte.
  SP-MET et SP-TT-01 sont livrables **sans migration**.
- **Deux rectifications doc↔code** :
  1. la maquette cible ne badge que **deux** éléments (`SP-COP`, `C3`), tous
     deux côté praticien, et non « les couches futures » — les six autres
     lignes de la table « Vagues 2+ » n'ont aucune trace visuelle ; chaque
     campagne devra produire ses propres maquettes ;
  2. le Fil du jour **n'a aucune carte refusable** dans le code livré,
     contrairement à ce qu'affirmait l'audit — le garde-fou 5.0 « chaque
     automatisme reste refusable » n'est pas tenu sur cette surface, sa mise en
     conformité est portée par le polissage SP-FIL (gate G1).
- Documentation seule : **aucun code applicatif, aucun schéma, aucune migration,
  aucun flag, aucun seuil clinique modifié**.

### Lot Vague 1 — application UX 5.0 au code (2026-07-19)

- **Portail patient legacy → tokens Jardin** (PR 1) : flux `/patient` migré des
  couleurs en dur (bleu/gris) vers les tokens sémantiques, `ReadingComfortControl`
  monté, hub « questionnaires en attente » rétrogradé sous le contenu d'étape,
  `PlaintesForm` paginé (4 + 3 curseurs) — contrat de soumission inchangé.
- **Shell praticien** (PR 2) : métriques du cabinet rendues actives (chaque carte
  est un point d'accès vers `/dashboard/patients` ou `/dashboard/synthese`),
  typographie remontée (nav 11→13 px, titres de section en `font-display`, titre
  d'accueil `text-3xl`, en-tête patient `text-2xl`), **canvas mid-tone A5-R2**
  appliqué à `globals.css` (praticien `#D3D8E6`, patient `#EAE0CC` ; cartes
  inchangées), tokens de l'Observatory C5 réalignés (slate/red → rail/status).
- **Poste de pilotage** (PR 3) : `FichePatientPanel` réorganisé en cockpit borné
  à la hauteur d'écran (bandeau patient + rail des 7 phases du cycle clinique +
  zone focale unique + instruments à tiroir), onglets in-fiche
  (poste de pilotage / 12 besoins / alimentation / trajectoire) remplaçant la
  navigation par scroll et les sous-vues en page pleine, trois instruments
  denses (12 besoins, objets cliniques & momentum, détail des réponses) déplacés
  en tiroir Radix ouvert **au clic** (patron `PatientPreview`) ; le runtime
  clinique n'est que **filtré par phase** (`ClinicalRuntimeSection` : prop
  `phase` additive, défaut `tout` inchangé). Aucun instrument n'a disparu.
  Rail des phases **et** onglets in-fiche navigables au clavier (flèches /
  Origine / Fin, `tabindex` roving). Le `ProtocolMiniBuilder` et la boussole
  alimentaire restent montés (masqués via `hidden`, jamais démontés) : la
  saisie de protocole en cours et l'aliment sélectionné sont **préservés** en
  changeant de phase. Statuts du rail dérivés de l'état réel : réponses reçues,
  demande de correction en attente, épisode confirmé, versions ; Réévaluation
  « renseignée » **uniquement si un jalon post-T0 (J21/J42/J90) a réellement
  été mesuré** (booléens `mesure` de la trajectoire — un T0 confirmé seul ne
  suffit pas) ; runtime en chargement/erreur ou trajectoire illisible → statut
  « **indéterminée** », jamais une affirmation par défaut. Une **demande de
  correction patient** est signalée en permanence dans le bandeau, quelle que
  soit la phase. Erreurs du runtime (dont session expirée) **hors filtre de
  phase** ; états vides explicites en Suivi / Réévaluation sans épisode ; un
  **échec de lecture de la trajectoire** est distingué d'une absence d'épisode
  (message + « Réessayer ») sur les **deux chemins d'affichage** — onglet
  Trajectoire et phase Réévaluation du cockpit — sans jamais afficher
  « aucun épisode » sur une erreur. La **requête en vol** est elle aussi un état
  « chargement » explicite sur les deux chemins : pendant la lecture, ni le
  panneau (« aucun épisode ») ni le rail (« à ouvrir ») n'affirment quoi que ce
  soit — statut « indéterminée » jusqu'à résolution.
  Routes pleine page `.../besoins` et `.../alimentation` **conservées**
  (accès direct par URL), l'accès principal passant désormais par les onglets.
- **Finitions poste de pilotage** (PR 4, suivi de revue) : (1) l'état vide de la
  phase Réévaluation est reformulé de façon **structurelle** — l'absence de cycle
  est rattachée à l'absence d'épisode confirmé, jamais présentée comme un
  « résultat de lecture » de la trajectoire (qui n'est pas lue tant qu'aucun
  épisode n'est confirmé) ; (2) le **signal de demande de correction** (B2) est
  hissé au niveau de la fiche : il reste visible depuis **tous les onglets**
  (« 12 besoins », « Alimentation », « Trajectoire »…), plus seulement le cockpit,
  et son raccourci ramène au cockpit sur la phase Patient ; (3) **renforts de
  couverture** — clavier des onglets (focus réel via `activeElement`, Origine/Fin,
  bouclage), état Réévaluation sous erreur runtime (aucun état vide affirmé),
  `index` de trajectoire réaliste dans le stub, assertions de statut durcies.
  Pure présentation : aucune route, aucun contrat d'API, aucune logique clinique.
- Aucune logique clinique, aucun seuil, aucune migration Prisma ; garde-fous 5.0
  respectés (statut jamais par la seule couleur, aucun score patient).

### Direction UX 5.0 « poste de pilotage » + canvas mid-tone A5-R2 (2026-07-18)

- Registre : arbitrages **A5-R2** (canvas mid-tone « ardoise & sable » —
  praticien `#D3D8E6` / cartes blanches, patient `#EAE0CC` / cartes crème ;
  structure A5 conservée, aucun toggle) et **A6-R1** (poste de pilotage :
  cockpit borné à l'écran, cycle clinique en colonne vertébrale, instruments
  à tiroir, métriques actives, patient séquentiel, typographie remontée).
- `design-system-d1.md` §9 : tokens v3 + matrice de contraste A5-R2
  (AA/AAA re-vérifié ; vigilance texte muted ~4,6:1).
- Audit de conformité UX 5.0 du front praticien/patient :
  `docs/claude/campagnes/AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`.
- Proposition + maquette autonome :
  `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`.
- Alignement additif de la direction dans les `CAMPAGNE.md` du front UX
  (section « Direction UX 5.0 »).
- **Aucun changement clinique, aucun seuil, aucun code applicatif** :
  A5-R2/A6-R1 sont actés en documentation, non appliqués à `globals.css` ;
  l'implémentation est livrée par campagnes (Vague 1 sans migration).

### C5 LOT-07 — Validation, conformité et handoff (2026-07-18)

- Clôture de la tranche C5 « Boussole alimentaire » à `8/8`. Dossier de preuves
  produit : `MATRICE_CONFORMITE_ET_TESTS_C5.md`, `VALIDATION_FINALE_C5.md`,
  `DETTE_C5.md`, `HANDOFF_C5.md`, `ACTIVATION_RUNBOOK_C5.md`.
- **Trois verdicts go/no-go indépendants** : C5A GO, C5B praticien GO, C5B patient
  GO conditionnel (dettes humaines ouvertes : accessibilité, E2E boussole des trois
  fixtures, vocabulaire, revue visuelle). Aucun verdict ne masque un volet en échec.
- Matrice technique verte (type-check, lint, **573 tests**, scoring-check, prisma
  validate) ; advisors Supabase sécurité/performance sans alerte bloquante (INFO) ;
  gardes routes flag→404, ownership→403, isolation patient→404 testées.
- **Aucun changement de code, aucune migration** : LOT-07 = validation + preuves.
  Activation en production demandée par le responsable ; mécanique documentée :
  `WN_C5_ENABLED=true` dans Vercel Production + redéploiement. Rollback = flag
  `false` (non destructif, aucun DROP/DELETE).
- **Activation confirmée le 2026-07-18** : `WN_C5_ENABLED=true` défini en Vercel
  Production et redéployé (déploiement aliasé `app.wellneuro.fr`). Smoke test :
  la route boussole non authentifiée passe de `404` (flag off) à `401` (flag on)
  ⇒ C5 active en production, avec les dettes du volet patient ouvertes.

### C5 LOT-06 — Assiettes, substitutions et pont JA (2026-07-18)

- Transfert de la propriété des assiettes recommandées vers un catalogue C5B
  versionné et scellé (`c5b-plate-catalog-v1`, hashes par assiette). Aucune
  composition inventée ; `RecommendedPlateRef` optionnelle sur `TrialAction`
  (un épisode JA V1 reste lisible sans elle).
- Substitutions bornées aux familles cliniques validées avec justification
  praticien ; « aucune assiette proposée » est le défaut et la référence n'est
  jointe qu'à l'activation praticien explicite. Aucune substitution automatique.
- Pont JA en lecture seule via un contrat de faisabilité factuel
  (`ja-action-feasibility-v1`) : comptes d'observations praticien-validés,
  exposés séparément et sans altérer le profil intrinsèque C5A — aucun score,
  percentile ni recommandation. Aucun seuil de scoring modifié.
- Aucune migration Prisma ni changement de schéma (lecture du `ProtocolDraft`
  `practitioner_reviewed` existant, avec vérification d'intégrité). C5 reste
  inactive.

### C5 LOT-05 — UX patient « Jardin » (2026-07-18)

- Ajout d'une restitution Boussole strictement qualitative dans le protocole
  actif et l'espace alimentation, avec zoom profond sans nouvelle navigation.
- L'accès exige un portail authentifié, un suivi actif, la dernière version V2
  relue puis approuvée et une action alimentaire correspondant à la référence
  reconstruite depuis Ciqual. Les accès absents, caducs, révoqués ou
  inter-patient répondent par le même 404.
- La sortie patient exclut scores, percentiles, classements, poids, PRAL, hashes
  et versions internes. Les profils partiels ne sont pas diffusés, les doublons
  sont supprimés et aucune alternative n'est inventée.
- Durcissement associé de l'ownership des approbations de diffusion et de la
  détection des protocoles devenus caducs. C5 passe à 6/8 mais reste désactivée.

### C5 LOT-04 — UX praticien « Observatoire » (2026-07-18)

- Ajout d'une Boussole en lecture seule dans le cockpit praticien, sans nouvelle
  navigation : profil intrinsèque chiffré et tabulaire, PRAL, poids nominaux,
  complétude, provenance, versions, limites et manifeste des 12 vedettes hashé.
- La lecture contextuelle est bornée au fil de protocole affiché et expose la
  priorité ainsi que la version source avant toute préparation d'insertion.
- L'insertion reste doublement explicite et manuelle. La référence est
  reconstruite côté serveur depuis Ciqual 2025 et le protocole actif ; les
  références forgées, caduques, incomplètes ou liées à une autre priorité sont
  rejetées, puis le protocole V2 final est revalidé.
- Ajout des contrôles d'ownership sur la lecture et l'écriture de l'historique
  des versions de protocole. Aucune diffusion patient automatique, migration,
  import ou activation ; C5 passe à 5/8 et reste désactivée.

### C5 LOT-03 — moteurs et contrats versionnés (2026-07-18)

- Ajout des contrats C5A/C5B déterministes : profil intrinsèque chiffré,
  lecture contextuelle, référence d'action, vue patient qualitative et
  référence d'assiette, tous versionnés et hashés.
- Application du mapping clinique signé `equilibre_assiette`, du PRAL
  Remer–Manz et de la pondération 90/10 sans imputation. La distribution est
  scellée sur Ciqual 2025 V1 ; un contrôle depuis les XML officiels reproduit
  les 12 fixtures praticien signées.
- Ajout du payload protocole V2 pour les références C5, avec compatibilité V1,
  ancrage sur l'identifiant et l'empreinte du protocole source, retour en
  brouillon à chaque modification et invalidation des approbations antérieures.
- La vue patient exige un V2 réellement relu et approuvé, refuse les profils
  partiels et ne contient aucun score, pourcentage ou classement. C5 reste
  désactivée par défaut via `WN_C5_ENABLED=false` et passe à 4/8.

### C5 LOT-02 — migration du référentiel Ciqual (2026-07-18)

- Ajout du modèle PostgreSQL/Prisma `CiqualNutrientValue`, versionné par
  dataset, aliment et constituant, avec valeur exacte décimale nullable,
  statut explicite, unité, provenance et empreinte source.
- Contraintes SQL fermées pour les statuts et unités, cohérence
  valeur/statut, valeurs non négatives et unicité composite.
- Identité clinique `NeuroAxis` rendue append-only par
  `axisCode + versionMapping`; les poids se rattachent désormais à cette même
  identité versionnée.
- RLS deny-all activée sur la nouvelle table, sans policy ni privilège Data
  API pour `anon` ou `authenticated`.
- Migration confirmée sous la référence
  `C5-LOT02-MIGRATION-MC-2026-07-18-v1`, rejouée sur PostgreSQL éphémère avec
  dérive Prisma nulle, puis appliquée en production par le pipeline Vercel au
  commit `3c0019989cae3ed2b76d8b57de1a61a5a2348374`. Préflight réussi, migration
  Prisma confirmée et smoke test HTTP 200. Aucun import Ciqual ni activation C5
  dans cette étape.
- Ajout de l'importeur transactionnel Ciqual, dry-run par défaut et fail-closed,
  confirmé sous `C5-LOT02-IMPORT-MC-2026-07-18-v1`. Le dry-run officiel et le
  replay PostgreSQL éphémère produisent 55 744 lignes pour 3 484 aliments et
  16 constituants ; une seconde exécution est un no-op et une cible partielle
  est refusée. Import Production exécuté au commit
  `3de796d6996cf2278d061fb90a0bfa126e434a65` après advisors sans anomalie :
  55 744 lignes, 3 484 aliments, 16 constituants et un hash source ; RLS active,
  zéro policy et zéro grant Data API. Le déclencheur temporaire a été retiré,
  LOT-02 est terminé et C5 passe à 3/8 en restant inactive.

### C5 LOT-01 — seconde passe documentaire clinique (2026-07-18)

- Calcul reproductible du PRAL Remer–Manz sur Ciqual 2025 V1 : 2 347/3 484
  aliments complets, `p5 = -8,70089` et `p95 = 14,69258 mEq/100 g`, sans
  imputation des absences, traces ou valeurs sous limite.
- Production des vecteurs pondérés attendus de la cohorte pilote des 12
  aliments sous la référence `C5-LOT01-VECTEURS-2026-07-18-v1` : 12 noyaux
  obligatoires complets, deux profils complets et dix profils partiels.
- Sources primaires, limites d'interprétation et niveau de preuve WellNeuro B
  rattachés aux liaisons du mapping `equilibre_assiette`.
- Résultats signés le 2026-07-18 par Martial CAYRE sous la référence
  `C5-LOT01-VECTEURS-2026-07-18-v1`, identifiée par
  `fb138bd784431713c26d0e4d93053189c3359d99`. LOT-01 est terminé et C5 passe
  à 2/8 tout en restant inactive ; aucun code, score patient, migration, import
  ou activation n'est introduit.

### TRUST V1 — information patient, consentements et sécurité relationnelle (2026-07-16)

- Campagne TRUST exécutée de bout en bout (LOT-00 → LOT-07) : documents
  d'information versionnés à hash verrouillé (le consentement est enfin lié
  à son texte), séquence « Avant de commencer » (4 écrans, accusé de
  lecture distinct de toute autorisation), centre permanent « Informations,
  confidentialité et droits » accessible de toutes les pages, choix
  facultatifs append-only avec retrait aussi simple que l'accord,
  signalements structurés (effet indésirable, incident de confidentialité,
  demandes de droits), file praticien « Confiance & droits » + cartes en
  tête du Fil, notifications externes génériques.
- Migration additive `trust_v1` (5 tables append-only, RLS deny-all),
  appliquée par l'utilisateur après confirmation explicite.
- **Aucun scoring ni seuil clinique modifié.** Nouvelle règle versionnée
  `orientation-effet-indesirable v1` : aiguillage déterministe d'un message
  d'orientation sur la sévérité déclarée par le patient (aucun calcul,
  aucune causalité) — validée par le praticien en relecture de PR.
- Gates non levés documentés (juridique externe, hébergement/sécurité,
  panel humain) : `GATES_GO_NO_GO.md`, dettes datées dans `DETTE_TRUST.md`.

### Typographie display appliquée + programme « disposition 5.0 » (2026-07-15)

- Correctif A5-R1 : la classe `font-display` (Sora praticien / Bricolage
  Grotesque patient) est désormais appliquée aux titres (pages dashboard,
  fiche patient, login, portail patient) — elle était mappée mais consommée
  nulle part. Wordmark login passé de l'accent solaire (2,03:1, interdit en
  texte par la règle de relief) au primaire indigo.
- Gouvernance : décision A6 au registre — la disposition « la Spirale » 5.0
  devient la cible UX des deux fronts, livrée par campagnes
  (`docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md`) ; les cinq questions
  ouvertes du brainstorm sont arbitrées
  (`ARBITRAGES_QUESTIONS_OUVERTES.md`). Aucun changement clinique.

### DA « la Spirale » — adoption dans le design system (2026-07-15)

- Révision A5-R1 actée au registre : structure A5 conservée (tout clair,
  rail sombre signature, patient clair fixe), teintes et typographies
  évoluées. Praticien « Nuit spectrale » (indigo/menthe/solaire, Sora +
  Instrument Sans + IBM Plex Mono) ; patient « Forêt & cuivre » (forêt/
  cuivre/ivoire, Bricolage Grotesque + Albert Sans). Tokens sémantiques
  uniquement — aucun composant re-écrit pour la bascule de teintes.
- Trio catégoriel Corps/Ancrage/Esprit remappé vers menthe/indigo/solaire
  (validé accessibilité), consommé via les nouveaux tokens `--viz-*`.
- Présentation des sous-scores : nouveau composant `ScoreZones` (point sur
  zones de seuil, valeur T0 en point creux). **La logique clinique, les
  scorings et les seuils sont strictement inchangés** — les zones sont
  dérivées des bornes d'interprétation existantes, jamais ré-encodées.

### C1 — Décision clinique 21 jours V1 (2026-07-14)

- Ajout des contrats purs et versionnés `AssessmentEpisode`,
  `ClinicalSnapshot`, `ClinicalReview`, `DecisionCard`, `ProtocolDraft` et
  `PatientProtocolView`, sans persistance ni activation runtime.
- Le cockpit praticien distingue données manquantes, décision, brouillon de
  protocole, revue et validation locale pour diffusion. La charge reste
  déclarée par le praticien et n’est jamais calculée.
- La projection patient est construite par liste blanche et demeure
  `not_transmitted`. Aucun détail praticien, appel IA, API de diffusion ou
  changement de scoring n’est ajouté.
- Le verdict de campagne sépare validation technique, validation ergonomique
  humaine et capacité runtime d’activation/diffusion.

### Architecture clinique 3.2 — réconciliation WN Ultimate v2 (2026-07-13)

- Promotion documentaire des contrats `AssessmentEpisode`,
  `ClinicalSnapshot`, `DecisionCard` et `ProtocolDraft`, sans code clinique ni
  migration.
- Frontières réconciliées : C1 prépare les brouillons, C2 possède
  persistance/activation/longitudinal, JA possède le journal alimentaire,
  C5A devient intrinsèque et C5B contextuel.
- Ajout d'un registre sanitaire expurgé de 391 sources : droits à vérifier,
  revue clinique non effectuée, aucun hash ni localisateur Drive versionné,
  activation runtime interdite.
- `.wn/state.json` devient l'autorité machine des campagnes ;
  `ACTIVE_CAMPAIGN.md` est généré et aucune campagne, y compris `_prepared`,
  n'est sélectionnée implicitement.
- Aucun changement du scoring Mon équilibre, des questionnaires ou du schéma
  Prisma.

### Cache documentaire clinique V1 — préparation technique (2026-07-10)

- Découpage du prompt système de synthèse en blocs stables explicites
  (gouvernance + contrat JSON), avec versionnement applicatif explicite :
  `VERSION_PROMPT_SYNTHESE`, `VERSION_SCHEMA_SYNTHESE`, `VERSION_CORPUS_SYNTHESE`.
- Ajout d'un snapshot applicatif `corpus-clinique-v1` avec empreinte
  `SHA-256` pour traçabilité d'audit (`web/src/lib/clinical/corpusSyntheseV1.ts`).
- Garde-fou d'activation : le corpus clinique reste désactivé tant que la
  validation clinique externe n'est pas confirmée, même si le flag runtime
  d'activation est présent.
- Route synthèse enrichie sans migration Prisma : persistance des métadonnées
  prompt/corpus et des métriques cache Anthropic non sensibles dans
  `donneesEntree` (`input_tokens`, `output_tokens`,
  `cache_creation_input_tokens`, `cache_read_input_tokens`).
- Alignement UI gouvernance : la page paramètres affiche désormais la version
  de prompt réellement utilisée par la route de synthèse.
- Ajout du script `npm run prompt-cache-check` (endpoint Anthropic token
  counting) pour vérifier le seuil du modèle réel et l'état de préparation du
  préfixe stable avant activation.

### R2 — Pack « Base de consultation » finalisé + lisibilité patient (2026-07-10)

- **Constat** : le pack de base (`Pack.parDefaut`) était déjà complété en prod (2026-07-09, via l'UI praticien `PacksPanel`) avec les 4 questionnaires cibles documentés depuis le 2026-07-08 — `Q_MOD_03` (Plaintes, 5 min), `Q_MOD_01` (Mode de vie SIIN, 10 min), `Q_ALI_01` (Alimentaire SIIN, 15 min), `Q_INF_03` (DNSM, 15 min), soit ≈45 min. Anti-doublon anamnèse garanti par conception (anamnèse volontairement resserrée pour ne pas recouper ces 4 thèmes). Aucune écriture en base n'a été nécessaire pour ce lot — seule la documentation (`SESSION_LOG.md`/`roadmap.md`) était en retard sur l'état réel.
- **Ordre d'affichage déterministe** : les questionnaires d'un même pack partageaient une `dateAssignation` identique (assignation en boucle avec un seul horodatage figé dans `assignBasePack.ts`), rendant leur ordre d'affichage non garanti dans le hub. Ajout d'un tri secondaire `createdAt asc` (qui croît naturellement dans l'ordre de la boucle d'assignation) dans `api/portail/assignations` et `api/patient/assignations` — aucun changement côté assignation.
- **Durée estimée côté patient** : `AssignationPatient` expose désormais `duree` (résolue depuis `lib/questionnaires-catalog.ts`, jusqu'ici réservé au praticien). Affichée par questionnaire dans le hub, et en total pour la section « À compléter ».
- **Lisibilité mobile** : le titre de carte questionnaire (`truncate` une ligne) passe en `line-clamp-2` dans le hub — le titre DNSM (61 caractères) ne se coupe plus.
- Vérifié : `type-check` propre, `check_no_secrets` OK. Aucune migration Prisma/SQL, aucune modification de scoring clinique.

### Synthèse IA du premier bilan — enrichissement par le contexte anamnestique (2026-07-08)

- **Objectif** : la synthèse IA (`api/praticien/synthese`) ne s'appuyait que sur les scores de questionnaires. Elle exploite désormais la **fiche signalétique** et l'**anamnèse** déjà saisies via le portail patient (blobs JSON sur `Consultation`, jusqu'ici jamais relus) pour produire une synthèse mieux contextualisée. **Purement additif : aucune migration Prisma, aucune UI nouvelle.**
- **Nouveau module déterministe** `lib/consultation/contexteClinique.ts` (dans l'esprit de `lib/scoring/miniSynthese.ts`, aucune logique clinique nouvelle) :
  - `buildContexteClinique(fiche, anamnese)` → bloc texte français lisible du **cœur clinique** (motif & attentes, histoire des troubles, antécédents, IMC calculé, contexte de vie : sommeil/activité/alimentation/profession). Écarte le bruit administratif (composition du foyer, nombre d'enfants).
  - `extraireVigilanceDeterministe(anamnese)` → points de vigilance **garantis** (signaux d'alerte médicaux cochés, traitements/automédication/compléments en cours), indépendants du LLM.
- **Garde-fous cliniques** (approche déterministe + IA) : les signaux d'alerte et traitements sont fusionnés **en tête de `points_de_vigilance`** même si le LLM les omet. Le contexte est aussi injecté dans le prompt pour enrichir le raisonnement.
- **System prompt v2** (`SYSTEM_PROMPT_SYNTHESE`) : nouvelle section « Contexte anamnestique et signalétique » (motif/attentes cadrent les axes ; histoire/antécédents/contexte de vie nuancent ; signaux d'alerte → vigilance + avis médical ; médicaments/compléments → vigilance interaction **sans dosage, ajout ni arrêt**). Garde-fous déontologiques conservés. `versionPrompt`/`_schema_version` passent à `v2` ; `donneesEntree` trace désormais le contexte clinique (traçabilité).
- **Rattachement** : une seule anamnèse par patient → récupérée par `idPatient` (consultation portant `anamnese != null`, la plus récente). Dégradation gracieuse : la synthèse fonctionne avec les questionnaires seuls si aucun contexte n'est renseigné.
- **Format de sortie JSON inchangé** (`SyntheseSchema`) → `SynthesePanel` et la route booklet restent compatibles, aucune modif front. Périmètre hors lot (phase 2) : compte rendu de fin de consultation (synthèse longitudinale).

### Portail patient — token d'accès permanent & onboarding consultation (2026-07-07)

- **Objectif** : le praticien envoie au patient un lien d'accès **permanent** (révocable) ouvrant un onboarding structuré — consentement → fiche signalétique → anamnèse hiérarchisée (portant le **motif de consultation**) — au terme duquel le **pack de base par défaut** est assigné automatiquement. Reconnexion via l'email pré-enregistré par le praticien (second facteur). Aucune session NextAuth côté patient.
- **Pack de base** : le pack « Base de consultation » (prod) est marqué `par_defaut=true` ; le résolveur de `valider` prend `parDefaut` actif en priorité (repli sur le nom). *Note : ce pack ne contient que 3 questionnaires en prod à ce jour — à compléter côté praticien pour atteindre le périmètre visé.*
- **Schéma** (migration `20260707160000_patient_portail_consultations`, **appliquée en prod Supabase** + local) :
  - `Patient` : `access_token` (unique), `access_token_revoked`, `access_token_created_at` (token portail permanent, révocable).
  - `Pack` : `par_defaut` (désigne le pack de base ; un seul actif à la fois, garanti applicativement).
  - Nouveau modèle `Consultation` (`consultations`, RLS deny-all cohérent avec `enable_rls_security`) : historisable, porte statut (`creee`→`en_cours`→`validee`), motif, consentement + horodatage/version, `fiche_signaletique` (JSON), `anamnese` (JSON), `date_validation`, `id_pack_assigne`.
- **Fondations** (`lib/consultation/`) : `motifs.ts` (liste enrichable des grandes catégories d'intervention), `fiche.ts` / `anamnese.ts` (structures + normalisation défensive), `portail.ts` (résolution token+email partagée, `CONSENTEMENT_VERSION`), `email.ts` (lien portail best-effort SMTP), `assignBasePack.ts` (fan-out pack → assignations avec consentement pré-donné). `createPublicId` accepte `'CONS'` et `'TOK'`.
- **Anamnèse resserrée** (adaptée neuronutrition) : volontairement non redondante avec le pack de base (qui score déjà plaintes/douleurs, mode de vie, alimentaire, DNSM). Ne garde que repères corporels, motif & attentes, histoire des troubles, signaux d'alerte, antécédents, et **traitements/compléments en saisie répétable** (plusieurs médicaments/compléments). Champs `text`/`textarea`/`radio`/`checkbox-multi` + groupes répétables. L'exploitation praticien (axes, biologie, phases 21 j) reste hors périmètre patient.
- **API praticien** : `api/praticien/token` (POST émettre/renvoyer, DELETE révoquer), `api/praticien/consultations` (POST créer une consultation + assurer le token + envoyer le lien, GET historique) ; `api/praticien/packs` PATCH accepte `parDefaut` (démarque les autres).
- **API portail** (token+email, sans session) : `api/portail/{session,consentement,fiche,valider}`. `valider` enregistre l'anamnèse, résout le pack de base (`parDefaut` actif, repli sur le nom « BASE DE CONSULTATION ») et assigne le pack.
- **UI** : nouvelle route `portail/[token]` (state machine gate→consent→fiche→anamnèse→terminé, formulaires dédiés) + `portail/layout.tsx`. Côté praticien, `PatientsPanel` gagne une carte « Consultation & accès patient » (créer/envoyer, renvoyer, révoquer) ; `PacksPanel` un bouton « Définir par défaut » + badge « Pack de base ». Le flux `/patient/[idAssignation]` existant est inchangé.
- Vérifié : `type-check` propre (périmètre feature), routes compilées, endpoints portail/praticien testés au runtime (validation, auth token+email, résolution DB). Parcours « happy-path » (création des assignations) non rejoué en base partagée pour ne pas écrire de données ni toucher le pack de base réel — logique factorisée depuis `packs/assign` déjà éprouvé.

### Refonte UX praticien — lots A→D (2026-07-07)

- **Lot A — Dashboard (`dashboard/page.tsx`)** : suppression du bloc statique « Feuille de route migration » (Lot 0→C5, tout coché, devenu mort) ; ajout de « Accès rapides » (cartes-liens vers Patients / Synthèse IA / Paramètres) et « Patients à traiter » (liste courte des questionnaires en attente, statut ≠ « Complété », dérivée de l'API `praticien/patients` — nouveau composant client `PatientsATraiter`). Aucun changement d'API ni de schéma.
- **Lot B — Filtre catégorie à l'assignation (`PatientsPanel.tsx`)** : `<select>` « catégorie » (valeurs distinctes de `questionnaires[].categorie`, tri FR) devant le sélecteur de questionnaire du formulaire « Nouvelle assignation ». Filtrage côté client ; « Toutes les catégories » par défaut ; réinitialisation du questionnaire sélectionné au changement de catégorie.
- **Lot C — Vue d'ensemble équilibre sur la fiche patient (`FichePatientPanel.tsx`)** : section « Vue d'ensemble de l'équilibre » rendant `CerclesConcentriques` (3 anneaux Corps/Ancrage/Esprit) à partir des 12 besoins déjà chargés. La route `api/praticien/equilibre` expose désormais `strate` sur `PrioriteBesoin` (dérivée de `BESOINS`, aucun calcul/seuil clinique modifié) — évite un second appel réseau. Les 5 objets cliniques restent en place.
- **Lot D — Packs de questionnaires éditables** : portage du modèle « Packs » du GAS legacy vers Next.js/Prisma.
  - Nouveau modèle Prisma `Pack` (`id_pack`, `nom`, `thematique`, `description`, `qids String[]`, `actif`, timestamps) + migration `20260707150000_add_pack_model` (table `packs` + RLS deny-all, cohérent avec `enable_rls_security`). **Migration appliquée en prod Supabase.**
  - Nouvelles routes API `api/praticien/packs` (CRUD : liste, création, mise à jour, désactivation soft `actif=false`) et `api/praticien/packs/assign` (assignation groupée : N assignations depuis un pack, statut « En attente », notes par défaut « Pack &lt;nom&gt; », + un seul email récapitulatif best-effort).
  - Nouveau composant `PacksPanel.tsx` (création avec sélection de questionnaires filtrée par catégorie, liste + désactivation, assignation à un patient) monté dans `PatientsPanel`. `createPublicId` accepte désormais le préfixe `'PACK'`.
- Livré en 4 PR séparées (#26–#29), mergées sur `main` et déployées en prod ; contrôle visuel praticien validé.

### Écran patient « Mon équilibre » (2026-07-07)

- Le portail patient (`patient/[idAssignation]`) gagne deux nouveaux écrans dans son parcours existant (pas de nouvelle authentification, pas de nouvelle route Next) : accessibles via un bouton "Voir Mon équilibre" depuis l'écran de consultation (réponses verrouillées).
  - **Mon équilibre** (`MonEquilibreAccueil.tsx`) : indicateur circulaire (indice global), tendance de momentum (hausse/stable/baisse — jamais le delta chiffré ni les niveaux de preuve, réservés praticien), frise de trajectoire, 2-3 priorités en langage patient (`libellePatient`, jamais de jargon clinique).
  - **Mes 12 besoins** (`MonEquilibreDetail.tsx`) : réutilise `CerclesConcentriques` en mode patient (légende simplifiée par strate, sans niveau de preuve).
- Nouvelle route API `api/patient/equilibre?id=&email=` (même vérification d'accès que `api/patient/reponses`) : expose uniquement des données patient-safe.
- Dette signalée, hors périmètre de ce lot : le reste du portail patient (`EmailGate`, `ConsentScreen`, `GenericQuestionnaire`) reste en Tailwind bleu en dur, pas encore migré vers les tokens D1 — ces deux nouveaux écrans sont les premiers du portail patient à les utiliser.

### Nettoyage dashboard praticien — D1 (2026-07-07)

- `dashboard/page.tsx` : suppression de la bannière "Migration en cours" (renvoyant vers l'app Apps Script décommissionnée le 2026-07-03) et de la checklist associée devenue obsolète ; "Lot C5 — Décommission Apps Script" passe à fait.
- `SynthesePanel.tsx` migré vers les tokens sémantiques du design system D1 (`bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`) — dernier composant praticien encore sur l'ancien theming Tailwind en dur.

### Détail des 12 besoins praticien (2026-07-07)

- Nouvelle route `dashboard/patients/[idPatient]/besoins`, liée depuis la fiche patient : radar de synthèse (`ScoreRadar`) et liste à plat des 12 besoins côte à côte (pas de drill-down), badge de niveau de preuve A/B/C/D ou "non mesuré", info-bulle listant les questionnaires sources. Classification domino non affichée (réservée au moteur de priorisation interne).
- Nouvelle route API `api/praticien/besoins?idPatient=`.
- Nouveau composant `CerclesConcentriques.tsx` (SVG, repli 2D des trois sphères prévues pour l'écran patient) : 3 anneaux colorés par strate (teal Corps, violet Ancrage, or Esprit), intensité de couleur = couverture, jamais de rouge/gris/noir. Pas encore consommé dans cette PR (préparatoire pour l'écran patient "Mon équilibre").
- Nouveau token de palette `--violet-600`/`--violet-300` (`globals.css`, `tailwind.config.ts`) pour la strate Ancrage — seule strate sans couleur dédiée jusqu'ici (teal/or déjà utilisés).
- Vérifié de bout en bout contre la base de dev locale (Sophie Nicola).

### Fiche patient praticien — Cartographie neuro-fonctionnelle (2026-07-07)

- Nouvelle route `dashboard/patients/[idPatient]` : fiche patient dédiée avec les 5 objets cliniques (indice global, stabilité métabolique, réserve d'adaptation, clarté, momentum) et la liste des priorités des 21 prochains jours (12 besoins triés par couverture croissante, badge de niveau de preuve A/B/C/D ou "non mesuré", légende).
- Nouvelle route API `api/praticien/equilibre?idPatient=` (authentifiée) exposant ces données, calculées via le moteur d'équilibre (Lots précédents) + l'adaptateur Prisma.
- Le bouton "Résultats" (panneau inline) de la liste patients est remplacé par un lien "Fiche patient" vers cette nouvelle page. Le tableau détaillé des réponses (certification, réponses manquantes/non applicables) et le déblocage des demandes de modification, auparavant inline dans `PatientsPanel`, sont déplacés tels quels dans la fiche patient — aucune fonctionnalité perdue.
- Vérifié de bout en bout contre la base de développement locale (patiente fictive Sophie Nicola, réponse de test ajoutée puis supprimée) : les questionnaires seedés sans `rawAnswers` restent non mesurés, comme attendu.

### Moteur équilibre — adaptateur Prisma (2026-07-07)

- `web/src/lib/equilibre/depuisPrisma.ts` : reconstruit les réponses par questionnaire d'un patient (`ReponsesParQuestionnaire`) à partir des lignes `QuestionnaireReponse` (Prisma), en dédoublonnant par `idQuestionnaire` (dernière réponse retenue) et en n'utilisant que les réponses brutes exploitables (`scoresJson.rawAnswers`, cf. `api/patient/submit`) — les réponses sans `rawAnswers` (données antérieures à ce chantier, déjà agrégées) sont ignorées plutôt que recalculées.
- `construireHistoriqueEquilibre` : historique borné aux 4 jalons T0/J21/J42/J90 pour le suivi momentum, consommable par `resoudreLectureJalon`/`calculerDeltaMomentum`. Convention actée pour `dateT0` (absente du schéma Prisma) : date de la toute première réponse du patient.
- `scripts/check_no_secrets.sh` : suppression du garde-fou "email non autorisé" — devenu obsolète depuis l'implémentation du passage en emails patients réels avec consentement (R8-lite). Les autres vérifications (clés API, secrets, SHEET_ID) restent inchangées.

### Lot 7 — Découpage du catalogue par domaine (2026-07-06)

- Amorce du refactor de `web/src/lib/questions.ts` : les jeux d'options standards (`O_*`) et les fabriques d'items (`q`/`qn`/`qs`) sont déplacés dans `web/src/lib/questionnaires/shared.ts` et importés par `questions.ts`.
- Extraction de la première catégorie complète, **Cancérologie**, dans `web/src/lib/questionnaires/cancerologie.ts` : `Q_CAN_01` (QLQ-C30) et `Q_CAN_02` (QLQ-BR23) sont désormais des `export const` référencés par le catalogue via l'import. `web/src/lib/questionnaires/index.ts` sert de point d'entrée par domaine.
- Aucune modification clinique : copie **byte-fidèle** des définitions (items, options, conditionnels, scoring `sum_items`, seuils, notes, métadonnées `certification`). `QUESTIONNAIRE_CATALOGUE` reste exporté à l'identique depuis `questions.ts` (mêmes 63 entrées, mêmes IDs, même ordre).
- `scripts/check_questionnaire_certification.js` : le loader « inline » désormais les imports relatifs locaux (`./questionnaires/*`) avant l'eval, pour continuer à valider le catalogue découpé sans dépendance à un bundler.
- Extension du Lot 7 à toutes les catégories : les 63 `Q_*` sont désormais extraits dans des modules de domaine (`web/src/lib/questionnaires/*.ts`) et `web/src/lib/questions.ts` ne conserve plus que l'assemblage du catalogue + le moteur de scoring.
- `web/src/lib/questionnaires/index.ts` centralise les réexports de tous les domaines, et `scripts/check_questionnaire_certification.js` suit aussi les `export ... from` locaux pour continuer à valider le catalogue modulaire sans régression.

### E0 — Route questionnaires sans Google Sheets (2026-07-06)

- `api/praticien/questionnaires` ne lit plus l'API Google Sheets (`Questionnaires!A:F` via `SHEET_ID` + token OAuth) : la liste est désormais servie depuis un catalogue statique en code, `web/src/lib/questionnaires-catalog.ts`.
- Le catalogue porte à l'identique les 59 entrées (58 actives, `Q_FIB_03` inactif) qui étaient écrites dans l'onglet Sheets par `initCatalogue()` du code GAS archivé : mêmes id, titres affichés, catégories, durées et ordre. Comportement du sélecteur praticien inchangé.
- Aucune modification clinique (ni scoring, ni seuils). Les entrées héritées `Q_SOM_08` et `Q_STR_07` (remplacées dans le catalogue de scoring par `Q_NEU_12` et `Q_NEU_11`) sont conservées telles quelles pour préserver la liste offerte ; leur recuration reste une tâche clinique séparée.

### Schéma V1 — Moteur d'intention clinique (2026-07-06)

- Ajout de 10 tables de référentiel clinique dans `schema.prisma` : `clinical_intent_tags`, `clinical_criteria`, `functional_categories`, `clinical_rules` (versionné, mapping direct 1 ingrédient), `ingredient_functional_thresholds`, `protocol_review_flags` (avec traçabilité d'override praticien), et le squelette minimal `supplement_ingredients`/`supplement_ingredient_formes`/`supplement_source_references`/`supplement_safety_alerts`.
- Aucune donnée de production affectée : migration purement additive (nouvelles tables), aucune table existante modifiée.
- Contexte, décisions d'audit (11 points) et périmètre V1/V2 documentés dans `docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md`.
- Pipeline de résolution des règles (parsing LLM, moteur de décision) non implémenté à ce stade — schéma de données uniquement.

### Certification questionnaires et scorings (2026-07-06)

- Passe Drive 2026-07-07 neuro-psychologie aidants : certification de `Q_NEU_09` Zarit ; alignement sur les 22 items Drive `Q001` à `Q022`, échelle 0-4 et seuils de fardeau 0-20 / 21-40 / 41-60 / 61-88.
- Passe Drive 2026-07-07 neuro-psychologie addictions : certification de `Q_NEU_07` AUDIT alcool ; alignement sur les IDs Drive `Q001` à `Q010`, options `0/2/4` pour Q009-Q010, score 0-40 et seuils différenciés femme/homme testés.
- Passe Drive 2026-07-07 stress complémentaire : certification de `Q_STR_06` Karasek et `Q_STR_08` WART ; alignement strict sur les IDs Drive `Q001`..., formules Karasek avec items inversés, Job strain/Isostrain, et seuils WART 25-54 / 55-69 / 70-100.
- Passe Drive 2026-07-07 catégorisation : suppression de la catégorie Inflammation au profit de Neuro-psychologie, maintien de Stress comme catégorie autonome (`Q_STR_*`), AUDIT alcool conservé uniquement en Neuro-psychologie (`Q_NEU_07`), et remplacement de `Q_MOD_03` par Plaintes actuelles / troubles ressentis depuis le MD Drive, avec scoring descriptif 7-70 et fixture certifiée.
- Passe Drive 2026-07-07 neuro-psychologie : certification de `Q_NEU_01` BDI et `Q_NEU_11` HAD ; alignement des libellés HAD divergents, métadonnées `certification` et fixtures min/max ajoutées, avec rattachement documenté du score BDI 0 au premier seuil Drive.
- Passe Drive 2026-07-07 neuro-psychologie complémentaire : certification de `Q_NEU_02` MADRS, `Q_NEU_05` UPPS, `Q_NEU_10` Dépendance à Internet et `Q_NEU_12` IDTAS-AE ; alignement strict sur les IDs Drive `Q001`..., seuils MADRS 0-6/8-18/20-35/36-60 (scores 7 et 19 non classés par la source), sous-échelles et items renversés UPPS conformes à la cotation professionnelle Drive (sans seuil clinique, absent de la source), et réordonnancement des items Poids/Appétit/Énergie de la partie 2 IDTAS-AE. Correction technique associée : les moteurs de scoring `upps` et `idtas_ae` ne propageaient pas les métadonnées `certification`/`note` vers le résultat, désormais alignés sur les autres types de scoring.
- Source de vérité de cette passe : fichiers `.md` du dossier Google Drive `QUESTIONNAIRES MD`, hors `00_index_*`. Les versions officielles externes ne priment pas sur Drive dans cette certification.
- Ajout de `docs/questionnaires-drive-mapping.md` : table de mapping `Q_*` ↔ MD Drive, avec statuts explicites pour les bonus, doublons, historiques ou absents Drive.
- `Q_NEU_03` : restauration du SIGH-SAD-SA Drive complet, 25 questions, groupes A/B et règle spéciale Q15-Q17. Ajout du moteur `sigh_sad_sa` avec score groupe A, score groupe B, total et note source.
- `Q_CAN_01` / `Q_CAN_02` : retour au scoring brut indiqué par les MD Drive (`sum_items`) au lieu de la transformation externe EORTC 0-100. Les seuils incohérents présents dans les MD restent documentés en note, sans correction clinique externe.
- `Q_CAN_02` : les conditionnels Drive Q005/Q016 sont retournés en `notApplicable` quand masqués, la source ne précisant pas de cotation stricte.
- `Q_PED_03` : alignement sur le MD Drive Conners 3 Parent, 108 items scorés cotés 0-3 et somme brute 0-324. Les deux questions ouvertes source restent documentées en note, non codées dans le catalogue faute de support UI texte.
- Ajout du moteur générique `sum_items` pour les sommes brutes sur sous-ensembles d'items, avec `missing`, `missingIds`, `notApplicable`, `note` et interprétation optionnelle.
- Enrichissement de la matrice `docs/questionnaires-drive-mapping.md` : statuts séparés items/options/conditionnels/scoring/interprétation/tests pour tous les `Q_*`.
- Ajout du contrat cible `ScoreResultBase` dans `web/src/lib/scoring/types.ts` et de métadonnées `certification` non cassantes sur les scores Drive fraîchement certifiés.
- Ajout de `npm run scoring-check` : vérification de couverture de la matrice, types de scoring connus et fixtures min/max/médian/conditionnels des questionnaires certifiés.
- Portail praticien : affichage non cassant des badges de certification, réponses manquantes, items non applicables et notes de scoring quand ces champs existent dans `scoresJson`.
- Lot 6 gouvernance : ajout de `docs/gouvernance-questionnaires-scoring.md` et durcissement des règles `AGENTS.md` pour imposer changelog + matrice + fixture lors des modifications cliniques.
- Lot 8 contrôles : `scoring-check` parse désormais la matrice, valide les statuts, impose les fixtures certifiées, vérifie les types de scoring connus et smoke-teste tout le catalogue contre les `NaN`/`Infinity`.
- `npm run setup:check` lance maintenant aussi `npm run scoring-check`.
- Passe Drive 2026-07-07 : certification sans changement de libellés ni seuils de `Q_STR_05`, `Q_NEU_04`, `Q_INF_01`, `Q_INF_02`, `Q_INF_03`, `Q_SOM_05`, `Q_PED_01` et `Q_GEO_02`; ajout des métadonnées `certification` et fixtures min/max associées.
- Passe Drive 2026-07-07 complémentaire : certification de `Q_INF_04`, `Q_INF_05` et `Q_NEU_08`; alignement des options auto-anxiété sur l'échelle Drive, des réponses ECAB sur `Faux`/`Vrai`, et du libellé complet HIT-6 Q2.
- Passe Drive 2026-07-07 tabacologie : certification de `Q_TAB_02` et `Q_TAB_05`; alignement Fagerström sur les libellés/options Drive et remise dans l'ordre Drive des items de manque Di Franza/HONC.
- Passe Drive 2026-07-07 tabacologie/pneumologie : certification de `Q_TAB_01` et `Q_PNE_01`; alignement motivation arrêt tabac sur Drive et remplacement du scoring BPCO à seuils locaux par les sous-scores Drive à suivre dans le temps.
- Passe Drive 2026-07-07 sommeil : certification de `Q_SOM_02` et `Q_SOM_06`; alignement Epworth/Pichot sur les libellés, options et seuils Drive, avec interprétation Epworth marquée ambiguë pour les scores non classés par la source.
- Passe Drive 2026-07-07 gastro-entérologie : certification de `Q_GAS_01` et `Q_GAS_02`; alignement TFD sur les 31 libellés/options Drive, correction du Score de Francis sur la formule Drive et maintien de l'ambiguïté TFD pour les seuils frontières non couverts par la source.
- Passe Drive 2026-07-07 fibromyalgie : certification ambiguë de `Q_FIB_02`; alignement QIF sur les sous-items/options Drive et conservation des ambiguïtés source sur le maximum 100/107 et la tranche 1-34 non interprétée.
- Passe Drive 2026-07-07 fibromyalgie complémentaire : certification de `Q_FIB_01` FiRST et documentation testée de l'ambiguïté `Q_FIB_03` ELFE, le catalogue local ne couvrant qu'un sous-ensemble de la fiche praticien Drive et aucun score automatique.
- Passe Drive 2026-07-07 urologie : certification ambiguë de `Q_URO_01` IPSS en conservant la cotation Drive atypique de Q002, et certification non scorée de `Q_URO_02` Catalogue mictionnel comme journal 3 jours.
- Passe Drive 2026-07-07 gérontologie : certification de `Q_GEO_01` Tinetti sur la source Drive présente, avec sous-scores équilibre /16 et marche /12, score total /28 et libellés d'observation alignés.
- Passe Drive 2026-07-07 stress : certification de `Q_STR_01`, `Q_STR_02` PSS, `Q_STR_03` Cungi et `Q_STR_04` DASS-21 ; alignement Stress SIIN sur les libellés Drive avec harmonisation documentée des seuils 4 et 15, alignement PSS sur la cotation Drive 1-5 / 5-1, alignement strict des libellés Cungi, retour DASS-21 aux IDs Drive `Q001` à `Q021` et aux sous-scores bruts 0-21, avec rattachement documenté des bornes très sévères non explicites.

### Lot C5 — Décommission GAS (2026-07-03)

- Migration historique des données Google Sheets → Supabase exécutée en production (patients, assignations, réponses).
- Suppression du déclencheur `sendReminders` et retrait du déploiement web côté Apps Script.
- Archivage de `src/gas/` dans `archive/gas-legacy/`, suppression des artefacts clasp restants (`deploy.sh`, `.clasp.json`).
- `app.wellneuro.fr` (Next.js) devient l'unique point d'entrée applicatif ; le MVP GAS est hors service.
- Dette technique restante documentée dans `docs/roadmap.md` : plusieurs routes praticien lisent/écrivent encore directement Google Sheets en parallèle de PostgreSQL.

### Phase 4 — Dashboard ops praticien (2026-06-28)

- Carte « Suivi opérationnel » dans la vue praticien avec compteurs : synthèses IA, validées/corrigées, booklets envoyés, erreurs audit.
- Dernière activité affichée (date dernière synthèse et dernier booklet).
- Tableau historique récent (20 derniers événements, triés par date).
- Filtre temporel : 7 jours, 30 jours, tout — met à jour compteurs et historique.
- Aucune modification de la logique clinique ou des seuils de scoring.

### Phase 3 — Booklet patient (2026-06-28)

- Génération du booklet HTML patient à partir d'une synthèse IA validée.
- Prévisualisation du booklet dans l'interface praticien (iframe).
- Impression / export PDF navigateur.
- Envoi manuel par email avec confirmation explicite de relecture.
- Protection anti-double envoi avec confirmation renforcée pour le renvoi.
- Audit des envois dans la feuille `Booklet_Envois` (email masqué, statut, opération).
- Validation de contenu minimum (narratif, axes ou points de vigilance) avant génération.
- Date du document basée sur la date de validation praticien.
- Ajout du prompt `prompts/generation_bilan_pdf.md` (cadre éditorial booklet).
- Ajout du mini-corpus `prompts/siin_mini_corpus.md`.

### Phase 2 — Synthèse IA praticien (2026-06-28)

- Génération de synthèse IA clinique via l'API Claude (UrlFetchApp).
- Stockage des synthèses dans `Syntheses_IA`, audit dans `Audit_Syntheses_IA`.
- Validation du schéma JSON avec valeurs par défaut pour les champs manquants.
- Détection de troncature (max_tokens) et erreurs API.
- Workflow praticien : générer, afficher, valider, rejeter, régénérer, noter.
- Sécurité : pas de log partiel de clé API, masquage emails/URLs/IDs dans l'audit.
- Protection XSS dans le rendu HTML (listes, questionnaires, résultats, synthèses).

### Phase 1 — MVP GAS (2026-06)

- Initialisation de la structure GitHub du MVP GAS.
- Ajout des fichiers de sécurité, documentation et workflow clasp.
- Catalogue de 50+ questionnaires SIIN.
- Système de packs et assignation par email.
- Moteur de questionnaires dynamiques avec scoring.
- Interface patient et praticien.
- Rappels pré-consultation automatiques.
- Migration emails vers wellneuro.fr.
