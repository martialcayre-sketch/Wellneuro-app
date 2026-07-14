---
id: "wellneuro-integration-outils-existants-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Intégration des outils existants

## 1. Principe

Les outils déjà développés sont conservés comme briques spécialisées. Le nouveau moteur clinique ajoute des adaptateurs, des contrats et une orchestration.

## 2. Mon équilibre

### État existant

Le dépôt contient un moteur déterministe :

- mapping de questionnaires vers les 12 besoins ;
- polarité « plus haut = mieux » ;
- valeurs `null` lorsque non évaluables ;
- strates 60/20/20 ;
- plafonnement par fondations critiques ;
- version du score ;
- API patient-safe ;
- historique T0/J21/J42/J90.

### Intégration

Créer :

```text
web/src/lib/clinical-engine/adapters/equilibriumAdapter.ts
```

Responsabilités :

- appeler les API publiques de `web/src/lib/equilibre/` ;
- convertir le résultat en `BalanceAssessment` ;
- conserver `versionScore` ;
- conserver les besoins non mesurés ;
- produire les limites et la fraîcheur ;
- ne pas réimplémenter de formule.

## 3. Cinq objets cliniques

Créer un registre :

```text
web/src/lib/clinical-engine/read-models/clinicalObjectDefinitions.ts
```

Chaque définition contient :

- code ;
- libellé praticien ;
- formule ou fonction publique ;
- version ;
- sources ;
- limites ;
- statut expérimental/interne/publié.

Les objets sont affichables et utilisables comme éléments de convergence, jamais comme déclencheurs autonomes.

## 4. Momentum

Le module historique existant reste propriétaire des jalons de mesure.

Ajouter :

- comparabilité par `versionScore` ;
- limites explicites ;
- période de collecte ;
- séparation entre delta de score et appréciation clinique.

C2 consomme `MomentumFinding` ; il ne le recalcule pas.

## 5. Questionnaires et QX

Les questionnaires restent la source officielle de leurs scores.

QX peut modifier :

- composants ;
- navigation ;
- sauvegarde ;
- accessibilité ;
- messages ;
- rendu mobile.

QX ne peut pas modifier sans certification :

- texte ;
- ordre ;
- échelle ;
- scoring ;
- seuils ;
- population cible ;
- licence.

Créer un `QuestionnaireFindingAdapter` qui transforme la sortie hétérogène de scoring en findings homogènes.

## 6. Anamnèse, traitements et compléments

Normaliser vers :

- `PatientContextFinding` ;
- `MedicationFinding` ;
- `SupplementFinding` ;
- `PatientConstraint` ;
- `SafetyFinding`.

Les données de traitement et d’allergie passent avant les candidats d’intervention.

## 7. Vigilances déterministes

Les vigilances existantes sont intégrées au snapshot avec :

- code stable ;
- sévérité ;
- règle ;
- version ;
- action requise ;
- source.

Les blockers empêchent la validation du protocole.

## 8. Synthèse IA

### Avant

```text
JSON hétérogène → prompt global → texte
```

### Cible

```text
ClinicalSnapshot
+ DecisionCard
+ ProtocolDraft
+ corpus publié
→ SynthesisInstance
```

La synthèse conserve :

- snapshot ;
- décision ;
- protocole ;
- corpus ;
- prompt ;
- modèle ;
- statut de validation.

## 9. Booklet et documents

Le booklet devient une `DocumentInstance`.

Il consomme des objets validés. Il ne :

- recalcule pas Mon équilibre ;
- ne choisit pas la priorité ;
- ne complète pas une donnée manquante ;
- n’invente pas une analyse.

C3 possède les templates, la composition, les audiences et le rendu.

## 10. HC-F

### `ModeConsultation`

Montre uniquement :

- résumé décisionnel ;
- limite principale ;
- priorité ;
- trois actions ;
- décision attendue.

### `TwoLevelReading`

Niveau 1 : comprendre et décider.

Niveau 2 : sources, scores, règles, limites, historique.

Les deux niveaux lisent les mêmes objets.

### `PrévisualisationPatient`

Transforme les objets validés en vue filtrée. Elle retire les notes internes et hypothèses non validées.

## 11. Portail patient

L’API actuelle Mon équilibre est conservée durant la transition.

Cible :

- endpoint patient lié à la session permanente ;
- suppression progressive de la dépendance à une assignation arbitraire ;
- séparation entre collecte et identité portail ;
- routes permanentes pour équilibre, programme, journal, suivi et documents.

## 12. Intentions cliniques existantes

Les modèles ou schémas d’intentions déjà présents sont réutilisés après audit :

- harmoniser leurs codes avec `InterventionIntent` ;
- séparer intention et produit ;
- rattacher sécurité et provenance ;
- ne pas lier directement un score à un produit.

## 13. Plan d’adaptation minimal

1. adaptateur questionnaires ;
2. adaptateur Mon équilibre ;
3. registre des objets cliniques ;
4. snapshot builder ;
5. signaux/manques/discordances/sécurité ;
6. DecisionCard ;
7. ProtocolDraft ;
8. vues HC-F ;
9. synthèse et documents ;
10. suivi.

## 14. Interdits

- dupliquer le score Mon équilibre dans C1 ;
- utiliser les check-ins comme mesures des 12 besoins ;
- agréger adhésion et score clinique ;
- exposer A/B/C/D au patient sans design dédié ;
- introduire une seconde terminologie de score ;
- conserver un accès patient permanent dépendant d’une seule assignation.
