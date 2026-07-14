# 16 — Structure proposée dans le dépôt

## Dossier documentaire recommandé

Si ces documents sont intégrés au dépôt, emplacement conseillé :

```text
docs/claude/wellneuro-3/
├── README.md
├── 00_START_HERE_AGENT_CODE.md
├── 01_ETAT_ACTUEL_DEPOT_ET_ROADMAP.md
├── 02_OBJECTIF_CIBLE_BRAINSTORM.md
├── 03_HIERARCHISATION_STRATEGIQUE.md
├── 04_ROADMAP_DE_TRANSITION.md
├── 05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md
├── 06_SPEC_UX_COCKPIT_PRATICIEN.md
├── 07_SPEC_PROTOCOLE_21J_MINIMAL.md
├── 08_SPEC_COMPAGNON_PATIENT_MINIMAL.md
├── 09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md
├── 10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md
├── 11_BACKLOG_MODULES_AVANCES.md
├── 12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md
├── 13_PROMPTS_AGENT_CODE.md
├── 14_DEFINITION_OF_DONE.md
├── 15_RISQUES_DECISIONS_ET_ARBITRAGES.md
└── source_evolutions_originales/
```

## Structure code possible à terme

Sans créer tout de suite :

```text
web/src/components/patient-cockpit/
web/src/components/protocol/
web/src/components/documents/
web/src/components/patient-companion/
web/src/lib/protocol/
web/src/lib/missing-data/
web/src/lib/clinical-signals/
web/src/lib/documents/
```

## Principe d’import

- Les composants UI doivent rester présentationnels autant que possible.
- Les règles de calcul doivent être dans `lib/`.
- Les routes API doivent rester fines et vérifiables.
- Les objets métier doivent être typés.
- Ne pas mettre de logique clinique lourde directement dans les composants.

## Migration éventuelle future

Persistance protocole, check-ins, document bundles et momentum nécessiteront probablement de nouveaux modèles Prisma.

Mais ordre recommandé :

```text
1. prototype UI sans migration
2. validation UX praticien
3. spécification modèle
4. confirmation explicite
5. migration courte
6. rétrocompatibilité
```
