# BioFlow — audit des panels biologiques et cible de rationalisation

> **Snapshot daté du 2026-10-05.** Mission « première mission » du cadrage
> directeur BioFlow du responsable (§31-§32). Rien n'est migré, rien n'est
> supprimé. Le dépôt sur `main` et la base de production prévalent sur ce
> document : le relire contre eux avant d'agir.
>
> Légende : **[O]** observé (code ou base), **[D]** documenté non implémenté,
> **[I]** inféré, **[R]** recommandé. Les mesures de production sont des
> agrégats lus le 2026-10-05 dans une transaction en lecture seule, depuis un
> conteneur `scalingo run -d`.

## 0. Décision directrice du cadrage (§35)

La chaîne visée est la suivante :

```
analytes canoniques + axes cliniques + règles sourcées
  → proposition patient unique → validation praticien → NABM / conditions
  → validation médecin → résultats → suivi longitudinal
```

Le cadrage écarte la multiplication des packs, qui produit des listes, des
règles et des documents redondants. **Priorité immédiate : mesurer et
rationaliser l'existant avant d'ajouter des packs ou des modèles.** Consigne :
audit et proposition d'abord ; aucun refactoring avant la matrice réelle des
`BiologyPanel`, de leurs consommateurs et des doublons mesurés. Ce document est
cette matrice (§1 à §3) et cette proposition (§4 à §6).

## 1. Cartographie

### 1.1 Où vit la vérité du catalogue

- **[O]** La composition des panels n'existe qu'à un endroit : la migration de
  données `20260817090000_catalogue_biologie_niveau_1_donnees`. Aucun seed,
  aucun fichier TS ne la porte, et aucune migration ultérieure ne touche
  `biology_panels` ni `biology_panel_items`.
- **[O]** Le déclenchement (QUAND proposer) vit ailleurs, dans la table signée
  `indicationsBiologieV1.ts` : 15 règles `BIO-*`, une par panel, référencées
  par la chaîne `panelCode`. Composition et indication sont donc deux sources
  reliées par un code.
- **[O]** Les analytes ont crû depuis (D-068, oméga-3, compte rendu courant) ;
  les panels, non.

### 1.2 Mesures de production (2026-10-05)

| Objet | Mesure |
|---|---|
| Panels | 15, tous actifs |
| Items de panel | 78, sur 35 analytes distincts, 0 ratio |
| Analytes au catalogue | 85 |
| Actes NABM (millésime courant V105) | 987, tous actifs |
| Correspondances analyte ↔ acte | **0** (0 signée) |
| Analytes évaluables en remboursement | **0** |
| Liens analyte ↔ besoin / axe / nutriment (`biology_analyte_links`) | **0** |
| Panels déclarés « déjà explorés » (`panels_biologie_documentes`) | **0** |
| Arbitrages biologiques | **0** |
| Documents patient biologie | 3, sur 3 dossiers |
| Brouillons de protocole | 3, sur 3 dossiers |
| … dont une action `biological_exploration` | **0** |

**Lecture [I].** La production n'a encore rien construit sur les panels :
aucune déclaration, aucun arbitrage, aucune action de protocole. La
rationalisation peut donc se faire **avant** que des données patient ne s'y
accrochent. Les trois documents patient consignent leur texte : ils ne seront
pas réécrits par une évolution du catalogue.

### 1.3 La chaîne actuelle

```
dossier (réponses, anamnèse, panels documentés)
  → propositionService.deriverPropositionPourPatient
  → statuts.deriverStatutsBiologie  (table signée indicationsBiologieV1)
  → lignes PAR PANEL  → PropositionBilanPanel (écran praticien)
                      → courrier.ts (médecin, non prescriptif, gardé)
                      → documentPatient.ts (patient)
  ✗ aucun lien vers 5. Actions / biological_exploration
```

