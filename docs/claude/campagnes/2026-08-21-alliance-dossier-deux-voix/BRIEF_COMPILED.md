# Brief compile - Alliance 6.0-A — le dossier à deux voix

_Genere le 2026-08-21 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix
- Fichier final : docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md - Brief — Alliance 6.0-A : le dossier à deux voix

## 1. Intention metier

- Donner au dossier les objets qui rendent la négociation clinique **visible** : (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- ce que le patient demande, ce que le praticien en comprend, ce qui est (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- priorisé, ce qui est assumé « non traité pour l'instant ». C'est la réponse (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- produit au trou Éducation thérapeutique de l'audit du 2026-08-21 (§8) — (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- aucune occurrence ETP dans `web/src`, greps confirmés au moment de l'audit. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Cette campagne se livre **AVANT** l'activation élargie du chemin (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- protocole→produits : `priorityRulesV1` est signée depuis le 2026-08-16, et la (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- ratification patient (l'objectif négocié) doit précéder toute recommandation (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- élargie qui s'en réclamerait. L'ordre est un gate, pas une préférence. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- 1. **Objectif négocié v1** — modèle append-only : énoncé patient, (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- 2. **« Ce qui compte pour moi aujourd'hui »** — champ libre patient, (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- 3. **« Ce que j'ai compris de vous »** — synthèse de compréhension rédigée (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- 4. **EVA — voie instrument cabinet** — cycle brouillon → grille_a_relire → (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)

## 2. Probleme a resoudre

- Les champs attentes/motif de l'anamnèse existent (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- (`web/src/lib/consultation/anamnese.ts`) mais sont **figés en JSON à la (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- validation** : aucune trajectoire, aucune reformulation, aucun désaccord (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- possible après coup. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Le seul canal de contestation patient existant est le **déverrouillage de (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- questionnaire** — il rejoue une saisie, il n'exprime pas un désaccord sur (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- une compréhension. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Aucun objet EVA, aucun objet « objectif négocié », aucun écran de synthèse (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- de compréhension. À REVÉRIFIER À L'OUVERTURE : ces greps peuvent avoir bougé. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)

## 3. Utilisateurs concernes

- A completer.

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- A completer.

## 6. Donnees / modeles / integrations pressenties

- Patrons du dépôt à réutiliser, pas à réinventer : journal **append-only (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- chaîné**, versions **hash-verrouillées** façon `trust/contenus/registre.ts`, (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- **deux dates** (date de l'événement ≠ date d'enregistrement), **garde (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- structurelle par test** (patron du banc D-042/D-046). (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)

## 7. Contraintes projet

- Classe clinique : Opus, T3, revue `wn-reviewer` avant de passer la main. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Tout nouveau modèle = migration Prisma : CONFIRMATION OBLIGATOIRE, (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- migration seule dans sa PR, release-db entre elle et le code qui en dépend. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Identités de fixtures uniquement : Sophie Nicola, Jennifer Martin, (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Michel Dogné. Aucune donnée patient réelle, aucun seed visant un dossier (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- réel (D-075). (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- **Lot 3 derrière le Socle** : tout texte praticien→patient passe par le (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- circuit de textes gardés du Socle avant d'être montré. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Toute décision clinique de la campagne = décision `D-xxx` + fragment (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- `changelog.d/` (DC-17, DC-18). (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)

## 8. Risques et dependances

- **Absorbe** : l'anamnèse v2 et l'EVA du P3 de l'audit du 2026-08-21 ; les (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- premiers écrans du « dashboard patient » E4 (différé, réconcilié ici). (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- Dépend du Socle (textes gardés) pour le lot 3 uniquement ; les lots 1, 2 (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- et 4 n'en dépendent pas. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- **Campagne entière avant l'activation élargie protocole→produits** : la (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)
- ratification patient précède la recommandation. (docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/sources/brief-alliance-dossier-deux-voix.md)

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
