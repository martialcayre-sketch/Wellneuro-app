---
id: "2026-07-11-alignement-documentaire-etat-reel"
titre: "Alignement documentaire et état réel du dépôt"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-00"
---

# Alignement documentaire et état réel du dépôt

## Objectif

Vérifier puis aligner `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`, `docs/claude/PROJET_CONTEXTE.md` et l’état réel du code, sans modifier le comportement applicatif.

## Résultat observable

Une matrice d’écarts validée, une documentation minimale corrigée et un handoff autorisant ou bloquant la campagne « Décision clinique 21 jours V1 ».

## Contraintes non négociables

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Hors périmètre global

- Modification de routes API
- Refactor OAuth
- Suppression de code legacy
- Changement de schéma Prisma
- Travail UX

## Décisions prises

- Aucun code métier n’est modifié dans cette campagne.
- Le code réel et la dernière entrée du SESSION_LOG prévalent sur une roadmap ancienne.
- Toute divergence est documentée avant correction.

## Questions ouvertes

- Quelles routes utilisent encore réellement Google Sheets ou les scopes OAuth associés ?
- Quelle documentation devient canonique après alignement ?
- Existe-t-il une dette de pagination ou de compatibilité encore bloquante pour le cockpit ?

## Dépendances

- Aucune — campagne préalable obligatoire.

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d’origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit des sources de vérité | à_faire | aucun |
| LOT-01 | Vérification read-only des routes Sheets et OAuth | à_faire | LOT-00 |
| LOT-02 | Corrections documentaires minimales | à_faire | LOT-01 |
| LOT-03 | Validation et handoff | à_faire | LOT-02 |

## Commande `/wn` de reproduction

```text
/wn creer "Alignement documentaire et état réel du dépôt" --source docs/claude/wellneuro-3 --slug alignement-documentaire-etat-reel --lots 4 --auto-final --activate
```

## Done de campagne

- [ ] La source de vérité documentaire est explicite.
- [ ] L’état Sheets/OAuth est vérifié dans le code.
- [ ] Les corrections documentaires minimales sont relues.
- [ ] Aucun comportement applicatif n’a changé.
- [ ] Le handoff indique clairement si la campagne suivante peut démarrer.

## Backlog ultérieur

- Corrections techniques identifiées mais hors campagne, chacune convertie en campagne WN distincte.
