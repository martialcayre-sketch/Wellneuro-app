---
id: "LOT-01"
titre: "Contrats cliniques et décisionnels"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Contrats cliniques et décisionnels

## But

Définir les contrats de la carte de décision, du protocole 21 jours, des
signaux, des données manquantes, des discordances et de la validation.

## Résultat observable

Des types et invariants testables, précédés par la validation praticien des
poids, seuils, règles d'abstention et budget de charge concernés.

## Périmètre

- provenance A/B/C/D et état « non mesuré » ;
- DecisionCard et ProtocolDraft ;
- trois actions maximum, plans idéal/minimal/secours ;
- règles de charge, blocage et validation.

## Hors périmètre

- migration Prisma/SQL ;
- persistance longitudinale ;
- contenu clinique inventé ou non validé.

## Fichiers probables

- `web/src/lib/equilibre/`
- futurs contrats C1 sous `web/src/lib/clinical-engine/`
- `CHANGELOG.md` pour toute décision clinique validée

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [x] Vérifier les hypothèses.
- [x] Implémenter le changement minimal.
- [x] Exécuter les validations.
- [x] Relire le diff.
- [x] Documenter les résultats.

## Tests

Tests unitaires purs des contrats et invariants ; `npm run type-check` et
tests ciblés du moteur clinique.

## Critères de done

- décisions cliniques explicitement validées et tracées ;
- absence jamais assimilée à zéro ;
- contrats versionnés et testés ;
- aucune migration.

## Résultats

La campagne compilée et `docs/claude/ARCHITECTURE_CLINIQUE_3_2.md` ont été
retenues comme sources normatives face au texte historique de ce lot. Le
périmètre livré se limite donc à `AssessmentEpisode`, `ClinicalSnapshot`,
leurs adaptateurs, leurs versions, leurs unités et leur hash canonique.
`DecisionCard`, `ProtocolDraft`, les signaux, la charge et les règles
d'abstention restent attribués aux LOT-02 à LOT-04.

### Livrables

- contrats TypeScript purs sous `web/src/lib/clinical-engine/`, sans Prisma ni
  dépendance UI ;
- proposition d'épisodes T0/J21/J42/J90 dans la fenêtre existante de ±8 jours,
  réponses hors fenêtre visibles et confirmation/correction explicite ;
- snapshot construit uniquement depuis un épisode confirmé, avec mesures
  typées, trois strates, douze besoins, cinq objets cliniques, provenance,
  complétude, limites et versions ;
- adaptation par les API publiques de `web/src/lib/equilibre/`, sans
  réimplémentation ni modification du scoring ;
- sérialisation JSON canonique et SHA-256 d'intégrité, explicitement sans
  propriété d'anonymisation ou de pseudonymisation ;
- réponses historiques sans `rawAnswers` conservées comme sources non
  calculables, jamais transformées en zéro ; version questionnaire inconnue
  conservée à `null` avec une limitation explicite.

### Validations

- Vitest ciblé `clinical-engine` + `equilibre` : 8 fichiers, 55 tests verts ;
- `npm run type-check` : OK ;
- `npm run scoring-check` : 63 questionnaires certifiés, OK ;
- `npm run lint` : OK ;
- `bash scripts/check_no_secrets.sh` : OK ;
- `git diff --check` : OK.

Aucune route API, migration Prisma/SQL, écriture Supabase, donnée patient
réelle, formule, seuil ou logique clinique n'a été ajoutée ou modifiée.
