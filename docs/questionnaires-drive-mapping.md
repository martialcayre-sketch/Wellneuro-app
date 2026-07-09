# Matrice de certification questionnaires code ↔ sources MD Drive

Date d'audit : 2026-07-06.

Source de vérité de cette passe : fichiers `.md` du dossier Google Drive `QUESTIONNAIRES MD`, hors `00_index_*`. Les versions officielles externes ne priment pas sur Drive ici ; elles restent seulement des points de vigilance quand la source Drive les mentionne ou les contredit.

## Codes de statut

| Code | Sens |
|---|---|
| `certifié` | Vérifié contre le MD Drive et couvert par fixture automatisée quand le scoring est concerné. |
| `mappé` | Source MD identifiée, audit détaillé à poursuivre. |
| `ambigu` | Source Drive conservée mais contient une incohérence ou une règle incomplète. |
| `n/a` | Non applicable pour ce questionnaire ou cette source. |
| `absent Drive` | Aucun MD Drive équivalent identifié dans cette passe. |
| `historique` | Questionnaire conservé pour compatibilité, non certifié Drive. |
| `doublon` | Source ou questionnaire fonctionnellement doublonné, pas de création automatique. |

## Matrice catalogue

| ID code | Source MD Drive | Items | Options | Conditionnels | Scoring | Interprétation | Tests | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `Q_STR_01` | `questionnaire_stress_siin.md` | certifié | certifié | n/a | certifié | certifié | certifié | Stress SIIN, 21 items, score 0-42 ; seuils Drive 4 et 15 harmonisés sans trou automatique |
| `Q_STR_02` | `questionnaire_stress_cohen_pss.md` | certifié | certifié | n/a | certifié | certifié | certifié | PSS, 10 items, score 10-50 ; score 27 rattaché au seuil haut pour couvrir la borne Drive non explicite |
| `Q_STR_03` | `questionnaire_stress_cungi.md` | certifié | certifié | n/a | certifié | certifié | certifié | Cungi, 11 items, score interne professionnel 0-55 |
| `Q_STR_04` | `questionnaire_stress_dass21.md` | certifié | certifié | n/a | certifié | certifié | certifié | DASS-21, 21 items, sous-scores bruts 0-21 ; seuils Drive 14/10/17 harmonisés en très sévère |
| `Q_STR_05` | `questionnaire_stress_bms_burnout.md` | certifié | certifié | n/a | certifié | certifié | certifié | BMS, 10 items, moyenne 1-7 et score brut 10-70 |
| `Q_STR_06` | `questionnaire_stress_karasek.md` | certifié | certifié | n/a | certifié | ambigu | certifié | Karasek, 32 items Q001-Q032, formules Drive avec inversions ; seuil latitude 70/72 conservé en note, Job strain sur <72 |
| `Q_STR_08` | `questionnaire_wart_addiction_travail.md` | certifié | certifié | n/a | certifié | certifié | certifié | WART, 25 items, score 25-100, seuils 25-54 / 55-69 / 70-100 |
| `Q_NEU_01` | `bdi_echelle_de_depression_de_beck.md` | certifié | certifié | n/a | certifié | certifié | certifié | BDI, 13 items, score 0-39 ; score 0 rattaché au premier seuil Drive 1-10 |
| `Q_NEU_02` | `madrs_echelle_depression.md` | certifié | certifié | n/a | certifié | ambigu | certifié | MADRS, 10 items Q001-Q010, score 0-60 ; scores 7 et 19 non classés par la grille source |
| `Q_NEU_03` | `questionnaire_sigh_sad_sa.md` | certifié | certifié | n/a | certifié | n/a | certifié | 25 items, groupes A/B, règle Q15-Q17 Drive |
| `Q_NEU_04` | `questionnaire_scoff.md` | certifié | certifié | n/a | certifié | certifié | certifié | SCOFF, 5 items oui/non, seuil positif ≥ 2 |
| `Q_NEU_05` | `questionnaire_upps_impulsivite.md` | certifié | certifié | n/a | certifié | n/a | certifié | UPPS, 45 items Q001-Q045, 4 sous-échelles avec items renversés ; aucun seuil clinique fourni par la source |
| `Q_NEU_06` | aucun MD Drive équivalent identifié | historique | historique | n/a | historique | historique | à faire | Questionnaire cognitif SIIN, absent Drive |
| `Q_NEU_07` | `questionnaire_audit_alcool.md` | certifié | certifié | n/a | certifié | certifié | certifié | AUDIT alcool, 10 items Q001-Q010, score 0-40, seuils différenciés femme/homme |
| `Q_NEU_08` | `ecab_echelle_cognitive_attachement_benzodiazepines.md` | certifié | certifié | n/a | certifié | certifié | certifié | ECAB, 10 items vrai/faux, item 10 inversé, seuil ≥ 6 |
| `Q_NEU_09` | `zarit_grille_charge_proches_aidants.md` | certifié | certifié | n/a | certifié | certifié | certifié | Zarit, 22 items Q001-Q022, score 0-88, seuils fardeau léger à sévère |
| `Q_NEU_10` | `dependance_a_internet.md` | certifié | certifié | n/a | certifié | certifié | certifié | Dépendance à Internet, 20 items Q001-Q020, score 0-100, seuils <50 / 50-79 / >79 |
| `Q_NEU_11` | `questionnaire_had.md` | certifié | certifié | n/a | certifié | certifié | certifié | HAD, 14 items, sous-scores anxiété/dépression 0-21 ; ordre alterné historique conservé comme autorisé par Drive |
| `Q_NEU_12` | `idtas_ae_depression_trouble_affectif_saisonnier.md` | certifié | certifié | n/a | certifié | certifié | certifié | IDTAS-AE, 4 parties (dépistage 9 items, GSS 6 items /24, comptage mensuel listes A/B, symptômes hivernaux 9 items) ; identifiants internes conservés (IA/IG/IMA/IMB/IS) au lieu des IDs composés P1_Q00x du Drive |
| `Q_SOM_01` | `sommeil_05_psqi_pittsburgh.md` | mappé | mappé | n/a | mappé | mappé | à faire | PSQI |
| `Q_SOM_02` | `sommeil_03_epworth_somnolence.md` | certifié | certifié | n/a | certifié | ambigu | certifié | Epworth, score 0-24 ; interprétation Drive incomplète pour les scores 6 et 15 |
| `Q_SOM_03` | `sommeil_04_berlin_apnee_sommeil.md` | mappé | mappé | n/a | mappé | mappé | à faire | Berlin |
| `Q_SOM_04` | `sommeil_02_irls_jambes_sans_repos.md` | mappé | mappé | n/a | mappé | mappé | à faire | IRLS |
| `Q_SOM_05` | `sommeil_06_chronotype_horne.md` | certifié | certifié | n/a | certifié | certifié | certifié | Horne & Östberg, 19 items, score 16-86 |
| `Q_SOM_06` | `sommeil_01_fatigue_pichot.md` | certifié | certifié | n/a | certifié | certifié | certifié | Pichot, 8 items, score 0-32, seuil Drive > 22 |
| `Q_SOM_07` | `sommeil_07_mfi_fatigue_multidimensionnelle.md` | mappé | mappé | n/a | mappé | mappé | à faire | MFI |
| `Q_INF_01` | `questionnaire_hyperexcitabilite.md` | certifié | certifié | n/a | certifié | certifié | certifié | Hyperexcitabilité, 24 items, score 0-96 |
| `Q_INF_02` | `questionnaire_hypersensibilite_deficit_magnesium.md` | certifié | certifié | n/a | certifié | certifié | certifié | Magnésium, 13 items, score 0-52 |
| `Q_INF_03` | `questionnaire_dnsm_neurotransmetteurs.md` | certifié | certifié | n/a | certifié | certifié | certifié | DNSM, 40 items, 4 sous-scores 0-40 |
| `Q_INF_04` | `hit_patients_migraineux.md` | certifié | certifié | n/a | certifié | certifié | certifié | HIT-6, 6 items, score 36-78 |
| `Q_INF_05` | `auto_anxiete_questionnaire_auto_evaluation.md` | certifié | certifié | n/a | certifié | certifié | certifié | Auto-anxiété, 11 items, compte des réponses ≥ 3 |
| `Q_GAS_01` | `gastro_04_troubles_fonctionnels_digestifs_intestinaux.md` | certifié | certifié | n/a | certifié | ambigu | certifié | TFD, 31 items, score 0-93, seuils frontières Drive incomplets |
| `Q_GAS_02` | `gastro_03_score_francis.md` | certifié | certifié | n/a | certifié | certifié | certifié | Francis, 2 questions filtres non scorées + 5 composants, score 0-500 |
| `Q_GAS_03` | `gastro_01_selles_enfant_nourrisson.md` | mappé | mappé | n/a | mappé | mappé | à faire | Bristol enfant |
| `Q_FIB_01` | `questionnaire_first_fibromyalgie_contexte.md` | certifié | certifié | n/a | certifié | certifié | certifié | FiRST, 6 items oui/non, seuil positif ≥ 5 |
| `Q_FIB_02` | `questionnaire_qif_impact_fibromyalgie_contexte.md` | certifié | certifié | n/a | certifié | ambigu | certifié | QIF, score opérationnel 0-100, source ambiguë sur max 100-107 et tranche 1-34 |
| `Q_FIB_03` | `liste_elfe_evaluation_fibromyalgie_contexte_praticien.md` | ambigu | ambigu | n/a | non scoré | n/a | certifié | ELFE praticien, catalogue local sous-ensemble de la fiche Drive complète, aucun score automatique |
| `Q_CAR_01` | `questionnaire_troubles_fonctionnels_cardio_metaboliques.md` | mappé | mappé | n/a | mappé | mappé | à faire | Cardio-métabolique |
| `Q_TAB_01` | `questionnaire_lagrue_legeron_motivation_arret_tabac.md` | certifié | certifié | n/a | certifié | certifié | certifié | Motivation arrêt tabac, 4 items, score 0-23 |
| `Q_TAB_02` | `questionnaire_fagerstrom_dependance_nicotine.md` | certifié | certifié | n/a | certifié | certifié | certifié | Fagerström, 6 items, score 0-10 |
| `Q_TAB_03` | `questionnaire_qct2_gilliard_comportement_tabagique.md` | mappé | mappé | n/a | mappé | mappé | à faire | QCT2 |
| `Q_TAB_04` | `questionnaire_dependance_cannabis.md` | mappé | mappé | n/a | mappé | mappé | à faire | Cannabis |
| `Q_TAB_05` | `questionnaire_di_franza_nicotine_adolescents.md` | certifié | certifié | n/a | certifié | certifié | certifié | Di Franza/HONC, 10 items oui/non, seuil perte d'autonomie ≥ 4 |
| `Q_PNE_01` | `questionnaire_bpco_pneumologie.md` | certifié | certifié | n/a | certifié | n/a | certifié | BPCO, score total 0-33 + sous-scores fonctionnel/psychologique/relationnel, sans seuil fixe Drive |
| `Q_URO_01` | `01_ipss_international_prostate_score_symptom.md` | certifié | certifié | n/a | certifié | ambigu | certifié | IPSS, Q002 cotée 0/2/3/4/5/6 dans Drive, total source 36 vs interprétation 0-35 |
| `Q_URO_02` | `02_catalogue_mictionnel.md` | certifié | certifié | n/a | non scoré | n/a | certifié | Catalogue mictionnel, journal 3 jours, aucun score automatique |
| `Q_PED_01` | `pediatrie_01_matinalite_vesperalite_enfant.md` | certifié | certifié | n/a | certifié | n/a | certifié | Chronotype enfant, 10 items, score brut 10-43 sans interprétation automatisée |
| `Q_PED_02` | `pediatrie_03_conners_enseignant_ctrs_rs.md` | mappé | mappé | n/a | mappé | mappé | à faire | Conners enseignant |
| `Q_PED_03` | `pediatrie_02_conners_parent.md` | certifié | certifié | n/a | certifié | n/a | certifié | 108 items scorés, somme brute 0-324, pas de T-score sans tables normatives |
| `Q_ALI_01` | `questionnaire_alimentaire_siin_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Alimentaire SIIN |
| `Q_ALI_02` | `questionnaire_diete_mediterraneenne_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Méditerranéen |
| `Q_ALI_03` | `questionnaire_monnier_apports_caloriques_proteiques_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Monnier |
| `Q_MOD_01` | `questionnaire_contextuel_mode_de_vie_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Mode de vie contexte |
| `Q_MOD_02` | `questionnaire_activite_depense_energetique_globale_siin_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Activité globale |
| `Q_MOD_03` | `questionnaire_plaintes_actuelles_troubles_ressentis.md` | certifié | certifié | n/a | certifié | certifié | certifié | Plaintes actuelles, 7 échelles 1-10, score total 7-70 et moyenne descriptive 1-10 sans seuil diagnostique |
| `Q_GEO_01` | `gerontologie_01_tinetti_equilibre_marche.md` | certifié | certifié | n/a | certifié | certifié | certifié | Tinetti, observateur, équilibre /16 + marche /12, score total /28 |
| `Q_GEO_02` | `gerontologie_02_sarcopenie.md` | certifié | certifié | n/a | certifié | certifié | certifié | SARC-F, 5 items, score 0-10, seuil risque ≥ 4 |
| `Q_GEO_03` | aucun MD Drive équivalent identifié | historique | historique | n/a | historique | historique | à faire | AQ Alzheimer, absent Drive |
| `Q_GEO_04` | `mmse_mini_mental_state_examination_greco.md` | mappé | mappé | n/a | mappé | mappé | à faire | MMSE |
| `Q_GEO_05` | `questionnaire_reperage_troubles_dementiels_qdrs.md` | mappé | mappé | n/a | mappé | mappé | à faire | QDRS |
| `Q_GEO_06` | `questionnaire_test_5_mots_dubois.md` | mappé | mappé | n/a | mappé | mappé | à faire | Test 5 mots |
| `Q_CAN_01` | `questionnaire_cancerologie_qlq_c30.md` | certifié | certifié | n/a | certifié | ambigu | certifié | Score brut Drive Q001-Q028 ; seuil `< 28` incohérent conservé en note |
| `Q_CAN_02` | `questionnaire_cancerologie_qlq_br23.md` | certifié | certifié | certifié | certifié | ambigu | certifié | Score brut Drive Q001-Q023 ; Q005/Q016 retournés en `notApplicable` si masqués |

## MD Drive sans questionnaire code correspondant

| Source MD Drive | Statut | Décision |
|---|---|---|
| `sommeil_08_agenda_sommeil_eveil.md` | bonus | Recueil agenda, pas de création automatique dans cette passe. |
| `gastro_03_score_francis (1).md` | doublon | Doublon Drive de `gastro_03_score_francis.md`, pas de création automatique. |
| `00_index_*.md` | index | Fichiers d'index exclus de l'audit fonctionnel. |

## Points de vigilance

- Les seuils incohérents déjà présents dans les MD Drive QLQ-C30 (`< 28`) et QLQ-BR23 (`< 14`) sont conservés en note de scoring, sans correction contre source externe.
- `Q_PED_03` conserve les 108 items scorés du MD Drive ; les deux questions ouvertes Conners ne sont pas créées tant que le rendu patient ne supporte pas les champs texte dans ce catalogue.
- `Q_NEU_06` et `Q_GEO_03` restent explicitement hors certification Drive faute de MD correspondant identifié dans l'inventaire.
- La commande `cd web && npm run scoring-check` vérifie la couverture de cette matrice et les fixtures certifiées actuelles.
