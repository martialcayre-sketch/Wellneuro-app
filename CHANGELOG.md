# Changelog

Toutes les évolutions notables du MVP Wellneuro NNPP2 doivent être documentées ici.

## Non publié

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
