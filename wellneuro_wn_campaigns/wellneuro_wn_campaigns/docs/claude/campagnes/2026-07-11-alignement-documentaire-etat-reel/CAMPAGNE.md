---
id: "2026-07-11-alignement-documentaire-etat-reel"
titre: "Alignement documentaire et état réel du dépôt"
statut: "terminé"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-03"
---

# Alignement documentaire et état réel du dépôt

## Objectif

Vérifier puis aligner `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`, `docs/claude/PROJET_CONTEXTE.md` et l'état réel du code, sans modifier le comportement applicatif.

## Résultat observable

Une matrice d'écarts validée, une documentation minimale corrigée et un handoff autorisant ou bloquant la campagne « Décision clinique 21 jours V1 ».

## Contraintes non négociables

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Hors périmètre global

- Modification de routes API
- Refactor OAuth
- Suppression de code legacy
- Changement de schéma Prisma
- Travail UX

## Décisions prises

- Aucun code métier n'est modifié dans cette campagne.
- Le code réel et la dernière entrée du SESSION_LOG prévalent sur une roadmap ancienne.
- Toute divergence est documentée avant correction.

## Questions ouvertes

- ~~Quelles routes utilisent encore réellement Google Sheets ou les scopes OAuth associés ?~~ Répondu par LOT-00/LOT-01 (2026-07-11) : aucune. Scope OAuth = `openid email profile`, zéro appel Sheets actif, `SHEET_ID`/`migrate-historique` absents du code.
- Quelle documentation devient canonique après alignement ? `docs/claude/PROJET_CONTEXTE.md` et `docs/ROADMAP_TECHNIQUE.md` restent les sources canoniques (déjà à jour après correction LOT-02 de la ligne R8).
- Existe-t-il une dette de pagination ou de compatibilité encore bloquante pour le cockpit ? Non auditée (hors périmètre de C0) — non bloquante, reportée à une campagne technique future si besoin.
- Clarification LOT-03 : le handoff de C0 pointe vers **C0-UX** (`2026-07-11-refonte-ux-shell-3-0`), pas directement vers C1 — voir `PROGRAMME_WELLNEURO_3_0.md`, C1 dépend de « C0 + C0-UX » et C0-UX n'a pas encore démarré (LOT-00 à_faire).

## Dépendances

- Aucune — campagne préalable obligatoire.

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d'origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit des sources de vérité | terminé | aucun |
| LOT-01 | Vérification read-only des routes Sheets et OAuth | terminé | LOT-00 |
| LOT-02 | Corrections documentaires minimales | terminé | LOT-01 |
| LOT-03 | Validation et handoff | terminé | LOT-02 |

## Commande `/wn` de reproduction

```text
/wn-campaign creer "Alignement documentaire et état réel du dépôt" --source docs/claude/wellneuro-3 --lots 4 --auto-final --activate
```

## Done de campagne

- [x] La source de vérité documentaire est explicite.
- [x] L'état Sheets/OAuth est vérifié dans le code.
- [x] Les corrections documentaires minimales sont relues.
- [x] Aucun comportement applicatif n'a changé.
- [x] Le handoff indique clairement si la campagne suivante peut démarrer.

## Backlog ultérieur

- Corrections techniques identifiées mais hors campagne, chacune convertie en campagne WN distincte.
