---
id: "wellneuro-patch-campagnes-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Amendements aux campagnes

## HC-F

Conserver son rôle de fondation UX. LOT-04 est terminé ; terminer LOT-05.
Aucun métier clinique supplémentaire ne doit y être ajouté.

## C1

Amender les lots :

| Lot | Nouveau contenu |
|---|---|
| LOT-00 | audit réel, décisions, sources et écrans |
| LOT-01 | contrats, AssessmentEpisode, adaptateurs et snapshot |
| LOT-02 | signaux, manques, discordances, sécurité |
| LOT-03 | DecisionCard et cockpit de décision |
| LOT-04 | ProtocolDraft et charge |
| LOT-05 | ModeConsultation, aperçu patient, validation |
| LOT-06 | tests, documentation, handoff |

C1 consomme Mon équilibre par API publique.

## C2

Scinder clairement :

### C2A

- persistance minimale ;
- protocole actif ;
- check-ins ;
- timeline ;
- journal ;
- AssessmentEpisode ;
- PhaseReview.

### C2B

- momentum et comparateur ;
- aide à l’ajustement ;
- seulement après données réelles.

Les check-ins n’alimentent pas Mon équilibre.

## C3

C3 reçoit :

- snapshot ;
- décision ;
- protocole ;
- phase review ;
- blocs publiés.

C3 ne crée pas de contenu clinique source.

## C4

### C4A

Catalogue intrinsèque et sécurité.

### C4B

Compatibilité contextuelle après C1.

C4 ne sélectionne pas automatiquement un produit.

## C5

> Proposition non arbitrée : la répartition ci-dessous diffère de la
> répartition C5A/C5B actuellement normative dans
> `docs/claude/REGISTRE_FRONTIERES.md`. Ne pas l'appliquer sans décision
> produit explicite.

### C5A

Taxonomie, données et profils intrinsèques.

### C5B

Action alimentaire, journal et contexte patient.

Le journal peut être techniquement démarré avant C5B, mais son activation dépend du protocole actif.

## C1B

Installer sous `_prepared`, avec huit lots et gates G0–G6.

## QX

Maintenir l’intégrité psychométrique et le périmètre pilote.

## WN-AUTO

Étendre les garde-fous aux migrations, publications corpus, audiences et clôtures.
