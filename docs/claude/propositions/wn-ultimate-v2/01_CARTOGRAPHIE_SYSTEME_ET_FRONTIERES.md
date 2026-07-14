---
id: "wellneuro-cartographie-systeme-frontieres-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Cartographie du système et frontières

## 1. Carte fonctionnelle

| Brique | Type | Possède | Ne possède pas |
|---|---|---|---|
| Questionnaires | collecte et mesure | réponses, scores officiels | décision, protocole |
| QX | expérience de saisie | rendu, accessibilité, sauvegarde | contenu psychométrique |
| Anamnèse / contexte | collecte clinique | contraintes, traitements, objectifs | score d’équilibre |
| Vigilances | sécurité déterministe | flags et blockers | rédaction finale |
| Mon équilibre | mesure transversale | 12 besoins, strates, indice, fondations | décision et action |
| Objets cliniques | read models | clarté, réserve, stabilité, momentum | recommandation autonome |
| ClinicalSnapshot | contrat pivot | photographie sourcée | priorité |
| Moteur de signaux | qualification | signaux, manques, discordances | texte patient final |
| C1 | décision | DecisionCard, ProtocolDraft | suivi longitudinal |
| C2 | suivi | check-ins, PhaseReview | formule Mon équilibre |
| Journal alimentaire | observation | DietaryTrajectoryFinding | score SIIN officiel |
| C3 | documents | composition multi-audience | vérité clinique |
| C4 | bibliothèque compléments | données intrinsèques et sécurité | priorité patient |
| C5 | alimentation | actions, aliments, Boussole | décision clinique globale |
| C1B | connaissance | claims, règles, blocs publiés | dossier patient |
| Synthèse IA | formulation | brouillons et explications | validation |
| Booklet | restitution | DocumentInstance | recalcul clinique |
| HC-F | design / UX | composants et mécanismes | métier clinique |
| `/wn-*` | gouvernance dev | campagnes, audits, tests | autorité clinique |

## 2. Contrats entre campagnes

### HC-F → C1/QX/C2/C3/C5

HC-F fournit :

- shell et tokens ;
- `ModeConsultation` ;
- `TwoLevelReading` ;
- `PrévisualisationPatient` ;
- états de sauvegarde ;
- règles d’audience ;
- composants de navigation.

Les campagnes métier les instancient sans les dupliquer.

### Mon équilibre → C1

C1 consomme uniquement les API publiques :

- `calculerEquilibre` ;
- couvertures des 12 besoins ;
- objets cliniques ;
- momentum ;
- versions.

C1 ne réimplémente jamais les formules.

### C1 → C2/C3/C4/C5

C1 fournit :

- priorité validée ;
- intentions ;
- ProtocolDraft ;
- actions ;
- critères observables ;
- contraintes de phase.

### C2 → nouvelle décision

C2 fournit :

- tolérance ;
- ressenti ;
- adhésion ;
- événements ;
- résumé J21 ;
- décision de poursuivre, simplifier, ajuster, arrêter ou réévaluer.

### C1B → C1/C3/C4/C5

C1B fournit seulement des objets publiés :

- claims ;
- KnowledgeCards ;
- RuleDefinitions ;
- InterventionBlocks ;
- SafetyStatements ;
- PatientContentBlocks.

## 3. Lectures à ne pas fusionner

| Lecture | Objet |
|---|---|
| Mesure questionnaire | QuestionnaireFinding |
| Équilibre transversal | BalanceAssessment |
| Raccourci praticien | ClinicalObjectFinding |
| Suivi de mesure | MomentumFinding |
| Observation alimentaire | DietaryTrajectoryFinding |
| Suivi d’une action | ActionOutcome |
| Ressenti patient | CheckinFinding |
| Décision | DecisionCard |
| Protocole | ProtocolDraft |

Une convergence peut être calculée. Les objets sources ne sont jamais écrasés.

## 4. J21 : point de jonction

Le J21 rapproche :

- BalanceAssessment T0 et J21 ;
- momentum ;
- check-ins ;
- trajectoire alimentaire ;
- action outcomes ;
- événements de sécurité ;
- données manquantes ;
- version du protocole.

Il ne produit pas une moyenne de tout.

## 5. Frontière patient/praticien

### Patient

Le patient voit :

- formulation calme ;
- objectifs et actions validés ;
- progression factuelle ;
- besoins en langage accessible ;
- documents publiés ;
- saisies et correction de ses données.

### Praticien

Le praticien voit en plus :

- scores et sous-scores ;
- provenance A/B/C/D ;
- règles ;
- discordances ;
- contre-factuels ;
- blockers ;
- claims et limites ;
- notes internes.

## 6. Portail patient cible

```text
/portail/[token]/accueil
/portail/[token]/questionnaires
/portail/[token]/equilibre
/portail/[token]/programme
/portail/[token]/journal-alimentaire
/portail/[token]/suivi
/portail/[token]/documents
```

L’assignation reste un objet de collecte. L’identité fonctionnelle du portail est le patient authentifié.

## 7. Modules différés

- biologie réelle avant HDS ;
- OCR clinique non borné ;
- messagerie libre analysée automatiquement ;
- notification autonome ;
- score de décrochage ;
- scanner et panier automatisé ;
- prescription autonome ;
- système de diagnostic ;
- ingestion de tout le corpus avant pilote.
