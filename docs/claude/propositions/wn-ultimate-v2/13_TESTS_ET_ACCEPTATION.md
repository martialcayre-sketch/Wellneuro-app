---
id: "wellneuro-tests-acceptation-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Tests et critères d’acceptation

## 1. Pyramide

### Unitaires purs

- scoring ;
- adaptateurs ;
- snapshot ;
- signaux ;
- manques ;
- discordances ;
- charge ;
- journal ;
- projections ;
- corpus.

### Contrats

- schémas ;
- sérialisation ;
- versions ;
- hashes ;
- audience ;
- idempotence.

### Intégration

- Prisma après gate ;
- API ;
- RLS ;
- portail ;
- validation.

### E2E

- Sophie Nicola ;
- Jennifer Martin ;
- Michel Dogné ;
- aucun patient réel.

## 2. Invariants à tester

- absence ≠ zéro ;
- polarité cohérente ;
- besoin non mesuré visible ;
- fondation critique non masquée ;
- score identique avant/après adaptateur ;
- check-in sans impact sur Mon équilibre ;
- journal sans score SIIN officiel ;
- conflit corpus bloque publication ;
- patient ne voit pas notes internes ;
- protocole excessif bloque ;
- aucune diffusion sans validation.

## 3. Replay clinique

Chaque modification de règle rejoue les fixtures et produit :

- ancien résultat ;
- nouveau résultat ;
- objets modifiés ;
- justification ;
- décision go/no-go.

## 4. Journal

Tester :

- jours partiels ;
- jours atypiques ;
- rappels ;
- couvertures ;
- dénominateurs ;
- `max_events_per_day` ;
- opportunités repas ;
- conflits de synchronisation ;
- correction et suppression ;
- feature flags ;
- purge locale.

## 5. Corpus

Tester :

- hash ;
- déduplication ;
- ancrage page ;
- claims orphelins ;
- conflits ;
- audience ;
- firewall ;
- build candidat ;
- publication ;
- rollback ;
- SourceDelta.

## 6. Performance produit

- cockpit compris en moins de deux minutes ;
- protocole préparé en moins de dix minutes ;
- saisie journal usuelle en moins d’une minute ;
- clôture quotidienne en cinq interactions environ ;
- vue patient compréhensible sans jargon.

## 7. Accessibilité et sécurité

- clavier ;
- contraste ;
- lecteur d’écran ;
- mobile ;
- aucun secret ;
- logs sans données sensibles ;
- contrôle d’accès patient/praticien ;
- correction RGPD ;
- révocation du portail ;
- limitation des exports.

## 8. Definition of Done globale

- tests verts ;
- documentation synchronisée ;
- versions enregistrées ;
- provenance complète ;
- gates signés ;
- pas de migration implicite ;
- handoff ;
- changelog ;
- go/no-go.
