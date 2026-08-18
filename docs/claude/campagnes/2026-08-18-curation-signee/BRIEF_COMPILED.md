# Brief compile - Curation signée — NABM, liens biomarqueur-besoin, fiches

_Genere le 2026-08-18 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-18-curation-signee
- Fichier final : docs/claude/campagnes/2026-08-18-curation-signee/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md - Brief — Curation signée : peupler ce que la biologie livrée ne peut pas afficher

## 1. Intention metier

- Deux tables sont à zéro ligne par construction (claim obligatoire au schéma) (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- et une vérification fiche à fiche reste due : tant qu'elles sont vides, les (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- 47 analytes sortent `non_evalue` en remboursement et aucun lien (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- biomarqueur↔besoin n'est servi. La campagne organise la curation — un (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- travail praticien, claim par claim, que « ne se solde pas dans une passe » (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- (D-071/D-073) — en lui donnant ses surfaces, son ordre et ses preuves. (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- depuis le 2026-07-26, aucun appelant (bibliothèque dormante par décision). (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- Catalogue niveau 1 : toutes les fiches en `statut_fiche = 'importee'` ; la (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- ultérieur (D-068 §MI-8) — un lecteur filtrant `verifiee` voit un catalogue (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- deux motifs d'abstention (provenance aujourd'hui doctrinale DC-12/23, (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- 1. **Appariement analyte↔NABM** : curation signée des 47 analytes contre les (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- 987 actes — réveille la bibliothèque dormante et rend les remboursements (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- 3. **Vérification par fiche du catalogue** : passage `importee` → `verifiee` (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- avec signataire et date, en tenant compte de la lacune MI-8 (prédicat de (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- barrière sans `superseded_at`). (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- VALIDE ou acter que la provenance doctrinale suffit (décision D-xxx). (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)

## 2. Probleme a resoudre

- Liens biomarqueur↔besoin : 0 ligne, claim obligatoire au schéma. (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- 2. **Liens biomarqueur↔besoin** : mêmes règles — chaque lien exige son claim (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)

## 3. Utilisateurs concernes

- vérification (`verifiee`, signataire + date) est un geste praticien (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- évalués. Rythme praticien ; l'assistant prépare les rapprochements (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- vient du praticien-signataire ; l'absence de population déclarée est une (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- cadence est celle du praticien, pas du dépôt. (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- A completer.

## 6. Donnees / modeles / integrations pressenties

- `biology_analyte_nabm` : 0 ligne ; `biology_nabm_actes` : 987 actes en base (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- Les tables signées ne se modifient que par décision D-xxx + fragment. (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)

## 7. Contraintes projet

- Aucun claim, seuil ou appariement inventé (DC-01/02, DC-19/20) : tout (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- Cette campagne avance PAR SESSIONS COURTES en parallèle des autres — la (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- Rien de technique ; le lot 1 gagne à suivre C2 (surfaces biologie (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- consolidées) mais ne l'exige pas. (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)

## 8. Risques et dependances

- A completer.

## 9. Decisions a prendre

- Question ouverte D-062 jamais tranchée : faut-il des claims VALIDE pour les (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)
- 4. **Claims d'abstention (question D-062)** : trancher — écrire les claims (docs/claude/campagnes/2026-08-18-curation-signee/sources/brief-curation-signee.md)

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
