---
id: "LOT-01"
titre: "Spécification du modèle et gate migration"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Spécification du modèle et gate migration

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-01-spec-modele-gate.md`.
> La proposition de travail est `../SPEC_LOT-01_MODELE_PERSISTANCE.md`
> (document seul, rédigé à la compilation) : ce lot la valide, l'amende et
> consigne la checklist de confirmation — il ne repart pas de zéro.

## But

Formaliser le schéma cible, l'API et la stratégie de migration **sans
l'exécuter**.

## Décision de nommage (ADR, actée à la compilation)

Nommage **registre 5.0** : `AssessmentEpisode`, `ProtocolDraft`,
`ProtocolCheckin`, `RelectureNote` (décision A6-1) — mêmes noms que les
contrats réels de `web/src/lib/clinical-engine/types.ts`. L'alternative
`CarePlan`/`CarePlanPhase`/`CareAction` du brouillon initial est **écartée** :
elle introduirait une couche de renommage entre le code C1 livré et la base,
sans bénéfice. Détail et conséquences : `../SPEC_LOT-01_MODELE_PERSISTANCE.md`.

## Résultat observable

ADR/modèle validé et checklist de confirmation du gate prête à être soumise
à l'utilisateur.

## Périmètre

- Spécifier `assessment_episodes`, `protocol_drafts`, `protocol_checkins`,
  `relecture_notes` : index, relations, statuts, stratégie de suppression.
- Définir la compatibilité avec le protocole local V1 (brouillon
  `ProtocolDraft` en mémoire, hashes `inputHash` conservés).
- Comparer stocker vs recalculer les snapshots.
- Consigner la checklist de confirmation du gate (voir spec, section 6).

## Hors périmètre

- Modifier `schema.prisma`.
- Lancer Prisma migrate.

## Fichiers probables

- `docs/claude/**` (spec, ADR)
- `web/prisma/schema.prisma` en lecture seulement
- Types protocole existants (`clinical-engine/types.ts`, lecture seule)

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Valider/amender la spec (diagramme, contrats, index).
- [ ] Comparer les alternatives stocker/calculer pour les snapshots.
- [ ] Valider la minimisation des données.
- [ ] Finaliser la checklist de confirmation — la confirmation elle-même
      relève de l'utilisateur, avant LOT-02.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `node scripts/wn-campaign-audit.mjs` (vert)

## Critères de done

- [ ] La migration est estimable et réversible (additive-only, rollback documenté).
- [ ] La checklist de confirmation est consignée avant LOT-02.

## Risques / points de vigilance

- Transformer le modèle V1 en plateforme générique trop tôt.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