- **[O]** `biological_exploration` est une valeur de l'union
  `ProtocolActionType` (`clinical-engine/types.ts`), stockée dans le JSON du
  brouillon de protocole, sans référence au catalogue : le praticien saisit
  du texte libre. La liste des types d'action est recopiée dans quatre
  fichiers (`types.ts`, `protocolDraft.ts`, `contenuPatientProtocole.ts`,
  `ProtocolMiniBuilder.tsx`).
- **[O]** `BiologyCatalogRef` **n'existe pas** dans le code (0 occurrence). Il
  était prévu en CB-07, au LOT-04 de la campagne `2026-08-02-rayon-biologie-cb`,
  « non livré, transféré » **[D]**. C'est la rupture principale de la chaîne.
- **[O]** La proposition ne passe pas la carte des remboursements au moteur
  (`propositionService.ts`, commentaire explicite) : chaque ligne reste
  `non_evalue`. Avec 0 correspondance en base, ce fail-closed est aussi la
  seule réponse vraie. La bibliothèque, elle, calcule `deriverRemboursement`
  (`catalogue.ts`).
- **[O]** Le courrier énumère les analytes **ligne par ligne de panel**
  (`courrier.ts`, « Éléments : … ») : une même analyse apparaît autant de fois
  que de panels proposés.

### 1.4 Ce que BIO-PARCOURS prévoit déjà [D]

Le cadrage v3.1 (`CADRAGE_BIO_PARCOURS_v3_2026-10-04.md`) couvre déjà une
partie de la cible du cadrage directeur :

- **Exploration** : analytes de la question, « demande d'examens à
  contresigner », attente typée portant `analyteCodes` et la date du
  contreseing (D-142 généralisée, **BP-04**) ; **BP-16** « Boucle
  d'exploration » (après BP-03, BP-04, BP-11).
- **Prescription** : figée, signée, remise (**BP-18a/b**), hors médicament,
  côté praticien (D-266).

La Track C ne doit pas réécrire ces lots : elle doit s'y brancher.

## 2. Tableau des doublons (mesuré)

35 analytes distincts pour 78 occurrences ; 20 n'apparaissent que dans un
panel ; 50 analytes du catalogue n'apparaissent dans aucun.

| Analyte | Occurrences | Panels |
|---|---|---|
| VITAMINE_D_25OH | 8 | humeur, anxiété, sommeil, mémoire, fatigue, neurodégénératif, métabolique, personne âgée |
| FERRITINE | 8 | humeur, anxiété, sommeil, mémoire, fatigue, métabolique, jambes sans repos, femme |
| ZINC_PLASMATIQUE | 6 | humeur, anxiété, mémoire, neurodégénératif, métabolique, personne âgée |
| CRP_US | 6 | anxiété, mémoire, digestif, fatigue, neurodégénératif, métabolique |
| MAGNESIUM_ERYTHROCYTAIRE | 5 | anxiété, sommeil, mémoire, digestif, fatigue |
| CAR | 4 | stress, mémoire, fatigue, métabolique |
| AG_ERYTHROCYTAIRES | 4 | humeur, mémoire, métabolique optionnel, personne âgée |
| HOMOCYSTEINE | 3 | humeur, mémoire, neurodégénératif |
| TSH_US, SELENIUM, FOLATES_ERYTHROCYTAIRES, FER_SERIQUE, BETA_DEFENSINE_2, B12_HOLOTC, ANTI_LDL_OXYDE | 2 chacun | — |

