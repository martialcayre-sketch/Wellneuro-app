# Architecture clinique WellNeuro 3.2

**Statut** : cible normative d'architecture, validée le 2026-07-13.
**Source auditée** : WN Ultimate v2, version portable 2.0, dont les documents
déclarent une date source du 2026-07-14. Cette date amont est conservée comme
provenance et ne remplace pas la date réelle d'audit/intégration.

Cette cible définit les frontières et contrats attendus. Elle ne valide aucun
nouveau seuil, score, marqueur, axe ou conseil clinique. Le moteur Mon
équilibre actuel, dont le 60/20/20 et ses seuils, reste inchangé.

## Flux d'autorité

```text
réponses sources
→ AssessmentEpisode proposé
→ confirmation praticien
→ ClinicalSnapshot
→ priorité moteur proposée
→ priorité praticien sélectionnée
→ ProtocolDraft
→ validation praticien
→ persistance et activation C2
```

Une absence de donnée n'est jamais convertie en zéro. Une proposition moteur
ou IA n'est ni une décision, ni une recommandation active, ni un contenu
diffusable.

## Contrats publics attendus

### Mesure et provenance

- Toute mesure porte `{ value, unit }`. Les calculs internes utilisent un
  ratio 0–1 ; `score_100` est réservé aux frontières API/affichage ; `delta`
  reste explicitement identifié.
- Les preuves A/B/C/D décrivent la provenance d'une mesure patient. Elles ne
  décrivent pas l'autorité d'une publication ou la validation d'un claim.
- Les références de sources portent identifiant, version, date observée,
  statut et limites. Aucune donnée libre ne doit dupliquer une anamnèse.

### AssessmentEpisode

- Objet TypeScript pur en C1 ; persistance réservée à C2 après gate migration.
- Le système propose un regroupement autour de T0/J21/J42/J90 avec ±8 jours,
  expose la plage de dates, les versions et les réponses hors fenêtre.
- Seul le praticien confirme/corrige la composition et clôt l'épisode.

### ClinicalSnapshot

- Contexte patient minimal et typé, limité aux champs nécessaires à la
  décision ; aucun `Record<string, unknown>` générique.
- Versions de scoring enregistrées par questionnaire, plus versions du score
  d'équilibre, mappings, règles et schéma du snapshot.
- Complétude, fraîcheur, discordances, limitations et références de sources
  sont explicites.
- `inputHash` repose sur une sérialisation canonique. Il prouve l'intégrité
  d'une entrée ; il n'anonymise ni ne pseudonymise les données.

### DecisionCard

- `proposedMainPriority` et `priorityCandidates` peuvent être produits par le
  moteur ; `selectedMainPriority` appartient au praticien.
- Origine (`engine`, `ai`, `practitioner`), cycle de vie, révision et validation
  sont des champs distincts.
- La carte conserve signaux convergents, discordances, données manquantes,
  sécurité, contre-factuels, règles, claims, limites et conditions
  d'abstention.

### ProtocolDraft

- C1 ne produit qu'un brouillon, sans statut `active`, `completed` ou
  `stopped`. Ces états appartiennent au protocole persisté par C2.
- Trois actions maximum uniquement après validation clinique du barème de
  charge ; plans idéal, minimal et secours ; critères observables explicites.
- Le domaine complément porte une intention d'exploration, jamais un produit,
  une forme ou une dose avant C4.
- Aucune activation ou diffusion avant validation praticien.

### Contrat intrinsèque/contextuel

Contrat de domaine neutre partagé par C4 et C5 : un profil intrinsèque est
calculé indépendamment du patient ; une lecture contextuelle consomme une
priorité validée et un protocole actif sans réécrire ce profil. C4 et C5
possèdent leurs sources, règles et adaptateurs respectifs.

## Journal alimentaire JA

- Première tranche en TypeScript pur, sans Prisma : saisie rapide, favoris,
  copie, correction et suppression.
- Voix, photo, offline et rappel rétrospectif sont différés.
- Le journal publie des observations et discordances ; il ne calcule aucun
  score SIIN officiel et ne projette aucune réponse vers `Q_ALI_01` ou
  `Q_ALI_02`.
- Les 25 marqueurs, neuf axes, règles de couverture, fiabilité et rétention
  restent candidats jusqu'à revue clinique documentée.

## Corpus clinique

- Le registre Git est sanitaire et non activable. Les localisateurs Drive
  restent dans un registre externe restreint.
- G0 droits, G1 taxonomie/contrats, G2 extraction, G3 claims/conflits et G4
  firewall/runtime précèdent toute ingestion ou recherche.
- G5 exige une autorisation distincte avant PostgreSQL/pgvector.
- G6 est le go/no-go praticien du seul pilote initial
  sommeil/chronobiologie.
- Le corpus runtime V1 existant reste dans son état non validé ; aucune
  activation implicite par cette architecture.

## Séquence des futures PR

1. Orchestration `.wn` autoritaire et testée.
2. Contrats C1 purs, adaptateurs et tests de non-régression, sans Prisma.
3. Règles C1 après validation clinique documentée seulement.
4. Domaine JA pur et revue des marqueurs/axes.
5. C5A intrinsèque, puis C5B contextuel après priorité C1 validée.
6. C2 persistant après gate migration explicite.
7. Corpus pilote puis runtime selon G0–G6.

Chaque PR vérifie absence ≠ zéro, unités, sérialisation stable, provenance,
absence de données patient réelles, contrôle anti-secrets, type-check et
certification du scoring existant.
