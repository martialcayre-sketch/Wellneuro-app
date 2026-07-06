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
| `Q_STR_01` | `questionnaire_stress_siin.md` | mappé | mappé | n/a | mappé | mappé | à faire | Stress SIIN |
| `Q_STR_02` | `questionnaire_stress_cohen_pss.md` | mappé | mappé | n/a | mappé | mappé | à faire | PSS |
| `Q_STR_03` | `questionnaire_stress_cungi.md` | mappé | mappé | n/a | mappé | mappé | à faire | Cungi |
| `Q_STR_04` | `questionnaire_stress_dass21.md` | mappé | mappé | n/a | mappé | mappé | à faire | DASS-21 |
| `Q_STR_05` | `questionnaire_stress_bms_burnout.md` | mappé | mappé | n/a | mappé | mappé | à faire | BMS |
| `Q_STR_06` | `questionnaire_stress_karasek.md` | mappé | mappé | n/a | mappé | mappé | à faire | Karasek |
| `Q_STR_08` | `questionnaire_wart_addiction_travail.md` | mappé | mappé | n/a | mappé | mappé | à faire | WART |
| `Q_NEU_01` | `bdi_echelle_de_depression_de_beck.md` | mappé | mappé | n/a | mappé | mappé | à faire | BDI |
| `Q_NEU_02` | `madrs_echelle_depression.md` | mappé | mappé | n/a | à vérifier | à vérifier | à faire | Corrections externes récentes à réarbitrer contre Drive si besoin clinique |
| `Q_NEU_03` | `questionnaire_sigh_sad_sa.md` | certifié | certifié | n/a | certifié | n/a | certifié | 25 items, groupes A/B, règle Q15-Q17 Drive |
| `Q_NEU_04` | `questionnaire_scoff.md` | mappé | mappé | n/a | mappé | mappé | à faire | SCOFF |
| `Q_NEU_05` | `questionnaire_upps_impulsivite.md` | mappé | mappé | n/a | mappé | mappé | à faire | UPPS |
| `Q_NEU_06` | aucun MD Drive équivalent identifié | historique | historique | n/a | historique | historique | à faire | Questionnaire cognitif SIIN, absent Drive |
| `Q_NEU_07` | `questionnaire_audit_alcool.md` | mappé | mappé | n/a | mappé | mappé | à faire | AUDIT alcool |
| `Q_NEU_08` | `ecab_echelle_cognitive_attachement_benzodiazepines.md` | mappé | mappé | n/a | mappé | mappé | à faire | ECAB |
| `Q_NEU_09` | `zarit_grille_charge_proches_aidants.md` | mappé | mappé | n/a | mappé | mappé | à faire | Zarit |
| `Q_NEU_10` | `dependance_a_internet.md` | mappé | mappé | n/a | mappé | mappé | à faire | Internet |
| `Q_NEU_11` | `questionnaire_had.md` | mappé | mappé | n/a | mappé | mappé | à faire | HAD |
| `Q_NEU_12` | `idtas_ae_depression_trouble_affectif_saisonnier.md` | mappé | mappé | n/a | mappé | mappé | à faire | IDTAS-AE |
| `Q_SOM_01` | `sommeil_05_psqi_pittsburgh.md` | mappé | mappé | n/a | mappé | mappé | à faire | PSQI |
| `Q_SOM_02` | `sommeil_03_epworth_somnolence.md` | mappé | mappé | n/a | mappé | mappé | à faire | Epworth |
| `Q_SOM_03` | `sommeil_04_berlin_apnee_sommeil.md` | mappé | mappé | n/a | mappé | mappé | à faire | Berlin |
| `Q_SOM_04` | `sommeil_02_irls_jambes_sans_repos.md` | mappé | mappé | n/a | mappé | mappé | à faire | IRLS |
| `Q_SOM_05` | `sommeil_06_chronotype_horne.md` | mappé | mappé | n/a | mappé | mappé | à faire | Horne |
| `Q_SOM_06` | `sommeil_01_fatigue_pichot.md` | mappé | mappé | n/a | mappé | mappé | à faire | Pichot |
| `Q_SOM_07` | `sommeil_07_mfi_fatigue_multidimensionnelle.md` | mappé | mappé | n/a | mappé | mappé | à faire | MFI |
| `Q_INF_01` | `questionnaire_hyperexcitabilite.md` | mappé | mappé | n/a | mappé | mappé | à faire | Hyperexcitabilité |
| `Q_INF_02` | `questionnaire_hypersensibilite_deficit_magnesium.md` | mappé | mappé | n/a | mappé | mappé | à faire | Magnésium |
| `Q_INF_03` | `questionnaire_dnsm_neurotransmetteurs.md` | mappé | mappé | n/a | mappé | mappé | à faire | DNSM |
| `Q_INF_04` | `hit_patients_migraineux.md` | mappé | mappé | n/a | mappé | mappé | à faire | HIT migraine |
| `Q_INF_05` | `auto_anxiete_questionnaire_auto_evaluation.md` | mappé | mappé | n/a | mappé | mappé | à faire | Auto-anxiété |
| `Q_GAS_01` | `gastro_04_troubles_fonctionnels_digestifs_intestinaux.md` | mappé | mappé | n/a | mappé | mappé | à faire | TFD |
| `Q_GAS_02` | `gastro_03_score_francis.md` | mappé | mappé | n/a | mappé | mappé | à faire | Francis |
| `Q_GAS_03` | `gastro_01_selles_enfant_nourrisson.md` | mappé | mappé | n/a | mappé | mappé | à faire | Bristol enfant |
| `Q_FIB_01` | `questionnaire_first_fibromyalgie_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | FIRST |
| `Q_FIB_02` | `questionnaire_qif_impact_fibromyalgie_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | QIF |
| `Q_FIB_03` | `liste_elfe_evaluation_fibromyalgie_contexte_praticien.md` | mappé | mappé | n/a | mappé | mappé | à faire | ELFE praticien |
| `Q_CAR_01` | `questionnaire_troubles_fonctionnels_cardio_metaboliques.md` | mappé | mappé | n/a | mappé | mappé | à faire | Cardio-métabolique |
| `Q_TAB_01` | `questionnaire_lagrue_legeron_motivation_arret_tabac.md` | mappé | mappé | n/a | mappé | mappé | à faire | Motivation arrêt tabac |
| `Q_TAB_02` | `questionnaire_fagerstrom_dependance_nicotine.md` | mappé | mappé | n/a | mappé | mappé | à faire | Fagerström |
| `Q_TAB_03` | `questionnaire_qct2_gilliard_comportement_tabagique.md` | mappé | mappé | n/a | mappé | mappé | à faire | QCT2 |
| `Q_TAB_04` | `questionnaire_dependance_cannabis.md` | mappé | mappé | n/a | mappé | mappé | à faire | Cannabis |
| `Q_TAB_05` | `questionnaire_di_franza_nicotine_adolescents.md` | mappé | mappé | n/a | mappé | mappé | à faire | Di Franza |
| `Q_PNE_01` | `questionnaire_bpco_pneumologie.md` | mappé | mappé | n/a | mappé | mappé | à faire | BPCO |
| `Q_URO_01` | `01_ipss_international_prostate_score_symptom.md` | mappé | mappé | n/a | mappé | mappé | à faire | IPSS |
| `Q_URO_02` | `02_catalogue_mictionnel.md` | mappé | mappé | n/a | non scoré | n/a | à faire | Catalogue mictionnel |
| `Q_PED_01` | `pediatrie_01_matinalite_vesperalite_enfant.md` | mappé | mappé | n/a | mappé | mappé | à faire | Chronotype enfant |
| `Q_PED_02` | `pediatrie_03_conners_enseignant_ctrs_rs.md` | mappé | mappé | n/a | mappé | mappé | à faire | Conners enseignant |
| `Q_PED_03` | `pediatrie_02_conners_parent.md` | certifié | certifié | n/a | certifié | n/a | certifié | 108 items scorés, somme brute 0-324, pas de T-score sans tables normatives |
| `Q_ALI_01` | `questionnaire_alimentaire_siin_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Alimentaire SIIN |
| `Q_ALI_02` | `questionnaire_diete_mediterraneenne_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Méditerranéen |
| `Q_ALI_03` | `questionnaire_monnier_apports_caloriques_proteiques_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Monnier |
| `Q_MOD_01` | `questionnaire_contextuel_mode_de_vie_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Mode de vie contexte |
| `Q_MOD_02` | `questionnaire_activite_depense_energetique_globale_siin_contexte.md` | mappé | mappé | n/a | mappé | mappé | à faire | Activité globale |
| `Q_MOD_03` | `audit_alcool.md` | doublon | doublon | n/a | doublon | doublon | à faire | Doublon métier de l'AUDIT alcool, conservé côté Mode de vie |
| `Q_GEO_01` | `gerontologie_01_tinetti_equilibre_marche.md` | mappé | mappé | n/a | mappé | mappé | à faire | Tinetti |
| `Q_GEO_02` | `gerontologie_02_sarcopenie.md` | mappé | mappé | n/a | mappé | mappé | à faire | Sarcopénie |
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