**Sources de duplication [O/I] :** compositions recouvrantes (mémoire ⊃
l'essentiel d'humeur et d'anxiété) ; panels d'une seule analyse (femme et
jambes sans repos = ferritine) ; courrier et document patient listés par panel ;
composition et indication en deux sources ; liste de types d'action recopiée
quatre fois.

## 3. Classification des panels

| Panel | Analytes | Type réel [I] | Consommateurs | Décision [R] |
|---|---|---|---|---|
| PANEL_HUMEUR_1 | 9 | axe clinique (tableau) | proposition, courrier, doc patient, BIO-HUM-01 | convertir |
| PANEL_ANXIETE_1 | 5 | axe clinique | idem, BIO-ANX-01 | convertir |
| PANEL_STRESS_1 | 5 | axe clinique (≈ stress_hpa) | idem, BIO-STR-01 | convertir |
| PANEL_SOMMEIL_1 | 4 | axe clinique | idem, BIO-SOM-01 | convertir |
| PANEL_MEMOIRE_1 | 11 | axe clinique | idem, BIO-MEM-01 | convertir |
| PANEL_DIGESTIF_1 | 5 | axe clinique (≈ intestin) | idem, BIO-DIG-01 | convertir |
| PANEL_FATIGUE_1 | 14 | axe clinique | idem, BIO-FAT-01 | convertir |
| PANEL_NEURODEG_1 | 6 | axe clinique (approfondissement) | idem, BIO-NEU-01 | convertir |
| PANEL_METABOLIQUE_1 | 8 | axe clinique (≈ métabolisme glucidique) | idem, BIO-MET-01 | convertir |
| PANEL_METABOLIQUE_OPT | 4 | template optionnel | idem, BIO-MET-02 | déprécier → priorité « conditionnel » |
| PANEL_SJSR | 1 | indication (≈ statut martial) | idem, BIO-SJS-01 | convertir en indication |
| PANEL_POP_FEMME | 1 | population (≈ statut martial) | idem, BIO-POP-01 | convertir en indication |
| PANEL_POP_AGEE | 5 | population | idem, BIO-POP-02 | convertir en indication |
| PANEL_MG_PLASMATIQUE | 0 | coquille « non indiqué » | BIO-NIA-01 | conserver tel quel (motif) |
| PANEL_CORTISOL_ISOLE | 0 | coquille « non indiqué » | BIO-NIA-02 | conserver tel quel (motif) |

**Aucun vrai panel technique** n'existe comme `BiologyPanel` : NFS, profil
lipidique, bilan hépatique et ionogramme sont des analytes « blocs ». La
catégorie « technique » reste vide ; il n'y a rien à conserver à ce titre.

## 4. Proposition de cible (réutilisation maximale)

| Responsabilité | Existant réutilisé | Ce qui manque |
|---|---|---|
| Analyte canonique | `BiologyAnalyte` (85), synonymes/resolver signés, plages, claims | rien de structurel |
| Axe | `BiologyAnalyteLink` (claim **obligatoire**, `cible_type` besoin / axe / nutriment), aujourd'hui vide | un référentiel d'axes biologiques (statut martial, thyroïde, méthylation…) distinct de `NeuroAxis` — à arbitrer |
| Indication (quand proposer) | `indicationsBiologieV1` signée | qu'elle cible des **analytes ou des axes**, plus des panels |
| Proposition patient | `deriverStatutsBiologie` | une vue **par analyte**, dédoublonnée, multi-justification (§25 du cadrage) |
| Décision praticien | 5. Actions, `biological_exploration` | une référence au catalogue (`analyteCodes`), au patron de `SupplementCatalogRef` — c'est CB-07 / BP-04 |
| Document médecin, décision médecin | `courrier.ts` (gardé, non prescriptif, **inchangé**) | un workflow distinct (BP-18 côté BIO-PARCOURS, ou Track C) |
| Remboursement | `remboursable.ts`, NABM V105 | des correspondances **signées** (0 aujourd'hui) ; tant qu'il n'y en a pas, `non_evalue` reste la seule vérité |

Principes : aucune table nouvelle tant qu'un modèle existant suffit ; tout
lien analyte ↔ axe porte un claim (constitution clinique) ; la priorité
(niveau 1 à 4) et l'axe restent deux dimensions séparées.

## 5. Plan de migration (petites PR)

1. **Décision** (doc) : gel des packs cliniques, classification ci-dessus,
   analyte canonique, référentiel d'axes, articulation Track C ↔ BP-04/BP-16/BP-18.
2. **Vue dédoublonnée** (code, sans migration) : la proposition présente une
   ligne par analyte avec ses justifications ; courrier inchangé.
3. **Axes** (migration seule, puis code) : référentiel d'axes et liens
   analyte ↔ axe signés, claim par claim.
4. **Indications par axe** (clinique, re-signature) : `indicationsBiologieV1`
   v2 cible les axes ; les panels convertis passent inactifs, jamais supprimés
   (FK `panels_biologie_documentes` en Restrict).
5. **Référence catalogue dans 5. Actions** : `analyteCodes` sur
   `biological_exploration` (CB-07 / BP-04).
6. **Correspondances NABM signées** : curation humaine, une à une ; la
   proposition passe alors la carte au moteur.
7. **Track C** : proposition patient versionnée, décision médecin distincte —
   après BP-04 et BP-16.

## 6. Les trois prochaines PR

### PR 1 — Décision de rationalisation (D-xxx)

- **Objectif** : acter le gel des packs cliniques (§27), la classification du
  §3, l'analyte comme unité canonique, la place de la Track C (statut
  « cadrage », branchée sur BP-04/BP-16/BP-18) ; ajouter la Track C à
  `BIOFLOW_ROADMAP.md`.
- **Modèles / consommateurs** : aucun.
- **Migration** : aucune.
- **Risques** : arbitrer un référentiel d'axes sans claim ; dupliquer BIO-PARCOURS.
- **Tests** : `npm run check` (numérotation, ancres).
- **Rollback** : décision amendée par une autre.
- **Sortie** : décision acceptée par le responsable et mergée.

### PR 2 — Proposition dédoublonnée par analyte

- **Objectif** : une ligne par analyte dans l'écran praticien, avec la liste
  des panels et règles qui la justifient ; aucune règle ni seuil changé.
- **Modèles** : aucun. **Consommateurs** : `statuts.ts` (dérivation pure
  ajoutée, sortie existante intacte), `PropositionBilanPanel.tsx`. Courrier et
  document patient **inchangés**.
- **Migration** : aucune.
- **Risques** : perte de la justification d'un panel au regroupement ;
  vocabulaire de verdict (sentinelle BP-01).
- **Tests** : unitaire « ferritine proposée par 3 panels ⇒ 1 ligne, 3
  justifications » ; empreinte du chemin documentaire inchangée (BP-01) ; T2.
- **Rollback** : revert du code, aucune donnée.
- **Sortie** : écran à une ligne par analyte, bancs BP-01 verts.

### PR 3 — Référentiel d'axes biologiques (migration seule)

- **Objectif** : poser le référentiel d'axes et l'admettre comme cible de
  `biology_analyte_links` ; aucun lien inséré (la curation est signée, plus tard).
- **Modèles** : `BiologyAnalyteLink` (CHECK `cible_type` étendu), table
  d'axes ou valeur fermée — selon la PR 1.
- **Consommateurs** : aucun avant le code.
- **Migration** : oui, seule dans sa PR, `release-db`, constat par conteneur,
  passe Codex.
- **Risques** : confusion avec `NeuroAxis` ; un axe sans claim.
- **Tests** : contrat SQL négatif (axe inconnu refusé, lien sans claim refusé) ; T3.
- **Rollback** : migration compensatrice (aucune donnée à perdre, 0 lien).
- **Sortie** : migration constatée en production, 0 lien.

## 7. Questions ouvertes au responsable

1. **Track C** : nouvelle campagne plus tard, ou lots de BIO-PARCOURS
   (BP-04, BP-16, BP-18 portent déjà l'exploration contresignée et la
   prescription figée) ?
2. **Référentiel d'axes** : nouvelle liste fermée d'axes biologiques, ou
   extension de `NeuroAxis` ?
3. **Correspondances NABM** : qui signe la curation, et dans quel ordre (les
   8 analytes les plus partagés d'abord) ?
