# Brief compile - 6.0-D — Le jumeau de compréhension

_Genere le 2026-08-21 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-21-jumeau-de-comprehension
- Fichier final : docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md - Brief — 6.0-D : Le jumeau de compréhension

## 1. Intention metier

- La signature conceptuelle de 6.0 : un modèle **partagé** de la compréhension (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- du patient — pas un jumeau biologique. Les représentations du patient et du (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- praticien sur quatre dimensions (problème principal, cause perçue, priorité, (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- critère de réussite) sont posées côte à côte, versionnées, leurs écarts (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- rendus visibles, leur convergence suivie dans le temps. Le but n'est **jamais (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- de décider qui a raison** : un écart est un objet clinique en soi, il se (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- signale, ne se moyenne ni ne se supprime (`DC-30`). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- Référence d'architecture : §8 de l'audit du 2026-08-21, et les patrons déjà (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- éprouvés dans le dépôt — append-only chaîné, versions hash-verrouillées façon (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- `web/src/lib/trust/contenus/registre.ts`, deux dates (événement / connaissance), (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- garde structurelle par test. (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- 1. **L'objet de données** : quatre dimensions × deux voix, append-only (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- versionné (patron supersedes), corrigible par le patient — le canal (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- « Ce n'est pas exactement ça » du 6.0-A est la voie de correction — (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- rattaché à l'épisode. (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- 2. **Les deux écrans** : vue praticien avec écarts saillants, vue patient (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- en langage traduit. (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- 3. **« Le prochain choix ensemble »** : à chaque jalon T0/J21/J42/J90, trois (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- voies nommées — Consolider / Ajuster / Explorer — choisies par le (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- praticien, montrables au patient : la structure narrative du suivi. (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)

## 2. Probleme a resoudre

- A completer.

## 3. Utilisateurs concernes

- Praticien (vue écarts, choix des voies aux jalons) et patient (vue traduite,
  canal de correction). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- A completer.

## 6. Donnees / modeles / integrations pressenties

- Objet append-only versionné (patron supersedes), rattaché à l'épisode,
  deux dates par version, garde structurelle par test — aucun champ numérique
  de certitude, de poids ou de score (leçon `D-044`). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)

## 7. Contraintes projet

- Une représentation patient n'est jamais réinterprétée en donnée clinique (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- sans validation praticien. (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- Les écarts patient/praticien se signalent, jamais ne se moyennent ni ne se (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- suppriment (`DC-30`). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- Aucune des quatre cases ne devient un score (`DC-27`). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- Toute évolution de la sémantique de l'objet = décision `D-xxx` + fragment (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- `changelog.d/` (`DC-17`, `DC-18`). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- Migration Prisma : confirmation explicite, migration seule dans sa PR, (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)
- chemin release-db uniquement. (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)

## 8. Risques et dependances

- Gates : 6.0-A (objectif, compréhension — canal « Ce n'est pas exactement
  ça ») et 6.0-C (hypothèses partagées). (docs/claude/campagnes/2026-08-21-jumeau-de-comprehension/sources/brief-jumeau-de-comprehension.md)

## 9. Decisions a prendre

- A completer.

## 10. Decoupage recommande

- R0 : audit de l'existant et clarification du perimetre, sans modification.
- R1 : contrat fonctionnel, UX et checklist E2E.
- R2 : tranche verticale minimale sur le scenario principal.
- R3 : donnees / integrations / persistance, apres validation du besoin.
- R4 : compatibilite legacy et cas limites.
- R5 : UI, durcissement, securite et accessibilite.
- R6 : tests, documentation et decision go/no-go.

## Materiau non classe a relire

- Aucun.
