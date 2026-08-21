# Brief compile - 6.0-B — Charge et capacité d'exécution

_Genere le 2026-08-21 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-21-charge-et-capacite
- Fichier final : docs/claude/campagnes/2026-08-21-charge-et-capacite/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md - Brief — 6.0-B : Charge et capacité d'exécution

## 1. Intention metier

- Optimiser ce que le patient peut réellement faire maintenant, pas seulement (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- ce qu'il faudrait idéalement faire. La campagne adapte la **charge** proposée (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- au patient — présentation, volume, séquencement du protocole — et **jamais le (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- fond clinique** : aucun seuil, aucune indication, aucune règle de scoring ne (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- bouge (DC-17, DC-18). Référence d'architecture : §8 de l'audit du 2026-08-21. (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- Le système sait aujourd'hui dire quoi faire ; il ne sait pas distinguer un (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- patient qui « n'a pas suivi » d'un patient dont le protocole « dépassait sa (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- capacité d'exécution ». Cette distinction est la matière première de la (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- campagne : elle se capte, se trace, s'affiche au praticien — elle ne (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- s'interprète jamais automatiquement. (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)

## 2. Probleme a resoudre

- A completer.

## 3. Utilisateurs concernes

- A completer.

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- 1. **Budget d'effort du cycle** : le patient déclare un budget 1-5 en début (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- de cycle ; ce budget module la **présentation** du protocole (ordre, (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- 2. **« Trop lourd » → « Simplifier mon protocole »** : le patient signale la (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- surcharge ; le système propose une version minimale **issue du plan déjà (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- prévu** par le praticien — sélection dans l'existant certifié, jamais (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- 3. **Mode « cette semaine est compliquée »** : bascule vers le minimum (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- viable, SANS interprétation clinique automatique (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- 4. **Check-in v3 additif** : porte d'entrée mieux / pareil / moins bien, (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- puis progressive disclosure. Catalogue **gelé longueur 4**, extension (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- strictement additive et versionnée, contrat `c2a-checkin-v1` (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)

## 6. Donnees / modeles / integrations pressenties

- L'ancrage parfait existe déjà : `ProtocolDraft` est append-only chaîné (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- (`supersedesDraftId`), sur le patron du dépôt (chaînage append-only, deux (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- dates, versions hash-verrouillées façon `trust/contenus/registre.ts`, (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- garde structurelle par test). (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)

## 7. Contraintes projet

- **Arbitrage A1, gravé au schéma** : le check-in est un instrument de (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- **pilotage**, jamais un score ni un indicateur agrégé d'alliance (DC-27). (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- **Toute évolution de catalogue** = décision `D-xxx` + fragment (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- `changelog.d/` (DC-17, DC-18). (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- Un signal de sécurité prime sur toute logique de charge (DC-12, DC-23). (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- Migration Prisma éventuelle : confirmation obligatoire, migration seule (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- dans sa PR, release-db entre elle et le code. (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)

## 8. Risques et dependances

- **Entrée : 6.0-A livrée** — les objets d'objectif existent. Tant que ce (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- gate n'est pas levé, la campagne ne s'ouvre pas ; ce dossier reste (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)
- init-only. (docs/claude/campagnes/2026-08-21-charge-et-capacite/sources/brief-charge-et-capacite.md)

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
