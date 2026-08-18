# Brief compile - Biologie consolidée — fermer les dettes de la surface vivante

_Genere le 2026-08-18 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-18-biologie-consolidee
- Fichier final : docs/claude/campagnes/2026-08-18-biologie-consolidee/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md - Brief — Biologie consolidée : fermer les dettes de la surface vivante

## 1. Intention metier

- La proposition de bilan biologique et le courrier médecin ancré sont en (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- production depuis le 2026-08-18 (`WN_CB_PROPOSITION` posé, campagne T0 close, (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- PR #710). Trois dettes ont été nommées à la clôture, aucune soldée. La (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- campagne les ferme : l'ancrage devient une garde lue, la surface a des (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- parcours joués, et le garde-fou des packs devient un contrat. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- `ancrage_sha256`/`ancrage_version` (D-073) sont en ÉCRITURE SEULE : aucun (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- (fragment changelog `2026-08-18-courrier-biologie-branchement-lot06-clos.md`). (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- Aucun E2E ne couvre la proposition ni le courrier, alors que la surface est (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- Le prérequis « aucun pack actif ne référence un qid de `IDS_SUSPENDUS` » (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- (2026-08-06 18:02) et sa réserve est écrite à la clôture de (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- dettes-packs-residuelles (:161-170). (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- 1. **Lecteur d'ancrage dans le fil de correspondance** : afficher (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- « concordante / périmée » en comparant l'ancre consignée au SHA vivant de (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- uniquement (Sophie Nicola, Jennifer Martin, Michel Dogné). E2E exclusifs (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- au Mac, jamais deux runs en parallèle. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- garde-fou cassé une fois devient un contrat joué par le CI. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)

## 2. Probleme a resoudre

- A completer.

## 3. Utilisateurs concernes

- jamais le patient dans son texte (minimisation, seul `id_patient` relie). (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- 2. **E2E proposition + courrier** : parcours praticien complet (dossier → (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- panneau → déclaration panel documenté → courrier), patients fictifs (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- A completer.

## 6. Donnees / modeles / integrations pressenties

- chemin de lecture ne les expose ni ne les compare à la table courante (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- n'est asséré par aucun contrat `prisma/checks` — il a déjà cassé une fois (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- la table — c'est ce qui fait des colonnes D-073 la garde promise. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- 3. **Contrat `prisma/checks` packs actifs vs instruments suspendus** — le (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- intouchable sauf décision clinique D-xxx (tables signées). (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)

## 7. Contraintes projet

- `indicationsBiologieV1.ts`, `statuts.ts`, `courrier.ts` : périmètre (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- Aucune migration prévue ; si un lot en découvre une, il se scinde. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- Textes UI en français ; DC-34 (explicabilité) guide le lot 1. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)
- Aucune externe. Peut suivre immédiatement la clôture T0. (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)

## 8. Risques et dependances

- A completer.

## 9. Decisions a prendre

- Question à confirmer comme choix, pas comme oubli : le courrier ne nomme (docs/claude/campagnes/2026-08-18-biologie-consolidee/sources/brief-biologie-consolidee.md)

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
