# Synthèse du programme WellNeuro 3.2

> Révision du 2026-07-13 — promeut les arbitrages réconciliés de WN Ultimate
> v2 comme architecture cible 3.2, sans activer ses règles cliniques
> candidates. Elle intègre aussi les arbitrages du brainstorm (registre de
> frontières §2) : scission Hybrid Clinical / QX, redistribution du métier
> vers C1/C2, compilation N+1, abandon du double mode Jour/Nuit (tout clair).
> `docs/claude/REGISTRE_FRONTIERES.md` fait foi sur les frontières et
> décisions actées ; ce fichier fait foi sur la séquence.

## Décision stratégique (inchangée)

Ne pas recoder WellNeuro. Recomposer progressivement l'UX et le moteur
clinique autour d'un MVP décisionnel, organisé en cycle commun :

```text
Patient → Données fiables → Compréhension → Décision 21 jours
→ Actions patient → Suivi → Réévaluation
```

Répartition des rôles : HC-F fournit la grammaire visuelle ; C1 prépare le
snapshot, la décision et le protocole brouillon ; C2 possède leur persistance,
le temps et la trajectoire ; C3 la restitution ; C4 et C5 les bibliothèques
d'intervention ; JA le journal alimentaire ; QX l'expérience de saisie ;
WN-AUTO les garde-fous d'exécution.

## Ce que WellNeuro 3.0 doit prouver (inchangé)

- Le praticien comprend la situation en moins de deux minutes.
- Il prépare une phase 1 en moins de dix minutes.
- La phase 1 reste supportable : trois actions maximum.
- Les données manquantes et discordances empêchent la surinterprétation.
- Le patient reçoit une version calme et concrète.
- Le suivi distingue effet, tolérance et adhésion.

## Convention d’exécution

Chaque campagne est exécutée sur une branche d’intégration dédiée. Les lots de la campagne sont menés sur des branches dérivées de cette branche, et leurs PR visent d’abord la branche de campagne avant la PR finale vers `main`.

## Programme de campagnes

| Ordre | Campagne | Dossier | Résultat | Statut | Dépendance |
|---|---|---|---|---|---|
| C0 | Alignement documentaire | `2026-07-11-alignement-documentaire-etat-reel` | Livré | terminée | — |
| C0-UX | Shell praticien 3.0 | `2026-07-11-refonte-ux-shell-3-0` | Socle technique livré — direction visuelle remplacée par HC-F | terminée | C0 |
| **HC-F** | Hybrid Clinical Foundation | `2026-07-12-hybrid-clinical-experience-questionnaires` | Tokens clairs, shell premium, mécanismes, charte patient, gouvernance | en cours — LOT-00 à LOT-04 terminés, LOT-05 suivant | C0-UX |
| **C1** | Décision clinique 21 jours V1 | `2026-07-11-decision-clinique-21-jours-v1` | Épisode proposé → snapshot → priorité proposée/sélectionnée → protocole brouillon → validation | compilée, à_faire | HC-F LOT-02 |
| **QX** | Expérience questionnaires | `2026-07-12-qx-experience-questionnaires` | Profils de rendu sur pilotes audités, intégrité psychométrique | compilée, à_faire | HC-F LOT-01 + LOT-04 ; parallèle à C1 |
| C3 | Documents contextuels multi-destinataires V1 | `2026-07-11-fiches-conseils-contextuelles-v1` | Moteur de composition documentaire | cadrée (compiler N+1) | C1 |
| C2A | Points d'étape et persistance minimale | `2026-07-11-suivi-j7-j14-j21-et-persistance` | Épisodes confirmés, protocole actif, check-ins J7/J14/J21, résumé J21 | cadrée (compiler N+1) | C1 + **gate migration** |
| C2B | Trajectoire et aide à l'ajustement | idem | Momentum explicable, comparateur | cadrée | C2A + données réelles |
| C4A / C5A | Catalogues intrinsèques compléments / alimentation | `…complements…` / `…boussole…` | Data-first via contrat neutre partagé | cadrées | C4B/C5B : C1 + protocole actif C2 |
| **JA** | Journal alimentaire 21 jours V1 | `2026-07-13-journal-alimentaire-21j-v1` | Observations alimentaires manuelles, sans score ni proxy questionnaire | cadrée | domaine pur ; persistance : C2A + gate migration |

## Architecture cible 3.2 promue

Le pack WN Ultimate v2 reste auditable sous
[`../propositions/wn-ultimate-v2/`](../propositions/wn-ultimate-v2/README.md).
Les contrats et frontières retenus sont promus dans
[`../ARCHITECTURE_CLINIQUE_3_2.md`](../ARCHITECTURE_CLINIQUE_3_2.md). Les
seuils, marqueurs, axes et règles non sourcés restent des candidats bloqués
par les gates cliniques ; cette promotion ne modifie aucun scoring existant.

> Le chemin C1 est corrigé partout : `2026-07-11-decision-clinique-21-jours-v1`
> (l'ancien alias `…-21j-v1` était erroné).

## Gates

- **Migration** : C2A contient un lot `bloqué_confirmation`. Aucun agent ne
  démarre une migration Prisma/SQL sans confirmation explicite.
- **Décision clinique** : une priorité proposée n'a aucun effet avant
  sélection du praticien ; un protocole brouillon n'est ni actif ni
  diffusable avant validation.
- **Corpus** : les 391 notices sont un inventaire sanitaire non activable.
  G0–G4 précèdent toute ingestion/recherche ; G5 précède toute migration
  PostgreSQL/pgvector ; G6 autorise seul le pilote sommeil/chronobiologie.
- **Pilotes questionnaires** : QX et OCR restent bornés aux familles
  auditées (ALI_01, ALI_03, NEU_03, MOD_02) tant que le chantier de
  certification n'est pas étendu.
- **Séquencement E0** : `feat/e0-patients-pagination` se livre avant tout
  restylage de l'annuaire patients (HC-F/C1).

## Modules différés

Voir « Différés » du registre : Hybrid Patient, auth inter-assignations,
biologie réelle (HDS), OCR papier (R10), scanner alimentaire / panier / photo
repas, messagerie, copilotes IA.
