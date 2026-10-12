# Handoff — 2026-10-13 — SAF-EI-01 amendée : la migration (D-281, lot 2)

## Branche et état Git

`feat/saf-ei-rattachement-verdict-migration`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`0763e48c`).
Migration seule, aucun code consommateur. PR ouverte avec ce handoff.

## Objectif

Lot 2 de `D-281` §6 : donner à la base l'élément désigné par le patient, le
mode de rattachement et le verdict du praticien, avant tout code (lot 3).

## Décisions prises

- Accord explicite du responsable pour toucher au schéma (2026-10-12).
- **Correction tracée** (arbitrage du responsable, sur scénario) : un verdict
  erroné se corrige par un nouveau verdict qui le supplante ; consigné en
  `D-281` §5. D'où une table à part, append-only chaînée, plutôt que des
  colonnes figées sur le signalement.
- Signalement : `rattachement` (`element` | `ne_sait_pas` | `autre_produit`)
  et `element_action_id`. À l'insertion, programme du patient, approuvé pour
  diffusion, élément présent dans `payload.actions`. Rattachement ET programme
  visé figés ensuite ; seule la mise à NULL de l'effacement passe.
- `trust_adverse_effect_verdicts` : `implique` (élément + aménagement
  retirer/différer/réduire) ou `non_implique` ; une racine par signalement, un
  successeur par verdict, ni UPDATE ni TRUNCATE, RLS deny-all.
- Garde « diffusé » de second rang (approbation ayant existé) : le lot 3 doit
  désigner le programme par `resolveProtocoleDiffuse`, comme le portail.

## Fichiers modifiés

- `web/prisma/schema.prisma`, migration `20261012230000_saf_ei_rattachement_verdict_v1`.
- `web/prisma/checks/trust_aer_rattachement_verdict_v1_negatif.sql` + ligne CI.
- `web/src/lib/patient/effacement.ts` (+ test d'ordre).
- `docs/DOSSIER_RGPD.md` (rubrique 5), `docs/DECISIONS.md` (`D-281` §5).
- `changelog.d/2026-10-12-saf-ei-migration-rattachement-verdict.md`,
  `SESSION_LOG.md`, ce handoff.

## Validations exécutées

- T1 (`check:rapide`) vert.
- T3 (`test:worktree`) vert en entier : `migrate deploy` depuis zéro, dérive
  *No difference*, contrats SQL dont le neuf, 12 305 tests, 271 E2E.
- Le contrat a attrapé un CHECK en disjonction (NULL laissait passer un
  élément sans rattachement) : réécrit en `CASE`. Chaque CHECK est éprouvé
  sous son propre nom.
- Revue `wn-reviewer` : GO sous réserve, P1 (programme re-pointable) corrigé,
  P2-1/2/5 couverts au contrat, P2-3 consigné en commentaire, P2-4 (renommage
  d'identifiant bloqué par le gel) accepté.

## Problèmes ouverts

- Entre le déploiement et la `release-db`, l'effacement d'un dossier échoue
  fermé (précédent `panels_biologie_documentes`).
- Lot 3 : exclure l'action d'orientation médecin de la liste proposée au
  patient ? (question de la revue, non tranchée).
- Deux modèles d'ordonnance biologique déposés en session : usage à préciser
  par le responsable ; rien n'en entre au dépôt.

## Prochaine action exacte

CI vert → lire la revue Copilot → merger au créneau choisi par le
responsable → `release-db` approuvée par lui → constat par conteneur
(`migrate status` + colonnes et table présentes) → lot 3 (formulaire portail
et pause).

## Interdits encore actifs

- Aucun code consommateur avant le constat de la `release-db`.
- Ne pas signer `SAFETY_EI_METADATA` avant le lot 5 ; signature = acte du
  praticien.
- Textes « en pause » de `D-281` §4 : mot pour mot.
