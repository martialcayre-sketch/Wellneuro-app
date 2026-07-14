# Inventaire UX des 63 questionnaires

_Généré depuis le catalogue clinique par `scripts/qx-questionnaire-inventory.mjs`. Cet inventaire ne constitue pas une certification clinique._

Règle générale : administration `strict`, ordre des items et options `fixed`. `shuffle_nominal` reste uniquement spécifié et n'est jamais exécuté.

| ID | Titre | Items | Sections | Types | Certification catalogue | Administration | Ordre | Renderer cible | Gate |
|---|---|---:|---:|---|---|---|---|---|---|
| Q_ALI_01 | Questionnaire alimentaire SIIN | 14 | 4 | likert, select | non_certifié | strict | fixed | guided_sections | bloqué — certification + fixture |
| Q_ALI_02 | Score d'adhérence à la diète méditerranéenne SIIN | 14 | 6 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_ALI_03 | Évaluation des apports caloriques et protéiques — Méthode Monnier | 10 | 4 | select | non_certifié | strict | fixed | compact_repeated_scale | candidat — certification requise |
| Q_CAN_01 | Questionnaire QLQ-C30 | 30 | 3 | likert, select | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_CAN_02 | Questionnaire QLQ-BR23 | 23 | 3 | likert | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_CAR_01 | Questionnaire cardio-métabolique SIIN | 16 | 3 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_FIB_01 | FiRST — Fibromyalgia Rapid Screening Tool | 6 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_FIB_02 | QIF — Questionnaire d'impact de la fibromyalgie | 20 | 2 | likert, number | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_FIB_03 | ELFE — Évaluation des points douloureux fibromyalgiques (professionnel) | 12 | 3 | likert, select | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_GAS_01 | TFD SIIN 2021 — Troubles fonctionnels digestifs | 31 | 5 | likert | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_GAS_02 | Score de Francis — Syndrome de l'intestin irritable | 7 | 1 | number, select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_GAS_03 | Échelle de Bristol — Type de selles | 1 | 1 | bristol | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_GEO_01 | Grille de Tinetti — Évaluation de l'équilibre et de la marche | 20 | 2 | select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_GEO_02 | SARC-F — Dépistage de la sarcopénie | 5 | 1 | select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_GEO_03 | AQ — Questionnaire Alzheimer (Sabbagh 2010) | 21 | 1 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_GEO_04 | MMSE — Mini Mental State Examination (GRECO) | 30 | 6 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_GEO_05 | QDRS — Quick Dementia Rating System (Galvin 2015) | 10 | 1 | select | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_GEO_06 | Test des 5 mots — Dubois (rappel en 2 phases) | 10 | 2 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_INF_01 | Questionnaire d'hyperexcitabilité SIIN | 24 | 3 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_INF_02 | Questionnaire de dépistage magnésium / spasmophilie SIIN | 13 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_INF_03 | DNST SIIN — Dopamine, Noradrénaline, Sérotonine, Mélatonine | 40 | 4 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_INF_04 | HIT-6 — Test d'impact des céphalées | 6 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_INF_05 | Auto-évaluation de l'anxiété | 11 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_MOD_01 | Questionnaire contextuel de mode de vie SIIN | 37 | 7 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_MOD_02 | Activité et dépense énergétique globale SIIN | 2 | 1 | select | non_certifié | strict | fixed | focus | bloqué — certification + fixture |
| Q_MOD_03 | Mes plaintes actuelles et troubles ressentis | 7 | 1 | number | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_01 | BDI — Inventaire de dépression de Beck (13 items) | 13 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_02 | MADRS — Échelle de dépression de Montgomery et Åsberg | 10 | 1 | select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_03 | SIGH-SAD-SA — Auto-évaluation humeur saisonnière | 25 | 1 | select | certifie | strict | fixed | micro_batch | autorisé — certifié |
| Q_NEU_04 | SCOFF — Dépistage des troubles du comportement alimentaire | 5 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_05 | UPPS — Questionnaire d'impulsivité | 45 | 5 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_06 | Questionnaire cognitif SIIN — Évaluation fonctionnelle | 10 | 3 | select | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_07 | AUDIT — Alcohol Use Disorders Identification Test | 10 | 3 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_08 | ECAB — Dépendance cognitive aux benzodiazépines | 10 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_09 | Échelle de Zarit — Fardeau de l’aidant | 22 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_10 | Dépendance à Internet | 20 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_11 | HAD — Échelle Hospitalière Anxiété-Dépression | 14 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_NEU_12 | IDTAS-AE — Inventaire Diagnostique des Troubles Affectifs Saisonniers (auto-évaluation) | 48 | 5 | likert, number, select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_PED_01 | Échelle de Matinalité-Vespéralité Enfant — Dr Caci | 10 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_PED_02 | Échelle de Conners — Version Enseignant (TDAH, forme courte) | 28 | 4 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_PED_03 | Échelle d'évaluation Conners 3 pour le parent | 108 | 3 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_PNE_01 | Questionnaire de qualité de vie BPCO | 11 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_01 | PSQI — Index de qualité du sommeil de Pittsburgh | 18 | 3 | likert, number, select | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_02 | Échelle de somnolence d'Epworth | 8 | 1 | likert | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_03 | Questionnaire de Berlin — Dépistage apnée du sommeil | 9 | 3 | likert, number, select | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_04 | IRLS — Syndrome des jambes sans repos (Échelle internationale) | 10 | 1 | select | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_05 | Questionnaire de Matinalité-Vespéralité de Horne & Östberg (MEQ) | 19 | 1 | select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_06 | Questionnaire de Pichot — Fatigue | 8 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_SOM_07 | MFI-20 — Inventaire multidimensionnel de la fatigue | 20 | 2 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_STR_01 | Questionnaire de stress SIIN | 21 | 3 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_STR_02 | Échelle de stress perçu (PSS-10) | 10 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_STR_03 | Questionnaire de stress de Cungi | 11 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_STR_04 | DASS-21 — Dépression, Anxiété, Stress | 21 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_STR_05 | BMS-10 — Burnout Mesure Short | 10 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_STR_06 | Questionnaire de Karasek — Stress professionnel | 32 | 4 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_STR_08 | WART — Work Addiction Risk Test (Test de risque d'addiction au travail) | 25 | 1 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_TAB_01 | Test de motivation à l'arrêt du tabac — Lagrue & Légeron | 4 | 1 | select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_TAB_02 | Test de dépendance à la nicotine — Fagerström | 6 | 1 | likert, select | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_TAB_03 | QCT2 de Gilliard — Comportement tabagique (4 dimensions) | 28 | 4 | likert | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_TAB_04 | Questionnaire d'évaluation de la consommation de cannabis | 16 | 4 | likert, select | non_certifié | strict | fixed | standard | politique stricte par défaut |
| Q_TAB_05 | Di Franza — Dépendance à la nicotine chez l'adolescent (HONC) | 10 | 2 | likert | certifie | strict | fixed | standard | politique stricte par défaut |
| Q_URO_01 | IPSS — Score International des Symptômes Prostatiques | 8 | 2 | select | ambigu | strict | fixed | standard | politique stricte par défaut |
| Q_URO_02 | Catalogue Mictionnel — CHU de Nice | 6 | 3 | number | certifie | strict | fixed | standard | politique stricte par défaut |
